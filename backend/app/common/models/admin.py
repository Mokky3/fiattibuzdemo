# app/common/models/admin.py
"""Admin models for the EHR system."""
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, JSON, ForeignKey, Enum, Text, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy import String
import uuid
import enum

from app.db.base_class import Base


class AdminRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    CLINIC_ADMIN = "clinic_admin"
    DEPARTMENT_ADMIN = "department_admin"
    BILLING_ADMIN = "billing_admin"
    HR_ADMIN = "hr_admin"
    IT_ADMIN = "it_admin"


class AlertType(str, enum.Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"
    SUCCESS = "success"


class AlertSeverity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ActivityType(str, enum.Enum):
    LOGIN = "login"
    LOGOUT = "logout"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    VIEW = "view"
    EXPORT = "export"
    IMPORT = "import"
    CONFIG_CHANGE = "config_change"
    PERMISSION_CHANGE = "permission_change"
    SECURITY_EVENT = "security_event"


# Note: Organization functionality has been moved to Hospital model in hospital.py
# The Hospital model now serves as the primary Organization model with enhanced features
# This provides better integration with medical-specific functionality


class Department(Base):
    """Department/Location within an organization."""
    __tablename__ = "admin_departments"  # Changed from "departments" to avoid conflicts
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(String(36), ForeignKey("hospitals.id"), nullable=False)
    
    # Basic information
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=False)
    department_type = Column(String(50), nullable=False)  # emergency, outpatient, inpatient, lab, radiology
    
    # Location
    floor = Column(String(10), nullable=True)
    building = Column(String(50), nullable=True)
    room_numbers = Column(JSON, nullable=True)  # Array of room numbers
    
    # Contact
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    
    # Capacity
    bed_capacity = Column(Integer, nullable=True)
    current_occupancy = Column(Integer, default=0)
    
    # Operating hours
    operating_hours = Column(JSON, nullable=True)
    is_24_hours = Column(Boolean, default=False)
    
    # Head of department
    head_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # FHIR reference
    fhir_location_id = Column(String(255), unique=True, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    organization = relationship("Hospital", back_populates="admin_departments")
    users = relationship("User", back_populates="admin_department")
    head = relationship("User", foreign_keys=[head_id])
    stats = relationship("DepartmentStats", back_populates="department", uselist=False)


class OrganizationStats(Base):
    """Statistics for organization dashboard."""
    __tablename__ = "organization_stats"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(String(36), ForeignKey("hospitals.id"), unique=True, nullable=False)
    
    # Patient statistics
    total_patients = Column(Integer, default=0)
    active_patients = Column(Integer, default=0)
    new_patients_month = Column(Integer, default=0)
    new_patients_today = Column(Integer, default=0)
    
    # Appointment statistics
    total_appointments = Column(Integer, default=0)
    completed_appointments = Column(Integer, default=0)
    cancelled_appointments = Column(Integer, default=0)
    no_show_appointments = Column(Integer, default=0)
    appointments_today = Column(Integer, default=0)
    appointments_month = Column(Integer, default=0)
    
    # Financial statistics
    total_revenue = Column(Float, default=0.0)
    revenue_month = Column(Float, default=0.0)
    revenue_today = Column(Float, default=0.0)
    outstanding_payments = Column(Float, default=0.0)
    
    # Staff statistics
    total_doctors = Column(Integer, default=0)
    total_nurses = Column(Integer, default=0)
    total_staff = Column(Integer, default=0)
    active_departments = Column(Integer, default=0)
    
    # Performance metrics
    average_wait_time = Column(Integer, default=0)  # minutes
    average_consultation_time = Column(Integer, default=0)  # minutes
    patient_satisfaction_score = Column(Float, nullable=True)  # 1-5
    bed_occupancy_rate = Column(Float, nullable=True)  # percentage
    
    # Last calculated
    last_calculated = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    organization = relationship("Hospital", back_populates="stats")


class DepartmentStats(Base):
    """Statistics for department dashboard."""
    __tablename__ = "department_stats"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    department_id = Column(String(36), ForeignKey("admin_departments.id"), unique=True, nullable=False)
    
    # Staff statistics
    total_staff = Column(Integer, default=0)
    doctors_count = Column(Integer, default=0)
    nurses_count = Column(Integer, default=0)
    support_staff_count = Column(Integer, default=0)
    
    # Patient statistics
    total_patients = Column(Integer, default=0)
    active_patients = Column(Integer, default=0)
    patients_today = Column(Integer, default=0)
    patient_staff_ratio = Column(Float, nullable=True)
    
    # Appointment statistics
    appointments_today = Column(Integer, default=0)
    appointments_month = Column(Integer, default=0)
    average_daily_appointments = Column(Float, nullable=True)
    
    # Financial statistics
    revenue_month = Column(Float, default=0.0)
    revenue_per_patient = Column(Float, nullable=True)
    
    # Performance metrics
    average_wait_time = Column(Integer, default=0)  # minutes
    bed_occupancy_rate = Column(Float, nullable=True)  # percentage
    
    # Last calculated
    last_calculated = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    department = relationship("Department", back_populates="stats")


class ServicePrice(Base):
    """Service pricing configuration."""
    __tablename__ = "service_prices"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(String(36), ForeignKey("hospitals.id"), nullable=False)
    department_id = Column(String(36), ForeignKey("admin_departments.id"), nullable=True)
    
    # Service details
    service_code = Column(String(50), nullable=False)
    service_name = Column(String(200), nullable=False)
    service_category = Column(String(100), nullable=False)  # consultation, procedure, lab_test, imaging
    description = Column(Text, nullable=True)
    
    # Pricing
    base_price = Column(Float, nullable=False)
    currency = Column(String(3), default="UZS")
    
    # Discounts and modifiers
    insurance_covered = Column(Boolean, default=True)
    insurance_coverage_percent = Column(Float, default=100.0)
    cash_discount_percent = Column(Float, default=0.0)
    
    # Tax
    tax_rate = Column(Float, default=0.0)
    tax_included = Column(Boolean, default=False)
    
    # Duration (for time-based services)
    duration_minutes = Column(Integer, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    requires_approval = Column(Boolean, default=False)
    
    # Validity
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date, nullable=True)
    
    # Metadata
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    approved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    organization = relationship("Hospital", back_populates="service_prices")
    department = relationship("Department")


class SystemConfig(Base):
    """System configuration settings."""
    __tablename__ = "system_configs"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(String(36), ForeignKey("hospitals.id"), nullable=True)
    
    # Configuration
    category = Column(String(50), nullable=False)  # general, security, billing, appointments, etc.
    key = Column(String(100), nullable=False)
    value = Column(JSON, nullable=False)
    value_type = Column(String(20), nullable=False)  # string, number, boolean, json
    
    # Description
    description = Column(Text, nullable=True)
    
    # Constraints
    is_required = Column(Boolean, default=False)
    is_sensitive = Column(Boolean, default=False)  # Should be encrypted
    allowed_values = Column(JSON, nullable=True)  # For enum-like configs
    min_value = Column(Float, nullable=True)
    max_value = Column(Float, nullable=True)
    
    # Scope
    is_global = Column(Boolean, default=False)  # System-wide vs organization-specific
    is_public = Column(Boolean, default=False)  # Can be viewed by non-admins
    
    # Metadata
    modified_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    organization = relationship("Hospital", back_populates="system_configs")


class AdminActivity(Base):
    """Admin activity log for audit trail."""
    __tablename__ = "admin_activities"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    organization_id = Column(String(36), ForeignKey("hospitals.id"), nullable=True)
    
    # Activity details
    activity_type = Column(Enum(ActivityType), nullable=False)
    category = Column(String(50), nullable=False)  # user_management, config, billing, etc.
    action = Column(String(200), nullable=False)  # Detailed action description
    
    # Target resource
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(36), nullable=True)
    resource_name = Column(String(200), nullable=True)
    
    # Changes made
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    
    # Status
    status = Column(String(20), nullable=False)  # success, failed, partial
    error_message = Column(Text, nullable=True)
    
    # Request info
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Additional context
    user_metadata = Column(JSON, nullable=True)
    
    # Timestamp
    performed_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    user = relationship("User")
    organization = relationship("Hospital")


