from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, date, time
from enum import Enum

# ================================
# Authentication Schemas
# ================================

class UserRoleEnum(str, Enum):
    DOCTOR = "doctor"
    NURSE = "nurse"
    RECEPTIONIST = "receptionist"
    LAB_TECHNICIAN = "lab_technician"
    PHARMACIST = "pharmacist"
    ADMIN = "admin"
    PATIENT = "patient"

class UserStatusEnum(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"

class LoginRequest(BaseModel):
    """User login request"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=6, max_length=100, description="User password")
    remember_me: bool = Field(default=False, description="Remember login session")
    device_info: Optional[Dict[str, str]] = Field(None, description="Device information for security")

class LoginResponse(BaseModel):
    """User login response"""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")
    
    # User information
    user: "DoctorProfile"  # Forward reference
    permissions: List[str] = Field(default_factory=list)
    
    # Session info
    session_id: str
    login_time: datetime = Field(default_factory=datetime.now)
    last_login: Optional[datetime] = None

class TokenRefreshRequest(BaseModel):
    """Token refresh request"""
    refresh_token: str = Field(..., description="Valid refresh token")

class TokenRefreshResponse(BaseModel):
    """Token refresh response"""
    access_token: str
    token_type: str = Field(default="bearer")
    expires_in: int

class LogoutRequest(BaseModel):
    """User logout request"""
    session_id: Optional[str] = None
    logout_all_devices: bool = Field(default=False)

class PasswordChangeRequest(BaseModel):
    """Password change request"""
    current_password: str = Field(..., min_length=6, max_length=100)
    new_password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str = Field(..., min_length=8, max_length=100)
    
    @validator('confirm_password')
    def validate_password_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('new_password')
    def validate_password_strength(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        # Check for uppercase, lowercase, digit, and special character
        has_upper = any(c.isupper() for c in v)
        has_lower = any(c.islower() for c in v)
        has_digit = any(c.isdigit() for c in v)
        has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in v)
        
        if not all([has_upper, has_lower, has_digit, has_special]):
            raise ValueError('Password must contain uppercase, lowercase, digit, and special character')
        
        return v

class PasswordResetRequest(BaseModel):
    """Password reset request"""
    email: EmailStr = Field(..., description="User email address")

class PasswordResetConfirm(BaseModel):
    """Password reset confirmation"""
    token: str = Field(..., min_length=32, max_length=255)
    new_password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str = Field(..., min_length=8, max_length=100)
    
    @validator('confirm_password')
    def validate_password_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v

# ================================
# Two-Factor Authentication Schemas
# ================================

class TwoFactorSetupRequest(BaseModel):
    """Two-factor authentication setup"""
    method: str = Field(..., regex=r'^(sms|email|authenticator)$')
    phone_number: Optional[str] = Field(None, regex=r'^\+?[\d\s\-\(\)]{10,20}$')

class TwoFactorSetupResponse(BaseModel):
    """Two-factor authentication setup response"""
    secret_key: Optional[str] = None  # For authenticator apps
    qr_code: Optional[str] = None     # Base64 encoded QR code
    backup_codes: List[str] = Field(default_factory=list)
    setup_complete: bool = Field(default=False)

class TwoFactorVerifyRequest(BaseModel):
    """Two-factor authentication verification"""
    code: str = Field(..., min_length=4, max_length=8)
    remember_device: bool = Field(default=False)

class TwoFactorDisableRequest(BaseModel):
    """Disable two-factor authentication"""
    password: str = Field(..., min_length=6, max_length=100)
    verification_code: str = Field(..., min_length=4, max_length=8)

# ================================
# Doctor Profile Schemas
# ================================

class SpecializationEnum(str, Enum):
    INTERNAL_MEDICINE = "internal_medicine"
    CARDIOLOGY = "cardiology"
    NEUROLOGY = "neurology"
    PEDIATRICS = "pediatrics"
    SURGERY = "surgery"
    ORTHOPEDICS = "orthopedics"
    DERMATOLOGY = "dermatology"
    PSYCHIATRY = "psychiatry"
    RADIOLOGY = "radiology"
    PATHOLOGY = "pathology"
    ANESTHESIOLOGY = "anesthesiology"
    EMERGENCY_MEDICINE = "emergency_medicine"
    FAMILY_MEDICINE = "family_medicine"
    GYNECOLOGY = "gynecology"
    ONCOLOGY = "oncology"
    OPHTHALMOLOGY = "ophthalmology"
    OTOLARYNGOLOGY = "otolaryngology"
    UROLOGY = "urology"
    ENDOCRINOLOGY = "endocrinology"
    GASTROENTEROLOGY = "gastroenterology"
    PULMONOLOGY = "pulmonology"
    NEPHROLOGY = "nephrology"
    RHEUMATOLOGY = "rheumatology"
    INFECTIOUS_DISEASE = "infectious_disease"
    GERIATRICS = "geriatrics"
    OTHER = "other"

class LanguageEnum(str, Enum):
    UZBEK = "uz"
    RUSSIAN = "ru"
    ENGLISH = "en"
    ARABIC = "ar"
    TURKISH = "tr"
    PERSIAN = "fa"

class Education(BaseModel):
    """Education/qualification information"""
    degree: str = Field(..., min_length=2, max_length=100, description="e.g., MD, DO, MBBS")
    institution: str = Field(..., min_length=2, max_length=200)
    graduation_year: int = Field(..., ge=1950, le=2030)
    country: str = Field(..., min_length=2, max_length=100)
    gpa: Optional[float] = Field(None, ge=0.0, le=4.0)

class License(BaseModel):
    """Medical license information"""
    license_number: str = Field(..., min_length=5, max_length=50)
    issuing_authority: str = Field(..., min_length=2, max_length=200)
    issue_date: date
    expiry_date: Optional[date] = None
    license_type: str = Field(..., min_length=2, max_length=50)
    is_active: bool = Field(default=True)

class Certification(BaseModel):
    """Professional certification"""
    certification_name: str = Field(..., min_length=2, max_length=200)
    certifying_body: str = Field(..., min_length=2, max_length=200)
    certification_date: date
    expiry_date: Optional[date] = None
    certification_number: Optional[str] = Field(None, max_length=100)
    is_active: bool = Field(default=True)

class WorkExperience(BaseModel):
    """Work experience entry"""
    position: str = Field(..., min_length=2, max_length=100)
    organization: str = Field(..., min_length=2, max_length=200)
    start_date: date
    end_date: Optional[date] = None
    is_current: bool = Field(default=False)
    responsibilities: Optional[str] = Field(None, max_length=1000)
    location: Optional[str] = Field(None, max_length=200)

class DoctorProfileBase(BaseModel):
    """Base doctor profile information"""
    # Personal Information
    first_name: str = Field(..., min_length=2, max_length=50)
    last_name: str = Field(..., min_length=2, max_length=50)
    middle_name: Optional[str] = Field(None, max_length=50)
    title: str = Field(default="Dr.", max_length=20)
    
    # Contact Information
    email: EmailStr
    phone: str = Field(..., regex=r'^\+?[\d\s\-\(\)]{10,20}$')
    secondary_phone: Optional[str] = Field(None, regex=r'^\+?[\d\s\-\(\)]{10,20}$')
    
    # Address
    address_line_1: Optional[str] = Field(None, max_length=200)
    address_line_2: Optional[str] = Field(None, max_length=200)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: str = Field(default="Uzbekistan", max_length=100)
    
    # Professional Information
    medical_license_number: str = Field(..., min_length=5, max_length=50)
    specializations: List[SpecializationEnum] = Field(..., min_items=1, max_items=5)
    sub_specializations: List[str] = Field(default_factory=list, max_items=3)
    
    # Languages
    languages_spoken: List[LanguageEnum] = Field(default_factory=list)
    
    # Professional Details
    years_of_experience: Optional[int] = Field(None, ge=0, le=70)
    biography: Optional[str] = Field(None, max_length=2000)
    
    # Education and Certifications
    education: List[Education] = Field(default_factory=list)
    licenses: List[License] = Field(default_factory=list)
    certifications: List[Certification] = Field(default_factory=list)
    work_experience: List[WorkExperience] = Field(default_factory=list)
    
    # Availability
    consultation_fee: Optional[int] = Field(None, ge=0, description="Consultation fee in local currency")
    accepts_insurance: bool = Field(default=True)
    available_for_telemedicine: bool = Field(default=False)
    
    # Preferences
    preferred_appointment_duration: int = Field(default=30, ge=15, le=120, description="Minutes")
    timezone: str = Field(default="Asia/Tashkent", max_length=50)

class DoctorProfileCreate(DoctorProfileBase):
    """Schema for creating doctor profile"""
    password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str = Field(..., min_length=8, max_length=100)
    
    @validator('confirm_password')
    def validate_password_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

class DoctorProfileUpdate(BaseModel):
    """Schema for updating doctor profile"""
    first_name: Optional[str] = Field(None, min_length=2, max_length=50)
    last_name: Optional[str] = Field(None, min_length=2, max_length=50)
    middle_name: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = Field(None, regex=r'^\+?[\d\s\-\(\)]{10,20}$')
    secondary_phone: Optional[str] = Field(None, regex=r'^\+?[\d\s\-\(\)]{10,20}$')
    
    address_line_1: Optional[str] = Field(None, max_length=200)
    address_line_2: Optional[str] = Field(None, max_length=200)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    
    specializations: Optional[List[SpecializationEnum]] = Field(None, min_items=1, max_items=5)
    sub_specializations: Optional[List[str]] = Field(None, max_items=3)
    languages_spoken: Optional[List[LanguageEnum]] = None
    
    years_of_experience: Optional[int] = Field(None, ge=0, le=70)
    biography: Optional[str] = Field(None, max_length=2000)
    
    education: Optional[List[Education]] = None
    licenses: Optional[List[License]] = None
    certifications: Optional[List[Certification]] = None
    work_experience: Optional[List[WorkExperience]] = None
    
    consultation_fee: Optional[int] = Field(None, ge=0)
    accepts_insurance: Optional[bool] = None
    available_for_telemedicine: Optional[bool] = None
    preferred_appointment_duration: Optional[int] = Field(None, ge=15, le=120)
    timezone: Optional[str] = Field(None, max_length=50)

class DoctorProfile(DoctorProfileBase):
    """Complete doctor profile response"""
    id: str
    employee_id: Optional[str] = None
    user_id: str
    clinic_id: str
    department_id: Optional[str] = None
    
    # System fields
    role: UserRoleEnum = Field(default=UserRoleEnum.DOCTOR)
    status: UserStatusEnum
    
    # Profile completion
    profile_completion_percentage: int = Field(default=0, ge=0, le=100)
    profile_verified: bool = Field(default=False)
    
    # System timestamps
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    
    # Statistics
    total_patients: int = Field(default=0)
    total_appointments: int = Field(default=0)
    average_rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    total_reviews: int = Field(default=0)
    
    # Settings
    email_notifications: bool = Field(default=True)
    sms_notifications: bool = Field(default=False)
    two_factor_enabled: bool = Field(default=False)
    
    # Profile picture
    profile_picture_url: Optional[str] = None
    
    class Config:
        from_attributes = True

# ================================
# Session & Security Schemas
# ================================

class ActiveSession(BaseModel):
    """Active user session"""
    session_id: str
    user_id: str
    device_info: Dict[str, str]
    ip_address: str
    user_agent: str
    
    # Timestamps
    created_at: datetime
    last_activity: datetime
    expires_at: datetime
    
    # Location (if available)
    location: Optional[Dict[str, str]] = None
    
    # Security flags
    is_current_session: bool = Field(default=False)
    is_trusted_device: bool = Field(default=False)

class SecurityLog(BaseModel):
    """Security event log"""
    id: str
    user_id: str
    event_type: str = Field(..., regex=r'^(login|logout|password_change|failed_login|suspicious_activity)$')
    description: str = Field(..., min_length=10, max_length=500)
    
    # Context
    ip_address: str
    user_agent: str
    device_info: Optional[Dict[str, str]] = None
    location: Optional[Dict[str, str]] = None
    
    # Severity
    severity: str = Field(..., regex=r'^(info|warning|error|critical)$')
    
    # Timestamp
    created_at: datetime = Field(default_factory=datetime.now)
    
    # Additional data
    additional_data: Optional[Dict[str, Any]] = None

class AccountSecuritySettings(BaseModel):
    """User account security settings"""
    user_id: str
    
    # Password settings
    password_last_changed: datetime
    force_password_change: bool = Field(default=False)
    password_expiry_days: Optional[int] = Field(None, ge=30, le=365)
    
    # Two-factor authentication
    two_factor_enabled: bool = Field(default=False)
    two_factor_method: Optional[str] = Field(None, regex=r'^(sms|email|authenticator)$')
    backup_codes_generated: bool = Field(default=False)
    
    # Session settings
    session_timeout_minutes: int = Field(default=60, ge=15, le=480)
    max_concurrent_sessions: int = Field(default=3, ge=1, le=10)