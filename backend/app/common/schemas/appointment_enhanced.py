"""Enhanced appointment-related schemas for surgical edits integration."""
from datetime import datetime, date, time
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
import enum
from enum import Enum
from .base_enhanced import (
    TimestampMixin, ClinicScopedMixin, FHIRMixin, AuditMixin,
    Priority, FHIRReference, FHIRCodeableConcept, FHIRPeriod,
    WorkingHours, validate_email_format, format_phone_number
)

# ============================= Enhanced Appointment Enums =============================

class AppointmentStatus(str, enum.Enum):
    """Enhanced appointment statuses aligned with FHIR."""
    PROPOSED = "proposed"
    PENDING = "pending"
    BOOKED = "booked"
    ARRIVED = "arrived"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"
    NOSHOW = "noshow"
    ENTERED_IN_ERROR = "entered-in-error"
    CHECKED_IN = "checked-in"
    WAITLIST = "waitlist"

class AppointmentType(str, enum.Enum):
    """Enhanced appointment types."""
    CONSULTATION = "consultation"
    FOLLOW_UP = "follow-up"
    CHECKUP = "checkup"
    EMERGENCY = "emergency"
    ROUTINE = "routine"
    SPECIALIST = "specialist"
    THERAPY = "therapy"
    VACCINATION = "vaccination"
    SURGERY = "surgery"
    LAB_WORK = "lab_work"
    IMAGING = "imaging"
    TELEMEDICINE = "telemedicine"
    HOME_VISIT = "home_visit"

class RecurrenceType(str, Enum):
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"

class AppointmentParticipantStatus(str, enum.Enum):
    """FHIR-compliant participant statuses."""
    ACCEPTED = "accepted"
    DECLINED = "declined"
    TENTATIVE = "tentative"
    NEEDS_ACTION = "needs-action"

# ============================= Enhanced Core Appointment Models =============================

class AppointmentBase(BaseModel):
    """Enhanced base appointment model."""
    patient_id: str = Field(..., description="Patient identifier")
    practitioner_id: str = Field(..., description="Practitioner identifier")
    appointment_date: date = Field(..., description="Appointment date")
    appointment_time: time = Field(..., description="Appointment time")
    appointment_type: AppointmentType = AppointmentType.CONSULTATION
    duration_minutes: int = Field(30, ge=15, le=480, description="Duration in minutes")
    notes: Optional[str] = Field(None, max_length=1000, description="Appointment notes")
    priority: Priority = Priority.MEDIUM
    reason_code: Optional[FHIRCodeableConcept] = None
    special_instructions: Optional[str] = Field(None, max_length=500)
    
    @validator('appointment_date')
    def validate_appointment_date(cls, v):
        # Allow past dates for historical data
        return v

class AppointmentCreate(AppointmentBase):
    """Enhanced schema for creating new appointments with FHIR integration."""
    patient_name: Optional[str] = Field(None, description="Patient name for quick reference")
    practitioner_name: Optional[str] = Field(None, description="Practitioner name for quick reference")
    status: AppointmentStatus = AppointmentStatus.PROPOSED
    send_reminder: bool = True
    reminder_time_minutes: int = Field(60, ge=15, le=1440, description="Reminder time before appointment")
    
    # Compatibility aliases (routes may pass these)
    doctor_id: Optional[str] = Field(None, description="Alias for practitioner_id")
    duration: Optional[int] = Field(None, description="Alias for duration_minutes")
    clinic_id: Optional[str] = Field(None, description="Clinic ID for scoping")
    location: Optional[str] = Field(None, description="Human readable location name")
    
    # FHIR integration fields
    create_fhir_appointment: bool = Field(True, description="Create FHIR Appointment resource")
    location_id: Optional[str] = Field(None, description="Location ID for the appointment")
    service_type: Optional[FHIRCodeableConcept] = None
    
    # Recurring appointment fields
    is_recurring: bool = False
    recurrence_type: RecurrenceType = RecurrenceType.NONE
    recurrence_interval: int = Field(1, ge=1, le=12)
    recurrence_end_date: Optional[date] = None
    recurrence_days_of_week: Optional[List[int]] = Field(None, description="Days of week (0=Monday)")

    @validator('doctor_id', pre=True, always=True)
    def _map_doctor_to_practitioner(cls, v, values):
        if v and not values.get('practitioner_id'):
            values['practitioner_id'] = v
        return v

    @validator('duration_minutes', pre=True, always=True)
    def _map_duration_minutes(cls, v, values):
        if (v is None) and ('duration' in values) and (values['duration'] is not None):
            return values['duration']
        return v

