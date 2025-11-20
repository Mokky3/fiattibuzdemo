"""Lab reports routes backing the LabReportsModule front-end."""
from __future__ import annotations

import hashlib
import uuid
from datetime import date, datetime, timedelta, time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status, Response
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from app.common.auth.auth_service import AuthenticatedUser, require_lab_technician_access
from app.db.session import get_db
from app.crud.lab_reports import lab_reports as lab_reports_crud, LabReportStats as DbReportStats
from app.crud.lab_results import lab_results as lab_results_crud
from app.common.models.lab_insurance import LabReport as LabReportModel, LabResult as LabResultModel, LabResultStatus, AbnormalityType, SpecimenType
from app.portals.lab.schemas.reports import LabReportWithTestsCreate

router = APIRouter(prefix="/reports", tags=["Lab Reports"])

_ALLOWED_REPORT_STATUS = {"completed", "pending", "processing", "failed"}
_ALLOWED_REPORT_TYPES = {"statistics", "patient", "quality", "alerts", "performance", "inventory"}


class ReportMetrics(BaseModel):
    metrics: Dict[str, Any] = Field(default_factory=dict)


class PatientInfo(BaseModel):
    name: str
    id: str
    age: int = Field(..., ge=0)
    gender: str


class LabReportBase(BaseModel):
    title: str
    type: str
    category: str
    generatedDate: date
    generatedTime: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    generatedBy: str
    status: str = Field(..., pattern=r"^[a-z]+$")
    format: str
    size: Optional[str] = None
    pages: Optional[int] = Field(None, ge=0)
    description: Optional[str] = None
    period: Optional[str] = None
    recipients: List[str] = Field(default_factory=list)
    downloadCount: int = Field(0, ge=0)
    lastAccessed: Optional[datetime] = None
    data: Optional[Dict[str, Any]] = None
    patientInfo: Optional[PatientInfo] = None

    @validator("status")
    def validate_status(cls, value: str) -> str:
        if value not in _ALLOWED_REPORT_STATUS:
            raise ValueError("Invalid report status")
        return value

    @validator("type")
    def validate_type(cls, value: str) -> str:
        if value not in _ALLOWED_REPORT_TYPES:
            raise ValueError("Invalid report type")
        return value


class LabReportCreate(LabReportBase):
    id: Optional[str] = None


class LabReportUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    generatedDate: Optional[date] = None
    generatedTime: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    generatedBy: Optional[str] = None
    status: Optional[str] = Field(None, pattern=r"^[a-z]+$")
    format: Optional[str] = None
    size: Optional[str] = None
    pages: Optional[int] = Field(None, ge=0)
    description: Optional[str] = None
    period: Optional[str] = None
    recipients: Optional[List[str]] = None
    downloadCount: Optional[int] = Field(None, ge=0)
    lastAccessed: Optional[datetime] = None
    data: Optional[Dict[str, Any]] = None
    patientInfo: Optional[PatientInfo] = None

    class Config:
        extra = "forbid"

    @validator("status")
    def validate_status(cls, value: Optional[str]) -> Optional[str]:
        if value and value not in _ALLOWED_REPORT_STATUS:
            raise ValueError("Invalid report status")
        return value

    @validator("type")
    def validate_type(cls, value: Optional[str]) -> Optional[str]:
        if value and value not in _ALLOWED_REPORT_TYPES:
            raise ValueError("Invalid report type")
        return value


class LabReport(LabReportBase):
    id: str
    createdAt: datetime
    updatedAt: datetime


class LabReportCollection(BaseModel):
    items: List[LabReport]
    total: int = Field(..., ge=0)
    completed: int = Field(..., ge=0)
    pending: int = Field(..., ge=0)
    processing: int = Field(..., ge=0)
    failed: int = Field(..., ge=0)
    downloads: int = Field(..., ge=0)


class LabReportStats(BaseModel):
    total: int
    completed: int
    pending: int
    processing: int
    failed: int
    templates: int
    downloads: int


class LabReportTemplate(BaseModel):
    id: str
    name: str
    description: str
    category: str
    frequency: str
    estimatedTime: str
    parameters: List[str] = Field(default_factory=list)


class LabReportTemplateCreate(BaseModel):
    id: Optional[str] = None
    name: str
    description: str
    category: str
    frequency: str
    estimatedTime: str
    parameters: List[str] = Field(default_factory=list)


class LabReportStatusUpdate(BaseModel):
    status: str = Field(..., pattern=r"^[a-z]+$")

    @validator("status")
    def validate_status(cls, value: str) -> str:
        if value not in _ALLOWED_REPORT_STATUS:
            raise ValueError("Invalid report status")
        return value


# ──────────────────────────────────────────────────────────────────────────────
# Mapping helpers
# ──────────────────────────────────────────────────────────────────────────────

def _parse_specimen_type(specimen_type_str: Optional[str]) -> Optional[SpecimenType]:
    """Parse specimen type string to SpecimenType enum."""
    if not specimen_type_str:
        return None
    try:
        # Map common strings to enum values
        type_map = {
            "blood": SpecimenType.BLOOD,
            "urine": SpecimenType.URINE,
            "stool": SpecimenType.STOOL,
            "sputum": SpecimenType.SPUTUM,
            "csf": SpecimenType.CSF,
            "tissue": SpecimenType.TISSUE,
            "swab": SpecimenType.SWAB,
            "other": SpecimenType.OTHER,
        }
        return type_map.get(specimen_type_str.lower(), SpecimenType.OTHER)
    except Exception:
        return None