class SystemAlert(Base):
    """System alerts and notifications."""
    __tablename__ = "system_alerts"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # Alert details
    alert_type = Column(Enum(AlertType), nullable=False)
    severity = Column(Enum(AlertSeverity), nullable=False)
    category = Column(String(50), nullable=False)  # system, security, performance, billing
    
    # Content
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    details = Column(JSON, nullable=True)
    
    # Target
    is_global = Column(Boolean, default=False)  # System-wide alert
    organization_id = Column(String(36), ForeignKey("hospitals.id"), nullable=True)
    department_id = Column(String(36), ForeignKey("admin_departments.id"), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    
    # Resolution
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    # Auto-resolution
    auto_resolve_after = Column(Integer, nullable=True)  # hours
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    organization = relationship("Hospital")
    department = relationship("Department")
    recipient = relationship("User", foreign_keys=[user_id])
    acknowledger = relationship("User", foreign_keys=[acknowledged_by])
    resolver = relationship("User", foreign_keys=[resolved_by])


class BulkOperation(Base):
    """Bulk import/export operations."""
    __tablename__ = "bulk_operations"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(String(36), ForeignKey("hospitals.id"), nullable=False)
    
    # Operation details
    operation_type = Column(String(20), nullable=False)  # import, export
    resource_type = Column(String(50), nullable=False)  # patients, appointments, etc.
    
    # File information
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)  # bytes
    file_format = Column(String(20), nullable=True)  # csv, xlsx, json
    file_url = Column(String(500), nullable=True)  # For exports
    
    # Processing
    total_records = Column(Integer, default=0)
    processed_records = Column(Integer, default=0)
    successful_records = Column(Integer, default=0)
    failed_records = Column(Integer, default=0)
    
    # Errors
    errors = Column(JSON, nullable=True)  # Array of error objects
    warnings = Column(JSON, nullable=True)  # Array of warning objects
    
    # Status
    status = Column(String(20), default="pending")  # pending, processing, completed, failed, cancelled
    progress_percent = Column(Float, default=0.0)
    
    # Options
    options = Column(JSON, nullable=True)  # Import/export options
    filters = Column(JSON, nullable=True)  # Export filters
    
    # Execution
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    performed_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Results
    result_summary = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    organization = relationship("Hospital")
    performer = relationship("User")


