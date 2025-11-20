"""Enhanced Patient portal medical records schemas for surgical edits integration."""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

# ================================
# Enhanced Medical Records Schemas
# ================================

class RecordTypeEnum(str, Enum):
    CONSULTATION = "consultation"
    LAB_RESULT = "lab_result"
    IMAGING = "imaging"
    PROCEDURE = "procedure"
    DISCHARGE = "discharge"
    REFERRAL = "referral"
    PRESCRIPTION = "prescription"
    VITAL_SIGNS = "vital_signs"
    IMMUNIZATION = "immunization"

class RecordStatusEnum(str, Enum):
    DRAFT = "draft"
    FINAL = "final"
    AMENDED = "amended"
    CANCELLED = "cancelled"
    ENTERED_IN_ERROR = "entered-in-error"

class PriorityEnum(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class VitalSignsRecord(BaseModel):
    """Enhanced vital signs record."""
    id: str = Field(..., description="Record ID")
    type: str = Field("vital_signs", description="Record type")
    date: str = Field(..., description="Record date YYYY-MM-DD")
    doctor: str = Field(..., description="Doctor name")
    clinic: str = Field(..., description="Clinic name")
    vitals: Dict[str, Any] = Field(..., description="Vital signs data")
    notes: Optional[str] = Field(None, description="Additional notes")
    fhir_observation_ids: List[str] = Field(default_factory=list, description="FHIR Observation IDs")
    clinic_id: str = Field(..., description="Clinic ID")

class LabResultRecord(BaseModel):
    """Enhanced lab result record."""
    id: str = Field(..., description="Record ID")
    type: str = Field("lab_result", description="Record type")
    date: str = Field(..., description="Test date YYYY-MM-DD")
    doctor: str = Field(..., description="Ordering doctor")
    clinic: str = Field(..., description="Clinic name")
    test_name: str = Field(..., description="Lab test name")
    results: Dict[str, Any] = Field(..., description="Test results")
    reference_range: Optional[str] = Field(None, description="Reference range")
    status: str = Field(..., description="Result status: normal|abnormal|critical")
    lab_name: Optional[str] = Field(None, description="Laboratory name")
    notes: Optional[str] = Field(None, description="Additional notes")
    fhir_diagnostic_report_id: Optional[str] = Field(None, description="FHIR DiagnosticReport ID")
    clinic_id: str = Field(..., description="Clinic ID")

class ImagingRecord(BaseModel):
    """Enhanced imaging record."""
    id: str = Field(..., description="Record ID")
    type: str = Field("imaging", description="Record type")
    date: str = Field(..., description="Study date YYYY-MM-DD")
    doctor: str = Field(..., description="Ordering doctor")
    clinic: str = Field(..., description="Clinic name")
    study_type: str = Field(..., description="Imaging study type")
    body_part: str = Field(..., description="Body part examined")
    findings: str = Field(..., description="Imaging findings")
    impression: str = Field(..., description="Radiologist impression")
    recommendations: Optional[str] = Field(None, description="Recommendations")
    radiologist: Optional[str] = Field(None, description="Radiologist name")
    notes: Optional[str] = Field(None, description="Additional notes")
    fhir_diagnostic_report_id: Optional[str] = Field(None, description="FHIR DiagnosticReport ID")
    fhir_document_reference_id: Optional[str] = Field(None, description="FHIR DocumentReference ID")
    clinic_id: str = Field(..., description="Clinic ID")

class ConsultationRecord(BaseModel):
    """Enhanced consultation record."""
    id: str = Field(..., description="Record ID")
    type: str = Field("consultation", description="Record type")
    date: str = Field(..., description="Consultation date YYYY-MM-DD")
    doctor: str = Field(..., description="Doctor name")
    clinic: str = Field(..., description="Clinic name")
    chief_complaint: str = Field(..., description="Chief complaint")
    diagnosis: List[str] = Field(..., description="Diagnoses")
    treatment_plan: str = Field(..., description="Treatment plan")
    medications: List[str] = Field(default_factory=list, description="Prescribed medications")
    follow_up: Optional[str] = Field(None, description="Follow-up instructions")
    notes: Optional[str] = Field(None, description="Additional notes")
    fhir_encounter_id: Optional[str] = Field(None, description="FHIR Encounter ID")
    clinic_id: str = Field(..., description="Clinic ID")

class ProcedureRecord(BaseModel):
    """Enhanced procedure record."""
    id: str = Field(..., description="Record ID")
    type: str = Field("procedure", description="Record type")
    date: str = Field(..., description="Procedure date YYYY-MM-DD")
    doctor: str = Field(..., description="Performing doctor")
    clinic: str = Field(..., description="Clinic name")
    procedure_name: str = Field(..., description="Procedure name")
    procedure_code: Optional[str] = Field(None, description="Procedure code")
    indication: str = Field(..., description="Procedure indication")
    findings: Optional[str] = Field(None, description="Procedure findings")
    complications: Optional[str] = Field(None, description="Complications")
    follow_up: Optional[str] = Field(None, description="Follow-up instructions")
    notes: Optional[str] = Field(None, description="Additional notes")
    fhir_procedure_id: Optional[str] = Field(None, description="FHIR Procedure ID")
    clinic_id: str = Field(..., description="Clinic ID")

class MedicalRecord(BaseModel):
    """Enhanced medical record union type."""
    id: str = Field(..., description="Record ID")
    type: RecordTypeEnum = Field(..., description="Record type")
    date: str = Field(..., description="Record date YYYY-MM-DD")
    doctor: str = Field(..., description="Doctor name")
    clinic: str = Field(..., description="Clinic name")
    title: str = Field(..., description="Record title")
    summary: str = Field(..., description="Record summary")
    status: RecordStatusEnum = Field(..., description="Record status")
    priority: PriorityEnum = Field(PriorityEnum.NORMAL, description="Record priority")
    notes: Optional[str] = Field(None, description="Additional notes")
    attachments: List[Dict[str, Any]] = Field(default_factory=list, description="Record attachments")
    fhir_resource_ids: List[str] = Field(default_factory=list, description="FHIR resource IDs")
    clinic_id: str = Field(..., description="Clinic ID")
    patient_id: str = Field(..., description="Patient ID")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")

class RecordsListResponse(BaseModel):
    """Enhanced records list response."""
    records: List[MedicalRecord] = Field(..., description="List of medical records")
    total: int = Field(..., description="Total number of records")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    total_pages: int = Field(..., description="Total number of pages")

class RecordsSearchRequest(BaseModel):
    """Enhanced records search request."""
    record_type: Optional[RecordTypeEnum] = Field(None, description="Filter by record type")
    doctor: Optional[str] = Field(None, min_length=2, description="Filter by doctor name")
    clinic: Optional[str] = Field(None, min_length=2, description="Filter by clinic name")
    status: Optional[RecordStatusEnum] = Field(None, description="Filter by status")
    priority: Optional[PriorityEnum] = Field(None, description="Filter by priority")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    
    # Date filters
    date_from: Optional[str] = Field(None, description="Filter from date YYYY-MM-DD")
    date_to: Optional[str] = Field(None, description="Filter to date YYYY-MM-DD")
    
    # Search
    search_query: Optional[str] = Field(None, min_length=2, description="Search in record content")
    
    # Pagination
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Page size")
    
    # Sorting
    sort_by: str = Field("date", pattern=r'^(date|created_at|updated_at|title|doctor|clinic)$')
    sort_order: str = Field("desc", pattern=r'^(asc|desc)$')

class RecordsStats(BaseModel):
    """Enhanced records statistics."""
    total_records: int = Field(..., description="Total medical records")
    records_this_month: int = Field(..., description="Records this month")
    records_this_year: int = Field(..., description="Records this year")
    records_by_type: Dict[str, int] = Field(..., description="Records count by type")
    records_by_status: Dict[str, int] = Field(..., description="Records count by status")
    records_by_priority: Dict[str, int] = Field(..., description="Records count by priority")
    most_recent_record: Optional[str] = Field(None, description="Most recent record date")
    records_with_attachments: int = Field(..., description="Records with attachments")
    clinic_id: str = Field(..., description="Clinic ID")
    patient_id: str = Field(..., description="Patient ID")

class RecordExportRequest(BaseModel):
    """Record export request."""
    record_ids: Optional[List[str]] = Field(None, description="Specific record IDs to export")
    record_types: Optional[List[RecordTypeEnum]] = Field(None, description="Record types to export")
    format: str = Field("pdf", pattern=r'^(pdf|json|csv)$', description="Export format")
    include_attachments: bool = Field(True, description="Include attachments")
    date_from: Optional[str] = Field(None, description="Export from date YYYY-MM-DD")
    date_to: Optional[str] = Field(None, description="Export to date YYYY-MM-DD")
    clinic_id: str = Field(..., description="Clinic ID for scoping")

class RecordExportResponse(BaseModel):
    """Record export response."""
    export_id: str = Field(..., description="Export job ID")
    format: str = Field(..., description="Export format")
    record_count: int = Field(..., description="Number of records exported")
    file_url: str = Field(..., description="Download URL")
    expires_at: str = Field(..., description="Export expiration date")
    created_at: str = Field(..., description="Export creation date")

class RecordShareRequest(BaseModel):
    """Record sharing request."""
    record_id: str = Field(..., description="Record ID to share")
    recipient_email: str = Field(..., description="Recipient email address")
    recipient_name: Optional[str] = Field(None, description="Recipient name")
    access_level: str = Field("view", pattern=r'^(view|download)$', description="Access level")
    expires_at: Optional[str] = Field(None, description="Share expiration date YYYY-MM-DD")
    message: Optional[str] = Field(None, description="Share message")
    clinic_id: str = Field(..., description="Clinic ID for scoping")

class RecordShareResponse(BaseModel):
    """Record sharing response."""
    share_id: str = Field(..., description="Share ID")
    record_id: str = Field(..., description="Record ID")
    recipient_email: str = Field(..., description="Recipient email")
    access_level: str = Field(..., description="Access level")
    share_url: str = Field(..., description="Share URL")
    expires_at: Optional[str] = Field(None, description="Share expiration date")
    created_at: str = Field(..., description="Share creation date")

class RecordAccessLog(BaseModel):
    """Record access log."""
    access_id: str = Field(..., description="Access log ID")
    record_id: str = Field(..., description="Record ID")
    accessed_by: str = Field(..., description="User who accessed")
    access_type: str = Field(..., description="Access type: view|download|share")
    access_date: str = Field(..., description="Access date")
    ip_address: Optional[str] = Field(None, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")

# ================================
# Enhanced Validators
# ================================

@validator('date')
def validate_record_date(cls, v):
    """Validate record date format."""
    if v:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError('Record date must be in YYYY-MM-DD format')
    return v

@validator('vitals')
def validate_vitals_data(cls, v):
    """Validate vitals data structure."""
    if v:
        if not isinstance(v, dict):
            raise ValueError('Vitals data must be a dictionary')
        if len(v) == 0:
            raise ValueError('Vitals data cannot be empty')
    return v

@validator('results')
def validate_lab_results(cls, v):
    """Validate lab results data structure."""
    if v:
        if not isinstance(v, dict):
            raise ValueError('Lab results must be a dictionary')
        if len(v) == 0:
            raise ValueError('Lab results cannot be empty')
    return v

@validator('diagnosis')
def validate_diagnosis_list(cls, v):
    """Validate diagnosis list."""
    if v:
        for diagnosis in v:
            if not isinstance(diagnosis, str):
                raise ValueError('All diagnoses must be strings')
            if len(diagnosis.strip()) == 0:
                raise ValueError('Diagnosis cannot be empty')
    return v

@validator('medications')
def validate_medications_list(cls, v):
    """Validate medications list."""
    if v:
        for medication in v:
            if not isinstance(medication, str):
                raise ValueError('All medications must be strings')
            if len(medication.strip()) == 0:
                raise ValueError('Medication name cannot be empty')
    return v

@validator('expires_at')
def validate_expiration_date(cls, v):
    """Validate expiration date format."""
    if v:
        try:
            parsed_date = datetime.strptime(v, "%Y-%m-%d").date()
            if parsed_date < date.today():
                raise ValueError('Expiration date cannot be in the past')
        except ValueError as e:
            if 'time data' in str(e):
                raise ValueError('Expiration date must be in YYYY-MM-DD format')
            raise e
    return v

# Apply validators to relevant classes
pass