class AppointmentUpdate(BaseModel):
    """Enhanced schema for updating appointments."""
    appointment_date: Optional[date] = None
    appointment_time: Optional[time] = None
    appointment_type: Optional[AppointmentType] = None
    duration_minutes: Optional[int] = Field(None, ge=15, le=480)
    notes: Optional[str] = Field(None, max_length=1000)
    priority: Optional[Priority] = None
    status: Optional[AppointmentStatus] = None
    reason_code: Optional[FHIRCodeableConcept] = None
    special_instructions: Optional[str] = Field(None, max_length=500)
    location_id: Optional[str] = None
    
    # Compatibility aliases
    doctor_id: Optional[str] = None
    duration: Optional[int] = None
    
    @validator('doctor_id', pre=True, always=True)
    def _map_doctor_to_practitioner_update(cls, v, values):
        if v and not values.get('practitioner_id'):
            values['practitioner_id'] = v
        return v

    @validator('duration_minutes', pre=True, always=True)
    def _map_duration_minutes_update(cls, v, values):
        if (v is None) and ('duration' in values) and (values['duration'] is not None):
            return values['duration']
        return v

class AppointmentStatusUpdate(BaseModel):
    """Enhanced schema for status-only updates."""
    status: AppointmentStatus
    reason: Optional[str] = Field(None, max_length=500, description="Reason for status change")
    updated_by: str = Field(..., description="User who updated the status")
    notes: Optional[str] = Field(None, max_length=500, description="Additional notes")

# ============================= Enhanced Complete Appointment Model =============================

class Appointment(AppointmentBase):
    """Enhanced complete appointment model with all fields."""
    id: str = Field(..., description="Appointment ID")
    status: AppointmentStatus = AppointmentStatus.PROPOSED
    
    # Patient and practitioner information (denormalized for performance)
    patient_name: str = Field(..., description="Patient full name")
    practitioner_name: str = Field(..., description="Practitioner full name")
    location_name: Optional[str] = Field(None, description="Location name")
    
    # Scheduling information
    created_by: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    
    # Reminders and notifications
    reminder_sent: bool = False
    reminder_sent_at: Optional[datetime] = None
    
    # Additional metadata
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    actual_duration_minutes: Optional[int] = None
    
    # Room and resource allocation
    room_number: Optional[str] = None
    equipment_needed: Optional[List[str]] = Field(default_factory=list)
    
    # Follow-up information
    follow_up_needed: bool = False
    follow_up_date: Optional[date] = None
    follow_up_notes: Optional[str] = None
    
    # FHIR participants
    participants: Optional[List[Dict[str, Any]]] = Field(None, description="FHIR participants")
    
    # Recurring appointment information
    is_recurring: bool = False
    recurrence_type: RecurrenceType = RecurrenceType.NONE
    parent_appointment_id: Optional[str] = None
    recurrence_sequence: Optional[int] = None

# ============================= Enhanced Frontend Compatibility Models =============================

