# app/common/models/notification.py
"""Notification models for the EHR system."""
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, Enum, JSON, Integer, Table
from sqlalchemy.orm import relationship
from sqlalchemy import String
from sqlalchemy.sql import func
import uuid
import enum
from sqlalchemy import UniqueConstraint

from app.db.base_class import Base


class NotificationType(str, enum.Enum):
    APPOINTMENT_REMINDER = "appointment_reminder"
    APPOINTMENT_CONFIRMATION = "appointment_confirmation"
    APPOINTMENT_CANCELLATION = "appointment_cancellation"
    LAB_RESULT_READY = "lab_result_ready"
    PRESCRIPTION_READY = "prescription_ready"
    PRESCRIPTION_REMINDER = "prescription_reminder"
    PAYMENT_DUE = "payment_due"
    PAYMENT_RECEIVED = "payment_received"
    MESSAGE_RECEIVED = "message_received"
    DOCUMENT_SHARED = "document_shared"
    SYSTEM_ALERT = "system_alert"
    EMERGENCY_ALERT = "emergency_alert"


class NotificationChannel(str, enum.Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    VOICE_CALL = "voice_call"


class NotificationPriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class NotificationStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Notification(Base):
    """User notifications."""
    __tablename__ = "notifications"
    __table_args__ = {"schema": "ops"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # Recipient
    recipient_id = Column(String(36), ForeignKey("core.users.id"), nullable=False)
    
    # Notification details
    notification_type = Column(Enum(NotificationType, native_enum=False), nullable=False)
    channel = Column(Enum(NotificationChannel, native_enum=False), nullable=False)
    priority = Column(Enum(NotificationPriority, native_enum=False), default=NotificationPriority.NORMAL)
    
    # Content
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(JSON, nullable=True)  # Additional structured data
    
    # References
    reference_type = Column(String(50), nullable=True)  # appointment, prescription, etc.
    reference_id = Column(String(36), nullable=True)
    
    # Status
    status = Column(Enum(NotificationStatus, native_enum=False), default=NotificationStatus.PENDING)
    
    # Delivery tracking
    scheduled_for = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Failure tracking
    failed_at = Column(DateTime(timezone=True), nullable=True)
    failure_reason = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    
    # Actions
    action_url = Column(String(500), nullable=True)
    action_text = Column(String(100), nullable=True)
    requires_action = Column(Boolean, default=False)
    action_taken = Column(Boolean, default=False)
    action_taken_at = Column(DateTime(timezone=True), nullable=True)
    
    # Expiration
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Grouping
    group_id = Column(String(100), nullable=True)  # For grouping related notifications
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    recipient = relationship("User", back_populates="notifications")
    templates_used = relationship(
        "NotificationTemplate",
        secondary="notification_template_usage",
        back_populates="used_by_notifications",
    )


class NotificationTemplate(Base):
    """Notification templates."""
    __tablename__ = "notification_templates"
    __table_args__ = {"schema": "ops"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # Template identification
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    notification_type = Column(Enum(NotificationType, native_enum=False), nullable=False)
    
    # Content templates
    channels = Column(JSON, nullable=False)  # Array of supported channels
    title_template = Column(Text, nullable=False)
    message_template = Column(Text, nullable=False)
    
    # Channel-specific templates
    email_subject_template = Column(Text, nullable=True)
    email_body_template = Column(Text, nullable=True)
    sms_template = Column(Text, nullable=True)
    push_template = Column(Text, nullable=True)
    
    # Variables
    required_variables = Column(JSON, nullable=True)  # Array of required variable names
    optional_variables = Column(JSON, nullable=True)  # Array of optional variable names
    
    # Settings
    is_active = Column(Boolean, default=True)
    priority = Column(Enum(NotificationPriority, native_enum=False), default=NotificationPriority.NORMAL)
    
    # Localization
    language = Column(String(5), default="en")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    used_by_notifications = relationship(
        "Notification",
        secondary="notification_template_usage",
        back_populates="templates_used",
    )


# Association table for Notification <-> NotificationTemplate usage
notification_template_usage = Table(
    "notification_template_usage",
    Base.metadata,
    Column("notification_id", String(36), ForeignKey("ops.notifications.id"), primary_key=True),
    Column("template_id", String(36), ForeignKey("ops.notification_templates.id"), primary_key=True),
)


class NotificationPreference(Base):
    """User notification preferences."""
    __tablename__ = "notification_preferences"
    __table_args__ = {"schema": "ops"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(String(36), ForeignKey("core.users.id"), nullable=False)
    
    # Type preferences
    notification_type = Column(Enum(NotificationType, native_enum=False), nullable=False)
    
    # Channel preferences
    in_app_enabled = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=False)
    push_enabled = Column(Boolean, default=True)
    voice_enabled = Column(Boolean, default=False)
    
    # Timing preferences
    quiet_hours_enabled = Column(Boolean, default=False)
    quiet_hours_start = Column(String(5), nullable=True)  # HH:MM
    quiet_hours_end = Column(String(5), nullable=True)
    
    # Frequency
    max_per_day = Column(Integer, nullable=True)
    min_interval_minutes = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint('user_id', 'notification_type', name='uq_user_notification_type'),
    )