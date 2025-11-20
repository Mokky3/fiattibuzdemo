"""Enhanced Admin portal global settings schemas for surgical edits integration."""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# ================================
# Enhanced Global Settings Schemas
# ================================

class SettingTypeEnum(str, Enum):
    STRING = "string"
    INTEGER = "integer"
    BOOLEAN = "boolean"
    FLOAT = "float"
    JSON = "json"
    EMAIL = "email"
    URL = "url"
    PHONE = "phone"

class SettingScopeEnum(str, Enum):
    GLOBAL = "global"
    CLINIC = "clinic"
    USER = "user"

class SettingCategoryEnum(str, Enum):
    NOTIFICATIONS = "notifications"
    EMAIL = "email"
    SMS = "sms"
    PAYMENT = "payment"
    SECURITY = "security"
    INTEGRATION = "integration"
    AI_TABIB = "ai_tabib"
    SYSTEM = "system"
    UI = "ui"
    BACKUP = "backup"

class GlobalSetting(BaseModel):
    """Enhanced global setting."""
    id: str = Field(..., description="Setting ID")
    key: str = Field(..., min_length=1, max_length=100, description="Setting key")
    value: Any = Field(..., description="Setting value")
    type: SettingTypeEnum = Field(..., description="Setting type")
    category: SettingCategoryEnum = Field(..., description="Setting category")
    scope: SettingScopeEnum = Field(..., description="Setting scope")
    description: str = Field(..., min_length=1, max_length=500, description="Setting description")
    default_value: Any = Field(..., description="Default value")
    is_required: bool = Field(False, description="Is setting required")
    is_encrypted: bool = Field(False, description="Is setting value encrypted")
    validation_rules: Dict[str, Any] = Field(default_factory=dict, description="Validation rules")
    clinic_id: Optional[str] = Field(None, description="Clinic ID for clinic-scoped settings")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    created_by: str = Field(..., description="User who created the setting")

class SettingCreateRequest(BaseModel):
    """Enhanced setting creation request."""
    key: str = Field(..., min_length=1, max_length=100, description="Setting key")
    value: Any = Field(..., description="Setting value")
    type: SettingTypeEnum = Field(..., description="Setting type")
    category: SettingCategoryEnum = Field(..., description="Setting category")
    scope: SettingScopeEnum = Field(..., description="Setting scope")
    description: str = Field(..., min_length=1, max_length=500, description="Setting description")
    default_value: Any = Field(..., description="Default value")
    is_required: bool = Field(False, description="Is setting required")
    is_encrypted: bool = Field(False, description="Is setting value encrypted")
    validation_rules: Dict[str, Any] = Field(default_factory=dict, description="Validation rules")
    clinic_id: Optional[str] = Field(None, description="Clinic ID for clinic-scoped settings")

class SettingPatchRequest(BaseModel):
    """Single setting patch request (per-key update)."""
    value: Optional[Any] = Field(None, description="Updated setting value")
    description: Optional[str] = Field(None, min_length=1, max_length=500, description="Updated setting description")
    is_required: Optional[bool] = Field(None, description="Updated required status")
    is_encrypted: Optional[bool] = Field(None, description="Updated encrypted status")
    validation_rules: Optional[Dict[str, Any]] = Field(None, description="Updated validation rules")
    clinic_id: Optional[str] = Field(None, description="Clinic ID for clinic-scoped settings")

class NotificationSettings(BaseModel):
    """Enhanced notification settings."""
    email_enabled: bool = Field(True, description="Enable email notifications")
    sms_enabled: bool = Field(False, description="Enable SMS notifications")
    push_enabled: bool = Field(True, description="Enable push notifications")
    email_smtp_host: str = Field("smtp.local", description="SMTP host")
    email_smtp_port: int = Field(587, ge=1, le=65535, description="SMTP port")
    email_smtp_username: str = Field("user", description="SMTP username")
    email_smtp_password: str = Field("password", description="SMTP password")
    email_smtp_use_tls: bool = Field(True, description="Use TLS for SMTP")
    sms_provider: str = Field("twilio", description="SMS provider")
    sms_api_key: str = Field("dev", description="SMS API key")
    sms_api_secret: str = Field("dev", description="SMS API secret")
    push_firebase_key: str = Field("dev", description="Firebase push key")
    notification_templates: Dict[str, str] = Field(default_factory=dict, description="Notification templates")

