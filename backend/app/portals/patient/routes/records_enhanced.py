"""Enhanced Patient portal records router with aggregated Observation, DiagnosticReport, DocumentReference."""
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Path, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .auth_enhanced import get_current_patient, PatientUser, validate_patient_ownership
from app.portals.patient.schemas.records_enhanced import (
    VitalSignsRecord as _SchemaVitalSignsRecord,
    LabResultRecord as _SchemaLabResultRecord,
    ImagingRecord as _SchemaImagingRecord,
    ConsultationRecord as _SchemaConsultationRecord,
    ProcedureRecord as _SchemaProcedureRecord,
    MedicalRecord as _SchemaMedicalRecord,
    RecordsListResponse as _SchemaRecordsListResponse,
    RecordsSearchRequest as _SchemaRecordsSearchRequest,
    RecordsStats as _SchemaRecordsStats,
)
from app.db.session import get_db
from app.services.fhir_client import FHIRClient
from app.services.rbac_service import RBACService
from app.common.models.medical import MedicalRecord
from app.common.models.doctor import ClinicalNote, GeneralReport
from app.common.models.doctor import Doctor
from app.common.models.hospital import Hospital
from app.common.models.user import User
from app.common.models.lab_insurance import LabResult as LabResultModel, LabReport as LabReportModel
from sqlalchemy.orm import joinedload
from sqlalchemy import cast, String
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id

router = APIRouter(tags=["Patient · Records"])

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Data Models
# ──────────────────────────────────────────────────────────────────────────────

RecordItem = _SchemaMedicalRecord  # Closest match to a unified record shape

class VitalsTrend(BaseModel):
    code: str = Field(..., description="Vital sign code")
    name: str = Field(..., description="Vital sign name")
    unit: str = Field(..., description="Unit of measurement")
    values: List[Dict[str, Any]] = Field(..., description="Historical values")
    latest_value: Optional[str] = Field(None, description="Latest value")
    latest_date: Optional[str] = Field(None, description="Latest measurement date")

class RecordsSummary(BaseModel):
    total_records: int = Field(..., description="Total number of records")
    records_by_type: Dict[str, int] = Field(..., description="Records count by type")
    latest_vitals: List[VitalsTrend] = Field(..., description="Latest vital signs trends")
    recent_visits: List[RecordItem] = Field(..., description="Recent visits")
    upcoming_appointments: List[Dict[str, Any]] = Field(..., description="Upcoming appointments")

# ──────────────────────────────────────────────────────────────────────────────
# Service Dependencies
# ──────────────────────────────────────────────────────────────────────────────

def get_fhir_client(db: Session = Depends(get_db)) -> FHIRClient:
    """Get FHIR client with database session."""
    return FHIRClient(db_session=db)