class ReportTemplate(Base):
    """Report templates for admin reporting."""
    __tablename__ = "report_templates"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    organization_id = Column(String(36), ForeignKey("hospitals.id"), nullable=True)
    
    # Template details
    name = Column(String(200), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    category = Column(String(50), nullable=False)  # financial, clinical, operational, regulatory
    description = Column(Text, nullable=True)
    
    # Template configuration
    template_type = Column(String(50), nullable=False)  # tabular, chart, mixed, custom
    data_sources = Column(JSON, nullable=False)  # Array of data source configs
    filters = Column(JSON, nullable=True)  # Available filters
    columns = Column(JSON, nullable=True)  # For tabular reports
    charts = Column(JSON, nullable=True)  # Chart configurations
    
    # Layout
    layout = Column(JSON, nullable=True)  # Layout configuration
    styles = Column(JSON, nullable=True)  # Custom styles
    
    # Scheduling
    is_schedulable = Column(Boolean, default=True)
    default_schedule = Column(JSON, nullable=True)  # Cron expression or schedule config
    
    # Access
    is_public = Column(Boolean, default=False)
    required_role = Column(String(50), nullable=True)
    required_permissions = Column(JSON, nullable=True)  # Array of permission codes
    
    # Status
    is_active = Column(Boolean, default=True)
    is_system = Column(Boolean, default=False)  # System-provided template
    
    # Metadata
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    modified_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    organization = relationship("Hospital")
    creator = relationship("User", foreign_keys=[created_by])
    modifier = relationship("User", foreign_keys=[modified_by])


class ScheduledReport(Base):
    """Scheduled report instances."""
    __tablename__ = "scheduled_reports"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    template_id = Column(String(36), ForeignKey("report_templates.id"), nullable=False)
    organization_id = Column(String(36), ForeignKey("hospitals.id"), nullable=False)
    
    # Schedule configuration
    name = Column(String(200), nullable=False)
    schedule = Column(JSON, nullable=False)  # Cron expression or schedule config
    timezone = Column(String(50), default="Asia/Tashkent")
    
    # Parameters
    parameters = Column(JSON, nullable=True)  # Report parameters
    filters = Column(JSON, nullable=True)  # Applied filters
    
    # Distribution
    recipients = Column(JSON, nullable=False)  # Array of email addresses
    cc_recipients = Column(JSON, nullable=True)
    delivery_format = Column(String(20), default="pdf")  # pdf, excel, csv
    include_raw_data = Column(Boolean, default=False)
    
    # Status
    is_active = Column(Boolean, default=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    last_run_status = Column(String(20), nullable=True)  # success, failed
    last_run_error = Column(Text, nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    template = relationship("ReportTemplate")
    organization = relationship("Hospital")
    creator = relationship("User")