"""Doctor portal – enhanced messaging router
Implements surgical edits: messaging_service integration, RBAC, clinic validation, standardized responses
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Path, Body, Query, status, Request, UploadFile, File
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .auth import get_current_doctor, DoctorUser
from app.db.session import get_db
from app.services.messaging_service import MessagingService
from app.services.fhir_client import FHIRClient
from app.services.rbac_service import RBACService
from app.common.auth.auth_service import AuthenticatedUser, require_doctor_access
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access, require_clinic_scope
from app.common.utils.tracing import get_trace_id
from app.common.models.patient import Patient
from app.common.models.user import User

router = APIRouter(prefix="/messages", tags=["Doctor · Messages"])

def normalize_clinic_id(db: Session, current_doctor: DoctorUser, clinic_id: str) -> str:
    """Normalize clinic_id: if 'default', use the user's organization_id."""
    if clinic_id == "default" or not clinic_id:
        user = db.query(User).filter(User.id == current_doctor.id).first()
        if user and user.organization_id:
            return str(user.organization_id)
        else:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Doctor {current_doctor.id} has no organization_id, using 'default'")
    return clinic_id

from app.portals.doctor.schemas.messages_enhanced import (
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
# Enhanced Endpoints with Surgical Edits
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/send", response_model=SuccessResponse[Dict[str, Any]], status_code=status.HTTP_201_CREATED)
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("write", "communication", "message")
async def send_message(
    request: Request,
    payload: SendMessageRequest = Body(...),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    current_user: AuthenticatedUser = Depends(require_doctor_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Send message to patient using shared messaging service."""
    try:
        # Normalize clinic_id if it's "default"
        effective_clinic_id = normalize_clinic_id(db, current_doctor, payload.clinic_id)
        
        # Validate clinic access - use AuthenticatedUser for RBAC checks
        if not rbac_service.can_access_clinic(current_user, effective_clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Check if recipient_id is a patient_id or user_id (for staff)
        from app.common.models.patient import Patient
        from uuid import UUID
        recipient_user_id = payload.recipient_id
        is_patient = False
        
        # Check if recipient_id is a patient_id
        try:
            recipient_uuid = UUID(payload.recipient_id) if isinstance(payload.recipient_id, str) else payload.recipient_id
            patient = db.query(Patient).filter(Patient.patient_id == recipient_uuid).first()
            if patient and patient.user_id:
                # It's a patient, validate patient access
                is_patient = True
                if not rbac_service.can_access_patient(current_user, payload.recipient_id, effective_clinic_id):
                    problem = create_problem_detail(
                        error_type=ErrorType.AUTHORIZATION_ERROR,
                        title="Patient Access Denied",
                        status=403,
                        detail="Doctor does not have access to this patient",
                        trace_id=get_trace_id()
                    )
                    raise HTTPException(status_code=403, detail=problem.dict())
                recipient_user_id = str(patient.user_id)
        except (ValueError, TypeError):
            # Not a valid UUID, treat as user_id for staff-to-staff messaging
            # No patient access check needed for staff-to-staff
            pass

        # Get doctor's full name from User model
        user_obj = db.query(User).filter(User.id == current_doctor.id).first()
        doctor_name = f"{user_obj.first_name} {user_obj.last_name}".strip() if user_obj and user_obj.first_name and user_obj.last_name else current_doctor.email

        # Prepare metadata with document attachments if provided
        metadata = {
            "clinic_id": effective_clinic_id,
            "doctor_name": doctor_name,
            "sender_role": "doctor"
        }
        
        # Add document attachments to metadata
        if payload.document_attachments:
            metadata["document_attachments"] = payload.document_attachments
        
        # Send message using shared messaging service
        # If it's a patient, pass patient_id to ensure correct thread creation
        message_result = await messaging_service.send_message(
            sender_id=current_doctor.id,
            recipient_id=recipient_user_id,  # Use user_id for both patients and staff
            content=payload.content,
            message_type=payload.message_type,
            priority=payload.priority,
            metadata=metadata,
            patient_id=payload.recipient_id if is_patient else None,  # Pass patient_id if it's a patient
            clinic_id=effective_clinic_id
        )
        
        # Create message attachments for document attachments
        if payload.document_attachments and message_result.get("id"):
            from app.common.models.messaging import MessageAttachment
            from uuid import uuid4
            
            message_id = message_result["id"]  # Get message ID from result
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Creating {len(payload.document_attachments)} document attachments for message_id: {message_id}")
            
            for doc_att in payload.document_attachments:
                try:
                    # Get file_url from payload, or construct based on document type and ID
                    file_url = doc_att.get("document_url") or doc_att.get("file_url") or ""
                    
                    if not file_url:
                        # Construct URL based on document type and ID
                        doc_id = doc_att.get("document_id") or doc_att.get("id") or ""
                        doc_type = doc_att.get("document_type") or doc_att.get("type") or "document"
                        
                        if doc_id:
                            # Construct appropriate URL based on document type
                            if doc_type == "report":
                                file_url = f"/api/v1/doctor/reports/{doc_id}"
                            elif doc_type == "lab_result":
                                file_url = f"/api/v1/doctor/lab-results/{doc_id}"
                            elif doc_type == "imaging":
                                file_url = f"/api/v1/doctor/imaging/{doc_id}"
                            elif doc_type == "prescription":
                                file_url = f"/api/v1/doctor/prescriptions/{doc_id}"
                            elif doc_type == "clinical_note" or doc_type == "report":
                                # Clinical notes are often reports
                                file_url = f"/api/v1/doctor/reports/{doc_id}"
                            else:
                                # Generic document URL
                                file_url = f"/api/v1/doctor/documents/{doc_id}"
                        else:
                            file_url = "#"  # Fallback placeholder if no ID
                    
                    attachment = MessageAttachment(
                        id=str(uuid4()),
                        message_id=str(message_id),  # Convert to string (MessageAttachment.message_id is String)
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
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("write", "binary", "attachment")
async def upload_attachment(
    request: Request,
    file: UploadFile = File(...),
    recipient_id: str = Query(..., description="Patient ID"),
    clinic_id: str = Query(..., description="Clinic ID"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    current_user: AuthenticatedUser = Depends(require_doctor_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Upload file attachment using FHIR Binary and messaging service."""
    try:
        # Normalize clinic_id if it's "default"
        effective_clinic_id = normalize_clinic_id(db, current_doctor, clinic_id)
        
        # Validate clinic and patient access - use AuthenticatedUser for RBAC checks
        if not rbac_service.can_access_clinic(current_user, effective_clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        if not rbac_service.can_access_patient(current_user, recipient_id, effective_clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Patient Access Denied",
                status=403,
                detail="Doctor does not have access to this patient",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Get doctor's full name from User model
        user_obj = db.query(User).filter(User.id == current_doctor.id).first()
        doctor_name = f"{user_obj.first_name} {user_obj.last_name}".strip() if user_obj and user_obj.first_name and user_obj.last_name else current_doctor.email

        # Read file content
        file_content = await file.read()
        
        # Upload attachment using messaging service (which uses FHIR Binary)
        attachment_result = await messaging_service.upload_attachment(
            file_name=file.filename,
            file_type=file.content_type,
            file_content=file_content,
            sender_id=current_doctor.id,
            recipient_id=recipient_id,
            metadata={
                "clinic_id": clinic_id,
                "doctor_name": doctor_name,
                "sender_role": "doctor"
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
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "communication", "conversations_list")
async def get_conversations(
    request: Request,
    clinic_id: str = Query(..., description="Clinic ID for scoping"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    current_user: AuthenticatedUser = Depends(require_doctor_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get conversations with pagination and clinic scoping."""
    try:
        # Normalize clinic_id if it's "default"
        effective_clinic_id = normalize_clinic_id(db, current_doctor, clinic_id)
        
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_user, effective_clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Get conversations using messaging service
        try:
            conversations_result = await messaging_service.get_user_conversations(
                user_id=str(current_doctor.id),  # Ensure it's a string
                user_role="doctor",
                clinic_id=effective_clinic_id,
                page=page,
                size=size
            )
        except Exception as e:
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.error(f"Error getting conversations: {e}")
            logger.error(traceback.format_exc())
            raise
        
        # Debug logging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Doctor {current_doctor.id} conversations: total={conversations_result.get('total', 0)}, returned={len(conversations_result.get('conversations', []))}")
        logger.info(f"Effective clinic_id: {effective_clinic_id}")
        logger.info(f"Conversations result keys: {conversations_result.keys() if isinstance(conversations_result, dict) else 'not a dict'}")
        for conv in conversations_result.get("conversations", [])[:5]:
            logger.info(f"  Conversation: {conv.get('conversation_id')}, patient_id={conv.get('patient_id')}, recipient_user_id={conv.get('recipient_user_id')}")

        # Transform to ConversationSummary format
        conversations = []
        for conv in conversations_result.get("conversations", []):
            conversations.append(ConversationSummary(
                conversation_id=conv["conversation_id"],
                patient_id=conv.get("patient_id", ""),
                patient_name=conv.get("patient_name", conv.get("recipient_name", "Unknown")),
                last_message=conv.get("last_message"),
                last_message_time=conv.get("last_message_time"),
                unread_count=conv.get("unread_count", 0),
                patient_avatar=conv.get("patient_avatar", conv.get("recipient_avatar")),
                patient_issue=conv.get("patient_issue"),
                clinic_id=effective_clinic_id,
                doctor_id=str(current_doctor.id),
                recipient_user_id=conv.get("recipient_user_id")  # Include recipient_user_id for staff conversations
            ))

        return create_paginated_response(
            items=conversations,
            page=page,
            size=size,
            total=conversations_result["total"]
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
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "communication", "conversation_messages")
async def get_conversation_messages(
    request: Request,
    recipient_id: str = Path(..., description="Recipient ID (patient_id or user_id for staff)"),
    clinic_id: str = Query(..., description="Clinic ID"),
    limit: int = Query(50, ge=1, le=100, description="Number of messages"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    current_user: AuthenticatedUser = Depends(require_doctor_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get messages for a specific conversation with a patient or staff member."""
    try:
        # Normalize clinic_id if it's "default"
        effective_clinic_id = normalize_clinic_id(db, current_doctor, clinic_id)
        
        # Validate clinic and patient access - use AuthenticatedUser for RBAC checks
        if not rbac_service.can_access_clinic(current_user, effective_clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        from app.common.models.messaging import MessageThread as MessageThreadModel, MessageThreadType
        from uuid import UUID
        
        # Check if recipient_id is a patient_id or user_id (for staff)
        try:
            recipient_uuid = UUID(recipient_id) if isinstance(recipient_id, str) else recipient_id
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid recipient_id format: {recipient_id}"
            )
        
        # Check if it's a patient or staff member
        patient = db.query(Patient).filter(Patient.patient_id == recipient_uuid).first()
        is_patient = patient is not None
        
        if is_patient:
            # Validate patient access
            if not rbac_service.can_access_patient(current_user, recipient_id, effective_clinic_id):
                problem = create_problem_detail(
                    error_type=ErrorType.AUTHORIZATION_ERROR,
                    title="Patient Access Denied",
                    status=403,
                    detail="Doctor does not have access to this patient",
                    trace_id=get_trace_id()
                )
                raise HTTPException(status_code=403, detail=problem.dict())
            
            # Find existing thread for this patient
            thread = db.query(MessageThreadModel).filter(
                MessageThreadModel.patient_id == recipient_uuid,
                MessageThreadModel.thread_type == MessageThreadType.PATIENT_CHAT.value,
                MessageThreadModel.is_active == True
            ).first()
            
            # If no thread exists, create one and add participants
            if not thread:
                thread_id = f"thread_{recipient_id}_{current_doctor.id}"
                thread_type_value = "patient_chat"
                # Check if thread with this ID already exists (in case of previous failed attempt)
                existing_thread = db.query(MessageThreadModel).filter(
                    MessageThreadModel.id == thread_id
                ).first()
                
                if existing_thread:
                    thread = existing_thread
                else:
                    thread = MessageThreadModel(
                        id=thread_id,
                        thread_type=thread_type_value,
                        patient_id=recipient_uuid,
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
                
                # Add participants: doctor and patient
                if patient and patient.user_id:
                    # Add doctor as participant
                    await messaging_service.add_thread_participant(
                        thread_id=thread.id,
                        user_id=str(current_doctor.id),
                        role="doctor"
                    )
                    # Add patient as participant
                    await messaging_service.add_thread_participant(
                        thread_id=thread.id,
                        user_id=str(patient.user_id),
                        role="patient"
                    )
                    db.commit()
        else:
            # Staff-to-staff messaging - find or create thread between two users
            recipient_user_id = recipient_uuid  # For staff, recipient_id is the user_id
            
            # Find existing thread between these two users (staff-to-staff)
            from app.common.models.messaging import MessageThreadParticipant
            threads = db.query(MessageThreadModel).join(MessageThreadParticipant).filter(
                MessageThreadParticipant.user_id.in_([current_doctor.id, recipient_user_id]),
                MessageThreadModel.thread_type == MessageThreadType.STAFF_CHAT.value,
                MessageThreadModel.is_active == True
            ).all()
            
            # Find thread where both users are participants
            thread = None
            for t in threads:
                participants = db.query(MessageThreadParticipant).filter(
                    MessageThreadParticipant.thread_id == t.id,
                    MessageThreadParticipant.user_id.in_([current_doctor.id, recipient_user_id]),
                    MessageThreadParticipant.is_active == True
                ).all()
                participant_user_ids = {p.user_id for p in participants}
                if {current_doctor.id, recipient_user_id}.issubset(participant_user_ids):
                    thread = t
                    break
            
            # If no thread exists, create one for staff-to-staff messaging
            if not thread:
                # Sort user IDs to ensure consistent thread ID regardless of sender/recipient order
                user_ids = [str(current_doctor.id), str(recipient_user_id)]
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
                    user_id=str(current_doctor.id),
                    role="doctor"
                )
                await messaging_service.add_thread_participant(
                    thread_id=thread.id,
                    user_id=str(recipient_user_id),
                    role="staff"  # Generic role for other staff
                )
                db.commit()
        
        # Get conversation thread using the actual thread ID
        thread_result = await messaging_service.get_conversation_thread(
            conversation_id=thread.id,  # Use actual thread ID, not fabricated
            user_id=str(current_doctor.id),  # Convert to string for service
            limit=limit,
            offset=offset
        )

        return SuccessResponse(
            data=MessageThread(
                conversation_id=thread_result["conversation_id"],
                thread_id=thread_result.get("thread_id", thread_result["conversation_id"]),
                patient=thread_result.get("patient", {}),
                messages=thread_result["messages"],
                total_messages=thread_result["total_messages"],
                clinic_id=effective_clinic_id,
                doctor_id=current_doctor.id,
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
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("write", "communication", "mark_read")
async def mark_conversation_read(
    request: Request,
    recipient_id: str = Path(..., description="Recipient ID (patient_id or user_id for staff)"),
    clinic_id: str = Query(..., description="Clinic ID"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    current_user: AuthenticatedUser = Depends(require_doctor_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Mark all messages in a conversation as read."""
    try:
        # Normalize clinic_id if it's "default"
        effective_clinic_id = normalize_clinic_id(db, current_doctor, clinic_id)
        
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_user, effective_clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        from app.common.models.messaging import MessageThread as MessageThreadModel, MessageThreadType
        from uuid import UUID
        
        # Check if recipient_id is a patient_id or user_id (for staff)
        try:
            recipient_uuid = UUID(recipient_id) if isinstance(recipient_id, str) else recipient_id
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid recipient_id format: {recipient_id}"
            )
        
        # Check if it's a patient or staff member
        patient = db.query(Patient).filter(Patient.patient_id == recipient_uuid).first()
        is_patient = patient is not None
        
        if is_patient:
            # Validate patient access
            if not rbac_service.can_access_patient(current_user, recipient_id, effective_clinic_id):
                problem = create_problem_detail(
                    error_type=ErrorType.AUTHORIZATION_ERROR,
                    title="Patient Access Denied",
                    status=403,
                    detail="Doctor does not have access to this patient",
                    trace_id=get_trace_id()
                )
                raise HTTPException(status_code=403, detail=problem.dict())
            
            # Find existing thread for this patient
            thread = db.query(MessageThreadModel).filter(
                MessageThreadModel.patient_id == recipient_uuid,
                MessageThreadModel.thread_type == MessageThreadType.PATIENT_CHAT.value,
                MessageThreadModel.is_active == True
            ).first()
            
            if not thread:
                # No thread exists, nothing to mark as read
                return SuccessResponse(
                    data={"status": "no_messages"},
                    message="No conversation found to mark as read"
                )
            
            thread_id = thread.id
        else:
            # Staff-to-staff messaging - find thread between two users
            recipient_user_id = recipient_uuid  # For staff, recipient_id is the user_id
            
            # Use the same thread ID format as send_message (sort user IDs for consistency)
            user_ids = [str(current_doctor.id), str(recipient_user_id)]
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
            user_id=str(current_doctor.id)  # Convert to string for service
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
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "communication", "unread_messages")
async def get_unread_messages(
    request: Request,
    clinic_id: str = Query(..., description="Clinic ID"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    current_user: AuthenticatedUser = Depends(require_doctor_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get all unread messages for the doctor."""
    try:
        # Normalize clinic_id if it's "default"
        effective_clinic_id = normalize_clinic_id(db, current_doctor, clinic_id)
        
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_user, effective_clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Get unread messages using messaging service
        unread_messages = await messaging_service.get_unread_messages(
            user_id=current_doctor.id,
            user_role="doctor",
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
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "communication", "message_stats")
async def get_message_stats(
    request: Request,
    clinic_id: str = Query(..., description="Clinic ID"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    current_user: AuthenticatedUser = Depends(require_doctor_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get message statistics for the doctor."""
    try:
        # Normalize clinic_id if it's "default"
        effective_clinic_id = normalize_clinic_id(db, current_doctor, clinic_id)
        
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_user, effective_clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Get message stats using messaging service
        stats = await messaging_service.get_message_stats(
            user_id=current_doctor.id,
            user_role="doctor",
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
                doctor_id=current_doctor.id
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
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("delete", "communication", "message")
async def delete_message(
    request: Request,
    message_id: str = Path(..., description="Message ID"),
    clinic_id: str = Query(..., description="Clinic ID"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    current_user: AuthenticatedUser = Depends(require_doctor_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Delete a message (only if sender)."""
    try:
        # Normalize clinic_id if it's "default"
        effective_clinic_id = normalize_clinic_id(db, current_doctor, clinic_id)
        
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_user, effective_clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Delete message using messaging service
        await messaging_service.delete_message(
            message_id=message_id,
            user_id=current_doctor.id,
            user_role="doctor"
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


@router.get("/patients", response_model=SuccessResponse[List[Dict[str, Any]]])
async def get_patients_for_messaging(
    request: Request,
    clinic_id: str = Query(..., description="Clinic ID"),
    current_doctor: DoctorUser = Depends(get_current_doctor),  # This already includes authentication
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service)
):
    """Get patients list formatted for messaging UI."""
    try:
        # Debug: Log authorization header
        auth_header = request.headers.get("Authorization")
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[DEBUG] Authorization header present: {auth_header is not None}")
        logger.info(f"[DEBUG] Current doctor ID: {current_doctor.id if current_doctor else None}")
        
        # If clinic_id is "default", use the user's organization_id
        effective_clinic_id = clinic_id
        if clinic_id == "default" or not clinic_id:
            # Get user's organization_id from database
            user = db.query(User).filter(User.id == current_doctor.id).first()
            if user and user.organization_id:
                effective_clinic_id = str(user.organization_id)
            else:
                # If no organization_id, still use "default" but log a warning
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Doctor {current_doctor.id} has no organization_id, using 'default'")
        
        # Get patients for messaging using messaging service
        patients = await messaging_service.get_patients_for_messaging(
            doctor_id=str(current_doctor.id) if hasattr(current_doctor, 'id') else current_doctor.id,
            clinic_id=effective_clinic_id
        )

        return SuccessResponse(
            data=patients or [],
            message=f"Retrieved {len(patients) if patients else 0} patients for messaging"
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in get_patients_for_messaging endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Patients Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve patients for messaging: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/patients/{patient_id}/documents", response_model=SuccessResponse[List[Dict[str, Any]]])
@audit_pii_access("read", "document", "patient_documents")
async def get_patient_documents(
    request: Request,
    patient_id: str = Path(..., description="Patient ID"),
    clinic_id: str = Query(..., description="Clinic ID"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    current_user: AuthenticatedUser = Depends(require_doctor_access()),
    db: Session = Depends(get_db),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get available documents for a patient (reports, lab results, imaging, prescriptions)."""
    try:
        from uuid import UUID
        from app.common.models.medical import DocumentReference, DocumentType
        from app.common.models.lab_insurance import LabResult
        from app.common.models.prescription import Prescription
        
        # Normalize clinic_id
        effective_clinic_id = normalize_clinic_id(db, current_doctor, clinic_id)
        
        # Validate patient access
        patient_uuid = UUID(str(patient_id)) if isinstance(patient_id, str) else patient_id
        if not rbac_service.can_access_patient(current_user, str(patient_uuid), effective_clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Patient Access Denied",
                status=403,
                detail="Doctor does not have access to this patient",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())
        
        documents = []
        
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Fetching documents for patient {patient_id} (UUID: {patient_uuid})")
        
        # 1. Get Reports (from reports_enhanced and DocumentReference)
        try:
            # First, try to get reports from FHIR via list_reports
            from app.portals.doctor.routes.reports_enhanced import list_reports
            from app.services.fhir_client import FHIRClient, get_fhir_client
            fhir_client = get_fhir_client()
            
            reports_response = await list_reports(
                request=request,
                patient_id=patient_id,
                clinic_id=effective_clinic_id,
                page=1,
                size=100,
                current_doctor=current_doctor,
                db=db,
                fhir_client=fhir_client,
                rbac_service=rbac_service
            )
            if reports_response and hasattr(reports_response, 'data') and reports_response.data:
                for report in reports_response.data:
                    # ReportSummary is a Pydantic model, access fields directly
                    report_dict = report.dict() if hasattr(report, 'dict') else report
                    documents.append({
                        "id": report_dict.get("id", "") or report_dict.get("fhir_document_reference_id", ""),
                        "type": "report",
                        "title": report_dict.get("title", "Report") or f"Report {report_dict.get('id', '')}",
                        "date": report_dict.get("date", ""),
                        "description": report_dict.get("description", "") or f"{report_dict.get('report_type', 'Report')} - {report_dict.get('specialty', 'General')}",
                        "category": report_dict.get("report_type", "general"),
                        "file_url": report_dict.get("file_url") or (f"/api/v1/doctor/reports/{report_dict.get('id', '')}" if report_dict.get("id") else None),
                        "attachments": report_dict.get("attachments", [])
                    })
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error fetching reports from FHIR: {e}")
        
        # Also get DocumentReference directly from database (if table exists)
        try:
            # Check if table exists first
            from sqlalchemy import inspect
            inspector = inspect(db.bind)
            tables = inspector.get_table_names(schema='ehr')
            
            if 'document_references' in tables:
                doc_refs = db.query(DocumentReference).filter(
                    DocumentReference.patient_id == patient_uuid
                ).order_by(DocumentReference.date.desc()).limit(100).all()
                
                for doc in doc_refs:
                    # Extract file URL from content JSON
                    file_url = None
                    if doc.content and isinstance(doc.content, list) and len(doc.content) > 0:
                        first_content = doc.content[0]
                        if isinstance(first_content, dict) and 'attachment' in first_content:
                            attachment = first_content['attachment']
                            if isinstance(attachment, dict) and 'url' in attachment:
                                file_url = attachment['url']
                    
                    # Check if this document is already in the list (from FHIR)
                    if not any(d.get("id") == str(doc.id) for d in documents):
                        documents.append({
                            "id": str(doc.id),
                            "type": "report" if doc.type in [DocumentType.CLINICAL_NOTE, DocumentType.DISCHARGE_SUMMARY, DocumentType.OPERATIVE_NOTE, DocumentType.PROGRESS_NOTE, DocumentType.CONSULTATION_NOTE] else "document",
                            "title": doc.title,
                            "date": doc.date.isoformat() if doc.date else "",
                            "description": doc.description or "",
                            "category": doc.type.value if hasattr(doc.type, 'value') else str(doc.type),
                            "file_url": file_url,
                            "attachments": doc.content if doc.content else []
                        })
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error fetching DocumentReference from database: {e}")
        
        # Get GeneralReport and ClinicalNote from database
        try:
            from app.common.models.doctor import GeneralReport, ClinicalNote
            
            # Get GeneralReports
            general_reports = db.query(GeneralReport).filter(
                GeneralReport.patient_id == patient_uuid
            ).order_by(GeneralReport.created_at.desc()).limit(100).all()
            
            for report in general_reports:
                # Check if already in list
                if not any(d.get("id") == str(report.id) for d in documents):
                    report_title = f"{getattr(report, 'report_code', '#001')} - {getattr(report, 'report_type', 'General Visit').replace('_', ' ').title()}"
                    report_date = ""
                    if hasattr(report, 'created_at') and report.created_at:
                        report_date = report.created_at.isoformat()
                    elif hasattr(report, 'updated_at') and report.updated_at:
                        report_date = report.updated_at.isoformat()
                    
                    documents.append({
                        "id": str(report.id),
                        "type": "report",
                        "title": report_title,
                        "date": report_date,
                        "description": getattr(report, 'chief_complaint', None) or getattr(report, 'hpi_free_text', None) or "",
                        "category": getattr(report, 'report_type', 'general'),
                        "file_url": None,
                        "attachments": []
                    })
            
            # Get ClinicalNotes
            clinical_notes = db.query(ClinicalNote).filter(
                ClinicalNote.patient_id == patient_uuid
            ).order_by(ClinicalNote.note_date.desc()).limit(100).all()
            
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Found {len(clinical_notes)} clinical notes for patient {patient_id}")
            
            for note in clinical_notes:
                # Check if already in list
                if not any(d.get("id") == str(note.id) for d in documents):
                    note_type = getattr(note, 'note_type', 'consultation') or 'consultation'
                    note_title = f"{note_type.replace('_', ' ').title()} Note"
                    
                    # Get date
                    note_date = ""
                    if hasattr(note, 'note_date') and note.note_date:
                        note_date = note.note_date.isoformat()
                    elif hasattr(note, 'created_at') and note.created_at:
                        note_date = note.created_at.isoformat()
                    
                    # Get description
                    description = ""
                    if hasattr(note, 'subjective') and note.subjective:
                        description = note.subjective[:200]  # Limit length
                    elif hasattr(note, 'content') and note.content:
                        description = note.content[:200]
                    
                    documents.append({
                        "id": str(note.id),
                        "type": "report",
                        "title": note_title,
                        "date": note_date,
                        "description": description,
                        "category": "clinical_note",
                        "file_url": None,
                        "attachments": []
                    })
                    logger.info(f"Added clinical note: {note_title} (ID: {note.id})")
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error fetching GeneralReport/ClinicalNote from database: {e}")
        
        # 2. Get Lab Results
        try:
            lab_results = db.query(LabResult).filter(
                LabResult.patient_id == patient_uuid
            ).order_by(LabResult.resulted_date.desc()).limit(100).all()
            
            for lab in lab_results:
                documents.append({
                    "id": str(lab.id),
                    "type": "lab_result",
                    "title": f"Lab Result: {lab.test_name}",
                    "date": lab.resulted_date.isoformat() if lab.resulted_date else "",
                    "description": f"{lab.test_name} - {lab.result_value} {lab.result_unit or ''}",
                    "category": "lab",
                    "file_url": getattr(lab, 'report_file_url', None),
                    "attachments": getattr(lab, 'attachments', []) if hasattr(lab, 'attachments') and lab.attachments else []
                })
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error fetching lab results: {e}")
        
        # 3. Get Imaging Results (from DocumentReference)
        try:
            imaging_docs = db.query(DocumentReference).filter(
                DocumentReference.patient_id == patient_uuid,
                DocumentReference.type == DocumentType.IMAGING_REPORT
            ).order_by(DocumentReference.date.desc()).limit(100).all()
            
            for doc in imaging_docs:
                # Extract file URL from content JSON
                file_url = None
                if doc.content and isinstance(doc.content, list) and len(doc.content) > 0:
                    first_content = doc.content[0]
                    if isinstance(first_content, dict) and 'attachment' in first_content:
                        attachment = first_content['attachment']
                        if isinstance(attachment, dict) and 'url' in attachment:
                            file_url = attachment['url']
                
                documents.append({
                    "id": str(doc.id),
                    "type": "imaging",
                    "title": doc.title,
                    "date": doc.date.isoformat() if doc.date else "",
                    "description": doc.description or "",
                    "category": "imaging",
                    "file_url": file_url,
                    "attachments": doc.content if doc.content else []
                })
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error fetching imaging results: {e}")
        
        # 4. Get Prescriptions
        try:
            prescriptions = db.query(Prescription).filter(
                Prescription.patient_id == patient_uuid
            ).order_by(Prescription.prescribed_date.desc()).limit(100).all()
            
            for rx in prescriptions:
                documents.append({
                    "id": str(rx.id),
                    "type": "prescription",
                    "title": f"Prescription: {rx.medicine_name}",
                    "date": rx.prescribed_date.isoformat() if rx.prescribed_date else "",
                    "description": f"{rx.medicine_name} - {rx.dosage} {rx.frequency}",
                    "category": "prescription",
                    "file_url": None,
                    "attachments": []
                })
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error fetching prescriptions: {e}")
        
        # 5. Get Other Document References
        try:
            other_docs = db.query(DocumentReference).filter(
                DocumentReference.patient_id == patient_uuid,
                DocumentReference.type.in_([
                    DocumentType.LAB_REPORT,
                    DocumentType.PATHOLOGY_REPORT,
                    DocumentType.CLINICAL_NOTE,
                    DocumentType.DISCHARGE_SUMMARY,
                    DocumentType.OPERATIVE_NOTE,
                    DocumentType.PROGRESS_NOTE,
                    DocumentType.CONSULTATION_NOTE
                ])
            ).order_by(DocumentReference.date.desc()).limit(100).all()
            
            for doc in other_docs:
                # Extract file URL from content JSON
                file_url = None
                if doc.content and isinstance(doc.content, list) and len(doc.content) > 0:
                    first_content = doc.content[0]
                    if isinstance(first_content, dict) and 'attachment' in first_content:
                        attachment = first_content['attachment']
                        if isinstance(attachment, dict) and 'url' in attachment:
                            file_url = attachment['url']
                
                documents.append({
                    "id": str(doc.id),
                    "type": "document",
                    "title": doc.title,
                    "date": doc.date.isoformat() if doc.date else "",
                    "description": doc.description or "",
                    "category": doc.type.value if hasattr(doc.type, 'value') else str(doc.type),
                    "file_url": file_url,
                    "attachments": doc.content if doc.content else []
                })
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error fetching document references: {e}")
        
        # Sort by date (most recent first)
        documents.sort(key=lambda x: x.get("date", ""), reverse=True)
        
        # Log for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Retrieved {len(documents)} documents for patient {patient_id}: {[d.get('type') for d in documents]}")
        
        return SuccessResponse(
            data=documents,
            message=f"Retrieved {len(documents)} documents for patient"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in get_patient_documents endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Documents Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve documents for patient: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())
