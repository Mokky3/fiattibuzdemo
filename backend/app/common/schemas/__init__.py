# common/schemas/__init__.py
"""
Enhanced centralized schema exports for the EHR system with surgical edits integration
Import all schemas from their respective modules for easy access
"""

# Enhanced Base schemas and utilities
from .base_enhanced import (
    # Enhanced Enums
    Gender, AppointmentStatus, Priority, UserRole, UserStatus, MessageType, MessagePriority, MessageStatus,
    NotificationType, ClinicScope, FHIRResourceType,
    
    # Enhanced Base models
    TimestampMixin, ClinicScopedMixin, FHIRMixin, AuditMixin,
    PaginationParams, ResponseBase, ErrorResponse,
    
    # Enhanced Common models
    PhoneNumber, Address, TimeRange, DateRange, WorkingHours,
    UserBase, ContactInfo, UserPreferences,
    
    # Enhanced FHIR Related
    FHIRReference, FHIRIdentifier, FHIRMeta, FHIRCodeableConcept, FHIRQuantity, FHIRPeriod,
    
    # Enhanced Medical Models
    VitalSigns, MedicalHistory, InsuranceInfo,
    
    # Enhanced Search and Filter Models
    SearchParams, DateFilter, TextFilter, NumericFilter,
    
    # Enhanced Validation Helpers
    validate_pinfl, validate_email_format, calculate_age, format_phone_number
)

# Enhanced Response schemas
from .responses_enhanced import (
    # Enhanced Error Types
    ErrorType, ProblemDetail, PaginationMeta, PaginatedResponse, SuccessResponse,
    
    # Enhanced Audit and Rate Limiting
    AuditLogEntry, RateLimitInfo, FHIRSyncStatus, ExportJobStatus, BulkOperationResult,
    
    # Enhanced Problem Types
    ProblemTypes,
    
    # Enhanced Helper Functions
    create_problem_detail, create_paginated_response, create_success_response,
    create_audit_log_entry, create_rate_limit_info, create_bulk_operation_result
)

# Enhanced Patient schemas
from .patient_enhanced import (
    # Enhanced Core patient models
    PatientBase, PatientCreate, PatientUpdate, Patient,
    
    # Enhanced Summary and list models
    PatientSummary, PatientListItem, PatientSearchResult,
    
    # Enhanced Medical records
    PatientVitalSigns, PatientMedicalRecord, PatientImmunization,
    
    # Enhanced Activity and statistics
    PatientActivity, PatientStats,
    
    # Enhanced Search and filtering
    PatientSearchFilter, DuplicateCheckRequest, DuplicateCheckResponse,
    
    # Enhanced Response models
    PatientResponse, PatientListResponse, PatientSearchResponse,
    
    # Enhanced FHIR Integration Models
    FHIRPatientMapping, FHIRCoverageMapping, FHIRRelatedPersonMapping,
    
    # Enhanced Export and Import Models
    PatientExportRequest, PatientImportRequest, PatientBulkUpdateRequest,
    
    # Enhanced Legacy compatibility
    LegacyPatient
)

# Enhanced Appointment schemas
from .appointment_enhanced import (
    # Enhanced Enums
    AppointmentStatus, AppointmentType, RecurrenceType, AppointmentParticipantStatus,
    
    # Enhanced Core appointment models
    AppointmentBase, AppointmentCreate, AppointmentUpdate, AppointmentStatusUpdate, Appointment,
    
    # Enhanced Frontend compatibility
    AppointmentDTO,
    
    # Enhanced Recurring Appointments
    RecurringAppointment, RecurringAppointmentCreate,
    
    # Enhanced Scheduling models
    TimeSlot, DaySchedule, AvailabilityRequest, AvailabilitySlot,
    
    # Enhanced Search and filtering
    AppointmentFilter, AppointmentSearchFilter,
    
    # Enhanced Statistics
    AppointmentStats, DoctorAppointmentStats, AppointmentSummary,
    
    # Enhanced Reminders
    AppointmentReminder, BulkReminderRequest,
    
    # Enhanced Response models
    AppointmentResponse, AppointmentListResponse, AvailabilityResponse, AppointmentConflictResponse,
    
    # Enhanced FHIR Integration
    FHIRAppointmentMapping, AppointmentParticipant,
    
    # Enhanced Workflow
    AppointmentWorkflow, WorkflowStepUpdate,
    
    # Enhanced Integration models
    AppointmentWithDetails, AppointmentBulkUpdateRequest, AppointmentExportRequest
)

