"""Enhanced user-related schemas for surgical edits integration."""
from datetime import datetime, time
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, validator
import enum
from .base_enhanced import (
    TimestampMixin, ClinicScopedMixin, FHIRMixin, AuditMixin,
    UserRole, UserStatus, MessageType, MessagePriority, MessageStatus,
    NotificationType, ClinicScope, FHIRReference, FHIRCodeableConcept,
    validate_email_format, format_phone_number
)

# ============================= Enhanced User and Authentication Enums =============================

class UserRoleEnhanced(str, enum.Enum):
    """Enhanced user roles with surgical edits additions."""
    SUPER_ADMIN = "super_admin"
    CLINIC_ADMIN = "clinic_admin"
    DOCTOR = "doctor"
    NURSE = "nurse"
    RECEPTIONIST = "receptionist"
    PATIENT = "patient"
    LAB_TECHNICIAN = "lab_technician"
    RADIOLOGIST = "radiologist"
    PHARMACIST = "pharmacist"
    SUPPORT = "support"

class UserStatusEnhanced(str, enum.Enum):
    """Enhanced user statuses."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"
    LOCKED = "locked"
    EXPIRED = "expired"

class MessageTypeEnhanced(str, enum.Enum):
    """Enhanced message types for surgical edits."""
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    VOICE = "voice"
    VIDEO = "video"
    TEMPLATE = "template"
    SYSTEM = "system"
    APPOINTMENT = "appointment"
    REMINDER = "reminder"
    URGENT = "urgent"
    ATTACHMENT = "attachment"
    PRESCRIPTION = "prescription"
    REPORT = "report"
    LAB_RESULT = "lab_result"
    IMAGING = "imaging"

class NotificationChannel(str, enum.Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"
    WHATSAPP = "whatsapp"
    TELEGRAM = "telegram"

class SessionStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"
    SUSPENDED = "suspended"

class ActivityType(str, enum.Enum):
    LOGIN = "login"
    LOGOUT = "logout"
    CREATE_REPORT = "create_report"
    VIEW_PATIENT = "view_patient"
    UPDATE_PRESCRIPTION = "update_prescription"
    SEND_MESSAGE = "send_message"
    VIEW_MEDICAL_RECORD = "view_medical_record"
    EXPORT_DATA = "export_data"
    IMPORT_DATA = "import_data"
    FHIR_SYNC = "fhir_sync"
    AUDIT_LOG_ACCESS = "audit_log_access"

# ============================= Enhanced User Base Models =============================

class UserBase(BaseModel):
    """Enhanced base user model."""
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    middle_name: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = None
    role: UserRoleEnhanced = UserRoleEnhanced.PATIENT
    status: UserStatusEnhanced = UserStatusEnhanced.ACTIVE
    
    @validator('email')
    def validate_email_field(cls, v):
        return validate_email_format(v)
    
    @validator('phone')
    def validate_phone_field(cls, v):
        if v:
            return format_phone_number(v)
        return v
    
    @property
    def full_name(self) -> str:
        name_parts = [self.first_name]
        if self.middle_name:
            name_parts.append(self.middle_name)
        name_parts.append(self.last_name)
        return " ".join(name_parts)

class User(BaseModel):
    """Enhanced complete user model."""
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
    timezone: str = Field("Asia/Tashkent", description="User timezone")
    language: str = Field("en", description="Preferred language")
    
    # Enhanced fields for surgical edits
    pinfl: Optional[str] = Field(None, description="Personal identification number")
    passport_number: Optional[str] = Field(None, max_length=20)
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = Field(None, pattern=r'^(male|female|other)$')
    address: Optional[str] = Field(None, max_length=500)
    
    # FHIR integration
    fhir_practitioner_id: Optional[str] = None
    fhir_practitioner_role_id: Optional[str] = None
    fhir_patient_id: Optional[str] = None
    
    # RBAC and permissions
    permissions: Optional[List[str]] = Field(default_factory=list)
    role_assignments: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    
    # Security
    session_timeout: int = Field(30, description="Session timeout in minutes")
    password_expires_at: Optional[datetime] = None
    must_change_password: bool = False
    
    class Config:
        from_attributes = True

class UserCreate(UserBase):
    """Enhanced schema for creating users."""
    password: str = Field(..., min_length=8, description="User password")
    confirm_password: str = Field(..., description="Password confirmation")
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    department: Optional[str] = None
    clinic_id: str = Field(..., description="Clinic ID for multi-tenant scoping")
    
    # Enhanced fields for surgical edits
    pinfl: Optional[str] = None
    passport_number: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    
    # FHIR integration fields
    create_fhir_practitioner: bool = Field(False, description="Create FHIR Practitioner resource")
    create_fhir_practitioner_role: bool = Field(False, description="Create FHIR PractitionerRole resource")
    create_fhir_patient: bool = Field(False, description="Create FHIR Patient resource")
    
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
    
    @validator('pinfl')
    def validate_pinfl_field(cls, v):
        if v:
            if len(v) != 14:
                raise ValueError('PINFL must be exactly 14 digits')
            if not v.isdigit():
                raise ValueError('PINFL must contain only digits')
        return v

class UserUpdate(BaseModel):
    """Enhanced schema for updating users."""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[UserRoleEnhanced] = None
    department: Optional[str] = None
    status: Optional[UserStatusEnhanced] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    is_active: Optional[bool] = None
    
    # Enhanced fields for surgical edits
    pinfl: Optional[str] = None
    passport_number: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    
    # FHIR integration
    fhir_practitioner_id: Optional[str] = None
    fhir_practitioner_role_id: Optional[str] = None
    fhir_patient_id: Optional[str] = None
    
    # Custom permissions/access
    custom_permissions: Optional[Dict[str, Any]] = None
    
    @validator('email')
    def validate_email_field(cls, v):
        if v:
            return validate_email_format(v)
        return v
    
    @validator('phone')
    def validate_phone_field(cls, v):
        if v:
            return format_phone_number(v)
        return v

class UserInDB(User):
    """Enhanced user in database with additional fields."""
    practitioner_id: Optional[str] = None
    patient_id: Optional[str] = None
    
    class Config:
        from_attributes = True

# ============================= Enhanced Doctor Profile Models =============================

class DoctorProfileBase(BaseModel):
    """Enhanced base doctor profile."""
    specialty: Optional[str] = Field(None, max_length=100)
    license_number: Optional[str] = Field(None, max_length=50)
    organization: Optional[str] = Field(None, max_length=200)
    bio: Optional[str] = Field(None, max_length=1000)
    years_of_experience: Optional[int] = Field(None, ge=0, le=60)
    education: Optional[List[str]] = Field(default_factory=list)
    certifications: Optional[List[str]] = Field(default_factory=list)
    
    # Enhanced fields for surgical edits
    department: Optional[str] = Field(None, max_length=100)
    clinic_id: str
    fhir_practitioner_id: Optional[str] = None
    fhir_practitioner_role_id: Optional[str] = None
    fhir_organization_id: Optional[str] = None
    fhir_location_id: Optional[str] = None
    
    # Professional details
    medical_license_expiry: Optional[datetime] = None
    insurance_provider: Optional[str] = None
    malpractice_insurance: Optional[str] = None
    languages_spoken: Optional[List[str]] = Field(default_factory=list)
    
    # Availability and scheduling
    consultation_fee: Optional[float] = None
    follow_up_fee: Optional[float] = None
    emergency_fee: Optional[float] = None
    accepts_insurance: bool = True
    accepts_telemedicine: bool = False

class DoctorProfile(BaseModel):
    """Enhanced doctor profile model."""
    user_id: str
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_image: Optional[str] = None
    
    # Enhanced fields for surgical edits
    pinfl: Optional[str] = None
    passport_number: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    
    # Professional metrics
    total_patients: int = 0
    total_appointments: int = 0
    patient_satisfaction_rating: Optional[float] = None
    average_appointment_duration: Optional[float] = None
    
    # FHIR integration
    fhir_practitioner_id: Optional[str] = None
    fhir_practitioner_role_id: Optional[str] = None
    fhir_organization_id: Optional[str] = None
    fhir_location_id: Optional[str] = None

class AdminProfileResponse(BaseModel):
    """Admin profile response schema."""
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    role: str
    status: str
    created_at: str
    updated_at: str
    organization_id: Optional[str] = None
    profile_image_url: Optional[str] = None

class DoctorProfileResponse(BaseModel):
    """Enhanced doctor profile response (frontend format)."""
    fullName: str  # camelCase for frontend
    email: EmailStr
    phone: Optional[str] = None
    specialty: Optional[str] = None
    licenseNumber: Optional[str] = None
    organization: Optional[str] = None
    bio: Optional[str] = None
    address: Optional[str] = None
    profileImage: Optional[str] = None
    
    # Enhanced fields for surgical edits
    department: Optional[str] = None
    clinicId: Optional[str] = None
    fhirPractitionerId: Optional[str] = None
    fhirPractitionerRoleId: Optional[str] = None
    yearsOfExperience: Optional[int] = None
    education: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    languagesSpoken: Optional[List[str]] = None
    acceptsInsurance: bool = True
    acceptsTelemedicine: bool = False
    consultationFee: Optional[float] = None
    followUpFee: Optional[float] = None
    emergencyFee: Optional[float] = None

class DoctorUser(BaseModel):
    """Enhanced doctor user for authentication."""
    id: str
    full_name: str
    email: EmailStr
    role: UserRoleEnhanced = UserRoleEnhanced.DOCTOR
    specialty: Optional[str] = None
    clinic_id: str
    is_active: bool = True
    
    # Enhanced fields for surgical edits
    fhir_practitioner_id: Optional[str] = None
    fhir_practitioner_role_id: Optional[str] = None
    permissions: Optional[List[str]] = Field(default_factory=list)

# ============================= Enhanced Settings Models =============================

class NotificationSettings(BaseModel):
    """Enhanced notification preferences."""
    emailNotifications: bool = True  # camelCase for frontend compatibility
    smsNotifications: bool = False
    pushNotifications: bool = True
    appointmentReminders: bool = True
    patientMessages: bool = True
    systemUpdates: bool = True
    marketingEmails: bool = False
    reminderTiming: str = Field("1hour", pattern=r'^(15min|30min|1hour|2hours|1day)$')
    
    # Enhanced fields for surgical edits
    prescriptionReminders: bool = True
    labResultNotifications: bool = True
    imagingResultNotifications: bool = True
    emergencyAlerts: bool = True
    fhirSyncNotifications: bool = False
    auditLogNotifications: bool = False

class SecuritySettings(BaseModel):
    """Enhanced security preferences."""
    currentPassword: str = ""  # camelCase for frontend compatibility
    newPassword: str = ""
    confirmPassword: str = ""
    twoFactorEnabled: bool = False
    loginAlerts: bool = True
    sessionTimeout: str = Field("30", pattern=r'^(15|30|60|120|0)$')  # minutes as string
    
    # Enhanced fields for surgical edits
    passwordExpiryDays: int = Field(90, ge=30, le=365)
    maxFailedAttempts: int = Field(5, ge=3, le=10)
    lockoutDurationMinutes: int = Field(15, ge=5, le=60)
    requireStrongPassword: bool = True
    sessionConcurrencyLimit: int = Field(3, ge=1, le=10)
    
    # Additional security settings
    enableEncryption: bool = False
    enableAuditLogs: bool = True

class WorkingHours(BaseModel):
    """Enhanced working hours configuration."""
    start: str = Field("09:00", pattern=r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')
    end: str = Field("17:00", pattern=r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')
    
    # Enhanced fields for surgical edits
    timezone: str = Field("Asia/Tashkent")
    isWorkingDay: bool = True

class LunchBreak(BaseModel):
    """Enhanced lunch break configuration."""
    enabled: bool = True
    start: str = Field("12:00", pattern=r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')
    end: str = Field("13:00", pattern=r'^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')
    
    # Enhanced fields for surgical edits
    duration: int = Field(60, ge=15, le=180, description="Duration in minutes")

class AvailabilitySettings(BaseModel):
    """Enhanced doctor availability settings."""
    workingDays: List[str] = Field(
        default_factory=lambda: ["monday", "tuesday", "wednesday", "thursday", "friday"]
    )
    workingHours: WorkingHours = Field(default_factory=WorkingHours)
    lunchBreak: LunchBreak = Field(default_factory=LunchBreak)
    consultationDuration: str = Field("30", pattern=r'^(15|30|45|60)$')
    bufferTime: str = Field("10", pattern=r'^(0|5|10|15|30)$')
    
    # Enhanced fields for surgical edits
    emergencyAvailability: bool = False
    telemedicineAvailability: bool = False
    homeVisitAvailability: bool = False
    maxPatientsPerDay: int = Field(20, ge=1, le=50)
    advanceBookingDays: int = Field(30, ge=1, le=90)
    
    @validator('workingDays')
    def validate_working_days(cls, v):
        valid_days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        for day in v:
            if day not in valid_days:
                raise ValueError(f'Invalid day: {day}')
        return v

class AllSettings(BaseModel):
    """Enhanced combined settings model."""
    notifications: NotificationSettings
    security: SecuritySettings
    availability: AvailabilitySettings
    
    # Enhanced fields for surgical edits
    fhir: Optional[Dict[str, Any]] = None
    audit: Optional[Dict[str, Any]] = None
    clinic: Optional[Dict[str, Any]] = None

class PasswordChange(BaseModel):
    """Enhanced password change request."""
    currentPassword: str = Field(..., min_length=1)
    newPassword: str = Field(..., min_length=8)
    confirmPassword: str = Field(..., min_length=8)
    
    # Enhanced fields for surgical edits
    requireCurrentPassword: bool = True
    enforceStrongPassword: bool = True
    
    @validator('newPassword')
    def validate_password_strength(cls, v):
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in v):
            raise ValueError('Password must contain at least one special character')
        return v
    
    @validator('confirmPassword')
    def passwords_match(cls, v, values):
        if 'newPassword' in values and v != values['newPassword']:
            raise ValueError('New password and confirmation do not match')
        return v

# ============================= Enhanced Messaging Models =============================

class MessageBase(BaseModel):
    """Enhanced base message model."""
    sender_id: str
    recipient_id: str
    content: str = Field(..., min_length=1, max_length=2000)
    message_type: MessageTypeEnhanced = MessageTypeEnhanced.TEXT
    
    # Enhanced fields for surgical edits
    clinic_id: str
    priority: MessagePriority = MessagePriority.NORMAL
    is_encrypted: bool = False
    requires_acknowledgment: bool = False

class MessageCreate(BaseModel):
    """Enhanced message creation schema."""
    recipient_id: str
    content: str = Field(..., min_length=1, max_length=2000)
    message_type: MessageTypeEnhanced = MessageTypeEnhanced.TEXT
    parent_message_id: Optional[str] = None  # For replies
    
    # Enhanced fields for surgical edits
    clinic_id: str
    priority: MessagePriority = MessagePriority.NORMAL
    template_id: Optional[str] = None
    attachments: Optional[List[str]] = Field(default_factory=list)
    is_encrypted: bool = False
    requires_acknowledgment: bool = False

class SendMessagePayload(BaseModel):
    """Enhanced frontend message payload."""
    recipient_id: str
    content: str
    
    # Enhanced fields for surgical edits
    clinic_id: Optional[str] = None
    message_type: Optional[MessageTypeEnhanced] = None
    priority: Optional[MessagePriority] = None
    template_id: Optional[str] = None
    attachments: Optional[List[str]] = None

class Message(BaseModel):
    """Enhanced complete message model."""
    id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    sender_name: Optional[str] = None
    recipient_name: Optional[str] = None
    read: bool = False
    read_at: Optional[datetime] = None
    conversation_id: Optional[str] = None
    parent_message_id: Optional[str] = None
    
    # Enhanced fields for surgical edits
    status: MessageStatus = MessageStatus.SENT
    priority: MessagePriority = MessagePriority.NORMAL
    is_encrypted: bool = False
    requires_acknowledgment: bool = False
    acknowledged: bool = False
    acknowledged_at: Optional[datetime] = None
    
    # Attachments
    attachments: Optional[List[str]] = Field(default_factory=list)
    fhir_binary_ids: Optional[List[str]] = Field(default_factory=list)
    
    # System fields
    is_system_message: bool = False
    template_id: Optional[str] = None
    template_data: Optional[Dict[str, Any]] = None
    
    # FHIR integration
    fhir_communication_id: Optional[str] = None

class DashboardMessage(BaseModel):
    """Enhanced message model for dashboard display."""
    id: str
    name: str  # Sender name
    avatar: str  # Sender initials
    lastMessage: str  # Last message content
    timestamp: Optional[str] = None
    unread: bool = True
    sender_id: Optional[str] = None
    
    # Enhanced fields for surgical edits
    clinic_id: Optional[str] = None
    message_type: Optional[MessageTypeEnhanced] = None
    priority: Optional[MessagePriority] = None
    has_attachments: bool = False

class Conversation(BaseModel):
    """Enhanced conversation summary."""
    id: str
    patient_id: str
    patient_name: str
    last_message: Optional[str] = None
    last_message_time: Optional[str] = None
    unread_count: int = 0
    patient_avatar: Optional[str] = None
    patient_issue: Optional[str] = None
    
    # Enhanced fields for surgical edits
    clinic_id: str
    conversation_type: str = Field("patient_doctor", pattern=r'^(patient_doctor|doctor_doctor|patient_reception|system)$')
    priority: MessagePriority = MessagePriority.NORMAL
    has_attachments: bool = False
    last_message_type: Optional[MessageTypeEnhanced] = None

class MessageThread(BaseModel):
    """Enhanced message thread with full conversation."""
    conversation_id: str
    patient: Dict[str, str]
    messages: List[Message]
    total_messages: int
    
    # Enhanced fields for surgical edits
    clinic_id: str
    conversation_type: str = "patient_doctor"
    priority: MessagePriority = MessagePriority.NORMAL
    has_attachments: bool = False
    unread_count: int = 0

# ============================= Enhanced Dashboard and Todo Models =============================

class TodoBase(BaseModel):
    """Enhanced base todo item."""
    description: str = Field(..., min_length=1, max_length=500)
    provider: str = Field(..., description="Who assigned or created this task")
    priority: str = Field("medium", pattern=r'^(low|medium|high|urgent)$')
    category: Optional[str] = None
    due_date: Optional[datetime] = None
    
    # Enhanced fields for surgical edits
    clinic_id: str
    patient_id: Optional[str] = None
    appointment_id: Optional[str] = None
    prescription_id: Optional[str] = None
    report_id: Optional[str] = None

class TodoCreate(TodoBase):
    """Enhanced todo creation schema."""
    assigned_to: Optional[str] = None  # User ID
    
    # Enhanced fields for surgical edits
    fhir_task_id: Optional[str] = None
    requires_approval: bool = False
    estimated_duration: Optional[int] = None  # minutes
    dependencies: Optional[List[str]] = Field(default_factory=list)

class Todo(BaseModel):
    """Enhanced complete todo model."""
    id: str
    date: str = Field(..., description="ISO date string (YYYY-MM-DD)")
    completed: bool = False
    completed_at: Optional[datetime] = None
    completed_by: Optional[str] = None
    assigned_to: Optional[str] = None
    
    # Enhanced fields for surgical edits
    fhir_task_id: Optional[str] = None
    requires_approval: bool = False
    approved: bool = False
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    estimated_duration: Optional[int] = None
    actual_duration: Optional[int] = None
    dependencies: Optional[List[str]] = Field(default_factory=list)
    completed_dependencies: Optional[List[str]] = Field(default_factory=list)

class TodoToggle(BaseModel):
    """Enhanced todo completion toggle."""
    completed: Optional[bool] = None
    
    # Enhanced fields for surgical edits
    completion_notes: Optional[str] = None
    actual_duration: Optional[int] = None

# ============================= Enhanced Statistics Models =============================

class DashboardStats(BaseModel):
    """Enhanced dashboard statistics."""
    total_appointments: int = 0
    pending_todos: int = 0
    unread_messages: int = 0
    today_appointments: int = 0
    completed_todos: int = 0
    upcoming_appointments: int = 0
    
    # Enhanced fields for surgical edits
    clinic_id: str
    total_patients: int = 0
    total_prescriptions: int = 0
    total_reports: int = 0
    pending_approvals: int = 0
    fhir_sync_pending: int = 0
    audit_log_entries: int = 0

class DoctorStats(BaseModel):
    """Enhanced basic doctor statistics."""
    patients_seen: int = 0
    appointments_today: int = 0
    prescriptions_written: int = 0
    tasks_pending: int = 0
    
    # Enhanced fields for surgical edits
    clinic_id: str
    fhir_resources_synced: int = 0
    audit_log_entries: int = 0
    patient_satisfaction_rating: Optional[float] = None

class DetailedStats(DoctorStats):
    """Enhanced detailed doctor statistics."""
    total_patients: int = 0
    upcoming_appointments: int = 0
    completed_appointments: int = 0
    pending_appointments: int = 0
    active_prescriptions: int = 0
    completed_tasks: int = 0
    unread_messages: int = 0
    reports_generated: int = 0
    
    # Enhanced fields for surgical edits
    telemedicine_appointments: int = 0
    emergency_appointments: int = 0
    fhir_sync_success_rate: Optional[float] = None
    average_appointment_duration: Optional[float] = None
    prescription_accuracy_rate: Optional[float] = None

class WeeklyStats(BaseModel):
    """Enhanced weekly statistics breakdown."""
    date: str  # ISO date
    appointments: int = 0
    patients: int = 0
    prescriptions: int = 0
    
    # Enhanced fields for surgical edits
    clinic_id: str
    reports: int = 0
    tasks_completed: int = 0
    fhir_syncs: int = 0
    audit_log_entries: int = 0

class MonthlyOverview(BaseModel):
    """Enhanced monthly statistics overview."""
    month: str  # "January 2024"
    total_appointments: int = 0
    unique_patients: int = 0
    prescriptions_written: int = 0
    reports_generated: int = 0
    average_daily_appointments: float = 0.0
    
    # Enhanced fields for surgical edits
    clinic_id: str
    telemedicine_appointments: int = 0
    emergency_appointments: int = 0
    fhir_resources_created: int = 0
    audit_log_entries: int = 0
    patient_satisfaction_rating: Optional[float] = None

class StatsComparison(BaseModel):
    """Enhanced period-over-period statistics comparison."""
    current_period: Dict[str, int]
    previous_period: Dict[str, int]
    percentage_change: Dict[str, float]
    period_type: str = Field(..., pattern=r'^(week|month|year)$')
    
    # Enhanced fields for surgical edits
    clinic_id: str
    fhir_sync_comparison: Optional[Dict[str, float]] = None
    audit_log_comparison: Optional[Dict[str, float]] = None

# ============================= Enhanced Authentication Models =============================

class LoginRequest(BaseModel):
    """Enhanced user login request."""
    username_or_email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    remember_me: bool = False
    two_factor_code: Optional[str] = Field(None, pattern=r'^[0-9]{6}$')
    
    # Enhanced fields for surgical edits
    clinic_id: Optional[str] = None
    device_info: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class LoginResponse(BaseModel):
    """Enhanced login response."""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: DoctorUser
    requires_2fa: bool = False
    
    # Enhanced fields for surgical edits
    clinic_id: str
    permissions: List[str] = Field(default_factory=list)
    fhir_access: bool = False
    audit_access: bool = False
    session_id: str

class TokenRefreshRequest(BaseModel):
    """Enhanced token refresh request."""
    refresh_token: str
    
    # Enhanced fields for surgical edits
    clinic_id: Optional[str] = None
    device_info: Optional[Dict[str, Any]] = None

class PasswordResetRequest(BaseModel):
    """Enhanced password reset request."""
    email: EmailStr
    
    # Enhanced fields for surgical edits
    clinic_id: Optional[str] = None
    reset_method: str = Field("email", pattern=r'^(email|sms|both)$')

class PasswordResetConfirm(BaseModel):
    """Enhanced password reset confirmation."""
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)
    
    # Enhanced fields for surgical edits
    clinic_id: Optional[str] = None
    enforce_strong_password: bool = True
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v

# ============================= Enhanced Session and Activity Models =============================

class UserSession(BaseModel):
    """Enhanced user session information."""
    session_id: str
    user_id: str
    clinic_id: str
    ip_address: str
    user_agent: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    is_active: bool = True
    
    # Enhanced fields for surgical edits
    status: SessionStatus = SessionStatus.ACTIVE
    device_info: Optional[Dict[str, Any]] = None
    location: Optional[Dict[str, Any]] = None
    fhir_access: bool = False
    audit_access: bool = False
    permissions: List[str] = Field(default_factory=list)

class UserActivity(BaseModel):
    """Enhanced user activity log."""
    user_id: str
    clinic_id: str
    activity_type: ActivityType
    description: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    resource_id: Optional[str] = None  # ID of the resource being acted upon
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    # Enhanced fields for surgical edits
    session_id: Optional[str] = None
    fhir_resource_id: Optional[str] = None
    fhir_resource_type: Optional[str] = None
    pii_accessed: bool = False
    severity: str = Field("low", pattern=r'^(low|medium|high|critical)$')
    risk_level: str = Field("low", pattern=r'^(low|medium|high|critical)$')

# ============================= Enhanced Notification Models =============================

class NotificationBase(BaseModel):
    """Enhanced base notification model."""
    recipient_id: str
    clinic_id: str
    title: str = Field(..., max_length=200)
    message: str = Field(..., max_length=1000)
    notification_type: str = Field("info", pattern=r'^(info|success|warning|error|urgent)$')
    channel: NotificationChannel = NotificationChannel.IN_APP
    
    # Enhanced fields for surgical edits
    priority: MessagePriority = MessagePriority.NORMAL
    category: str = Field("general", pattern=r'^(general|appointment|prescription|report|lab|imaging|system|security|audit)$')
    requires_acknowledgment: bool = False
    expires_at: Optional[datetime] = None

class NotificationCreate(NotificationBase):
    """Enhanced notification creation schema."""
    sender_id: Optional[str] = None
    action_url: Optional[str] = None
    scheduled_for: Optional[datetime] = None
    
    # Enhanced fields for surgical edits
    fhir_resource_id: Optional[str] = None
    fhir_resource_type: Optional[str] = None
    template_id: Optional[str] = None
    template_data: Optional[Dict[str, Any]] = None
    is_encrypted: bool = False

class Notification(BaseModel):
    """Enhanced complete notification model."""
    id: str
    sender_id: Optional[str] = None
    read: bool = False
    read_at: Optional[datetime] = None
    sent: bool = False
    sent_at: Optional[datetime] = None
    action_url: Optional[str] = None
    scheduled_for: Optional[datetime] = None
    delivery_status: Optional[str] = None
    
    # Enhanced fields for surgical edits
    acknowledged: bool = False
    acknowledged_at: Optional[datetime] = None
    fhir_resource_id: Optional[str] = None
    fhir_resource_type: Optional[str] = None
    template_id: Optional[str] = None
    template_data: Optional[Dict[str, Any]] = None
    is_encrypted: bool = False
    expires_at: Optional[datetime] = None

# ============================= Enhanced System Configuration Models =============================

class SystemSettings(BaseModel):
    """Enhanced system-wide settings."""
    site_name: str = "EHR System"
    site_description: Optional[str] = None
    default_timezone: str = "Asia/Tashkent"
    default_language: str = "en"
    max_file_upload_size: int = 10485760  # 10MB in bytes
    session_timeout_minutes: int = 30
    password_min_length: int = 8
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 15
    
    # Enhanced fields for surgical edits
    fhir_server_url: Optional[str] = None
    fhir_server_timeout: int = 30
    audit_log_retention_days: int = 365
    pii_encryption_enabled: bool = True
    rate_limiting_enabled: bool = True
    clinic_scoping_enabled: bool = True
    rbac_enabled: bool = True

class FeatureFlags(BaseModel):
    """Enhanced feature flags for system capabilities."""
    messaging_enabled: bool = True
    file_upload_enabled: bool = True
    two_factor_auth_enabled: bool = True
    api_rate_limiting_enabled: bool = True
    audit_logging_enabled: bool = True
    fhir_integration_enabled: bool = True
    
    # Enhanced fields for surgical edits
    clinic_scoping_enabled: bool = True
    rbac_enabled: bool = True
    pii_encryption_enabled: bool = True
    telemedicine_enabled: bool = False
    ai_assistance_enabled: bool = False
    bulk_operations_enabled: bool = True
    export_import_enabled: bool = True
    real_time_notifications_enabled: bool = True

# ============================= Enhanced Response Models =============================

class UserProfileResponse(BaseModel):
    """Enhanced user profile response."""
    user: User
    profile: Optional[DoctorProfile] = None
    settings: Optional[AllSettings] = None
    stats: Optional[DoctorStats] = None
    
    # Enhanced fields for surgical edits
    clinic_id: str
    permissions: List[str] = Field(default_factory=list)
    fhir_access: bool = False
    audit_access: bool = False
    session_info: Optional[Dict[str, Any]] = None

class DashboardOverview(BaseModel):
    """Enhanced complete dashboard overview."""
    stats: DashboardStats
    today_appointments: List[Dict[str, Any]] = Field(default_factory=list)
    pending_todos: List[Todo] = Field(default_factory=list)
    recent_messages: List[DashboardMessage] = Field(default_factory=list)
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    
    # Enhanced fields for surgical edits
    clinic_id: str
    fhir_sync_status: Optional[Dict[str, Any]] = None
    audit_log_summary: Optional[Dict[str, Any]] = None
    system_alerts: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

class MessageStatsResponse(BaseModel):
    """Enhanced message statistics response."""
    total_conversations: int = 0
    unread_messages: int = 0
    messages_sent: int = 0
    messages_received: int = 0
    total_messages: int = 0
    
    # Enhanced fields for surgical edits
    clinic_id: str
    messages_by_type: Dict[str, int] = Field(default_factory=dict)
    messages_by_priority: Dict[str, int] = Field(default_factory=dict)
    average_response_time: Optional[float] = None
    fhir_communications: int = 0
