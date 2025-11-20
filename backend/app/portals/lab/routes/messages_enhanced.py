"""Lab portal – enhanced messaging router
Implements messaging_service integration, RBAC, clinic validation, standardized responses
Lab technicians can only message staff (not patients)
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Path, Body, Query, status, Request, UploadFile, File
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.messaging_service import MessagingService
from app.services.fhir_client import FHIRClient
from app.services.rbac_service import RBACService
from app.common.auth.auth_service import AuthenticatedUser, require_lab_technician_access
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access, require_clinic_scope
from app.common.utils.tracing import get_trace_id
from app.common.models.user import User

router = APIRouter(prefix="/messages", tags=["Lab · Messages"])

def normalize_clinic_id(db: Session, current_user: AuthenticatedUser, clinic_id: str) -> str:
    """Normalize clinic_id: if 'default', use the user's organization_id."""
    if clinic_id == "default" or not clinic_id:
        user = db.query(User).filter(User.id == current_user.user_id).first()
        if user and user.organization_id:
            return str(user.organization_id)
        else:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Lab technician {current_user.user_id} has no organization_id, using 'default'")
    return clinic_id

from app.portals.lab.schemas.messages_enhanced import (
    SendMessageRequest,
    ConversationSummary,
    MessageThread,
    MessageStats,
)

# ──────────────────────────────────────────────────────────────────────────────
# Service Dependencies
# ──────────────────────────────────────────────────────────────────────────────

def get_messaging_service(db: Session = Depends(get_db)) -> MessagingService:
    """Get messaging service with database session."""
    return MessagingService(db)

def get_fhir_client(db: Session = Depends(get_db)) -> FHIRClient:
    """Get FHIR client with database session."""
    return FHIRClient(db_session=db)

