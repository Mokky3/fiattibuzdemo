"""General Visit Report (#001) schemas for structured data validation."""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ReportStatus(str, Enum):
    """Report status enumeration."""
    DRAFT = "draft"
    FINAL = "final"
    SIGNED = "signed"


class InfoSource(str, Enum):
    """Information source enumeration."""
    PATIENT = "patient"
    RELATIVE = "relative"
    RECORD = "record"


class HPIOnset(str, Enum):
    """HPI onset enumeration."""
    ACUTE = "остро"
    GRADUAL = "постепенно"
    UNKNOWN = "неизвестно"


class HPICourse(str, Enum):
    """HPI course enumeration."""
    WORSENING = "ухудшается"
    IMPROVING = "улучшается"
    STABLE = "стабильно"


class FamilyHistoryStatus(str, Enum):
    """Family history status enumeration."""
    YES = "yes"
    NO = "no"
    UNKNOWN = "unknown"


class SmokingStatus(str, Enum):
    """Smoking status enumeration."""
    NEVER = "never"
    FORMER = "former"
    CURRENT = "current"


class ExerciseLevel(str, Enum):
    """Exercise level enumeration."""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"


class SystemStatus(str, Enum):
    """System status enumeration."""
    NORMAL = "normal"
    ABNORMAL = "abnormal"


class FollowUpPeriod(str, Enum):
    """Follow-up period enumeration."""
    HOURS_24 = "24h"
    DAYS_3 = "3d"
    WEEK_1 = "1w"
    PRN = "PRN"


# ──────────────────────────────────────────────────────────────────────────────
# Core Report Schemas
# ──────────────────────────────────────────────────────────────────────────────

class GeneralReportMeta(BaseModel):
    """Metadata for general visit report."""
    clinic_id: str = Field(..., description="Clinic ID")
    department_id: str = Field(..., description="Department ID")
    physician_id: str = Field(..., description="Physician ID")
    encounter_type: str = Field("ambulatory", description="Encounter type")
    visit_datetime: datetime = Field(..., description="Visit datetime")


class GeneralReportHPI(BaseModel):
    """History of Present Illness."""
    onset: Optional[HPIOnset] = Field(None, description="Onset: остро/постепенно/неизвестно")
    duration: Optional[str] = Field(None, description="Duration")
    course: Optional[HPICourse] = Field(None, description="Course: ухудшается/улучшается/стабильно")
    modifiers: List[str] = Field(default_factory=list, description="Modifiers")
    associated_symptoms: List[str] = Field(default_factory=list, description="Associated symptoms")
    free: Optional[str] = Field(None, description="Free text")


class GeneralReportPMHFHSH(BaseModel):
    """Past Medical History, Family History, Social History."""
    pmh: List[str] = Field(default_factory=list, description="Past medical history conditions")
    surgeries: Optional[str] = Field(None, description="Surgeries/Hospitalizations")
    fh: Dict[str, str] = Field(default_factory=dict, description="Family history matrix")
    smoking: Optional[SmokingStatus] = Field(None, description="Smoking status")
    audit_c: Optional[int] = Field(None, ge=0, le=12, description="AUDIT-C score")
    exercise: Optional[ExerciseLevel] = Field(None, description="Exercise level")


class GeneralReportROS(BaseModel):
    """Review of Systems."""
    respiratory: SystemStatus = Field(SystemStatus.NORMAL, description="Respiratory system")
    cardio: SystemStatus = Field(SystemStatus.NORMAL, description="Cardiovascular system")
    gi: SystemStatus = Field(SystemStatus.NORMAL, description="Gastrointestinal system")
    neuro: SystemStatus = Field(SystemStatus.NORMAL, description="Neurological system")
    gu: SystemStatus = Field(SystemStatus.NORMAL, description="Genitourinary system")
    derm: SystemStatus = Field(SystemStatus.NORMAL, description="Dermatological system")
    ent: SystemStatus = Field(SystemStatus.NORMAL, description="ENT system")
    msk: SystemStatus = Field(SystemStatus.NORMAL, description="Musculoskeletal system")
    notes: Dict[str, str] = Field(default_factory=dict, description="Notes for abnormal findings")


class GeneralReportPE(BaseModel):
    """Physical Examination."""
    general: SystemStatus = Field(SystemStatus.NORMAL, description="General appearance")
    lungs: SystemStatus = Field(SystemStatus.NORMAL, description="Lungs")
    heart: SystemStatus = Field(SystemStatus.NORMAL, description="Heart")
    abdomen: SystemStatus = Field(SystemStatus.NORMAL, description="Abdomen")
    neuro: SystemStatus = Field(SystemStatus.NORMAL, description="Neurological")
    extremities: SystemStatus = Field(SystemStatus.NORMAL, description="Extremities")
    notes: Dict[str, str] = Field(default_factory=dict, description="Notes for abnormal findings")


