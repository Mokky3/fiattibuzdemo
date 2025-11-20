"""Enhanced medical-related schemas for surgical edits integration."""
from datetime import datetime, date
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, validator
import enum
from enum import Enum
from .base_enhanced import (
    TimestampMixin, ClinicScopedMixin, FHIRMixin, AuditMixin,
    FHIRCodeableConcept, FHIRQuantity, FHIRPeriod, FHIRReference,
    Priority, validate_email_format, format_phone_number
)

# ============================= Enhanced Medical Enums =============================

class ReportType(str, enum.Enum):
    """Enhanced report types."""
    GENERAL = "general"
    MIDWIFERY = "midwifery_gynecology"
    CARDIOLOGY = "cardiology"
    NEUROLOGY = "neurology"
    OPHTHALMOLOGY = "ophthalmology"
    TRAUMATOLOGY = "traumatology"
    UROLOGY = "urology"
    ONCOLOGY = "oncology"
    ALLERGOLOGY = "allergology"
    DERMATOLOGY = "dermatology"
    ENDOCRINOLOGY = "endocrinology"
    GASTROENTEROLOGY = "gastroenterology"
    PULMONOLOGY = "pulmonology"
    RHEUMATOLOGY = "rheumatology"
    PSYCHIATRY = "psychiatry"
    PEDIATRICS = "pediatrics"
    GERIATRICS = "geriatrics"
    EMERGENCY = "emergency"
    TELEMEDICINE = "telemedicine"

class ReportStatus(str, enum.Enum):
    """Enhanced report statuses."""
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    ARCHIVED = "archived"
    CANCELLED = "cancelled"
    SIGNED = "signed"
    FINAL = "final"

class PrescriptionStatus(str, enum.Enum):
    """Enhanced prescription statuses."""
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    ON_HOLD = "on_hold"
    DISPENSED = "dispensed"
    PARTIALLY_DISPENSED = "partially_dispensed"

class MedicationFrequency(str, enum.Enum):
    """Enhanced medication frequencies."""
    ONCE_DAILY = "once_daily"
    TWICE_DAILY = "twice_daily"
    THREE_TIMES_DAILY = "three_times_daily"
    FOUR_TIMES_DAILY = "four_times_daily"
    EVERY_SIX_HOURS = "every_six_hours"
    EVERY_EIGHT_HOURS = "every_eight_hours"
    EVERY_TWELVE_HOURS = "every_twelve_hours"
    AS_NEEDED = "as_needed"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"

class ObservationType(str, enum.Enum):
    """Enhanced observation types."""
    VITAL_SIGNS = "vital_signs"
    LAB_RESULT = "lab_result"
    IMAGING = "imaging"
    ASSESSMENT = "assessment"
    PROCEDURE = "procedure"
    SYMPTOM = "symptom"
    ALLERGY = "allergy"
    MEDICATION = "medication"
    IMMUNIZATION = "immunization"

class MedicationRoute(str, enum.Enum):
    """Medication administration routes."""
    ORAL = "oral"
    INTRAVENOUS = "intravenous"
    INTRAMUSCULAR = "intramuscular"
    SUBCUTANEOUS = "subcutaneous"
    TOPICAL = "topical"
    INHALATION = "inhalation"
    RECTAL = "rectal"
    VAGINAL = "vaginal"
    OPHTHALMIC = "ophthalmic"
    OTIC = "otic"
    NASAL = "nasal"

# ============================= Enhanced Medication Models =============================

class Medication(BaseModel):
    """Enhanced individual medication model."""
    name: str = Field(..., min_length=1, max_length=200)
    dosage: str = Field(..., description="Medication dosage (e.g., '50mg', '1 tablet')")
    frequency: str = Field(..., description="How often to take (e.g., 'Once daily')")
    duration: str = Field(..., description="How long to take (e.g., '7 days', '1 month')")
    instructions: Optional[str] = Field(None, max_length=500, description="Special instructions")
    
    # Enhanced fields for surgical edits
    route: Optional[MedicationRoute] = None
    timing: Optional[str] = Field(None, description="When to take (e.g., 'with food', 'on empty stomach')")
    side_effects: Optional[List[str]] = Field(default_factory=list)
    contraindications: Optional[List[str]] = Field(default_factory=list)

