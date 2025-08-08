# app/common/models/clinical.py
"""Consolidated clinical models for the EHR system."""
from sqlalchemy import Column, String, Date, DateTime, Text, ForeignKey, Boolean, Integer, Float, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy import String
from sqlalchemy.sql import func
import uuid
import enum

from app.db.base_class import Base


# Condition Enums
class ClinicalStatus(str, enum.Enum):
    ACTIVE = "active"
    RECURRENCE = "recurrence"
    RELAPSE = "relapse"
    INACTIVE = "inactive"
    REMISSION = "remission"
    RESOLVED = "resolved"


class VerificationStatus(str, enum.Enum):
    UNCONFIRMED = "unconfirmed"
    PROVISIONAL = "provisional"
    DIFFERENTIAL = "differential"
    CONFIRMED = "confirmed"
    REFUTED = "refuted"
    ENTERED_IN_ERROR = "entered_in_error"


class ConditionCategory(str, enum.Enum):
    PROBLEM_LIST_ITEM = "problem_list_item"
    ENCOUNTER_DIAGNOSIS = "encounter_diagnosis"
    HEALTH_CONCERN = "health_concern"


class Severity(str, enum.Enum):
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"


# Observation Enums
class ObservationStatus(str, enum.Enum):
    REGISTERED = "registered"
    PRELIMINARY = "preliminary"
    FINAL = "final"
    AMENDED = "amended"
    CORRECTED = "corrected"
    CANCELLED = "cancelled"
    ENTERED_IN_ERROR = "entered_in_error"


class ObservationCategory(str, enum.Enum):
    VITAL_SIGNS = "vital_signs"
    LABORATORY = "laboratory"
    IMAGING = "imaging"
    PROCEDURE = "procedure"
    SURVEY = "survey"
    EXAM = "exam"
    THERAPY = "therapy"
    ACTIVITY = "activity"


# Allergy/Intolerance Enums
class AllergyType(str, enum.Enum):
    ALLERGY = "allergy"
    INTOLERANCE = "intolerance"
    FINANCIAL = "financial"
    PREFERENCE = "preference"


class AllergyCategory(str, enum.Enum):
    FOOD = "food"
    MEDICATION = "medication"
    ENVIRONMENT = "environment"
    BIOLOGIC = "biologic"


class AllergyCriticality(str, enum.Enum):
    LOW = "low"
    HIGH = "high"
    UNABLE_TO_ASSESS = "unable_to_assess"


class ReactionSeverity(str, enum.Enum):
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"


# Immunization Enums
class ImmunizationStatus(str, enum.Enum):
    COMPLETED = "completed"
    ENTERED_IN_ERROR = "entered_in_error"
    NOT_DONE = "not_done"


class Condition(Base):
    """Patient conditions/diagnoses - converted from FHIR Condition."""
    __tablename__ = "conditions"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # FHIR references
    fhir_condition_id = Column(String(255), unique=True, nullable=True)
    identifiers = Column(JSON, nullable=True)  # Array of identifiers
    
    # Core relationships
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    encounter_id = Column(String(36), ForeignKey("encounters.id"), nullable=True)
    
    # Status
    clinical_status = Column(Enum(ClinicalStatus), nullable=False)
    verification_status = Column(Enum(VerificationStatus), nullable=False)
    
    # Category and severity
    category = Column(Enum(ConditionCategory), nullable=False)
    severity = Column(Enum(Severity), nullable=True)
    
    # Condition details
    code = Column(JSON, nullable=False)  # CodeableConcept with ICD-10, SNOMED, etc.
    display_name = Column(String(500), nullable=False)
    
    # Body site
    body_sites = Column(JSON, nullable=True)  # Array of CodeableConcept
    
    # Onset
    onset_date = Column(Date, nullable=True)
    onset_age = Column(Integer, nullable=True)  # Age in years when condition started
    onset_period_start = Column(Date, nullable=True)
    onset_period_end = Column(Date, nullable=True)
    onset_string = Column(String(200), nullable=True)  # "childhood", "adult", etc.
    
    # Abatement (resolution)
    abatement_date = Column(Date, nullable=True)
    abatement_age = Column(Integer, nullable=True)
    abatement_period_start = Column(Date, nullable=True)
    abatement_period_end = Column(Date, nullable=True)
    abatement_string = Column(String(200), nullable=True)
    
    # Recording
    recorded_date = Column(DateTime(timezone=True), nullable=False)
    recorder_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    asserter_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # Clinical notes
    notes = Column(JSON, nullable=True)  # Array of annotations
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient")
    encounter = relationship("Encounter")
    recorder = relationship("User", foreign_keys=[recorder_id])
    asserter = relationship("User", foreign_keys=[asserter_id])
    
    # Related clinical data
    stages = relationship("ConditionStage", back_populates="condition", cascade="all, delete-orphan")
    evidence = relationship("ConditionEvidence", back_populates="condition", cascade="all, delete-orphan")


