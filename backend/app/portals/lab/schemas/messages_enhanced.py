"""Enhanced Lab portal messaging schemas."""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# ================================
# Enhanced Messaging Schemas
# ================================

class MessageTypeEnum(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    VOICE = "voice"
    VIDEO = "video"

class MessagePriorityEnum(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class MessageStatusEnum(str, Enum):
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"

class SendMessageRequest(BaseModel):
    """Enhanced message sending request (staff-to-staff only)."""
    recipient_id: str = Field(..., description="Recipient user ID (staff member)")
    content: str = Field(..., min_length=1, max_length=5000, description="Message content")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    message_type: MessageTypeEnum = Field(MessageTypeEnum.TEXT, description="Message type")
    priority: MessagePriorityEnum = Field(MessagePriorityEnum.NORMAL, description="Message priority")
    reply_to_message_id: Optional[str] = Field(None, description="Reply to message ID")
    attachments: List[str] = Field(default_factory=list, description="Attachment IDs")
    document_attachments: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Document attachments (reports, lab results)")

    @validator('content')
    def _validate_message_content(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) == 0:
                raise ValueError('Message content cannot be empty')
            if len(v) > 5000:
                raise ValueError('Message content cannot exceed 5000 characters')
        return v

class MessageTemplateRequest(BaseModel):
    """Message template request."""
    template_name: str = Field(..., min_length=1, max_length=100, description="Template name")
    content: str = Field(..., min_length=1, max_length=5000, description="Template content")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    category: str = Field("general", description="Template category")
    variables: List[str] = Field(default_factory=list, description="Template variables")

class ConversationSummary(BaseModel):
    """Enhanced conversation summary (staff-to-staff only)."""
    conversation_id: str = Field(..., description="Conversation ID")
    patient_id: str = Field("", description="Patient ID (empty for staff-to-staff)")
    patient_name: str = Field(..., description="Staff member name")
    last_message: Optional[str] = Field(None, description="Last message content")
    last_message_time: Optional[str] = Field(None, description="Last message timestamp")
    unread_count: int = Field(0, description="Number of unread messages")
    patient_avatar: Optional[str] = Field(None, description="Staff member avatar")
    patient_issue: Optional[str] = Field(None, description="Not used for staff")
    clinic_id: str = Field(..., description="Clinic ID")
    doctor_id: str = Field(..., description="Lab technician ID")
    recipient_user_id: Optional[str] = Field(None, description="Recipient user ID (for staff conversations)")

class MessageThread(BaseModel):
    """Enhanced message thread (staff-to-staff only)."""
    conversation_id: str = Field(..., description="Conversation ID")
    thread_id: Optional[str] = Field(None, description="Thread ID")
    patient: Dict[str, Any] = Field(default_factory=dict, description="Staff member information (empty for staff-to-staff)")
    messages: List[Dict[str, Any]] = Field(..., description="List of messages")
    total_messages: int = Field(0, description="Total messages in thread")
    clinic_id: Optional[str] = Field(None, description="Clinic ID")
    doctor_id: Optional[str] = Field(None, description="Lab technician ID")
    fhir_conversation_id: Optional[str] = Field(None, description="FHIR Communication ID")
    participants: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Thread participants")
    unread_count: Optional[int] = Field(0, description="Unread message count")
    last_message_at: Optional[str] = Field(None, description="Last message timestamp")

class MessageTemplate(BaseModel):
    """Enhanced message template."""
    id: str = Field(..., description="Template ID")
    name: str = Field(..., description="Template name")
    content: str = Field(..., description="Template content")
    category: str = Field(..., description="Template category")
    variables: List[str] = Field(..., description="Template variables")
    clinic_id: str = Field(..., description="Clinic ID")
    doctor_id: str = Field(..., description="Lab technician ID")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    usage_count: int = Field(0, description="Usage count")

class MessageResponse(BaseModel):
    """Enhanced message response."""
    id: str = Field(..., description="Message ID")
    conversation_id: str = Field(..., description="Conversation ID")
    sender_id: str = Field(..., description="Sender ID")
    recipient_id: str = Field(..., description="Recipient ID")
    content: str = Field(..., description="Message content")
    message_type: str = Field(..., description="Message type")
    priority: str = Field(..., description="Message priority")
    status: str = Field(..., description="Message status")
    attachments: List[Dict[str, Any]] = Field(default_factory=list, description="Message attachments")
    reply_to_message_id: Optional[str] = Field(None, description="Reply to message ID")
    clinic_id: str = Field(..., description="Clinic ID")
    doctor_id: str = Field(..., description="Lab technician ID")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    delivered_at: Optional[str] = Field(None, description="Delivery timestamp")
    read_at: Optional[str] = Field(None, description="Read timestamp")
    fhir_message_id: Optional[str] = Field(None, description="FHIR Communication ID")

class MessageStats(BaseModel):
    """Enhanced message statistics."""
    total_messages: int = Field(..., description="Total messages sent")
    unread_messages: int = Field(..., description="Unread messages")
    conversations_count: int = Field(..., description="Number of conversations")
    messages_today: int = Field(..., description="Messages sent today")
    messages_this_week: int = Field(..., description="Messages sent this week")
    messages_this_month: int = Field(..., description="Messages sent this month")
    average_response_time: Optional[float] = Field(None, description="Average response time in hours")
    clinic_id: str = Field(..., description="Clinic ID")
    doctor_id: str = Field(..., description="Lab technician ID")

class AttachmentUpload(BaseModel):
    """Attachment upload request."""
    filename: str = Field(..., description="Original filename")
    content_type: str = Field(..., description="File content type")
    size: int = Field(..., ge=1, le=10485760, description="File size in bytes")
    clinic_id: str = Field(..., description="Clinic ID for scoping")

    @validator('filename')
    def _validate_filename(cls, v):
        if v:
            dangerous_chars = ['..', '/', '\\', ':', '*', '?', '"', '<', '>', '|']
            if any(char in v for char in dangerous_chars):
                raise ValueError('Filename contains invalid characters')
            if len(v) > 255:
                raise ValueError('Filename too long')
        return v

class AttachmentResponse(BaseModel):
    """Attachment response."""
    id: str = Field(..., description="Attachment ID")
    filename: str = Field(..., description="Original filename")
    content_type: str = Field(..., description="File content type")
    size: int = Field(..., description="File size in bytes")
    url: str = Field(..., description="Download URL")
    clinic_id: str = Field(..., description="Clinic ID")
    doctor_id: str = Field(..., description="Lab technician ID")
    created_at: str = Field(..., description="Creation timestamp")
    fhir_binary_id: Optional[str] = Field(None, description="FHIR Binary ID")

class MessageSearch(BaseModel):
    """Enhanced message search parameters."""
    conversation_id: Optional[str] = Field(None, description="Filter by conversation ID")
    recipient_id: Optional[str] = Field(None, description="Filter by recipient ID (staff member)")
    message_type: Optional[MessageTypeEnum] = Field(None, description="Filter by message type")
    priority: Optional[MessagePriorityEnum] = Field(None, description="Filter by priority")
    status: Optional[MessageStatusEnum] = Field(None, description="Filter by status")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    
    # Date filters
    date_from: Optional[str] = Field(None, description="Filter from date YYYY-MM-DD")
    date_to: Optional[str] = Field(None, description="Filter to date YYYY-MM-DD")
    
    # Search
    search_query: Optional[str] = Field(None, min_length=2, description="Search in message content")
    
    # Pagination
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Page size")
    
    # Sorting
    sort_by: str = Field("created_at", pattern=r'^(created_at|updated_at|priority|status)$')
    sort_order: str = Field("desc", pattern=r'^(asc|desc)$')

class ConversationCreate(BaseModel):
    """Create new conversation request (staff-to-staff only)."""
    recipient_id: str = Field(..., description="Recipient user ID (staff member)")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    initial_message: Optional[str] = Field(None, description="Initial message content")
    message_type: MessageTypeEnum = Field(MessageTypeEnum.TEXT, description="Initial message type")
    priority: MessagePriorityEnum = Field(MessagePriorityEnum.NORMAL, description="Initial message priority")

class ConversationResponse(BaseModel):
    """Enhanced conversation response (staff-to-staff only)."""
    id: str = Field(..., description="Conversation ID")
    recipient_id: str = Field(..., description="Recipient user ID (staff member)")
    recipient_name: str = Field(..., description="Recipient name")
    clinic_id: str = Field(..., description="Clinic ID")
    doctor_id: str = Field(..., description="Lab technician ID")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    last_message_at: Optional[str] = Field(None, description="Last message timestamp")
    message_count: int = Field(0, description="Total message count")
    unread_count: int = Field(0, description="Unread message count")
    fhir_conversation_id: Optional[str] = Field(None, description="FHIR Communication ID")

class MessageMarkReadRequest(BaseModel):
    """Mark messages as read request."""
    message_ids: List[str] = Field(..., description="Message IDs to mark as read")
    conversation_id: str = Field(..., description="Conversation ID")
    clinic_id: str = Field(..., description="Clinic ID for scoping")

class MessageDeleteRequest(BaseModel):
    """Delete message request."""
    message_id: str = Field(..., description="Message ID to delete")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    reason: Optional[str] = Field(None, description="Deletion reason")

class NotificationSettings(BaseModel):
    """Message notification settings."""
    email_notifications: bool = Field(True, description="Enable email notifications")
    sms_notifications: bool = Field(False, description="Enable SMS notifications")
    push_notifications: bool = Field(True, description="Enable push notifications")
    notification_sound: bool = Field(True, description="Enable notification sound")
    quiet_hours_start: Optional[str] = Field(None, description="Quiet hours start time HH:MM")
    quiet_hours_end: Optional[str] = Field(None, description="Quiet hours end time HH:MM")
    clinic_id: str = Field(..., description="Clinic ID for scoping")

    @validator('quiet_hours_start', 'quiet_hours_end')
    def _validate_quiet_hours(cls, v):
        if v:
            try:
                datetime.strptime(v, "%H:%M")
            except ValueError:
                raise ValueError('Quiet hours must be in HH:MM format')
        return v

# NOTE: Validators are defined within classes above for Pydantic compatibility

