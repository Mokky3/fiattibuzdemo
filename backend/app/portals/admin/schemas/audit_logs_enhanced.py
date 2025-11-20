"""Enhanced Admin portal audit logs schemas for surgical edits integration."""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# ================================
# Enhanced Audit Logs Schemas
# ================================

class AuditActionEnum(str, Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    EXPORT = "export"
    IMPORT = "import"
    SHARE = "share"
    APPROVE = "approve"
    REJECT = "reject"
    SIGN = "sign"
    UNSIGN = "unsign"

class AuditResourceEnum(str, Enum):
    PATIENT = "patient"
    APPOINTMENT = "appointment"
    PRESCRIPTION = "prescription"
    MEDICAL_RECORD = "medical_record"
    USER = "user"
    CLINIC = "clinic"
    DOCTOR = "doctor"
    NURSE = "nurse"
    RECEPTIONIST = "receptionist"
    LAB_RESULT = "lab_result"
    IMAGING = "imaging"
    MESSAGE = "message"
    SETTING = "setting"
    POLICY = "policy"
    ROLE = "role"

class AuditSeverityEnum(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AuditLog(BaseModel):
    """Enhanced audit log entry."""
    id: str = Field(..., description="Audit log ID")
    timestamp: str = Field(..., description="Audit timestamp")
    actor_id: str = Field(..., description="User ID who performed the action")
    actor_name: str = Field(..., description="User name who performed the action")
    actor_role: str = Field(..., description="User role who performed the action")
    action: AuditActionEnum = Field(..., description="Action performed")
    resource_type: AuditResourceEnum = Field(..., description="Resource type")
    resource_id: str = Field(..., description="Resource ID")
    resource_name: Optional[str] = Field(None, description="Resource name")
    clinic_id: str = Field(..., description="Clinic ID")
    clinic_name: str = Field(..., description="Clinic name")
    patient_id: Optional[str] = Field(None, description="Patient ID if applicable")
    patient_name: Optional[str] = Field(None, description="Patient name if applicable")
    ip_address: Optional[str] = Field(None, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")
    session_id: Optional[str] = Field(None, description="Session ID")
    trace_id: Optional[str] = Field(None, description="Request trace ID")
    severity: AuditSeverityEnum = Field(AuditSeverityEnum.MEDIUM, description="Audit severity")
    status: str = Field(..., description="Action status: success|failure|error")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    old_values: Optional[Dict[str, Any]] = Field(None, description="Old values for updates")
    new_values: Optional[Dict[str, Any]] = Field(None, description="New values for updates")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    created_at: str = Field(..., description="Creation timestamp")

class AuditLogSearchRequest(BaseModel):
    """Enhanced audit log search request."""
    actor_id: Optional[str] = Field(None, description="Filter by actor ID")
    actor_role: Optional[str] = Field(None, description="Filter by actor role")
    action: Optional[AuditActionEnum] = Field(None, description="Filter by action")
    resource_type: Optional[AuditResourceEnum] = Field(None, description="Filter by resource type")
    resource_id: Optional[str] = Field(None, description="Filter by resource ID")
    clinic_id: Optional[str] = Field(None, description="Filter by clinic ID")
    patient_id: Optional[str] = Field(None, description="Filter by patient ID")
    severity: Optional[AuditSeverityEnum] = Field(None, description="Filter by severity")
    status: Optional[str] = Field(None, description="Filter by status")
    
    # Date filters
    date_from: Optional[str] = Field(None, description="Filter from date YYYY-MM-DD")
    date_to: Optional[str] = Field(None, description="Filter to date YYYY-MM-DD")
    time_from: Optional[str] = Field(None, description="Filter from time HH:MM")
    time_to: Optional[str] = Field(None, description="Filter to time HH:MM")
    
    # Search
    search_query: Optional[str] = Field(None, min_length=2, description="Search in audit log data")
    
    # Pagination
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Page size")
    
    # Sorting
    sort_by: str = Field("timestamp", pattern=r'^(timestamp|actor_name|action|resource_type|severity|status)$')
    sort_order: str = Field("desc", pattern=r'^(asc|desc)$')

class AuditLogListResponse(BaseModel):
    """Enhanced audit log list response."""
    audit_logs: List[AuditLog] = Field(..., description="List of audit logs")
    total: int = Field(..., description="Total number of audit logs")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    total_pages: int = Field(..., description="Total number of pages")

class AuditLogSummary(BaseModel):
    """Summary metrics for audit logs (compat with routes)."""
    today_logs: int
    week_logs: int
    month_logs: int
    active_users: int
    failed_actions: int
    critical_events: int
    recent_activities: List[Dict[str, Any]] = Field(default_factory=list)

class AuditLogStats(BaseModel):
    """Enhanced audit log statistics."""
    total_logs: int = Field(..., description="Total audit logs")
    logs_today: int = Field(..., description="Audit logs today")
    logs_this_week: int = Field(..., description="Audit logs this week")
    logs_this_month: int = Field(..., description="Audit logs this month")
    logs_by_action: Dict[str, int] = Field(..., description="Logs count by action")
    logs_by_resource: Dict[str, int] = Field(..., description="Logs count by resource type")
    logs_by_severity: Dict[str, int] = Field(..., description="Logs count by severity")
    logs_by_status: Dict[str, int] = Field(..., description="Logs count by status")
    logs_by_actor_role: Dict[str, int] = Field(..., description="Logs count by actor role")
    failed_actions: int = Field(..., description="Failed actions count")
    critical_events: int = Field(..., description="Critical events count")
    most_active_users: List[Dict[str, Any]] = Field(default_factory=list, description="Most active users")
    most_accessed_resources: List[Dict[str, Any]] = Field(default_factory=list, description="Most accessed resources")

class AuditLogExportRequest(BaseModel):
    """Enhanced audit log export request."""
    format: str = Field("csv", pattern=r'^(csv|json|ndjson|excel)$', description="Export format")
    date_from: Optional[str] = Field(None, description="Export from date YYYY-MM-DD")
    date_to: Optional[str] = Field(None, description="Export to date YYYY-MM-DD")
    actor_id: Optional[str] = Field(None, description="Filter by actor ID")
    action: Optional[AuditActionEnum] = Field(None, description="Filter by action")
    resource_type: Optional[AuditResourceEnum] = Field(None, description="Filter by resource type")
    clinic_id: Optional[str] = Field(None, description="Filter by clinic ID")
    severity: Optional[AuditSeverityEnum] = Field(None, description="Filter by severity")
    status: Optional[str] = Field(None, description="Filter by status")
    include_pii: bool = Field(False, description="Include PII data")
    include_metadata: bool = Field(True, description="Include metadata")

class AuditLogExportResponse(BaseModel):
    """Enhanced audit log export response."""
    export_id: str = Field(..., description="Export job ID")
    format: str = Field(..., description="Export format")
    record_count: int = Field(..., description="Number of records exported")
    file_url: str = Field(..., description="Download URL")
    expires_at: str = Field(..., description="Export expiration date")
    created_at: str = Field(..., description="Export creation date")
    file_size: int = Field(..., description="File size in bytes")

class AuditLogFilter(BaseModel):
    """Filters used when exporting audit logs (compat with routes)."""
    actor_id: Optional[str] = None
    actor_role: Optional[str] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    clinic_id: Optional[str] = None
    patient_id: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class AuditLogExport(BaseModel):
    """Audit export descriptor (compat with routes)."""
    export_id: str
    format: str
    filters: AuditLogFilter
    record_count: int
    file_url: str
    expires_at: str
    created_at: str

class AuditLogAlert(BaseModel):
    """Enhanced audit log alert."""
    id: str = Field(..., description="Alert ID")
    name: str = Field(..., description="Alert name")
    description: str = Field(..., description="Alert description")
    conditions: Dict[str, Any] = Field(..., description="Alert conditions")
    severity: AuditSeverityEnum = Field(..., description="Alert severity")
    is_active: bool = Field(True, description="Is alert active")
    notification_channels: List[str] = Field(default_factory=list, description="Notification channels")
    created_at: str = Field(..., description="Alert creation date")
    updated_at: str = Field(..., description="Alert last update date")
    triggered_count: int = Field(0, description="Number of times triggered")
    last_triggered: Optional[str] = Field(None, description="Last triggered date")

class AuditLogAlertCreateRequest(BaseModel):
    """Enhanced audit log alert creation request."""
    name: str = Field(..., min_length=1, max_length=100, description="Alert name")
    description: str = Field(..., min_length=1, max_length=500, description="Alert description")
    conditions: Dict[str, Any] = Field(..., description="Alert conditions")
    severity: AuditSeverityEnum = Field(..., description="Alert severity")
    notification_channels: List[str] = Field(default_factory=list, description="Notification channels")

class AuditLogAlertUpdateRequest(BaseModel):
    """Enhanced audit log alert update request."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Updated alert name")
    description: Optional[str] = Field(None, min_length=1, max_length=500, description="Updated alert description")
    conditions: Optional[Dict[str, Any]] = Field(None, description="Updated alert conditions")
    severity: Optional[AuditSeverityEnum] = Field(None, description="Updated alert severity")
    is_active: Optional[bool] = Field(None, description="Updated active status")
    notification_channels: Optional[List[str]] = Field(None, description="Updated notification channels")

class AuditLogRetentionPolicy(BaseModel):
    """Enhanced audit log retention policy."""
    id: str = Field(..., description="Policy ID")
    name: str = Field(..., description="Policy name")
    description: str = Field(..., description="Policy description")
    retention_days: int = Field(..., ge=1, le=3650, description="Retention period in days")
    resource_types: List[AuditResourceEnum] = Field(..., description="Applicable resource types")
    actions: List[AuditActionEnum] = Field(..., description="Applicable actions")
    severity_levels: List[AuditSeverityEnum] = Field(..., description="Applicable severity levels")
    is_active: bool = Field(True, description="Is policy active")
    created_at: str = Field(..., description="Policy creation date")
    updated_at: str = Field(..., description="Policy last update date")

class AuditLogRetentionPolicyCreateRequest(BaseModel):
    """Enhanced retention policy creation request."""
    name: str = Field(..., min_length=1, max_length=100, description="Policy name")
    description: str = Field(..., min_length=1, max_length=500, description="Policy description")
    retention_days: int = Field(..., ge=1, le=3650, description="Retention period in days")
    resource_types: List[AuditResourceEnum] = Field(..., description="Applicable resource types")
    actions: List[AuditActionEnum] = Field(..., description="Applicable actions")
    severity_levels: List[AuditSeverityEnum] = Field(..., description="Applicable severity levels")

class AuditLogRetentionPolicyUpdateRequest(BaseModel):
    """Enhanced retention policy update request."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Updated policy name")
    description: Optional[str] = Field(None, min_length=1, max_length=500, description="Updated policy description")
    retention_days: Optional[int] = Field(None, ge=1, le=3650, description="Updated retention period in days")
    resource_types: Optional[List[AuditResourceEnum]] = Field(None, description="Updated applicable resource types")
    actions: Optional[List[AuditActionEnum]] = Field(None, description="Updated applicable actions")
    severity_levels: Optional[List[AuditSeverityEnum]] = Field(None, description="Updated applicable severity levels")
    is_active: Optional[bool] = Field(None, description="Updated active status")

# ================================
# Enhanced Validators
# ================================

@validator('date_from', 'date_to')
def validate_date_format(cls, v):
    """Validate date format."""
    if v:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')
    return v

@validator('time_from', 'time_to')
def validate_time_format(cls, v):
    """Validate time format."""
    if v:
        try:
            datetime.strptime(v, "%H:%M")
        except ValueError:
            raise ValueError('Time must be in HH:MM format')
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

@validator('name')
def validate_name(cls, v):
    """Validate name field."""
    if v:
        # Remove excessive whitespace
        v = v.strip()
        if len(v) == 0:
            raise ValueError('Name cannot be empty')
        if len(v) > 100:
            raise ValueError('Name cannot exceed 100 characters')
    return v

@validator('description')
def validate_description(cls, v):
    """Validate description field."""
    if v:
        # Remove excessive whitespace
        v = v.strip()
        if len(v) == 0:
            raise ValueError('Description cannot be empty')
        if len(v) > 500:
            raise ValueError('Description cannot exceed 500 characters')
    return v

@validator('retention_days')
def validate_retention_days(cls, v):
    """Validate retention days."""
    if v:
        if v < 1 or v > 3650:
            raise ValueError('Retention days must be between 1 and 3650')
    return v

@validator('conditions')
def validate_conditions(cls, v):
    """Validate alert conditions."""
    if v:
        if not isinstance(v, dict):
            raise ValueError('Conditions must be a dictionary')
        if len(v) == 0:
            raise ValueError('Conditions cannot be empty')
    return v

@validator('notification_channels')
def validate_notification_channels(cls, v):
    """Validate notification channels."""
    if v:
        valid_channels = ['email', 'sms', 'push', 'webhook']
        for channel in v:
            if channel not in valid_channels:
                raise ValueError(f'Invalid notification channel: {channel}')
    return v

"""Guard Pydantic v1-style __validators__ assignments for compatibility."""
try:
    AuditLogSearchRequest.__validators__['validate_date_format'] = validator('date_from', 'date_to', allow_reuse=True)(validate_date_format)
    AuditLogSearchRequest.__validators__['validate_time_format'] = validator('time_from', 'time_to', allow_reuse=True)(validate_time_format)
    AuditLogSearchRequest.__validators__['validate_search_query'] = validator('search_query', allow_reuse=True)(validate_search_query)

    AuditLogExportRequest.__validators__['validate_date_format'] = validator('date_from', 'date_to', allow_reuse=True)(validate_date_format)

    AuditLogAlert.__validators__['validate_name'] = validator('name', allow_reuse=True)(validate_name)
    AuditLogAlert.__validators__['validate_description'] = validator('description', allow_reuse=True)(validate_description)
    AuditLogAlert.__validators__['validate_conditions'] = validator('conditions', allow_reuse=True)(validate_conditions)
    AuditLogAlert.__validators__['validate_notification_channels'] = validator('notification_channels', allow_reuse=True)(validate_notification_channels)

    AuditLogAlertCreateRequest.__validators__['validate_name'] = validator('name', allow_reuse=True)(validate_name)
    AuditLogAlertCreateRequest.__validators__['validate_description'] = validator('description', allow_reuse=True)(validate_description)
    AuditLogAlertCreateRequest.__validators__['validate_conditions'] = validator('conditions', allow_reuse=True)(validate_conditions)
    AuditLogAlertCreateRequest.__validators__['validate_notification_channels'] = validator('notification_channels', allow_reuse=True)(validate_notification_channels)

    AuditLogAlertUpdateRequest.__validators__['validate_name'] = validator('name', allow_reuse=True)(validate_name)
    AuditLogAlertUpdateRequest.__validators__['validate_description'] = validator('description', allow_reuse=True)(validate_description)
    AuditLogAlertUpdateRequest.__validators__['validate_conditions'] = validator('conditions', allow_reuse=True)(validate_conditions)
    AuditLogAlertUpdateRequest.__validators__['validate_notification_channels'] = validator('notification_channels', allow_reuse=True)(validate_notification_channels)

    AuditLogRetentionPolicy.__validators__['validate_name'] = validator('name', allow_reuse=True)(validate_name)
    AuditLogRetentionPolicy.__validators__['validate_description'] = validator('description', allow_reuse=True)(validate_description)
    AuditLogRetentionPolicy.__validators__['validate_retention_days'] = validator('retention_days', allow_reuse=True)(validate_retention_days)

    AuditLogRetentionPolicyCreateRequest.__validators__['validate_name'] = validator('name', allow_reuse=True)(validate_name)
    AuditLogRetentionPolicyCreateRequest.__validators__['validate_description'] = validator('description', allow_reuse=True)(validate_description)
    AuditLogRetentionPolicyCreateRequest.__validators__['validate_retention_days'] = validator('retention_days', allow_reuse=True)(validate_retention_days)

    AuditLogRetentionPolicyUpdateRequest.__validators__['validate_name'] = validator('name', allow_reuse=True)(validate_name)
    AuditLogRetentionPolicyUpdateRequest.__validators__['validate_description'] = validator('description', allow_reuse=True)(validate_description)
    AuditLogRetentionPolicyUpdateRequest.__validators__['validate_retention_days'] = validator('retention_days', allow_reuse=True)(validate_retention_days)
except Exception:
    pass

# Compatibility aliases for routes expecting legacy names
AuditLogEntry = AuditLog