class EmailSettings(BaseModel):
    """Enhanced email settings."""
    from_email: str = Field(..., description="From email address")
    from_name: str = Field(..., description="From name")
    reply_to_email: str = Field(..., description="Reply-to email address")
    support_email: str = Field(..., description="Support email address")
    admin_email: str = Field(..., description="Admin email address")
    email_signature: str = Field(..., description="Email signature")
    email_footer: str = Field(..., description="Email footer")
    max_recipients_per_email: int = Field(100, ge=1, le=1000, description="Max recipients per email")
    email_rate_limit: int = Field(100, ge=1, le=10000, description="Email rate limit per hour")

class SMSSettings(BaseModel):
    """Enhanced SMS settings."""
    from_number: str = Field(..., description="From phone number")
    sms_provider: str = Field("twilio", description="SMS provider")
    api_key: str = Field(..., description="SMS API key")
    api_secret: str = Field(..., description="SMS API secret")
    webhook_url: Optional[str] = Field(None, description="SMS webhook URL")
    max_sms_per_hour: int = Field(100, ge=1, le=1000, description="Max SMS per hour")
    sms_cost_per_message: float = Field(0.01, ge=0.0, description="SMS cost per message")

class PaymentSettings(BaseModel):
    """Enhanced payment settings."""
    payment_provider: str = Field("stripe", description="Payment provider")
    api_key: str = Field("dev", description="Payment API key")
    api_secret: str = Field("dev", description="Payment API secret")
    webhook_secret: str = Field("dev", description="Payment webhook secret")
    currency: str = Field("USD", description="Default currency")
    tax_rate: float = Field(0.0, ge=0.0, le=1.0, description="Tax rate")
    processing_fee_rate: float = Field(0.029, ge=0.0, le=1.0, description="Processing fee rate")
    minimum_payment: float = Field(1.0, ge=0.0, description="Minimum payment amount")
    maximum_payment: float = Field(10000.0, ge=0.0, description="Maximum payment amount")

class SecuritySettings(BaseModel):
    """Enhanced security settings."""
    password_min_length: int = Field(8, ge=6, le=50, description="Minimum password length")
    password_require_uppercase: bool = Field(True, description="Require uppercase letters")
    password_require_lowercase: bool = Field(True, description="Require lowercase letters")
    password_require_numbers: bool = Field(True, description="Require numbers")
    password_require_symbols: bool = Field(True, description="Require symbols")
    session_timeout_minutes: int = Field(30, ge=5, le=1440, description="Session timeout in minutes")
    max_login_attempts: int = Field(5, ge=3, le=20, description="Max login attempts")
    lockout_duration_minutes: int = Field(15, ge=5, le=1440, description="Lockout duration in minutes")
    require_two_factor: bool = Field(False, description="Require two-factor authentication")
    encryption_key: str = Field("dev", description="Encryption key")
    jwt_secret: str = Field("dev", description="JWT secret key")
    jwt_expiry_hours: int = Field(24, ge=1, le=168, description="JWT expiry in hours")

class AITabibSettings(BaseModel):
    """Enhanced AI Tabib settings."""
    ai_enabled: bool = Field(False, description="Enable AI Tabib")
    ai_provider: str = Field("openai", description="AI provider")
    ai_api_key: str = Field(..., description="AI API key")
    ai_model: str = Field("gpt-4", description="AI model")
    ai_temperature: float = Field(0.7, ge=0.0, le=2.0, description="AI temperature")
    ai_max_tokens: int = Field(1000, ge=100, le=4000, description="AI max tokens")
    ai_system_prompt: str = Field(..., description="AI system prompt")
    ai_enabled_features: List[str] = Field(default_factory=list, description="Enabled AI features")
    ai_rate_limit_per_hour: int = Field(100, ge=1, le=10000, description="AI rate limit per hour")

class IntegrationSettings(BaseModel):
    """Enhanced integration settings."""
    fhir_server_url: str = Field(..., description="FHIR server URL")
    fhir_server_username: str = Field(..., description="FHIR server username")
    fhir_server_password: str = Field(..., description="FHIR server password")
    fhir_server_certificate: Optional[str] = Field(None, description="FHIR server certificate")
    redis_url: str = Field(..., description="Redis URL")
    redis_password: Optional[str] = Field(None, description="Redis password")
    database_backup_enabled: bool = Field(True, description="Enable database backup")
    backup_frequency_hours: int = Field(24, ge=1, le=168, description="Backup frequency in hours")
    backup_retention_days: int = Field(30, ge=1, le=365, description="Backup retention in days")