class AppointmentDTO(BaseModel):
    """Enhanced frontend-compatible appointment model."""
    id: str
    date: str  # YYYY-MM-DD format
    time: str  # HH:MM format
    patient: str  # Patient name
    practitioner: str  # Practitioner name
    problem: Optional[str] = None  # Appointment type/reason
    description: Optional[str] = None  # Notes
    provider: str  # Practitioner name (legacy field)
    formattedDate: str  # DD.MM.YYYY format for UI
    status: str  # Status as string
    priority: str  # Priority as string
    
    # Enhanced fields for surgical edits
    patient_id: Optional[str] = None
    practitioner_id: Optional[str] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    appointment_type: Optional[str] = None
    notes: Optional[str] = None
    clinic_id: Optional[str] = None
    fhir_id: Optional[str] = None
    duration_minutes: Optional[int] = None
    location_name: Optional[str] = None
    room_number: Optional[str] = None
    
    @classmethod
    def from_appointment(cls, appointment: Appointment) -> "AppointmentDTO":
        """Convert enhanced Appointment to frontend DTO format."""
        # Extract time from appointment_date (DateTime field)
        appointment_time_str = ""
        if appointment.appointment_date:
            appointment_time_str = appointment.appointment_date.strftime("%H:%M")
        
        return cls(
            id=appointment.id,
            date=appointment.appointment_date.isoformat() if appointment.appointment_date else "",
            time=appointment_time_str,
            patient=appointment.patient_name if hasattr(appointment, 'patient_name') else "",
            practitioner=appointment.practitioner_name if hasattr(appointment, 'practitioner_name') else "",
            problem=appointment.appointment_type.value if hasattr(appointment, 'appointment_type') and hasattr(appointment.appointment_type, 'value') else (appointment.appointment_type if hasattr(appointment, 'appointment_type') else ""),
            description=appointment.notes if hasattr(appointment, 'notes') else "",
            provider=appointment.practitioner_name if hasattr(appointment, 'practitioner_name') else "",
            formattedDate=appointment.appointment_date.strftime("%d.%m.%Y") if appointment.appointment_date else "",
            status=appointment.status.value if hasattr(appointment, 'status') and hasattr(appointment.status, 'value') else (appointment.status if hasattr(appointment, 'status') else ""),
            priority=appointment.priority.value if hasattr(appointment, 'priority') and hasattr(appointment.priority, 'value') else (appointment.priority if hasattr(appointment, 'priority') else ""),
            patient_id=appointment.patient_id if hasattr(appointment, 'patient_id') else "",
            practitioner_id=appointment.practitioner_id if hasattr(appointment, 'practitioner_id') else "",
            appointment_date=appointment.appointment_date.isoformat() if appointment.appointment_date else "",
            appointment_time=appointment_time_str,
            appointment_type=appointment.appointment_type.value if hasattr(appointment, 'appointment_type') and hasattr(appointment.appointment_type, 'value') else (appointment.appointment_type if hasattr(appointment, 'appointment_type') else ""),
            notes=appointment.notes if hasattr(appointment, 'notes') else "",
            clinic_id=appointment.clinic_id if hasattr(appointment, 'clinic_id') else "",
            fhir_id=appointment.fhir_id if hasattr(appointment, 'fhir_id') else "",
            duration_minutes=appointment.duration_minutes if hasattr(appointment, 'duration_minutes') else 30,
            location_name=appointment.location_name if hasattr(appointment, 'location_name') else "",
            room_number=appointment.room_number if hasattr(appointment, 'room_number') else ""
        )

# ============================= Enhanced Recurring Appointments =============================

class RecurringAppointment(BaseModel):
    """Enhanced recurring appointment configuration."""
    base_appointment_id: str
    recurrence_type: RecurrenceType
    recurrence_interval: int = Field(1, ge=1, description="Interval between recurrences")
    end_date: Optional[date] = None
    max_occurrences: Optional[int] = Field(None, ge=1, le=100)
    days_of_week: Optional[List[int]] = Field(None, description="Days of week (0=Monday)")
    clinic_id: str
    
    @validator('days_of_week')
    def validate_days_of_week(cls, v):
        if v:
            for day in v:
                if day < 0 or day > 6:
                    raise ValueError('Days of week must be between 0 (Monday) and 6 (Sunday)')
        return v

class RecurringAppointmentCreate(AppointmentCreate):
    """Enhanced recurring appointment creation."""
    recurrence_type: RecurrenceType = RecurrenceType.WEEKLY
    recurrence_interval: int = Field(1, ge=1, le=12)
    recurrence_end_date: Optional[date] = None
    max_occurrences: Optional[int] = Field(None, ge=1, le=100)
    days_of_week: Optional[List[int]] = Field(None, description="Days of week (0=Monday)")

# ============================= Enhanced Appointment Slots and Availability =============================

class TimeSlot(BaseModel):
    """Enhanced available time slot."""
    start_time: time
    end_time: time
    is_available: bool = True
    appointment_id: Optional[str] = None  # If booked
    slot_type: str = Field("standard", pattern=r'^(standard|emergency|telemedicine)$')
    location_id: Optional[str] = None
    room_number: Optional[str] = None

class DaySchedule(BaseModel):
    """Enhanced doctor's schedule for a specific day."""
    date: date
    practitioner_id: str
    practitioner_name: str
    working_hours_start: time
    working_hours_end: time
    lunch_break_start: Optional[time] = None
    lunch_break_end: Optional[time] = None
    slots: List[TimeSlot]
    total_slots: int
    available_slots: int
    booked_slots: int
    clinic_id: str
    location_id: Optional[str] = None

