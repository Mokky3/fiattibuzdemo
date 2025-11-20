"""
User invitation models for handling user registration through email/SMS links
"""
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, String, DateTime, Boolean, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.base_class import Base


class InvitationStatus(str, enum.Enum):
    """Invitation status enum"""
    PENDING = "PENDING"
    SENT = "SENT"
    ACCEPTED = "ACCEPTED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class ContactType(str, enum.Enum):
    """Contact type enum"""
    EMAIL = "EMAIL"
    PHONE = "PHONE"


class UserInvitation(Base):
    """User invitation model for handling registration links"""
    __tablename__ = "user_invitations"
    __table_args__ = {"schema": "core"}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    
    # Contact information
    contact = Column(String(255), nullable=False, index=True)  # email or phone
    contact_type = Column(Enum(ContactType), nullable=False)
    
    # Invitation details
    invitation_token = Column(String(255), nullable=False, unique=True, index=True)
    invitation_link = Column(Text, nullable=True)
    
    # User details to be created
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    role = Column(String(50), nullable=False)
    organization_id = Column(String(36), ForeignKey("ref.hospitals.id"), nullable=True)
    
    # Invitation status and tracking
    status = Column(Enum(InvitationStatus), default=InvitationStatus.PENDING, nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Notification tracking
    notification_sent = Column(Boolean, default=False, nullable=False)
    notification_type = Column(String(50), nullable=True)  # EMAIL, SMS, etc.
    notification_provider = Column(String(100), nullable=True)  # SendGrid, Twilio, etc.
    notification_id = Column(String(255), nullable=True)  # Provider's message ID
    
    # Audit fields
    created_by = Column(String(36), ForeignKey("core.users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    organization = relationship("Hospital", foreign_keys=[organization_id])
    creator = relationship("User", foreign_keys=[created_by])
    
    def is_expired(self) -> bool:
        """Check if invitation is expired"""
        return datetime.now(timezone.utc) > self.expires_at
    
    def is_valid(self) -> bool:
        """Check if invitation is valid (not expired and pending/sent)"""
        return (
            not self.is_expired() and 
            self.status in [InvitationStatus.PENDING, InvitationStatus.SENT]
        )
    
    def generate_invitation_token(self) -> str:
        """Generate a unique invitation token"""
        return str(uuid.uuid4())
    
    def generate_invitation_link(self, base_url: str) -> str:
        """Generate the invitation link"""
        return f"{base_url}/register?token={self.invitation_token}"
    
    def __repr__(self):
        return f"<UserInvitation(id={self.id}, contact={self.contact}, status={self.status})>"