def _to_schema(db_obj: LabReportModel, db: Session = None) -> LabReport:
    created = db_obj.created_at or datetime.utcnow()
    
    # Fetch patient info if patient_id exists
    patient_info = None
    if db_obj.patient_id and db:
        from app.common.models.patient import Patient
        from app.common.models.user import User
        from sqlalchemy.orm import joinedload
        from sqlalchemy.dialects.postgresql import UUID as PG_UUID
        from sqlalchemy import cast
        
        try:
            patient = db.query(Patient).options(joinedload(Patient.user)).filter(
                Patient.patient_id == db_obj.patient_id
            ).first()
            
            if patient and patient.user:
                # Calculate age
                age = 0
                if patient.date_of_birth:
                    from datetime import date as date_type
                    dob = patient.date_of_birth
                    if isinstance(dob, str):
                        try:
                            dob = datetime.strptime(dob, '%Y-%m-%d').date()
                        except:
                            dob = None
                    if dob and isinstance(dob, date_type):
                        today = date.today()
                        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
                
                patient_info = PatientInfo(
                    id=str(patient.patient_id),
                    name=f"{patient.user.first_name or ''} {patient.user.last_name or ''}".strip() or "Unknown Patient",
                    age=age,
                    gender=patient.sex or "Unknown"
                )
        except Exception as e:
            # If patient lookup fails, just continue without patient info
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to fetch patient info for report {db_obj.id}: {e}")
            pass
    
    return LabReport(
        id=str(db_obj.id),
        title=db_obj.title,
        type="statistics",
        category="",
        generatedDate=created.date(),
        generatedTime=created.time().strftime("%H:%M"),
        generatedBy="",
        status="completed",
        format="pdf",
        size=None,
        pages=None,
        description=db_obj.summary,
        period=None,
        recipients=[],
        downloadCount=0,
        lastAccessed=None,
        data=db_obj.metrics or {},
        patientInfo=patient_info,
        createdAt=created,
        updatedAt=created,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Routes (DB-backed)
# ──────────────────────────────────────────────────────────────────────────────


@router.get("", response_model=LabReportCollection)
async def list_reports(
    search: Optional[str] = Query(None),
    report_type: str = Query("all"),
    status: str = Query("all"),
    date_filter: str = Query("all", pattern=r"^(all|today|week|month)$"),
    tab: str = Query("generated", pattern=r"^(generated|scheduled)$"),
    sort: str = Query("date", pattern=r"^(date|title|type|downloads)$"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabReportCollection:
    # Map date filter to from/to
    today = datetime.utcnow().date()
    date_from = None
    date_to = None
    if date_filter == "today":
        date_from = datetime.combine(today, datetime.min.time())
        date_to = datetime.combine(today, datetime.max.time())
    elif date_filter == "week":
        start = today - timedelta(days=6)
        date_from = datetime.combine(start, datetime.min.time())
        date_to = datetime.combine(today, datetime.max.time())
    elif date_filter == "month":
        start = today.replace(day=1)
        date_from = datetime.combine(start, datetime.min.time())
        date_to = datetime.combine(today, datetime.max.time())

    # Get the current user's organization_id
    from app.common.models.user import User
    user = db.query(User).filter(User.id == current_user.user_id).first()
    organization_id = str(user.organization_id) if user and user.organization_id else None

    skip = (page - 1) * size
    items_db = lab_reports_crud.list(db, date_from=date_from, date_to=date_to, organization_id=organization_id, skip=skip, limit=size)
    total = lab_reports_crud.count(db, organization_id=organization_id)
    stats: DbReportStats = lab_reports_crud.get_stats(db, organization_id=organization_id)
    return LabReportCollection(
        items=[_to_schema(r, db) for r in items_db],
        total=total,
        completed=stats.completed,
        pending=stats.pending,
        processing=stats.processing,
        failed=stats.failed,
        downloads=stats.downloads,
    )


@router.get("/summary", response_model=LabReportStats)
async def get_report_summary(
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabReportStats:
    # Get the current user's organization_id
    from app.common.models.user import User
    user = db.query(User).filter(User.id == current_user.user_id).first()
    organization_id = str(user.organization_id) if user and user.organization_id else None
    
    stats = lab_reports_crud.get_stats(db, organization_id=organization_id)
    return LabReportStats(
        total=stats.total,
        completed=stats.completed,
        pending=stats.pending,
        processing=stats.processing,
        failed=stats.failed,
        templates=stats.templates,
        downloads=stats.downloads,
    )


@router.post("", response_model=LabReport, status_code=status.HTTP_201_CREATED)
async def create_report(
    payload: LabReportCreate = Body(...),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabReport:
    values = {
        "order_id": None,
        "patient_id": None,
        "title": payload.title,
        "summary": payload.description,
        "metrics": payload.data or {},
    }
    obj = lab_reports_crud.create(db, values=values)
    return _to_schema(obj, db)


@router.post("/with-tests", response_model=LabReport, status_code=status.HTTP_201_CREATED)
async def create_report_with_tests(
    payload: LabReportWithTestsCreate = Body(...),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabReport:
    """
    Create a lab report with test results.
    This endpoint processes testResults array and creates LabResult records for each test.
    """
    
    # Extract data from payload
    patient_id_str = payload.data.get("patientId")
    if not patient_id_str:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="patientId is required in data")
    
    # Convert patient_id string to UUID object
    from uuid import UUID as PyUUID
    try:
        patient_id = PyUUID(patient_id_str) if isinstance(patient_id_str, str) else patient_id_str
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid patientId format")
    
    test_results = payload.data.get("testResults", [])
    if not test_results:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="testResults array is required")
    
    # Parse specimen collection date/time
    specimen_collected_date = None
    if payload.data.get("specimenCollectedDate"):
        try:
            spec_date = datetime.strptime(payload.data["specimenCollectedDate"], "%Y-%m-%d").date()
            spec_time_str = payload.data.get("specimenCollectedTime", "00:00")
            spec_time = datetime.strptime(spec_time_str, "%H:%M").time()
            specimen_collected_date = datetime.combine(spec_date, spec_time)
        except Exception as e:
            pass  # If parsing fails, leave as None
    
    # Parse test date
    test_date = datetime.utcnow()
    if payload.data.get("testDate"):
        try:
            test_date = datetime.strptime(payload.data["testDate"], "%Y-%m-%d")
        except Exception:
            pass
    
    # Generate result numbers
    result_number_base = f"LR-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    
    created_result_ids = []
    
    # Process each test result
    for idx, test_data in enumerate(test_results):
        test_type = test_data.get("testType", "numeric_single")
        test_name = test_data.get("testName", "Unknown Test")
        test_code = test_data.get("testCode", f"TEST-{idx}")
        test_category = test_data.get("testCategory") or payload.category
        
        # Handle panel tests (multiple parameters) - creates one LabResult per parameter
        if test_type in ["panel_cbc", "panel_wbc_diff", "panel_numeric", "panel_platelet", 
                         "thyroid_panel", "female_reproductive_hormones", "male_reproductive_hormones",
                         "metabolic_hormones", "gi_tumor_markers", "psa_panel", "testicular_cancer_markers",
                         "urine_24h", "crossmatch", "major_minor_crossmatch", "donor_screening",
                         "basic_coagulation_panel", "coagulation_factor_assays", "bleeding_profile",
                         "urine_drug_screening", "confirmatory_toxicology", "toxic_alcohols",
                         "heavy_metals_panel", "female_fertility_hormone_panel", "male_fertility_hormone_panel",
                         "ovarian_reserve_tests", "respiratory_pcr_panel", "gastrointestinal_pcr_panel",
                         "urogenital_sti_pcr_panel", "hpv_pcr_genotyping", "oncology_molecular_panels",
                         "poct_abg", "electrolytes_poct", "urine_poct", "lymphocyte_subset_panel",
                         "stem_cell_enumeration", "pnh_panel"]:
            parameters = test_data.get("parameters") or test_data.get("numericParameters") or []
            
            for param_idx, param in enumerate(parameters):
                result_value = param.get("resultValue") or param.get("percentValue") or param.get("result") or ""
                # Skip empty parameters (Note: "Not Detected" is a valid non-empty string, so it won't be skipped)
                if not result_value:
                    continue  # Skip empty parameters
                
                # Create LabResult for each parameter
                result_number = f"{result_number_base}-{idx}-{param_idx}"
                result_id = uuid.uuid4()  # Keep as UUID object, not string
                
                # Ensure result_number is unique by appending a short hash
                result_number_hash = hashlib.md5(f"{result_number}{str(result_id)}".encode()).hexdigest()[:6]
                result_number = f"{result_number}-{result_number_hash}"
                
                # Determine abnormality
                abnormality = param.get("abnormalityType", "normal")
                is_abnormal = param.get("isAbnormal", False) or abnormality != "normal"
                
                lab_result_values = {
                    # Don't set id - let database generate it via default=uuid.uuid4
                    "patient_id": patient_id,
                    "lab_order_id": None,
                    "result_number": result_number,
                    "test_name": f"{test_name} - {param.get('name', 'Parameter')}",
                    "test_code": f"{test_code}-{param.get('code', param_idx)}",
                    "test_category": test_category,
                    "panel_name": test_name,
                    "result_value": str(result_value),
                    "result_unit": param.get("unit", ""),
                    "result_type": "numeric" if test_type.startswith("numeric") or test_type in ["panel_numeric", "panel_cbc", "panel_wbc_diff", "panel_platelet"] else "text",
                    "reference_range": param.get("ref") or param.get("ref_percent", ""),
                    "is_abnormal": is_abnormal,
                    "abnormality_type": AbnormalityType.NORMAL if abnormality == "normal" else (
                        AbnormalityType.HIGH if abnormality == "high" else AbnormalityType.LOW
                    ),
                    "is_critical": False,
                    "status": LabResultStatus.FINAL,
                    "interpretation": test_data.get("interpretation"),
                    "specimen_type": _parse_specimen_type(payload.data.get("specimenType")),
                    "specimen_collected_date": specimen_collected_date,
                    "test_date": test_date,
                    "resulted_date": datetime.utcnow(),
                    "performed_by": current_user.email,
                    "resulted_by": current_user.email,
                    "attachments": {
                        "panel_data": {
                            "testType": test_type,
                            "parameter": param,
                            "fullTestData": test_data
                        }
                    }
                }
                
                lab_result = lab_results_crud.create(db, values=lab_result_values)
                created_result_ids.append(lab_result.id)
        
        # Handle complex structured tests (urine tests, blood bank, coagulation, cytogenetics, fertility, flow cytometry, molecular diagnostics, POCT, toxicology, etc.) - creates one LabResult with all data in attachments
        elif test_type in ["urine_dipstick", "urine_microscopy", "urine_upcr", "urine_microalbumin",
                          "blood_group_rh", "antibody_screening", "direct_coombs", "indirect_coombs",
                          "cortisol", "acth", "dheas", "growth_hormone", "igf1", "beta_hcg_quantitative",
                          "hcg_qualitative", "d_dimer", "mixing_studies",
                          "conventional_karyotyping", "rapid_aneuploidy_detection", "fish_panels",
                          "chromosomal_microarray", "prenatal_cytogenetics", "postnatal_constitutional_cytogenetics",
                          "oncology_cytogenetics", "semen_analysis", "leukemia_lymphoma_immunophenotyping",
                          "minimal_residual_disease", "tb_mycobacteria_pcr", "hepatitis_viral_load",
                          "hiv_viral_load", "covid19_pcr", "glucose_monitoring_poct", "poct_hba1c",
                          "rapid_infectious_tests_poct", "poct_cardiac_markers", "pregnancy_test_poct",
                          "poct_coagulation", "other_poct_devices", "therapeutic_drug_monitoring",
                          "ethanol", "breath_alcohol"]:
            # For structured tests, create a single LabResult with all data stored in attachments
            result_number = f"{result_number_base}-{idx}"
            result_id = uuid.uuid4()  # Keep as UUID object, not string
            
            # Ensure result_number is unique
            result_number_hash = hashlib.md5(f"{result_number}{str(result_id)}".encode()).hexdigest()[:6]
            result_number = f"{result_number}-{result_number_hash}"
            
            # Extract primary result value (if available)
            result_value = test_data.get("resultValue") or test_data.get("result") or ""
            
            # For cytogenetics, fertility, and flow cytometry tests, try to extract meaningful result values
            if not result_value:
                if test_type == "conventional_karyotyping":
                    result_value = test_data.get("karyotypeResult") or test_data.get("conclusion") or test_name
                elif test_type == "rapid_aneuploidy_detection":
                    # Summarize chromosome results
                    chr_results = test_data.get("chromosomeResults", {})
                    if chr_results:
                        result_value = f"QF-PCR: {', '.join([f'{k}: {v}' for k, v in chr_results.items() if v])}"
                    else:
                        result_value = test_name
                elif test_type == "fish_panels":
                    # Summarize FISH markers
                    markers = test_data.get("markers", [])
                    if markers:
                        detected = [m.get("markerName", "") for m in markers if m.get("result") == "Detected"]
                        if detected:
                            result_value = f"FISH: {', '.join(detected[:3])}" + ("..." if len(detected) > 3 else "")
                        else:
                            result_value = "FISH: No abnormalities detected"
                    else:
                        result_value = test_name
                elif test_type == "chromosomal_microarray":
                    result_value = test_data.get("result") or test_data.get("pathogenicityClassification") or test_name
                elif test_type == "prenatal_cytogenetics":
                    result_value = test_data.get("finalKaryotype") or test_name
                elif test_type in ["postnatal_constitutional_cytogenetics", "oncology_cytogenetics"]:
                    result_value = test_data.get("karyotypeResult") or test_data.get("conclusion") or test_name
                elif test_type == "semen_analysis":
                    # Summarize semen analysis results
                    interpretation = test_data.get("interpretation", "")
                    if interpretation:
                        result_value = interpretation[:100]  # First 100 chars of interpretation
                    else:
                        # Build summary from key parameters
                        parts = []
                        if test_data.get("concentration"):
                            parts.append(f"Conc: {test_data.get('concentration')}")
                        if test_data.get("progressiveMotility"):
                            parts.append(f"Motility: {test_data.get('progressiveMotility')}%")
                        if test_data.get("normalForms"):
                            parts.append(f"Morphology: {test_data.get('normalForms')}%")
                        result_value = " | ".join(parts) if parts else test_name
                elif test_type == "leukemia_lymphoma_immunophenotyping":
                    # Summarize immunophenotyping results
                    final_interpretation = test_data.get("finalInterpretation", "")
                    if final_interpretation:
                        result_value = final_interpretation[:100]  # First 100 chars
                    else:
                        # Summarize markers
                        markers = test_data.get("markers", [])
                        if markers:
                            positive_markers = [m.get("markerName", "") for m in markers if m.get("intensity") in ["Positive", "Bright", "Dim"]]
                            if positive_markers:
                                result_value = f"Positive: {', '.join(positive_markers[:5])}" + ("..." if len(positive_markers) > 5 else "")
                            else:
                                result_value = "No positive markers detected"
                        else:
                            result_value = test_name
                elif test_type == "minimal_residual_disease":
                    # Use MRD result (auto-calculated)
                    mrd_result = test_data.get("result", "")
                    mrd_percent = test_data.get("mrdPercent", "")
                    if mrd_result:
                        result_value = f"{mrd_result} ({mrd_percent}%)" if mrd_percent else mrd_result
                    else:
                        result_value = f"MRD: {mrd_percent}%" if mrd_percent else test_name
                elif test_type == "tb_mycobacteria_pcr":
                    # Summarize TB PCR results
                    mtb_detection = test_data.get("mtbDetection", "")
                    rif_resistance = test_data.get("rifampicinResistance", "")
                    if mtb_detection:
                        if rif_resistance:
                            result_value = f"MTB: {mtb_detection}, RIF: {rif_resistance}"
                        else:
                            result_value = f"MTB: {mtb_detection}"
                    else:
                        result_value = test_name
                elif test_type == "hepatitis_viral_load":
                    # Summarize hepatitis viral load
                    viral_load = test_data.get("viralLoad", "")
                    genotype = test_data.get("genotype", "")
                    if viral_load:
                        try:
                            import math
                            log10_value = math.log10(float(viral_load))
                            result_value = f"{viral_load} IU/mL (Log10: {log10_value:.2f})"
                        except (ValueError, TypeError):
                            result_value = f"{viral_load} IU/mL"
                        if genotype:
                            result_value += f", Genotype: {genotype}"
                    else:
                        result_value = test_name
                elif test_type == "hiv_viral_load":
                    # Summarize HIV viral load
                    viral_load = test_data.get("viralLoad", "")
                    if viral_load:
                        try:
                            import math
                            log10_value = math.log10(float(viral_load))
                            result_value = f"{viral_load} copies/mL (Log10: {log10_value:.2f})"
                        except (ValueError, TypeError):
                            result_value = f"{viral_load} copies/mL"
                    else:
                        result_value = test_name
                elif test_type == "covid19_pcr":
                    # Summarize COVID-19 PCR results
                    result = test_data.get("result", "")
                    if result:
                        ct_values = []
                        if test_data.get("ctNGene"):
                            ct_values.append(f"N: {test_data.get('ctNGene')}")
                        if test_data.get("ctORF1ab"):
                            ct_values.append(f"ORF1ab: {test_data.get('ctORF1ab')}")
                        if test_data.get("ctSGene"):
                            ct_values.append(f"S: {test_data.get('ctSGene')}")
                        if ct_values:
                            result_value = f"{result} ({', '.join(ct_values)})"
                        else:
                            result_value = result
                    else:
                        result_value = test_name
                elif test_type == "glucose_monitoring_poct":
                    # Summarize glucose POCT results
                    glucose_value = test_data.get("resultValue", "")
                    test_type_str = test_data.get("glucoseTestType", "")
                    if glucose_value:
                        result_value = f"{glucose_value} {test_data.get('resultUnit', 'mg/dL')} ({test_type_str})" if test_type_str else f"{glucose_value} {test_data.get('resultUnit', 'mg/dL')}"
                    else:
                        result_value = test_name
                elif test_type == "poct_hba1c":
                    # Summarize HbA1c POCT results
                    hba1c_value = test_data.get("resultValue", "")
                    if hba1c_value:
                        result_value = f"{hba1c_value}%"
                    else:
                        result_value = test_name
                elif test_type == "rapid_infectious_tests_poct":
                    # Summarize rapid infectious test results
                    result = test_data.get("result", "")
                    if result:
                        result_value = result
                    else:
                        result_value = test_name
                elif test_type == "poct_cardiac_markers":
                    # Summarize POCT cardiac marker results
                    marker_value = test_data.get("resultValue", "")
                    if marker_value:
                        result_value = f"{marker_value} {test_data.get('resultUnit', '')}"
                    else:
                        result_value = test_name
                elif test_type == "pregnancy_test_poct":
                    # Summarize pregnancy test results
                    result = test_data.get("result", "")
                    if result:
                        result_value = result
                    else:
                        result_value = test_name
                elif test_type == "poct_coagulation":
                    # Summarize POCT coagulation (INR) results
                    inr_value = test_data.get("inrValue", "")
                    pt_value = test_data.get("ptValue", "")
                    if inr_value:
                        result_value = f"INR: {inr_value}"
                        if pt_value:
                            result_value += f", PT: {pt_value}"
                    else:
                        result_value = test_name
                elif test_type == "other_poct_devices":
                    # Summarize other POCT device results
                    device_value = test_data.get("resultValue", "")
                    if device_value:
                        result_value = f"{device_value} {test_data.get('resultUnit', '')}"
                    else:
                        result_value = test_name
                elif test_type == "therapeutic_drug_monitoring":
                    # Summarize TDM results
                    drug_name = test_data.get("drugName", "")
                    tdm_value = test_data.get("resultValue", "")
                    tdm_type = test_data.get("tdmTestType", "")
                    if tdm_value:
                        result_value = f"{drug_name}: {tdm_value} {test_data.get('resultUnit', '')}"
                        if tdm_type:
                            result_value += f" ({tdm_type})"
                    else:
                        result_value = test_name
                elif test_type == "ethanol":
                    # Summarize ethanol (blood alcohol) results
                    ethanol_value = test_data.get("resultValue", "")
                    if ethanol_value:
                        result_value = f"{ethanol_value} {test_data.get('resultUnit', 'mg/dL')}"
                    else:
                        result_value = test_name
                elif test_type == "breath_alcohol":
                    # Summarize breath alcohol results
                    bac_value = test_data.get("resultValue", "")
                    if bac_value:
                        result_value = f"{bac_value}% BAC"
                    else:
                        result_value = test_name
                else:
                    # For other tests without a single result value, use test name as result
                    result_value = test_name
            
            # Determine abnormality from test data
            abnormality = test_data.get("abnormalityType", "normal")
            
            # For cytogenetics tests, determine abnormality from conclusion/result fields
            if test_type in ["conventional_karyotyping", "postnatal_constitutional_cytogenetics", "oncology_cytogenetics"]:
                conclusion = test_data.get("conclusion", "").lower()
                if conclusion == "abnormal":
                    abnormality = "high"  # Abnormal is typically a high-priority finding
                    is_abnormal = True
                elif conclusion == "normal":
                    abnormality = "normal"
                    is_abnormal = False
                else:
                    # Inconclusive or Culture Failure
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "chromosomal_microarray":
                result = test_data.get("result", "").lower()
                if "abnormal" in result or "cnv detected" in result:
                    abnormality = "high"
                    is_abnormal = True
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "rapid_aneuploidy_detection":
                # Check if any chromosome shows abnormality
                chr_results = test_data.get("chromosomeResults", {})
                has_abnormality = any(
                    v and v.lower() not in ["normal", "present"] 
                    for v in chr_results.values()
                )
                if has_abnormality:
                    abnormality = "high"
                    is_abnormal = True
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "fish_panels":
                # Check if any marker is detected
                markers = test_data.get("markers", [])
                has_detected = any(m.get("result") == "Detected" for m in markers)
                if has_detected:
                    abnormality = "high"
                    is_abnormal = True
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "prenatal_cytogenetics":
                # Check final karyotype or aneuploidy results
                final_karyotype = test_data.get("finalKaryotype", "").lower()
                has_aneuploidy = any(
                    test_data.get(f"aneuploidyChr{chr}", "").lower() not in ["normal", ""]
                    for chr in ["13", "18", "21", "X", "Y"]
                )
                if "trisomy" in final_karyotype or "monosomy" in final_karyotype or has_aneuploidy:
                    abnormality = "high"
                    is_abnormal = True
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "semen_analysis":
                # Determine abnormality based on semen analysis parameters
                # Check key parameters against WHO reference values
                concentration = test_data.get("concentration")
                progressive_motility = test_data.get("progressiveMotility")
                normal_forms = test_data.get("normalForms")
                
                has_abnormality = False
                if concentration:
                    try:
                        if float(concentration) < 15:  # < 15 million/mL
                            has_abnormality = True
                    except (ValueError, TypeError):
                        pass
                if progressive_motility:
                    try:
                        if float(progressive_motility) < 32:  # < 32%
                            has_abnormality = True
                    except (ValueError, TypeError):
                        pass
                if normal_forms:
                    try:
                        if float(normal_forms) < 4:  # < 4%
                            has_abnormality = True
                    except (ValueError, TypeError):
                        pass
                
                if has_abnormality:
                    abnormality = "low"  # Semen abnormalities are typically low values
                    is_abnormal = True
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "leukemia_lymphoma_immunophenotyping":
                # Check if any abnormal markers are detected
                markers = test_data.get("markers", [])
                has_abnormal_markers = any(
                    m.get("intensity") in ["Positive", "Bright"] and 
                    m.get("percentPositive", 0) > 20  # Significant positivity
                    for m in markers
                )
                if has_abnormal_markers:
                    abnormality = "high"  # Abnormal immunophenotype is significant
                    is_abnormal = True
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "minimal_residual_disease":
                # MRD is abnormal if positive
                mrd_result = test_data.get("result", "").lower()
                if "positive" in mrd_result:
                    abnormality = "high"  # MRD positive is significant
                    is_abnormal = True
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "tb_mycobacteria_pcr":
                # TB PCR is abnormal if MTB is detected
                mtb_detection = test_data.get("mtbDetection", "").lower()
                if "detected" in mtb_detection:
                    abnormality = "high"  # MTB detection is significant
                    is_abnormal = True
                elif "indeterminate" in mtb_detection:
                    abnormality = "normal"  # Indeterminate is not necessarily abnormal
                    is_abnormal = False
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "hepatitis_viral_load":
                # Hepatitis viral load is abnormal if detected (above detection limit)
                viral_load = test_data.get("viralLoad", "")
                if viral_load:
                    try:
                        load_value = float(viral_load)
                        if load_value > 0:
                            abnormality = "high"  # Detectable viral load is significant
                            is_abnormal = True
                        else:
                            is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
                    except (ValueError, TypeError):
                        is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "hiv_viral_load":
                # HIV viral load is abnormal if detected (above detection limit)
                viral_load = test_data.get("viralLoad", "")
                if viral_load:
                    try:
                        load_value = float(viral_load)
                        if load_value > 0:
                            abnormality = "high"  # Detectable viral load is significant
                            is_abnormal = True
                        else:
                            is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
                    except (ValueError, TypeError):
                        is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "covid19_pcr":
                # COVID-19 PCR is abnormal if detected
                result = test_data.get("result", "").lower()
                if "detected" in result:
                    abnormality = "high"  # COVID-19 detection is significant
                    is_abnormal = True
                elif "inconclusive" in result:
                    abnormality = "normal"  # Inconclusive is not necessarily abnormal
                    is_abnormal = False
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "glucose_monitoring_poct":
                # Glucose POCT abnormality based on test type and value
                glucose_value = test_data.get("resultValue", "")
                test_type_str = test_data.get("glucoseTestType", "")
                if glucose_value:
                    try:
                        value = float(glucose_value)
                        # Convert mmol/L to mg/dL if needed
                        if test_data.get("resultUnit") == "mmol/L":
                            value = value * 18.0182
                        
                        if test_type_str == "Fasting":
                            if value < 70:
                                abnormality = "low"
                                is_abnormal = True
                            elif value > 100:
                                abnormality = "high"
                                is_abnormal = True
                            else:
                                is_abnormal = False
                        elif test_type_str in ["Random", "Post-prandial"]:
                            if value >= 200:
                                abnormality = "high"
                                is_abnormal = True
                            else:
                                is_abnormal = False
                        else:
                            is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
                    except (ValueError, TypeError):
                        is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "poct_hba1c":
                # HbA1c POCT: < 5.7% normal, 5.7-6.4% elevated (prediabetes), ≥6.5% high (diabetes)
                hba1c_value = test_data.get("resultValue", "")
                if hba1c_value:
                    try:
                        value = float(hba1c_value)
                        if value >= 6.5:
                            abnormality = "high"  # Diabetes
                            is_abnormal = True
                        elif value >= 5.7:
                            abnormality = "high"  # Prediabetes (treated as elevated)
                            is_abnormal = True
                        else:
                            is_abnormal = False
                    except (ValueError, TypeError):
                        is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "rapid_infectious_tests_poct":
                # Rapid infectious tests are abnormal if positive
                result = test_data.get("result", "").lower()
                if "positive" in result:
                    abnormality = "high"  # Positive result is significant
                    is_abnormal = True
                elif "invalid" in result:
                    abnormality = "normal"  # Invalid is not necessarily abnormal
                    is_abnormal = False
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "poct_cardiac_markers":
                # POCT cardiac markers are abnormal if above reference range
                marker_value = test_data.get("resultValue", "")
                ref_range = test_data.get("referenceRange", "")
                if marker_value and ref_range:
                    try:
                        value = float(marker_value)
                        # Handle "< 0.04", "< 6", "< 100" format
                        if ref_range.strip().startswith("<"):
                            threshold = float(ref_range.replace("<", "").strip())
                            if value >= threshold:
                                abnormality = "high"
                                is_abnormal = True
                            else:
                                is_abnormal = False
                        else:
                            is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
                    except (ValueError, TypeError):
                        is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "pregnancy_test_poct":
                # Pregnancy test is abnormal if positive (pregnancy detected)
                result = test_data.get("result", "").lower()
                if "positive" in result:
                    abnormality = "high"  # Positive pregnancy test is significant
                    is_abnormal = True
                elif "invalid" in result:
                    abnormality = "normal"  # Invalid is not necessarily abnormal
                    is_abnormal = False
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "poct_coagulation":
                # POCT coagulation (INR) abnormality
                inr_value = test_data.get("inrValue", "")
                if inr_value:
                    try:
                        inr = float(inr_value)
                        # Normal: 0.8-1.2, Therapeutic (warfarin): 2.0-3.0
                        if inr < 0.8:
                            abnormality = "low"
                            is_abnormal = True
                        elif inr > 3.0:
                            abnormality = "high"  # High INR is significant
                            is_abnormal = True
                        elif inr > 1.2 and inr < 2.0:
                            abnormality = "high"  # Elevated but not therapeutic
                            is_abnormal = True
                        else:
                            is_abnormal = False
                    except (ValueError, TypeError):
                        is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "other_poct_devices":
                # Other POCT devices abnormality based on reference range
                device_value = test_data.get("resultValue", "")
                ref_range = test_data.get("referenceRange", "")
                if device_value and ref_range:
                    try:
                        value = float(device_value)
                        # Handle "< 2.0", "< 0.6" format
                        if ref_range.strip().startswith("<"):
                            threshold = float(ref_range.replace("<", "").strip())
                            if value >= threshold:
                                abnormality = "high"
                                is_abnormal = True
                            else:
                                is_abnormal = False
                        else:
                            is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
                    except (ValueError, TypeError):
                        is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "therapeutic_drug_monitoring":
                # TDM abnormality based on reference range and test type
                tdm_value = test_data.get("resultValue", "")
                ref_range = test_data.get("referenceRange", "")
                tdm_type = test_data.get("tdmTestType", "")
                if tdm_value and ref_range:
                    try:
                        value = float(tdm_value)
                        # Handle ranges like "5–10 / Trough <2" or "10–20"
                        if "/" in ref_range:
                            # Peak/trough ranges
                            parts = ref_range.split("/")
                            import re
                            if tdm_type == "Peak":
                                peak_match = re.match(r"(\d+\.?\d*)[–-](\d+\.?\d*)", parts[0].strip())
                                if peak_match:
                                    low = float(peak_match.group(1))
                                    high = float(peak_match.group(2))
                                    if value < low:
                                        abnormality = "low"
                                        is_abnormal = True
                                    elif value > high:
                                        abnormality = "high"
                                        is_abnormal = True
                                    else:
                                        is_abnormal = False
                                else:
                                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
                            elif tdm_type == "Trough":
                                trough_match = re.match(r"<(\d+\.?\d*)", parts[1].strip())
                                if trough_match:
                                    threshold = float(trough_match.group(1))
                                    if value >= threshold:
                                        abnormality = "high"
                                        is_abnormal = True
                                    else:
                                        is_abnormal = False
                                else:
                                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
                            else:
                                is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
                        else:
                            # Regular range
                            import re
                            range_match = re.match(r"(\d+\.?\d*)[–-](\d+\.?\d*)", ref_range)
                            if range_match:
                                low = float(range_match.group(1))
                                high = float(range_match.group(2))
                                if value < low:
                                    abnormality = "low"
                                    is_abnormal = True
                                elif value > high:
                                    abnormality = "high"
                                    is_abnormal = True
                                else:
                                    is_abnormal = False
                            else:
                                is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
                    except (ValueError, TypeError):
                        is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "ethanol":
                # Ethanol (blood alcohol) abnormality
                ethanol_value = test_data.get("resultValue", "")
                if ethanol_value:
                    try:
                        value = float(ethanol_value)
                        # 0 mg/dL normal, 80 mg/dL = legally intoxicated
                        if value == 0:
                            is_abnormal = False
                        elif value >= 80:
                            abnormality = "high"  # Legally intoxicated
                            is_abnormal = True
                        else:
                            abnormality = "high"  # Elevated (any detectable level)
                            is_abnormal = True
                    except (ValueError, TypeError):
                        is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            elif test_type == "breath_alcohol":
                # Breath alcohol abnormality (any detectable level is abnormal)
                bac_value = test_data.get("resultValue", "")
                if bac_value:
                    try:
                        value = float(bac_value)
                        if value > 0:
                            abnormality = "high"  # Any detectable BAC is significant
                            is_abnormal = True
                        else:
                            is_abnormal = False
                    except (ValueError, TypeError):
                        is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
                else:
                    is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            else:
                is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            
            # Store all test-specific data in attachments
            additional_data = {k: v for k, v in test_data.items() 
                             if k not in ["testName", "testCode", "testType", "testCategory", 
                                         "resultValue", "resultUnit", "referenceRange", 
                                         "abnormalityType", "isAbnormal", "isCritical", 
                                         "interpretation", "comments", "parameters", "numericParameters"]}
            
            lab_result_values = {
                # Don't set id - let database generate it via default=uuid.uuid4
                "patient_id": patient_id,
                "lab_order_id": None,
                "result_number": result_number,
                "test_name": test_name,
                "test_code": test_code,
                "test_category": test_category,
                "result_value": str(result_value),
                "result_unit": test_data.get("resultUnit", ""),
                "result_type": "text",  # Structured tests are typically text-based
                "reference_range": test_data.get("referenceRange", ""),
                "is_abnormal": is_abnormal,
                "abnormality_type": AbnormalityType.NORMAL if abnormality == "normal" else (
                    AbnormalityType.HIGH if abnormality == "high" else AbnormalityType.LOW
                ),
                "is_critical": test_data.get("isCritical", False),
                "status": LabResultStatus.FINAL,
                "interpretation": test_data.get("interpretation"),
                "comments": test_data.get("comments"),
                "specimen_type": _parse_specimen_type(payload.data.get("specimenType")),
                "specimen_collected_date": specimen_collected_date,
                "test_date": test_date,
                "resulted_date": datetime.utcnow(),
                "performed_by": current_user.email,
                "resulted_by": current_user.email,
                "attachments": {
                    "testType": test_type,
                    "fullTestData": test_data,
                    "additionalData": additional_data
                } if additional_data else {
                    "testType": test_type,
                    "fullTestData": test_data
                }
            }
            
            lab_result = lab_results_crud.create(db, values=lab_result_values)
            created_result_ids.append(lab_result.id)
        
        # Handle single tests (numeric_single, qualitative, etc.)
        else:
            result_number = f"{result_number_base}-{idx}"
            result_id = uuid.uuid4()  # Keep as UUID object, not string
            
            # Ensure result_number is unique
            result_number_hash = hashlib.md5(f"{result_number}{str(result_id)}".encode()).hexdigest()[:6]
            result_number = f"{result_number}-{result_number_hash}"
            
            # Extract result value based on test type
            result_value = test_data.get("resultValue") or test_data.get("result") or ""
            if not result_value and test_type not in ["qualitative", "qualitative_test", "lh_surge_test", "hla_b27_flow_cytometry"]:
                continue  # Skip tests without values (except qualitative tests)
            
            # For qualitative tests, use result field
            if test_type in ["qualitative", "qualitative_test", "qualitative_or_culture", "lh_surge_test"]:
                result_value = test_data.get("result", "Not Specified")
            
            # For hla_b27_flow_cytometry, can be qualitative (result) or numeric (percentPositive)
            if test_type == "hla_b27_flow_cytometry":
                if not result_value:
                    # Try to get from result field (qualitative) or percentPositive (numeric)
                    result_value = test_data.get("result", "")
                    if not result_value and test_data.get("percentPositive"):
                        result_value = f"{test_data.get('percentPositive')}%"
                    if not result_value:
                        result_value = "Not Specified"
            
            # Determine abnormality
            abnormality = test_data.get("abnormalityType", "normal")
            is_abnormal = test_data.get("isAbnormal", False) or abnormality != "normal"
            
            # Store additional test-specific data in attachments
            additional_data = {k: v for k, v in test_data.items() 
                             if k not in ["testName", "testCode", "testType", "testCategory", 
                                         "resultValue", "resultUnit", "referenceRange", 
                                         "abnormalityType", "isAbnormal", "isCritical", 
                                         "interpretation", "comments", "parameters", "numericParameters"]}
            
            lab_result_values = {
                # Don't set id - let database generate it via default=uuid.uuid4
                "patient_id": patient_id,
                "lab_order_id": None,
                "result_number": result_number,
                "test_name": test_name,
                "test_code": test_code,
                "test_category": test_category,
                "result_value": str(result_value),
                "result_unit": test_data.get("resultUnit", ""),
                "result_type": "numeric" if test_type.startswith("numeric") else "text",
                "reference_range": test_data.get("referenceRange", ""),
                "is_abnormal": is_abnormal,
                "abnormality_type": AbnormalityType.NORMAL if abnormality == "normal" else (
                    AbnormalityType.HIGH if abnormality == "high" else AbnormalityType.LOW
                ),
                "is_critical": test_data.get("isCritical", False),
                "status": LabResultStatus.FINAL,
                "interpretation": test_data.get("interpretation"),
                "comments": test_data.get("comments"),
                "specimen_type": _parse_specimen_type(payload.data.get("specimenType")),
                "specimen_collected_date": specimen_collected_date,
                "test_date": test_date,
                "resulted_date": datetime.utcnow(),
                    "performed_by": current_user.email,
                    "resulted_by": current_user.email,
                "attachments": {
                    "testType": test_type,
                    "fullTestData": test_data,
                    "additionalData": additional_data
                } if additional_data else {
                    "testType": test_type,
                    "fullTestData": test_data
                }
            }
            
            lab_result = lab_results_crud.create(db, values=lab_result_values)
            created_result_ids.append(lab_result.id)
    
    # Create LabReport record
    # Convert result IDs to strings for JSON storage
    result_ids_str = [str(rid) for rid in created_result_ids]
    report_values = {
        "order_id": None,
        "patient_id": patient_id,
        "title": payload.title,
        "summary": payload.description or f"Lab report with {len(created_result_ids)} test results",
        "metrics": {
            "testCount": len(created_result_ids),
            "resultIds": result_ids_str,
            "specimenType": payload.data.get("specimenType"),
            "specimenCollectedDate": payload.data.get("specimenCollectedDate"),
            "specimenCollectedTime": payload.data.get("specimenCollectedTime"),
            "testDate": payload.data.get("testDate"),
            "generatedBy": payload.generatedBy,
            "generatedDate": payload.generatedDate.isoformat(),
            "generatedTime": payload.generatedTime,
        }
    }
    
    report_obj = lab_reports_crud.create(db, values=report_values)
    return _to_schema(report_obj, db)


@router.get("/{report_id}", response_model=LabReport)
async def get_report(
    report_id: str,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabReport:
    obj = lab_reports_crud.get(db, report_id=report_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return _to_schema(obj, db)


@router.get("/{report_id}/results", response_model=List[Dict[str, Any]])
async def get_report_results(
    report_id: str,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """
    Get all test results associated with a lab report.
    Uses the resultIds stored in the report's metrics field.
    """
    obj = lab_reports_crud.get(db, report_id=report_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    # Extract result IDs from metrics
    result_ids = []
    if obj.metrics and isinstance(obj.metrics, dict):
        result_ids = obj.metrics.get("resultIds", [])
    
    if not result_ids:
        return []
    
    # Convert string IDs to UUID objects for the query (since LabResult.id is now UUID type)
    from uuid import UUID as PyUUID
    result_uuids = []
    for rid in result_ids:
        try:
            if isinstance(rid, str):
                result_uuids.append(PyUUID(rid))
            else:
                result_uuids.append(rid)
        except (ValueError, TypeError):
            continue  # Skip invalid UUIDs
    
    if not result_uuids:
        return []
    
    # Fetch all lab results
    from sqlalchemy import or_
    lab_results = db.query(LabResultModel).filter(
        LabResultModel.id.in_(result_uuids)
    ).order_by(LabResultModel.created_at.asc()).all()
    
    # Format results for frontend
    results = []
    for result in lab_results:
        result_dict = {
            "id": str(result.id),
            "resultNumber": result.result_number,
            "testName": result.test_name,
            "testCode": result.test_code,
            "testCategory": result.test_category,
            "panelName": result.panel_name,
            "resultValue": result.result_value,
            "resultUnit": result.result_unit,
            "resultType": result.result_type,
            "referenceRange": result.reference_range,
            "isAbnormal": result.is_abnormal,
            "abnormalityType": result.abnormality_type.value if result.abnormality_type else "normal",
            "isCritical": result.is_critical,
            "status": result.status.value if result.status else "final",
            "interpretation": result.interpretation,
            "comments": result.comments,
            "specimenType": result.specimen_type.value if result.specimen_type else None,
            "specimenCollectedDate": result.specimen_collected_date.isoformat() if result.specimen_collected_date else None,
            "testDate": result.test_date.isoformat() if result.test_date else None,
            "resultedDate": result.resulted_date.isoformat() if result.resulted_date else None,
            "performedBy": result.performed_by,
            "resultedBy": result.resulted_by,
            "attachments": result.attachments if result.attachments else {},
        }
        results.append(result_dict)
    
    return results


@router.put("/{report_id}", response_model=LabReport)
async def replace_report(
    report_id: str,
    payload: LabReportCreate,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabReport:
    values = {
        "title": payload.title,
        "summary": payload.description,
        "metrics": payload.data or {},
    }
    obj = lab_reports_crud.update(db, report_id=report_id, values=values)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return _to_schema(obj, db)


@router.patch("/{report_id}", response_model=LabReport)
async def patch_report(
    report_id: str,
    payload: LabReportUpdate,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabReport:
    updates = payload.dict(exclude_none=True)
    mapped: Dict[str, object] = {}
    if "title" in updates:
        mapped["title"] = updates.pop("title")
    if "description" in updates:
        mapped["summary"] = updates.pop("description")
    if "data" in updates:
        mapped["metrics"] = updates.pop("data")
    obj = lab_reports_crud.update(db, report_id=report_id, values=mapped)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return _to_schema(obj, db)


@router.post("/{report_id}/status", response_model=LabReport)
async def update_report_status(
    report_id: str,
    payload: LabReportStatusUpdate,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabReport:
    # LabReport model has no status column; this is a no-op placeholder mapping
    obj = lab_reports_crud.get(db, report_id=report_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return _to_schema(obj, db)


@router.post("/{report_id}/downloads", response_model=LabReport)
async def increment_download_count(
    report_id: str,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabReport:
    obj = lab_reports_crud.get(db, report_id=report_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    # Without a download count field in model, return as-is
    return _to_schema(obj, db)


@router.delete(
    "/{report_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_report(
    report_id: str,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> Response:
    ok = lab_reports_crud.delete(db, report_id=report_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/templates", response_model=List[LabReportTemplate])
async def list_report_templates(
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> List[LabReportTemplate]:
    # No DB templates model; keep in-memory empty list
    return []


@router.post("/templates", response_model=LabReportTemplate, status_code=status.HTTP_201_CREATED)
async def create_report_template(
    payload: LabReportTemplateCreate,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> LabReportTemplate:
    # Return payload with generated id
    return LabReportTemplate(id=payload.id or "TPL-001", **payload.dict(exclude={"id"}))


@router.delete(
    "/templates/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_report_template(
    template_id: str,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> Response:
    return Response(status_code=status.HTTP_204_NO_CONTENT)
