"""Enhanced Doctor portal medical reports schemas for surgical edits integration."""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

# ================================
# Enhanced Medical Reports Schemas
# ================================

class ReportTypeEnum(str, Enum):
    CONSULTATION = "consultation"
    LAB_RESULT = "lab_result"
    IMAGING = "imaging"
    PROCEDURE = "procedure"
    DISCHARGE = "discharge"
    REFERRAL = "referral"
    PRESCRIPTION = "prescription"

class ReportStatusEnum(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    SIGNED = "signed"
    FINAL = "final"
    CANCELLED = "cancelled"

class SpecialtyEnum(str, Enum):
    GENERAL_MEDICINE = "general_medicine"
    CARDIOLOGY = "cardiology"
    DERMATOLOGY = "dermatology"
    ENDOCRINOLOGY = "endocrinology"
    GASTROENTEROLOGY = "gastroenterology"
    HEMATOLOGY = "hematology"
    INFECTIOUS_DISEASE = "infectious_disease"
    NEPHROLOGY = "nephrology"
    NEUROLOGY = "neurology"
    ONCOLOGY = "oncology"
    OPHTHALMOLOGY = "ophthalmology"
    PEDIATRICS = "pediatrics"
    PSYCHIATRY = "psychiatry"
    PULMONOLOGY = "pulmonology"
    RADIOLOGY = "radiology"
    SURGERY = "surgery"
    UROLOGY = "urology"

class CreateReportRequest(BaseModel):
    """Enhanced report creation request."""
    patient_id: str = Field(..., description="Patient ID")
    specialty: SpecialtyEnum = Field(..., description="Medical specialty")
    code: str = Field(..., min_length=1, max_length=20, description="Report code e.g. '#025'")
    data: Dict[str, Any] = Field(..., description="Report form data")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    report_type: ReportTypeEnum = Field(ReportTypeEnum.CONSULTATION, description="Report type")
    title: Optional[str] = Field(None, description="Report title")
    description: Optional[str] = Field(None, description="Report description")
    is_lab_report: bool = Field(False, description="Is this a lab report")
    is_imaging_report: bool = Field(False, description="Is this an imaging report")

    @validator('code')
    def _validate_report_code(cls, v):
        if v:
            v = v.strip()
            if len(v) == 0:
                raise ValueError('Report code cannot be empty')
            if len(v) > 20:
                raise ValueError('Report code cannot exceed 20 characters')
            import re
            if not re.match(r'^[a-zA-Z0-9#\-_]+$', v):
                raise ValueError('Report code contains invalid characters')
        return v

    @validator('data')
    def _validate_report_data(cls, v):
        if not isinstance(v, dict) or len(v) == 0:
            raise ValueError('Report data must be a non-empty dictionary')
        return v

class ReportSummary(BaseModel):
    """Enhanced report summary."""
    id: str = Field(..., description="DocumentReference ID")
    bundle_id: str = Field(..., description="FHIR Bundle ID")
    date: str = Field(..., description="Report date")
    doctor: Dict[str, str] = Field(..., description="Doctor information")
    patient: Dict[str, str] = Field(..., description="Patient information")
    specialty: str = Field(..., description="Medical specialty")
    code: str = Field(..., description="Report code")
    title: str = Field(..., description="Report title")
    status: str = Field(..., description="Report status")
    report_type: str = Field(..., description="Report type")
    fhir_document_reference_id: Optional[str] = Field(None, description="FHIR DocumentReference ID")
    fhir_binary_id: Optional[str] = Field(None, description="FHIR Binary ID for PDF")
    fhir_diagnostic_report_id: Optional[str] = Field(None, description="FHIR DiagnosticReport ID if lab/imaging")
    clinic_id: str = Field(..., description="Clinic ID")
    doctor_id: str = Field(..., description="Doctor ID")
    doc_type: Optional[str] = Field(None, description="Document type (e.g., oph.initial, neu.initial, oph.discharge)")

class VitalsData(BaseModel):
    """Enhanced vitals data for reports."""
    blood_pressure: Optional[str] = Field(None, description="Blood pressure e.g. '120/80'")
    temperature: Optional[str] = Field(None, description="Temperature e.g. '36.6°C'")
    heart_rate: Optional[str] = Field(None, description="Heart rate e.g. '72 bpm'")
    respiratory_rate: Optional[str] = Field(None, description="Respiratory rate e.g. '16/min'")
    oxygen_saturation: Optional[str] = Field(None, description="Oxygen saturation e.g. '98%'")
    height: Optional[str] = Field(None, description="Height e.g. '175 cm'")
    weight: Optional[str] = Field(None, description="Weight e.g. '70 kg'")
    bmi: Optional[str] = Field(None, description="BMI e.g. '22.9'")
    measured_at: str = Field(..., description="Measurement timestamp")

    @validator('blood_pressure')
    def _validate_blood_pressure(cls, v):
        if v:
            import re
            if not re.match(r'^\d{2,3}/\d{2,3}(\s*(mmHg|mm Hg))?$', v):
                raise ValueError('Blood pressure must be in format "120/80" or "120/80 mmHg"')
        return v

    @validator('temperature')
    def _validate_temperature(cls, v):
        if v:
            import re
            if not re.match(r'^\d{1,3}\.?\d*\s*[°]?[CF]$', v):
                raise ValueError('Temperature must be in format "36.6°C" or "98.6°F"')
        return v

class CreateVitalsRequest(BaseModel):
    """Request payload to create vitals observations."""
    patient_id: str = Field(..., description="Patient ID")
    vitals: VitalsData = Field(..., description="Vital signs data")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    encounter_id: Optional[str] = Field(None, description="Associated encounter ID")

class LabData(BaseModel):
    """Enhanced lab data for reports."""
    test_name: str = Field(..., description="Lab test name")
    result_value: str = Field(..., description="Test result value")
    unit: Optional[str] = Field(None, description="Result unit")
    reference_range: Optional[str] = Field(None, description="Reference range")
    status: str = Field(..., description="Test status: normal, abnormal, critical")
    notes: Optional[str] = Field(None, description="Additional notes")
    test_date: str = Field(..., description="Test date")
    lab_name: Optional[str] = Field(None, description="Laboratory name")

class ImagingData(BaseModel):
    """Enhanced imaging data for reports."""
    study_type: str = Field(..., description="Imaging study type")
    body_part: str = Field(..., description="Body part examined")
    findings: str = Field(..., description="Imaging findings")
    impression: str = Field(..., description="Radiologist impression")
    recommendations: Optional[str] = Field(None, description="Recommendations")
    study_date: str = Field(..., description="Study date")
    radiologist: Optional[str] = Field(None, description="Radiologist name")

class ReportData(BaseModel):
    """Enhanced report data structure."""
    # Basic information
    chief_complaint: Optional[str] = Field(None, description="Chief complaint")
    history_present_illness: Optional[str] = Field(None, description="History of present illness")
    physical_examination: Optional[str] = Field(None, description="Physical examination findings")
    assessment: Optional[str] = Field(None, description="Clinical assessment")
    plan: Optional[str] = Field(None, description="Treatment plan")
    
    # Vitals
    vitals: Optional[VitalsData] = Field(None, description="Vital signs data")
    
    # Lab results
    lab_results: List[LabData] = Field(default_factory=list, description="Laboratory results")
    
    # Imaging results
    imaging_results: List[ImagingData] = Field(default_factory=list, description="Imaging results")
    
    # Medications
    medications: List[Dict[str, Any]] = Field(default_factory=list, description="Prescribed medications")
    
    # Procedures
    procedures: List[Dict[str, Any]] = Field(default_factory=list, description="Performed procedures")
    
    # Follow-up
    follow_up_instructions: Optional[str] = Field(None, description="Follow-up instructions")
    next_appointment: Optional[str] = Field(None, description="Next appointment date")
    
    # Additional notes
    clinical_notes: Optional[str] = Field(None, description="Clinical notes")
    patient_education: Optional[str] = Field(None, description="Patient education")

class ReportResponse(BaseModel):
    """Enhanced report response."""
    id: str = Field(..., description="Report ID")
    bundle_id: str = Field(..., description="FHIR Bundle ID")
    patient_id: str = Field(..., description="Patient ID")
    doctor_id: str = Field(..., description="Doctor ID")
    clinic_id: str = Field(..., description="Clinic ID")
    
    # Report details
    specialty: str = Field(..., description="Medical specialty")
    code: str = Field(..., description="Report code")
    title: str = Field(..., description="Report title")
    description: Optional[str] = Field(None, description="Report description")
    report_type: str = Field(..., description="Report type")
    status: str = Field(..., description="Report status")
    
    # Report data
    data: ReportData = Field(..., description="Report data")
    
    # FHIR integration
    fhir_document_reference_id: Optional[str] = Field(None, description="FHIR DocumentReference ID")
    fhir_binary_id: Optional[str] = Field(None, description="FHIR Binary ID for PDF")
    fhir_diagnostic_report_id: Optional[str] = Field(None, description="FHIR DiagnosticReport ID")
    fhir_observation_ids: List[str] = Field(default_factory=list, description="FHIR Observation IDs for vitals")
    
    # System fields
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    signed_at: Optional[str] = Field(None, description="Signature timestamp")
    
    # Patient and doctor info
    patient_name: str = Field(..., description="Patient name")
    doctor_name: str = Field(..., description="Doctor name")

class ReportUpdateRequest(BaseModel):
    """Enhanced report update request."""
    title: Optional[str] = Field(None, description="Updated report title")
    description: Optional[str] = Field(None, description="Updated report description")
    data: Optional[ReportData] = Field(None, description="Updated report data")
    status: Optional[ReportStatusEnum] = Field(None, description="Updated report status")
    clinic_id: str = Field(..., description="Clinic ID for scoping")

class ReportSearch(BaseModel):
    """Enhanced report search parameters."""
    patient_id: Optional[str] = Field(None, description="Filter by patient ID")
    specialty: Optional[SpecialtyEnum] = Field(None, description="Filter by specialty")
    report_type: Optional[ReportTypeEnum] = Field(None, description="Filter by report type")
    status: Optional[ReportStatusEnum] = Field(None, description="Filter by status")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    
    # Date filters
    date_from: Optional[str] = Field(None, description="Filter from date YYYY-MM-DD")
    date_to: Optional[str] = Field(None, description="Filter to date YYYY-MM-DD")
    
    # Search
    search_query: Optional[str] = Field(None, min_length=2, description="Search in report title or content")
    
    # Pagination
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Page size")
    
    # Sorting
    sort_by: str = Field("created_at", pattern=r'^(created_at|updated_at|date|title|status)$')
    sort_order: str = Field("desc", pattern=r'^(asc|desc)$')

class ReportStats(BaseModel):
    """Enhanced report statistics."""
    total_reports: int = Field(..., description="Total reports created")
    reports_today: int = Field(..., description="Reports created today")
    reports_this_week: int = Field(..., description="Reports created this week")
    reports_this_month: int = Field(..., description="Reports created this month")
    pending_reviews: int = Field(..., description="Reports pending review")
    signed_reports: int = Field(..., description="Signed reports")
    reports_by_specialty: Dict[str, int] = Field(..., description="Reports count by specialty")
    reports_by_type: Dict[str, int] = Field(..., description="Reports count by type")
    clinic_id: str = Field(..., description="Clinic ID")
    doctor_id: str = Field(..., description="Doctor ID")

class ReportTemplate(BaseModel):
    """Enhanced report template."""
    id: str = Field(..., description="Template ID")
    name: str = Field(..., description="Template name")
    specialty: SpecialtyEnum = Field(..., description="Medical specialty")
    report_type: ReportTypeEnum = Field(..., description="Report type")
    template_data: Dict[str, Any] = Field(..., description="Template data structure")
    clinic_id: str = Field(..., description="Clinic ID")
    doctor_id: str = Field(..., description="Doctor ID")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    usage_count: int = Field(0, description="Usage count")
    is_public: bool = Field(False, description="Is public template")

class ReportSignature(BaseModel):
    """Report signature request."""
    report_id: str = Field(..., description="Report ID")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    signature_data: str = Field(..., description="Digital signature data")
    signature_method: str = Field("digital", description="Signature method")
    notes: Optional[str] = Field(None, description="Signature notes")

class ReportExport(BaseModel):
    """Report export request."""
    report_ids: List[str] = Field(..., description="Report IDs to export")
    format: str = Field("pdf", pattern=r'^(pdf|docx|html)$', description="Export format")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    include_signatures: bool = Field(True, description="Include digital signatures")

class ReportExportResponse(BaseModel):
    """Report export response."""
    export_id: str = Field(..., description="Export job ID")
    format: str = Field(..., description="Export format")
    report_count: int = Field(..., description="Number of reports exported")
    file_url: str = Field(..., description="Download URL")
    expires_at: str = Field(..., description="Export expiration date")
    created_at: str = Field(..., description="Export creation date")

# Note: validators are defined within classes above for Pydantic compatibility