class MedicationCreate(Medication):
    """Enhanced schema for creating medications."""
    rxnorm_code: Optional[str] = Field(None, description="RxNorm medication code")
    generic_name: Optional[str] = Field(None, description="Generic medication name")
    brand_name: Optional[str] = Field(None, description="Brand medication name")
    ndc_code: Optional[str] = Field(None, description="National Drug Code")
    manufacturer: Optional[str] = Field(None, description="Medication manufacturer")
    
    # FHIR integration fields
    create_fhir_medication: bool = Field(True, description="Create FHIR Medication resource")

class MedicationDetail(Medication):
    """Enhanced detailed medication with additional fields."""
    id: Optional[str] = None
    rxnorm_code: Optional[str] = None
    generic_name: Optional[str] = None
    brand_name: Optional[str] = None
    ndc_code: Optional[str] = None
    manufacturer: Optional[str] = None
    route_of_administration: Optional[MedicationRoute] = None
    strength: Optional[str] = None
    form: Optional[str] = None  # tablet, capsule, liquid, etc.
    contraindications: Optional[List[str]] = Field(default_factory=list)
    side_effects: Optional[List[str]] = Field(default_factory=list)
    interactions: Optional[List[str]] = Field(default_factory=list)
    
    # FHIR integration
    fhir_medication_id: Optional[str] = None
    fhir_codeable_concept: Optional[FHIRCodeableConcept] = None

# ============================= Enhanced Prescription Models =============================

class PrescriptionBase(BaseModel):
    """Enhanced base prescription model."""
    patient_id: str
    medication_name: str = Field(..., min_length=1, max_length=200)
    dosage: str = Field(..., description="Medication dosage")
    frequency: str = Field(..., description="Frequency of administration")
    duration: str = Field(..., description="Duration of treatment")
    instructions: Optional[str] = Field(None, max_length=1000)
    status: PrescriptionStatus = PrescriptionStatus.ACTIVE
    
    # Enhanced fields for surgical edits
    route: Optional[MedicationRoute] = None
    timing: Optional[str] = Field(None, description="When to take medication")
    priority: Priority = Priority.MEDIUM
    is_controlled_substance: bool = False
    requires_monitoring: bool = False

class PrescriptionCreate(str, enum.Enum):
    """Enhanced schema for creating prescriptions."""
    quantity: Optional[int] = Field(None, ge=1, description="Quantity to dispense")
    refills: Optional[int] = Field(0, ge=0, le=12, description="Number of refills allowed")
    pharmacy_id: Optional[str] = None
    urgent: bool = False
    
    # Enhanced fields for surgical edits
    rxnorm_code: Optional[str] = None
    generic_name: Optional[str] = None
    brand_name: Optional[str] = None
    ndc_code: Optional[str] = None
    
    # FHIR integration fields
    create_fhir_medication_request: bool = Field(True, description="Create FHIR MedicationRequest resource")
    create_fhir_task: bool = Field(False, description="Create FHIR Task for refill management")

class PrescriptionUpdate(BaseModel):
    """Enhanced schema for updating prescriptions."""
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None
    status: Optional[PrescriptionStatus] = None
    refills: Optional[int] = Field(None, ge=0, le=12)
    route: Optional[MedicationRoute] = None
    timing: Optional[str] = None
    priority: Optional[Priority] = None
    requires_monitoring: Optional[bool] = None

class Prescription(str, enum.Enum):
    """Enhanced complete prescription model."""
    id: str
    doctor_id: str
    doctor_name: str = Field(..., description="Prescribing doctor name")
    prescribed_date: date = Field(default_factory=date.today)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    quantity: Optional[int] = None
    refills: int = 0
    refills_used: int = 0
    pharmacy_id: Optional[str] = None
    pharmacy_name: Optional[str] = None
    
    # Enhanced fields for surgical edits
    rxnorm_code: Optional[str] = None
    generic_name: Optional[str] = None
    brand_name: Optional[str] = None
    ndc_code: Optional[str] = None
    manufacturer: Optional[str] = None
    route: Optional[MedicationRoute] = None
    timing: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    is_controlled_substance: bool = False
    requires_monitoring: bool = False
    
    # FHIR integration
    fhir_medication_request_id: Optional[str] = None
    fhir_medication_id: Optional[str] = None
    fhir_task_id: Optional[str] = None
    
    # Tracking
    last_dispensed: Optional[datetime] = None
    next_refill_date: Optional[date] = None
    refill_history: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    
    # Patient safety
    drug_interactions: Optional[List[str]] = Field(default_factory=list)
    allergies_checked: bool = False
    contraindications_checked: bool = False