# Enhanced Medical schemas
from .medical_enhanced import (
    # Enhanced Enums
    ReportType, ReportStatus, PrescriptionStatus, MedicationFrequency, MedicationRoute, ObservationType,
    
    # Enhanced Medication models
    Medication, MedicationCreate, MedicationDetail,
    
    # Enhanced Prescription models
    PrescriptionBase, PrescriptionCreate, PrescriptionUpdate, Prescription, PrescriptionSummary,
    
    # Enhanced Report models
    FollowUp, Doctor, ReportBase, CreateReport, ReportCreate, Report, ReportView, ReportSummary,
    
    # Enhanced Clinical observations
    ClinicalObservation, LabResult, ImagingResult,
    
    # Enhanced Search and filtering
    ReportFilter, PrescriptionFilter, MedicalHistoryFilter,
    
    # Enhanced Statistics
    MedicalStats, DoctorMedicalStats,
    
    # Enhanced Response models
    ReportResponse, PrescriptionResponse, MedicalHistoryResponse,
    
    # Enhanced FHIR Integration
    FHIRMapping, FHIRBundle, FHIRDocumentReference, FHIRDiagnosticReport,
    
    # Enhanced Export and Import Models
    MedicalExportRequest, MedicalImportRequest, MedicalBulkUpdateRequest
)

# Enhanced User and system schemas
from .user_enhanced import (
    # Enhanced Enums
    UserRoleEnhanced, UserStatusEnhanced, MessageTypeEnhanced, NotificationChannel, SessionStatus, ActivityType,
    
    # Enhanced User models
    UserBase, UserCreate, UserUpdate, User, UserInDB,
    
    # Enhanced Doctor profile models
    DoctorProfileBase, DoctorProfile, DoctorProfileResponse, DoctorUser,
    
    # Enhanced Settings models
    NotificationSettings, SecuritySettings, WorkingHours, LunchBreak,
    AvailabilitySettings, AllSettings, PasswordChange,
    
    # Enhanced Messaging models
    MessageBase, MessageCreate, SendMessagePayload, Message,
    DashboardMessage, Conversation, MessageThread,
    
    # Enhanced Todo models
    TodoBase, TodoCreate, Todo, TodoToggle,
    
    # Enhanced Statistics models
    DashboardStats, DoctorStats, DetailedStats, WeeklyStats,
    MonthlyOverview, StatsComparison,
    
    # Enhanced Authentication models
    LoginRequest, LoginResponse, TokenRefreshRequest,
    PasswordResetRequest, PasswordResetConfirm,
    
    # Enhanced Session and activity models
    UserSession, UserActivity,
    
    # Enhanced Notification models
    NotificationBase, NotificationCreate, Notification,
    
    # Enhanced System configuration
    SystemSettings, FeatureFlags,
    
    # Enhanced Response models
    UserProfileResponse, DashboardOverview, MessageStatsResponse
)

# Note: Legacy schemas have been removed to prevent conflicts
# All functionality is now available through enhanced schemas

# Version and metadata
__version__ = "2.0.0"
__author__ = "EHR Development Team - Surgical Edits Integration"

