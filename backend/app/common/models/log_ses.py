# app/common/models/login_session.py
"""Login session tracking model for the EHR system."""
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, JSON, Index, Integer
from sqlalchemy.orm import relationship
from sqlalchemy import String
from sqlalchemy.sql import func
import uuid

from app.db.base_class import Base


class LoginSession(Base):
    """Enhanced login session tracking with device fingerprinting."""
    __tablename__ = "login_sessions"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Session token (hashed)
    session_token_hash = Column(String(255), unique=True, nullable=False, index=True)
    refresh_token_hash = Column(String(255), unique=True, nullable=True)
    
    # Device information
    device_type = Column(String(50), nullable=True)  # desktop, mobile, tablet
    device_name = Column(String(100), nullable=True)  # iPhone 12, Samsung Galaxy, etc.
    device_id = Column(String(255), nullable=True)  # Unique device identifier
    
    # Browser/App information
    browser = Column(String(50), nullable=True)  # Chrome, Safari, Firefox, Mobile App
    browser_version = Column(String(20), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Operating system
    os = Column(String(50), nullable=True)  # Windows, macOS, iOS, Android
    os_version = Column(String(20), nullable=True)
    
    # Network information
    ip_address = Column(String(45), nullable=False)  # Support IPv6
    ip_country = Column(String(2), nullable=True)
    ip_region = Column(String(100), nullable=True)
    ip_city = Column(String(100), nullable=True)
    location = Column(String(200), nullable=True)  # Formatted location string
    
    # Session activity
    login_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    last_activity_type = Column(String(50), nullable=True)  # page_view, api_call, etc.
    
    # Session status
    is_active = Column(Boolean, default=True)
    is_trusted = Column(Boolean, default=False)  # Trusted device
    logged_out_at = Column(DateTime(timezone=True), nullable=True)
    logout_reason = Column(String(50), nullable=True)  # user_logout, timeout, forced, security
    
    # Security
    two_factor_verified = Column(Boolean, default=False)
    suspicious_activity = Column(Boolean, default=False)
    risk_score = Column(Integer, default=0)  # 0-100
    
    # Session preferences
    session_data = Column(JSON, nullable=True)  # Temporary session data
    
    # Expiration
    expires_at = Column(DateTime(timezone=True), nullable=False)
    idle_timeout_minutes = Column(Integer, default=30)
    absolute_timeout_hours = Column(Integer, default=24)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="login_sessions")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_user_active_sessions', 'user_id', 'is_active'),
        Index('idx_session_activity', 'last_activity', 'is_active'),
    )