# app/portals/reception/schemas/message.py
"""Patient messaging and communication schemas."""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator

from app.common.schemas.base import MessageType


# ============================= Request Models =============================
class SendMessage(BaseModel):
    """Send message request schema."""
    patient_id: str
    text: str = Field(..., min_length=1, max_length=1000)
    message_type: MessageType = MessageType.GENERAL
    template_id: Optional[str] = None
    
    @validator('text')
    def validate_message_text(cls, v):
        if not v.strip():
            raise ValueError('Message cannot be empty')
        return v.strip()


class MessageTemplateCreate(BaseModel):
    """Create message template request schema."""
    name: str = Field(..., min_length=1, max_length=100)
    content: str = Field(..., min_length=1, max_length=500)
    category: str = Field(..., pattern="^(appointment|medical|billing|general)$")
    variables: List[str] = Field(default_factory=list)
    
    @validator('variables')
    def validate_variables(cls, v, values):
        if 'content' in values:
            # Extract variables from content (e.g., {patient_name})
            import re
            found_vars = re.findall(r'\{(\w+)\}', values['content'])
            if set(found_vars) != set(v):
                raise ValueError('Variables list must match variables in content')
        return v


class MarkMessageRead(BaseModel):
    """Mark message as read request schema."""
    message_ids: List[str] = Field(..., min_items=1)


class MessageSearch(BaseModel):
    """Message search parameters."""
    search: Optional[str] = None
    patient_id: Optional[str] = None
    unread_only: bool = False
    priority: Optional[str] = Field(None, pattern="^(all|normal|urgent)$")
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    limit: int = Field(50, ge=1, le=100)


# ============================= Response Models =============================
class ConversationItem(BaseModel):
    """Individual message in a conversation."""
    id: str
    sender: str  # "patient" | "reception"
    text: str
    time: str  # ISO-8601
    read: bool = False
    message_type: str = "general"
    attachment_url: Optional[str] = None
    
    class Config:
        from_attributes = True


class ConversationMeta(BaseModel):
    """Conversation metadata for list view."""
    patient_id: str
    patient_name: str
    patient_phone: Optional[str] = None
    patient_email: Optional[str] = None
    last_message: str = Field(..., alias="lastMessage")  # human readable
    last_message_text: str = Field(..., alias="lastMessageText")  # preview
    issue: Optional[str] = None
    active: bool = False
    unread_count: int = 0
    priority: str = "normal"  # normal | urgent
    
    class Config:
        populate_by_name = True
        from_attributes = True


class MessageStats(BaseModel):
    """Message statistics for dashboard."""
    total_conversations: int
    unread_messages: int
    urgent_messages: int
    active_conversations: int


class MessageTemplate(BaseModel):
    """Message template schema."""
    id: str
    name: str
    content: str
    category: str
    variables: List[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class MessageSendResponse(BaseModel):
    """Message send response."""
    id: str
    sent_at: datetime
    delivery_status: Dict[str, Any] = Field(default_factory=dict)


class FileAttachment(BaseModel):
    """File attachment information."""
    id: str
    filename: str
    content_type: str
    size: int
    url: str
    uploaded_at: datetime
    
    class Config:
        from_attributes = True


class AttachmentUploadResponse(BaseModel):
    """Attachment upload response."""
    id: str
    attachment_id: str
    filename: str
    size: int
    url: str


class ConversationHistory(BaseModel):
    """Full conversation history response."""
    patient: Dict[str, Any]  # Patient info
    messages: List[ConversationItem]
    total_messages: int
    has_more: bool
    oldest_message_date: Optional[datetime] = None
    newest_message_date: Optional[datetime] = None