class DiagnosisItem(BaseModel):
    """Diagnosis item with code and term."""
    code: str = Field(..., description="Diagnosis code (ICD-10/SNOMED)")
    term: str = Field(..., description="Diagnosis term")


class GeneralReportAssessment(BaseModel):
    """Assessment section."""
    working: List[DiagnosisItem] = Field(default_factory=list, description="Working diagnoses")
    ddx: List[DiagnosisItem] = Field(default_factory=list, description="Differential diagnoses")


class GeneralReportPlan(BaseModel):
    """Plan section."""
    tests: List[str] = Field(default_factory=list, description="Tests ordered")
    referrals: List[str] = Field(default_factory=list, description="Referrals")
    med_changes: List[str] = Field(default_factory=list, description="Medication changes")
    lifestyle: List[str] = Field(default_factory=list, description="Lifestyle recommendations")
    follow_up: Optional[FollowUpPeriod] = Field(None, description="Follow-up plan")


class GeneralReportData(BaseModel):
    """Complete general visit report data structure."""
    meta: GeneralReportMeta = Field(..., description="Report metadata")
    chief_complaint: str = Field(..., description="Chief complaint")
    onset_time: Optional[datetime] = Field(None, description="Onset time")
    info_source: Optional[InfoSource] = Field(None, description="Information source")
    hpi: GeneralReportHPI = Field(..., description="History of Present Illness")
    pmh_fh_sh: GeneralReportPMHFHSH = Field(..., description="PMH/FH/SH")
    ros: GeneralReportROS = Field(..., description="Review of Systems")
    pe: GeneralReportPE = Field(..., description="Physical Examination")
    assessment: GeneralReportAssessment = Field(..., description="Assessment")
    plan: GeneralReportPlan = Field(..., description="Plan")
    summary: Optional[str] = Field(None, description="Visit summary")


# ──────────────────────────────────────────────────────────────────────────────
# Request/Response Schemas
# ──────────────────────────────────────────────────────────────────────────────

class CreateGeneralReportRequest(BaseModel):
    """Request to create a general visit report."""
    patient_id: str = Field(..., description="Patient ID")
    clinic_id: str = Field(..., description="Clinic ID")
    report_data: GeneralReportData = Field(..., description="Report data")
    encounter_id: Optional[str] = Field(None, description="Associated encounter ID")


class UpdateGeneralReportRequest(BaseModel):
    """Request to update a general visit report."""
    report_data: GeneralReportData = Field(..., description="Updated report data")
    status: Optional[ReportStatus] = Field(None, description="Updated report status")