class PrescriptionSummary(BaseModel):
    """Enhanced prescription summary for lists."""
    id: str
    patient_id: str
    medication_name: str
    dosage: str
    frequency: str
    duration: str
    status: PrescriptionStatus
    prescribed_date: date
    doctor_name: str
    clinic_id: str
    fhir_medication_request_id: Optional[str] = None
    refills_remaining: int = 0
    is_controlled_substance: bool = False
    requires_monitoring: bool = False

# ============================= Enhanced Report Models =============================

class FollowUp(BaseModel):
    """Enhanced follow-up information."""
    reason: str = Field(..., description="Reason for follow-up")
    date: str = Field(..., description="Follow-up date")
    instructions: Optional[str] = None
    
    # Enhanced fields for surgical edits
    priority: Priority = Priority.MEDIUM
    reminder_sent: bool = False
    reminder_sent_at: Optional[datetime] = None
    fhir_task_id: Optional[str] = None

class Doctor(BaseModel):
    """Enhanced doctor information for reports."""
    name: str
    specialty: str
    department: str
    license_number: Optional[str] = None
    
    # Enhanced fields for surgical edits
    practitioner_id: str
    clinic_id: str
    fhir_practitioner_id: Optional[str] = None
    fhir_practitioner_role_id: Optional[str] = None

class ReportBase(BaseModel):
    """Enhanced base report model."""
    patient_id: str
    doctor_id: str
    specialty: ReportType
    code: str = Field(..., description="Report form code (e.g., '#025')")
    
    # Clinical content
    chief_complaint: str = Field(..., description="Primary reason for visit")
    history_of_present_illness: str = Field(..., description="HPI details")
    physical_examination: str = Field(..., description="Physical exam findings")
    diagnosis: str = Field(..., description="Clinical diagnosis")
    treatment_plan: str = Field(..., description="Treatment recommendations")
    additional_notes: Optional[str] = Field(None, description="Additional clinical notes")
    
    # Enhanced fields for surgical edits
    icd10_codes: Optional[List[str]] = Field(default_factory=list, description="ICD-10 diagnosis codes")
    snomed_codes: Optional[List[str]] = Field(default_factory=list, description="SNOMED CT codes")
    severity: Priority = Priority.MEDIUM
    is_telemedicine: bool = False

class CreateReport(BaseModel):
    """Enhanced schema for creating reports (frontend compatibility)."""
    patientId: str  # camelCase for frontend
    specialty: str
    code: str
    data: Dict[str, Any]  # Form data from frontend
    
    # Enhanced fields for surgical edits
    clinicId: Optional[str] = None
    createFhirResources: bool = True

class ReportCreate(str, enum.Enum):
    """Enhanced schema for creating reports."""
    medications: List[MedicationCreate] = Field(default_factory=list)
    follow_up: Optional[FollowUp] = None
    attachments: Optional[List[str]] = Field(default_factory=list)
    template_used: Optional[str] = None
    
    # Enhanced fields for surgical edits
    vitals: Optional[Dict[str, Any]] = None
    lab_results: Optional[List[Dict[str, Any]]] = None
    imaging_results: Optional[List[Dict[str, Any]]] = None
    
    # FHIR integration fields
    create_fhir_document_reference: bool = Field(True, description="Create FHIR DocumentReference")
    create_fhir_diagnostic_report: bool = Field(False, description="Create FHIR DiagnosticReport if lab/imaging data")
    create_fhir_observations: bool = Field(True, description="Create FHIR Observations for vitals")