class AvailabilityRequest(BaseModel):
    """Enhanced request for checking appointment availability."""
    practitioner_id: str
    start_date: date
    end_date: date
    appointment_type: Optional[AppointmentType] = None
    duration_minutes: int = 30
    clinic_id: str
    location_id: Optional[str] = None
    include_emergency_slots: bool = False

class AvailabilitySlot(BaseModel):
    """Enhanced availability slot."""
    date: date
    time: time
    duration_minutes: int
    practitioner_id: str
    practitioner_name: str
    location_id: Optional[str] = None
    location_name: Optional[str] = None
    room_number: Optional[str] = None
    slot_type: str = Field("standard", pattern=r'^(standard|emergency|telemedicine)$')
    is_available: bool = True

# ============================= Enhanced Appointment Search and Filtering =============================

class AppointmentFilter(BaseModel):
    """Enhanced appointment filtering parameters."""
    status: Optional[AppointmentStatus] = None
    appointment_type: Optional[AppointmentType] = None
    patient_id: Optional[str] = None
    practitioner_id: Optional[str] = None
    clinic_id: Optional[str] = None
    location_id: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    priority: Optional[Priority] = None
    
    @validator('date_to')
    def validate_date_range(cls, v, values):
        if v and values.get('date_from') and v < values['date_from']:
            raise ValueError('End date must be after start date')
        return v

class AppointmentSearchFilter(AppointmentFilter):
    """Enhanced search filter with text search."""
    query: Optional[str] = Field(None, min_length=2, max_length=100, description="Search in patient name, notes, type")
    include_cancelled: bool = False
    sort_by: str = Field("appointment_date", description="Sort field")
    sort_order: str = Field("asc", pattern=r'^(asc|desc)$')
    time_range: Optional[str] = Field(None, pattern=r'^(today|tomorrow|this_week|next_week|this_month|next_month)$')

# ============================= Enhanced Appointment Statistics and Reports =============================

class AppointmentStats(BaseModel):
    """Enhanced appointment statistics."""
    total_appointments: int = 0
    pending_appointments: int = 0
    upcoming_appointments: int = 0
    completed_appointments: int = 0
    cancelled_appointments: int = 0
    no_show_appointments: int = 0
    today_appointments: int = 0
    this_week_appointments: int = 0
    this_month_appointments: int = 0
    clinic_id: str
    practitioner_id: Optional[str] = None
    average_appointment_duration: float = 0.0
    patient_satisfaction_rating: Optional[float] = None
    on_time_percentage: float = 0.0

class DoctorAppointmentStats(AppointmentStats):
    """Enhanced doctor-specific appointment statistics."""
    doctor_id: str
    doctor_name: str
    specialization: Optional[str] = None
    total_patients: int = 0
    new_patients: int = 0
    returning_patients: int = 0
    average_wait_time: float = 0.0
    revenue_generated: Optional[float] = None

class AppointmentSummary(BaseModel):
    """Enhanced daily appointment summary."""
    date: date
    practitioner_id: str
    practitioner_name: str
    clinic_id: str
    total_scheduled: int = 0
    completed: int = 0
    cancelled: int = 0
    no_shows: int = 0
    average_duration: float = 0.0
    first_appointment: Optional[time] = None
    last_appointment: Optional[time] = None
    revenue: Optional[float] = None

# ============================= Enhanced Reminder and Notification Models =============================

class AppointmentReminder(BaseModel):
    """Enhanced appointment reminder configuration."""
    appointment_id: str
    reminder_type: str = Field(..., pattern=r'^(email|sms|push|call|whatsapp)$')
    reminder_time_minutes: int = Field(..., ge=15, le=1440)
    message_template: Optional[str] = None
    is_sent: bool = False
    sent_at: Optional[datetime] = None
    delivery_status: Optional[str] = None
    clinic_id: str
    patient_id: str
    practitioner_id: str

class BulkReminderRequest(BaseModel):
    """Enhanced bulk reminder sending request."""
    date_from: date
    date_to: date
    reminder_type: str = Field(..., pattern=r'^(email|sms|push|call|whatsapp)$')
    hours_before: int = Field(24, ge=1, le=168)
    practitioner_ids: Optional[List[str]] = None
    clinic_id: str
    appointment_types: Optional[List[AppointmentType]] = None
    exclude_cancelled: bool = True

# ============================= Enhanced Response Models =============================