class GeneralReportResponse(BaseModel):
    """Response for general visit report."""
    id: str = Field(..., description="Report ID")
    patient_id: str = Field(..., description="Patient ID")
    doctor_id: str = Field(..., description="Doctor ID")
    clinic_id: str = Field(..., description="Clinic ID")
    encounter_id: Optional[str] = Field(None, description="Encounter ID")
    report_code: str = Field(..., description="Report code")
    report_type: str = Field(..., description="Report type")
    status: ReportStatus = Field(..., description="Report status")
    report_data: GeneralReportData = Field(..., description="Report data")
    fhir_document_reference_id: Optional[str] = Field(None, description="FHIR DocumentReference ID")
    fhir_binary_id: Optional[str] = Field(None, description="FHIR Binary ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    signed_at: Optional[datetime] = Field(None, description="Signature timestamp")


class GeneralReportSummary(BaseModel):
    """Summary for general visit report listing."""
    id: str = Field(..., description="Report ID")
    patient_id: str = Field(..., description="Patient ID")
    patient_name: str = Field(..., description="Patient name")
    doctor_id: str = Field(..., description="Doctor ID")
    doctor_name: str = Field(..., description="Doctor name")
    clinic_id: str = Field(..., description="Clinic ID")
    chief_complaint: str = Field(..., description="Chief complaint")
    status: ReportStatus = Field(..., description="Report status")
    created_at: datetime = Field(..., description="Creation timestamp")
    fhir_document_reference_id: Optional[str] = Field(None, description="FHIR DocumentReference ID")


class GeneralReportListResponse(BaseModel):
    """Response for listing general visit reports."""
    reports: List[GeneralReportSummary] = Field(..., description="List of reports")
    total: int = Field(..., description="Total number of reports")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    has_next: bool = Field(..., description="Whether there are more pages")


# ──────────────────────────────────────────────────────────────────────────────
# Database Model Conversion Schemas
# ──────────────────────────────────────────────────────────────────────────────

class GeneralReportDB(BaseModel):
    """Database model representation for GeneralReport."""
    id: str
    patient_id: str
    doctor_id: str
    encounter_id: Optional[str]
    clinic_id: str
    report_code: str = "#001"
    report_type: str = "general_visit"
    status: str = "draft"
    
    # Core fields
    chief_complaint: str
    onset_time: Optional[datetime]
    info_source: Optional[str]
    
    # HPI fields
    hpi_onset: Optional[str]
    hpi_duration: Optional[str]
    hpi_course: Optional[str]
    hpi_modifiers: Optional[List[str]]
    hpi_associated_symptoms: Optional[List[str]]
    hpi_free_text: Optional[str]
    
    # PMH/FH/SH fields
    pmh_conditions: Optional[List[str]]
    pmh_surgeries: Optional[str]
    fh_cardio: Optional[str]
    fh_diabetes: Optional[str]
    fh_cancer: Optional[str]
    fh_notes: Optional[str]
    social_smoking: Optional[str]
    social_audit_c: Optional[int]
    social_exercise: Optional[str]
    
    # ROS fields
    ros_respiratory: str = "normal"
    ros_cardio: str = "normal"
    ros_gi: str = "normal"
    ros_neuro: str = "normal"
    ros_gu: str = "normal"
    ros_derm: str = "normal"
    ros_ent: str = "normal"
    ros_msk: str = "normal"
    ros_notes: Optional[Dict[str, str]]
    
    # PE fields
    pe_general: str = "normal"
    pe_lungs: str = "normal"
    pe_heart: str = "normal"
    pe_abdomen: str = "normal"
    pe_neuro: str = "normal"
    pe_extremities: str = "normal"
    pe_notes: Optional[Dict[str, str]]
    
    # Assessment fields
    working_diagnoses: Optional[List[Dict[str, str]]]
    differential_diagnoses: Optional[List[Dict[str, str]]]
    
    # Plan fields
    plan_tests: Optional[List[str]]
    plan_referrals: Optional[List[str]]
    plan_med_changes: Optional[List[str]]
    plan_lifestyle: Optional[List[str]]
    plan_follow_up: Optional[str]
    
    # Summary
    visit_summary: Optional[str]
    
    # FHIR Integration
    fhir_document_reference_id: Optional[str]
    fhir_binary_id: Optional[str]
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    signed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────────────────────────────────────
# Utility Functions
# ──────────────────────────────────────────────────────────────────────────────

def convert_report_data_to_db(report_data: GeneralReportData) -> Dict[str, Any]:
    """Convert GeneralReportData to database fields."""
    return {
        "chief_complaint": report_data.chief_complaint,
        "onset_time": report_data.onset_time,
        "info_source": report_data.info_source.value if report_data.info_source else None,
        
        # HPI
        "hpi_onset": report_data.hpi.onset.value if report_data.hpi.onset else None,
        "hpi_duration": report_data.hpi.duration,
        "hpi_course": report_data.hpi.course.value if report_data.hpi.course else None,
        "hpi_modifiers": report_data.hpi.modifiers,
        "hpi_associated_symptoms": report_data.hpi.associated_symptoms,
        "hpi_free_text": report_data.hpi.free,
        
        # PMH/FH/SH
        "pmh_conditions": report_data.pmh_fh_sh.pmh,
        "pmh_surgeries": report_data.pmh_fh_sh.surgeries,
        "fh_cardio": report_data.pmh_fh_sh.fh.get("cardio"),
        "fh_diabetes": report_data.pmh_fh_sh.fh.get("diabetes"),
        "fh_cancer": report_data.pmh_fh_sh.fh.get("cancer"),
        "fh_notes": report_data.pmh_fh_sh.fh.get("notes"),
        "social_smoking": report_data.pmh_fh_sh.smoking.value if report_data.pmh_fh_sh.smoking else None,
        "social_audit_c": report_data.pmh_fh_sh.audit_c,
        "social_exercise": report_data.pmh_fh_sh.exercise.value if report_data.pmh_fh_sh.exercise else None,
        
        # ROS
        "ros_respiratory": report_data.ros.respiratory.value,
        "ros_cardio": report_data.ros.cardio.value,
        "ros_gi": report_data.ros.gi.value,
        "ros_neuro": report_data.ros.neuro.value,
        "ros_gu": report_data.ros.gu.value,
        "ros_derm": report_data.ros.derm.value,
        "ros_ent": report_data.ros.ent.value,
        "ros_msk": report_data.ros.msk.value,
        "ros_notes": report_data.ros.notes,
        
        # PE
        "pe_general": report_data.pe.general.value,
        "pe_lungs": report_data.pe.lungs.value,
        "pe_heart": report_data.pe.heart.value,
        "pe_abdomen": report_data.pe.abdomen.value,
        "pe_neuro": report_data.pe.neuro.value,
        "pe_extremities": report_data.pe.extremities.value,
        "pe_notes": report_data.pe.notes,
        
        # Assessment
        "working_diagnoses": [{"code": d.code, "term": d.term} for d in report_data.assessment.working],
        "differential_diagnoses": [{"code": d.code, "term": d.term} for d in report_data.assessment.ddx],
        
        # Plan
        "plan_tests": report_data.plan.tests,
        "plan_referrals": report_data.plan.referrals,
        "plan_med_changes": report_data.plan.med_changes,
        "plan_lifestyle": report_data.plan.lifestyle,
        "plan_follow_up": report_data.plan.follow_up.value if report_data.plan.follow_up else None,
        
        # Summary
        "visit_summary": report_data.summary,
    }


def convert_db_to_report_data(db_report: GeneralReportDB) -> GeneralReportData:
    """Convert database fields to GeneralReportData."""
    return GeneralReportData(
        meta=GeneralReportMeta(
            clinic_id=db_report.clinic_id,
            department_id="general",  # Default department
            physician_id=db_report.doctor_id,
            encounter_type="ambulatory",
            visit_datetime=db_report.created_at
        ),
        chief_complaint=db_report.chief_complaint,
        onset_time=db_report.onset_time,
        info_source=InfoSource(db_report.info_source) if db_report.info_source else None,
        hpi=GeneralReportHPI(
            onset=HPIOnset(db_report.hpi_onset) if db_report.hpi_onset else None,
            duration=db_report.hpi_duration,
            course=HPICourse(db_report.hpi_course) if db_report.hpi_course else None,
            modifiers=db_report.hpi_modifiers or [],
            associated_symptoms=db_report.hpi_associated_symptoms or [],
            free=db_report.hpi_free_text
        ),
        pmh_fh_sh=GeneralReportPMHFHSH(
            pmh=db_report.pmh_conditions or [],
            surgeries=db_report.pmh_surgeries,
            fh={
                "cardio": db_report.fh_cardio or "unknown",
                "diabetes": db_report.fh_diabetes or "unknown",
                "cancer": db_report.fh_cancer or "unknown",
                "notes": db_report.fh_notes or ""
            },
            smoking=SmokingStatus(db_report.social_smoking) if db_report.social_smoking else None,
            audit_c=db_report.social_audit_c,
            exercise=ExerciseLevel(db_report.social_exercise) if db_report.social_exercise else None
        ),
        ros=GeneralReportROS(
            respiratory=SystemStatus(db_report.ros_respiratory),
            cardio=SystemStatus(db_report.ros_cardio),
            gi=SystemStatus(db_report.ros_gi),
            neuro=SystemStatus(db_report.ros_neuro),
            gu=SystemStatus(db_report.ros_gu),
            derm=SystemStatus(db_report.ros_derm),
            ent=SystemStatus(db_report.ros_ent),
            msk=SystemStatus(db_report.ros_msk),
            notes=db_report.ros_notes or {}
        ),
        pe=GeneralReportPE(
            general=SystemStatus(db_report.pe_general),
            lungs=SystemStatus(db_report.pe_lungs),
            heart=SystemStatus(db_report.pe_heart),
            abdomen=SystemStatus(db_report.pe_abdomen),
            neuro=SystemStatus(db_report.pe_neuro),
            extremities=SystemStatus(db_report.pe_extremities),
            notes=db_report.pe_notes or {}
        ),
        assessment=GeneralReportAssessment(
            working=[DiagnosisItem(code=d["code"], term=d["term"]) for d in (db_report.working_diagnoses or [])],
            ddx=[DiagnosisItem(code=d["code"], term=d["term"]) for d in (db_report.differential_diagnoses or [])]
        ),
        plan=GeneralReportPlan(
            tests=db_report.plan_tests or [],
            referrals=db_report.plan_referrals or [],
            med_changes=db_report.plan_med_changes or [],
            lifestyle=db_report.plan_lifestyle or [],
            follow_up=FollowUpPeriod(db_report.plan_follow_up) if db_report.plan_follow_up else None
        ),
        summary=db_report.visit_summary
    )
