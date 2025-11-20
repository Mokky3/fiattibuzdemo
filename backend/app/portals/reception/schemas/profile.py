# app/portals/reception/schemas/profile.py
"""User profile and system settings schemas."""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, validator

from app.common.schemas.base_enhanced import TimeRange


# ============================= Profile Models =============================
class PersonalInfo(BaseModel):
    """Personal information schema."""
    first_name: str = Field(..., alias="firstName")
    last_name: str = Field(..., alias="lastName")
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = Field(None, alias="zipCode")
    birth_date: Optional[str] = Field(None, alias="birthDate")
    employee_id: str = Field(..., alias="employeeId")
    department: Optional[str] = None
    start_date: Optional[str] = Field(None, alias="startDate")
    emergency_contact: Optional[str] = Field(None, alias="emergencyContact")
    emergency_phone: Optional[str] = Field(None, alias="emergencyPhone")
    
    class Config:
        populate_by_name = True


class NotificationPrefs(BaseModel):
    """Notification preferences schema."""
    appointment_reminders: bool = Field(True, alias="appointmentReminders")
    new_patient_alerts: bool = Field(True, alias="newPatientAlerts")
    system_updates: bool = Field(False, alias="systemUpdates")
    emergency_alerts: bool = Field(True, alias="emergencyAlerts")
    email_notifications: bool = Field(True, alias="emailNotifications")
    sms_notifications: bool = Field(False, alias="smsNotifications")
    desktop_notifications: bool = Field(True, alias="desktopNotifications")
    sound_alerts: bool = Field(True, alias="soundAlerts")
    
    class Config:
        populate_by_name = True


class SystemPrefs(BaseModel):
    """System preferences schema."""
    language: str = "en"
    timezone: str = "UTC"
    date_format: str = Field("YYYY-MM-DD", alias="dateFormat")
    time_format: str = Field("24", alias="timeFormat")
    theme: str = "light"
    font_size: str = Field("medium", alias="fontSize")
    auto_logout: str = Field("30", alias="autoLogout")  # minutes or "never"
    default_view: str = Field("dashboard", alias="defaultView")
    
    class Config:
        populate_by_name = True


class ProfileDTO(BaseModel):
    """Complete profile data transfer object."""
    personal_info: PersonalInfo = Field(..., alias="personalInfo")
    notifications: NotificationPrefs
    system_prefs: SystemPrefs = Field(..., alias="systemPrefs")
    profile_image: Optional[str] = Field(None, alias="profileImage")  # base64
    last_updated: str = Field(..., alias="lastUpdated")
    
    class Config:
        populate_by_name = True


class PasswordChange(BaseModel):
    """Password change request schema."""
    current_password: str = Field(..., alias="currentPassword")
    new_password: str = Field(..., alias="newPassword")
    confirm_password: str = Field(..., alias="confirmPassword")
    
    class Config:
        populate_by_name = True
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


# ============================= Settings Models =============================
class WorkingHours(BaseModel):
    """Working hours configuration."""
    start: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    end: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    days: List[str]
    
    @validator('days')
    def validate_days(cls, v):
        valid_days = {"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"}
        for day in v:
            if day.lower() not in valid_days:
                raise ValueError(f"Invalid day: {day}")
        return v


class GeneralSettings(BaseModel):
    """General clinic settings."""
    clinic_name: str = Field(..., alias="clinicName")
    address: str
    phone: str
    email: EmailStr
    website: Optional[str] = None
    timezone: str
    language: str
    currency: str
    date_format: str = Field(..., alias="dateFormat")
    time_format: str = Field(..., alias="timeFormat", pattern="^(12|24)$")
    working_hours: WorkingHours = Field(..., alias="workingHours")
    
    class Config:
        populate_by_name = True


class SystemSettings(BaseModel):
    """System configuration settings."""
    auto_backup: bool = Field(..., alias="autoBackup")
    backup_frequency: str = Field(..., alias="backupFrequency", pattern="^(hourly|daily|weekly|monthly)$")
    data_retention: str = Field(..., alias="dataRetention")
    maintenance_mode: bool = Field(..., alias="maintenanceMode")
    debug_mode: bool = Field(..., alias="debugMode")
    allow_remote_access: bool = Field(..., alias="allowRemoteAccess")
    session_timeout: int = Field(..., alias="sessionTimeout")
    max_login_attempts: int = Field(..., alias="maxLoginAttempts")
    enable_audit_log: bool = Field(..., alias="enableAuditLog")
    auto_updates: bool = Field(..., alias="autoUpdates")
    
    class Config:
        populate_by_name = True


class NotificationSettings(BaseModel):
    """System notification settings."""
    email_notifications: bool = Field(..., alias="emailNotifications")
    sms_notifications: bool = Field(..., alias="smsNotifications")
    appointment_reminders: bool = Field(..., alias="appointmentReminders")
    system_alerts: bool = Field(..., alias="systemAlerts")
    emergency_notifications: bool = Field(..., alias="emergencyNotifications")
    marketing_emails: bool = Field(..., alias="marketingEmails")
    reminder_time: int = Field(..., alias="reminderTime")  # hours before appointment
    escalation_time: int = Field(..., alias="escalationTime")  # minutes
    
    class Config:
        populate_by_name = True


class IntegrationSettings(BaseModel):
    """Third-party integration settings."""
    email_server: str = Field(..., alias="emailServer")
    email_port: str = Field(..., alias="emailPort")
    email_security: str = Field(..., alias="emailSecurity", pattern="^(none|tls|ssl)$")
    sms_provider: str = Field(..., alias="smsProvider")
    payment_gateway: str = Field(..., alias="paymentGateway")
    insurance_api: str = Field(..., alias="insuranceApi", pattern="^(enabled|disabled)$")
    lab_integration: str = Field(..., alias="labIntegration", pattern="^(enabled|disabled)$")
    pharmacy_integration: str = Field(..., alias="pharmacyIntegration", pattern="^(enabled|disabled)$")
    
    class Config:
        populate_by_name = True


class SettingsBundle(BaseModel):
    """Complete settings bundle."""
    general: GeneralSettings
    system: SystemSettings
    notifications: NotificationSettings
    integrations: IntegrationSettings
    
    class Config:
        from_attributes = True


# ============================= Activity Log =============================
class ProfileActivity(BaseModel):
    """Profile activity log item."""
    action: str
    time: str
    details: str
    performed_by: Optional[str] = None
    
    class Config:
        from_attributes = True