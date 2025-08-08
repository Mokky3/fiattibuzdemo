# common/schemas/__init__.py
"""
Centralized schema exports for the EHR system
Import all schemas from their respective modules for easy access
"""

# Base schemas and utilities
from .base import (
    # Enums
    Gender, BloodGroup, RhFactor, Priority, Status,
    
    # Base models
    BaseSchema, TimestampMixin, PersonBase, AddressMixin, 
    ContactInfo, VitalSigns, MedicalInfo,
    
    # Response models
    SuccessResponse, ErrorResponse, HealthResponse,
    
    # Pagination
    PaginationParams, PaginatedResponse,
    
    # Filters
    DateRangeFilter, SearchFilter,
    
    # Utilities
    generate_id, calculate_age
)

# Patient schemas
from .patient import (
    # Core patient models
    PatientBase, PatientCreate, PatientUpdate, Patient,
    
    # Summary and list models
    PatientSummary, PatientListItem,
    
    # Medical records
    PatientVitalSigns, PatientMedicalHistory, PatientInsurance,
    
    # Activity and statistics
    PatientActivity, PatientStats,
    
    # Search and filtering
    PatientSearchFilter,
    
    # Response models
    PatientResponse, PatientListResponse,
    
    # Legacy compatibility
    LegacyPatient
)

# Appointment schemas
from .appointment import (
    # Enums
    AppointmentStatus, AppointmentType, RecurrenceType,
    
    # Core appointment models
    AppointmentBase, AppointmentCreate, AppointmentUpdate, 
    AppointmentStatusUpdate, Appointment,
    
    # Frontend compatibility
    AppointmentDTO,
    
    # Scheduling models
    RecurringAppointment, TimeSlot, DaySchedule, AvailabilityRequest,
    
    # Search and filtering
    AppointmentFilter, AppointmentSearchFilter,
    
    # Statistics
    AppointmentStats, DoctorAppointmentStats, AppointmentSummary,
    
    # Reminders
    AppointmentReminder, BulkReminderRequest,
    
    # Response models
    AppointmentResponse, AppointmentListResponse, AvailabilityResponse,
    AppointmentConflictResponse,
    
    # FHIR integration
    FHIRAppointmentMapping, AppointmentParticipant,
    
    # Workflow
    AppointmentWorkflow, WorkflowStepUpdate,
    
    # Extended models
    AppointmentWithDetails
)

# Medical schemas
from .medical import (
    # Enums
    ReportType, ReportStatus, PrescriptionStatus, MedicationFrequency,
    
    # Medication models
    Medication, MedicationCreate, MedicationDetail,
    
    # Prescription models
    PrescriptionBase, PrescriptionCreate, PrescriptionUpdate, 
    Prescription, PrescriptionDTO,
    
    # Report models
    FollowUp, Doctor, ReportBase, CreateReport, ReportCreate, 
    Report, ReportView, ReportSummary,
    
    # Clinical observations
    ObservationType, ClinicalObservation, LabResult,
    
    # Search and filtering
    ReportFilter, PrescriptionFilter,
    
    # Statistics
    MedicalStats, DoctorMedicalStats,
    
    # Response models
    ReportResponse, PrescriptionResponse, MedicalHistoryResponse,
    
    # FHIR integration
    FHIRMapping, FHIRBundle
)

# User and system schemas
from .user import (
    # Enums
    UserRole, UserStatus, MessageType, NotificationChannel,
    
    # User models
    UserBase, UserCreate, UserUpdate, User,
    
    # Doctor profile models
    DoctorProfileBase, DoctorProfile, DoctorProfileResponse, DoctorUser,
    
    # Settings models
    NotificationSettings, SecuritySettings, WorkingHours, LunchBreak,
    AvailabilitySettings, AllSettings, PasswordChange,
    
    # Messaging models
    MessageBase, MessageCreate, SendMessagePayload, Message,
    DashboardMessage, Conversation, MessageThread,
    
    # Todo models
    TodoBase, TodoCreate, Todo, TodoToggle,
    
    # Statistics models
    DashboardStats, DoctorStats, DetailedStats, WeeklyStats,
    MonthlyOverview, StatsComparison,
    
    # Authentication models
    LoginRequest, LoginResponse, TokenRefreshRequest,
    PasswordResetRequest, PasswordResetConfirm,
    
    # Session and activity models
    UserSession, UserActivity,
    
    # Notification models
    NotificationBase, NotificationCreate, Notification,
    
    # System configuration
    SystemSettings, FeatureFlags,
    
    # Response models
    UserProfileResponse, DashboardOverview, MessageStatsResponse
)

# Version and metadata
__version__ = "1.0.0"
__author__ = "EHR Development Team"

# Schema registry for dynamic access
SCHEMA_REGISTRY = {
    # Patient schemas
    "patient": Patient,
    "patient_create": PatientCreate,
    "patient_update": PatientUpdate,
    "patient_summary": PatientSummary,
    
    # Appointment schemas
    "appointment": Appointment,
    "appointment_create": AppointmentCreate,
    "appointment_update": AppointmentUpdate,
    "appointment_dto": AppointmentDTO,
    
    # Medical schemas
    "prescription": Prescription,
    "prescription_create": PrescriptionCreate,
    "report": Report,
    "report_create": ReportCreate,
    "medication": Medication,
    
    # User schemas
    "user": User,
    "doctor_profile": DoctorProfile,
    "message": Message,
    "todo": Todo,
    
    # Base schemas
    "base_schema": BaseSchema,
    "success_response": SuccessResponse,
    "error_response": ErrorResponse,
}

def get_schema(schema_name: str):
    """Get schema by name from registry"""
    return SCHEMA_REGISTRY.get(schema_name)

def list_schemas():
    """List all available schemas"""
    return list(SCHEMA_REGISTRY.keys())

# Export groups for convenience
__all__ = [
    # Base
    "BaseSchema", "TimestampMixin", "PersonBase", "AddressMixin",
    "Gender", "BloodGroup", "RhFactor", "Priority", "Status",
    "SuccessResponse", "ErrorResponse", "HealthResponse",
    "PaginationParams", "PaginatedResponse",
    
    # Patient
    "Patient", "PatientCreate", "PatientUpdate", "PatientSummary",
    "PatientSearchFilter", "LegacyPatient",
    
    # Appointment
    "Appointment", "AppointmentCreate", "AppointmentUpdate", "AppointmentDTO",
    "AppointmentStatus", "AppointmentType", "AppointmentFilter",
    
    # Medical
    "Prescription", "PrescriptionCreate", "Report", "ReportCreate",
    "Medication", "ReportView", "ReportSummary", "PrescriptionDTO",
    "ReportType", "PrescriptionStatus",
    
    # User
    "User", "DoctorProfile", "DoctorUser", "Message", "Todo",
    "AllSettings", "DoctorStats", "LoginRequest", "LoginResponse",
    "UserRole", "MessageType",
    
    # Utilities
    "generate_id", "calculate_age", "get_schema", "list_schemas",
    "SCHEMA_REGISTRY"
]