class ConditionStage(Base):
    """Staging information for conditions."""
    __tablename__ = "condition_stages"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    condition_id = Column(String(36), ForeignKey("conditions.id"), nullable=False)
    
    # Stage details
    summary = Column(JSON, nullable=False)  # CodeableConcept
    assessment = Column(JSON, nullable=True)  # References to observations/reports
    type = Column(JSON, nullable=True)  # CodeableConcept for stage type
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    condition = relationship("Condition", back_populates="stages")


class ConditionEvidence(Base):
    """Supporting evidence for conditions."""
    __tablename__ = "condition_evidence"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    condition_id = Column(String(36), ForeignKey("conditions.id"), nullable=False)
    
    # Evidence
    code = Column(JSON, nullable=True)  # CodeableConcept for manifestation
    detail = Column(JSON, nullable=True)  # References to supporting resources
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    condition = relationship("Condition", back_populates="evidence")


class Observation(Base):
    """Clinical observations - converted from FHIR Observation."""
    __tablename__ = "observations"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # FHIR references
    fhir_observation_id = Column(String(255), unique=True, nullable=True)
    identifiers = Column(JSON, nullable=True)  # Array of identifiers
    
    # Core relationships
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    encounter_id = Column(String(36), ForeignKey("encounters.id"), nullable=True)
    
    # Status
    status = Column(Enum(ObservationStatus), nullable=False)
    
    # Category and code
    category = Column(Enum(ObservationCategory), nullable=False)
    code = Column(JSON, nullable=False)  # CodeableConcept (LOINC, SNOMED, etc.)
    display_name = Column(String(500), nullable=False)
    
    # Based on
    based_on = Column(JSON, nullable=True)  # References to care plans, etc.
    part_of = Column(JSON, nullable=True)  # References to procedures, etc.
    
    # Focus
    focus = Column(JSON, nullable=True)  # What observation is about if not patient
    
    # Timing
    effective_date = Column(DateTime(timezone=True), nullable=True)
    effective_period_start = Column(DateTime(timezone=True), nullable=True)
    effective_period_end = Column(DateTime(timezone=True), nullable=True)
    issued = Column(DateTime(timezone=True), nullable=True)
    
    # Performer
    performers = Column(JSON, nullable=True)  # Array of practitioner references
    
    # Value (polymorphic - stored as JSON with type indicator)
    value_type = Column(String(50), nullable=True)  # quantity, string, boolean, etc.
    value_data = Column(JSON, nullable=True)  # Actual value data
    
    # Specific typed values for common cases
    value_quantity = Column(Float, nullable=True)
    value_unit = Column(String(50), nullable=True)
    value_string = Column(String(500), nullable=True)
    value_boolean = Column(Boolean, nullable=True)
    value_integer = Column(Integer, nullable=True)
    
    # Data absent reason
    data_absent_reason = Column(JSON, nullable=True)  # CodeableConcept
    
    # Interpretation
    interpretation = Column(JSON, nullable=True)  # Array of CodeableConcept
    is_abnormal = Column(Boolean, default=False)
    
    # Notes
    notes = Column(JSON, nullable=True)  # Array of annotations
    
    # Body site
    body_site = Column(JSON, nullable=True)  # CodeableConcept
    
    # Method
    method = Column(JSON, nullable=True)  # CodeableConcept
    
    # Specimen
    specimen_id = Column(String(36), nullable=True)  # Reference to specimen
    
    # Device
    device = Column(JSON, nullable=True)  # Reference to device used
    
    # Reference ranges
    reference_ranges = Column(JSON, nullable=True)  # Array of reference range objects
    reference_range_low = Column(Float, nullable=True)
    reference_range_high = Column(Float, nullable=True)
    reference_range_text = Column(String(200), nullable=True)
    
    # Related observations
    has_member = Column(JSON, nullable=True)  # References to component observations
    derived_from = Column(JSON, nullable=True)  # References to source observations
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient")
    encounter = relationship("Encounter")
    components = relationship("ObservationComponent", back_populates="observation", cascade="all, delete-orphan")


