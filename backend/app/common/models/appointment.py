# app/common/models/appointment.py
"""Consolidated appointment and encounter models for the EHR system."""
from sqlalchemy import Column, String, Boolean, DateTime, Date, Time, Integer, Text, ForeignKey, Enum, JSON, Float, UUID
from sqlalchemy.orm import relationship
from sqlalchemy import String
from sqlalchemy.sql import func
import uuid
import enum

from app.db.base_class import Base
from app.common.utils.types import GUID


class AppointmentStatus(str, enum.Enum):
    PROPOSED = "proposed"
    PENDING = "pending"
    BOOKED = "booked"
    ARRIVED = "arrived"
    CHECKED_IN = "checked_in"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    WAITLIST = "waitlist"
    RESCHEDULED = "rescheduled"


class AppointmentType(str, enum.Enum):
    GENERAL_CONSULTATION = "general_consultation"
    FOLLOW_UP = "follow_up"
    ANNUAL_CHECK_UP = "annual_check_up"
    ROUTINE_CHECKUP = "routine_checkup"
    EMERGENCY = "emergency"
    SPECIALIST = "specialist"
    SPECIALIST_CONSULTATION = "specialist_consultation"
    THERAPY = "therapy"
    DIAGNOSTIC = "diagnostic"
    PROCEDURE = "procedure"
    VACCINATION = "vaccination"
    TELEMEDICINE = "telemedicine"
    HOME_VISIT = "home_visit"
    GROUP_SESSION = "group_session"


class AppointmentPriority(str, enum.Enum):
    ROUTINE = "routine"
    URGENT = "urgent"
    ASAP = "asap"
    EMERGENCY = "emergency"
    STAT = "stat"


class EncounterStatus(str, enum.Enum):
    PLANNED = "planned"
    ARRIVED = "arrived"
    TRIAGED = "triaged"
    IN_PROGRESS = "in_progress"
    ON_LEAVE = "on_leave"
    FINISHED = "finished"
    CANCELLED = "cancelled"
    ENTERED_IN_ERROR = "entered_in_error"


class EncounterClass(str, enum.Enum):
    AMBULATORY = "ambulatory"
    EMERGENCY = "emergency"
    INPATIENT = "inpatient"
    OUTPATIENT = "outpatient"
    OBSERVATION = "observation"
    VIRTUAL = "virtual"
    HOME = "home"


class ParticipantType(str, enum.Enum):
    PRIMARY_PERFORMER = "primary_performer"
    SECONDARY_PERFORMER = "secondary_performer"
    CONSULTANT = "consultant"
    REFERRER = "referrer"
    ASSISTANT = "assistant"
    EMERGENCY_CONTACT = "emergency_contact"
    TRANSLATOR = "translator"


class Appointment(Base):
    """Appointment model matching actual database schema."""
    __tablename__ = "appointments"
    __table_args__ = {"schema": "ehr"}
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Core relationships - matching actual database schema
    patient_id = Column(UUID(as_uuid=True), ForeignKey("ehr.patients.patient_id"), nullable=False)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("ehr.doctors.id"), nullable=False)
    hospital_id = Column(UUID(as_uuid=True), ForeignKey("ref.hospitals.id"), nullable=False)
    
    # Scheduling - matching actual database schema
    appointment_date = Column(DateTime(timezone=True), nullable=False, index=True)
    duration_minutes = Column(Integer, nullable=False)
    
    # Type and status - matching actual database schema
    status = Column(String(50), nullable=False)
    appointment_type = Column(String(50), nullable=False)
    
    # Clinical information - matching actual database schema
    reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Timestamps - matching actual database schema
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships - only those that exist in actual database
    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    hospital = relationship("Hospital", foreign_keys=[hospital_id])
    medical_record = relationship("MedicalRecord", back_populates="appointment", uselist=False)
    participants = relationship("AppointmentParticipant", back_populates="appointment", cascade="all, delete-orphan")
    encounter = relationship("Encounter", back_populates="appointment", uselist=False)
    general_reports = relationship("GeneralReport", back_populates="encounter", cascade="all, delete-orphan")
    reminders = relationship("AppointmentReminder", back_populates="appointment", cascade="all, delete-orphan")