def get_rbac_service() -> RBACService:
    """Get RBAC service."""
    return RBACService()

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Endpoints - Staff Only Messaging
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/send", response_model=SuccessResponse[Dict[str, Any]], status_code=status.HTTP_201_CREATED)
@audit_pii_access("write", "communication", "message")
async def send_message(
    request: Request,
    payload: SendMessageRequest = Body(...),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Send message to staff member (lab technicians can only message staff, not patients)."""
    try:
        # Normalize clinic_id if it's "default"
        effective_clinic_id = normalize_clinic_id(db, current_user, payload.clinic_id)
        
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_user, effective_clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Lab technician does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Lab technicians can only message staff - recipient_id must be a user_id (staff member)
        # Verify that recipient_id is a staff member (not a patient)
        from app.common.models.patient import Patient
        from uuid import UUID
        
        # Check if recipient_id is a patient_id (should not be allowed)
        try:
            recipient_uuid = UUID(payload.recipient_id) if isinstance(payload.recipient_id, str) else payload.recipient_id
            patient = db.query(Patient).filter(Patient.patient_id == recipient_uuid).first()
            if patient:
                # This is a patient - lab technicians cannot message patients
                problem = create_problem_detail(
                    error_type=ErrorType.AUTHORIZATION_ERROR,
                    title="Patient Messaging Not Allowed",
                    status=403,
                    detail="Lab technicians can only message staff members, not patients",
                    trace_id=get_trace_id()
                )
                raise HTTPException(status_code=403, detail=problem.dict())
        except (ValueError, TypeError):
            # Not a valid UUID, treat as user_id for staff-to-staff messaging
            pass
        
        # Verify recipient is a staff member in the same organization
        recipient_user = db.query(User).filter(User.id == payload.recipient_id).first()
        if not recipient_user:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Recipient Not Found",
                status=404,
                detail="Recipient user not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # Verify recipient is in the same organization
        sender_user = db.query(User).filter(User.id == current_user.user_id).first()
        if sender_user and sender_user.organization_id and recipient_user.organization_id:
            if str(sender_user.organization_id) != str(recipient_user.organization_id):
                problem = create_problem_detail(
                    error_type=ErrorType.AUTHORIZATION_ERROR,
                    title="Organization Mismatch",
                    status=403,
                    detail="Can only message staff members in the same organization",
                    trace_id=get_trace_id()
                )
                raise HTTPException(status_code=403, detail=problem.dict())
        
        # Get lab technician's full name from User model
        user_obj = db.query(User).filter(User.id == current_user.user_id).first()
        sender_name = f"{user_obj.first_name} {user_obj.last_name}".strip() if user_obj and user_obj.first_name and user_obj.last_name else user_obj.email if user_obj else "Lab Technician"

        # Prepare metadata
        metadata = {
            "clinic_id": effective_clinic_id,
            "sender_name": sender_name,
            "sender_role": "lab_technician"
        }
        
        # Add document attachments to metadata
        if payload.document_attachments:
            metadata["document_attachments"] = payload.document_attachments
        
        # Send message using shared messaging service (staff-to-staff)
        message_result = await messaging_service.send_message(
            sender_id=str(current_user.user_id),
            recipient_id=payload.recipient_id,  # user_id for staff
            content=payload.content,
            message_type=payload.message_type,
            priority=payload.priority,
            metadata=metadata,
            patient_id=None,  # No patient for staff-to-staff messaging
            clinic_id=effective_clinic_id
        )
        
        # Create message attachments for document attachments
        if payload.document_attachments and message_result.get("id"):
            from app.common.models.messaging import MessageAttachment
            from uuid import uuid4
            
            message_id = message_result["id"]
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Creating {len(payload.document_attachments)} document attachments for message_id: {message_id}")
            
            for doc_att in payload.document_attachments:
                try:
                    file_url = doc_att.get("document_url") or doc_att.get("file_url") or ""
                    
                    if not file_url:
                        doc_id = doc_att.get("document_id") or doc_att.get("id") or ""
                        doc_type = doc_att.get("document_type") or doc_att.get("type") or "document"
                        
                        if doc_id:
                            if doc_type == "report":
                                file_url = f"/api/v1/lab/reports/{doc_id}"
                            elif doc_type == "lab_result":
                                file_url = f"/api/v1/lab/results/{doc_id}"
                            else:
                                file_url = f"/api/v1/lab/documents/{doc_id}"
                        else:
                            file_url = "#"
                    
                    attachment = MessageAttachment(
                        id=str(uuid4()),
                        message_id=str(message_id),
                        file_name=doc_att.get("document_title") or doc_att.get("title") or "Document",
                        file_type="document",
                        file_size=0,
                        file_url=file_url,
                        description=f"{doc_att.get('document_type', doc_att.get('type', 'document'))}: {doc_att.get('document_title', doc_att.get('title', 'Document'))}"
                    )
                    db.add(attachment)
                    logger.info(f"Added attachment: {attachment.id} for message {message_id}")
                except Exception as e:
                    logger.error(f"Failed to create message attachment for document: {e}", exc_info=True)
            
            try:
                db.commit()
                logger.info(f"Successfully committed {len(payload.document_attachments)} document attachments")
            except Exception as e:
                db.rollback()
                logger.error(f"Failed to commit document attachments: {e}", exc_info=True)
                raise

        return SuccessResponse(
            data=message_result,
            message="Message sent successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Message Sending Failed",
            status=500,
            detail=f"Failed to send message: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.post("/upload-attachment", response_model=SuccessResponse[Dict[str, str]], status_code=status.HTTP_201_CREATED)
@audit_pii_access("write", "binary", "attachment")
async def upload_attachment(
    request: Request,
    file: UploadFile = File(...),
    recipient_id: str = Query(..., description="Recipient user ID (staff member)"),
    clinic_id: str = Query(..., description="Clinic ID"),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Upload file attachment using FHIR Binary and messaging service."""
    try:
        # Normalize clinic_id if it's "default"
        effective_clinic_id = normalize_clinic_id(db, current_user, clinic_id)
        
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_user, effective_clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Lab technician does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Verify recipient is a staff member (not a patient)
        recipient_user = db.query(User).filter(User.id == recipient_id).first()
        if not recipient_user:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Recipient Not Found",
                status=404,
                detail="Recipient user not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())

        # Get lab technician's full name from User model
        user_obj = db.query(User).filter(User.id == current_user.user_id).first()
        sender_name = f"{user_obj.first_name} {user_obj.last_name}".strip() if user_obj and user_obj.first_name and user_obj.last_name else user_obj.email if user_obj else "Lab Technician"

        # Read file content
        file_content = await file.read()
        
        # Upload attachment using messaging service (which uses FHIR Binary)
        attachment_result = await messaging_service.upload_attachment(
            file_name=file.filename,
            file_type=file.content_type,
            file_content=file_content,
            sender_id=str(current_user.user_id),
            recipient_id=recipient_id,
            metadata={
                "clinic_id": clinic_id,
                "sender_name": sender_name,
                "sender_role": "lab_technician"
            }
        )

        return SuccessResponse(
            data={
                "attachment_id": attachment_result["attachment_id"],
                "fhir_binary_id": attachment_result["fhir_binary_id"],
                "file_name": file.filename,
                "file_type": file.content_type
            },
            message="Attachment uploaded successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Attachment Upload Failed",
            status=500,
            detail=f"Failed to upload attachment: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/conversations", response_model=PaginatedResponse[ConversationSummary])
@audit_pii_access("read", "communication", "conversations_list")
async def get_conversations(
    request: Request,
    clinic_id: str = Query(..., description="Clinic ID for scoping"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get conversations with pagination and clinic scoping (staff-to-staff only)."""
    try:
        # Normalize clinic_id if it's "default"
        effective_clinic_id = normalize_clinic_id(db, current_user, clinic_id)
        
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_user, effective_clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Lab technician does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Get conversations using messaging service (filtered to staff-to-staff only)
        conversations_result = await messaging_service.get_user_conversations(
            user_id=str(current_user.user_id),
            user_role="lab_technician",
            clinic_id=effective_clinic_id,
            page=page,
            size=size
        )

        # Transform to ConversationSummary format (only staff conversations)
        conversations = []
        for conv in conversations_result["conversations"]:
            # Only include staff-to-staff conversations (no patient_id)
            if not conv.get("patient_id"):
                # Get recipient name from thread participants
                from app.common.models.messaging import MessageThreadParticipant
                from uuid import UUID
                recipient_name = "Staff Member"
                recipient_avatar = None
                
                # Get thread participants to find the other user
                thread_id = conv.get("conversation_id") or conv.get("thread_id")
                recipient_user_id = None
                if thread_id:
                    participants = db.query(MessageThreadParticipant).filter(
                        MessageThreadParticipant.thread_id == thread_id,
                        MessageThreadParticipant.is_active == True
                    ).all()
                    
                    # Find the other participant (not the current user)
                    for participant in participants:
                        try:
                            participant_uuid = UUID(participant.user_id) if isinstance(participant.user_id, str) else participant.user_id
                            if participant_uuid != current_user.user_id:
                                recipient_user = db.query(User).filter(User.id == participant_uuid).first()
                                if recipient_user:
                                    recipient_name = f"{recipient_user.first_name} {recipient_user.last_name}".strip() or recipient_user.email
                                    recipient_avatar = recipient_user.profile_image_url
                                    recipient_user_id = str(participant_uuid)  # Store recipient user ID
                                    break
                        except (ValueError, TypeError):
                            continue
                
                # Fallback: try to get recipient_user_id from the conversation result if available
                if not recipient_user_id:
                    recipient_user_id = conv.get("recipient_user_id")
                
                conversations.append(ConversationSummary(
                    conversation_id=conv.get("conversation_id") or conv.get("thread_id", ""),
                    patient_id="",  # No patient for staff-to-staff
                    patient_name=recipient_name,
                    last_message=conv.get("last_message"),
                    last_message_time=conv.get("last_message_time"),
                    unread_count=conv.get("unread_count", 0),
                    patient_avatar=recipient_avatar,
                    patient_issue=None,  # No patient issue for staff
                    clinic_id=effective_clinic_id,
                    doctor_id=str(current_user.user_id),  # Lab technician ID
                    recipient_user_id=recipient_user_id  # Include recipient user ID for staff conversations
                ))

        return create_paginated_response(
            items=conversations,
            page=page,
            size=size,
            total=len(conversations)
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Conversations Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve conversations: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/conversations/{recipient_id}/messages", response_model=SuccessResponse[MessageThread])
@audit_pii_access("read", "communication", "conversation_messages")
async def get_conversation_messages(
    request: Request,
    recipient_id: str = Path(..., description="Recipient ID (user_id for staff member)"),
    clinic_id: str = Query(..., description="Clinic ID"),
    limit: int = Query(50, ge=1, le=100, description="Number of messages"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get messages for a specific conversation with a staff member (staff-to-staff only)."""
    try:
        # Normalize clinic_id if it's "default"
        effective_clinic_id = normalize_clinic_id(db, current_user, clinic_id)
        
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_user, effective_clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Lab technician does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        from app.common.models.messaging import MessageThread as MessageThreadModel, MessageThreadType
        from uuid import UUID
        
        # Verify recipient is a staff member (not a patient)
        try:
            recipient_uuid = UUID(recipient_id) if isinstance(recipient_id, str) else recipient_id
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid recipient_id format: {recipient_id}"
            )
        
        # Check if it's a patient (should not be allowed)
        from app.common.models.patient import Patient
        patient = db.query(Patient).filter(Patient.patient_id == recipient_uuid).first()
        if patient:
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Patient Messaging Not Allowed",
                status=403,
                detail="Lab technicians can only message staff members, not patients",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())
        
        # Staff-to-staff messaging - find or create thread between two users
        recipient_user_id = recipient_uuid  # For staff, recipient_id is the user_id
        
        # Verify recipient is in the same organization
        sender_user = db.query(User).filter(User.id == current_user.user_id).first()
        recipient_user = db.query(User).filter(User.id == recipient_user_id).first()
        if not recipient_user:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Recipient Not Found",
                status=404,
                detail="Recipient user not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        if sender_user and sender_user.organization_id and recipient_user.organization_id:
            if str(sender_user.organization_id) != str(recipient_user.organization_id):
                problem = create_problem_detail(
                    error_type=ErrorType.AUTHORIZATION_ERROR,
                    title="Organization Mismatch",
                    status=403,
                    detail="Can only message staff members in the same organization",
                    trace_id=get_trace_id()
                )
                raise HTTPException(status_code=403, detail=problem.dict())
        
        # Find existing thread between these two users (staff-to-staff)
        from app.common.models.messaging import MessageThreadParticipant
        threads = db.query(MessageThreadModel).join(MessageThreadParticipant).filter(
            MessageThreadParticipant.user_id.in_([str(current_user.user_id), str(recipient_user_id)]),
            MessageThreadModel.thread_type == MessageThreadType.STAFF_CHAT.value,
            MessageThreadModel.is_active == True
        ).all()
        
        # Find thread where both users are participants
        thread = None
        for t in threads:
            participants = db.query(MessageThreadParticipant).filter(
                MessageThreadParticipant.thread_id == t.id,
                MessageThreadParticipant.user_id.in_([str(current_user.user_id), str(recipient_user_id)]),
                MessageThreadParticipant.is_active == True
            ).all()
            participant_user_ids = {p.user_id for p in participants}
            if {str(current_user.user_id), str(recipient_user_id)}.issubset(participant_user_ids):
                thread = t
                break
        
        # If no thread exists, create one for staff-to-staff messaging
        if not thread:
            # Sort user IDs to ensure consistent thread ID regardless of sender/recipient order
            user_ids = [str(current_user.user_id), str(recipient_user_id)]
            user_ids.sort()  # Sort to ensure consistent thread ID
            thread_id = f"thread_staff_{user_ids[0]}_{user_ids[1]}"
            # Check if thread with this ID already exists (in case of previous failed attempt)
            existing_thread = db.query(MessageThreadModel).filter(
                MessageThreadModel.id == thread_id
            ).first()
            
            if existing_thread:
                thread = existing_thread
            else:
                thread = MessageThreadModel(
                    id=thread_id,
                    thread_type=MessageThreadType.STAFF_CHAT.value,
                    patient_id=None,  # No patient for staff-to-staff
                    clinic_id=effective_clinic_id,
                    is_active=True
                )
                db.add(thread)
                try:
                    db.commit()
                    db.refresh(thread)
                except Exception as commit_error:
                    db.rollback()
                    # Thread might have been created by another request, try to fetch it
                    thread = db.query(MessageThreadModel).filter(
                        MessageThreadModel.id == thread_id
                    ).first()
                    if not thread:
                        raise commit_error
                
                # Add both staff members as participants
                await messaging_service.add_thread_participant(
                    thread_id=thread.id,
                    user_id=str(current_user.user_id),
                    role="lab_technician"
                )
                await messaging_service.add_thread_participant(
                    thread_id=thread.id,
                    user_id=str(recipient_user_id),
                    role="staff"  # Generic role for other staff
                )
                db.commit()
        
        # Get conversation thread using the actual thread ID
        thread_result = await messaging_service.get_conversation_thread(
            conversation_id=thread.id,  # Use actual thread ID
            user_id=str(current_user.user_id),  # Convert to string for service
            limit=limit,
            offset=offset
        )

        return SuccessResponse(
            data=MessageThread(
                conversation_id=thread_result["conversation_id"],
                thread_id=thread_result.get("thread_id", thread_result["conversation_id"]),
                patient={},  # No patient for staff-to-staff
                messages=thread_result["messages"],
                total_messages=thread_result["total_messages"],
                clinic_id=effective_clinic_id,
                doctor_id=str(current_user.user_id),  # Using current_user.user_id for consistency
                participants=thread_result.get("participants", []),
                unread_count=thread_result.get("unread_count", 0),
                last_message_at=thread_result.get("last_message_at")
            ),
            message="Conversation messages retrieved successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Messages Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve messages: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.post("/conversations/{recipient_id}/mark-read", response_model=SuccessResponse[Dict[str, str]])
@audit_pii_access("write", "communication", "mark_read")
async def mark_conversation_read(
    request: Request,
    recipient_id: str = Path(..., description="Recipient ID (user_id for staff member)"),
    clinic_id: str = Query(..., description="Clinic ID"),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Mark all messages in a conversation as read."""
    try:
        # Normalize clinic_id if it's "default"
        effective_clinic_id = normalize_clinic_id(db, current_user, clinic_id)
        
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_user, effective_clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Lab technician does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        from app.common.models.messaging import MessageThread as MessageThreadModel, MessageThreadType
        from uuid import UUID
        
        # Check if recipient_id is a patient (should not be allowed)
        try:
            recipient_uuid = UUID(recipient_id) if isinstance(recipient_id, str) else recipient_id
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid recipient_id format: {recipient_id}"
            )
        
        from app.common.models.patient import Patient
        patient = db.query(Patient).filter(Patient.patient_id == recipient_uuid).first()
        if patient:
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Patient Messaging Not Allowed",
                status=403,
                detail="Lab technicians can only message staff members, not patients",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())
        
        # Staff-to-staff messaging - find thread between two users
        recipient_user_id = recipient_uuid  # For staff, recipient_id is the user_id
        
        # Use the same thread ID format as send_message (sort user IDs for consistency)
        user_ids = [str(current_user.user_id), str(recipient_user_id)]
        user_ids.sort()  # Sort to ensure consistent thread ID
        staff_thread_id = f"thread_staff_{user_ids[0]}_{user_ids[1]}"
        
        # Find existing thread using the same format as send_message
        thread = db.query(MessageThreadModel).filter(
            MessageThreadModel.id == staff_thread_id,
            MessageThreadModel.thread_type == MessageThreadType.STAFF_CHAT.value,
            MessageThreadModel.is_active == True
        ).first()
        
        if not thread:
            # No thread exists, nothing to mark as read
            return SuccessResponse(
                data={"status": "no_messages"},
                message="No conversation found to mark as read"
            )
        
        thread_id = thread.id

        # Mark conversation as read using messaging service with the actual thread_id
        await messaging_service.mark_conversation_read(
            conversation_id=thread_id,  # Use actual thread_id
            user_id=str(current_user.user_id)  # Convert to string for service
        )

        return SuccessResponse(
            data={"status": "marked_read"},
            message="Conversation marked as read"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Mark Read Failed",
            status=500,
            detail=f"Failed to mark conversation as read: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/unread", response_model=SuccessResponse[List[Dict[str, Any]]])
@audit_pii_access("read", "communication", "unread_messages")
async def get_unread_messages(
    request: Request,
    clinic_id: str = Query(..., description="Clinic ID"),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get all unread messages for the lab technician."""
    try:
        # Normalize clinic_id if it's "default"
        effective_clinic_id = normalize_clinic_id(db, current_user, clinic_id)
        
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_user, effective_clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Lab technician does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Get unread messages using messaging service
        unread_messages = await messaging_service.get_unread_messages(
            user_id=str(current_user.user_id),
            user_role="lab_technician",
            clinic_id=effective_clinic_id
        )

        return SuccessResponse(
            data=unread_messages,
            message=f"Retrieved {len(unread_messages)} unread messages"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Unread Messages Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve unread messages: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/stats", response_model=SuccessResponse[MessageStats])
@audit_pii_access("read", "communication", "message_stats")
async def get_message_stats(
    request: Request,
    clinic_id: str = Query(..., description="Clinic ID"),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get message statistics for the lab technician."""
    try:
        # Normalize clinic_id if it's "default"
        effective_clinic_id = normalize_clinic_id(db, current_user, clinic_id)
        
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_user, effective_clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Lab technician does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Get message stats using messaging service
        stats = await messaging_service.get_message_stats(
            user_id=str(current_user.user_id),
            user_role="lab_technician",
            clinic_id=effective_clinic_id
        )

        return SuccessResponse(
            data=MessageStats(
                total_conversations=stats["total_conversations"],
                unread_messages=stats["unread_messages"],
                messages_sent=stats["messages_sent"],
                messages_received=stats["messages_received"],
                total_messages=stats["total_messages"],
                conversations_count=stats["total_conversations"],
                messages_today=0,  # TODO: Calculate from stats
                messages_this_week=0,  # TODO: Calculate from stats
                messages_this_month=0,  # TODO: Calculate from stats
                average_response_time=None,  # TODO: Calculate from stats
                clinic_id=effective_clinic_id,
                doctor_id=str(current_user.user_id)  # Using current_user.user_id for consistency
            ),
            message="Message statistics retrieved successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Message Stats Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve message statistics: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.delete("/messages/{message_id}", response_model=SuccessResponse[Dict[str, str]])
@audit_pii_access("delete", "communication", "message")
async def delete_message(
    request: Request,
    message_id: str = Path(..., description="Message ID"),
    clinic_id: str = Query(..., description="Clinic ID"),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Delete a message (only if sender)."""
    try:
        # Normalize clinic_id if it's "default"
        effective_clinic_id = normalize_clinic_id(db, current_user, clinic_id)
        
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_user, effective_clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Lab technician does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Delete message using messaging service
        await messaging_service.delete_message(
            message_id=message_id,
            user_id=str(current_user.user_id),
            user_role="lab_technician"
        )

        return SuccessResponse(
            data={"status": "deleted"},
            message="Message deleted successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Message Deletion Failed",
            status=500,
            detail=f"Failed to delete message: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/staff", response_model=SuccessResponse[List[Dict[str, Any]]])
async def get_staff_for_messaging(
    request: Request,
    clinic_id: str = Query(..., description="Clinic ID"),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service)
):
    """Get staff members list formatted for messaging UI (lab technicians can only message staff)."""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # If clinic_id is "default", use the user's organization_id
        effective_clinic_id = clinic_id
        if clinic_id == "default" or not clinic_id:
            # Get user's organization_id from database
            user = db.query(User).filter(User.id == current_user.user_id).first()
            if user and user.organization_id:
                effective_clinic_id = str(user.organization_id)
                logger.info(f"Lab technician {current_user.user_id} has organization_id: {effective_clinic_id}")
            else:
                logger.warning(f"Lab technician {current_user.user_id} has no organization_id, using 'default'")
                # Return empty list if no organization_id
                return SuccessResponse(
                    data=[],
                    message="No organization assigned. Please contact administrator."
                )
        
        # Get staff members from the same organization
        from app.common.models.user import UserRole
        from uuid import UUID
        
        # Convert effective_clinic_id to UUID if it's not "default"
        clinic_uuid = None
        if effective_clinic_id and effective_clinic_id != "default":
            try:
                clinic_uuid = UUID(effective_clinic_id)
                logger.info(f"Querying staff for organization_id: {clinic_uuid}")
            except (ValueError, TypeError) as e:
                logger.error(f"Invalid clinic_id format: {effective_clinic_id}, error: {e}")
                return SuccessResponse(
                    data=[],
                    message="Invalid clinic ID"
                )
        else:
            logger.warning(f"Invalid clinic_id: {effective_clinic_id}")
            return SuccessResponse(
                data=[],
                message="Invalid clinic ID"
            )
        
        # Query staff users - include all staff roles except PATIENT
        staff_users = db.query(User).filter(
            User.organization_id == clinic_uuid,
            User.id != current_user.user_id,  # Exclude current user
            User.role.in_([
                UserRole.DOCTOR,
                UserRole.NURSE,
                UserRole.LAB_TECHNICIAN,
                UserRole.RECEPTIONIST,
                UserRole.CLINIC_ADMIN,
                UserRole.SUPER_ADMIN,
                UserRole.RADIOLOGIST,
                UserRole.PHARMACIST
            ]),
            User.is_active == True
        ).all()
        
        # Debug: Also check total users in organization
        total_org_users = db.query(User).filter(User.organization_id == clinic_uuid).count()
        logger.info(f"Total users in organization {clinic_uuid}: {total_org_users}")
        
        logger.info(f"Found {len(staff_users)} staff members for organization {clinic_uuid}")
        
        staff_list = []
        for staff_user in staff_users:
            staff_list.append({
                "id": str(staff_user.id),
                "name": f"{staff_user.first_name} {staff_user.last_name}".strip() or staff_user.email,
                "email": staff_user.email,
                "role": staff_user.role.value if staff_user.role else "staff",
                "avatar": staff_user.profile_image_url or None,
                "phone": staff_user.phone or None,
                "organization_id": str(staff_user.organization_id) if staff_user.organization_id else None
            })

        logger.info(f"Returning {len(staff_list)} staff members")
        return SuccessResponse(
            data=staff_list,
            message=f"Retrieved {len(staff_list)} staff members for messaging"
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in get_staff_for_messaging endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Staff Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve staff for messaging: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

