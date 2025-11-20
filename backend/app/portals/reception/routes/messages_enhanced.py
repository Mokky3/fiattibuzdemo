"""Reception portal – enhanced messaging router
Implements surgical edits: shared messaging service integration, RBAC, message templates
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Path, Body, Query, status, Request, UploadFile, File
from pydantic import BaseModel, Field
from app.portals.reception.schemas.messages_enhanced import (
    SendMessageRequest as SchemaSendMessageRequest,
    MessageTemplateRequest as SchemaMessageTemplateRequest,
    ConversationSummary as SchemaConversationSummary,
    MessageThread as SchemaMessageThread,
    MessageTemplate as SchemaMessageTemplate,
    MessageStats as SchemaMessageStats,
)
from sqlalchemy.orm import Session
from app.common.auth.auth_service import (
    AuthenticatedUser, require_receptionist_access, require_permission, Permission,
)
from app.db.session import get_db
from app.services.messaging_service import MessagingService
from app.services.fhir_client import FHIRClient
from app.services.rbac_service import RBACService, ResourceType, ActionType
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access, require_clinic_scope
from app.common.utils.tracing import get_trace_id

router = APIRouter(tags=["Reception · Messages"])

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Data Models
# ──────────────────────────────────────────────────────────────────────────────

SendMessageRequest = SchemaSendMessageRequest

MessageTemplateRequest = SchemaMessageTemplateRequest

ConversationSummary = SchemaConversationSummary

MessageThread = SchemaMessageThread

MessageTemplate = SchemaMessageTemplate

MessageStats = SchemaMessageStats

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
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.MESSAGE_WRITE)),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Send message to patient using shared messaging service."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.MESSAGE, ActionType.WRITE, payload.clinic_id)
        rbac_service.enforce_permission(current_user, ResourceType.PATIENT, ActionType.READ, payload.clinic_id)

        # Send message using shared messaging service
        message_result = await messaging_service.send_message(
            sender_id=current_user.user_id,
            recipient_id=payload.recipient_id,
            content=payload.content,
            message_type=payload.message_type,
            priority=payload.priority,
            template_id=payload.template_id,
            metadata={
                "clinic_id": payload.clinic_id,
                "receptionist_name": getattr(current_user, "email", "receptionist"),
                "sender_role": "receptionist"
            }
        )

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
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.MESSAGE_WRITE)),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Upload file attachment using FHIR Binary and messaging service."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.MESSAGE, ActionType.WRITE, clinic_id)
        rbac_service.enforce_permission(current_user, ResourceType.PATIENT, ActionType.READ, clinic_id)

        # Read file content
        file_content = await file.read()

        # Upload attachment using messaging service (which uses FHIR Binary)
        attachment_result = await messaging_service.upload_attachment(
            file_name=file.filename,
            file_type=file.content_type,
            file_content=file_content,
            sender_id=current_user.user_id,
            recipient_id=recipient_id,
            metadata={
                "clinic_id": clinic_id,
                "receptionist_name": getattr(current_user, "email", "receptionist"),
                "sender_role": "receptionist"
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
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.MESSAGE_READ)),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get conversations with pagination and clinic scoping."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.MESSAGE, ActionType.READ, clinic_id)

        # Get conversations using messaging service
        conversations_result = await messaging_service.get_user_conversations(
            user_id=current_user.user_id,
            user_role="receptionist",
            clinic_id=clinic_id,
            page=page,
            size=size
        )

        # Transform to ConversationSummary format
        conversations = []
        for conv in conversations_result["conversations"]:
            conversations.append(ConversationSummary(
                conversation_id=conv["conversation_id"],
                patient_id=conv["patient_id"],
                patient_name=conv["patient_name"],
                last_message=conv.get("last_message"),
                last_message_time=conv.get("last_message_time"),
                unread_count=conv.get("unread_count", 0),
                patient_avatar=conv.get("patient_avatar"),
                patient_issue=conv.get("patient_issue")
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


@router.get("/conversations/{patient_id}/messages", response_model=SuccessResponse[MessageThread])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "communication", "conversation_messages")
async def get_conversation_messages(
    request: Request,
    patient_id: str = Path(..., description="Patient ID"),
    clinic_id: str = Query(..., description="Clinic ID"),
    limit: int = Query(50, ge=1, le=100, description="Number of messages"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.MESSAGE_READ)),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get messages for a specific conversation."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.MESSAGE, ActionType.READ, clinic_id)
        rbac_service.enforce_permission(current_user, ResourceType.PATIENT, ActionType.READ, clinic_id)

        # Get conversation thread using messaging service
        thread_result = await messaging_service.get_conversation_thread(
            conversation_id=f"conv_{patient_id}_{current_user.user_id}",
            user_id=current_user.user_id,
            limit=limit,
            offset=offset
        )

        return SuccessResponse(
            data=MessageThread(
                conversation_id=thread_result["conversation_id"],
                patient=thread_result["patient"],
                messages=thread_result["messages"],
                total_messages=thread_result["total_messages"]
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


@router.post("/conversations/{patient_id}/mark-read", response_model=SuccessResponse[Dict[str, str]])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("write", "communication", "mark_read")
async def mark_conversation_read(
    request: Request,
    patient_id: str = Path(..., description="Patient ID"),
    clinic_id: str = Query(..., description="Clinic ID"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.MESSAGE_WRITE)),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Mark all messages in a conversation as read."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.MESSAGE, ActionType.WRITE, clinic_id)
        rbac_service.enforce_permission(current_user, ResourceType.PATIENT, ActionType.READ, clinic_id)

        # Mark conversation as read using messaging service
        await messaging_service.mark_conversation_read(
            conversation_id=f"conv_{patient_id}_{current_user.user_id}",
            user_id=current_user.user_id
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


@router.get("/templates", response_model=PaginatedResponse[MessageTemplate])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "communication", "message_templates")
async def get_message_templates(
    request: Request,
    clinic_id: str = Query(..., description="Clinic ID for scoping"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.MESSAGE_READ)),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get message templates with pagination and clinic scoping."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.MESSAGE, ActionType.READ, clinic_id)

        # Get templates using messaging service
        templates_result = await messaging_service.get_message_templates(
            clinic_id=clinic_id,
            page=page,
            size=size
        )

        # Transform to MessageTemplate format
        templates = []
        for template in templates_result["templates"]:
            templates.append(MessageTemplate(
                id=template["id"],
                name=template["name"],
                content=template["content"],
                message_type=template["message_type"],
                variables=template.get("variables", []),
                clinic_id=template["clinic_id"]
            ))

        return create_paginated_response(
            items=templates,
            page=page,
            size=size,
            total=templates_result["total"]
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Message Templates Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve message templates: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.post("/templates", response_model=SuccessResponse[MessageTemplate], status_code=status.HTTP_201_CREATED)
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("write", "communication", "message_template_create")
async def create_message_template(
    request: Request,
    payload: MessageTemplateRequest = Body(...),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.MESSAGE_WRITE)),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Create message template using shared messaging service."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.MESSAGE, ActionType.WRITE, payload.clinic_id)

        # Create template using messaging service
        template_result = await messaging_service.create_message_template(
            name=payload.name,
            content=payload.content,
            message_type=payload.message_type,
            variables=payload.variables or [],
            clinic_id=payload.clinic_id,
            created_by=current_user.user_id
        )

        return SuccessResponse(
            data=MessageTemplate(
                id=template_result["id"],
                name=template_result["name"],
                content=template_result["content"],
                message_type=template_result["message_type"],
                variables=template_result.get("variables", []),
                clinic_id=template_result["clinic_id"]
            ),
            message="Message template created successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Message Template Creation Failed",
            status=500,
            detail=f"Failed to create message template: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/unread", response_model=SuccessResponse[List[Dict[str, Any]]])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "communication", "unread_messages")
async def get_unread_messages(
    request: Request,
    clinic_id: str = Query(..., description="Clinic ID"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.MESSAGE_READ)),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get all unread messages for the receptionist."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.MESSAGE, ActionType.READ, clinic_id)

        # Get unread messages using messaging service
        unread_messages = await messaging_service.get_unread_messages(
            user_id=current_user.user_id,
            user_role="receptionist",
            clinic_id=clinic_id
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
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.MESSAGE_READ)),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get message statistics for the receptionist."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.MESSAGE, ActionType.READ, clinic_id)

        # Get message stats using messaging service
        stats = await messaging_service.get_message_stats(
            user_id=current_user.user_id,
            user_role="receptionist",
            clinic_id=clinic_id
        )

        return SuccessResponse(
            data=MessageStats(
                total_conversations=stats["total_conversations"],
                unread_messages=stats["unread_messages"],
                messages_sent=stats["messages_sent"],
                messages_received=stats["messages_received"],
                total_messages=stats["total_messages"]
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
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.MESSAGE_DELETE)),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Delete a message (only if sender)."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.MESSAGE, ActionType.DELETE, clinic_id)

        # Delete message using messaging service
        await messaging_service.delete_message(
            message_id=message_id,
            user_id=current_user.user_id,
            user_role="receptionist"
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
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "patient", "patients_for_messaging")
async def get_patients_for_messaging(
    request: Request,
    clinic_id: str = Query(..., description="Clinic ID"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.PATIENT_READ)),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get patients list formatted for messaging UI."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.PATIENT, ActionType.READ, clinic_id)

        # Get patients for messaging using messaging service
        patients = await messaging_service.get_patients_for_messaging(
            clinic_id=clinic_id,
            user_role="receptionist"
        )

        return SuccessResponse(
            data=patients,
            message=f"Retrieved {len(patients)} patients for messaging"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Patients Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve patients for messaging: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())