class SystemSettings(BaseModel):
    """Enhanced system settings."""
    system_name: str = Field("EHR Backend", description="System name")
    system_version: str = Field("1.0.0", description="System version")
    system_timezone: str = Field("UTC", description="System timezone")
    system_language: str = Field("en", description="System language")
    maintenance_mode: bool = Field(False, description="Maintenance mode")
    maintenance_message: str = Field("", description="Maintenance message")
    max_file_upload_size: int = Field(10485760, ge=1048576, le=104857600, description="Max file upload size in bytes")
    allowed_file_types: List[str] = Field(default_factory=list, description="Allowed file types")
    log_level: str = Field("INFO", description="Log level")
    log_retention_days: int = Field(30, ge=1, le=365, description="Log retention in days")

class FeatureFlags(BaseModel):
    """Simple feature flags toggle model."""
    enable_payments: bool = False
    enable_messaging: bool = True
    enable_radiology: bool = False
    enable_lab: bool = False
    enable_audit_stream: bool = True

class GlobalSettings(BaseModel):
    """Aggregate global settings bundle."""
    notifications: NotificationSettings
    payments: PaymentSettings
    features: FeatureFlags
    security: SecuritySettings
    system: SystemSettings
    created_at: str
    updated_at: str
    updated_by: str

class SettingsSearchRequest(BaseModel):
    """Enhanced settings search request."""
    category: Optional[SettingCategoryEnum] = Field(None, description="Filter by category")
    scope: Optional[SettingScopeEnum] = Field(None, description="Filter by scope")
    type: Optional[SettingTypeEnum] = Field(None, description="Filter by type")
    clinic_id: Optional[str] = Field(None, description="Filter by clinic ID")
    
    # Search
    search_query: Optional[str] = Field(None, min_length=2, description="Search in setting key or description")
    
    # Pagination
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Page size")
    
    # Sorting
    sort_by: str = Field("created_at", pattern=r'^(created_at|updated_at|key|category|scope)$')
    sort_order: str = Field("desc", pattern=r'^(asc|desc)$')

class SettingsListResponse(BaseModel):
    """Enhanced settings list response."""
    settings: List[GlobalSetting] = Field(..., description="List of settings")
    total: int = Field(..., description="Total number of settings")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    total_pages: int = Field(..., description="Total number of pages")

class SettingsValidationResult(BaseModel):
    """Validation result for settings update."""
    valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)

class SettingsStats(BaseModel):
    """Enhanced settings statistics."""
    total_settings: int = Field(..., description="Total settings")
    settings_by_category: Dict[str, int] = Field(..., description="Settings count by category")
    settings_by_scope: Dict[str, int] = Field(..., description="Settings count by scope")
    settings_by_type: Dict[str, int] = Field(..., description="Settings count by type")
    encrypted_settings: int = Field(..., description="Encrypted settings count")
    required_settings: int = Field(..., description="Required settings count")
    settings_updated_this_month: int = Field(..., description="Settings updated this month")

class SettingBulkUpdateRequest(BaseModel):
    """Enhanced bulk settings update request."""
    settings: List[Dict[str, Any]] = Field(..., description="List of settings to update")
    clinic_id: Optional[str] = Field(None, description="Clinic ID for clinic-scoped settings")

class SettingBulkUpdateResponse(BaseModel):
    """Enhanced bulk settings update response."""
    updated_count: int = Field(..., description="Number of settings updated")
    failed_updates: List[Dict[str, Any]] = Field(default_factory=list, description="Failed updates")
    updated_at: str = Field(..., description="Update timestamp")

class SettingsAuditLog(BaseModel):
    """Audit log entry for settings changes."""
    id: str
    actor_id: str
    action: str
    section: str
    changes: Dict[str, Any]
    timestamp: str
    ip_address: Optional[str] = None

class SettingsUpdateRequest(BaseModel):
    """Aggregate settings update payload used by routes."""
    notifications: Optional[NotificationSettings] = None
    payments: Optional[PaymentSettings] = None
    features: Optional[FeatureFlags] = None
    security: Optional[SecuritySettings] = None
    system: Optional[SystemSettings] = None

# ================================
# Enhanced Validators
# ================================

