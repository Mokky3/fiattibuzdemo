# app/common/schemas/user.py
"""
User-related schemas for the EHR system
Includes authentication, profiles, settings, and messaging
Based on doctor portal router models
"""
from datetime import datetime, time
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, validator
from enum import Enum

from app.common.schemas.base import TimestampMixin, UserBase as BaseUserModel


# ──────────────────────────────────────────────────────────────────────────────
# User and Authentication Enums (enhanced from base)
# ──────────────────────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    ADMIN = "admin"
    DOCTOR = "doctor"
    NURSE = "nurse"
    RECEPTIONIST = "receptionist"
    PATIENT = "patient"
    SUPPORT = "support"


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"


class MessageType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    VOICE = "voice"
    SYSTEM = "system"
    GENERAL = "general"
    APPOINTMENT = "appointment"
    REMINDER = "reminder"
    URGENT = "urgent"
    ATTACHMENT = "attachment"


class NotificationChannel(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"


# ──────────────────────────────────────────────────────────────────────────────
# User Base Models (enhanced)
# ──────────────────────────────────────────────────────────────────────────────

class User(BaseUserModel):
    """Complete user model"""
    id: str
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    password_hash: str = Field(..., description="Hashed password")
    email_verified: bool = False
    phone_verified: bool = False
    two_factor_enabled: bool = False
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    password_changed_at: Optional[datetime] = None
    profile_image_url: Optional[str] = None
    is_active: bool = True
    last_login: Optional[datetime] = None
    timezone: str = Field("UTC", description="User timezone")
    language: str = Field("en", description="Preferred language")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    """Schema for creating users"""
    email: EmailStr
    password: str = Field(..., min_length=8, description="User password")
    confirm_password: str = Field(..., description="Password confirmation")
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    role: UserRole
    phone: Optional[str] = None
    department: Optional[str] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v


class UserUpdate(BaseModel):
    """Schema for updating users"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    status: Optional[UserStatus] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    is_active: Optional[bool] = None


class UserInDB(User):
    """User in database with additional fields"""
    practitioner_id: Optional[str] = None
    
    class Config:
        from_attributes = True


# ──────────────────────────────────────────────────────────────────────────────
# Doctor Profile Models
# ──────────────────────────────────────────────────────────────────────────────

class DoctorProfileBase(BaseModel):
    """Base doctor profile"""
    specialty: Optional[str] = Field(None, max_length=100)
    license_number: Optional[str] = Field(None, max_length=50)
    organization: Optional[str] = Field(None, max_length=200)
    bio: Optional[str] = Field(None, max_length=1000)
    years_of_experience: Optional[int] = Field(None, ge=0, le=60)
    education: Optional[List[str]] = Field(default_factory=list)
    certifications: Optional[List[str]] = Field(default_factory=list)


class DoctorProfile(DoctorProfileBase):
    """Doctor profile model (backend format)"""
    user_id: str
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_image: Optional[str] = None
    

class DoctorProfileResponse(BaseModel):
    """Doctor profile response (frontend format)"""
    fullName: str  # camelCase for frontend
    email: EmailStr
    phone: Optional[str] = None
    specialty: Optional[str] = None
    licenseNumber: Optional[str] = None
    organization: Optional[str] = None
    bio: Optional[str] = None
    address: Optional[str] = None
    profileImage: Optional[str] = None


class DoctorUser(BaseModel):
    """Doctor user for authentication"""
    id: str
    full_name: str
    email: EmailStr
    role: UserRole = UserRole.DOCTOR
    specialty: Optional[str] = None
    is_active: bool = True


# ──────────────────────────────────────────────────────────────────────────────
# Settings Models
# ──────────────────────────────────────────────────────────────────────────────

class NotificationSettings(BaseModel):
    """Notification preferences"""
    emailNotifications: bool = True  # camelCase for frontend compatibility
    smsNotifications: bool = False
    appointmentReminders: bool = True
    patientMessages: bool = True
    systemUpdates: bool = True
    marketingEmails: bool = False
    reminderTiming: str = Field("1hour", pattern="^(15min|30min|1hour|2hours|1day)$")


class SecuritySettings(BaseModel):
    """Security preferences"""
    currentPassword: str = ""  # camelCase for frontend compatibility
    newPassword: str = ""
    confirmPassword: str = ""
    twoFactorEnabled: bool = False
    loginAlerts: bool = True
    sessionTimeout: str = Field("30", pattern="^(15|30|60|120|0)$")  # minutes as string


class WorkingHours(BaseModel):
    """Working hours configuration"""
    start: str = Field("09:00", pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    end: str = Field("17:00", pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")


class LunchBreak(BaseModel):
    """Lunch break configuration"""
    enabled: bool = True
    start: str = Field("12:00", pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    end: str = Field("13:00", pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")


class AvailabilitySettings(BaseModel):
    """Doctor availability settings"""
    workingDays: List[str] = Field(
        default_factory=lambda: ["monday", "tuesday", "wednesday", "thursday", "friday"]
    )
    workingHours: WorkingHours = Field(default_factory=WorkingHours)
    lunchBreak: LunchBreak = Field(default_factory=LunchBreak)
    consultationDuration: str = Field("30", pattern="^(15|30|45|60)$")
    bufferTime: str = Field("10", pattern="^(0|5|10|15|30)$")
    
    @validator('workingDays')
    def validate_working_days(cls, v):
        valid_days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        for day in v:
            if day not in valid_days:
                raise ValueError(f'Invalid day: {day}')
        return v


class AllSettings(BaseModel):
    """Combined settings model"""
    notifications: NotificationSettings
    security: SecuritySettings
    availability: AvailabilitySettings


class PasswordChange(BaseModel):
    """Password change request"""
    currentPassword: str = Field(..., min_length=1)
    newPassword: str = Field(..., min_length=8)
    confirmPassword: str = Field(..., min_length=8)
    
    @validator('confirmPassword')
    def passwords_match(cls, v, values):
        if 'newPassword' in values and v != values['newPassword']:
            raise ValueError('New password and confirmation do not match')
        return v


# ──────────────────────────────────────────────────────────────────────────────
# Messaging Models
# ──────────────────────────────────────────────────────────────────────────────

class MessageBase(BaseModel):
    """Base message model"""
    sender_id: str
    recipient_id: str
    content: str = Field(..., min_length=1, max_length=2000)
    message_type: MessageType = MessageType.TEXT


class MessageCreate(BaseModel):
    """Message creation schema"""
    recipient_id: str
    content: str = Field(..., min_length=1, max_length=2000)
    message_type: MessageType = MessageType.TEXT
    parent_message_id: Optional[str] = None  # For replies


class SendMessagePayload(BaseModel):
    """Frontend message payload"""
    recipient_id: str
    content: str


class Message(MessageBase, TimestampMixin):
    """Complete message model"""
    id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    sender_name: Optional[str] = None
    recipient_name: Optional[str] = None
    read: bool = False
    read_at: Optional[datetime] = None
    conversation_id: Optional[str] = None
    parent_message_id: Optional[str] = None
    
    # Attachments
    attachments: Optional[List[str]] = Field(default_factory=list)
    
    # System fields
    is_system_message: bool = False
    priority: str = Field("normal", pattern="^(low|normal|high|urgent)$")


class DashboardMessage(BaseModel):
    """Message model for dashboard display"""
    id: str
    name: str  # Sender name
    avatar: str  # Sender initials
    lastMessage: str  # Last message content
    timestamp: Optional[str] = None
    unread: bool = True
    sender_id: Optional[str] = None


class Conversation(BaseModel):
    """Conversation summary"""
    id: str
    patient_id: str
    patient_name: str
    last_message: Optional[str] = None
    last_message_time: Optional[str] = None
    unread_count: int = 0
    patient_avatar: Optional[str] = None
    patient_issue: Optional[str] = None


class MessageThread(BaseModel):
    """Message thread with full conversation"""
    conversation_id: str
    patient: Dict[str, str]
    messages: List[Message]
    total_messages: int


# ──────────────────────────────────────────────────────────────────────────────
# Dashboard and Todo Models
# ──────────────────────────────────────────────────────────────────────────────

class TodoBase(BaseModel):
    """Base todo item"""
    description: str = Field(..., min_length=1, max_length=500)
    provider: str = Field(..., description="Who assigned or created this task")
    priority: str = Field("medium", pattern="^(low|medium|high)$")
    category: Optional[str] = None
    due_date: Optional[datetime] = None


class TodoCreate(TodoBase):
    """Todo creation schema"""
    assigned_to: Optional[str] = None  # User ID
    patient_id: Optional[str] = None


class Todo(TodoBase, TimestampMixin):
    """Complete todo model"""
    id: str
    date: str = Field(..., description="ISO date string (YYYY-MM-DD)")
    completed: bool = False
    completed_at: Optional[datetime] = None
    completed_by: Optional[str] = None
    assigned_to: Optional[str] = None
    patient_id: Optional[str] = None


class TodoToggle(BaseModel):
    """Todo completion toggle"""
    completed: Optional[bool] = None


# ──────────────────────────────────────────────────────────────────────────────
# Statistics Models
# ──────────────────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    """Dashboard statistics"""
    total_appointments: int = 0
    pending_todos: int = 0
    unread_messages: int = 0
    today_appointments: int = 0
    completed_todos: int = 0
    upcoming_appointments: int = 0


class DoctorStats(BaseModel):
    """Basic doctor statistics"""
    patients_seen: int = 0
    appointments_today: int = 0
    prescriptions_written: int = 0
    tasks_pending: int = 0


class DetailedStats(DoctorStats):
    """Detailed doctor statistics"""
    total_patients: int = 0
    upcoming_appointments: int = 0
    completed_appointments: int = 0
    pending_appointments: int = 0
    active_prescriptions: int = 0
    completed_tasks: int = 0
    unread_messages: int = 0
    reports_generated: int = 0


class WeeklyStats(BaseModel):
    """Weekly statistics breakdown"""
    date: str  # ISO date
    appointments: int = 0
    patients: int = 0
    prescriptions: int = 0


class MonthlyOverview(BaseModel):
    """Monthly statistics overview"""
    month: str  # "January 2024"
    total_appointments: int = 0
    unique_patients: int = 0
    prescriptions_written: int = 0
    reports_generated: int = 0
    average_daily_appointments: float = 0.0


class StatsComparison(BaseModel):
    """Period-over-period statistics comparison"""
    current_period: Dict[str, int]
    previous_period: Dict[str, int]
    percentage_change: Dict[str, float]
    period_type: str = Field(..., pattern="^(week|month|year)$")


# ──────────────────────────────────────────────────────────────────────────────
# Authentication Models
# ──────────────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    """User login request"""
    username_or_email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    remember_me: bool = False
    two_factor_code: Optional[str] = Field(None, pattern="^[0-9]{6}$")


class LoginResponse(BaseModel):
    """Login response"""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: DoctorUser
    requires_2fa: bool = False


class TokenRefreshRequest(BaseModel):
    """Token refresh request"""
    refresh_token: str


class PasswordResetRequest(BaseModel):
    """Password reset request"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation"""
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


# ──────────────────────────────────────────────────────────────────────────────
# Session and Activity Models
# ──────────────────────────────────────────────────────────────────────────────

class UserSession(BaseModel):
    """User session information"""
    session_id: str
    user_id: str
    ip_address: str
    user_agent: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    is_active: bool = True


class UserActivity(BaseModel):
    """User activity log"""
    user_id: str
    activity_type: str  # "login", "logout", "create_report", "view_patient", etc.
    description: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    resource_id: Optional[str] = None  # ID of the resource being acted upon
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


# ──────────────────────────────────────────────────────────────────────────────
# Notification Models
# ──────────────────────────────────────────────────────────────────────────────

class NotificationBase(BaseModel):
    """Base notification model"""
    recipient_id: str
    title: str = Field(..., max_length=200)
    message: str = Field(..., max_length=1000)
    notification_type: str = Field("info", pattern="^(info|success|warning|error)$")
    channel: NotificationChannel = NotificationChannel.IN_APP


class NotificationCreate(NotificationBase):
    """Notification creation schema"""
    sender_id: Optional[str] = None
    action_url: Optional[str] = None
    scheduled_for: Optional[datetime] = None


class Notification(NotificationBase, TimestampMixin):
    """Complete notification model"""
    id: str
    sender_id: Optional[str] = None
    read: bool = False
    read_at: Optional[datetime] = None
    sent: bool = False
    sent_at: Optional[datetime] = None
    action_url: Optional[str] = None
    scheduled_for: Optional[datetime] = None
    delivery_status: Optional[str] = None
    

# ──────────────────────────────────────────────────────────────────────────────
# System Configuration Models
# ──────────────────────────────────────────────────────────────────────────────

class SystemSettings(BaseModel):
    """System-wide settings"""
    site_name: str = "EHR System"
    site_description: Optional[str] = None
    default_timezone: str = "UTC"
    default_language: str = "en"
    max_file_upload_size: int = 10485760  # 10MB in bytes
    session_timeout_minutes: int = 30
    password_min_length: int = 8
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 15
    

class FeatureFlags(BaseModel):
    """Feature flags for system capabilities"""
    messaging_enabled: bool = True
    file_upload_enabled: bool = True
    two_factor_auth_enabled: bool = True
    api_rate_limiting_enabled: bool = True
    audit_logging_enabled: bool = True
    fhir_integration_enabled: bool = True


# ──────────────────────────────────────────────────────────────────────────────
# Response Models
# ──────────────────────────────────────────────────────────────────────────────

class UserProfileResponse(BaseModel):
    """User profile response"""
    user: User
    profile: Optional[DoctorProfile] = None
    settings: Optional[AllSettings] = None
    stats: Optional[DoctorStats] = None


class DashboardOverview(BaseModel):
    """Complete dashboard overview"""
    stats: DashboardStats
    today_appointments: List[Dict[str, Any]] = Field(default_factory=list)
    pending_todos: List[Todo] = Field(default_factory=list)
    recent_messages: List[DashboardMessage] = Field(default_factory=list)
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class MessageStatsResponse(BaseModel):
    """Message statistics response"""
    total_conversations: int = 0
    unread_messages: int = 0
    messages_sent: int = 0
    messages_received: int = 0
    total_messages: int = 0