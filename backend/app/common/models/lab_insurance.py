# app/common/models/lab_insurance.py
"""Consolidated lab results and insurance models for the EHR system."""
from sqlalchemy import Column, String, Date, DateTime, Float, Text, ForeignKey, Boolean, Integer, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy import String
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

from app.db.base_class import Base
from app.common.enums import ServiceRequestStatus, ServiceRequestPriority, ServiceRequestIntent


# Lab Result Enums
class LabResultStatus(str, enum.Enum):
    ORDERED = "ordered"
    COLLECTED = "collected"
    IN_PROGRESS = "in_progress"
    PRELIMINARY = "preliminary"
    FINAL = "final"
    CORRECTED = "corrected"
    CANCELLED = "cancelled"


class AbnormalityType(str, enum.Enum):
    NORMAL = "normal"
    LOW = "low"
    HIGH = "high"
    ABNORMAL = "abnormal"
    CRITICAL_LOW = "critical_low"
    CRITICAL_HIGH = "critical_high"


class SpecimenType(str, enum.Enum):
    BLOOD = "blood"
    URINE = "urine"
    STOOL = "stool"
    SPUTUM = "sputum"
    CSF = "csf"
    TISSUE = "tissue"
    SWAB = "swab"
    OTHER = "other"


class ServiceRequestStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    REVOKED = "revoked"
    COMPLETED = "completed"
    ENTERED_IN_ERROR = "entered_in_error"


class ServiceRequestPriority(str, enum.Enum):
    ROUTINE = "routine"
    URGENT = "urgent"
    ASAP = "asap"
    STAT = "stat"


class ServiceRequestIntent(str, enum.Enum):
    PROPOSAL = "proposal"
    PLAN = "plan"
    DIRECTIVE = "directive"
    ORDER = "order"
    ORIGINAL_ORDER = "original_order"
    REFLEX_ORDER = "reflex_order"
    FILLER_ORDER = "filler_order"
    INSTANCE_ORDER = "instance_order"


class ServiceRequestPriority(str, enum.Enum):
    ROUTINE = "routine"
    URGENT = "urgent"
    ASAP = "asap"
    STAT = "stat"


# Insurance Enums
class InsuranceStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    PENDING = "pending"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class CoverageType(str, enum.Enum):
    BASIC = "basic"
    STANDARD = "standard"
    COMPREHENSIVE = "comprehensive"
    PREMIUM = "premium"
    GOVERNMENT = "government"
    PRIVATE = "private"


class ClaimStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    RECEIVED = "received"
    PROCESSING = "processing"
    APPROVED = "approved"
    DENIED = "denied"
    PARTIALLY_APPROVED = "partially_approved"
    PENDING_INFO = "pending_info"
    APPEALED = "appealed"
    PAID = "paid"