class ObservationComponent(Base):
    """Components of multi-part observations."""
    __tablename__ = "observation_components"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    observation_id = Column(String(36), ForeignKey("observations.id"), nullable=False)
    
    # Component details
    code = Column(JSON, nullable=False)  # CodeableConcept
    display_name = Column(String(500), nullable=False)
    
    # Value (polymorphic)
    value_type = Column(String(50), nullable=True)
    value_data = Column(JSON, nullable=True)
    value_quantity = Column(Float, nullable=True)
    value_unit = Column(String(50), nullable=True)
    value_string = Column(String(500), nullable=True)
    
    # Interpretation
    interpretation = Column(JSON, nullable=True)
    
    # Reference range
    reference_range_low = Column(Float, nullable=True)
    reference_range_high = Column(Float, nullable=True)
    reference_range_text = Column(String(200), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    observation = relationship("Observation", back_populates="components")


class AllergyIntolerance(Base):
    """Patient allergies and intolerances - converted from FHIR AllergyIntolerance."""
    __tablename__ = "allergy_intolerances"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # FHIR references
    fhir_allergy_intolerance_id = Column(String(255), unique=True, nullable=True)
    identifiers = Column(JSON, nullable=True)  # Array of identifiers
    
    # Core relationships
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    encounter_id = Column(String(36), ForeignKey("encounters.id"), nullable=True)
    
    # Status
    clinical_status = Column(Enum(ClinicalStatus), nullable=False)
    verification_status = Column(Enum(VerificationStatus), nullable=False)
    
    # Type and category
    type = Column(Enum(AllergyType), nullable=False)
    categories = Column(JSON, nullable=True)  # Array of AllergyCategory values
    
    # Criticality
    criticality = Column(Enum(AllergyCriticality), nullable=True)
    
    # Allergen
    code = Column(JSON, nullable=False)  # CodeableConcept
    display_name = Column(String(500), nullable=False)
    
    # Onset
    onset_date = Column(Date, nullable=True)
    onset_age = Column(Integer, nullable=True)
    onset_period_start = Column(Date, nullable=True)
    onset_period_end = Column(Date, nullable=True)
    onset_string = Column(String(200), nullable=True)
    
    # Recording
    recorded_date = Column(DateTime(timezone=True), nullable=False)
    recorder_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    asserter_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    # Last occurrence
    last_occurrence = Column(DateTime(timezone=True), nullable=True)
    
    # Notes
    notes = Column(JSON, nullable=True)  # Array of annotations
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient")
    encounter = relationship("Encounter")
    recorder = relationship("User", foreign_keys=[recorder_id])
    asserter = relationship("User", foreign_keys=[asserter_id])
    reactions = relationship("AllergyReaction", back_populates="allergy", cascade="all, delete-orphan")


class AllergyReaction(Base):
    """Specific reactions to allergens."""
    __tablename__ = "allergy_reactions"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    allergy_id = Column(String(36), ForeignKey("allergy_intolerances.id"), nullable=False)
    
    # Reaction details
    substance = Column(JSON, nullable=True)  # Specific substance if different from main allergen
    manifestations = Column(JSON, nullable=False)  # Array of CodeableConcept
    description = Column(Text, nullable=True)
    
    # Severity
    severity = Column(Enum(ReactionSeverity), nullable=True)
    
    # Exposure route
    exposure_route = Column(JSON, nullable=True)  # CodeableConcept
    
    # Timing
    onset = Column(DateTime(timezone=True), nullable=True)
    
    # Notes
    notes = Column(JSON, nullable=True)  # Array of annotations
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    allergy = relationship("AllergyIntolerance", back_populates="reactions")


class Immunization(Base):
    """Immunization records - converted from FHIR Immunization."""
    __tablename__ = "immunizations"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # FHIR references
    fhir_immunization_id = Column(String(255), unique=True, nullable=True)
    identifiers = Column(JSON, nullable=True)  # Array of identifiers
    
    # Core relationships
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    encounter_id = Column(String(36), ForeignKey("encounters.id"), nullable=True)
    
    # Status
    status = Column(Enum(ImmunizationStatus), nullable=False)
    status_reason = Column(JSON, nullable=True)  # CodeableConcept
    
    # Vaccine
    vaccine_code = Column(JSON, nullable=False)  # CodeableConcept
    vaccine_name = Column(String(500), nullable=False)
    
    # Occurrence
    occurrence_date = Column(DateTime(timezone=True), nullable=True)
    occurrence_string = Column(String(200), nullable=True)  # If date unknown
    
    # Recording
    recorded = Column(DateTime(timezone=True), nullable=False)
    primary_source = Column(Boolean, default=True)  # From person who administered
    report_origin = Column(JSON, nullable=True)  # CodeableConcept if not primary
    
    # Location
    location_id = Column(String(36), ForeignKey("hospital_departments.id"), nullable=True)
    
    # Manufacturer
    manufacturer = Column(String(200), nullable=True)
    lot_number = Column(String(50), nullable=True)
    expiration_date = Column(Date, nullable=True)
    
    # Administration
    site = Column(JSON, nullable=True)  # CodeableConcept - body site
    route = Column(JSON, nullable=True)  # CodeableConcept - route
    dose_quantity = Column(Float, nullable=True)
    dose_unit = Column(String(50), nullable=True)
    
    # Performer
    performer_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    performer_function = Column(JSON, nullable=True)  # CodeableConcept
    
    # Reason
    reason_codes = Column(JSON, nullable=True)  # Array of CodeableConcept
    reason_references = Column(JSON, nullable=True)  # References to conditions
    
    # Subpotent
    is_subpotent = Column(Boolean, default=False)
    subpotent_reasons = Column(JSON, nullable=True)  # Array of CodeableConcept
    
    # Education
    education_document_type = Column(String(100), nullable=True)
    education_reference = Column(String(500), nullable=True)  # URL or document ID
    education_publication_date = Column(Date, nullable=True)
    education_presentation_date = Column(DateTime(timezone=True), nullable=True)
    
    # Program eligibility
    program_eligibility = Column(JSON, nullable=True)  # Array of CodeableConcept
    funding_source = Column(JSON, nullable=True)  # CodeableConcept
    
    # Notes
    notes = Column(JSON, nullable=True)  # Array of annotations
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient")
    encounter = relationship("Encounter")
    location = relationship("HospitalDepartment")
    performer = relationship("User")
    reactions = relationship("ImmunizationReaction", back_populates="immunization", cascade="all, delete-orphan")
    protocol_applied = relationship("ImmunizationProtocol", back_populates="immunization", cascade="all, delete-orphan")


class ImmunizationReaction(Base):
    """Reactions to immunizations."""
    __tablename__ = "immunization_reactions"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    immunization_id = Column(String(36), ForeignKey("immunizations.id"), nullable=False)
    
    # Reaction details
    date = Column(DateTime(timezone=True), nullable=True)
    detail = Column(JSON, nullable=True)  # Reference to observation
    reported = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    immunization = relationship("Immunization", back_populates="reactions")


class ImmunizationProtocol(Base):
    """Protocol followed for immunization."""
    __tablename__ = "immunization_protocols"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    immunization_id = Column(String(36), ForeignKey("immunizations.id"), nullable=False)
    
    # Protocol details
    series = Column(String(200), nullable=True)
    authority = Column(String(200), nullable=True)  # Who is responsible for protocol
    target_diseases = Column(JSON, nullable=False)  # Array of CodeableConcept
    
    # Dose
    dose_number_positive = Column(Integer, nullable=True)
    dose_number_string = Column(String(50), nullable=True)
    series_doses_positive = Column(Integer, nullable=True)
    series_doses_string = Column(String(50), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    immunization = relationship("Immunization", back_populates="protocol_applied")


# Family History
class FamilyMemberHistory(Base):
    """Family member health history."""
    __tablename__ = "family_member_histories"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # FHIR references
    fhir_family_member_history_id = Column(String(255), unique=True, nullable=True)
    identifiers = Column(JSON, nullable=True)
    
    # Core relationships
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    
    # Status
    status = Column(String(20), nullable=False)  # partial, completed, entered-in-error, health-unknown
    data_absent_reason = Column(JSON, nullable=True)  # CodeableConcept
    
    # Family member
    name = Column(String(200), nullable=True)
    relationship_type = Column(JSON, nullable=False)  # CodeableConcept
    sex = Column(JSON, nullable=True)  # CodeableConcept
    
    # Birth
    born_period_start = Column(Date, nullable=True)
    born_period_end = Column(Date, nullable=True)
    born_date = Column(Date, nullable=True)
    born_string = Column(String(200), nullable=True)
    
    # Age
    age_age = Column(Integer, nullable=True)
    age_range_low = Column(Integer, nullable=True)
    age_range_high = Column(Integer, nullable=True)
    age_string = Column(String(200), nullable=True)
    
    # Death
    deceased_boolean = Column(Boolean, nullable=True)
    deceased_age = Column(Integer, nullable=True)
    deceased_range_low = Column(Integer, nullable=True)
    deceased_range_high = Column(Integer, nullable=True)
    deceased_date = Column(Date, nullable=True)
    deceased_string = Column(String(200), nullable=True)
    
    # Reason codes
    reason_codes = Column(JSON, nullable=True)  # Array of CodeableConcept
    reason_references = Column(JSON, nullable=True)  # References to conditions
    
    # Notes
    notes = Column(JSON, nullable=True)  # Array of annotations
    
    # Timestamps
    date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient")
    conditions = relationship("FamilyMemberCondition", back_populates="family_member", cascade="all, delete-orphan")


class FamilyMemberCondition(Base):
    """Conditions of family members."""
    __tablename__ = "family_member_conditions"
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    family_member_id = Column(String(36), ForeignKey("family_member_histories.id"), nullable=False)
    
    # Condition
    code = Column(JSON, nullable=False)  # CodeableConcept
    outcome = Column(JSON, nullable=True)  # CodeableConcept
    contributed_to_death = Column(Boolean, nullable=True)
    
    # Onset
    onset_age = Column(Integer, nullable=True)
    onset_range_low = Column(Integer, nullable=True)
    onset_range_high = Column(Integer, nullable=True)
    onset_period_start = Column(Date, nullable=True)
    onset_period_end = Column(Date, nullable=True)
    onset_string = Column(String(200), nullable=True)
    
    # Notes
    notes = Column(JSON, nullable=True)  # Array of annotations
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    family_member = relationship("FamilyMemberHistory", back_populates="conditions")