def get_rbac_service() -> RBACService:
    """Get RBAC service."""
    return RBACService()

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Endpoints with Surgical Edits
# ──────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedResponse[RecordItem])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "patient", "records_list")
async def list_records(
    request: Request,
    record_type: str = Query("all", description="Filter by record type"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Aggregate Encounters, Observations, DiagnosticReports, DocumentReferences, and database MedicalRecords with ownership validation."""
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[RECORDS] list_records called - patient_id: {current_patient.patient_id}, record_type: {record_type}, page: {page}, size: {size}")
        
        all_records = []
        
        # 0. Get MedicalRecords from database (records written by doctors)
        # NOTE: medical_records table may not exist, so we skip it for now
        # if record_type in ["all", "consultation", "visit", "document", "report"]:
        #     try:
        #         db_medical_records = _get_db_medical_records(db, current_patient, record_type)
        #         logger.info(f"[RECORDS] Found {len(db_medical_records)} medical records from database")
        #         all_records.extend(db_medical_records)
        #     except Exception as e:
        #         logger.warning(f"[RECORDS] Error fetching medical records (table may not exist): {e}")
        #         db.rollback()
        
        # 0b. Get ClinicalNotes from database (SOAP notes, consultation notes)
        if record_type in ["all", "consultation", "visit", "document"]:
            try:
                db_clinical_notes = _get_db_clinical_notes(db, current_patient)
                logger.info(f"[RECORDS] Found {len(db_clinical_notes)} clinical notes from database")
                all_records.extend(db_clinical_notes)
            except Exception as e:
                logger.warning(f"[RECORDS] Error fetching clinical notes: {e}")
                db.rollback()
        
        # 0c. Get GeneralReports from database (reports written by doctors)
        if record_type in ["all", "document", "report", "consultation"]:
            try:
                db_general_reports = _get_db_general_reports(db, current_patient)
                logger.info(f"[RECORDS] Found {len(db_general_reports)} general reports from database")
                all_records.extend(db_general_reports)
            except Exception as e:
                logger.warning(f"[RECORDS] Error fetching general reports: {e}")
                db.rollback()
        
        # 0d. Get LabResults from database (lab test results)
        if record_type in ["all", "lab", "observation"]:
            try:
                db_lab_results = _get_db_lab_results(db, current_patient)
                logger.info(f"[RECORDS] Found {len(db_lab_results)} lab results from database")
                all_records.extend(db_lab_results)
            except Exception as e:
                logger.warning(f"[RECORDS] Error fetching lab results: {e}")
                db.rollback()
        
        # 0e. Get RadiologyStudies from database (radiology imaging studies)
        if record_type in ["all", "imaging"]:
            try:
                db_radiology_studies = _get_db_radiology_studies(db, current_patient)
                logger.info(f"[RECORDS] Found {len(db_radiology_studies)} radiology studies from database")
                all_records.extend(db_radiology_studies)
            except Exception as e:
                logger.warning(f"[RECORDS] Error fetching radiology studies: {e}")
                db.rollback()
        
        # 1. Get Encounters (visits/consultations) from FHIR
        if record_type in ["all", "consultation", "visit"]:
            encounters = await _get_encounters(current_patient, fhir_client)
            all_records.extend(encounters)
        
        # 2. Get Observations (lab results, vitals) from FHIR
        if record_type in ["all", "observation", "lab", "vitals"]:
            observations = await _get_observations(current_patient, fhir_client)
            all_records.extend(observations)
        
        # 3. Get DiagnosticReports (lab reports, imaging) from FHIR
        if record_type in ["all", "diagnostic", "lab", "imaging"]:
            diagnostic_reports = await _get_diagnostic_reports(current_patient, fhir_client)
            all_records.extend(diagnostic_reports)
        
        # 4. Get DocumentReferences (reports, documents) from FHIR
        if record_type in ["all", "document", "report"]:
            document_references = await _get_document_references(current_patient, fhir_client)
            all_records.extend(document_references)
        
        # Sort by date (newest first)
        all_records.sort(key=lambda x: x.date, reverse=True)
        
        logger.info(f"[RECORDS] Total records found: {len(all_records)}")
        logger.info(f"[RECORDS] Record types: {[r.type.value if hasattr(r.type, 'value') else str(r.type) for r in all_records[:5]]}")
        
        # Apply pagination
        start = (page - 1) * size
        end = start + size
        paginated_records = all_records[start:end]
        
        logger.info(f"[RECORDS] Returning {len(paginated_records)} records (page {page}, size {size})")
        
        # If no records, still return 200 with empty list
        response = create_paginated_response(
            items=paginated_records,
            page=page,
            size=size,
            total=len(all_records)
        )
        
        logger.info(f"[RECORDS] Response structure: data={len(response.data)} items, meta.total={response.meta.total}")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Records Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve records: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/summary", response_model=SuccessResponse[RecordsSummary])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "patient", "records_summary")
async def get_records_summary(
    request: Request,
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get comprehensive records summary with vitals trends."""
    try:
        # Get all records for summary
        all_records = []
        
        # Get MedicalRecords from database
        db_medical_records = _get_db_medical_records(db, current_patient, "all")
        all_records.extend(db_medical_records)
        
        # Get ClinicalNotes from database
        db_clinical_notes = _get_db_clinical_notes(db, current_patient)
        all_records.extend(db_clinical_notes)
        
        # Get GeneralReports from database
        db_general_reports = _get_db_general_reports(db, current_patient)
        all_records.extend(db_general_reports)
        
        # Get LabResults from database
        db_lab_results = _get_db_lab_results(db, current_patient)
        all_records.extend(db_lab_results)
        
        # Get Encounters from FHIR
        encounters = await _get_encounters(current_patient, fhir_client)
        all_records.extend(encounters)
        
        # Get Observations from FHIR
        observations = await _get_observations(current_patient, fhir_client)
        all_records.extend(observations)
        
        # Get DiagnosticReports from FHIR
        diagnostic_reports = await _get_diagnostic_reports(current_patient, fhir_client)
        all_records.extend(diagnostic_reports)
        
        # Get DocumentReferences from FHIR
        document_references = await _get_document_references(current_patient, fhir_client)
        all_records.extend(document_references)
        
        # Calculate summary statistics
        records_by_type = {}
        for record in all_records:
            # Handle both 'type' (from schema) and 'record_type' (from FHIR) fields
            if hasattr(record, 'type'):
                record_type = record.type.value if hasattr(record.type, 'value') else str(record.type)
            elif hasattr(record, 'record_type'):
                record_type = str(record.record_type)
            else:
                record_type = "Unknown"
            records_by_type[record_type] = records_by_type.get(record_type, 0) + 1
        
        # Get latest vitals trends
        vitals_trends = await _get_vitals_trends(current_patient, fhir_client)
        
        # Get recent visits (last 5 encounters)
        recent_visits = sorted(encounters, key=lambda x: x.date, reverse=True)[:5]
        
        # Get upcoming appointments
        upcoming_appointments = await _get_upcoming_appointments(current_patient, fhir_client)
        
        return SuccessResponse(
            data=RecordsSummary(
                total_records=len(all_records),
                records_by_type=records_by_type,
                latest_vitals=vitals_trends,
                recent_visits=recent_visits,
                upcoming_appointments=upcoming_appointments
            ),
            message="Records summary retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Records Summary Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve records summary: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/{record_id}", response_model=SuccessResponse[RecordItem])
@audit_pii_access("read", "patient", "record_detail")
async def get_record_detail(
    request: Request,
    record_id: str = Path(..., description="Record ID"),
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get detailed information for a single record."""
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[RECORDS] get_record_detail called - record_id: {record_id}, patient_id: {current_patient.patient_id}")
        
        # Try to find in ClinicalNotes first
        from uuid import UUID
        try:
            record_uuid = UUID(record_id) if record_id else None
            if record_uuid:
                clinical_note = db.query(ClinicalNote).options(
                    joinedload(ClinicalNote.doctor).joinedload(Doctor.user)
                ).filter(
                    ClinicalNote.id == record_uuid,
                    ClinicalNote.patient_id == UUID(str(current_patient.patient_id))
                ).first()
                
                if clinical_note:
                    doctor_name = ""
                    if clinical_note.doctor and clinical_note.doctor.user:
                        if clinical_note.doctor.user.first_name and clinical_note.doctor.user.last_name:
                            doctor_name = f"{clinical_note.doctor.user.first_name} {clinical_note.doctor.user.last_name}"
                        elif clinical_note.doctor.user.full_name:
                            doctor_name = clinical_note.doctor.user.full_name
                    
                    from app.portals.patient.schemas.records_enhanced import RecordTypeEnum, RecordStatusEnum, PriorityEnum
                    note_date_str = clinical_note.note_date.strftime("%Y-%m-%d") if clinical_note.note_date else datetime.now(timezone.utc).strftime("%Y-%m-%d")
                    created_at_str = clinical_note.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if clinical_note.created_at else datetime.now(timezone.utc).isoformat()
                    updated_at_str = clinical_note.updated_at.strftime("%Y-%m-%dT%H:%M:%SZ") if clinical_note.updated_at else datetime.now(timezone.utc).isoformat()
                    
                    # Build comprehensive summary from SOAP fields
                    summary_parts = []
                    if clinical_note.subjective:
                        summary_parts.append(f"Subjective: {clinical_note.subjective}")
                    if clinical_note.objective:
                        summary_parts.append(f"Objective: {clinical_note.objective}")
                    if clinical_note.assessment:
                        summary_parts.append(f"Assessment: {clinical_note.assessment}")
                    if clinical_note.plan:
                        summary_parts.append(f"Plan: {clinical_note.plan}")
                    if clinical_note.content:
                        summary_parts.append(clinical_note.content)
                    
                    summary = "\n\n".join(summary_parts) if summary_parts else f"{clinical_note.note_type.replace('_', ' ').title()} Note"
                    
                    # Store detailed fields in notes field (we'll parse this in frontend)
                    import json
                    
                    # Parse template_data if it exists
                    # First try to get from template_data field, then try parsing from content field
                    template_data = {}
                    if hasattr(clinical_note, 'template_data') and clinical_note.template_data:
                        if isinstance(clinical_note.template_data, str):
                            try:
                                template_data = json.loads(clinical_note.template_data)
                            except:
                                template_data = {}
                        else:
                            template_data = clinical_note.template_data
                    elif clinical_note.content:
                        # Parse content field as JSON - it contains the full form data
                        try:
                            content_data = json.loads(clinical_note.content) if isinstance(clinical_note.content, str) else clinical_note.content
                            if isinstance(content_data, dict):
                                template_data = content_data
                        except:
                            # If content is not JSON, try to extract template_data from it
                            pass
                    
                    # Format assessment from template_data or direct field
                    formatted_assessment = None
                    if template_data.get('assessment'):
                        assessment_data = template_data['assessment']
                        if isinstance(assessment_data, dict):
                            working = assessment_data.get('working', [])
                            ddx = assessment_data.get('ddx', [])
                            parts = []
                            if working:
                                working_str = ', '.join([
                                    f"{d.get('code', '')}: {d.get('term', '')}".strip(': ').strip()
                                    if isinstance(d, dict) else str(d)
                                    for d in working
                                ])
                                if working_str:
                                    parts.append(f"Working Diagnosis: {working_str}")
                            if ddx:
                                ddx_str = ', '.join([
                                    f"{d.get('code', '')}: {d.get('term', '')}".strip(': ').strip()
                                    if isinstance(d, dict) else str(d)
                                    for d in ddx
                                ])
                                if ddx_str:
                                    parts.append(f"Differential Diagnoses: {ddx_str}")
                            formatted_assessment = '\n'.join(parts) if parts else "No diagnosis specified"
                    elif clinical_note.assessment:
                        # Try to parse if it's a JSON string
                        try:
                            import json
                            if isinstance(clinical_note.assessment, str):
                                parsed_assessment = json.loads(clinical_note.assessment)
                                if isinstance(parsed_assessment, dict):
                                    working = parsed_assessment.get('working', [])
                                    ddx = parsed_assessment.get('ddx', [])
                                    parts = []
                                    if working:
                                        working_str = ', '.join([
                                            f"{d.get('code', '')}: {d.get('term', '')}".strip(': ').strip()
                                            if isinstance(d, dict) else str(d)
                                            for d in working
                                        ])
                                        if working_str:
                                            parts.append(f"Working Diagnosis: {working_str}")
                                    if ddx:
                                        ddx_str = ', '.join([
                                            f"{d.get('code', '')}: {d.get('term', '')}".strip(': ').strip()
                                            if isinstance(d, dict) else str(d)
                                            for d in ddx
                                        ])
                                        if ddx_str:
                                            parts.append(f"Differential Diagnoses: {ddx_str}")
                                    formatted_assessment = '\n'.join(parts) if parts else "No diagnosis specified"
                                else:
                                    formatted_assessment = clinical_note.assessment
                            else:
                                formatted_assessment = clinical_note.assessment
                        except (json.JSONDecodeError, TypeError):
                            formatted_assessment = clinical_note.assessment
                    
                    # Format plan from template_data or direct field
                    formatted_plan = None
                    if template_data.get('plan'):
                        plan_data = template_data['plan']
                        if isinstance(plan_data, dict):
                            parts = []
                            if plan_data.get('tests'):
                                test_list = plan_data['tests']
                                if isinstance(test_list, list) and len(test_list) > 0:
                                    test_strs = []
                                    for t in test_list:
                                        if isinstance(t, dict):
                                            test_strs.append(t.get('name') or t.get('label') or str(t))
                                        else:
                                            test_strs.append(str(t))
                                    if test_strs:
                                        parts.append(f"Tests: {', '.join(test_strs)}")
                            if plan_data.get('referrals'):
                                ref_list = plan_data['referrals']
                                if isinstance(ref_list, list) and len(ref_list) > 0:
                                    ref_strs = []
                                    for r in ref_list:
                                        if isinstance(r, dict):
                                            ref_strs.append(r.get('specialty') or r.get('name') or str(r))
                                        else:
                                            ref_strs.append(str(r))
                                    if ref_strs:
                                        parts.append(f"Referrals: {', '.join(ref_strs)}")
                            if plan_data.get('med_changes'):
                                med_list = plan_data['med_changes']
                                if isinstance(med_list, list) and len(med_list) > 0:
                                    med_strs = []
                                    for m in med_list:
                                        if isinstance(m, dict):
                                            med_name = m.get('med') or m.get('name') or ''
                                            med_dose = m.get('dose') or m.get('dosage') or ''
                                            med_freq = m.get('freq') or m.get('frequency') or ''
                                            med_str = f"{med_name} {med_dose} {med_freq}".strip()
                                            med_strs.append(med_str if med_str else str(m))
                                        else:
                                            med_strs.append(str(m))
                                    if med_strs:
                                        parts.append(f"Medication Changes: {', '.join(med_strs)}")
                            if plan_data.get('lifestyle'):
                                lifestyle_list = plan_data['lifestyle']
                                if isinstance(lifestyle_list, list) and len(lifestyle_list) > 0:
                                    lifestyle_strs = []
                                    for l in lifestyle_list:
                                        if isinstance(l, dict):
                                            lifestyle_strs.append(l.get('recommendation') or l.get('name') or str(l))
                                        else:
                                            lifestyle_strs.append(str(l))
                                    if lifestyle_strs:
                                        parts.append(f"Lifestyle Recommendations: {', '.join(lifestyle_strs)}")
                            if plan_data.get('follow_up'):
                                parts.append(f"Follow-up: {plan_data['follow_up']}")
                            formatted_plan = '\n'.join(parts) if parts else "No treatment plan specified"
                    elif clinical_note.plan:
                        # Try to parse if it's a JSON string
                        try:
                            import json
                            if isinstance(clinical_note.plan, str):
                                parsed_plan = json.loads(clinical_note.plan)
                                if isinstance(parsed_plan, dict):
                                    parts = []
                                    if parsed_plan.get('tests'):
                                        test_list = parsed_plan['tests']
                                        if isinstance(test_list, list) and len(test_list) > 0:
                                            test_strs = [str(t) for t in test_list]
                                            parts.append(f"Tests: {', '.join(test_strs)}")
                                    if parsed_plan.get('referrals'):
                                        ref_list = parsed_plan['referrals']
                                        if isinstance(ref_list, list) and len(ref_list) > 0:
                                            ref_strs = [str(r) for r in ref_list]
                                            parts.append(f"Referrals: {', '.join(ref_strs)}")
                                    if parsed_plan.get('med_changes'):
                                        med_list = parsed_plan['med_changes']
                                        if isinstance(med_list, list) and len(med_list) > 0:
                                            med_strs = [str(m) for m in med_list]
                                            parts.append(f"Medication Changes: {', '.join(med_strs)}")
                                    if parsed_plan.get('lifestyle'):
                                        lifestyle_list = parsed_plan['lifestyle']
                                        if isinstance(lifestyle_list, list) and len(lifestyle_list) > 0:
                                            lifestyle_strs = [str(l) for l in lifestyle_list]
                                            parts.append(f"Lifestyle: {', '.join(lifestyle_strs)}")
                                    if parsed_plan.get('follow_up'):
                                        parts.append(f"Follow-up: {parsed_plan['follow_up']}")
                                    formatted_plan = '\n'.join(parts) if parts else "No treatment plan specified"
                                else:
                                    formatted_plan = clinical_note.plan
                            else:
                                formatted_plan = clinical_note.plan
                        except (json.JSONDecodeError, TypeError):
                            formatted_plan = clinical_note.plan
                    
                    # Format Physical Examination from template_data
                    formatted_pe = None
                    if template_data.get('pe'):
                        pe_data = template_data['pe']
                        if isinstance(pe_data, dict):
                            pe_parts = []
                            for key, value in pe_data.items():
                                if value and value != 'normal':
                                    pe_parts.append(f"{key}: {value}")
                            if pe_parts:
                                formatted_pe = '; '.join(pe_parts)
                            else:
                                # Show all fields even if normal
                                all_parts = [f"{key}: {value or 'normal'}" for key, value in pe_data.items()]
                                formatted_pe = '; '.join(all_parts)
                    
                    # Format HPI from template_data
                    formatted_hpi = None
                    if template_data.get('hpi'):
                        hpi_data = template_data['hpi']
                        if isinstance(hpi_data, dict) and hpi_data.get('free_text'):
                            formatted_hpi = hpi_data['free_text']
                    
                    # Include all fields from template_data directly in detailed_notes for easy access
                    # This ensures all specialty-specific fields are available
                    detailed_notes = {
                        "subjective": clinical_note.subjective,
                        "objective": clinical_note.objective,
                        "assessment": formatted_assessment if formatted_assessment is not None else (clinical_note.assessment if clinical_note.assessment and not (isinstance(clinical_note.assessment, str) and clinical_note.assessment.strip().startswith('{')) else "No assessment available"),
                        "plan": formatted_plan if formatted_plan is not None else (clinical_note.plan if clinical_note.plan and not (isinstance(clinical_note.plan, str) and clinical_note.plan.strip().startswith('{')) else "No plan available"),
                        "content": clinical_note.content,
                        "note_type": clinical_note.note_type,
                        "physical_examination": formatted_pe,
                        "hpi": formatted_hpi,
                        "template_data": template_data,  # Include raw template_data for frontend parsing
                        "doc_type": template_data.get('doc_type') if template_data else None,  # Extract doc_type for specialty detection
                        "reportData": template_data  # Alias for compatibility with ViewReport component
                    }
                    
                    # Merge all template_data fields directly into detailed_notes for easy access
                    # This ensures specialty-specific fields are at the top level
                    # For specialty reports, include ALL fields from template_data
                    if template_data and isinstance(template_data, dict):
                        for key, value in template_data.items():
                            # Always include specialty-specific fields
                            # Only skip if we have a formatted version and the raw data is the same structure
                            if key in ['assessment', 'plan']:
                                # Keep formatted version, but also include raw for reference
                                detailed_notes[f"{key}_raw"] = value
                            elif key in ['pe', 'hpi']:
                                # Keep formatted version, but also include raw for reference
                                detailed_notes[f"{key}_raw"] = value
                            else:
                                # Include all other fields directly (chief_complaint, vitals, motor, reflexes, etc.)
                                detailed_notes[key] = value
                    
                    record_item = RecordItem(
                        id=str(clinical_note.id),
                        type=RecordTypeEnum.CONSULTATION,
                        date=note_date_str,
                        doctor=doctor_name,
                        clinic="General Clinic",
                        title=f"{clinical_note.note_type.replace('_', ' ').title()} Note",
                        summary=summary,
                        status=RecordStatusEnum.FINAL if not clinical_note.is_draft else RecordStatusEnum.DRAFT,
                        priority=PriorityEnum.NORMAL,
                        notes=json.dumps(detailed_notes),  # Store as JSON string, frontend will parse
                        attachments=[],
                        fhir_resource_ids=[str(clinical_note.fhir_document_reference_id)] if clinical_note.fhir_document_reference_id else [],
                        clinic_id="00000000-0000-0000-0000-000000000000",
                        patient_id=str(current_patient.patient_id),
                        created_at=created_at_str,
                        updated_at=updated_at_str
                    )
                    
                    return SuccessResponse(data=record_item, message="Record retrieved successfully")
        except Exception as e:
            logger.warning(f"[RECORDS] Error checking ClinicalNote: {e}")
            db.rollback()
        
        # Try GeneralReport
        try:
            if record_uuid:
                general_report = db.query(GeneralReport).options(
                    joinedload(GeneralReport.doctor).joinedload(Doctor.user),
                    joinedload(GeneralReport.clinic)
                ).filter(
                    GeneralReport.id == record_uuid,
                    GeneralReport.patient_id == UUID(str(current_patient.patient_id))
                ).first()
                
                if general_report:
                    doctor_name = ""
                    if general_report.doctor and general_report.doctor.user:
                        if general_report.doctor.user.first_name and general_report.doctor.user.last_name:
                            doctor_name = f"{general_report.doctor.user.first_name} {general_report.doctor.user.last_name}"
                        elif general_report.doctor.user.full_name:
                            doctor_name = general_report.doctor.user.full_name
                    
                    hospital_name = general_report.clinic.name if general_report.clinic else "General Clinic"
                    
                    from app.portals.patient.schemas.records_enhanced import RecordTypeEnum, RecordStatusEnum, PriorityEnum
                    report_date_str = general_report.created_at.strftime("%Y-%m-%d") if general_report.created_at else datetime.now(timezone.utc).strftime("%Y-%m-%d")
                    created_at_str = general_report.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if general_report.created_at else datetime.now(timezone.utc).isoformat()
                    updated_at_str = general_report.updated_at.strftime("%Y-%m-%dT%H:%M:%SZ") if general_report.updated_at else datetime.now(timezone.utc).isoformat()
                    
                    # Build comprehensive summary
                    summary_parts = []
                    if general_report.chief_complaint:
                        summary_parts.append(f"Chief Complaint: {general_report.chief_complaint}")
                    if general_report.visit_summary:
                        summary_parts.append(f"Visit Summary: {general_report.visit_summary}")
                    
                    summary = "\n\n".join(summary_parts) if summary_parts else f"{general_report.report_type.replace('_', ' ').title()} Report"
                    
                    # Store detailed fields
                    import json
                    
                    # Format Physical Examination
                    formatted_pe = None
                    pe_parts = []
                    if general_report.pe_general:
                        pe_parts.append(f"general: {general_report.pe_general}")
                    if general_report.pe_lungs:
                        pe_parts.append(f"lungs: {general_report.pe_lungs}")
                    if general_report.pe_heart:
                        pe_parts.append(f"heart: {general_report.pe_heart}")
                    if general_report.pe_abdomen:
                        pe_parts.append(f"abdomen: {general_report.pe_abdomen}")
                    if general_report.pe_neuro:
                        pe_parts.append(f"neuro: {general_report.pe_neuro}")
                    if general_report.pe_extremities:
                        pe_parts.append(f"extremities: {general_report.pe_extremities}")
                    if pe_parts:
                        formatted_pe = "; ".join(pe_parts)
                    elif general_report.pe_notes:
                        if isinstance(general_report.pe_notes, dict):
                            formatted_pe = "; ".join([f"{k}: {v}" for k, v in general_report.pe_notes.items() if v])
                        else:
                            formatted_pe = str(general_report.pe_notes)
                    
                    # Format working diagnoses
                    formatted_diagnosis = None
                    if general_report.working_diagnoses:
                        if isinstance(general_report.working_diagnoses, list) and len(general_report.working_diagnoses) > 0:
                            diag_parts = []
                            for diag in general_report.working_diagnoses:
                                if isinstance(diag, dict):
                                    code = diag.get('code', '')
                                    term = diag.get('term', '')
                                    if code and term:
                                        diag_parts.append(f"{code}: {term}")
                                    elif term:
                                        diag_parts.append(term)
                                    elif code:
                                        diag_parts.append(code)
                                else:
                                    diag_parts.append(str(diag))
                            if diag_parts:
                                formatted_diagnosis = "Working Diagnosis: " + ", ".join(diag_parts)
                    
                    # Format treatment plan
                    formatted_treatment_plan = None
                    plan_parts = []
                    if general_report.plan_tests and isinstance(general_report.plan_tests, list) and len(general_report.plan_tests) > 0:
                        plan_parts.append(f"Tests: {', '.join([str(t) for t in general_report.plan_tests])}")
                    if general_report.plan_referrals and isinstance(general_report.plan_referrals, list) and len(general_report.plan_referrals) > 0:
                        plan_parts.append(f"Referrals: {', '.join([str(r) for r in general_report.plan_referrals])}")
                    if general_report.plan_med_changes and isinstance(general_report.plan_med_changes, list) and len(general_report.plan_med_changes) > 0:
                        plan_parts.append(f"Medication Changes: {', '.join([str(m) for m in general_report.plan_med_changes])}")
                    if general_report.plan_lifestyle and isinstance(general_report.plan_lifestyle, list) and len(general_report.plan_lifestyle) > 0:
                        plan_parts.append(f"Lifestyle: {', '.join([str(l) for l in general_report.plan_lifestyle])}")
                    if general_report.plan_follow_up:
                        plan_parts.append(f"Follow-up: {general_report.plan_follow_up}")
                    if plan_parts:
                        formatted_treatment_plan = "\n".join(plan_parts)
                    
                    # Format ROS (Review of Systems) - combine all systems
                    formatted_ros = None
                    ros_parts = []
                    if general_report.ros_respiratory and general_report.ros_respiratory != "normal":
                        ros_parts.append(f"Respiratory: {general_report.ros_respiratory}")
                    if general_report.ros_cardio and general_report.ros_cardio != "normal":
                        ros_parts.append(f"Cardiovascular: {general_report.ros_cardio}")
                    if general_report.ros_gi and general_report.ros_gi != "normal":
                        ros_parts.append(f"Gastrointestinal: {general_report.ros_gi}")
                    if general_report.ros_neuro and general_report.ros_neuro != "normal":
                        ros_parts.append(f"Neurological: {general_report.ros_neuro}")
                    if general_report.ros_gu and general_report.ros_gu != "normal":
                        ros_parts.append(f"Genitourinary: {general_report.ros_gu}")
                    if general_report.ros_derm and general_report.ros_derm != "normal":
                        ros_parts.append(f"Dermatological: {general_report.ros_derm}")
                    if general_report.ros_ent and general_report.ros_ent != "normal":
                        ros_parts.append(f"ENT: {general_report.ros_ent}")
                    if general_report.ros_msk and general_report.ros_msk != "normal":
                        ros_parts.append(f"Musculoskeletal: {general_report.ros_msk}")
                    if ros_parts:
                        formatted_ros = "; ".join(ros_parts)
                    elif general_report.ros_notes:
                        if isinstance(general_report.ros_notes, dict):
                            formatted_ros = "; ".join([f"{k}: {v}" for k, v in general_report.ros_notes.items() if v])
                        else:
                            formatted_ros = str(general_report.ros_notes)
                    
                    # Format PMH (Past Medical History)
                    formatted_pmh = None
                    pmh_parts = []
                    if general_report.pmh_conditions:
                        if isinstance(general_report.pmh_conditions, list) and len(general_report.pmh_conditions) > 0:
                            pmh_parts.append(f"Conditions: {', '.join([str(c) for c in general_report.pmh_conditions])}")
                        elif isinstance(general_report.pmh_conditions, str):
                            pmh_parts.append(f"Conditions: {general_report.pmh_conditions}")
                    if general_report.pmh_surgeries:
                        pmh_parts.append(f"Surgeries: {general_report.pmh_surgeries}")
                    if pmh_parts:
                        formatted_pmh = "\n".join(pmh_parts)
                    
                    # Format Family History
                    formatted_fh = None
                    fh_parts = []
                    if general_report.fh_cardio:
                        fh_parts.append(f"Cardiovascular: {general_report.fh_cardio}")
                    if general_report.fh_diabetes:
                        fh_parts.append(f"Diabetes: {general_report.fh_diabetes}")
                    if general_report.fh_cancer:
                        fh_parts.append(f"Cancer: {general_report.fh_cancer}")
                    if general_report.fh_notes:
                        fh_parts.append(f"Notes: {general_report.fh_notes}")
                    if fh_parts:
                        formatted_fh = "\n".join(fh_parts)
                    
                    # Format Social History
                    formatted_sh = None
                    sh_parts = []
                    if general_report.social_smoking:
                        sh_parts.append(f"Smoking: {general_report.social_smoking}")
                    if general_report.social_audit_c is not None:
                        sh_parts.append(f"AUDIT-C Score: {general_report.social_audit_c}")
                    if general_report.social_exercise:
                        sh_parts.append(f"Exercise: {general_report.social_exercise}")
                    if sh_parts:
                        formatted_sh = "; ".join(sh_parts)
                    
                    # Format onset_time
                    onset_time_str = None
                    if general_report.onset_time:
                        onset_time_str = general_report.onset_time.strftime("%Y-%m-%d %H:%M:%S")
                    
                    detailed_notes = {
                        # Report metadata
                        "report_code": general_report.report_code,
                        "report_type": general_report.report_type,
                        "status": general_report.status,
                        
                        # Core report data
                        "chief_complaint": general_report.chief_complaint,
                        "onset_time": onset_time_str,
                        "info_source": general_report.info_source,
                        
                        # HPI (History of Present Illness)
                        "hpi_onset": general_report.hpi_onset,
                        "hpi_duration": general_report.hpi_duration,
                        "hpi_course": general_report.hpi_course,
                        "hpi_modifiers": general_report.hpi_modifiers,
                        "hpi_associated_symptoms": general_report.hpi_associated_symptoms,
                        "hpi_free_text": general_report.hpi_free_text,
                        
                        # PMH/FH/SH (Past Medical History, Family History, Social History)
                        "pmh_conditions": general_report.pmh_conditions,
                        "pmh_surgeries": general_report.pmh_surgeries,
                        "past_medical_history": formatted_pmh,
                        "fh_cardio": general_report.fh_cardio,
                        "fh_diabetes": general_report.fh_diabetes,
                        "fh_cancer": general_report.fh_cancer,
                        "fh_notes": general_report.fh_notes,
                        "family_history": formatted_fh,
                        "social_smoking": general_report.social_smoking,
                        "social_audit_c": general_report.social_audit_c,
                        "social_exercise": general_report.social_exercise,
                        "social_history": formatted_sh,
                        
                        # ROS (Review of Systems)
                        "ros_respiratory": general_report.ros_respiratory,
                        "ros_cardio": general_report.ros_cardio,
                        "ros_gi": general_report.ros_gi,
                        "ros_neuro": general_report.ros_neuro,
                        "ros_gu": general_report.ros_gu,
                        "ros_derm": general_report.ros_derm,
                        "ros_ent": general_report.ros_ent,
                        "ros_msk": general_report.ros_msk,
                        "ros_notes": general_report.ros_notes,
                        "review_of_systems": formatted_ros,
                        
                        # PE (Physical Examination)
                        "pe_general": general_report.pe_general,
                        "pe_lungs": general_report.pe_lungs,
                        "pe_heart": general_report.pe_heart,
                        "pe_abdomen": general_report.pe_abdomen,
                        "pe_neuro": general_report.pe_neuro,
                        "pe_extremities": general_report.pe_extremities,
                        "pe_notes": general_report.pe_notes,
                        "physical_examination": formatted_pe,
                        
                        # Assessment
                        "working_diagnoses": general_report.working_diagnoses,
                        "differential_diagnoses": general_report.differential_diagnoses,
                        "diagnosis": formatted_diagnosis,
                        
                        # Plan
                        "plan_tests": general_report.plan_tests,
                        "plan_referrals": general_report.plan_referrals,
                        "plan_med_changes": general_report.plan_med_changes,
                        "plan_lifestyle": general_report.plan_lifestyle,
                        "plan_follow_up": general_report.plan_follow_up,
                        "treatment_plan": formatted_treatment_plan,
                        
                        # Visit Summary
                        "visit_summary": general_report.visit_summary
                    }
                    
                    record_item = RecordItem(
                        id=str(general_report.id),
                        type=RecordTypeEnum.CONSULTATION,
                        date=report_date_str,
                        doctor=doctor_name,
                        clinic=hospital_name,
                        title=f"{general_report.report_code} - {general_report.report_type.replace('_', ' ').title()}" if general_report.report_code else f"{general_report.report_type.replace('_', ' ').title()} Report",
                        summary=summary,
                        status=RecordStatusEnum.FINAL if general_report.status == "final" or general_report.status == "signed" else RecordStatusEnum.DRAFT,
                        priority=PriorityEnum.NORMAL,
                        notes=json.dumps(detailed_notes),  # Store as JSON string
                        attachments=[],
                        fhir_resource_ids=[str(general_report.fhir_document_reference_id)] if general_report.fhir_document_reference_id else [],
                        clinic_id=str(general_report.clinic_id) if general_report.clinic_id else "00000000-0000-0000-0000-000000000000",
                        patient_id=str(current_patient.patient_id),
                        created_at=created_at_str,
                        updated_at=updated_at_str
                    )
                    
                    return SuccessResponse(data=record_item, message="Record retrieved successfully")
        except Exception as e:
            logger.warning(f"[RECORDS] Error checking GeneralReport: {e}")
            db.rollback()
        
        # If not found in DB, try FHIR resources
        # This would require checking all FHIR resource types, which is complex
        # For now, return 404
        
        problem = create_problem_detail(
            error_type=ErrorType.NOT_FOUND,
            title="Record Not Found",
            status=404,
            detail=f"Record with ID {record_id} not found or access denied",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=404, detail=problem.dict())
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Record Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve record: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/{record_id}/download")
@audit_pii_access("read", "patient", "record_download")
async def download_record(
    request: Request,
    record_id: str = Path(..., description="Record ID"),
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Download record as PDF or text file."""
    try:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[RECORDS] download_record called - record_id: {record_id}, patient_id: {current_patient.patient_id}")
        
        from uuid import UUID
        from fastapi.responses import Response
        from sqlalchemy.orm import joinedload
        # ClinicalNote and GeneralReport are already imported at the top of the file
        # from app.common.models.doctor import ClinicalNote, GeneralReport, Doctor
        
        # Try to find in ClinicalNotes first
        record_uuid = None
        try:
            record_uuid = UUID(record_id) if record_id else None
            if record_uuid:
                clinical_note = db.query(ClinicalNote).options(
                    joinedload(ClinicalNote.doctor).joinedload(Doctor.user)
                ).filter(
                    ClinicalNote.id == record_uuid,
                    ClinicalNote.patient_id == UUID(str(current_patient.patient_id))
                ).first()
                
                if clinical_note and clinical_note.fhir_document_reference_id:
                    # Try to get PDF from FHIR Binary
                    try:
                        doc_ref = await fhir_client._make_request("GET", f"DocumentReference/{clinical_note.fhir_document_reference_id}")
                        if doc_ref and "content" in doc_ref and len(doc_ref["content"]) > 0:
                            binary_url = doc_ref["content"][0].get("attachment", {}).get("url", "")
                            if binary_url and binary_url.startswith("Binary/"):
                                binary_id = binary_url.replace("Binary/", "")
                                binary = await fhir_client._make_request("GET", f"Binary/{binary_id}")
                                if binary and "data" in binary:
                                    import base64
                                    import re
                                    pdf_content = base64.b64decode(binary["data"])
                                    # Build filename: (patient_name)_(type)_(date).pdf
                                    patient_name = current_patient.full_name or "Patient"
                                    patient_name = re.sub(r'[<>:"/\\|?*]', '', patient_name).strip()
                                    patient_name = patient_name.replace(' ', '_')
                                    if not patient_name:
                                        patient_name = "Patient"
                                    note_date_str = clinical_note.note_date.strftime("%Y-%m-%d") if clinical_note.note_date else datetime.now(timezone.utc).strftime("%Y-%m-%d")
                                    filename = f"{patient_name}_consultation_{note_date_str}.pdf"
                                    return Response(
                                        content=pdf_content,
                                        media_type="application/pdf",
                                        headers={
                                            "Content-Disposition": f"attachment; filename={filename}"
                                        }
                                    )
                    except Exception as e:
                        logger.warning(f"Error fetching PDF from FHIR: {e}")
                        # Fallback to text download
                        pass
        except Exception as e:
            logger.warning(f"Error checking ClinicalNote: {e}")
            db.rollback()
        
        # Try GeneralReport
        try:
            if record_uuid:
                general_report = db.query(GeneralReport).options(
                    joinedload(GeneralReport.doctor).joinedload(Doctor.user)
                ).filter(
                    GeneralReport.id == record_uuid,
                    GeneralReport.patient_id == UUID(str(current_patient.patient_id))
                ).first()
                
                if general_report and hasattr(general_report, 'fhir_document_reference_id') and general_report.fhir_document_reference_id:
                    # Try to get PDF from FHIR Binary
                    try:
                        doc_ref = await fhir_client._make_request("GET", f"DocumentReference/{general_report.fhir_document_reference_id}")
                        if doc_ref and "content" in doc_ref and len(doc_ref["content"]) > 0:
                            binary_url = doc_ref["content"][0].get("attachment", {}).get("url", "")
                            if binary_url and binary_url.startswith("Binary/"):
                                binary_id = binary_url.replace("Binary/", "")
                                binary = await fhir_client._make_request("GET", f"Binary/{binary_id}")
                                if binary and "data" in binary:
                                    import base64
                                    import re
                                    pdf_content = base64.b64decode(binary["data"])
                                    # Build filename: (patient_name)_(type)_(date).pdf
                                    patient_name = current_patient.full_name or "Patient"
                                    patient_name = re.sub(r'[<>:"/\\|?*]', '', patient_name).strip()
                                    patient_name = patient_name.replace(' ', '_')
                                    if not patient_name:
                                        patient_name = "Patient"
                                    report_date_str = general_report.created_at.strftime("%Y-%m-%d") if general_report.created_at else datetime.now(timezone.utc).strftime("%Y-%m-%d")
                                    record_type = general_report.report_type.replace('_', '') if general_report.report_type else "report"
                                    filename = f"{patient_name}_{record_type}_{report_date_str}.pdf"
                                    return Response(
                                        content=pdf_content,
                                        media_type="application/pdf",
                                        headers={
                                            "Content-Disposition": f"attachment; filename={filename}"
                                        }
                                    )
                    except Exception as e:
                        logger.warning(f"Error fetching PDF from FHIR: {e}")
                        # Fallback to text download
                        pass
        except Exception as e:
            logger.warning(f"Error checking GeneralReport: {e}")
            db.rollback()
        
        # Fallback: Generate PDF from record data
        # Use the same comprehensive logic as get_record_detail
        record = None
        detailed_notes = {}
        record_date = None
        
        try:
            if record_uuid:
                # Try ClinicalNote
                clinical_note = db.query(ClinicalNote).options(
                    joinedload(ClinicalNote.doctor).joinedload(Doctor.user)
                ).filter(
                    ClinicalNote.id == record_uuid,
                    ClinicalNote.patient_id == UUID(str(current_patient.patient_id))
                ).first()
                
                if clinical_note:
                    # Use the same formatting logic as get_record_detail
                    import json
                    template_data = {}
                    if hasattr(clinical_note, 'template_data') and clinical_note.template_data:
                        if isinstance(clinical_note.template_data, str):
                            try:
                                template_data = json.loads(clinical_note.template_data)
                            except:
                                template_data = {}
                        else:
                            template_data = clinical_note.template_data
                    elif clinical_note.content:
                        try:
                            template_data = json.loads(clinical_note.content) if isinstance(clinical_note.content, str) else clinical_note.content
                        except:
                            template_data = {}
                    
                    # Format assessment
                    formatted_assessment = None
                    if template_data.get('assessment'):
                        assessment_data = template_data['assessment']
                        if isinstance(assessment_data, dict):
                            working = assessment_data.get('working', [])
                            ddx = assessment_data.get('ddx', [])
                            parts = []
                            if working:
                                working_str = ', '.join([
                                    f"{d.get('code', '')}: {d.get('term', '')}".strip(': ').strip()
                                    if isinstance(d, dict) else str(d)
                                    for d in working
                                ])
                                if working_str:
                                    parts.append(f"Working Diagnosis: {working_str}")
                            if ddx:
                                ddx_str = ', '.join([
                                    f"{d.get('code', '')}: {d.get('term', '')}".strip(': ').strip()
                                    if isinstance(d, dict) else str(d)
                                    for d in ddx
                                ])
                                if ddx_str:
                                    parts.append(f"Differential Diagnoses: {ddx_str}")
                            formatted_assessment = '\n'.join(parts) if parts else "No diagnosis specified"
                    elif clinical_note.assessment:
                        try:
                            if isinstance(clinical_note.assessment, str):
                                parsed_assessment = json.loads(clinical_note.assessment)
                                if isinstance(parsed_assessment, dict):
                                    working = parsed_assessment.get('working', [])
                                    ddx = parsed_assessment.get('ddx', [])
                                    parts = []
                                    if working:
                                        working_str = ', '.join([
                                            f"{d.get('code', '')}: {d.get('term', '')}".strip(': ').strip()
                                            if isinstance(d, dict) else str(d)
                                            for d in working
                                        ])
                                        if working_str:
                                            parts.append(f"Working Diagnosis: {working_str}")
                                    if ddx:
                                        ddx_str = ', '.join([
                                            f"{d.get('code', '')}: {d.get('term', '')}".strip(': ').strip()
                                            if isinstance(d, dict) else str(d)
                                            for d in ddx
                                        ])
                                        if ddx_str:
                                            parts.append(f"Differential Diagnoses: {ddx_str}")
                                    formatted_assessment = '\n'.join(parts) if parts else "No diagnosis specified"
                                else:
                                    formatted_assessment = clinical_note.assessment
                            else:
                                formatted_assessment = clinical_note.assessment
                        except (json.JSONDecodeError, TypeError):
                            formatted_assessment = clinical_note.assessment
                    
                    # Format plan
                    formatted_plan = None
                    if template_data.get('plan'):
                        plan_data = template_data['plan']
                        if isinstance(plan_data, dict):
                            parts = []
                            if plan_data.get('tests'):
                                test_list = plan_data['tests']
                                if isinstance(test_list, list) and len(test_list) > 0:
                                    test_strs = []
                                    for t in test_list:
                                        if isinstance(t, dict):
                                            test_strs.append(t.get('name') or t.get('label') or str(t))
                                        else:
                                            test_strs.append(str(t))
                                    if test_strs:
                                        parts.append(f"Tests: {', '.join(test_strs)}")
                            if plan_data.get('referrals'):
                                ref_list = plan_data['referrals']
                                if isinstance(ref_list, list) and len(ref_list) > 0:
                                    ref_strs = []
                                    for r in ref_list:
                                        if isinstance(r, dict):
                                            ref_strs.append(r.get('specialty') or r.get('name') or str(r))
                                        else:
                                            ref_strs.append(str(r))
                                    if ref_strs:
                                        parts.append(f"Referrals: {', '.join(ref_strs)}")
                            if plan_data.get('med_changes'):
                                med_list = plan_data['med_changes']
                                if isinstance(med_list, list) and len(med_list) > 0:
                                    med_strs = []
                                    for m in med_list:
                                        if isinstance(m, dict):
                                            med_name = m.get('med') or m.get('name') or ''
                                            med_dose = m.get('dose') or m.get('dosage') or ''
                                            med_freq = m.get('freq') or m.get('frequency') or ''
                                            med_str = f"{med_name} {med_dose} {med_freq}".strip()
                                            med_strs.append(med_str if med_str else str(m))
                                        else:
                                            med_strs.append(str(m))
                                    if med_strs:
                                        parts.append(f"Medication Changes: {', '.join(med_strs)}")
                            if plan_data.get('lifestyle'):
                                lifestyle_list = plan_data['lifestyle']
                                if isinstance(lifestyle_list, list) and len(lifestyle_list) > 0:
                                    lifestyle_strs = []
                                    for l in lifestyle_list:
                                        if isinstance(l, dict):
                                            lifestyle_strs.append(l.get('recommendation') or l.get('name') or str(l))
                                        else:
                                            lifestyle_strs.append(str(l))
                                    if lifestyle_strs:
                                        parts.append(f"Lifestyle Recommendations: {', '.join(lifestyle_strs)}")
                            if plan_data.get('follow_up'):
                                parts.append(f"Follow-up: {plan_data['follow_up']}")
                            formatted_plan = '\n'.join(parts) if parts else "No treatment plan specified"
                    elif clinical_note.plan:
                        try:
                            if isinstance(clinical_note.plan, str):
                                parsed_plan = json.loads(clinical_note.plan)
                                if isinstance(parsed_plan, dict):
                                    parts = []
                                    if parsed_plan.get('tests'):
                                        test_list = parsed_plan['tests']
                                        if isinstance(test_list, list) and len(test_list) > 0:
                                            test_strs = [str(t) for t in test_list]
                                            parts.append(f"Tests: {', '.join(test_strs)}")
                                    if parsed_plan.get('referrals'):
                                        ref_list = parsed_plan['referrals']
                                        if isinstance(ref_list, list) and len(ref_list) > 0:
                                            ref_strs = [str(r) for r in ref_list]
                                            parts.append(f"Referrals: {', '.join(ref_strs)}")
                                    if parsed_plan.get('med_changes'):
                                        med_list = parsed_plan['med_changes']
                                        if isinstance(med_list, list) and len(med_list) > 0:
                                            med_strs = [str(m) for m in med_list]
                                            parts.append(f"Medication Changes: {', '.join(med_strs)}")
                                    if parsed_plan.get('lifestyle'):
                                        lifestyle_list = parsed_plan['lifestyle']
                                        if isinstance(lifestyle_list, list) and len(lifestyle_list) > 0:
                                            lifestyle_strs = [str(l) for l in lifestyle_list]
                                            parts.append(f"Lifestyle: {', '.join(lifestyle_strs)}")
                                    if parsed_plan.get('follow_up'):
                                        parts.append(f"Follow-up: {parsed_plan['follow_up']}")
                                    formatted_plan = '\n'.join(parts) if parts else "No treatment plan specified"
                                else:
                                    formatted_plan = clinical_note.plan
                            else:
                                formatted_plan = clinical_note.plan
                        except (json.JSONDecodeError, TypeError):
                            formatted_plan = clinical_note.plan
                    
                    # Build comprehensive detailed_notes (same as get_record_detail)
                    detailed_notes = {
                        "subjective": clinical_note.subjective,
                        "objective": clinical_note.objective,
                        "assessment": formatted_assessment if formatted_assessment is not None else (clinical_note.assessment if clinical_note.assessment and not (isinstance(clinical_note.assessment, str) and clinical_note.assessment.strip().startswith('{')) else "No assessment available"),
                        "plan": formatted_plan if formatted_plan is not None else (clinical_note.plan if clinical_note.plan and not (isinstance(clinical_note.plan, str) and clinical_note.plan.strip().startswith('{')) else "No plan available"),
                        "content": clinical_note.content,
                        "note_type": clinical_note.note_type,
                        "template_data": template_data,
                        "doc_type": template_data.get('doc_type') if template_data else None,
                        "reportData": template_data
                    }
                    
                    # Merge all template_data fields
                    if template_data and isinstance(template_data, dict):
                        for key, value in template_data.items():
                            if key not in ['assessment', 'plan'] or (key == 'assessment' and formatted_assessment is None) or (key == 'plan' and formatted_plan is None):
                                detailed_notes[key] = value
                    
                    doctor_name = ""
                    if clinical_note.doctor and clinical_note.doctor.user:
                        if clinical_note.doctor.user.first_name and clinical_note.doctor.user.last_name:
                            doctor_name = f"{clinical_note.doctor.user.first_name} {clinical_note.doctor.user.last_name}"
                        elif clinical_note.doctor.user.full_name:
                            doctor_name = clinical_note.doctor.user.full_name
                    
                    note_date_str = clinical_note.note_date.strftime("%Y-%m-%d") if clinical_note.note_date else datetime.now(timezone.utc).strftime("%Y-%m-%d")
                    record_date = clinical_note.note_date.date() if clinical_note.note_date else datetime.now(timezone.utc).date()
                    
                    record = type('Record', (), {
                        'type': 'consultation',
                        'date': note_date_str,
                        'title': f"{clinical_note.note_type.replace('_', ' ').title()} Note",
                        'doctor': doctor_name,
                        'hospital': 'General Clinic',
                        'summary': clinical_note.subjective or clinical_note.content or ''
                    })()
                else:
                    # Try GeneralReport - use same comprehensive logic as get_record_detail
                    general_report = db.query(GeneralReport).options(
                        joinedload(GeneralReport.doctor).joinedload(Doctor.user),
                        joinedload(GeneralReport.clinic)
                    ).filter(
                        GeneralReport.id == record_uuid,
                        GeneralReport.patient_id == UUID(str(current_patient.patient_id))
                    ).first()
                    
                    if general_report:
                        # Format all fields (same as get_record_detail)
                        formatted_pe = None
                        pe_parts = []
                        if general_report.pe_general:
                            pe_parts.append(f"general: {general_report.pe_general}")
                        if general_report.pe_lungs:
                            pe_parts.append(f"lungs: {general_report.pe_lungs}")
                        if general_report.pe_heart:
                            pe_parts.append(f"heart: {general_report.pe_heart}")
                        if general_report.pe_abdomen:
                            pe_parts.append(f"abdomen: {general_report.pe_abdomen}")
                        if general_report.pe_neuro:
                            pe_parts.append(f"neuro: {general_report.pe_neuro}")
                        if general_report.pe_extremities:
                            pe_parts.append(f"extremities: {general_report.pe_extremities}")
                        if pe_parts:
                            formatted_pe = "; ".join(pe_parts)
                        elif general_report.pe_notes:
                            if isinstance(general_report.pe_notes, dict):
                                formatted_pe = "; ".join([f"{k}: {v}" for k, v in general_report.pe_notes.items() if v])
                            else:
                                formatted_pe = str(general_report.pe_notes)
                        
                        formatted_diagnosis = None
                        if general_report.working_diagnoses:
                            if isinstance(general_report.working_diagnoses, list) and len(general_report.working_diagnoses) > 0:
                                diag_parts = []
                                for diag in general_report.working_diagnoses:
                                    if isinstance(diag, dict):
                                        code = diag.get('code', '')
                                        term = diag.get('term', '')
                                        if code and term:
                                            diag_parts.append(f"{code}: {term}")
                                        elif term:
                                            diag_parts.append(term)
                                        elif code:
                                            diag_parts.append(code)
                                    else:
                                        diag_parts.append(str(diag))
                                if diag_parts:
                                    formatted_diagnosis = "Working Diagnosis: " + ", ".join(diag_parts)
                        
                        formatted_treatment_plan = None
                        plan_parts = []
                        if general_report.plan_tests and isinstance(general_report.plan_tests, list) and len(general_report.plan_tests) > 0:
                            plan_parts.append(f"Tests: {', '.join([str(t) for t in general_report.plan_tests])}")
                        if general_report.plan_referrals and isinstance(general_report.plan_referrals, list) and len(general_report.plan_referrals) > 0:
                            plan_parts.append(f"Referrals: {', '.join([str(r) for r in general_report.plan_referrals])}")
                        if general_report.plan_med_changes and isinstance(general_report.plan_med_changes, list) and len(general_report.plan_med_changes) > 0:
                            plan_parts.append(f"Medication Changes: {', '.join([str(m) for m in general_report.plan_med_changes])}")
                        if general_report.plan_lifestyle and isinstance(general_report.plan_lifestyle, list) and len(general_report.plan_lifestyle) > 0:
                            plan_parts.append(f"Lifestyle: {', '.join([str(l) for l in general_report.plan_lifestyle])}")
                        if general_report.plan_follow_up:
                            plan_parts.append(f"Follow-up: {general_report.plan_follow_up}")
                        if plan_parts:
                            formatted_treatment_plan = "\n".join(plan_parts)
                        
                        formatted_ros = None
                        ros_parts = []
                        if general_report.ros_respiratory and general_report.ros_respiratory != "normal":
                            ros_parts.append(f"Respiratory: {general_report.ros_respiratory}")
                        if general_report.ros_cardio and general_report.ros_cardio != "normal":
                            ros_parts.append(f"Cardiovascular: {general_report.ros_cardio}")
                        if general_report.ros_gi and general_report.ros_gi != "normal":
                            ros_parts.append(f"Gastrointestinal: {general_report.ros_gi}")
                        if general_report.ros_neuro and general_report.ros_neuro != "normal":
                            ros_parts.append(f"Neurological: {general_report.ros_neuro}")
                        if general_report.ros_gu and general_report.ros_gu != "normal":
                            ros_parts.append(f"Genitourinary: {general_report.ros_gu}")
                        if general_report.ros_derm and general_report.ros_derm != "normal":
                            ros_parts.append(f"Dermatological: {general_report.ros_derm}")
                        if general_report.ros_ent and general_report.ros_ent != "normal":
                            ros_parts.append(f"ENT: {general_report.ros_ent}")
                        if general_report.ros_msk and general_report.ros_msk != "normal":
                            ros_parts.append(f"Musculoskeletal: {general_report.ros_msk}")
                        if ros_parts:
                            formatted_ros = "; ".join(ros_parts)
                        elif general_report.ros_notes:
                            if isinstance(general_report.ros_notes, dict):
                                formatted_ros = "; ".join([f"{k}: {v}" for k, v in general_report.ros_notes.items() if v])
                            else:
                                formatted_ros = str(general_report.ros_notes)
                        
                        formatted_pmh = None
                        pmh_parts = []
                        if general_report.pmh_conditions:
                            if isinstance(general_report.pmh_conditions, list) and len(general_report.pmh_conditions) > 0:
                                pmh_parts.append(f"Conditions: {', '.join([str(c) for c in general_report.pmh_conditions])}")
                            elif isinstance(general_report.pmh_conditions, str):
                                pmh_parts.append(f"Conditions: {general_report.pmh_conditions}")
                        if general_report.pmh_surgeries:
                            pmh_parts.append(f"Surgeries: {general_report.pmh_surgeries}")
                        if pmh_parts:
                            formatted_pmh = "\n".join(pmh_parts)
                        
                        formatted_fh = None
                        fh_parts = []
                        if general_report.fh_cardio:
                            fh_parts.append(f"Cardiovascular: {general_report.fh_cardio}")
                        if general_report.fh_diabetes:
                            fh_parts.append(f"Diabetes: {general_report.fh_diabetes}")
                        if general_report.fh_cancer:
                            fh_parts.append(f"Cancer: {general_report.fh_cancer}")
                        if general_report.fh_notes:
                            fh_parts.append(f"Notes: {general_report.fh_notes}")
                        if fh_parts:
                            formatted_fh = "\n".join(fh_parts)
                        
                        formatted_sh = None
                        sh_parts = []
                        if general_report.social_smoking:
                            sh_parts.append(f"Smoking: {general_report.social_smoking}")
                        if general_report.social_audit_c is not None:
                            sh_parts.append(f"AUDIT-C Score: {general_report.social_audit_c}")
                        if general_report.social_exercise:
                            sh_parts.append(f"Exercise: {general_report.social_exercise}")
                        if sh_parts:
                            formatted_sh = "; ".join(sh_parts)
                        
                        onset_time_str = None
                        if general_report.onset_time:
                            onset_time_str = general_report.onset_time.strftime("%Y-%m-%d %H:%M:%S")
                        
                        # Build comprehensive detailed_notes (same as get_record_detail)
                        detailed_notes = {
                            "report_code": general_report.report_code,
                            "report_type": general_report.report_type,
                            "status": general_report.status,
                            "chief_complaint": general_report.chief_complaint,
                            "onset_time": onset_time_str,
                            "info_source": general_report.info_source,
                            "hpi_onset": general_report.hpi_onset,
                            "hpi_duration": general_report.hpi_duration,
                            "hpi_course": general_report.hpi_course,
                            "hpi_modifiers": general_report.hpi_modifiers,
                            "hpi_associated_symptoms": general_report.hpi_associated_symptoms,
                            "hpi_free_text": general_report.hpi_free_text,
                            "pmh_conditions": general_report.pmh_conditions,
                            "pmh_surgeries": general_report.pmh_surgeries,
                            "past_medical_history": formatted_pmh,
                            "fh_cardio": general_report.fh_cardio,
                            "fh_diabetes": general_report.fh_diabetes,
                            "fh_cancer": general_report.fh_cancer,
                            "fh_notes": general_report.fh_notes,
                            "family_history": formatted_fh,
                            "social_smoking": general_report.social_smoking,
                            "social_audit_c": general_report.social_audit_c,
                            "social_exercise": general_report.social_exercise,
                            "social_history": formatted_sh,
                            "ros_respiratory": general_report.ros_respiratory,
                            "ros_cardio": general_report.ros_cardio,
                            "ros_gi": general_report.ros_gi,
                            "ros_neuro": general_report.ros_neuro,
                            "ros_gu": general_report.ros_gu,
                            "ros_derm": general_report.ros_derm,
                            "ros_ent": general_report.ros_ent,
                            "ros_msk": general_report.ros_msk,
                            "ros_notes": general_report.ros_notes,
                            "review_of_systems": formatted_ros,
                            "pe_general": general_report.pe_general,
                            "pe_lungs": general_report.pe_lungs,
                            "pe_heart": general_report.pe_heart,
                            "pe_abdomen": general_report.pe_abdomen,
                            "pe_neuro": general_report.pe_neuro,
                            "pe_extremities": general_report.pe_extremities,
                            "pe_notes": general_report.pe_notes,
                            "physical_examination": formatted_pe,
                            "working_diagnoses": general_report.working_diagnoses,
                            "differential_diagnoses": general_report.differential_diagnoses,
                            "diagnosis": formatted_diagnosis,
                            "plan_tests": general_report.plan_tests,
                            "plan_referrals": general_report.plan_referrals,
                            "plan_med_changes": general_report.plan_med_changes,
                            "plan_lifestyle": general_report.plan_lifestyle,
                            "plan_follow_up": general_report.plan_follow_up,
                            "treatment_plan": formatted_treatment_plan,
                            "visit_summary": general_report.visit_summary,
                            "assessment": formatted_diagnosis,
                            "plan": formatted_treatment_plan
                        }
                        
                        doctor_name = ""
                        if general_report.doctor and general_report.doctor.user:
                            if general_report.doctor.user.first_name and general_report.doctor.user.last_name:
                                doctor_name = f"{general_report.doctor.user.first_name} {general_report.doctor.user.last_name}"
                            elif general_report.doctor.user.full_name:
                                doctor_name = general_report.doctor.user.full_name
                        
                        hospital_name = general_report.clinic.name if general_report.clinic else "General Clinic"
                        report_date_str = general_report.created_at.strftime("%Y-%m-%d") if general_report.created_at else datetime.now(timezone.utc).strftime("%Y-%m-%d")
                        record_date = general_report.created_at.date() if general_report.created_at else datetime.now(timezone.utc).date()
                        
                        record = type('Record', (), {
                            'type': 'report',
                            'date': report_date_str,
                            'title': f"{general_report.report_type.replace('_', ' ').title()} Report" if general_report.report_type else 'General Report',
                            'doctor': doctor_name,
                            'hospital': hospital_name,
                            'summary': general_report.chief_complaint or general_report.visit_summary or ''
                        })()
        except Exception as e:
            logger.warning(f"Error building record data: {e}")
            db.rollback()
        
        if not record:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND,
                title="Record Not Found",
                status=404,
                detail=f"Record with ID {record_id} not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # Build filename: (patient_name)_(type)_(date).pdf
        import re
        patient_name = current_patient.full_name or "Patient"
        # Sanitize patient name: replace spaces with underscores, remove invalid filename characters
        patient_name = re.sub(r'[<>:"/\\|?*]', '', patient_name).strip()
        patient_name = patient_name.replace(' ', '_')
        if not patient_name:
            patient_name = "Patient"
        
        record_type = getattr(record, 'type', 'consultation')
        record_date = getattr(record, 'date', datetime.now(timezone.utc).strftime("%Y-%m-%d"))
        # Sanitize date (should already be YYYY-MM-DD format)
        record_date = re.sub(r'[<>:"/\\|?*]', '', str(record_date))
        
        filename = f"{patient_name}_{record_type}_{record_date}.pdf"
        
        # Get medications for this record date
        medications = []
        if record_date:
            try:
                from app.common.models.prescription import Prescription
                from datetime import date
                meds = db.query(Prescription).filter(
                    Prescription.patient_id == UUID(str(current_patient.patient_id)),
                    Prescription.prescribed_date == record_date
                ).all()
                for med in meds:
                    medications.append({
                        'medicineName': med.medicine_name if hasattr(med, 'medicine_name') else None,
                        'knownAs': med.known_as if hasattr(med, 'known_as') else None,
                        'dosage': med.dosage if hasattr(med, 'dosage') else None,
                        'frequency': med.frequency if hasattr(med, 'frequency') else None,
                        'purpose': med.purpose if hasattr(med, 'purpose') else None,
                        'prescribedDate': med.prescribed_date.strftime("%Y-%m-%d") if hasattr(med, 'prescribed_date') and med.prescribed_date else None,
                        'endDate': med.end_date.strftime("%Y-%m-%d") if hasattr(med, 'end_date') and med.end_date else None,
                        'remainingRefills': med.remaining_refills if hasattr(med, 'remaining_refills') else None
                    })
            except Exception as e:
                logger.warning(f"Error fetching medications: {e}")
        
        # Extract vitals from detailed_notes
        vitals = {}
        if detailed_notes.get('vitals'):
            vitals = detailed_notes['vitals'] if isinstance(detailed_notes['vitals'], dict) else {}
        elif detailed_notes.get('reportData') and isinstance(detailed_notes['reportData'], dict) and detailed_notes['reportData'].get('vitals'):
            vitals = detailed_notes['reportData']['vitals'] if isinstance(detailed_notes['reportData']['vitals'], dict) else {}
        elif detailed_notes.get('template_data') and isinstance(detailed_notes['template_data'], dict) and detailed_notes['template_data'].get('vitals'):
            vitals = detailed_notes['template_data']['vitals'] if isinstance(detailed_notes['template_data']['vitals'], dict) else {}
        
        # Generate PDF from content
        try:
            # Try to use reportlab if available
            try:
                from reportlab.lib.pagesizes import letter
                from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
                from reportlab.lib.units import inch
                from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
                from reportlab.lib.enums import TA_LEFT, TA_CENTER
                from io import BytesIO
                
                buffer = BytesIO()
                doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
                
                styles = getSampleStyleSheet()
                title_style = ParagraphStyle(
                    'CustomTitle',
                    parent=styles['Heading1'],
                    fontSize=16,
                    textColor='#10b981',
                    spaceAfter=12,
                    alignment=TA_CENTER
                )
                heading_style = ParagraphStyle(
                    'CustomHeading',
                    parent=styles['Heading2'],
                    fontSize=12,
                    textColor='#10b981',
                    spaceAfter=6,
                    spaceBefore=12
                )
                normal_style = styles['Normal']
                
                story = []
                
                # Title
                story.append(Paragraph("MEDICAL RECORD SUMMARY", title_style))
                story.append(Spacer(1, 0.2*inch))
                
                # Header info
                story.append(Paragraph(f"<b>Record Type:</b> {getattr(record, 'type', 'N/A')}", normal_style))
                story.append(Paragraph(f"<b>Date:</b> {getattr(record, 'date', 'N/A')}", normal_style))
                story.append(Paragraph(f"<b>Title:</b> {getattr(record, 'title', 'N/A')}", normal_style))
                story.append(Spacer(1, 0.1*inch))
                story.append(Paragraph(f"<b>Doctor:</b> {getattr(record, 'doctor', 'N/A')}", normal_style))
                story.append(Paragraph(f"<b>Hospital/Clinic:</b> {getattr(record, 'hospital', 'N/A')}", normal_style))
                story.append(Spacer(1, 0.2*inch))
                
                # Vitals at the beginning
                has_vitals = vitals and isinstance(vitals, dict) and any([
                    vitals.get('bp_right'), vitals.get('bp_left'), vitals.get('hr'),
                    vitals.get('temp'), vitals.get('spo2'), vitals.get('weight'),
                    vitals.get('height'), vitals.get('bmi'), vitals.get('respiratory_rate')
                ])
                if has_vitals:
                    story.append(Paragraph("Vitals", heading_style))
                    vitals_text = []
                    if vitals.get('bp_right'):
                        vitals_text.append(f"BP Right: {vitals['bp_right']}")
                    if vitals.get('bp_left'):
                        vitals_text.append(f"BP Left: {vitals['bp_left']}")
                    if vitals.get('hr'):
                        vitals_text.append(f"Heart Rate: {vitals['hr']} bpm")
                    if vitals.get('temp'):
                        vitals_text.append(f"Temperature: {vitals['temp']}°C")
                    if vitals.get('spo2'):
                        vitals_text.append(f"SpO2: {vitals['spo2']}%")
                    if vitals.get('respiratory_rate'):
                        vitals_text.append(f"Respiratory Rate: {vitals['respiratory_rate']} /min")
                    if vitals.get('weight'):
                        vitals_text.append(f"Weight: {vitals['weight']} kg")
                    if vitals.get('height'):
                        vitals_text.append(f"Height: {vitals['height']} cm")
                    if vitals.get('bmi'):
                        vitals_text.append(f"BMI: {vitals['bmi']}")
                    story.append(Paragraph("<br/>".join(vitals_text), normal_style))
                    story.append(Spacer(1, 0.1*inch))
                
                # Chief Complaint
                if detailed_notes.get('chief_complaint'):
                    story.append(Paragraph("Chief Complaint", heading_style))
                    story.append(Paragraph(str(detailed_notes['chief_complaint']).replace('\n', '<br/>'), normal_style))
                    story.append(Spacer(1, 0.1*inch))
                
                # HPI
                if detailed_notes.get('hpi_free_text'):
                    story.append(Paragraph("History of Present Illness", heading_style))
                    story.append(Paragraph(str(detailed_notes['hpi_free_text']).replace('\n', '<br/>'), normal_style))
                    story.append(Spacer(1, 0.1*inch))
                elif detailed_notes.get('hpi'):
                    story.append(Paragraph("History of Present Illness", heading_style))
                    story.append(Paragraph(str(detailed_notes['hpi']).replace('\n', '<br/>'), normal_style))
                    story.append(Spacer(1, 0.1*inch))
                
                # Past Medical History
                if detailed_notes.get('past_medical_history'):
                    story.append(Paragraph("Past Medical History", heading_style))
                    story.append(Paragraph(str(detailed_notes['past_medical_history']).replace('\n', '<br/>'), normal_style))
                    story.append(Spacer(1, 0.1*inch))
                
                # Family History
                if detailed_notes.get('family_history'):
                    story.append(Paragraph("Family History", heading_style))
                    story.append(Paragraph(str(detailed_notes['family_history']).replace('\n', '<br/>'), normal_style))
                    story.append(Spacer(1, 0.1*inch))
                
                # Social History
                if detailed_notes.get('social_history'):
                    story.append(Paragraph("Social History", heading_style))
                    story.append(Paragraph(str(detailed_notes['social_history']).replace('\n', '<br/>'), normal_style))
                    story.append(Spacer(1, 0.1*inch))
                
                # Review of Systems
                if detailed_notes.get('review_of_systems'):
                    story.append(Paragraph("Review of Systems", heading_style))
                    story.append(Paragraph(str(detailed_notes['review_of_systems']).replace('\n', '<br/>'), normal_style))
                    story.append(Spacer(1, 0.1*inch))
                
                # Physical Examination
                if detailed_notes.get('physical_examination'):
                    story.append(Paragraph("Physical Examination", heading_style))
                    story.append(Paragraph(str(detailed_notes['physical_examination']).replace('\n', '<br/>'), normal_style))
                    story.append(Spacer(1, 0.1*inch))
                
                # Subjective
                if detailed_notes.get('subjective'):
                    story.append(Paragraph("Subjective", heading_style))
                    story.append(Paragraph(str(detailed_notes['subjective']).replace('\n', '<br/>'), normal_style))
                    story.append(Spacer(1, 0.1*inch))
                
                # Objective
                if detailed_notes.get('objective'):
                    story.append(Paragraph("Objective", heading_style))
                    story.append(Paragraph(str(detailed_notes['objective']).replace('\n', '<br/>'), normal_style))
                    story.append(Spacer(1, 0.1*inch))
                
                # Assessment/Diagnosis
                if detailed_notes.get('assessment'):
                    story.append(Paragraph("Assessment", heading_style))
                    assessment_str = detailed_notes['assessment']
                    if isinstance(assessment_str, str) and not assessment_str.strip().startswith('{'):
                        story.append(Paragraph(assessment_str.replace('\n', '<br/>'), normal_style))
                    else:
                        story.append(Paragraph(str(assessment_str).replace('\n', '<br/>'), normal_style))
                    story.append(Spacer(1, 0.1*inch))
                elif detailed_notes.get('diagnosis'):
                    story.append(Paragraph("Diagnosis", heading_style))
                    story.append(Paragraph(str(detailed_notes['diagnosis']).replace('\n', '<br/>'), normal_style))
                    story.append(Spacer(1, 0.1*inch))
                
                # Treatment Plan/Plan
                if detailed_notes.get('plan'):
                    story.append(Paragraph("Treatment Plan", heading_style))
                    plan_str = detailed_notes['plan']
                    if isinstance(plan_str, str) and not plan_str.strip().startswith('{'):
                        story.append(Paragraph(plan_str.replace('\n', '<br/>'), normal_style))
                    else:
                        story.append(Paragraph(str(plan_str).replace('\n', '<br/>'), normal_style))
                    story.append(Spacer(1, 0.1*inch))
                elif detailed_notes.get('treatment_plan'):
                    story.append(Paragraph("Treatment Plan", heading_style))
                    story.append(Paragraph(str(detailed_notes['treatment_plan']).replace('\n', '<br/>'), normal_style))
                    story.append(Spacer(1, 0.1*inch))
                
                # Visit Summary
                if detailed_notes.get('visit_summary'):
                    story.append(Paragraph("Visit Summary", heading_style))
                    story.append(Paragraph(str(detailed_notes['visit_summary']).replace('\n', '<br/>'), normal_style))
                    story.append(Spacer(1, 0.1*inch))
                
                # Summary
                if getattr(record, 'summary', ''):
                    story.append(Paragraph("Summary", heading_style))
                    story.append(Paragraph(str(record.summary).replace('\n', '<br/>'), normal_style))
                    story.append(Spacer(1, 0.1*inch))
                
                # Prescribed Medications at the end
                if medications and len(medications) > 0:
                    story.append(Paragraph("Prescribed Medications", heading_style))
                    for med in medications:
                        med_parts = []
                        if med.get('medicineName'):
                            med_parts.append(f"<b>{med['medicineName']}</b>")
                        if med.get('knownAs') and med.get('knownAs') != med.get('medicineName'):
                            med_parts.append(f"({med['knownAs']})")
                        if med.get('purpose'):
                            med_parts.append(f"Purpose: {med['purpose']}")
                        if med.get('dosage'):
                            med_parts.append(f"Dosage: {med['dosage']}")
                        if med.get('frequency'):
                            med_parts.append(f"Frequency: {med['frequency']}")
                        if med.get('prescribedDate'):
                            med_parts.append(f"Prescribed: {med['prescribedDate']}")
                        if med.get('endDate'):
                            med_parts.append(f"End Date: {med['endDate']}")
                        if med.get('remainingRefills') and med.get('remainingRefills', 0) > 0:
                            med_parts.append(f"Remaining Refills: {med['remainingRefills']}")
                        if med_parts:
                            story.append(Paragraph("<br/>".join(med_parts), normal_style))
                            story.append(Spacer(1, 0.05*inch))
                
                doc.build(story)
                pdf_content = buffer.getvalue()
                buffer.close()
                
                # Filename is already set above
                return Response(
                    content=pdf_content,
                    media_type="application/pdf",
                    headers={
                        "Content-Disposition": f"attachment; filename={filename}"
                    }
                )
            except ImportError:
                # If reportlab is not available, use a simple HTML to PDF approach or fallback to text
                logger.warning("reportlab not available, generating simple PDF")
                # For now, we'll create a simple PDF-like structure using base64 encoded content
                # or use weasyprint if available
                try:
                    from weasyprint import HTML
                    from io import BytesIO
                    
                    html_content = f"""
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            body {{ font-family: Arial, sans-serif; margin: 40px; }}
                            h1 {{ color: #10b981; text-align: center; }}
                            h2 {{ color: #10b981; margin-top: 20px; }}
                            p {{ margin: 10px 0; }}
                            .header {{ margin-bottom: 30px; }}
                        </style>
                    </head>
                    <body>
                        <h1>MEDICAL RECORD SUMMARY</h1>
                        <div class="header">
                            <p><strong>Record Type:</strong> {getattr(record, 'type', 'N/A')}</p>
                            <p><strong>Date:</strong> {getattr(record, 'date', 'N/A')}</p>
                            <p><strong>Title:</strong> {getattr(record, 'title', 'N/A')}</p>
                            <p><strong>Doctor:</strong> {getattr(record, 'doctor', 'N/A')}</p>
                            <p><strong>Hospital/Clinic:</strong> {getattr(record, 'hospital', 'N/A')}</p>
                        </div>
                        {f'<h2>Chief Complaint</h2><p>{detailed_notes.get("chief_complaint", "").replace(chr(10), "<br/>")}</p>' if detailed_notes.get('chief_complaint') else ''}
                        {f'<h2>History of Present Illness</h2><p>{detailed_notes.get("hpi_free_text", "").replace(chr(10), "<br/>")}</p>' if detailed_notes.get('hpi_free_text') else ''}
                        {f'<h2>Subjective</h2><p>{str(detailed_notes.get("subjective", "")).replace(chr(10), "<br/>")}</p>' if detailed_notes.get('subjective') else ''}
                        {f'<h2>Objective</h2><p>{str(detailed_notes.get("objective", "")).replace(chr(10), "<br/>")}</p>' if detailed_notes.get('objective') else ''}
                        {f'<h2>Assessment</h2><p>{str(detailed_notes.get("assessment", "")).replace(chr(10), "<br/>")}</p>' if detailed_notes.get('assessment') else ''}
                        {f'<h2>Treatment Plan</h2><p>{str(detailed_notes.get("plan", "")).replace(chr(10), "<br/>")}</p>' if detailed_notes.get('plan') else ''}
                        {f'<h2>Summary</h2><p>{str(getattr(record, "summary", "")).replace(chr(10), "<br/>")}</p>' if getattr(record, 'summary', '') else ''}
                    </body>
                    </html>
                    """
                    
                    pdf_file = BytesIO()
                    HTML(string=html_content).write_pdf(pdf_file)
                    pdf_content = pdf_file.getvalue()
                    pdf_file.close()
                    
                    # Filename is already set above
                    return Response(
                        content=pdf_content,
                        media_type="application/pdf",
                        headers={
                            "Content-Disposition": f"attachment; filename={filename}"
                        }
                    )
                except ImportError:
                    # Final fallback: create a simple PDF using fpdf2 if available
                    try:
                        from fpdf import FPDF
                        
                        pdf = FPDF()
                        pdf.set_auto_page_break(auto=True, margin=15)
                        pdf.add_page()
                        pdf.set_font("Arial", "B", 16)
                        pdf.set_text_color(16, 185, 129)  # emerald-400 color
                        pdf.cell(0, 10, "MEDICAL RECORD SUMMARY", 0, 1, "C")
                        pdf.ln(5)
                        
                        pdf.set_font("Arial", "", 10)
                        pdf.set_text_color(0, 0, 0)
                        pdf.cell(0, 8, f"Record Type: {getattr(record, 'type', 'N/A')}", 0, 1)
                        pdf.cell(0, 8, f"Date: {getattr(record, 'date', 'N/A')}", 0, 1)
                        pdf.cell(0, 8, f"Title: {getattr(record, 'title', 'N/A')}", 0, 1)
                        pdf.cell(0, 8, f"Doctor: {getattr(record, 'doctor', 'N/A')}", 0, 1)
                        pdf.cell(0, 8, f"Hospital/Clinic: {getattr(record, 'hospital', 'N/A')}", 0, 1)
                        pdf.ln(5)
                        
                        # Vitals at the beginning
                        has_vitals = vitals and isinstance(vitals, dict) and any([
                            vitals.get('bp_right'), vitals.get('bp_left'), vitals.get('hr'),
                            vitals.get('temp'), vitals.get('spo2'), vitals.get('weight'),
                            vitals.get('height'), vitals.get('bmi'), vitals.get('respiratory_rate')
                        ])
                        if has_vitals:
                            pdf.set_font("Arial", "B", 12)
                            pdf.set_text_color(16, 185, 129)
                            pdf.cell(0, 8, "Vitals", 0, 1)
                            pdf.set_font("Arial", "", 10)
                            pdf.set_text_color(0, 0, 0)
                            vitals_lines = []
                            if vitals.get('bp_right'):
                                vitals_lines.append(f"BP Right: {vitals['bp_right']}")
                            if vitals.get('bp_left'):
                                vitals_lines.append(f"BP Left: {vitals['bp_left']}")
                            if vitals.get('hr'):
                                vitals_lines.append(f"Heart Rate: {vitals['hr']} bpm")
                            if vitals.get('temp'):
                                vitals_lines.append(f"Temperature: {vitals['temp']}°C")
                            if vitals.get('spo2'):
                                vitals_lines.append(f"SpO2: {vitals['spo2']}%")
                            if vitals.get('respiratory_rate'):
                                vitals_lines.append(f"Respiratory Rate: {vitals['respiratory_rate']} /min")
                            if vitals.get('weight'):
                                vitals_lines.append(f"Weight: {vitals['weight']} kg")
                            if vitals.get('height'):
                                vitals_lines.append(f"Height: {vitals['height']} cm")
                            if vitals.get('bmi'):
                                vitals_lines.append(f"BMI: {vitals['bmi']}")
                            pdf.multi_cell(0, 6, "\n".join(vitals_lines))
                            pdf.ln(3)
                        
                        if detailed_notes.get('chief_complaint'):
                            pdf.set_font("Arial", "B", 12)
                            pdf.set_text_color(16, 185, 129)
                            pdf.cell(0, 8, "Chief Complaint", 0, 1)
                            pdf.set_font("Arial", "", 10)
                            pdf.set_text_color(0, 0, 0)
                            pdf.multi_cell(0, 6, detailed_notes['chief_complaint'])
                            pdf.ln(3)
                        
                        if detailed_notes.get('hpi_free_text'):
                            pdf.set_font("Arial", "B", 12)
                            pdf.set_text_color(16, 185, 129)
                            pdf.cell(0, 8, "History of Present Illness", 0, 1)
                            pdf.set_font("Arial", "", 10)
                            pdf.set_text_color(0, 0, 0)
                            pdf.multi_cell(0, 6, detailed_notes['hpi_free_text'])
                            pdf.ln(3)
                        
                        if detailed_notes.get('subjective'):
                            pdf.set_font("Arial", "B", 12)
                            pdf.set_text_color(16, 185, 129)
                            pdf.cell(0, 8, "Subjective", 0, 1)
                            pdf.set_font("Arial", "", 10)
                            pdf.set_text_color(0, 0, 0)
                            pdf.multi_cell(0, 6, str(detailed_notes['subjective']))
                            pdf.ln(3)
                        
                        if detailed_notes.get('objective'):
                            pdf.set_font("Arial", "B", 12)
                            pdf.set_text_color(16, 185, 129)
                            pdf.cell(0, 8, "Objective", 0, 1)
                            pdf.set_font("Arial", "", 10)
                            pdf.set_text_color(0, 0, 0)
                            pdf.multi_cell(0, 6, str(detailed_notes['objective']))
                            pdf.ln(3)
                        
                        if detailed_notes.get('assessment'):
                            pdf.set_font("Arial", "B", 12)
                            pdf.set_text_color(16, 185, 129)
                            pdf.cell(0, 8, "Assessment", 0, 1)
                            pdf.set_font("Arial", "", 10)
                            pdf.set_text_color(0, 0, 0)
                            assessment_str = detailed_notes['assessment']
                            if isinstance(assessment_str, str) and not assessment_str.strip().startswith('{'):
                                pdf.multi_cell(0, 6, assessment_str)
                            else:
                                pdf.multi_cell(0, 6, str(assessment_str))
                            pdf.ln(3)
                        elif detailed_notes.get('diagnosis'):
                            pdf.set_font("Arial", "B", 12)
                            pdf.set_text_color(16, 185, 129)
                            pdf.cell(0, 8, "Diagnosis", 0, 1)
                            pdf.set_font("Arial", "", 10)
                            pdf.set_text_color(0, 0, 0)
                            pdf.multi_cell(0, 6, str(detailed_notes['diagnosis']))
                            pdf.ln(3)
                        
                        if detailed_notes.get('plan'):
                            pdf.set_font("Arial", "B", 12)
                            pdf.set_text_color(16, 185, 129)
                            pdf.cell(0, 8, "Treatment Plan", 0, 1)
                            pdf.set_font("Arial", "", 10)
                            pdf.set_text_color(0, 0, 0)
                            plan_str = detailed_notes['plan']
                            if isinstance(plan_str, str) and not plan_str.strip().startswith('{'):
                                pdf.multi_cell(0, 6, plan_str)
                            else:
                                pdf.multi_cell(0, 6, str(plan_str))
                            pdf.ln(3)
                        elif detailed_notes.get('treatment_plan'):
                            pdf.set_font("Arial", "B", 12)
                            pdf.set_text_color(16, 185, 129)
                            pdf.cell(0, 8, "Treatment Plan", 0, 1)
                            pdf.set_font("Arial", "", 10)
                            pdf.set_text_color(0, 0, 0)
                            pdf.multi_cell(0, 6, str(detailed_notes['treatment_plan']))
                            pdf.ln(3)
                        
                        if getattr(record, 'summary', ''):
                            pdf.set_font("Arial", "B", 12)
                            pdf.set_text_color(16, 185, 129)
                            pdf.cell(0, 8, "Summary", 0, 1)
                            pdf.set_font("Arial", "", 10)
                            pdf.set_text_color(0, 0, 0)
                            pdf.multi_cell(0, 6, str(record.summary))
                            pdf.ln(3)
                        
                        # Prescribed Medications at the end
                        if medications and len(medications) > 0:
                            pdf.set_font("Arial", "B", 12)
                            pdf.set_text_color(16, 185, 129)
                            pdf.cell(0, 8, "Prescribed Medications", 0, 1)
                            pdf.set_font("Arial", "", 10)
                            pdf.set_text_color(0, 0, 0)
                            for med in medications:
                                med_lines = []
                                if med.get('medicineName'):
                                    pdf.set_font("Arial", "B", 10)
                                    pdf.cell(0, 6, med['medicineName'], 0, 1)
                                    pdf.set_font("Arial", "", 10)
                                if med.get('knownAs') and med.get('knownAs') != med.get('medicineName'):
                                    pdf.cell(0, 6, f"({med['knownAs']})", 0, 1)
                                if med.get('purpose'):
                                    pdf.cell(0, 6, f"Purpose: {med['purpose']}", 0, 1)
                                if med.get('dosage'):
                                    pdf.cell(0, 6, f"Dosage: {med['dosage']}", 0, 1)
                                if med.get('frequency'):
                                    pdf.cell(0, 6, f"Frequency: {med['frequency']}", 0, 1)
                                if med.get('prescribedDate'):
                                    pdf.cell(0, 6, f"Prescribed: {med['prescribedDate']}", 0, 1)
                                if med.get('endDate'):
                                    pdf.cell(0, 6, f"End Date: {med['endDate']}", 0, 1)
                                if med.get('remainingRefills') and med.get('remainingRefills', 0) > 0:
                                    pdf.cell(0, 6, f"Remaining Refills: {med['remainingRefills']}", 0, 1)
                                pdf.ln(2)
                        
                        pdf_output = pdf.output(dest='S').encode('latin-1')
                        
                        return Response(
                            content=pdf_output,
                            media_type="application/pdf",
                            headers={
                                "Content-Disposition": f'attachment; filename="record-{record_id}.pdf"'
                            }
                        )
                    except ImportError:
                        # If no PDF library is available, return text file but with .pdf extension
                        # (browsers will handle it)
                        logger.warning("No PDF library available, returning text content as PDF")
                        # Filename is already set above
                        return Response(
                            content=content.encode('utf-8'),
                            media_type="application/pdf",
                            headers={
                                "Content-Disposition": f"attachment; filename={filename}"
                            }
                        )
        except Exception as pdf_error:
            logger.error(f"Error generating PDF: {pdf_error}", exc_info=True)
            # Fallback to text file - use PDF filename but with .txt extension
            txt_filename = filename.replace('.pdf', '.txt') if 'filename' in locals() else f"record-{record_id}.txt"
            return Response(
                content=content.encode('utf-8'),
                media_type="text/plain",
                headers={
                    "Content-Disposition": f"attachment; filename={txt_filename}"
                }
            )
        
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error downloading record: {e}", exc_info=True)
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Download Failed",
            status=500,
            detail=f"Failed to download record: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/vitals", response_model=SuccessResponse[List[VitalsTrend]])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "observation", "vitals_trends")
async def get_vitals_trends(
    request: Request,
    days: int = Query(90, ge=1, le=365, description="Number of days to look back"),
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get vital signs trends over time."""
    try:
        vitals_trends = await _get_vitals_trends(current_patient, fhir_client, days)
        
        return SuccessResponse(
            data=vitals_trends,
            message=f"Retrieved vitals trends for {days} days"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Vitals Trends Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve vitals trends: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ──────────────────────────────────────────────────────────────────────────────

def _get_db_medical_records(db: Session, current_patient: PatientUser, record_type: str) -> List[RecordItem]:
    """Get medical records from database (records written by doctors)."""
    # NOTE: medical_records table may not exist in the database
    # This function is currently disabled - uncomment if the table exists
    return []
    
    # try:
    #     # Query medical records for this patient
    #     # Convert patient_id to string for comparison (MedicalRecord uses String(36))
    #     patient_id_str = str(current_patient.patient_id)
    #     query = db.query(MedicalRecord).options(
    #         joinedload(MedicalRecord.doctor).joinedload(Doctor.user),
    #         joinedload(MedicalRecord.patient)
    #     ).filter(
    #         MedicalRecord.patient_id == patient_id_str
    #     )
    #     
    #     # Filter by record type if not "all"
    #     if record_type != "all":
    #         # Map filter types to RecordType enum values
    #         type_mapping = {
    #             "consultation": "consultation",
    #             "visit": "consultation",
    #             "document": "consultation",  # Documents can be consultations
    #             "report": "consultation"  # Reports can be consultations
    #         }
    #         if record_type in type_mapping:
    #             from app.common.models.medical import RecordType
    #             query = query.filter(MedicalRecord.record_type == RecordType.CONSULTATION)
    #     
    #     # Match nurse's approach: get all records without filtering by status
    #     # (Nurses don't filter by status, so patients should see all records too)
    #     
    #     # Order by date (newest first)
    #     records = query.order_by(MedicalRecord.record_date.desc()).limit(100).all()
    #     
    #     result = []
    #     for record in records:
    #         # Get doctor name
    #         doctor_name = ""
    #         if record.doctor and record.doctor.user:
    #             if record.doctor.user.first_name and record.doctor.user.last_name:
    #                 doctor_name = f"{record.doctor.user.first_name} {record.doctor.user.last_name}"
    #             elif record.doctor.user.full_name:
    #                 doctor_name = record.doctor.user.full_name
    #         
    #         # Get hospital name
    #         hospital_name = ""
    #         if record.hospital_id:
    #             hospital = db.query(Hospital).filter(Hospital.id == record.hospital_id).first()
    #             hospital_name = hospital.name if hospital else ""
    #         
    #         # Build description from record content
    #         description_parts = []
    #         if record.chief_complaint:
    #             description_parts.append(f"Chief complaint: {record.chief_complaint}")
    #         if record.clinical_impression:
    #             description_parts.append(f"Assessment: {record.clinical_impression}")
    #         if record.primary_diagnosis:
    #             description_parts.append(f"Diagnosis: {record.primary_diagnosis}")
    #         if record.treatment_plan:
    #             description_parts.append(f"Plan: {record.treatment_plan}")
    #         if record.summary:
    #             description_parts.append(record.summary)
    #         
    #         description = " | ".join(description_parts) if description_parts else "Medical record"
    #         
    #         # Map record type to display name
    #         record_type_display = record.record_type.value.replace("_", " ").title() if hasattr(record.record_type, 'value') else str(record.record_type)
    #         
    #         result.append(RecordItem(
    #             id=str(record.id),
    #             date=record.record_date.strftime("%d.%m.%Y") if record.record_date else "",
    #             record_type=record_type_display,
    #             title=f"{record_type_display} - {record.record_number}",
    #             description=description,
    #             doctor=doctor_name,
    #             hospital=hospital_name,
    #             status=record.status.value if hasattr(record.status, 'value') else str(record.status),
    #             fhir_resource_type="MedicalRecord",
    #             fhir_resource_id=str(record.id),
    #             attachments=[]
    #         ))
    #     
    #     return result
    #     
    # except Exception as e:
    #     import logging
    #     logging.warning(f"Error fetching database medical records: {e}")
    #     return []

def _get_db_clinical_notes(db: Session, current_patient: PatientUser) -> List[RecordItem]:
    """Get clinical notes from database (SOAP notes, consultation notes written by doctors)."""
    try:
        # Rollback any previous failed transaction
        db.rollback()
        
        # Query clinical notes for this patient
        # Convert patient_id to UUID for comparison (ClinicalNote uses UUIDColumn)
        # Match nurse's approach: get all notes without filtering by shared_with_patient or is_draft
        from uuid import UUID
        import logging
        logger = logging.getLogger(__name__)
        
        # Debug: log the patient_id we're using
        logger.info(f"[RECORDS] Getting clinical notes for patient_id: {current_patient.patient_id} (type: {type(current_patient.patient_id)})")
        
        patient_id_uuid = UUID(str(current_patient.patient_id)) if isinstance(current_patient.patient_id, str) else current_patient.patient_id
        logger.info(f"[RECORDS] Converted to UUID: {patient_id_uuid} (type: {type(patient_id_uuid)})")
        
        query = db.query(ClinicalNote).options(
            joinedload(ClinicalNote.doctor).joinedload(Doctor.user)
        ).filter(
            ClinicalNote.patient_id == patient_id_uuid
        )
        
        # Order by date (newest first)
        notes = query.order_by(ClinicalNote.note_date.desc()).limit(100).all()
        
        logger.info(f"[RECORDS] Found {len(notes)} clinical notes for patient {patient_id_uuid}")
        
        result = []
        for note in notes:
            # Get doctor name
            doctor_name = ""
            if note.doctor and note.doctor.user:
                if note.doctor.user.first_name and note.doctor.user.last_name:
                    doctor_name = f"{note.doctor.user.first_name} {note.doctor.user.last_name}"
                elif note.doctor.user.full_name:
                    doctor_name = note.doctor.user.full_name
            
            # Build description from note content - match nurse's simpler approach
            description = ""
            if hasattr(note, 'subjective') and note.subjective:
                description = note.subjective[:200]  # Limit length
            elif hasattr(note, 'content') and note.content:
                description = note.content[:200]
            
            if not description:
                description = f"{note.note_type.replace('_', ' ').title()} Note"
            
            # Map note_type to RecordTypeEnum
            from app.portals.patient.schemas.records_enhanced import RecordTypeEnum, RecordStatusEnum, PriorityEnum
            record_type_enum = RecordTypeEnum.CONSULTATION  # Default to consultation
            if "consultation" in note.note_type.lower():
                record_type_enum = RecordTypeEnum.CONSULTATION
            elif "soap" in note.note_type.lower():
                record_type_enum = RecordTypeEnum.CONSULTATION
            
            # Get clinic/hospital info if available
            clinic_name = "General Clinic"  # Default value since it's required
            clinic_id = "00000000-0000-0000-0000-000000000000"  # Default UUID since it's required
            if hasattr(note, 'encounter_id') and note.encounter_id:
                # Try to get hospital from encounter if available
                pass  # Can't easily get hospital from clinical note
            
            # Format dates
            note_date_str = note.note_date.strftime("%Y-%m-%d") if note.note_date else datetime.now(timezone.utc).strftime("%Y-%m-%d")
            created_at_str = note.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if hasattr(note, 'created_at') and note.created_at else datetime.now(timezone.utc).isoformat()
            updated_at_str = note.updated_at.strftime("%Y-%m-%dT%H:%M:%SZ") if hasattr(note, 'updated_at') and note.updated_at else datetime.now(timezone.utc).isoformat()
            
            result.append(RecordItem(
                id=str(note.id),
                type=record_type_enum,
                date=note_date_str,
                doctor=doctor_name,
                clinic=clinic_name,
                title=f"{note.note_type.replace('_', ' ').title()} Note",
                summary=description,
                status=RecordStatusEnum.FINAL if not note.is_draft else RecordStatusEnum.DRAFT,
                priority=PriorityEnum.NORMAL,
                notes=None,
                attachments=[],
                fhir_resource_ids=[str(note.fhir_document_reference_id)] if hasattr(note, 'fhir_document_reference_id') and note.fhir_document_reference_id else [],
                clinic_id=clinic_id,
                patient_id=str(current_patient.patient_id),
                created_at=created_at_str,
                updated_at=updated_at_str
            ))
        
        return result
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Error fetching database clinical notes: {e}")
        db.rollback()  # Rollback on error to allow subsequent queries
        return []

def _get_db_general_reports(db: Session, current_patient: PatientUser) -> List[RecordItem]:
    """Get general reports from database (reports written by doctors)."""
    try:
        # Rollback any previous failed transaction
        db.rollback()
        
        # Query general reports for this patient
        # Convert patient_id to UUID for comparison (GeneralReport uses UUIDColumn)
        # Match nurse's approach: get all reports without filtering by status
        from uuid import UUID
        import logging
        logger = logging.getLogger(__name__)
        
        # Debug: log the patient_id we're using
        logger.info(f"[RECORDS] Getting general reports for patient_id: {current_patient.patient_id} (type: {type(current_patient.patient_id)})")
        
        patient_id_uuid = UUID(str(current_patient.patient_id)) if isinstance(current_patient.patient_id, str) else current_patient.patient_id
        logger.info(f"[RECORDS] Converted to UUID: {patient_id_uuid} (type: {type(patient_id_uuid)})")
        
        query = db.query(GeneralReport).options(
            joinedload(GeneralReport.doctor).joinedload(Doctor.user),
            joinedload(GeneralReport.clinic)
        ).filter(
            GeneralReport.patient_id == patient_id_uuid
        )
        
        # Order by date (newest first)
        reports = query.order_by(GeneralReport.created_at.desc()).limit(100).all()
        
        logger.info(f"[RECORDS] Found {len(reports)} general reports for patient {patient_id_uuid}")
        
        result = []
        for report in reports:
            # Get doctor name
            doctor_name = ""
            if report.doctor and report.doctor.user:
                if report.doctor.user.first_name and report.doctor.user.last_name:
                    doctor_name = f"{report.doctor.user.first_name} {report.doctor.user.last_name}"
                elif report.doctor.user.full_name:
                    doctor_name = report.doctor.user.full_name
            
            # Get hospital/clinic name
            hospital_name = ""
            if report.clinic:
                hospital_name = report.clinic.name
            
            # Build description from report content
            description_parts = []
            if report.chief_complaint:
                description_parts.append(f"Chief complaint: {report.chief_complaint}")
            if report.working_diagnoses:
                try:
                    import json
                    diagnoses = json.loads(report.working_diagnoses) if isinstance(report.working_diagnoses, str) else report.working_diagnoses
                    if isinstance(diagnoses, list) and len(diagnoses) > 0:
                        diag_text = diagnoses[0].get('term', '') if isinstance(diagnoses[0], dict) else str(diagnoses[0])
                        if diag_text:
                            description_parts.append(f"Diagnosis: {diag_text}")
                except:
                    pass
            if report.visit_summary:
                description_parts.append(report.visit_summary[:200] + "..." if len(report.visit_summary) > 200 else report.visit_summary)
            
            description = " | ".join(description_parts) if description_parts else f"{report.report_type.replace('_', ' ').title()} Report"
            
            # Map report_type to RecordTypeEnum
            from app.portals.patient.schemas.records_enhanced import RecordTypeEnum, RecordStatusEnum, PriorityEnum
            record_type_enum = RecordTypeEnum.CONSULTATION  # Default to consultation
            if "consultation" in report.report_type.lower():
                record_type_enum = RecordTypeEnum.CONSULTATION
            elif "lab" in report.report_type.lower():
                record_type_enum = RecordTypeEnum.LAB_RESULT
            elif "imaging" in report.report_type.lower():
                record_type_enum = RecordTypeEnum.IMAGING
            
            # Get clinic_id
            clinic_id = str(report.clinic_id) if report.clinic_id else "00000000-0000-0000-0000-000000000000"
            if not hospital_name:
                hospital_name = "General Clinic"  # Default value since it's required
            
            # Format dates
            report_date_str = report.created_at.strftime("%Y-%m-%d") if report.created_at else datetime.now(timezone.utc).strftime("%Y-%m-%d")
            created_at_str = report.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if report.created_at else datetime.now(timezone.utc).isoformat()
            updated_at_str = report.updated_at.strftime("%Y-%m-%dT%H:%M:%SZ") if report.updated_at else datetime.now(timezone.utc).isoformat()
            
            # Map status to RecordStatusEnum
            status_enum = RecordStatusEnum.FINAL
            if report.status:
                status_lower = report.status.lower()
                if "draft" in status_lower:
                    status_enum = RecordStatusEnum.DRAFT
                elif "final" in status_lower or "signed" in status_lower:
                    status_enum = RecordStatusEnum.FINAL
                elif "amended" in status_lower:
                    status_enum = RecordStatusEnum.AMENDED
                elif "cancelled" in status_lower:
                    status_enum = RecordStatusEnum.CANCELLED
            
            result.append(RecordItem(
                id=str(report.id),
                type=record_type_enum,
                date=report_date_str,
                doctor=doctor_name,
                clinic=hospital_name,
                title=f"{report.report_code} - {report.report_type.replace('_', ' ').title()}" if report.report_code else f"{report.report_type.replace('_', ' ').title()} Report",
                summary=description,
                status=status_enum,
                priority=PriorityEnum.NORMAL,
                notes=None,
                attachments=[],
                fhir_resource_ids=[str(report.fhir_document_reference_id)] if hasattr(report, 'fhir_document_reference_id') and report.fhir_document_reference_id else [],
                clinic_id=clinic_id,
                patient_id=str(current_patient.patient_id),
                created_at=created_at_str,
                updated_at=updated_at_str
            ))
        
        return result
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Error fetching database general reports: {e}")
        db.rollback()  # Rollback on error to allow subsequent queries
        return []

async def _get_encounters(current_patient: PatientUser, fhir_client: FHIRClient) -> List[RecordItem]:
    """Get patient encounters with ownership validation."""
    try:
        result = await fhir_client._make_request("GET", "Encounter", params={
            "patient": f"Patient/{current_patient.fhir_patient_id}",
            "_sort": "-date",
            "_count": 100
        })
        
        encounters = []
        for entry in result.get("entry", []):
            encounter = entry["resource"]
            
            # Validate ownership
            if not validate_patient_ownership(encounter.get("subject", {}).get("reference", "").replace("Patient/", ""), current_patient):
                continue
            
            # Extract doctor name
            doctor_name = None
            if encounter.get("participant"):
                for participant in encounter["participant"]:
                    if participant.get("type", [{}])[0].get("coding", [{}])[0].get("code") == "PPRF":
                        doctor_name = participant.get("individual", {}).get("display")
                        break
            
            # Extract hospital name
            hospital_name = encounter.get("serviceProvider", {}).get("display")
            
            from app.portals.patient.schemas.records_enhanced import RecordTypeEnum, RecordStatusEnum, PriorityEnum
            encounters.append(RecordItem(
                id=encounter["id"],
                type=RecordTypeEnum.CONSULTATION,
                date=datetime.fromisoformat(encounter["period"]["start"].replace("Z", "+00:00")).strftime("%Y-%m-%d"),
                doctor=doctor_name or "",
                clinic=hospital_name or "General Clinic",
                title=encounter.get("type", [{}])[0].get("text", "Consultation"),
                summary=encounter.get("reasonCode", [{}])[0].get("text", "Visit"),
                status=RecordStatusEnum.FINAL,
                priority=PriorityEnum.NORMAL,
                notes=None,
                attachments=[],
                fhir_resource_ids=[encounter["id"]],
                clinic_id="00000000-0000-0000-0000-000000000000",
                patient_id=str(current_patient.patient_id),
                created_at=datetime.fromisoformat(encounter["period"]["start"].replace("Z", "+00:00")).isoformat(),
                updated_at=datetime.fromisoformat(encounter.get("period", {}).get("end", encounter["period"]["start"]).replace("Z", "+00:00")).isoformat()
            ))
        
        return encounters
        
    except Exception:
        return []

async def _get_observations(current_patient: PatientUser, fhir_client: FHIRClient) -> List[RecordItem]:
    """Get patient observations with ownership validation."""
    try:
        result = await fhir_client._make_request("GET", "Observation", params={
            "subject": f"Patient/{current_patient.fhir_patient_id}",
            "_sort": "-date",
            "_count": 100
        })
        
        observations = []
        for entry in result.get("entry", []):
            observation = entry["resource"]
            
            # Validate ownership
            if not validate_patient_ownership(observation.get("subject", {}).get("reference", "").replace("Patient/", ""), current_patient):
                continue
            
            # Determine record type based on category
            record_type = "Observation"
            if observation.get("category"):
                category_code = observation["category"][0].get("coding", [{}])[0].get("code", "")
                if category_code == "laboratory":
                    record_type = "Lab Result"
                elif category_code == "vital-signs":
                    record_type = "Vitals"
                elif category_code == "imaging":
                    record_type = "Imaging"
            
            # Extract value
            value_text = "—"
            if "valueQuantity" in observation:
                quantity = observation["valueQuantity"]
                value_text = f"{quantity.get('value', '')} {quantity.get('unit', '')}"
            elif "valueString" in observation:
                value_text = observation["valueString"]
            elif "valueCodeableConcept" in observation:
                value_text = observation["valueCodeableConcept"].get("text", "")
            
            from app.portals.patient.schemas.records_enhanced import RecordTypeEnum, RecordStatusEnum, PriorityEnum
            # Map record_type string to RecordTypeEnum
            type_enum = RecordTypeEnum.LAB_RESULT if record_type == "Lab Result" else RecordTypeEnum.VITAL_SIGNS if record_type == "Vitals" else RecordTypeEnum.IMAGING if record_type == "Imaging" else RecordTypeEnum.CONSULTATION
            
            observations.append(RecordItem(
                id=observation["id"],
                type=type_enum,
                date=datetime.fromisoformat(observation.get("effectiveDateTime", "").replace("Z", "+00:00")).strftime("%Y-%m-%d"),
                doctor=observation.get("performer", [{}])[0].get("display") or "",
                clinic="General Clinic",
                title=observation.get("code", {}).get("text", "Observation"),
                summary=f"{observation.get('code', {}).get('text', 'Observation')}: {value_text}",
                status=RecordStatusEnum.FINAL,
                priority=PriorityEnum.NORMAL,
                notes=None,
                attachments=[],
                fhir_resource_ids=[observation["id"]],
                clinic_id="00000000-0000-0000-0000-000000000000",
                patient_id=str(current_patient.patient_id),
                created_at=observation.get("effectiveDateTime", datetime.now(timezone.utc).isoformat()).replace("Z", "+00:00"),
                updated_at=observation.get("effectiveDateTime", datetime.now(timezone.utc).isoformat()).replace("Z", "+00:00")
            ))
        
        return observations
        
    except Exception:
        return []

async def _get_diagnostic_reports(current_patient: PatientUser, fhir_client: FHIRClient) -> List[RecordItem]:
    """Get patient diagnostic reports with ownership validation."""
    try:
        result = await fhir_client._make_request("GET", "DiagnosticReport", params={
            "subject": f"Patient/{current_patient.fhir_patient_id}",
            "_sort": "-date",
            "_count": 100
        })
        
        reports = []
        for entry in result.get("entry", []):
            report = entry["resource"]
            
            # Validate ownership
            if not validate_patient_ownership(report.get("subject", {}).get("reference", "").replace("Patient/", ""), current_patient):
                continue
            
            from app.portals.patient.schemas.records_enhanced import RecordTypeEnum, RecordStatusEnum, PriorityEnum
            reports.append(RecordItem(
                id=report["id"],
                type=RecordTypeEnum.LAB_RESULT,
                date=datetime.fromisoformat(report.get("effectiveDateTime", "").replace("Z", "+00:00")).strftime("%Y-%m-%d"),
                doctor=report.get("performer", [{}])[0].get("display") or "",
                clinic=report.get("performer", [{}])[0].get("display") or "General Clinic",
                title=report.get("code", {}).get("text", "Diagnostic Report"),
                summary=report.get("conclusion", report.get("code", {}).get("text", "Diagnostic Report")),
                status=RecordStatusEnum.FINAL,
                priority=PriorityEnum.NORMAL,
                notes=None,
                attachments=[],
                fhir_resource_ids=[report["id"]],
                clinic_id="00000000-0000-0000-0000-000000000000",
                patient_id=str(current_patient.patient_id),
                created_at=report.get("effectiveDateTime", datetime.now(timezone.utc).isoformat()).replace("Z", "+00:00"),
                updated_at=report.get("effectiveDateTime", datetime.now(timezone.utc).isoformat()).replace("Z", "+00:00")
            ))
        
        return reports
        
    except Exception:
        return []

def _get_db_lab_results(db: Session, current_patient: PatientUser) -> List[RecordItem]:
    """Get lab results from database (LabResult table)."""
    try:
        from app.portals.patient.schemas.records_enhanced import RecordTypeEnum, RecordStatusEnum, PriorityEnum
        from uuid import UUID
        
        # Convert patient_id to string for comparison (LabResult uses String(36))
        patient_id_str = str(current_patient.patient_id)
        
        # Query lab results for this patient
        # LabResult.patient_id is String(36), so we can compare directly
        # Ensure patient_id is a string
        if not isinstance(patient_id_str, str):
            patient_id_str = str(patient_id_str)
        
        lab_results = db.query(LabResultModel).filter(
            LabResultModel.patient_id == patient_id_str
        ).order_by(LabResultModel.created_at.desc()).limit(200).all()
        
        result = []
        for lab_result in lab_results:
            # Build description from test result
            description_parts = []
            description_parts.append(f"{lab_result.test_name}")
            if lab_result.result_value:
                value_str = f"{lab_result.result_value}"
                if lab_result.result_unit:
                    value_str += f" {lab_result.result_unit}"
                description_parts.append(f"Result: {value_str}")
            if lab_result.reference_range:
                description_parts.append(f"Range: {lab_result.reference_range}")
            if lab_result.interpretation:
                description_parts.append(f"Interpretation: {lab_result.interpretation}")
            
            description = " | ".join(description_parts)
            
            # Get clinic_id (default if not available)
            clinic_id = "00000000-0000-0000-0000-000000000000"
            
            # Format dates
            result_date = lab_result.test_date or lab_result.created_at or datetime.now(timezone.utc)
            if isinstance(result_date, datetime):
                result_date_str = result_date.strftime("%Y-%m-%d")
                created_at_str = result_date.isoformat()
            else:
                result_date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                created_at_str = datetime.now(timezone.utc).isoformat()
            
            updated_at = lab_result.updated_at or lab_result.created_at or datetime.now(timezone.utc)
            updated_at_str = updated_at.isoformat() if isinstance(updated_at, datetime) else datetime.now(timezone.utc).isoformat()
            
            # Map status
            status_enum = RecordStatusEnum.FINAL
            if lab_result.status:
                status_lower = str(lab_result.status).lower()
                if "draft" in status_lower or "preliminary" in status_lower:
                    status_enum = RecordStatusEnum.DRAFT
                elif "final" in status_lower:
                    status_enum = RecordStatusEnum.FINAL
                elif "amended" in status_lower or "corrected" in status_lower:
                    status_enum = RecordStatusEnum.AMENDED
                elif "cancelled" in status_lower:
                    status_enum = RecordStatusEnum.CANCELLED
            
            # Get performing lab name or default
            clinic_name = lab_result.performing_lab_name or "Laboratory"
            
            # Include attachments data (contains fullTestData for structured tests)
            attachments_list = []
            if lab_result.attachments:
                # Convert attachments JSON to list format for RecordItem
                # Store the full attachments data so patients can see complete test details
                if isinstance(lab_result.attachments, dict):
                    attachments_list.append({
                        "type": "lab_test_data",
                        "data": lab_result.attachments,
                        "testType": lab_result.attachments.get("testType", "unknown"),
                        "fullTestData": lab_result.attachments.get("fullTestData", lab_result.attachments)
                    })
                elif isinstance(lab_result.attachments, list):
                    attachments_list = lab_result.attachments
            
            result.append(RecordItem(
                id=str(lab_result.id),
                type=RecordTypeEnum.LAB_RESULT,
                date=result_date_str,
                doctor=lab_result.performed_by or lab_result.resulted_by or "",
                clinic=clinic_name,
                title=lab_result.test_name,
                summary=description,
                status=status_enum,
                priority=PriorityEnum.URGENT if lab_result.is_critical else PriorityEnum.NORMAL,
                notes=lab_result.comments,
                attachments=attachments_list,
                fhir_resource_ids=[str(lab_result.fhir_observation_id)] if lab_result.fhir_observation_id else [],
                clinic_id=clinic_id,
                patient_id=patient_id_str,
                created_at=created_at_str,
                updated_at=updated_at_str
            ))
        
        return result
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Error fetching database lab results: {e}")
        db.rollback()
        return []


def _get_db_radiology_studies(db: Session, current_patient: PatientUser) -> List[RecordItem]:
    """Get radiology studies from database (RadiologyStudy table)."""
    try:
        from app.portals.patient.schemas.records_enhanced import RecordTypeEnum, RecordStatusEnum, PriorityEnum
        from app.common.models.radiology import RadiologyStudy
        from uuid import UUID
        
        # Convert patient_id to UUID for comparison
        patient_uuid = UUID(str(current_patient.patient_id))
        
        # Query radiology studies for this patient
        radiology_studies = db.query(RadiologyStudy).filter(
            RadiologyStudy.patient_id == patient_uuid
        ).order_by(RadiologyStudy.scheduled_date.desc(), RadiologyStudy.study_date.desc()).limit(200).all()
        
        result = []
        for study in radiology_studies:
            # Build description from study details
            description_parts = []
            if study.study_description:
                description_parts.append(study.study_description)
            if study.modality:
                description_parts.append(f"Modality: {study.modality}")
            if study.body_part:
                description_parts.append(f"Body Part: {study.body_part}")
            if study.indication:
                description_parts.append(f"Indication: {study.indication}")
            
            description = " | ".join(description_parts) if description_parts else "Radiology Study"
            
            # Get clinic_id (default if not available)
            clinic_id = "00000000-0000-0000-0000-000000000000"
            
            # Format dates
            study_date = study.study_date or study.scheduled_date or study.order_date or datetime.now(timezone.utc)
            if isinstance(study_date, datetime):
                study_date_str = study_date.strftime("%Y-%m-%d")
                created_at_str = study_date.isoformat()
            elif hasattr(study_date, 'date'):
                study_date_str = study_date.strftime("%Y-%m-%d")
                created_at_str = datetime.combine(study_date, datetime.min.time()).isoformat()
            else:
                study_date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                created_at_str = datetime.now(timezone.utc).isoformat()
            
            uploaded_at = study.uploaded_at or datetime.now(timezone.utc)
            updated_at_str = uploaded_at.isoformat() if isinstance(uploaded_at, datetime) else datetime.now(timezone.utc).isoformat()
            
            # Map status
            status_enum = RecordStatusEnum.FINAL
            if study.status:
                status_lower = str(study.status).lower()
                if "scheduled" in status_lower or "pending" in status_lower:
                    status_enum = RecordStatusEnum.DRAFT
                elif "completed" in status_lower or "final" in status_lower:
                    status_enum = RecordStatusEnum.FINAL
                elif "cancelled" in status_lower:
                    status_enum = RecordStatusEnum.CANCELLED
            
            # Map priority
            priority_enum = PriorityEnum.NORMAL
            if study.priority:
                priority_lower = str(study.priority).lower()
                if "stat" in priority_lower or "urgent" in priority_lower:
                    priority_enum = PriorityEnum.URGENT
                elif "routine" in priority_lower:
                    priority_enum = PriorityEnum.NORMAL
            
            # Get clinic/doctor info
            clinic_name = study.location or "Radiology Department"
            doctor_name = study.ordering_physician or ""
            
            # Build title
            title = study.study_description or f"{study.modality or 'Radiology'} Study"
            if study.body_part:
                title += f" - {study.body_part}"
            
            # Include study metadata in attachments
            attachments_list = []
            if study.study_instance_uid or study.orthanc_study_id:
                attachments_list.append({
                    "type": "radiology_study",
                    "studyInstanceUID": study.study_instance_uid,
                    "orthancStudyId": study.orthanc_study_id,
                    "modality": study.modality,
                    "bodyPart": study.body_part,
                    "accessionNumber": study.accession_number
                })
            
            result.append(RecordItem(
                id=str(study.id),
                type=RecordTypeEnum.IMAGING,
                date=study_date_str,
                doctor=doctor_name,
                clinic=clinic_name,
                title=title,
                summary=description,
                status=status_enum,
                priority=priority_enum,
                notes=study.notes,
                attachments=attachments_list,
                fhir_resource_ids=[],
                clinic_id=clinic_id,
                patient_id=str(current_patient.patient_id),
                created_at=created_at_str,
                updated_at=updated_at_str
            ))
        
        return result
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Error fetching database radiology studies: {e}")
        db.rollback()
        return []


async def _get_document_references(current_patient: PatientUser, fhir_client: FHIRClient) -> List[RecordItem]:
    """Get patient document references with ownership validation."""
    try:
        result = await fhir_client._make_request("GET", "DocumentReference", params={
            "subject": f"Patient/{current_patient.fhir_patient_id}",
            "_sort": "-date",
            "_count": 100
        })
        
        documents = []
        for entry in result.get("entry", []):
            doc_ref = entry["resource"]
            
            # Validate ownership
            if not validate_patient_ownership(doc_ref.get("subject", {}).get("reference", "").replace("Patient/", ""), current_patient):
                continue
            
            # Extract attachments
            attachments = []
            if doc_ref.get("content"):
                for content in doc_ref["content"]:
                    attachment = content.get("attachment", {})
                    attachments.append({
                        "title": attachment.get("title", "Document"),
                        "url": attachment.get("url", ""),
                        "content_type": attachment.get("contentType", "")
                    })
            
            from app.portals.patient.schemas.records_enhanced import RecordTypeEnum, RecordStatusEnum, PriorityEnum
            documents.append(RecordItem(
                id=doc_ref["id"],
                type=RecordTypeEnum.CONSULTATION,
                date=datetime.fromisoformat(doc_ref.get("date", "").replace("Z", "+00:00")).strftime("%Y-%m-%d"),
                doctor=doc_ref.get("author", [{}])[0].get("display") or "",
                clinic="General Clinic",
                title=doc_ref.get("type", {}).get("text", "Document"),
                summary=doc_ref.get("description", doc_ref.get("type", {}).get("text", "Document")),
                status=RecordStatusEnum.FINAL,
                priority=PriorityEnum.NORMAL,
                notes=None,
                attachments=attachments,
                fhir_resource_ids=[doc_ref["id"]],
                clinic_id="00000000-0000-0000-0000-000000000000",
                patient_id=str(current_patient.patient_id),
                created_at=doc_ref.get("date", datetime.now(timezone.utc).isoformat()).replace("Z", "+00:00"),
                updated_at=doc_ref.get("date", datetime.now(timezone.utc).isoformat()).replace("Z", "+00:00")
            ))
        
        return documents
        
    except Exception:
        return []

async def _get_vitals_trends(current_patient: PatientUser, fhir_client: FHIRClient, days: int = 90) -> List[VitalsTrend]:
    """Get vital signs trends over specified days."""
    try:
        # Get vital signs observations
        result = await fhir_client._make_request("GET", "Observation", params={
            "subject": f"Patient/{current_patient.fhir_patient_id}",
            "category": "vital-signs",
            "_sort": "-date",
            "_count": 200
        })
        
        # Group by vital sign code
        vitals_by_code = {}
        
        for entry in result.get("entry", []):
            observation = entry["resource"]
            
            # Validate ownership
            if not validate_patient_ownership(observation.get("subject", {}).get("reference", "").replace("Patient/", ""), current_patient):
                continue
            
            code_obj = observation.get("code", {})
            code = code_obj.get("coding", [{}])[0].get("code", "")
            name = code_obj.get("text", "")
            
            if not code:
                continue
            
            if code not in vitals_by_code:
                vitals_by_code[code] = {
                    "name": name,
                    "unit": "",
                    "values": []
                }
            
            # Extract value
            value = None
            unit = ""
            if "valueQuantity" in observation:
                quantity = observation["valueQuantity"]
                value = quantity.get("value")
                unit = quantity.get("unit", "")
                vitals_by_code[code]["unit"] = unit
            
            if value is not None:
                vitals_by_code[code]["values"].append({
                    "date": observation.get("effectiveDateTime", ""),
                    "value": value,
                    "unit": unit
                })
        
        # Convert to VitalsTrend objects
        vitals_trends = []
        for code, data in vitals_by_code.items():
            values = sorted(data["values"], key=lambda x: x["date"], reverse=True)
            
            latest_value = None
            latest_date = None
            if values:
                latest_value = f"{values[0]['value']} {values[0]['unit']}"
                latest_date = values[0]["date"]
            
            vitals_trends.append(VitalsTrend(
                code=code,
                name=data["name"],
                unit=data["unit"],
                values=values,
                latest_value=latest_value,
                latest_date=latest_date
            ))
        
        return vitals_trends
        
    except Exception:
        return []

async def _get_upcoming_appointments(current_patient: PatientUser, fhir_client: FHIRClient) -> List[Dict[str, Any]]:
    """Get upcoming appointments."""
    try:
        result = await fhir_client._make_request("GET", "Appointment", params={
            "patient": f"Patient/{current_patient.fhir_patient_id}",
            "status": "confirmed",
            "_sort": "date",
            "_count": 10
        })
        
        appointments = []
        for entry in result.get("entry", []):
            appointment = entry["resource"]
            
            # Validate ownership
            if not validate_patient_ownership(appointment.get("participant", [{}])[0].get("actor", {}).get("reference", "").replace("Patient/", ""), current_patient):
                continue
            
            appointments.append({
                "id": appointment["id"],
                "date": appointment.get("start", ""),
                "description": appointment.get("description", "Appointment"),
                "status": appointment["status"]
            })
        
        return appointments
        
    except Exception:
        return []