class LabOrder(Base):
    """Lab order/service request - converted from FHIR ServiceRequest."""
    __tablename__ = "lab_orders"
    __table_args__ = {"schema": "ehr"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # FHIR references
    fhir_service_request_id = Column(String(255), unique=True, nullable=True)
    identifiers = Column(JSON, nullable=True)  # Array of identifiers
    requisition = Column(JSON, nullable=True)  # Group identifier
    
    # Core relationships
    patient_id = Column(String(36), ForeignKey("ehr.patients.patient_id"), nullable=False)
    ordered_by = Column(String(36), ForeignKey("ehr.doctors.id"), nullable=False)
    encounter_id = Column(String(36), ForeignKey("ehr.appointments.id"), nullable=True)
    
    # Order details
    order_number = Column(String(50), unique=True, nullable=False, index=True)
    status = Column(
        Enum(ServiceRequestStatus, native_enum=False, values_callable=lambda e: [v.value for v in e]),
        default=ServiceRequestStatus.ACTIVE,
        nullable=False
    )
    intent = Column(
        Enum(ServiceRequestIntent, native_enum=False, values_callable=lambda e: [v.value for v in e]),
        default=ServiceRequestIntent.ORDER,
        nullable=False
    )
    priority = Column(
        Enum(ServiceRequestPriority, native_enum=False, values_callable=lambda e: [v.value for v in e]),
        default=ServiceRequestPriority.ROUTINE,
        nullable=False
    )
    
    # Test information
    tests_ordered = Column(JSON, nullable=False)  # Array of {code, name, category}
    category = Column(JSON, nullable=True)  # Array of CodeableConcept
    
    # Clinical information
    clinical_indication = Column(Text, nullable=True)
    clinical_notes = Column(Text, nullable=True)
    reason_codes = Column(JSON, nullable=True)  # Array of diagnosis codes
    supporting_info = Column(JSON, nullable=True)  # References to supporting info
    
    # Timing
    ordered_date = Column(DateTime(timezone=True), nullable=False)
    required_by = Column(DateTime(timezone=True), nullable=True)
    occurrence_date = Column(DateTime(timezone=True), nullable=True)
    
    # Instructions
    patient_instructions = Column(Text, nullable=True)
    lab_instructions = Column(Text, nullable=True)
    do_not_perform = Column(Boolean, default=False)
    
    # Specimen
    specimen_required = Column(Boolean, default=True)
    specimen_type = Column(Enum(SpecimenType, native_enum=False), nullable=True)
    specimen_instructions = Column(Text, nullable=True)
    fasting_required = Column(Boolean, default=False)
    
    # Location and performer
    performing_lab_id = Column(String(36), nullable=True)
    location_code = Column(JSON, nullable=True)  # Where to perform
    
    # Insurance
    insurance_ids = Column(JSON, nullable=True)  # Array of insurance references
    
    # Status tracking
    cancelled_by = Column(String(36), ForeignKey("core.users.id"), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    cancellation_reason = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient")
    orderer = relationship("Doctor", foreign_keys=[ordered_by], back_populates="lab_orders")
    encounter = relationship("Appointment")
    lab_results = relationship("LabResult", back_populates="lab_order", cascade="all, delete-orphan")


class LabResult(Base):
    """Laboratory test results with enhanced features."""
    __tablename__ = "lab_results"
    __table_args__ = {"schema": "ehr"}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # FHIR references
    fhir_observation_id = Column(String(255), unique=True, nullable=True)
    fhir_diagnostic_report_id = Column(String(255), unique=True, nullable=True)
    
    # Core relationships
    patient_id = Column(UUID(as_uuid=True), ForeignKey("ehr.patients.patient_id"), nullable=False)
    lab_order_id = Column(UUID(as_uuid=True), ForeignKey("ehr.lab_orders.id"), nullable=True)
    medical_record_id = Column(UUID(as_uuid=True), ForeignKey("ehr.medical_records.id"), nullable=True)
    
    # Result identification
    result_number = Column(String(50), unique=True, nullable=False, index=True)
    accession_number = Column(String(50), nullable=True)  # Lab's internal number
    
    # Test information
    test_name = Column(String(200), nullable=False)
    test_code = Column(String(50), nullable=False)  # LOINC code
    test_category = Column(String(100), nullable=True)  # hematology, chemistry, microbiology, etc.
    panel_name = Column(String(200), nullable=True)  # If part of a panel
    
    # Result data
    result_value = Column(String(100), nullable=False)
    result_unit = Column(String(50), nullable=True)
    result_type = Column(String(20), nullable=True)  # numeric, text, coded, range
    
    # Reference ranges
    reference_range = Column(String(100), nullable=True)
    reference_range_low = Column(Float, nullable=True)
    reference_range_high = Column(Float, nullable=True)
    reference_range_text = Column(Text, nullable=True)
    
    # Abnormality
    is_abnormal = Column(Boolean, default=False)
    abnormality_type = Column(Enum(AbnormalityType, native_enum=False), default=AbnormalityType.NORMAL)
    is_critical = Column(Boolean, default=False)
    
    # Status
    status = Column(Enum(LabResultStatus, native_enum=False), default=LabResultStatus.FINAL, nullable=False)
    
    # Interpretation
    interpretation = Column(Text, nullable=True)
    clinical_significance = Column(Text, nullable=True)
    comments = Column(Text, nullable=True)
    
    # Lab information
    performing_lab_name = Column(String(200), nullable=True)
    performing_lab_id = Column(UUID(as_uuid=True), nullable=True)
    lab_director = Column(String(200), nullable=True)
    
    # Specimen information
    specimen_type = Column(Enum(SpecimenType, native_enum=False), nullable=True)
    specimen_collected_date = Column(DateTime(timezone=True), nullable=True)
    specimen_received_date = Column(DateTime(timezone=True), nullable=True)
    specimen_condition = Column(String(100), nullable=True)
    
    # Dates
    test_date = Column(DateTime(timezone=True), nullable=False)
    resulted_date = Column(DateTime(timezone=True), nullable=False)
    verified_date = Column(DateTime(timezone=True), nullable=True)
    
    # Personnel
    ordered_by = Column(UUID(as_uuid=True), ForeignKey("ehr.doctors.id"), nullable=True)
    performed_by = Column(String(200), nullable=True)
    verified_by = Column(String(200), nullable=True)
    resulted_by = Column(String(200), nullable=True)
    
    # Attachments
    report_file_url = Column(String(500), nullable=True)  # PDF report
    attachments = Column(JSON, nullable=True)  # Array of attachment references
    
    # Method
    test_method = Column(String(200), nullable=True)
    instrument_id = Column(String(100), nullable=True)
    
    # History
    previous_results = Column(JSON, nullable=True)  # Array of previous values with dates
    delta = Column(String(50), nullable=True)  # Change from previous
    trend = Column(String(20), nullable=True)  # increasing, decreasing, stable
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="lab_results")
    lab_order = relationship("LabOrder", back_populates="lab_results")
    medical_record = relationship("MedicalRecord", back_populates="lab_results")
    doctor = relationship("Doctor")
    
    # Critical result notifications
    notifications = relationship("LabResultNotification", back_populates="lab_result", cascade="all, delete-orphan")


class LabReport(Base):
    """Lab report metadata associated with a lab order/patient."""
    __tablename__ = "lab_reports"
    __table_args__ = {"schema": "ehr"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    order_id = Column(UUID(as_uuid=True), ForeignKey("ehr.lab_orders.id"), nullable=True)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("ehr.patients.patient_id"), nullable=True)
    report_date = Column(DateTime(timezone=True), server_default=func.now())
    title = Column(String(200), nullable=False)
    summary = Column(Text, nullable=True)
    metrics = Column(JSON, nullable=True)  # e.g., turnaround, sampleCount, etc.
    attachments = Column(JSON, nullable=True)  # [{name, url, type}]
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    lab_order = relationship("LabOrder")
    patient = relationship("Patient")

class LabResultNotification(Base):
    """Notifications for critical lab results."""
    __tablename__ = "lab_result_notifications"
    __table_args__ = {"schema": "ehr"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    lab_result_id = Column(String(36), ForeignKey("ehr.lab_results.id"), nullable=False)
    
    # Notification details
    notified_user_id = Column(String(36), ForeignKey("core.users.id"), nullable=False)
    notification_type = Column(String(50), nullable=False)  # sms, email, phone, in_app
    notification_sent_at = Column(DateTime(timezone=True), nullable=False)
    notification_read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Response
    acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    response_notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    lab_result = relationship("LabResult", back_populates="notifications")
    notified_user = relationship("User")


class Insurance(Base):
    """Patient insurance coverage - enhanced model."""
    __tablename__ = "insurances"
    __table_args__ = {"schema": "ehr"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    patient_id = Column(String(36), ForeignKey("ehr.patients.patient_id"), nullable=False)
    
    # FHIR Coverage reference
    fhir_coverage_id = Column(String(255), unique=True, nullable=True)
    
    # Insurance provider
    provider_name = Column(String(200), nullable=False)
    provider_id = Column(String(100), nullable=True)
    provider_phone = Column(String(20), nullable=True)
    provider_website = Column(String(500), nullable=True)
    
    # Policy information
    policy_number = Column(String(50), unique=True, nullable=False, index=True)
    group_number = Column(String(50), nullable=True)
    plan_name = Column(String(200), nullable=True)
    plan_type = Column(String(50), nullable=True)  # HMO, PPO, EPO, POS
    coverage_type = Column(Enum(CoverageType, native_enum=False), nullable=False)
    
    # Subscriber information (if different from patient)
    subscriber_id = Column(String(50), nullable=True)
    subscriber_name = Column(String(200), nullable=True)
    subscriber_relationship = Column(String(50), nullable=True)  # self, spouse, child, other
    subscriber_dob = Column(Date, nullable=True)
    
    # Coverage period
    status = Column(Enum(InsuranceStatus, native_enum=False), default=InsuranceStatus.ACTIVE)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    # Financial details
    monthly_premium = Column(Float, nullable=True)
    annual_deductible = Column(Float, nullable=True)
    deductible_met = Column(Float, default=0.0)
    out_of_pocket_max = Column(Float, nullable=True)
    out_of_pocket_met = Column(Float, default=0.0)
    
    # Copayments
    copay_primary_care = Column(Float, nullable=True)
    copay_specialist = Column(Float, nullable=True)
    copay_urgent_care = Column(Float, nullable=True)
    copay_emergency = Column(Float, nullable=True)
    copay_prescription_generic = Column(Float, nullable=True)
    copay_prescription_brand = Column(Float, nullable=True)
    
    # Coinsurance
    coinsurance_in_network = Column(Float, nullable=True)  # percentage
    coinsurance_out_network = Column(Float, nullable=True)  # percentage
    
    # Coverage details
    coverage_details = Column(JSON, nullable=True)  # Detailed benefits structure
    exclusions = Column(JSON, nullable=True)  # Array of exclusions
    prior_authorization_required = Column(JSON, nullable=True)  # Services requiring auth
    
    # Network
    network_name = Column(String(200), nullable=True)
    is_in_network = Column(Boolean, default=True)
    
    # Verification
    last_verified_date = Column(Date, nullable=True)
    verified_by = Column(String(36), ForeignKey("core.users.id"), nullable=True)
    verification_notes = Column(Text, nullable=True)
    
    # Card images
    card_front_url = Column(String(500), nullable=True)
    card_back_url = Column(String(500), nullable=True)
    
    # Priority
    is_primary = Column(Boolean, default=True)
    coordination_of_benefits_order = Column(Integer, default=1)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    patient = relationship("Patient", back_populates="insurances")
    claims = relationship("InsuranceClaim", back_populates="insurance", cascade="all, delete-orphan")
    authorizations = relationship("InsuranceAuthorization", back_populates="insurance", cascade="all, delete-orphan")


class InsuranceClaim(Base):
    """Insurance claims with enhanced tracking."""
    __tablename__ = "insurance_claims"
    __table_args__ = {"schema": "financial"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    
    # FHIR Claim reference
    fhir_claim_id = Column(String(255), unique=True, nullable=True)
    
    # Core relationships
    insurance_id = Column(String(36), ForeignKey("ehr.insurances.id"), nullable=False)
    patient_id = Column(String(36), ForeignKey("ehr.patients.patient_id"), nullable=False)
    appointment_id = Column(String(36), ForeignKey("ehr.appointments.id"), nullable=True)
    
    # Claim identification
    claim_number = Column(String(50), unique=True, nullable=False, index=True)
    internal_claim_id = Column(String(50), unique=True, nullable=False)
    
    # Type of claim
    claim_type = Column(String(50), nullable=False)  # institutional, professional, pharmacy
    service_type = Column(String(100), nullable=True)  # consultation, procedure, lab, etc.
    
    # Dates
    service_date = Column(Date, nullable=False)
    service_end_date = Column(Date, nullable=True)  # For multi-day services
    submission_date = Column(Date, nullable=False)
    received_date = Column(Date, nullable=True)
    
    # Status
    status = Column(Enum(ClaimStatus, native_enum=False), default=ClaimStatus.DRAFT, nullable=False)
    status_date = Column(DateTime(timezone=True), nullable=False)
    status_reason = Column(Text, nullable=True)
    
    # Provider information
    billing_provider_id = Column(String(36), ForeignKey("ref.hospitals.id"), nullable=False)
    rendering_provider_id = Column(String(36), ForeignKey("ehr.doctors.id"), nullable=True)
    referring_provider_id = Column(String(36), ForeignKey("ehr.doctors.id"), nullable=True)
    
    # Services
    services = Column(JSON, nullable=False)  # Array of {code, description, quantity, charge}
    diagnosis_codes = Column(JSON, nullable=False)  # Array of ICD-10 codes
    procedure_codes = Column(JSON, nullable=True)  # Array of CPT codes
    
    # Financial details
    total_charge_amount = Column(Float, nullable=False)
    allowed_amount = Column(Float, nullable=True)
    approved_amount = Column(Float, nullable=True)
    
    # Payments
    insurance_paid_amount = Column(Float, nullable=True)
    patient_paid_amount = Column(Float, nullable=True)
    patient_responsibility = Column(Float, nullable=True)
    
    # Adjustments
    contractual_adjustment = Column(Float, nullable=True)
    other_adjustments = Column(Float, nullable=True)
    write_off_amount = Column(Float, nullable=True)
    
    # Deductible and copay
    deductible_applied = Column(Float, nullable=True)
    copay_amount = Column(Float, nullable=True)
    coinsurance_amount = Column(Float, nullable=True)
    
    # Processing details
    processed_date = Column(Date, nullable=True)
    payment_date = Column(Date, nullable=True)
    check_number = Column(String(50), nullable=True)
    
    # Denial/rejection
    denial_reason = Column(Text, nullable=True)
    denial_codes = Column(JSON, nullable=True)  # Array of denial codes
    
    # Appeals
    appeal_submitted = Column(Boolean, default=False)
    appeal_date = Column(Date, nullable=True)
    appeal_outcome = Column(String(50), nullable=True)
    appeal_notes = Column(Text, nullable=True)
    
    # Attachments
    attachments = Column(JSON, nullable=True)  # Array of document references
    
    # Notes
    internal_notes = Column(Text, nullable=True)
    payer_notes = Column(Text, nullable=True)
    
    # Resubmission
    is_resubmission = Column(Boolean, default=False)
    original_claim_id = Column(String(36), ForeignKey("financial.insurance_claims.id"), nullable=True)
    resubmission_code = Column(String(20), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    insurance = relationship("Insurance", back_populates="claims")
    patient = relationship("Patient")
    appointment = relationship("Appointment")
    billing_provider = relationship("Hospital")
    rendering_provider = relationship("Doctor", foreign_keys=[rendering_provider_id])
    referring_provider = relationship("Doctor", foreign_keys=[referring_provider_id])
    original_claim = relationship("InsuranceClaim", remote_side=[id])
    line_items = relationship("ClaimLineItem", back_populates="claim", cascade="all, delete-orphan")


class ClaimLineItem(Base):
    """Individual line items on insurance claims."""
    __tablename__ = "claim_line_items"
    __table_args__ = {"schema": "ehr"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    claim_id = Column(String(36), ForeignKey("financial.insurance_claims.id"), nullable=False)
    
    # Line item details
    line_number = Column(Integer, nullable=False)
    service_date = Column(Date, nullable=False)
    
    # Service/procedure
    procedure_code = Column(String(20), nullable=False)  # CPT/HCPCS
    procedure_description = Column(String(500), nullable=False)
    modifiers = Column(JSON, nullable=True)  # Array of modifiers
    
    # Quantities and charges
    quantity = Column(Float, nullable=False)
    unit_charge = Column(Float, nullable=False)
    total_charge = Column(Float, nullable=False)
    
    # Payments
    allowed_amount = Column(Float, nullable=True)
    paid_amount = Column(Float, nullable=True)
    patient_responsibility = Column(Float, nullable=True)
    
    # Status
    status = Column(String(20), nullable=True)  # paid, denied, pending
    denial_reason = Column(String(500), nullable=True)
    
    # Place of service
    place_of_service_code = Column(String(5), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    claim = relationship("InsuranceClaim", back_populates="line_items")


class InsuranceAuthorization(Base):
    """Prior authorization requests."""
    __tablename__ = "insurance_authorizations"
    __table_args__ = {"schema": "financial"}
    
    id = Column(String(36), primary_key=True, default=uuid.uuid4, index=True)
    insurance_id = Column(String(36), ForeignKey("ehr.insurances.id"), nullable=False)
    patient_id = Column(String(36), ForeignKey("ehr.patients.patient_id"), nullable=False)
    
    # Authorization details
    authorization_number = Column(String(50), unique=True, nullable=True)
    request_date = Column(Date, nullable=False)
    service_type = Column(String(100), nullable=False)
    
    # Services requested
    procedure_codes = Column(JSON, nullable=False)  # Array of CPT codes
    diagnosis_codes = Column(JSON, nullable=False)  # Array of ICD-10 codes
    
    # Provider
    requesting_provider_id = Column(String(36), ForeignKey("ehr.doctors.id"), nullable=False)
    servicing_provider_id = Column(String(36), ForeignKey("ehr.doctors.id"), nullable=True)
    
    # Status
    status = Column(String(20), nullable=False)  # pending, approved, denied, expired
    decision_date = Column(Date, nullable=True)
    
    # Validity
    valid_from = Column(Date, nullable=True)
    valid_to = Column(Date, nullable=True)
    units_approved = Column(Integer, nullable=True)
    units_used = Column(Integer, default=0)
    
    # Notes
    clinical_notes = Column(Text, nullable=True)
    payer_notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    insurance = relationship("Insurance", back_populates="authorizations")
    patient = relationship("Patient")
    requesting_provider = relationship("Doctor", foreign_keys=[requesting_provider_id])
    servicing_provider = relationship("Doctor", foreign_keys=[servicing_provider_id])