class Report(str, enum.Enum):
    """Enhanced complete report model."""
    id: str
    status: ReportStatus = ReportStatus.DRAFT
    report_date: datetime = Field(default_factory=datetime.utcnow)
    
    # Content
    medications: List[MedicationDetail] = Field(default_factory=list)
    follow_up: Optional[FollowUp] = None
    vitals: Optional[Dict[str, Any]] = None
    lab_results: Optional[List[Dict[str, Any]]] = None
    imaging_results: Optional[List[Dict[str, Any]]] = None
    
    # Metadata
    doctor_name: str
    doctor_specialty: str
    template_used: Optional[str] = None
    
    # Enhanced fields for surgical edits
    icd10_codes: Optional[List[str]] = Field(default_factory=list)
    snomed_codes: Optional[List[str]] = Field(default_factory=list)
    severity: Priority = Priority.MEDIUM
    is_telemedicine: bool = False
    
    # FHIR integration
    fhir_document_reference_id: Optional[str] = None
    fhir_diagnostic_report_id: Optional[str] = None
    fhir_binary_id: Optional[str] = None  # For PDF/report file
    fhir_observation_ids: Optional[List[str]] = Field(default_factory=list)
    
    # Workflow
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    signed_by: Optional[str] = None
    signed_at: Optional[datetime] = None
    
    # Digital signature
    digital_signature: Optional[Dict[str, Any]] = None
    signature_hash: Optional[str] = None

class ReportView(BaseModel):
    """Enhanced UI-friendly report model for ViewReport component."""
    id: str
    date: str  # Formatted date
    doctor: Doctor
    chiefComplaint: str  # camelCase for frontend
    historyOfPresentIllness: str
    physicalExamination: str
    diagnosis: str
    treatmentPlan: str
    medications: List[Medication]
    followUp: FollowUp
    additionalNotes: str
    
    # Enhanced fields for surgical edits
    vitals: Optional[Dict[str, Any]] = None
    labResults: Optional[List[Dict[str, Any]]] = None
    imagingResults: Optional[List[Dict[str, Any]]] = None
    icd10Codes: Optional[List[str]] = None
    snomedCodes: Optional[List[str]] = None
    severity: str = "medium"
    isTelemedicine: bool = False
    fhirDocumentReferenceId: Optional[str] = None

class ReportSummary(BaseModel):
    """Enhanced report summary for lists."""
    id: str
    bundle_id: Optional[str] = None
    date: str
    time: str
    problem: str  # Chief complaint or specialty
    description: str
    diagnosis: Optional[str] = None
    treatment: Optional[str] = None
    doctor_name: str
    patient_id: str
    doctor: Dict[str, str] = Field(default_factory=dict)  # For frontend compatibility
    
    # Enhanced fields for surgical edits
    clinic_id: str
    specialty: ReportType
    status: ReportStatus
    severity: Priority = Priority.MEDIUM
    is_telemedicine: bool = False
    fhir_document_reference_id: Optional[str] = None
    fhir_diagnostic_report_id: Optional[str] = None

# ============================= Enhanced Clinical Observations and Lab Results =============================

class ClinicalObservation(BaseModel):
    """Enhanced clinical observation or measurement."""
    patient_id: str
    doctor_id: str
    observation_type: ObservationType
    code: str = Field(..., description="LOINC or other standard code")
    display: str = Field(..., description="Human readable name")
    value: Union[str, float, int, bool]
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    status: str = Field("final", pattern=r'^(preliminary|final|amended|cancelled)$')
    observed_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None
    
    # Enhanced fields for surgical edits
    clinic_id: str
    encounter_id: Optional[str] = None
    fhir_observation_id: Optional[str] = None
    fhir_codeable_concept: Optional[FHIRCodeableConcept] = None
    fhir_quantity: Optional[FHIRQuantity] = None
    interpretation: Optional[str] = None  # normal, high, low, etc.

class LabResult(BaseModel):
    """Enhanced laboratory test result."""
    patient_id: str
    test_name: str
    test_code: str
    value: str
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    is_abnormal: bool = False
    result_date: datetime = Field(default_factory=datetime.utcnow)
    lab_name: Optional[str] = None
    ordered_by: str  # Doctor ID
    interpretation: Optional[str] = None
    
    # Enhanced fields for surgical edits
    clinic_id: str
    encounter_id: Optional[str] = None
    fhir_observation_id: Optional[str] = None
    fhir_diagnostic_report_id: Optional[str] = None
    specimen_id: Optional[str] = None
    collection_date: Optional[datetime] = None
    received_date: Optional[datetime] = None
    status: str = Field("final", pattern=r'^(preliminary|final|amended|cancelled)$')

