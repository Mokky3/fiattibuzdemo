# app/common/models/user.py
"""User and authentication models for the EHR system."""
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Text,
    JSON,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.ext.mutable import MutableDict
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.base_class import Base, UUIDColumn


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    CLINIC_ADMIN = "CLINIC_ADMIN"
    DOCTOR = "DOCTOR"
    NURSE = "NURSE"
    RECEPTIONIST = "RECEPTIONIST"
    LAB_TECHNICIAN = "LAB_TECHNICIAN"
    RADIOLOGIST = "RADIOLOGIST"
    PHARMACIST = "PHARMACIST"
    PATIENT = "PATIENT"


class UserStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"
    PENDING = "PENDING"


class User(Base):
    """Base user model for authentication and authorization."""
    __tablename__ = "users"
    __table_args__ = {"schema": "core"}
    
    # Primary identifiers
    id = UUIDColumn(primary_key=True, default=uuid.uuid4, index=True)
    username = Column(String(50), unique=True, index=True, nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    
    # Authentication
    password_hash = Column(String(255), nullable=False)
    email_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)
    two_factor_enabled = Column(Boolean, default=False)
    two_factor_secret = Column(String(255), nullable=True)
    
    # Personal information
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    middle_name = Column(String(100), nullable=True)
    full_name = Column(String(200), nullable=True)
    phone = Column(String(20), nullable=True)
    
    # Role and status
    role = Column(Enum(UserRole, native_enum=False), nullable=False)
    status = Column(Enum(UserStatus, native_enum=False), default=UserStatus.ACTIVE)
    is_active = Column(Boolean, default=True)
    
    # Organization association
    organization_id = UUIDColumn(ForeignKey("ref.hospitals.id"), nullable=True)
    department_id = UUIDColumn(ForeignKey("ref.hospital_departments.id"), nullable=True)
    admin_department_id = UUIDColumn(ForeignKey("ref.hospital_departments.id"), nullable=True)
    
    # Security tracking
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    password_changed_at = Column(DateTime(timezone=True), nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    last_activity = Column(DateTime(timezone=True), nullable=True)
    
    # Preferences
    timezone = Column(String(50), default="Asia/Tashkent")
    language = Column(String(5), default="uz")  # uz, ru, en
    profile_image_url = Column(String(500), nullable=True)
    
    # Permissions (JSON array of permission codes)
    custom_permissions = Column(MutableDict.as_mutable(JSON), default=dict, nullable=True)
    
    # FHIR reference
    fhir_practitioner_id = Column(String(255), unique=True, nullable=True)  # For medical staff
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    organization = relationship("Hospital", back_populates="users")
    department = relationship("HospitalDepartment", back_populates="users", foreign_keys=[department_id])
    admin_department = relationship("HospitalDepartment", foreign_keys=[admin_department_id])
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("UserActivity", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    # Role-specific profiles
    doctor_profile = relationship("Doctor", back_populates="user", uselist=False, cascade="all, delete-orphan")
    nurse_profile = relationship("Nurse", back_populates="user", uselist=False, cascade="all, delete-orphan")
    patient_profile = relationship("Patient", foreign_keys="Patient.user_id", back_populates="user", uselist=False)
    practitioner = relationship("Practitioner", back_populates="user", uselist=False)
    
    # Activities
    medical_records_created = relationship("MedicalRecord", foreign_keys="MedicalRecord.created_by", back_populates="creator")
    prescriptions_created = relationship("Prescription", foreign_keys="Prescription.prescribed_by", back_populates="prescriber")
    
    # Notifications
    notifications = relationship("Notification", back_populates="recipient", cascade="all, delete-orphan")
    system_notifications = relationship(
        "SystemNotification",
        back_populates="recipient",
        cascade="all, delete-orphan",
        foreign_keys="SystemNotification.recipient_id",
    )
    
    # Messaging
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender", cascade="all, delete-orphan")
    received_messages = relationship("Message", foreign_keys="Message.recipient_id", back_populates="recipient", cascade="all, delete-orphan")
    todos_created = relationship("Todo", foreign_keys="Todo.created_by", back_populates="creator", cascade="all, delete-orphan")
    todos_assigned = relationship("Todo", foreign_keys="Todo.assigned_to", back_populates="assignee", cascade="all, delete-orphan")
    
    # Login sessions
    login_sessions = relationship("LoginSession", back_populates="user", cascade="all, delete-orphan")


class UserProfile(Base):
    """Extended user profile information."""
    __tablename__ = "user_profiles"
    __table_args__ = {"schema": "core"}
    
    id = UUIDColumn(primary_key=True, default=uuid.uuid4, index=True)
    user_id = UUIDColumn(ForeignKey("core.users.id"), unique=True, nullable=False)
    
    # Professional information (for medical staff)
    specialty = Column(String(100), nullable=True)
    sub_specialty = Column(String(100), nullable=True)
    license_number = Column(String(50), nullable=True)
    license_expiry = Column(Date, nullable=True)
    qualification = Column(String(200), nullable=True)
    years_of_experience = Column(Integer, nullable=True)
    
    # Bio and education
    bio = Column(Text, nullable=True)
    education = Column(JSON, nullable=True)  # Array of education records
    certifications = Column(JSON, nullable=True)  # Array of certifications
    languages_spoken = Column(JSON, nullable=True)  # Array of languages
    
    # Additional contact
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    zip_code = Column(String(20), nullable=True)
    country = Column(String(2), default="UZ")
    
    # Employment
    employee_id = Column(String(50), nullable=True)
    position = Column(String(100), nullable=True)
    start_date = Column(Date, nullable=True)
    contract_type = Column(String(50), nullable=True)  # full-time, part-time, contract
    
    # Emergency contact
    emergency_contact_name = Column(String(200), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    emergency_contact_relationship = Column(String(50), nullable=True)
    
    # Banking (for staff payments)
    bank_account_number = Column(String(50), nullable=True)
    bank_name = Column(String(100), nullable=True)
    tax_id = Column(String(50), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="profile")


class UserSession(Base):
    """User session tracking."""
    __tablename__ = "user_sessions"
    __table_args__ = {"schema": "core"}
    
    id = UUIDColumn(primary_key=True, default=uuid.uuid4, index=True)
    user_id = UUIDColumn(ForeignKey("core.users.id"), nullable=False)
    
    # Session info
    token_hash = Column(String(255), nullable=False, index=True)
    refresh_token_hash = Column(String(255), nullable=True, index=True)
    
    # Device/location info
    ip_address = Column(String(45), nullable=True)  # Support IPv6
    user_agent = Column(String(500), nullable=True)
    device_type = Column(String(50), nullable=True)  # desktop, mobile, tablet
    device_info = Column(JSON, nullable=True)
    location = Column(String(200), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Status
    is_active = Column(Boolean, default=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_reason = Column(String(200), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="sessions")


class UserActivity(Base):
    """User activity logging for audit trail."""
    __tablename__ = "user_activities"
    __table_args__ = {"schema": "core"}
    
    id = UUIDColumn(primary_key=True, default=uuid.uuid4, index=True)
    user_id = UUIDColumn(ForeignKey("core.users.id"), nullable=False)
    
    # Activity details
    activity_type = Column(String(50), nullable=False)  # login, logout, create, update, delete, view
    description = Column(Text, nullable=True)  # specific action description
    resource_id = UUIDColumn(nullable=True)
    
    # Request info
    ip_address = Column(INET, nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Additional data
    user_metadata = Column("metadata", JSON, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    user = relationship("User", back_populates="activities")


class UserSettings(Base):
    """User preferences and settings."""
    __tablename__ = "user_settings"
    __table_args__ = {"schema": "core"}
    
    id = UUIDColumn(primary_key=True, default=uuid.uuid4, index=True)
    user_id = UUIDColumn(ForeignKey("core.users.id"), unique=True, nullable=False)
    
    # Notification preferences
    email_notifications = Column(Boolean, default=True)
    sms_notifications = Column(Boolean, default=False)
    push_notifications = Column(Boolean, default=True)
    
    # Notification types
    appointment_reminders = Column(Boolean, default=True)
    appointment_confirmations = Column(Boolean, default=True)
    appointment_cancellations = Column(Boolean, default=True)
    lab_results_ready = Column(Boolean, default=True)
    prescription_reminders = Column(Boolean, default=True)
    patient_messages = Column(Boolean, default=True)
    system_updates = Column(Boolean, default=True)
    marketing_emails = Column(Boolean, default=False)
    
    # Reminder timings
    appointment_reminder_time = Column(String(20), default="1day")  # 15min, 30min, 1hour, 2hours, 1day, 2days
    prescription_reminder_time = Column(String(20), default="morning")  # morning, afternoon, evening, custom
    
    # Security preferences
    login_alerts = Column(Boolean, default=True)
    session_timeout = Column(Integer, default=30)  # minutes
    require_password_change = Column(Integer, default=90)  # days
    
    # Availability settings (for medical staff)
    available_for_appointments = Column(Boolean, default=True)
    available_for_emergency = Column(Boolean, default=True)
    working_days = Column(JSON, nullable=True)  # Array of weekdays
    working_hours_start = Column(String(5), default="09:00")
    working_hours_end = Column(String(5), default="17:00")
    lunch_break_enabled = Column(Boolean, default=True)
    lunch_break_start = Column(String(5), default="12:00")
    lunch_break_end = Column(String(5), default="13:00")
    consultation_duration = Column(Integer, default=30)  # minutes
    buffer_time = Column(Integer, default=10)  # minutes between appointments
    
    # Display preferences
    theme = Column(String(20), default="light")  # light, dark, auto
    sidebar_collapsed = Column(Boolean, default=False)
    font_size = Column(String(20), default="medium")  # small, medium, large
    high_contrast = Column(Boolean, default=False)
    date_format = Column(String(20), default="DD/MM/YYYY")
    time_format = Column(String(2), default="24")  # 12 or 24
    start_page = Column(String(50), default="dashboard")
    items_per_page = Column(Integer, default=20)
    
    # Dashboard widgets (JSON array of widget configurations)
    dashboard_layout = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="settings")


class Permission(Base):
    """Permission definitions for role-based access control."""
    __tablename__ = "permissions"
    __table_args__ = {"schema": "core"}
    
    id = UUIDColumn(primary_key=True, default=uuid.uuid4, index=True)
    code = Column(String(100), unique=True, nullable=False)  # e.g., "patient.view", "appointment.create"
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False)  # patient, appointment, medical_record, etc.
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    roles = relationship("RolePermission", back_populates="permission")


class RolePermission(Base):
    """Role-Permission mapping."""
    __tablename__ = "role_permissions"
    __table_args__ = {"schema": "core"}
    
    id = UUIDColumn(primary_key=True, default=uuid.uuid4, index=True)
    role = Column(Enum(UserRole, native_enum=False), nullable=False)
    permission_id = UUIDColumn(ForeignKey("core.permissions.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    permission = relationship("Permission", back_populates="roles")
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint('role', 'permission_id', name='uq_role_permission'),
    )