# Enhanced Schema registry for dynamic access
SCHEMA_REGISTRY = {
    # Enhanced Patient schemas
    "patient": Patient,
    "patient_create": PatientCreate,
    "patient_update": PatientUpdate,
    "patient_summary": PatientSummary,
    "patient_search_result": PatientSearchResult,
    "duplicate_check_request": DuplicateCheckRequest,
    "duplicate_check_response": DuplicateCheckResponse,
    
    # Enhanced Appointment schemas
    "appointment": Appointment,
    "appointment_create": AppointmentCreate,
    "appointment_update": AppointmentUpdate,
    "appointment_dto": AppointmentDTO,
    "availability_request": AvailabilityRequest,
    "availability_slot": AvailabilitySlot,
    "recurring_appointment": RecurringAppointment,
    
    # Enhanced Medical schemas
    "prescription": Prescription,
    "prescription_create": PrescriptionCreate,
    "prescription_summary": PrescriptionSummary,
    "report": Report,
    "report_create": ReportCreate,
    "report_summary": ReportSummary,
    "medication": Medication,
    "medication_detail": MedicationDetail,
    "clinical_observation": ClinicalObservation,
    "lab_result": LabResult,
    "imaging_result": ImagingResult,
    
    # Enhanced User schemas
    "user": User,
    "user_create": UserCreate,
    "user_update": UserUpdate,
    "doctor_profile": DoctorProfile,
    "doctor_profile_response": DoctorProfileResponse,
    "message": Message,
    "message_create": MessageCreate,
    "conversation": Conversation,
    "message_thread": MessageThread,
    "todo": Todo,
    "todo_create": TodoCreate,
    "notification": Notification,
    "notification_create": NotificationCreate,
    
    # Enhanced Response schemas
    "problem_detail": ProblemDetail,
    "paginated_response": PaginatedResponse,
    "success_response": SuccessResponse,
    "audit_log_entry": AuditLogEntry,
    "rate_limit_info": RateLimitInfo,
    "bulk_operation_result": BulkOperationResult,
    
    # Enhanced Authentication schemas
    "login_request": LoginRequest,
    "login_response": LoginResponse,
    "password_reset_request": PasswordResetRequest,
    "password_reset_confirm": PasswordResetConfirm,
    "user_session": UserSession,
    "user_activity": UserActivity,
    
    # Enhanced Settings schemas
    "all_settings": AllSettings,
    "notification_settings": NotificationSettings,
    "security_settings": SecuritySettings,
    "availability_settings": AvailabilitySettings,
    "password_change": PasswordChange,
    
    # Enhanced Statistics schemas
    "dashboard_stats": DashboardStats,
    "doctor_stats": DoctorStats,
    "detailed_stats": DetailedStats,
    "weekly_stats": WeeklyStats,
    "monthly_overview": MonthlyOverview,
    "stats_comparison": StatsComparison,
    
    # Enhanced FHIR schemas
    "fhir_reference": FHIRReference,
    "fhir_identifier": FHIRIdentifier,
    "fhir_meta": FHIRMeta,
    "fhir_codeable_concept": FHIRCodeableConcept,
    "fhir_quantity": FHIRQuantity,
    "fhir_period": FHIRPeriod,
    "fhir_mapping": FHIRMapping,
    "fhir_bundle": FHIRBundle,
    "fhir_document_reference": FHIRDocumentReference,
    "fhir_diagnostic_report": FHIRDiagnosticReport,
    
    # Enhanced Export/Import schemas
    "patient_export_request": PatientExportRequest,
    "patient_import_request": PatientImportRequest,
    "patient_bulk_update_request": PatientBulkUpdateRequest,
    "medical_export_request": MedicalExportRequest,
    "medical_import_request": MedicalImportRequest,
    "medical_bulk_update_request": MedicalBulkUpdateRequest,
    "appointment_export_request": AppointmentExportRequest,
    "appointment_bulk_update_request": AppointmentBulkUpdateRequest,
    
    # Note: Legacy schemas removed to prevent conflicts
}

def get_schema(schema_name: str):
    """Get enhanced schema by name from registry"""
    return SCHEMA_REGISTRY.get(schema_name)

def list_schemas():
    """List all available enhanced schemas"""
    return list(SCHEMA_REGISTRY.keys())

def get_enhanced_schemas():
    """Get only enhanced schemas (excluding legacy)"""
    enhanced_schemas = {}
    for name, schema in SCHEMA_REGISTRY.items():
        if not name.startswith("legacy_"):
            enhanced_schemas[name] = schema
    return enhanced_schemas

# Legacy schema functions removed - all functionality available through enhanced schemas