class ImagingResult(BaseModel):
    """Enhanced imaging result."""
    patient_id: str
    study_name: str
    study_code: str
    modality: str = Field(..., pattern=r'^(CT|MRI|X-RAY|ULTRASOUND|PET|SPECT|MAMMOGRAPHY|DEXA)$')
    body_part: str
    findings: str
    impression: str
    study_date: datetime = Field(default_factory=datetime.utcnow)
    ordered_by: str  # Doctor ID
    
    # Enhanced fields for surgical edits
    clinic_id: str
    encounter_id: Optional[str] = None
    fhir_observation_id: Optional[str] = None
    fhir_diagnostic_report_id: Optional[str] = None
    fhir_imaging_study_id: Optional[str] = None
    image_urls: Optional[List[str]] = Field(default_factory=list)
    radiologist: Optional[str] = None
    status: str = Field("final", pattern=r'^(preliminary|final|amended|cancelled)$')

# ============================= Enhanced Search and Filter Models =============================

class ReportFilter(BaseModel):
    """Enhanced report filtering parameters."""
    patient_id: Optional[str] = None
    doctor_id: Optional[str] = None
    clinic_id: Optional[str] = None
    specialty: Optional[ReportType] = None
    status: Optional[ReportStatus] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    severity: Optional[Priority] = None
    is_telemedicine: Optional[bool] = None
    
    @validator('date_to')
    def validate_date_range(cls, v, values):
        if v and values.get('date_from') and v < values['date_from']:
            raise ValueError('End date must be after start date')
        return v

class PrescriptionFilter(BaseModel):
    """Enhanced prescription filtering parameters."""
    patient_id: Optional[str] = None
    doctor_id: Optional[str] = None
    clinic_id: Optional[str] = None
    status: Optional[PrescriptionStatus] = None
    medication_name: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    active_only: bool = False
    is_controlled_substance: Optional[bool] = None
    requires_monitoring: Optional[bool] = None

class MedicalHistoryFilter(BaseModel):
    """Enhanced medical history filtering parameters."""
    patient_id: str
    clinic_id: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    include_reports: bool = True
    include_prescriptions: bool = True
    include_lab_results: bool = True
    include_imaging: bool = True
    include_observations: bool = True

# ============================= Enhanced Statistics and Analytics =============================

class MedicalStats(BaseModel):
    """Enhanced medical data statistics."""
    total_reports: int = 0
    reports_this_month: int = 0
    total_prescriptions: int = 0
    active_prescriptions: int = 0
    prescriptions_this_month: int = 0
    most_common_diagnosis: Optional[str] = None
    most_prescribed_medication: Optional[str] = None
    
    # Enhanced fields for surgical edits
    clinic_id: str
    total_lab_results: int = 0
    total_imaging_studies: int = 0
    total_observations: int = 0
    telemedicine_reports: int = 0
    controlled_substance_prescriptions: int = 0
    average_report_completion_time: Optional[float] = None

class DoctorMedicalStats(MedicalStats):
    """Enhanced doctor-specific medical statistics."""
    doctor_id: str
    doctor_name: str
    specialties_covered: List[str] = Field(default_factory=list)
    average_reports_per_day: float = 0.0
    patient_satisfaction: Optional[float] = None
    
    # Enhanced fields for surgical edits
    total_patients: int = 0
    new_patients: int = 0
    returning_patients: int = 0
    average_appointment_duration: float = 0.0
    prescription_accuracy_rate: Optional[float] = None
    report_approval_rate: Optional[float] = None

# ============================= Enhanced Response Models =============================

class ReportResponse(BaseModel):
    """Enhanced single report response."""
    report: Report
    patient_info: Optional[Dict[str, Any]] = None
    doctor_info: Optional[Dict[str, Any]] = None
    related_reports: Optional[List[ReportSummary]] = None
    related_prescriptions: Optional[List[Prescription]] = None
    vitals_history: Optional[List[ClinicalObservation]] = None
    lab_results: Optional[List[LabResult]] = None
    imaging_results: Optional[List[ImagingResult]] = None