@validator('key')
def validate_setting_key(cls, v):
    """Validate setting key."""
    if v:
        # Remove excessive whitespace
        v = v.strip()
        if len(v) == 0:
            raise ValueError('Setting key cannot be empty')
        if len(v) > 100:
            raise ValueError('Setting key cannot exceed 100 characters')
        # Check for valid characters (alphanumeric, underscore, dash)
        import re
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Setting key can only contain alphanumeric characters, underscores, and dashes')
    return v

@validator('description')
def validate_setting_description(cls, v):
    """Validate setting description."""
    if v:
        # Remove excessive whitespace
        v = v.strip()
        if len(v) == 0:
            raise ValueError('Setting description cannot be empty')
        if len(v) > 500:
            raise ValueError('Setting description cannot exceed 500 characters')
    return v

@validator('email_smtp_port')
def validate_smtp_port(cls, v):
    """Validate SMTP port."""
    if v:
        if v < 1 or v > 65535:
            raise ValueError('SMTP port must be between 1 and 65535')
    return v

@validator('tax_rate', 'processing_fee_rate')
def validate_rate(cls, v):
    """Validate rate values."""
    if v is not None:
        if v < 0.0 or v > 1.0:
            raise ValueError('Rate must be between 0.0 and 1.0')
    return v

@validator('password_min_length')
def validate_password_min_length(cls, v):
    """Validate password minimum length."""
    if v:
        if v < 6 or v > 50:
            raise ValueError('Password minimum length must be between 6 and 50')
    return v

@validator('session_timeout_minutes')
def validate_session_timeout(cls, v):
    """Validate session timeout."""
    if v:
        if v < 5 or v > 1440:
            raise ValueError('Session timeout must be between 5 and 1440 minutes')
    return v

@validator('ai_temperature')
def validate_ai_temperature(cls, v):
    """Validate AI temperature."""
    if v is not None:
        if v < 0.0 or v > 2.0:
            raise ValueError('AI temperature must be between 0.0 and 2.0')
    return v

@validator('ai_max_tokens')
def validate_ai_max_tokens(cls, v):
    """Validate AI max tokens."""
    if v:
        if v < 100 or v > 4000:
            raise ValueError('AI max tokens must be between 100 and 4000')
    return v

@validator('search_query')
def validate_search_query(cls, v):
    """Validate search query."""
    if v:
        # Remove excessive whitespace
        v = v.strip()
        if len(v) < 2:
            raise ValueError('Search query must be at least 2 characters')
        if len(v) > 100:
            raise ValueError('Search query cannot exceed 100 characters')
    return v

# Apply validators to relevant classes (guard for environments where direct assignment may fail)
try:
    GlobalSetting.__validators__['validate_setting_key'] = validator('key', allow_reuse=True)(validate_setting_key)
    GlobalSetting.__validators__['validate_setting_description'] = validator('description', allow_reuse=True)(validate_setting_description)

    SettingCreateRequest.__validators__['validate_setting_key'] = validator('key', allow_reuse=True)(validate_setting_key)
    SettingCreateRequest.__validators__['validate_setting_description'] = validator('description', allow_reuse=True)(validate_setting_description)

    SettingPatchRequest.__validators__['validate_setting_description'] = validator('description', allow_reuse=True)(validate_setting_description)

    NotificationSettings.__validators__['validate_smtp_port'] = validator('email_smtp_port', allow_reuse=True)(validate_smtp_port)

    PaymentSettings.__validators__['validate_rate'] = validator('tax_rate', 'processing_fee_rate', allow_reuse=True)(validate_rate)

    SecuritySettings.__validators__['validate_password_min_length'] = validator('password_min_length', allow_reuse=True)(validate_password_min_length)
    SecuritySettings.__validators__['validate_session_timeout'] = validator('session_timeout_minutes', allow_reuse=True)(validate_session_timeout)

    AITabibSettings.__validators__['validate_ai_temperature'] = validator('ai_temperature', allow_reuse=True)(validate_ai_temperature)
    AITabibSettings.__validators__['validate_ai_max_tokens'] = validator('ai_max_tokens', allow_reuse=True)(validate_ai_max_tokens)

    SettingsSearchRequest.__validators__['validate_search_query'] = validator('search_query', allow_reuse=True)(validate_search_query)
except Exception:
    pass

# Backwards-compatibility aliases for imports in routes/__init__
SettingUpdateRequest = SettingsUpdateRequest