# Export groups for convenience
__all__ = [
    # Enhanced Base
    "TimestampMixin", "ClinicScopedMixin", "FHIRMixin", "AuditMixin",
    "Gender", "AppointmentStatus", "Priority", "UserRole", "UserStatus", "MessageType", "MessagePriority", "MessageStatus",
    "NotificationType", "ClinicScope", "FHIRResourceType",
    "SuccessResponse", "ErrorResponse", "PaginatedResponse", "ProblemDetail",
    "PaginationParams", "ResponseBase",
    
    # Enhanced Patient
    "Patient", "PatientCreate", "PatientUpdate", "PatientSummary", "PatientSearchResult",
    "PatientSearchFilter", "DuplicateCheckRequest", "DuplicateCheckResponse",
    "PatientResponse", "PatientListResponse", "PatientSearchResponse",
    "FHIRPatientMapping", "FHIRCoverageMapping", "FHIRRelatedPersonMapping",
    "PatientExportRequest", "PatientImportRequest", "PatientBulkUpdateRequest",
    "LegacyPatient",
    
    # Enhanced Appointment
    "Appointment", "AppointmentCreate", "AppointmentUpdate", "AppointmentDTO",
    "AppointmentStatus", "AppointmentType", "AppointmentFilter", "AppointmentSearchFilter",
    "AvailabilityRequest", "AvailabilitySlot", "RecurringAppointment", "RecurringAppointmentCreate",
    "AppointmentResponse", "AppointmentListResponse", "AvailabilityResponse", "AppointmentConflictResponse",
    "FHIRAppointmentMapping", "AppointmentParticipant", "AppointmentWorkflow", "WorkflowStepUpdate",
    "AppointmentWithDetails", "AppointmentBulkUpdateRequest", "AppointmentExportRequest",
    
    # Enhanced Medical
    "Prescription", "PrescriptionCreate", "PrescriptionSummary", "Report", "ReportCreate", "ReportSummary",
    "Medication", "MedicationDetail", "ReportView", "ClinicalObservation", "LabResult", "ImagingResult",
    "ReportType", "PrescriptionStatus", "MedicationRoute", "ObservationType",
    "ReportResponse", "PrescriptionResponse", "MedicalHistoryResponse",
    "FHIRMapping", "FHIRBundle", "FHIRDocumentReference", "FHIRDiagnosticReport",
    "MedicalExportRequest", "MedicalImportRequest", "MedicalBulkUpdateRequest",
    
    # Enhanced User
    "User", "UserCreate", "UserUpdate", "DoctorProfile", "DoctorProfileResponse", "DoctorUser",
    "Message", "MessageCreate", "Conversation", "MessageThread", "Todo", "TodoCreate",
    "AllSettings", "NotificationSettings", "SecuritySettings", "AvailabilitySettings", "PasswordChange",
    "DashboardStats", "DoctorStats", "DetailedStats", "WeeklyStats", "MonthlyOverview", "StatsComparison",
    "LoginRequest", "LoginResponse", "PasswordResetRequest", "PasswordResetConfirm",
    "UserSession", "UserActivity", "Notification", "NotificationCreate",
    "SystemSettings", "FeatureFlags", "UserProfileResponse", "DashboardOverview", "MessageStatsResponse",
    
    # Enhanced Response
    "ProblemDetail", "PaginatedResponse", "SuccessResponse", "AuditLogEntry", "RateLimitInfo",
    "BulkOperationResult", "FHIRSyncStatus", "ExportJobStatus",
    "create_problem_detail", "create_paginated_response", "create_success_response",
    "create_audit_log_entry", "create_rate_limit_info", "create_bulk_operation_result",
    
    # Enhanced FHIR
    "FHIRReference", "FHIRIdentifier", "FHIRMeta", "FHIRCodeableConcept", "FHIRQuantity", "FHIRPeriod",
    "FHIRMapping", "FHIRBundle", "FHIRDocumentReference", "FHIRDiagnosticReport",
    
    # Enhanced Validation
    "validate_pinfl", "validate_email_format", "calculate_age", "format_phone_number",
    
    # Enhanced Utilities
    "get_schema", "list_schemas", "get_enhanced_schemas",
    "SCHEMA_REGISTRY"
]