# app/common/models/messaging.py
"""Common messaging and communication models for the EHR system."""
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.base_class import Base
from app.common.schemas.user_enhanced import MessageTypeEnhanced as MessageType, NotificationChannel


class MessagePriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class Message(Base):
    """Messages between users and patients."""
    __tablename__ = "messages"
    __table_args__ = {"schema": "ehr"}
    
    # Primary identifiers
    # Note: Database column is UUID, so we use UUID(as_uuid=True) to match
    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    conversation_id = Column(String, index=True, nullable=False)
    
    # Participants
    # Note: These reference UUID columns in core.users and ehr.patients
    sender_id = Column(UUID(as_uuid=True), ForeignKey("core.users.id"), nullable=False)
    recipient_id = Column(UUID(as_uuid=True), ForeignKey("core.users.id"), nullable=True)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("ehr.patients.patient_id"), nullable=True)
    
    # Message content
    subject = Column(String, nullable=False)  # Required by database schema
    content = Column(Text, nullable=False)
    message_type = Column(Enum(MessageType, native_enum=False), default=MessageType.TEXT)
    priority = Column(Enum(MessagePriority, native_enum=False), default=MessagePriority.NORMAL)
    
    # Status
    read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    delivered = Column(Boolean, default=False)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    
    # Threading
    # Note: parent_message_id references ehr.messages.id which is UUID
    parent_message_id = Column(UUID(as_uuid=True), ForeignKey("ehr.messages.id"), nullable=True)
    
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
    
    # Thread reference
    thread_id = Column(String, ForeignKey("ehr.message_threads.id"), nullable=True)
    
    # Clinic scoping
    clinic_id = Column(String, nullable=True)
    
    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="received_messages")
    patient = relationship("Patient", back_populates="messages")
    parent_message = relationship("Message", remote_side=[id])
    attachments = relationship("MessageAttachment", back_populates="message", cascade="all, delete-orphan", lazy="select")
    thread = relationship("MessageThread", back_populates="messages")
    receipts = relationship("MessageReceipt", back_populates="message", cascade="all, delete-orphan")


class MessageAttachment(Base):
    """File attachments for messages."""
    __tablename__ = "message_attachments"
    __table_args__ = {"schema": "ehr"}
    
    id = Column(String, primary_key=True, index=True)
    message_id = Column(String, ForeignKey("ehr.messages.id"), nullable=False)
    
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
    __table_args__ = {"schema": "ehr"}
    
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
    created_by = Column(String, ForeignKey("core.users.id"), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creator = relationship("User")


class SystemNotification(Base):
    """System notifications for users."""
    __tablename__ = "system_notifications"
    __table_args__ = {"schema": "ops"}
    
    # Primary identifiers
    id = Column(String, primary_key=True, index=True)
    
    # Recipient
    recipient_id = Column(String, ForeignKey("core.users.id"), nullable=False)
    sender_id = Column(String, ForeignKey("core.users.id"), nullable=True)
    
    # Content
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String, default="info")  # info, success, warning, error
    
    # Delivery
    channel = Column(Enum(NotificationChannel, native_enum=False), default=NotificationChannel.IN_APP)
    
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
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="system_notifications")
    sender = relationship("User", foreign_keys=[sender_id])


class MessageThreadType(str, enum.Enum):
    """Thread type for messaging."""
    PATIENT_CHAT = "patient_chat"
    CASE_ROOM = "case_room"  # Encounter-based
    STAFF_CHANNEL = "staff_channel"
    STAFF_CHAT = "staff_chat"  # Staff-to-staff direct messaging


class MessageThread(Base):
    """Message thread for patient chat, case room (encounter), or staff channel."""
    __tablename__ = "message_threads"
    __table_args__ = {"schema": "ehr"}
    
    # Primary identifiers
    id = Column(String, primary_key=True, index=True)
    thread_type = Column(String, nullable=False)  # Use String instead of Enum to store lowercase values
    
    # Context
    patient_id = Column(UUID(as_uuid=True), ForeignKey("ehr.patients.patient_id"), nullable=True)
    encounter_id = Column(UUID(as_uuid=True), ForeignKey("ehr.encounters.id"), nullable=True)  # For case rooms
    clinic_id = Column(String, nullable=True)  # For clinic scoping
    
    # Thread metadata
    title = Column(String, nullable=True)  # Optional title for case rooms/staff channels
    description = Column(Text, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_archived = Column(Boolean, default=False)
    archived_at = Column(DateTime(timezone=True), nullable=True)
    
    # Retention
    retention_days = Column(Integer, nullable=True)  # Clinic policy retention period
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # FHIR reference
    fhir_communication_id = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="message_threads")
    messages = relationship("Message", back_populates="thread", cascade="all, delete-orphan")
    participants = relationship("MessageThreadParticipant", back_populates="thread", cascade="all, delete-orphan")
    receipts = relationship("MessageReceipt", back_populates="thread", cascade="all, delete-orphan")


class MessageThreadParticipant(Base):
    """Participants in a message thread."""
    __tablename__ = "message_thread_participants"
    __table_args__ = {"schema": "ehr"}
    
    # Primary identifiers
    id = Column(String, primary_key=True, index=True)
    thread_id = Column(String, ForeignKey("ehr.message_threads.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("core.users.id"), nullable=False)
    
    # Role in thread
    role = Column(String, nullable=True)  # doctor, nurse, patient, staff
    
    # Status
    is_active = Column(Boolean, default=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    left_at = Column(DateTime(timezone=True), nullable=True)
    
    # Notification preferences
    notify_on_message = Column(Boolean, default=True)
    notify_on_mention = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    thread = relationship("MessageThread", back_populates="participants")
    user = relationship("User")


class MessageReceipt(Base):
    """HIPAA-compliant read receipt tracking for messages."""
    __tablename__ = "message_receipts"
    __table_args__ = {"schema": "ehr"}
    
    # Primary identifiers
    id = Column(String, primary_key=True, index=True)
    # Note: Database column is UUID, so we use UUID(as_uuid=True) to match
    message_id = Column(UUID(as_uuid=True), ForeignKey("ehr.messages.id"), nullable=False)
    thread_id = Column(String, ForeignKey("ehr.message_threads.id"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("core.users.id"), nullable=False)
    
    # Receipt status
    read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Delivery status
    delivered = Column(Boolean, default=False)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    
    # Device/IP for audit
    device_info = Column(String, nullable=True)  # User agent, device type
    ip_address = Column(String, nullable=True)  # For HIPAA audit trail
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    message = relationship("Message", back_populates="receipts")
    thread = relationship("MessageThread", back_populates="receipts")
    user = relationship("User")


class Todo(Base):
    """Task/todo items for users."""
    __tablename__ = "todos"
    __table_args__ = {"schema": "ops"}
    
    # Primary identifiers
    id = Column(String, primary_key=True, index=True)
    
    # Task details
    description = Column(String, nullable=False)
    category = Column(String, nullable=True)  # appointment, patient, administrative, etc.
    priority = Column(String, default="medium")  # low, medium, high
    
    # Assignment
    created_by = Column(String, ForeignKey("core.users.id"), nullable=False)
    assigned_to = Column(String, ForeignKey("core.users.id"), nullable=True)
    patient_id = Column(String, ForeignKey("ehr.patients.patient_id"), nullable=True)
    
    # Status
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    completed_by = Column(String, ForeignKey("core.users.id"), nullable=True)
    
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