class AppointmentParticipant(Base):
    """Participants in an appointment beyond patient and primary doctor."""
    __tablename__ = "appointment_participants"
    __table_args__ = {"schema": "ehr"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    appointment_id = Column(String(36), ForeignKey("ehr.appointments.id"), nullable=False)
    
    # Participant
    participant_type = Column(Enum(ParticipantType, native_enum=False), nullable=False)
    user_id = Column(String(36), ForeignKey("core.users.id"), nullable=True)
    external_participant_name = Column(String(200), nullable=True)  # For non-system users
    external_participant_contact = Column(String(100), nullable=True)
    
    # Status
    required = Column(Boolean, default=True)
    status = Column(String(20), default="needs-action")  # needs-action, accepted, declined, tentative
    
    # Period (if different from appointment)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    appointment = relationship("Appointment", back_populates="participants")
    user = relationship("User")


class Encounter(Base):
    """Patient encounter/visit - converted from FHIR Encounter."""
    __tablename__ = "encounters"
    __table_args__ = {"schema": "ehr"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # FHIR references
    fhir_encounter_id = Column(String(255), unique=True, nullable=True)
    identifiers = Column(JSON, nullable=True)  # Array of identifiers
    
    # Core relationships
    appointment_id = Column(String(36), ForeignKey("ehr.appointments.id"), nullable=True)
    patient_id = Column(String(36), ForeignKey("ehr.patients.patient_id"), nullable=False)
    
    # Status
    status = Column(Enum(EncounterStatus, native_enum=False), nullable=False)
    status_history = Column(JSON, nullable=True)  # Array of {status, period}
    
    # Classification
    encounter_class = Column(Enum(EncounterClass, native_enum=False), nullable=False)
    class_history = Column(JSON, nullable=True)  # Array of {class, period}
    
    # Type and priority
    encounter_type = Column(JSON, nullable=True)  # Array of CodeableConcept
    service_type = Column(JSON, nullable=True)  # CodeableConcept
    priority = Column(JSON, nullable=True)  # CodeableConcept
    
    # Period
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=True)
    length_minutes = Column(Integer, nullable=True)  # Calculated duration
    
    # Reason
    reason_codes = Column(JSON, nullable=True)  # Array of CodeableConcept
    reason_references = Column(JSON, nullable=True)  # References to conditions/procedures
    
    # Episode of care
    episode_of_care_ids = Column(JSON, nullable=True)  # Array of episode references
    
    # Based on
    based_on = Column(JSON, nullable=True)  # Service requests
    
    # Service provider
    service_provider_id = Column(String(36), ForeignKey("ref.hospitals.id"), nullable=False)
    
    # Account
    account_ids = Column(JSON, nullable=True)  # Billing accounts
    
    # Part of
    part_of_encounter_id = Column(String(36), ForeignKey("ehr.encounters.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    appointment = relationship("Appointment", back_populates="encounter")
    patient = relationship("Patient")
    service_provider = relationship("Hospital")
    part_of_encounter = relationship("Encounter", remote_side=[id])
    
    # Clinical relationships
    diagnoses = relationship("EncounterDiagnosis", back_populates="encounter", cascade="all, delete-orphan")
    locations = relationship("EncounterLocation", back_populates="encounter", cascade="all, delete-orphan")
    participants = relationship("EncounterParticipant", back_populates="encounter", cascade="all, delete-orphan")
    hospitalization = relationship("Hospitalization", back_populates="encounter", uselist=False)


class EncounterDiagnosis(Base):
    """Diagnoses relevant to this encounter."""
    __tablename__ = "encounter_diagnoses"
    __table_args__ = {"schema": "ehr"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    encounter_id = Column(String(36), ForeignKey("ehr.encounters.id"), nullable=False)
    
    # Diagnosis
    condition_reference = Column(String(255), nullable=True)  # Reference to condition
    condition_code = Column(JSON, nullable=True)  # CodeableConcept
    
    # Use
    use = Column(JSON, nullable=True)  # CodeableConcept (admission, billing, etc.)
    
    # Rank
    rank = Column(Integer, nullable=True)  # Primary, secondary, etc.
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    encounter = relationship("Encounter", back_populates="diagnoses")


class EncounterLocation(Base):
    """Locations where the patient has been during encounter."""
    __tablename__ = "encounter_locations"
    __table_args__ = {"schema": "ehr"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    encounter_id = Column(String(36), ForeignKey("ehr.encounters.id"), nullable=False)
    
    # Location
    location_id = Column(String(36), ForeignKey("ref.hospital_departments.id"), nullable=False)
    
    # Status
    status = Column(String(20), nullable=True)  # planned, active, reserved, completed
    
    # Physical type
    physical_type = Column(JSON, nullable=True)  # CodeableConcept (bed, room, etc.)
    
    # Period
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    encounter = relationship("Encounter", back_populates="locations")
    location = relationship("HospitalDepartment")


class EncounterParticipant(Base):
    """Participants involved in the encounter."""
    __tablename__ = "encounter_participants"
    __table_args__ = {"schema": "ehr"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    encounter_id = Column(String(36), ForeignKey("ehr.encounters.id"), nullable=False)
    
    # Participant
    participant_type = Column(JSON, nullable=True)  # Array of CodeableConcept
    individual_id = Column(String(36), ForeignKey("core.users.id"), nullable=True)
    
    # Period
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    encounter = relationship("Encounter", back_populates="participants")
    individual = relationship("User")


class Hospitalization(Base):
    """Hospitalization details for inpatient encounters."""
    __tablename__ = "hospitalizations"
    __table_args__ = {"schema": "ref"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    encounter_id = Column(String(36), ForeignKey("ehr.encounters.id"), unique=True, nullable=False)
    
    # Pre-admission
    pre_admission_identifier = Column(JSON, nullable=True)  # Identifier
    origin_location_id = Column(String(36), nullable=True)  # Where patient came from
    
    # Admission
    admit_source = Column(JSON, nullable=True)  # CodeableConcept
    re_admission = Column(JSON, nullable=True)  # CodeableConcept
    diet_preference = Column(JSON, nullable=True)  # Array of CodeableConcept
    special_courtesy = Column(JSON, nullable=True)  # Array of CodeableConcept (VIP, etc.)
    special_arrangement = Column(JSON, nullable=True)  # Array of CodeableConcept (wheelchair, interpreter)
    
    # Discharge
    destination_location_id = Column(String(36), nullable=True)  # Where patient was discharged to
    discharge_disposition = Column(JSON, nullable=True)  # CodeableConcept
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    encounter = relationship("Encounter", back_populates="hospitalization")


class AppointmentReminder(Base):
    """Appointment reminder tracking."""
    __tablename__ = "appointment_reminders"
    __table_args__ = {"schema": "ehr"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    appointment_id = Column(String(36), ForeignKey("ehr.appointments.id"), nullable=False)
    
    # Reminder details
    reminder_type = Column(String(20), nullable=False)  # email, sms, push, call
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    
    # Status
    sent = Column(Boolean, default=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    delivered = Column(Boolean, default=False)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    
    # Response
    response_received = Column(Boolean, default=False)
    response_type = Column(String(20), nullable=True)  # confirmed, cancelled, rescheduled
    response_received_at = Column(DateTime(timezone=True), nullable=True)
    
    # Error tracking
    failed = Column(Boolean, default=False)
    failure_reason = Column(String(500), nullable=True)
    retry_count = Column(Integer, default=0)
    
    # Content
    message_content = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    appointment = relationship("Appointment", back_populates="reminders")


class DoctorSchedule(Base):
    """Doctor availability schedule."""
    __tablename__ = "doctor_schedules"
    __table_args__ = {"schema": "ehr"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    doctor_id = Column(String(36), ForeignKey("ehr.doctors.id"), nullable=False)
    
    # Schedule type
    is_recurring = Column(Boolean, default=True)
    
    # For recurring schedules
    day_of_week = Column(Integer, nullable=True)  # 0=Monday, 6=Sunday
    
    # Time slots
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    
    # For specific dates
    specific_date = Column(Date, nullable=True, index=True)
    
    # Breaks
    break_start = Column(Time, nullable=True)
    break_end = Column(Time, nullable=True)
    
    # Location
    location_id = Column(String(36), ForeignKey("ref.hospital_departments.id"), nullable=True)
    room_number = Column(String(20), nullable=True)
    
    # Consultation settings
    slot_duration = Column(Integer, default=30)  # minutes
    buffer_time = Column(Integer, default=10)  # minutes between appointments
    max_appointments = Column(Integer, nullable=True)
    
    # Appointment types allowed
    allowed_appointment_types = Column(JSON, nullable=True)  # Array of appointment types
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Valid period
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    doctor = relationship("Doctor")
    location = relationship("HospitalDepartment")
    blocked_slots = relationship("BlockedTimeSlot", back_populates="schedule", cascade="all, delete-orphan")


class BlockedTimeSlot(Base):
    """Blocked time slots for doctors."""
    __tablename__ = "blocked_time_slots"
    __table_args__ = {"schema": "ops"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    doctor_id = Column(String(36), ForeignKey("ehr.doctors.id"), nullable=False)
    schedule_id = Column(String(36), ForeignKey("ehr.doctor_schedules.id"), nullable=True)
    
    # Time range
    start_datetime = Column(DateTime(timezone=True), nullable=False)
    end_datetime = Column(DateTime(timezone=True), nullable=False)
    
    # Reason
    reason = Column(String(200), nullable=False)
    block_type = Column(String(50), nullable=False)  # vacation, meeting, lunch, training, personal
    description = Column(Text, nullable=True)
    
    # Recurrence
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(JSON, nullable=True)  # RRULE or custom pattern
    recurrence_end_date = Column(Date, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_by = Column(String(36), ForeignKey("core.users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    doctor = relationship("Doctor")
    schedule = relationship("DoctorSchedule", back_populates="blocked_slots")
    creator = relationship("User")