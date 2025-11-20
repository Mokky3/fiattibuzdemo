"""Patient portal – enhanced messaging router
Allows patients to receive and view messages from doctors
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Body, Query, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .auth_enhanced import get_current_patient, PatientUser
from app.db.session import get_db
from app.services.messaging_service import MessagingService
from app.services.rbac_service import RBACService
from app.common.auth.auth_service import AuthenticatedUser, require_patient_access
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id
from app.common.models.patient import Patient
from app.common.models.messaging import MessageThread as MessageThreadModel, MessageThreadType

router = APIRouter(prefix="/messages", tags=["Patient · Messages"])

# ──────────────────────────────────────────────────────────────────────────────
# Request/Response Models
# ──────────────────────────────────────────────────────────────────────────────

class SendMessageRequest(BaseModel):
    recipient_id: str = Field(..., description="Doctor or clinic ID to send message to")
    content: str = Field(..., description="Message content")
    message_type: str = Field("text", description="Message type: text, image, file, etc.")
    priority: str = Field("normal", description="Message priority: normal, urgent, etc.")
    clinic_id: Optional[str] = Field(None, description="Clinic ID for scoping")

class ConversationSummary(BaseModel):
    conversation_id: str
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int = 0
    doctor_avatar: Optional[str] = None

class MessageThread(BaseModel):
    conversation_id: str
    thread_id: Optional[str] = None
    doctor: Dict[str, Any] = Field(default_factory=dict)
    messages: List[Dict[str, Any]] = Field(default_factory=list)
    total_messages: int = 0
    participants: List[Dict[str, str]] = Field(default_factory=list)
    unread_count: int = 0
    last_message_at: Optional[datetime] = None

# ──────────────────────────────────────────────────────────────────────────────
# Service Dependencies
# ──────────────────────────────────────────────────────────────────────────────

def get_messaging_service(db: Session = Depends(get_db)) -> MessagingService:
    """Get messaging service with database session."""
    return MessagingService(db)

def get_rbac_service() -> RBACService:
    """Get RBAC service."""
    return RBACService()

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/conversations", response_model=PaginatedResponse[ConversationSummary])
@audit_pii_access("read", "communication", "conversations_list")
async def get_conversations(
    request: Request,
    clinic_id: Optional[str] = Query(None, description="Clinic ID for scoping"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_patient: PatientUser = Depends(get_current_patient),
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get conversations for the current patient."""
    try:
        # Get patient's user_id
        patient = db.query(Patient).filter(Patient.patient_id == current_patient.patient_id).first()
        if not patient or not patient.user_id:
            raise HTTPException(
                status_code=404,
                detail="Patient user not found"
            )
        
        # Get conversations using messaging service
        conversations_result = await messaging_service.get_user_conversations(
            user_id=str(patient.user_id),
            user_role="patient",
            clinic_id=clinic_id,
            page=page,
            size=size
        )

        # Transform to ConversationSummary format
        conversations = []
        for conv in conversations_result["conversations"]:
            conversations.append(ConversationSummary(
                conversation_id=conv["conversation_id"],
                doctor_id=conv.get("doctor_id"),
                doctor_name=conv.get("doctor_name"),
                last_message=conv.get("last_message"),
                last_message_time=conv.get("last_message_time"),
                unread_count=conv.get("unread_count", 0),
                doctor_avatar=conv.get("doctor_avatar")
            ))

        return create_paginated_response(
            data=conversations,
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


@router.get("/conversations/{thread_id}/messages", response_model=SuccessResponse[MessageThread])
@audit_pii_access("read", "communication", "conversation_messages")
async def get_conversation_messages(
    request: Request,
    thread_id: str = Path(..., description="Thread ID"),
    limit: int = Query(50, ge=1, le=100, description="Number of messages"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_patient: PatientUser = Depends(get_current_patient),
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service)
):
    """Get messages for a specific conversation thread."""
    try:
        # Get patient's user_id
        patient = db.query(Patient).filter(Patient.patient_id == current_patient.patient_id).first()
        if not patient or not patient.user_id:
            raise HTTPException(
                status_code=404,
                detail="Patient user not found"
            )
        
        # Get conversation thread using messaging service
        thread_result = await messaging_service.get_conversation_thread(
            conversation_id=thread_id,
            user_id=str(patient.user_id),
            limit=limit,
            offset=offset
        )

        return SuccessResponse(
            data=MessageThread(
                conversation_id=thread_result["conversation_id"],
                thread_id=thread_result.get("thread_id", thread_result["conversation_id"]),
                doctor=thread_result.get("doctor", {}),
                messages=thread_result["messages"],
                total_messages=thread_result["total_messages"],
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


@router.post("/send", response_model=SuccessResponse[Dict[str, Any]], status_code=status.HTTP_201_CREATED)
@audit_pii_access("write", "communication", "message")
async def send_message(
    request: Request,
    payload: SendMessageRequest = Body(...),
    current_patient: PatientUser = Depends(get_current_patient),
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service)
):
    """Send message to doctor using shared messaging service."""
    try:
        # Get patient's user_id
        patient = db.query(Patient).filter(Patient.patient_id == current_patient.patient_id).first()
        if not patient or not patient.user_id:
            raise HTTPException(
                status_code=404,
                detail="Patient user not found"
            )
        
        # Send message using shared messaging service
        message_result = await messaging_service.send_message(
            sender_id=str(patient.user_id),
            recipient_id=payload.recipient_id,
            content=payload.content,
            message_type=payload.message_type,
            priority=payload.priority,
            patient_id=str(current_patient.patient_id),
            clinic_id=payload.clinic_id,
            metadata={
                "clinic_id": payload.clinic_id,
                "sender_role": "patient"
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


@router.post("/conversations/{thread_id}/mark-read", response_model=SuccessResponse[Dict[str, str]])
@audit_pii_access("write", "communication", "mark_read")
async def mark_conversation_read(
    request: Request,
    thread_id: str = Path(..., description="Thread ID"),
    current_patient: PatientUser = Depends(get_current_patient),
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service)
):
    """Mark all messages in a conversation as read."""
    try:
        # Get patient's user_id
        patient = db.query(Patient).filter(Patient.patient_id == current_patient.patient_id).first()
        if not patient or not patient.user_id:
            raise HTTPException(
                status_code=404,
                detail="Patient user not found"
            )
        
        # Mark conversation as read
        await messaging_service.mark_conversation_read(
            conversation_id=thread_id,
            user_id=str(patient.user_id)
        )

        return SuccessResponse(
            data={"status": "success", "thread_id": thread_id},
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


@router.get("/unread", response_model=SuccessResponse[Dict[str, int]])
@audit_pii_access("read", "communication", "unread_count")
async def get_unread_count(
    request: Request,
    current_patient: PatientUser = Depends(get_current_patient),
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db),
    messaging_service: MessagingService = Depends(get_messaging_service)
):
    """Get unread message count for the current patient."""
    try:
        # Get patient's user_id
        patient = db.query(Patient).filter(Patient.patient_id == current_patient.patient_id).first()
        if not patient or not patient.user_id:
            raise HTTPException(
                status_code=404,
                detail="Patient user not found"
            )
        
        # Get conversations to count unread messages
        conversations_result = await messaging_service.get_user_conversations(
            user_id=str(patient.user_id),
            user_role="patient",
            clinic_id=None,
            page=1,
            size=100
        )
        
        total_unread = sum(conv.get("unread_count", 0) for conv in conversations_result["conversations"])

        return SuccessResponse(
            data={"unread_count": total_unread},
            message="Unread count retrieved successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Unread Count Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve unread count: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())