class AppointmentResponse(BaseModel):
    """Enhanced single appointment response."""
    appointment: Appointment
    patient_info: Optional[Dict[str, Any]] = None
    practitioner_info: Optional[Dict[str, Any]] = None
    location_info: Optional[Dict[str, Any]] = None
    related_appointments: Optional[List[Appointment]] = None
    reminders: Optional[List[AppointmentReminder]] = None

class AppointmentListResponse(BaseModel):
    """Enhanced appointment list response."""
    appointments: List[Appointment]
    total: int
    page: int
    size: int
    filters_applied: Optional[AppointmentFilter] = None
    stats: Optional[AppointmentStats] = None
    clinic_id: str

class AvailabilityResponse(BaseModel):
    """Enhanced availability check response."""
    available_slots: List[DaySchedule]
    practitioner_id: str
    practitioner_name: str
    date_range: Dict[str, date]
    total_available_slots: int
    clinic_id: str
    location_id: Optional[str] = None

class AppointmentConflictResponse(BaseModel):
    """Enhanced appointment conflict check response."""
    has_conflict: bool
    conflicting_appointments: List[Appointment] = Field(default_factory=list)
    suggested_times: List[Dict[str, Any]] = Field(default_factory=list)
    conflict_reasons: List[str] = Field(default_factory=list)

# ============================= Enhanced FHIR Integration Models =============================

class FHIRAppointmentMapping(BaseModel):
    """Enhanced FHIR Appointment resource mapping."""
    fhir_id: str
    local_appointment_id: str
    fhir_status: str  # FHIR status values
    local_status: AppointmentStatus
    last_sync: datetime
    sync_status: str = Field("synced", pattern=r'^(synced|pending|failed|conflict)$')
    clinic_id: str
    sync_errors: Optional[List[str]] = None

class AppointmentParticipant(BaseModel):
    """Enhanced FHIR Appointment participant."""
    actor_reference: str  # Patient/{id} or Practitioner/{id}
    actor_type: str = Field(..., pattern=r'^(patient|practitioner|location|device)$')
    required: bool = True
    status: AppointmentParticipantStatus = AppointmentParticipantStatus.ACCEPTED
    period: Optional[FHIRPeriod] = None

# ============================= Enhanced Appointment Workflow Models =============================

class AppointmentWorkflow(BaseModel):
    """Enhanced appointment workflow state."""
    appointment_id: str
    current_step: str
    workflow_steps: List[str] = Field(default_factory=lambda: [
        "scheduled", "confirmed", "checked_in", "in_progress", "completed", "checked_out"
    ])
    completed_steps: List[str] = Field(default_factory=list)
    step_timestamps: Dict[str, datetime] = Field(default_factory=dict)
    clinic_id: str
    practitioner_id: str
    patient_id: str

class WorkflowStepUpdate(BaseModel):
    """Enhanced workflow step update."""
    appointment_id: str
    step: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None
    updated_by: str
    clinic_id: str
    metadata: Optional[Dict[str, Any]] = None

# ============================= Enhanced Integration Models =============================

class AppointmentWithDetails(Appointment):
    """Enhanced appointment with full related information."""
    patient_details: Optional[Dict[str, Any]] = None
    practitioner_details: Optional[Dict[str, Any]] = None
    location_details: Optional[Dict[str, Any]] = None
    medical_records: Optional[List[Dict[str, Any]]] = None
    prescriptions: Optional[List[Dict[str, Any]]] = None
    reports: Optional[List[Dict[str, Any]]] = None
    vitals: Optional[Dict[str, Any]] = None
    reminders: Optional[List[AppointmentReminder]] = None

class AppointmentBulkUpdateRequest(BaseModel):
    """Enhanced appointment bulk update request."""
    appointment_ids: List[str]
    updates: Dict[str, Any]
    clinic_id: str
    reason: str
    notify_patients: bool = False
    notify_practitioners: bool = False
    send_reminders: bool = False

class AppointmentExportRequest(BaseModel):
    """Enhanced appointment export request."""
    appointment_ids: Optional[List[str]] = None
    clinic_id: Optional[str] = None
    practitioner_id: Optional[str] = None
    date_range: Optional[Dict[str, date]] = None
    export_format: str = Field("json", pattern=r'^(json|csv|xml|fhir)$')
    include_patient_details: bool = False
    include_practitioner_details: bool = False
    include_medical_records: bool = False
