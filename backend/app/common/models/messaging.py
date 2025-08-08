# app/common/models/messaging.py
"""Common messaging and communication models for the EHR system."""
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.base_class import Base
from app.common.schemas.user import MessageType, NotificationChannel


class MessagePriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class Message(Base):
    """Messages between users and patients."""
    __tablename__ = "messages"
    
    # Primary identifiers
    id = Column(String, primary_key=True, index=True)
    conversation_id = Column(String, index=True, nullable=False)
    
    # Participants
    sender_id = Column(String, ForeignKey("users.id"), nullable=False)
    recipient_id = Column(String, ForeignKey("users.id"), nullable=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=True)
    
    # Message content
    content = Column(Text, nullable=False)
    message_type = Column(Enum(MessageType), default=MessageType.TEXT)
    priority = Column(Enum(MessagePriority), default=MessagePriority.NORMAL)
    
    # Status
    read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    delivered = Column(Boolean, default=False)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    
    # Threading
    parent_message_id = Column(String, ForeignKey("messages.id"), nullable=True)
    
    # System message flag
    is_system_message = Column(Boolean, default=False)
    
    # Template
    template_id = Column(String, nullable=True)
    template_variables = Column(Text, nullable=True)  # JSON
    
    # FHIR reference
    fhir_communication_id = Column(String, nullable=True)
    
    # Timestamps
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    edited_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="received_messages")
    patient = relationship("Patient", back_populates="messages")
    parent_message = relationship("Message", remote_side=[id])
    attachments = relationship("MessageAttachment", back_populates="message", cascade="all, delete-orphan")


class MessageAttachment(Base):
    """File attachments for messages."""
    __tablename__ = "message_attachments"
    
    id = Column(String, primary_key=True, index=True)
    message_id = Column(String, ForeignKey("messages.id"), nullable=False)
    
    # File details
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)  # bytes
    file_url = Column(String, nullable=False)
    
    # Metadata
    description = Column(String, nullable=True)
    
    # Upload info
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # FHIR reference
    fhir_binary_id = Column(String, nullable=True)
    
    # Relationships
    message = relationship("Message", back_populates="attachments")


class MessageTemplate(Base):
    """Predefined message templates."""
    __tablename__ = "message_templates"
    
    id = Column(String, primary_key=True, index=True)
    
    # Template info
    name = Column(String, nullable=False, unique=True)
    category = Column(String, nullable=False)  # appointment, medical, billing, general
    content = Column(Text, nullable=False)
    
    # Variables (JSON array)
    variables = Column(Text, nullable=True)  # ["patient_name", "date", "time"]
    
    # Usage
    is_active = Column(Boolean, default=True)
    use_count = Column(Integer, default=0)
    
    # Permissions
    role_restrictions = Column(Text, nullable=True)  # JSON array of roles
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User")


class Notification(Base):
    """System notifications for users."""
    __tablename__ = "notifications"
    
    # Primary identifiers
    id = Column(String, primary_key=True, index=True)
    
    # Recipient
    recipient_id = Column(String, ForeignKey("users.id"), nullable=False)
    sender_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    # Content
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String, default="info")  # info, success, warning, error
    
    # Delivery
    channel = Column(Enum(NotificationChannel), default=NotificationChannel.IN_APP)
    
    # Status
    read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    sent = Column(Boolean, default=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    
    # Action
    action_url = Column(String, nullable=True)
    action_required = Column(Boolean, default=False)
    action_taken = Column(Boolean, default=False)
    action_taken_at = Column(DateTime(timezone=True), nullable=True)
    
    # Scheduling
    scheduled_for = Column(DateTime(timezone=True), nullable=True)
    
    # Delivery status
    delivery_status = Column(String, nullable=True)  # pending, sent, delivered, failed
    delivery_attempts = Column(Integer, default=0)
    last_attempt_at = Column(DateTime(timezone=True), nullable=True)
    
    # Reference
    reference_type = Column(String, nullable=True)  # appointment, report, prescription, etc.
    reference_id = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="notifications")
    sender = relationship("User", foreign_keys=[sender_id])


class Todo(Base):
    """Task/todo items for users."""
    __tablename__ = "todos"
    
    # Primary identifiers
    id = Column(String, primary_key=True, index=True)
    
    # Task details
    description = Column(String, nullable=False)
    category = Column(String, nullable=True)  # appointment, patient, administrative, etc.
    priority = Column(String, default="medium")  # low, medium, high
    
    # Assignment
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    assigned_to = Column(String, ForeignKey("users.id"), nullable=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=True)
    
    # Status
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    completed_by = Column(String, ForeignKey("users.id"), nullable=True)
    
    # Dates
    date = Column(String, nullable=False)  # ISO date string for display
    due_date = Column(DateTime(timezone=True), nullable=True)
    reminder_date = Column(DateTime(timezone=True), nullable=True)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by], back_populates="todos_created")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="todos_assigned")
    completer = relationship("User", foreign_keys=[completed_by])
    patient = relationship("Patient")