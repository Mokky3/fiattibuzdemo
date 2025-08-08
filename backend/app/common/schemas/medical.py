# app/common/schemas/medical.py
"""
Medical-related schemas for the EHR system
Includes reports, prescriptions, and clinical data models
Based on doctor portal router models
"""
from datetime import datetime, date
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from enum import Enum

from app.common.schemas.base import TimestampMixin, FHIRMeta


# ──────────────────────────────────────────────────────────────────────────────
# Medical Enums
# ──────────────────────────────────────────────────────────────────────────────

class ReportType(str, Enum):
    GENERAL = "general"
    MIDWIFERY = "midwifery & gynecology"
    CARDIOLOGY = "cardiology"
    NEUROLOGY = "neurology"
    OPHTHALMOLOGY = "ophthalmology"
    TRAUMATOLOGY = "traumatology"
    UROLOGY = "urology"
    ONCOLOGY = "general oncology"
    ALLERGOLOGY = "allergology"


class ReportStatus(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    ARCHIVED = "archived"
    CANCELLED = "cancelled"


class PrescriptionStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    ON_HOLD = "on_hold"


class MedicationFrequency(str, Enum):
    ONCE_DAILY = "once_daily"
    TWICE_DAILY = "twice_daily"
    THREE_TIMES_DAILY = "three_times_daily"
    FOUR_TIMES_DAILY = "four_times_daily"
    AS_NEEDED = "as_needed"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class ObservationType(str, Enum):
    VITAL_SIGNS = "vital_signs"
    LAB_RESULT = "lab_result"
    IMAGING = "imaging"
    ASSESSMENT = "assessment"
    PROCEDURE = "procedure"


# ──────────────────────────────────────────────────────────────────────────────
# Insurance and Emergency Contact (moved from base)
# ──────────────────────────────────────────────────────────────────────────────

class InsuranceInfo(BaseModel):
    """Insurance information schema."""
    provider: str
    policy_number: str = Field(..., alias="policyNumber")
    group_number: Optional[str] = Field(None, alias="groupNumber")
    holder_name: str = Field(..., alias="holderName")
    holder_relationship: Optional[str] = Field(None, alias="holderRelationship")
    valid_from: Optional[str] = Field(None, alias="validFrom")
    valid_to: Optional[str] = Field(None, alias="validTo")
    
    class Config:
        populate_by_name = True


class EmergencyContact(BaseModel):
    """Emergency contact information."""
    name: str
    relationship: str
    phone_primary: str = Field(..., alias="phonePrimary")
    phone_secondary: Optional[str] = Field(None, alias="phoneSecondary")
    email: Optional[str] = None
    address: Optional[str] = None
    
    class Config:
        populate_by_name = True


# ──────────────────────────────────────────────────────────────────────────────
# Medication Models
# ──────────────────────────────────────────────────────────────────────────────

class Medication(BaseModel):
    """Individual medication model"""
    name: str = Field(..., min_length=1, max_length=200)
    dosage: str = Field(..., description="Medication dosage (e.g., '50mg', '1 tablet')")
    frequency: str = Field(..., description="How often to take (e.g., 'Once daily')")
    duration: str = Field(..., description="How long to take (e.g., '7 days', '1 month')")
    instructions: Optional[str] = Field(None, max_length=500, description="Special instructions")
    

class MedicationCreate(Medication):
    """Schema for creating medications"""
    rxnorm_code: Optional[str] = Field(None, description="RxNorm medication code")
    generic_name: Optional[str] = Field(None, description="Generic medication name")
    brand_name: Optional[str] = Field(None, description="Brand medication name")


class MedicationDetail(Medication):
    """Detailed medication with additional fields"""
    id: Optional[str] = None
    rxnorm_code: Optional[str] = None
    generic_name: Optional[str] = None
    brand_name: Optional[str] = None
    route_of_administration: Optional[str] = None
    strength: Optional[str] = None
    form: Optional[str] = None  # tablet, capsule, liquid, etc.
    contraindications: Optional[List[str]] = Field(default_factory=list)
    side_effects: Optional[List[str]] = Field(default_factory=list)


# ──────────────────────────────────────────────────────────────────────────────
# Medical History and Allergies (simplified from base)
# ──────────────────────────────────────────────────────────────────────────────

class MedicalHistory(BaseModel):
    """Medical history record."""
    condition: str
    diagnosed_date: Optional[str] = Field(None, alias="diagnosedDate")
    status: str = "active"  # active, resolved, chronic
    notes: Optional[str] = None
    
    class Config:
        populate_by_name = True


class Allergy(BaseModel):
    """Allergy information."""
    allergen: str
    reaction: str
    severity: str = Field(..., pattern="^(mild|moderate|severe|life-threatening)$")
    onset_date: Optional[str] = Field(None, alias="onsetDate")
    notes: Optional[str] = None
    
    class Config:
        populate_by_name = True


# ──────────────────────────────────────────────────────────────────────────────
# Vital Signs
# ──────────────────────────────────────────────────────────────────────────────

class VitalSigns(BaseModel):
    """Vital signs measurement."""
    blood_pressure_systolic: Optional[int] = Field(None, alias="bloodPressureSystolic", ge=0, le=300)
    blood_pressure_diastolic: Optional[int] = Field(None, alias="bloodPressureDiastolic", ge=0, le=200)
    heart_rate: Optional[int] = Field(None, alias="heartRate", ge=0, le=300)
    temperature: Optional[float] = Field(None, alias="temperature", ge=95.0, le=110.0)
    respiratory_rate: Optional[int] = Field(None, alias="respiratoryRate", ge=0, le=100)
    oxygen_saturation: Optional[int] = Field(None, alias="oxygenSaturation", ge=0, le=100)
    weight: Optional[float] = Field(None, ge=0)
    height: Optional[float] = Field(None, ge=0)
    bmi: Optional[float] = Field(None, ge=0)
    measured_at: datetime = Field(default_factory=datetime.utcnow, alias="measuredAt")
    measured_by: str = Field(..., alias="measuredBy")
    
    class Config:
        populate_by_name = True
    
    @validator('bmi', always=True)
    def calculate_bmi(cls, v, values):
        if v is None and 'weight' in values and 'height' in values:
            weight = values.get('weight')
            height = values.get('height')
            if weight and height and height > 0:
                # Convert height from cm to m and calculate BMI
                height_m = height / 100
                return round(weight / (height_m ** 2), 1)
        return v


# ──────────────────────────────────────────────────────────────────────────────
# Prescription Models
# ──────────────────────────────────────────────────────────────────────────────

class PrescriptionBase(BaseModel):
    """Base prescription model"""
    patient_id: str
    medication_name: str = Field(..., min_length=1, max_length=200)
    dosage: str = Field(..., description="Medication dosage")
    frequency: str = Field(..., description="Frequency of administration")
    duration: str = Field(..., description="Duration of treatment")
    instructions: Optional[str] = Field(None, max_length=1000)
    status: PrescriptionStatus = PrescriptionStatus.ACTIVE


class PrescriptionCreate(PrescriptionBase):
    """Schema for creating prescriptions"""
    quantity: Optional[int] = Field(None, ge=1, description="Quantity to dispense")
    refills: Optional[int] = Field(0, ge=0, le=12, description="Number of refills allowed")
    pharmacy_id: Optional[str] = None
    urgent: bool = False


class PrescriptionUpdate(BaseModel):
    """Schema for updating prescriptions"""
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration: Optional[str] = None
    instructions: Optional[str] = None
    status: Optional[PrescriptionStatus] = None
    refills: Optional[int] = Field(None, ge=0, le=12)


class Prescription(PrescriptionBase, TimestampMixin):
    """Complete prescription model"""
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
    
    # FHIR integration
    fhir_medication_request_id: Optional[str] = None
    
    # Tracking
    last_dispensed: Optional[datetime] = None
    next_refill_date: Optional[date] = None
    is_controlled_substance: bool = False


class PrescriptionDTO(BaseModel):
    """Frontend-compatible prescription model"""
    id: str
    patient_id: str
    medication_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None
    prescribed_date: str  # ISO date string
    status: str
    doctor_name: str


# ──────────────────────────────────────────────────────────────────────────────
# Report Models
# ──────────────────────────────────────────────────────────────────────────────

class FollowUp(BaseModel):
    """Follow-up information"""
    reason: str = Field(..., description="Reason for follow-up")
    date: str = Field(..., description="Follow-up date")
    instructions: Optional[str] = None


class Doctor(BaseModel):
    """Doctor information for reports"""
    name: str
    specialty: str
    department: str
    license_number: Optional[str] = None


class ReportBase(BaseModel):
    """Base report model"""
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


class CreateReport(BaseModel):
    """Schema for creating reports (frontend compatibility)"""
    patientId: str  # camelCase for frontend
    specialty: str
    code: str
    data: Dict[str, Any]  # Form data from frontend


class ReportCreate(ReportBase):
    """Schema for creating reports"""
    medications: List[MedicationCreate] = Field(default_factory=list)
    follow_up: Optional[FollowUp] = None
    attachments: Optional[List[str]] = Field(default_factory=list)
    template_used: Optional[str] = None


class Report(ReportBase, TimestampMixin):
    """Complete report model"""
    id: str
    status: ReportStatus = ReportStatus.DRAFT
    report_date: datetime = Field(default_factory=datetime.utcnow)
    
    # Content
    medications: List[MedicationDetail] = Field(default_factory=list)
    follow_up: Optional[FollowUp] = None
    
    # Metadata
    doctor_name: str
    doctor_specialty: str
    template_used: Optional[str] = None
    
    # FHIR integration
    fhir_questionnaire_response_id: Optional[str] = None
    fhir_bundle_id: Optional[str] = None
    
    # Workflow
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None


class ReportView(BaseModel):
    """UI-friendly report model for ViewReport component"""
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


class ReportSummary(BaseModel):
    """Report summary for lists"""
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


# ──────────────────────────────────────────────────────────────────────────────
# Clinical Observations and Lab Results
# ──────────────────────────────────────────────────────────────────────────────

class ClinicalObservation(BaseModel):
    """Clinical observation or measurement"""
    patient_id: str
    doctor_id: str
    observation_type: ObservationType
    code: str = Field(..., description="LOINC or other standard code")
    display: str = Field(..., description="Human readable name")
    value: Union[str, float, int, bool]
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    status: str = Field("final", pattern="^(preliminary|final|amended|cancelled)$")
    observed_at: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None


class LabResult(BaseModel):
    """Laboratory test result"""
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


# ──────────────────────────────────────────────────────────────────────────────
# Search and Filter Models
# ──────────────────────────────────────────────────────────────────────────────

class ReportFilter(BaseModel):
    """Report filtering parameters"""
    patient_id: Optional[str] = None
    doctor_id: Optional[str] = None
    specialty: Optional[ReportType] = None
    status: Optional[ReportStatus] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    
    @validator('date_to')
    def validate_date_range(cls, v, values):
        if v and values.get('date_from') and v < values['date_from']:
            raise ValueError('End date must be after start date')
        return v


class PrescriptionFilter(BaseModel):
    """Prescription filtering parameters"""
    patient_id: Optional[str] = None
    doctor_id: Optional[str] = None
    status: Optional[PrescriptionStatus] = None
    medication_name: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    active_only: bool = False


# ──────────────────────────────────────────────────────────────────────────────
# Statistics and Analytics
# ──────────────────────────────────────────────────────────────────────────────

class MedicalStats(BaseModel):
    """Medical data statistics"""
    total_reports: int = 0
    reports_this_month: int = 0
    total_prescriptions: int = 0
    active_prescriptions: int = 0
    prescriptions_this_month: int = 0
    most_common_diagnosis: Optional[str] = None
    most_prescribed_medication: Optional[str] = None


class DoctorMedicalStats(MedicalStats):
    """Doctor-specific medical statistics"""
    doctor_id: str
    doctor_name: str
    specialties_covered: List[str] = Field(default_factory=list)
    average_reports_per_day: float = 0.0
    patient_satisfaction: Optional[float] = None


# ──────────────────────────────────────────────────────────────────────────────
# Response Models
# ──────────────────────────────────────────────────────────────────────────────

class ReportResponse(BaseModel):
    """Single report response"""
    report: Report
    patient_info: Optional[Dict[str, Any]] = None
    related_reports: Optional[List[ReportSummary]] = None
    related_prescriptions: Optional[List[Prescription]] = None


class PrescriptionResponse(BaseModel):
    """Single prescription response"""
    prescription: Prescription
    patient_info: Optional[Dict[str, Any]] = None
    medication_info: Optional[MedicationDetail] = None
    interactions: Optional[List[str]] = Field(default_factory=list)


class MedicalHistoryResponse(BaseModel):
    """Patient medical history response"""
    patient_id: str
    reports: List[ReportSummary] = Field(default_factory=list)
    prescriptions: List[Prescription] = Field(default_factory=list)
    lab_results: List[LabResult] = Field(default_factory=list)
    observations: List[ClinicalObservation] = Field(default_factory=list)
    summary_stats: Optional[MedicalStats] = None


# ──────────────────────────────────────────────────────────────────────────────
# FHIR Integration Models
# ──────────────────────────────────────────────────────────────────────────────

class FHIRMapping(BaseModel):
    """FHIR resource mapping"""
    local_id: str
    fhir_resource_type: str
    fhir_resource_id: str
    last_sync: datetime = Field(default_factory=datetime.utcnow)
    sync_status: str = Field("synced", pattern="^(synced|pending|failed|conflict)$")
    

class FHIRBundle(BaseModel):
    """FHIR Bundle representation"""
    bundle_id: str
    resource_type: str = "Bundle"
    bundle_type: str = "transaction"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    entries: List[Dict[str, Any]] = Field(default_factory=list)
    total_entries: int = 0