class PrescriptionResponse(BaseModel):
    """Enhanced single prescription response."""
    prescription: Prescription
    patient_info: Optional[Dict[str, Any]] = None
    medication_info: Optional[MedicationDetail] = None
    interactions: Optional[List[str]] = Field(default_factory=list)
    refill_history: Optional[List[Dict[str, Any]]] = None
    pharmacy_info: Optional[Dict[str, Any]] = None

class MedicalHistoryResponse(BaseModel):
    """Enhanced patient medical history response."""
    patient_id: str
    clinic_id: str
    reports: List[ReportSummary] = Field(default_factory=list)
    prescriptions: List[Prescription] = Field(default_factory=list)
    lab_results: List[LabResult] = Field(default_factory=list)
    imaging_results: Optional[List[ImagingResult]] = Field(default_factory=list)
    observations: List[ClinicalObservation] = Field(default_factory=list)
    summary_stats: Optional[MedicalStats] = None
    fhir_bundle_id: Optional[str] = None

# ============================= Enhanced FHIR Integration Models =============================

class FHIRMapping(BaseModel):
    """Enhanced FHIR resource mapping."""
    local_id: str
    fhir_resource_type: str
    fhir_resource_id: str
    last_sync: datetime = Field(default_factory=datetime.utcnow)
    sync_status: str = Field("synced", pattern=r'^(synced|pending|failed|conflict)$')
    clinic_id: str
    sync_errors: Optional[List[str]] = None

class FHIRBundle(BaseModel):
    """Enhanced FHIR Bundle representation."""
    bundle_id: str
    resource_type: str = "Bundle"
    bundle_type: str = "transaction"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    entries: List[Dict[str, Any]] = Field(default_factory=list)
    total_entries: int = 0
    clinic_id: str
    patient_id: str
    doctor_id: str

class FHIRDocumentReference(BaseModel):
    """Enhanced FHIR DocumentReference mapping."""
    fhir_id: str
    local_report_id: str
    document_type: str
    content_type: str = "application/pdf"
    url: Optional[str] = None
    size: Optional[int] = None
    hash: Optional[str] = None
    title: str
    created: datetime
    indexed: datetime
    status: str = Field("current", pattern=r'^(current|superseded|entered-in-error)$')
    clinic_id: str

class FHIRDiagnosticReport(BaseModel):
    """Enhanced FHIR DiagnosticReport mapping."""
    fhir_id: str
    local_report_id: str
    status: str = Field("final", pattern=r'^(registered|partial|preliminary|final|amended|cancelled|entered-in-error|unknown)$')
    category: str
    code: str
    subject: str  # Patient reference
    effective_date_time: datetime
    issued: datetime
    performer: str  # Practitioner reference
    result: Optional[List[str]] = None  # Observation references
    conclusion: Optional[str] = None
    clinic_id: str

# ============================= Enhanced Export and Import Models =============================

class MedicalExportRequest(BaseModel):
    """Enhanced medical export request."""
    patient_ids: Optional[List[str]] = None
    clinic_id: Optional[str] = None
    doctor_id: Optional[str] = None
    export_format: str = Field("json", pattern=r'^(json|csv|xml|fhir|pdf)$')
    include_reports: bool = True
    include_prescriptions: bool = True
    include_lab_results: bool = True
    include_imaging: bool = True
    include_observations: bool = True
    date_range: Optional[Dict[str, date]] = None
    fields: Optional[List[str]] = None

class MedicalImportRequest(BaseModel):
    """Enhanced medical import request."""
    file_url: str
    import_format: str = Field("json", pattern=r'^(json|csv|xml|fhir)$')
    clinic_id: str
    doctor_id: str
    create_fhir_resources: bool = True
    validate_data: bool = True
    overwrite_existing: bool = False

class MedicalBulkUpdateRequest(BaseModel):
    """Enhanced medical bulk update request."""
    report_ids: Optional[List[str]] = None
    prescription_ids: Optional[List[str]] = None
    updates: Dict[str, Any]
    clinic_id: str
    doctor_id: str
    reason: str
    notify_patients: bool = False
    create_audit_log: bool = True
