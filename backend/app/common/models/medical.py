# app/common/models/medical_record.py
"""Consolidated medical record models for the EHR system."""
from sqlalchemy import Column, String, Date, DateTime, Text, ForeignKey, Boolean, Integer, Float, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy import String
from sqlalchemy.sql import func
import uuid
import enum

from app.db.base_class import Base


class RecordType(str, enum.Enum):
    CONSULTATION = "consultation"
    FOLLOW_UP = "follow_up"
    EMERGENCY = "emergency"
    SURGERY = "surgery"
    PROCEDURE = "procedure"
    DIAGNOSTIC = "diagnostic"
    PREVENTIVE = "preventive"
    SPECIALIST = "specialist"
    THERAPY = "therapy"


class RecordStatus(str, enum.Enum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    FINAL = "final"
    AMENDED = "amended"
    ENTERED_IN_ERROR = "entered_in_error"
    CANCELLED = "cancelled"


class DocumentStatus(str, enum.Enum):
    CURRENT = "current"
    SUPERSEDED = "superseded"
    ENTERED_IN_ERROR = "entered_in_error"


class DocumentType(str, enum.Enum):
    CLINICAL_NOTE = "clinical_note"
    DISCHARGE_SUMMARY = "discharge_summary"
    OPERATIVE_NOTE = "operative_note"
    PROGRESS_NOTE = "progress_note"
    CONSULTATION_NOTE = "consultation_note"
    LAB_REPORT = "lab_report"
    IMAGING_REPORT = "imaging_report"
    PATHOLOGY_REPORT = "pathology_report"
    REFERRAL = "referral"
    PRESCRIPTION = "prescription"


class ClinicalImpressionStatus(str, enum.Enum):
    PREPARATION = "preparation"
    IN_PROGRESS = "in_progress"
    NOT_DONE = "not_done"
    ON_HOLD = "on_hold"
    STOPPED = "stopped"
    COMPLETED = "completed"
    ENTERED_IN_ERROR = "entered_in_error"


class MedicalRecord(Base):
    """Comprehensive medical record model - merged with FHIR concepts."""
    __tablename__ = "medical_records"
    __table_args__ = {"schema": "ehr"}

    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # FHIR references
    fhir_encounter_id = Column(String(255), unique=True, nullable=True)
    fhir_composition_id = Column(String(255), unique=True, nullable=True)
    
    # Core relationships
    patient_id = Column(String(36), ForeignKey("ehr.patients.patient_id"), nullable=False)
    doctor_id = Column(String(36), ForeignKey("ehr.doctors.id"), nullable=False)
    hospital_id = Column(String(36), ForeignKey("ref.hospitals.id"), nullable=False)
    appointment_id = Column(String(36), ForeignKey("ehr.appointments.id"), nullable=True)
    
    # Record metadata
    record_number = Column(String(50), unique=True, nullable=False, index=True)
    record_date = Column(DateTime(timezone=True), nullable=False)
    record_type = Column(Enum(RecordType, native_enum=False), nullable=False)
    status = Column(Enum(RecordStatus, native_enum=False), default=RecordStatus.DRAFT)
    
    # Clinical content - structured
    chief_complaint = Column(Text, nullable=True)
    history_of_present_illness = Column(Text, nullable=True)
    past_medical_history = Column(Text, nullable=True)
    family_history = Column(Text, nullable=True)
    social_history = Column(Text, nullable=True)
    review_of_systems = Column(JSON, nullable=True)  # Structured ROS
    
    # Physical examination
    physical_examination = Column(JSON, nullable=True)  # Structured exam findings
    vital_signs_id = Column(String(36), ForeignKey("ehr.vital_signs.id"), nullable=True)
    
    # Assessment and diagnosis
    clinical_impression = Column(Text, nullable=True)
    differential_diagnosis = Column(JSON, nullable=True)  # Array of possible diagnoses
    primary_diagnosis = Column(Text, nullable=True)
    diagnosis_codes = Column(JSON, nullable=True)  # Array of {code, system, display}
    
    # Plan
    treatment_plan = Column(Text, nullable=True)
    medications_prescribed = Column(JSON, nullable=True)  # Array of medication orders
    procedures_ordered = Column(JSON, nullable=True)  # Array of procedure orders
    follow_up_instructions = Column(Text, nullable=True)
    
    # Additional sections
    allergies_reviewed = Column(Boolean, default=False)
    medications_reviewed = Column(Boolean, default=False)
    problems_reviewed = Column(Boolean, default=False)
    
    # Summary
    summary = Column(Text, nullable=True)
    
    # Metadata
    is_sensitive = Column(Boolean, default=False)
    sensitivity_reason = Column(String(200), nullable=True)
    
    # Workflow
    created_by = Column(String(36), ForeignKey("core.users.id"), nullable=False)
    signed_by = Column(String(36), ForeignKey("core.users.id"), nullable=True)
    signed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(String(36), ForeignKey("core.users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="medical_records")
    doctor = relationship("Doctor", back_populates="medical_records")
    # hospital = relationship("Hospital", back_populates="medical_records")  # Commented out to avoid circular dependency
    appointment = relationship("Appointment", back_populates="medical_record", uselist=False)
    vital_signs = relationship(
        "VitalSign",
        back_populates="medical_record",
        uselist=False,
        foreign_keys="VitalSign.medical_record_id"
    )
    creator = relationship("User", foreign_keys=[created_by])
    
    # Related records
    documents = relationship("DocumentReference", back_populates="medical_record", cascade="all, delete-orphan")
    clinical_impressions = relationship("ClinicalImpression", back_populates="medical_record", cascade="all, delete-orphan")
    care_plans = relationship("CarePlan", back_populates="medical_record", cascade="all, delete-orphan")
    lab_results = relationship("LabResult", back_populates="medical_record", cascade="all, delete-orphan")


class DocumentReference(Base):
    """Clinical documents - converted from FHIR DocumentReference."""
    __tablename__ = "document_references"
    __table_args__ = {"schema": "ehr"}

    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # FHIR reference
    fhir_document_reference_id = Column(String(255), unique=True, nullable=True)
    master_identifier = Column(JSON, nullable=True)  # Identifier object
    identifiers = Column(JSON, nullable=True)  # Array of identifiers
    
    # Core relationships
    medical_record_id = Column(String(36), ForeignKey("ehr.medical_records.id"), nullable=True)
    patient_id = Column(String(36), ForeignKey("ehr.patients.patient_id"), nullable=False)
    
    # Document metadata
    status = Column(Enum(DocumentStatus, native_enum=False), default=DocumentStatus.CURRENT, nullable=False)
    doc_status = Column(String(20), nullable=True)  # preliminary, final, amended, entered-in-error
    type = Column(Enum(DocumentType, native_enum=False), nullable=False)
    category = Column(JSON, nullable=True)  # Array of CodeableConcept
    
    # Document info
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    date = Column(DateTime(timezone=True), nullable=False)
    
    # Authors and authentication
    authors = Column(JSON, nullable=True)  # Array of practitioner references
    authenticator_id = Column(String(36), ForeignKey("core.users.id"), nullable=True)
    custodian_id = Column(String(36), ForeignKey("ref.hospitals.id"), nullable=True)
    
    # Content
    content = Column(JSON, nullable=False)  # Array of {attachment, format}
    
    # Context
    encounter_id = Column(String(36), ForeignKey("ehr.appointments.id"), nullable=True)
    event = Column(JSON, nullable=True)  # Array of events
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)
    facility_type = Column(JSON, nullable=True)  # CodeableConcept
    practice_setting = Column(JSON, nullable=True)  # CodeableConcept
    source_patient_info = Column(JSON, nullable=True)  # Reference to source
    
    # Related documents
    related_documents = Column(JSON, nullable=True)  # Array of {code, target}
    
    # Security
    security_labels = Column(JSON, nullable=True)  # Array of security labels
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    medical_record = relationship("MedicalRecord", back_populates="documents")
    patient = relationship("Patient")
    authenticator = relationship("User", foreign_keys=[authenticator_id])
    custodian = relationship("Hospital")
    encounter = relationship("Appointment")


class ClinicalImpression(Base):
    """Clinical assessment and summary - converted from FHIR."""
    __tablename__ = "clinical_impressions"
    __table_args__ = {"schema": "ehr"}

    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # FHIR reference
    fhir_clinical_impression_id = Column(String(255), unique=True, nullable=True)
    identifiers = Column(JSON, nullable=True)  # Array of identifiers
    
    # Core relationships
    medical_record_id = Column(String(36), ForeignKey("ehr.medical_records.id"), nullable=True)
    patient_id = Column(String(36), ForeignKey("ehr.patients.patient_id"), nullable=False)
    encounter_id = Column(String(36), ForeignKey("ehr.appointments.id"), nullable=True)
    assessor_id = Column(String(36), ForeignKey("core.users.id"), nullable=False)
    
    # Assessment metadata
    status = Column(Enum(ClinicalImpressionStatus, native_enum=False), nullable=False)
    status_reason = Column(JSON, nullable=True)  # CodeableConcept
    code = Column(JSON, nullable=True)  # CodeableConcept
    description = Column(Text, nullable=True)
    
    # Timing
    effective_date = Column(DateTime(timezone=True), nullable=True)
    effective_period_start = Column(DateTime(timezone=True), nullable=True)
    effective_period_end = Column(DateTime(timezone=True), nullable=True)
    date = Column(DateTime(timezone=True), nullable=False)
    
    # Previous assessment
    previous_id = Column(String(36), ForeignKey("ehr.clinical_impressions.id"), nullable=True)
    
    # Problems/conditions
    problems = Column(JSON, nullable=True)  # Array of condition references
    
    # Investigations
    investigations = Column(JSON, nullable=True)  # Array of {code, item}
    
    # Clinical findings
    summary = Column(Text, nullable=True)
    findings = Column(JSON, nullable=True)  # Array of {itemCodeableConcept, itemReference, basis}
    
    # Prognosis
    prognosis_codeable_concepts = Column(JSON, nullable=True)  # Array of CodeableConcept
    prognosis_references = Column(JSON, nullable=True)  # Array of references
    
    # Supporting information
    supporting_info = Column(JSON, nullable=True)  # Array of references
    protocols = Column(JSON, nullable=True)  # Array of URIs
    
    # Notes
    notes = Column(JSON, nullable=True)  # Array of annotations
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    medical_record = relationship("MedicalRecord", back_populates="clinical_impressions")
    patient = relationship("Patient")
    encounter = relationship("Appointment")
    assessor = relationship("User")
    previous = relationship("ClinicalImpression", remote_side=[id])


class CarePlan(Base):
    """Treatment plans - converted from FHIR CarePlan."""
    __tablename__ = "care_plans"
    __table_args__ = {"schema": "ehr"}

    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # FHIR reference
    fhir_care_plan_id = Column(String(255), unique=True, nullable=True)
    identifiers = Column(JSON, nullable=True)  # Array of identifiers
    
    # Core relationships
    medical_record_id = Column(String(36), ForeignKey("ehr.medical_records.id"), nullable=True)
    patient_id = Column(String(36), ForeignKey("ehr.patients.patient_id"), nullable=False)
    encounter_id = Column(String(36), ForeignKey("ehr.appointments.id"), nullable=True)
    
    # Plan metadata
    status = Column(String(20), nullable=False)  # draft, active, on-hold, revoked, completed, entered-in-error
    intent = Column(String(20), nullable=False)  # proposal, plan, order, option
    
    # Plan details
    title = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    category = Column(JSON, nullable=True)  # Array of CodeableConcept
    
    # Timing
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)
    created = Column(DateTime(timezone=True), nullable=False)
    
    # Authors and contributors
    author_id = Column(String(36), ForeignKey("core.users.id"), nullable=True)
    contributors = Column(JSON, nullable=True)  # Array of practitioner references
    care_team = Column(JSON, nullable=True)  # Array of care team references
    
    # Clinical context
    addresses = Column(JSON, nullable=True)  # Array of condition references
    supporting_info = Column(JSON, nullable=True)  # Array of references
    goals = Column(JSON, nullable=True)  # Array of goal references
    
    # Activities
    activities = Column(JSON, nullable=True)  # Array of planned activities
    
    # Notes
    notes = Column(JSON, nullable=True)  # Array of annotations
    
    # References
    based_on = Column(JSON, nullable=True)  # Array of plan references
    replaces = Column(JSON, nullable=True)  # Array of replaced plan references
    part_of = Column(JSON, nullable=True)  # Array of parent plan references
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    medical_record = relationship("MedicalRecord", back_populates="care_plans")
    patient = relationship("Patient")
    encounter = relationship("Appointment")
    author = relationship("User")


class VitalSign(Base):
    """Patient vital signs measurements."""
    __tablename__ = "vital_signs"
    __table_args__ = {"schema": "ehr"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(String(36), ForeignKey("ehr.patients.patient_id"), nullable=False)
    medical_record_id = Column(String(36), ForeignKey("ehr.medical_records.id"), nullable=True)
    measured_by = Column(String(36), ForeignKey("core.users.id"), nullable=False)
    
    # Vital signs with units
    temperature = Column(Float, nullable=True)  # Celsius
    temperature_method = Column(String(20), nullable=True)  # oral, rectal, axillary, tympanic
    
    blood_pressure_systolic = Column(Integer, nullable=True)  # mmHg
    blood_pressure_diastolic = Column(Integer, nullable=True)  # mmHg
    blood_pressure_position = Column(String(20), nullable=True)  # sitting, standing, lying
    
    heart_rate = Column(Integer, nullable=True)  # bpm
    heart_rhythm = Column(String(50), nullable=True)  # regular, irregular
    
    respiratory_rate = Column(Integer, nullable=True)  # breaths/min
    oxygen_saturation = Column(Integer, nullable=True)  # percentage
    oxygen_flow_rate = Column(Float, nullable=True)  # L/min if on oxygen
    
    # Body measurements
    weight = Column(Float, nullable=True)  # kg
    height = Column(Float, nullable=True)  # cm
    bmi = Column(Float, nullable=True)  # calculated
    head_circumference = Column(Float, nullable=True)  # cm (for pediatrics)
    
    # Additional measurements
    pain_scale = Column(Integer, nullable=True)  # 0-10
    pain_location = Column(String(200), nullable=True)
    blood_glucose = Column(Float, nullable=True)  # mg/dL
    glucose_method = Column(String(50), nullable=True)  # fasting, random, post-meal
    
    # Timing
    measured_at = Column(DateTime(timezone=True), nullable=False)
    
    # Notes
    notes = Column(Text, nullable=True)
    
    # FHIR references
    fhir_observation_ids = Column(JSON, nullable=True)  # Array of observation IDs
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="vital_signs")
    medical_record = relationship(
        "MedicalRecord",
        back_populates="vital_signs",
        foreign_keys=[medical_record_id]
    )
    measurer = relationship("User")


class MedicationAdministration(Base):
    """Medication administrations for patients (nurse workflow)."""
    __tablename__ = "medication_administrations"
    __table_args__ = {"schema": "ehr"}

    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)

    # Core relationships
    patient_id = Column(String(36), ForeignKey("ehr.patients.patient_id"), nullable=False)
    administered_by = Column(String(36), ForeignKey("core.users.id"), nullable=True)

    # Context
    room = Column(String(50), nullable=True)
    date = Column(Date, nullable=False)

    # Medication details
    medication = Column(String(200), nullable=False)
    dosage = Column(String(100), nullable=False)
    frequency = Column(String(100), nullable=True)
    route = Column(String(50), nullable=True)
    time_to_administer = Column(String(10), nullable=False)  # HH:MM

    # Status tracking
    status = Column(String(20), nullable=False)  # pending, due-soon, overdue, given, skipped
    status_time = Column(String(10), nullable=True)
    next_due = Column(String(10), nullable=True)
    administered_at = Column(DateTime(timezone=True), nullable=True)

    # Notes
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    patient = relationship("Patient")
    nurse = relationship("User", foreign_keys=[administered_by])