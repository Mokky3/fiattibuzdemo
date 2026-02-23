"""Doctor portal – enhanced medical reports router
Implements surgical edits: FHIR DocumentReference/Binary, RBAC, clinic validation, standardized responses
"""
from datetime import datetime, timezone, date
from typing import List, Dict, Any, Optional
from uuid import uuid4
import base64
import json
import tempfile
import os
import logging

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, Path, Body, Query, status, Request, UploadFile, File, Form
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .auth import get_current_doctor, DoctorUser
from app.db.session import get_db
from app.services.fhir_client import FHIRClient
from app.services.fhir_repository import fhir_repo
from app.services.messaging_service import MessagingService
from app.services.rbac_service import RBACService
from app.services.fhir_processor import fhir_processor
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access, require_clinic_scope
from app.common.utils.tracing import get_trace_id

router = APIRouter(prefix="/reports", tags=["Doctor · Reports"])

# Additional router for medical-reports endpoint (used by frontend)
medical_reports_router = APIRouter(prefix="/medical-reports", tags=["Medical Reports"])

# ──────────────────────────────────────────────────────────────────────────────
# Schema Imports (override inline models with shared portal schemas)
# ──────────────────────────────────────────────────────────────────────────────
from app.portals.doctor.schemas.reports_enhanced import (
    CreateReportRequest as DR_CreateReportRequest,
    ReportSummary as DR_ReportSummary,
    VitalsData as DR_VitalsData,
    CreateVitalsRequest as DR_CreateVitalsRequest,
)

class CreateReportRequest(BaseModel):
    patient_id: str = Field(..., description="Patient ID")
    specialty: str = Field(..., description="Medical specialty")
    code: str = Field(..., description="Report code e.g. '#025'")
    data: Dict[str, Any] = Field(..., description="Report form data")
    clinic_id: str = Field(..., description="Clinic ID for scoping")

class ReportSummary(BaseModel):
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
    clinic_id: str = Field(..., description="Clinic ID")
    doctor_id: str = Field(..., description="Doctor ID")
    fhir_document_reference_id: Optional[str] = Field(None, description="FHIR DocumentReference ID")
    fhir_binary_id: Optional[str] = Field(None, description="FHIR Binary ID for PDF")
    fhir_diagnostic_report_id: Optional[str] = Field(None, description="FHIR DiagnosticReport ID if lab/imaging")
    doc_type: Optional[str] = Field(None, description="Document type (e.g., oph.initial, neu.initial)")

class VitalsData(BaseModel):
    blood_pressure: Optional[str] = Field(None, description="Blood pressure e.g. '120/80'")
    temperature: Optional[str] = Field(None, description="Temperature e.g. '36.6°C'")
    heart_rate: Optional[str] = Field(None, description="Heart rate e.g. '72 bpm'")
    respiratory_rate: Optional[str] = Field(None, description="Respiratory rate e.g. '16/min'")
    oxygen_saturation: Optional[str] = Field(None, description="O2 saturation e.g. '98%'")
    weight: Optional[str] = Field(None, description="Weight e.g. '75 kg'")
    height: Optional[str] = Field(None, description="Height e.g. '175 cm'")
    bmi: Optional[str] = Field(None, description="BMI e.g. '24.5'")

class CreateVitalsRequest(BaseModel):
    patient_id: str = Field(..., description="Patient ID")
    vitals: VitalsData = Field(..., description="Vital signs data")
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    encounter_id: Optional[str] = Field(None, description="Associated encounter ID")

# Use portal schema classes to standardize types
CreateReportRequest = DR_CreateReportRequest
# Use imported ReportSummary from schemas (has all required fields)
ReportSummary = DR_ReportSummary
VitalsData = DR_VitalsData
CreateVitalsRequest = DR_CreateVitalsRequest

# ──────────────────────────────────────────────────────────────────────────────
# Service Dependencies
# ──────────────────────────────────────────────────────────────────────────────

def get_fhir_client(db: Session = Depends(get_db)) -> FHIRClient:
    """Get FHIR client with database session."""
    return FHIRClient(db_session=db)

def get_messaging_service(db: Session = Depends(get_db)) -> MessagingService:
    """Get messaging service."""
    return MessagingService(db)

def get_rbac_service() -> RBACService:
    """Get RBAC service."""
    return RBACService()

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Endpoints with Surgical Edits
# ──────────────────────────────────────────────────────────────────────────────

@router.post("", response_model=SuccessResponse[ReportSummary], status_code=status.HTTP_201_CREATED)
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("write", "document_reference", "report")
async def create_report(
    request: Request,
    payload: CreateReportRequest = Body(...),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Create medical report with FHIR DocumentReference, Binary (PDF), and optional DiagnosticReport."""
    try:
        # Get AuthenticatedUser object for RBAC (RBAC methods expect AuthenticatedUser, not just ID)
        from app.common.models.user import User
        from app.common.auth.auth_service import AuthenticatedUser, AuthService
        from app.common.models.user import UserRole
        
        user_obj = db.query(User).filter(User.id == current_doctor.id).first()
        if not user_obj:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Create AuthenticatedUser object with required attributes
        # Get user permissions based on role
        user_permissions = AuthService.get_user_permissions(user_obj.role) if user_obj.role else []
        authenticated_user = AuthenticatedUser(
            user=user_obj,
            permissions=user_permissions,
            clinic_id=getattr(user_obj, 'clinic_id', None)
        )
        
        # Get doctor's full name for PDF generation
        doctor_full_name = f"{user_obj.first_name} {user_obj.last_name}".strip() if user_obj else current_doctor.email
        
        # Validate clinic access
        if not rbac_service.can_access_clinic(authenticated_user, payload.clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Validate patient access
        if not rbac_service.can_access_patient(authenticated_user, payload.patient_id, payload.clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Patient Access Denied",
                status=403,
                detail="Doctor does not have access to this patient",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Check if this is an update (existing report_id in payload.data)
        existing_report_id = None
        if isinstance(payload.data, dict):
            # Check for existing report ID in various possible locations
            existing_report_id = (
                payload.data.get("fhir_document_reference_id") or
                payload.data.get("report_id") or
                payload.data.get("id") or
                payload.data.get("meta", {}).get("report_id") or
                payload.data.get("meta", {}).get("fhir_document_reference_id")
            )
        
        print(f"DEBUG: Checking for existing report - existing_report_id: {existing_report_id}")
        
        # 1. Create or Update FHIR DocumentReference
        document_reference = None
        document_reference_id = None
        is_update = False
        
        if existing_report_id:
            # Try to get existing DocumentReference
            try:
                existing_doc_ref = await fhir_client._make_request("GET", f"DocumentReference/{existing_report_id}")
                if existing_doc_ref and existing_doc_ref.get("id"):
                    print(f"DEBUG: Found existing DocumentReference: {existing_report_id}, will update")
                    document_reference_id = existing_report_id
                    is_update = True
                    # Update existing DocumentReference
                    document_reference = existing_doc_ref
                    document_reference["status"] = "current"
                    if "type" in document_reference and "coding" in document_reference["type"] and len(document_reference["type"]["coding"]) > 0:
                        document_reference["type"]["coding"][0]["code"] = payload.code
                        document_reference["type"]["coding"][0]["display"] = f"{payload.specialty} Report"
                    else:
                        document_reference["type"] = {
                            "coding": [{
                                "system": "http://loinc.org",
                                "code": payload.code,
                                "display": f"{payload.specialty} Report"
                            }]
                        }
                    document_reference["subject"]["reference"] = f"Patient/{payload.patient_id}"
                    if "author" in document_reference and len(document_reference["author"]) > 0:
                        document_reference["author"][0]["reference"] = f"Practitioner/{current_doctor.id}"
                    else:
                        document_reference["author"] = [{"reference": f"Practitioner/{current_doctor.id}"}]
                    if "context" in document_reference:
                        if "encounter" in document_reference["context"] and len(document_reference["context"]["encounter"]) > 0:
                            document_reference["context"]["encounter"][0]["reference"] = f"Encounter/{payload.data.get('encounter_id', 'unknown')}"
                        else:
                            document_reference["context"]["encounter"] = [{"reference": f"Encounter/{payload.data.get('encounter_id', 'unknown')}"}]
                        document_reference["context"]["period"]["start"] = datetime.now(timezone.utc).isoformat()
                    else:
                        document_reference["context"] = {
                            "encounter": [{"reference": f"Encounter/{payload.data.get('encounter_id', 'unknown')}"}],
                            "period": {"start": datetime.now(timezone.utc).isoformat()}
                        }
                else:
                    print(f"DEBUG: Existing DocumentReference not found, will create new")
                    existing_report_id = None  # Not found, create new
            except Exception as e:
                print(f"DEBUG: Could not fetch existing DocumentReference: {e}, will create new")
                import traceback
                traceback.print_exc()
                existing_report_id = None  # Not found or error, create new
        
        if not existing_report_id:
            # Create new DocumentReference
            print(f"DEBUG: Creating new DocumentReference")
            document_reference_id = f"doc-{uuid4().hex[:8]}"
        document_reference = {
            "resourceType": "DocumentReference",
                "id": document_reference_id,
            "status": "current",
            "type": {
                "coding": [{
                    "system": "http://loinc.org",
                    "code": payload.code,
                    "display": f"{payload.specialty} Report"
                }]
            },
            "category": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/document-classcodes",
                    "code": "clinical-note",
                    "display": "Clinical Note"
                }]
            }],
            "subject": {
                "reference": f"Patient/{payload.patient_id}"
            },
            "author": [{
                "reference": f"Practitioner/{current_doctor.id}"
            }],
            "content": [{
                "attachment": {
                    "contentType": "application/pdf",
                    "title": f"{payload.specialty} Report - {datetime.now().strftime('%Y-%m-%d')}"
                }
            }],
            "context": {
                "encounter": [{
                    "reference": f"Encounter/{payload.data.get('encounter_id', 'unknown')}"
                }],
                "period": {
                    "start": datetime.now(timezone.utc).isoformat()
                }
            }
        }

        # 2. Create FHIR Binary for PDF content
        # Get doctor's full name for PDF
        doctor_full_name = f"{user_obj.first_name} {user_obj.last_name}".strip() if user_obj else current_doctor.email
        pdf_content = generate_report_pdf(payload.data, doctor_full_name, payload.specialty)
        binary_resource = {
            "resourceType": "Binary",
            "id": f"bin-{uuid4().hex[:8]}",
            "contentType": "application/pdf",
            "data": base64.b64encode(pdf_content).decode('utf-8')
        }

        # 3. Create optional DiagnosticReport if lab/imaging data present
        diagnostic_report = None
        if has_lab_or_imaging_data(payload.data):
            diagnostic_report = create_diagnostic_report(payload, current_doctor)

        # 4. Create Binary resource first (always create new binary for updated PDF)
        binary_result = fhir_repo.save(binary_resource)
        
        # 5. Update DocumentReference with Binary reference before saving
        if "content" in document_reference and len(document_reference["content"]) > 0:
            document_reference["content"][0]["attachment"]["url"] = f"Binary/{binary_result['id']}"
        else:
            document_reference["content"] = [{
                "attachment": {
                    "contentType": "application/pdf",
                    "title": f"{payload.specialty} Report - {datetime.now().strftime('%Y-%m-%d')}",
                    "url": f"Binary/{binary_result['id']}"
                }
            }]
        
        # 6. Persist DocumentReference (create or update)
        if is_update:
            print(f"DEBUG: Updating existing DocumentReference: {document_reference_id}")
        else:
            print(f"DEBUG: Creating new DocumentReference: {document_reference_id}")
        doc_ref_result = fhir_repo.save(document_reference)
        
        # 7. Create optional DiagnosticReport if lab/imaging data present
        if diagnostic_report:
            diag_result = fhir_repo.save(diagnostic_report)
        else:
            diag_result = None

        # 5b. Save report to database (ClinicalNote table - used by patient profile)
        from app.common.models.doctor import ClinicalNote, Doctor
        from uuid import UUID
        
        # Get doctor profile ID (from ehr.doctors table, not user_id)
        doctor_profile = db.query(Doctor).filter(Doctor.user_id == current_doctor.id).first()
        if not doctor_profile:
            # If doctor profile doesn't exist, skip saving to ClinicalNote
            # (Report is still saved to FHIR)
            doctor_profile_id = None
        else:
            doctor_profile_id = doctor_profile.id
        
        if doctor_profile_id:
            # Extract content from report data for ClinicalNote
            clinical_content = ""
            assessment = ""
            plan = ""
            subjective = ""
            
            if isinstance(payload.data, dict):
                # Map report data to ClinicalNote fields
                # Extract subjective (chief complaint or history of present illness)
                hpi = payload.data.get("hpi", {})
                chief_complaint = payload.data.get("chief_complaint", "")
                if isinstance(hpi, dict):
                    # Handle ophthalmology format (description) or general format (free)
                    subjective = hpi.get("description", "") or hpi.get("free", "") or chief_complaint or ""
                else:
                    subjective = str(hpi) if hpi else (chief_complaint or "")
                
                # Extract assessment - convert dict to string if needed
                # Check both "assessment" and "diagnosis" keys
                assessment_raw = payload.data.get("assessment")
                if assessment_raw is None:
                    assessment_raw = payload.data.get("diagnosis", "")
                
                # Ensure assessment is converted to string
                if isinstance(assessment_raw, dict):
                    # If assessment is a dict, convert to JSON string (full data)
                    assessment = json.dumps(assessment_raw, ensure_ascii=False) if assessment_raw else ""
                elif isinstance(assessment_raw, str):
                    assessment = assessment_raw
                else:
                    assessment = str(assessment_raw) if assessment_raw else ""
                
                # Extract plan - convert dict to string if needed
                # Check both "plan" and "treatment_plan" keys
                plan_raw = payload.data.get("plan")
                if plan_raw is None:
                    plan_raw = payload.data.get("treatment_plan", "")
                
                # Ensure plan is converted to string
                if isinstance(plan_raw, dict):
                    # If plan is a dict, convert to JSON string (full data)
                    plan = json.dumps(plan_raw, ensure_ascii=False) if plan_raw else ""
                elif isinstance(plan_raw, str):
                    plan = plan_raw
                else:
                    plan = str(plan_raw) if plan_raw else ""
                
                # Store full JSON data in content field (no truncation - Text field can handle it)
                # This is critical - it preserves all form data for retrieval
                try:
                    clinical_content = json.dumps(payload.data, ensure_ascii=False, indent=2) if payload.data else ""
                    print(f"DEBUG: Serialized full payload.data to clinical_content, length={len(clinical_content)}")
                    # Verify it can be parsed back
                    test_parse = json.loads(clinical_content) if clinical_content else {}
                    print(f"DEBUG: Verified clinical_content can be parsed, has keys: {list(test_parse.keys()) if isinstance(test_parse, dict) else 'Not a dict'}")
                    # Check if HPI is present
                    if isinstance(test_parse, dict) and 'hpi' in test_parse:
                        hpi_data = test_parse.get('hpi', {})
                        print(f"DEBUG: HPI data in clinical_content: {hpi_data}")
                        if isinstance(hpi_data, dict):
                            print(f"DEBUG: HPI keys: {list(hpi_data.keys())}")
                            print(f"DEBUG: HPI description: '{hpi_data.get('description', '')}'")
                            print(f"DEBUG: HPI allergies: '{hpi_data.get('allergies', '')}'")
                    
                    # Check if External/Adnexa is present
                    if isinstance(test_parse, dict) and 'external' in test_parse:
                        external_data = test_parse.get('external', {})
                        print(f"DEBUG: External/Adnexa data in clinical_content: {external_data}")
                        if isinstance(external_data, dict):
                            print(f"DEBUG: External keys: {list(external_data.keys())}")
                            print(f"DEBUG: External eyebrows: '{external_data.get('eyebrows', '')}'")
                            print(f"DEBUG: External lids_lashes: '{external_data.get('lids_lashes', '')}'")
                            print(f"DEBUG: External lacrimal: '{external_data.get('lacrimal', '')}'")
                            print(f"DEBUG: External orbit: '{external_data.get('orbit', '')}'")
                    
                    # Check if Visual Acuity is present
                    if isinstance(test_parse, dict) and 'acuity' in test_parse:
                        acuity_data = test_parse.get('acuity', {})
                        print(f"DEBUG: Visual Acuity data in clinical_content: {acuity_data}")
                        if isinstance(acuity_data, dict):
                            print(f"DEBUG: Acuity keys: {list(acuity_data.keys())}")
                            if 'distance' in acuity_data:
                                distance_data = acuity_data.get('distance', {})
                                print(f"DEBUG: Acuity distance SC: {distance_data.get('sc', {})}")
                                print(f"DEBUG: Acuity distance CC: {distance_data.get('cc', {})}")
                            if 'near' in acuity_data:
                                near_data = acuity_data.get('near', {})
                                print(f"DEBUG: Acuity near SC: {near_data.get('sc', {})}")
                                print(f"DEBUG: Acuity near CC: {near_data.get('cc', {})}")
                            if 'pinhole' in acuity_data:
                                print(f"DEBUG: Acuity pinhole: {acuity_data.get('pinhole', {})}")
                    
                    # Check if Refraction is present
                    if isinstance(test_parse, dict) and 'refraction' in test_parse:
                        refraction_data = test_parse.get('refraction', {})
                        print(f"DEBUG: Refraction data in clinical_content: {refraction_data}")
                        if isinstance(refraction_data, dict):
                            print(f"DEBUG: Refraction keys: {list(refraction_data.keys())}")
                            print(f"DEBUG: Refraction cycloplegic: {refraction_data.get('cycloplegic', False)}")
                            if 'od' in refraction_data:
                                od_data = refraction_data.get('od', {})
                                print(f"DEBUG: Refraction OD - sphere: '{od_data.get('sphere', '')}', cylinder: '{od_data.get('cylinder', '')}', axis: '{od_data.get('axis', '')}', add: '{od_data.get('add', '')}'")
                            if 'os' in refraction_data:
                                os_data = refraction_data.get('os', {})
                                print(f"DEBUG: Refraction OS - sphere: '{os_data.get('sphere', '')}', cylinder: '{os_data.get('cylinder', '')}', axis: '{os_data.get('axis', '')}', add: '{os_data.get('add', '')}'")
                            if 'final_rx' in refraction_data:
                                final_rx = refraction_data.get('final_rx', {})
                                print(f"DEBUG: Refraction final_rx - od: '{final_rx.get('od', '')}', os: '{final_rx.get('os', '')}', pd: '{final_rx.get('pd', '')}'")
                    
                    # Check if Pupils is present
                    if isinstance(test_parse, dict) and 'pupils' in test_parse:
                        pupils_data = test_parse.get('pupils', {})
                        print(f"DEBUG: Pupils data in clinical_content: {pupils_data}")
                        if isinstance(pupils_data, dict):
                            print(f"DEBUG: Pupils keys: {list(pupils_data.keys())}")
                            if 'od' in pupils_data:
                                od_data = pupils_data.get('od', {})
                                print(f"DEBUG: Pupils OD - size_mm: '{od_data.get('size_mm', '')}', reaction: '{od_data.get('reaction', '')}', rapd: {od_data.get('rapd', False)}, irregular: {od_data.get('irregular', False)}")
                            if 'os' in pupils_data:
                                os_data = pupils_data.get('os', {})
                                print(f"DEBUG: Pupils OS - size_mm: '{os_data.get('size_mm', '')}', reaction: '{os_data.get('reaction', '')}', rapd: {os_data.get('rapd', False)}, irregular: {os_data.get('irregular', False)}")
                    
                    # Check if Motility is present
                    if isinstance(test_parse, dict) and 'motility' in test_parse:
                        motility_data = test_parse.get('motility', {})
                        print(f"DEBUG: Motility data in clinical_content: {motility_data}")
                        if isinstance(motility_data, dict):
                            print(f"DEBUG: Motility keys: {list(motility_data.keys())}")
                            print(f"DEBUG: Motility versions: '{motility_data.get('versions', '')}'")
                            print(f"DEBUG: Motility ductions: '{motility_data.get('ductions', '')}'")
                            print(f"DEBUG: Motility deviations: '{motility_data.get('deviations', '')}'")
                    
                    # Check if Alignment is present
                    if isinstance(test_parse, dict) and 'alignment' in test_parse:
                        alignment_data = test_parse.get('alignment', {})
                        print(f"DEBUG: Alignment data in clinical_content: {alignment_data}")
                        if isinstance(alignment_data, dict):
                            print(f"DEBUG: Alignment keys: {list(alignment_data.keys())}")
                            if 'distance' in alignment_data:
                                distance_data = alignment_data.get('distance', {})
                                print(f"DEBUG: Alignment distance - type: '{distance_data.get('type', '')}', prism: '{distance_data.get('prism', '')}', axis: '{distance_data.get('axis', '')}'")
                            if 'near' in alignment_data:
                                near_data = alignment_data.get('near', {})
                                print(f"DEBUG: Alignment near - type: '{near_data.get('type', '')}', prism: '{near_data.get('prism', '')}', axis: '{near_data.get('axis', '')}'")
                    
                    # Check if Confrontation Fields is present
                    if isinstance(test_parse, dict) and 'confrontation_fields' in test_parse:
                        confrontation_data = test_parse.get('confrontation_fields', {})
                        print(f"DEBUG: Confrontation Fields data in clinical_content: {confrontation_data}")
                        if isinstance(confrontation_data, dict):
                            print(f"DEBUG: Confrontation Fields keys: {list(confrontation_data.keys())}")
                            print(f"DEBUG: Confrontation Fields summary: '{confrontation_data.get('summary', '')}'")
                    
                    # Check if IOP is present
                    if isinstance(test_parse, dict) and 'iop' in test_parse:
                        iop_data = test_parse.get('iop', {})
                        print(f"DEBUG: IOP data in clinical_content: {iop_data}")
                        if isinstance(iop_data, dict):
                            print(f"DEBUG: IOP keys: {list(iop_data.keys())}")
                            print(f"DEBUG: IOP method: '{iop_data.get('method', '')}', time: '{iop_data.get('time', '')}'")
                            print(f"DEBUG: IOP OD: '{iop_data.get('od', '')}', OS: '{iop_data.get('os', '')}'")
                            if 'post_dilation' in iop_data:
                                post_dilation = iop_data.get('post_dilation', {})
                                print(f"DEBUG: IOP post_dilation - time: '{post_dilation.get('time', '')}', od: '{post_dilation.get('od', '')}', os: '{post_dilation.get('os', '')}'")
                    
                    # Check if Dilation is present
                    if isinstance(test_parse, dict) and 'dilation' in test_parse:
                        dilation_data = test_parse.get('dilation', {})
                        print(f"DEBUG: Dilation data in clinical_content: {dilation_data}")
                        if isinstance(dilation_data, dict):
                            print(f"DEBUG: Dilation keys: {list(dilation_data.keys())}")
                            print(f"DEBUG: Dilation performed: {dilation_data.get('performed', False)}")
                            print(f"DEBUG: Dilation agent: '{dilation_data.get('agent', '')}', time: '{dilation_data.get('time', '')}'")
                    
                    # Check if Gonioscopy is present
                    if isinstance(test_parse, dict) and 'gonioscopy' in test_parse:
                        gonioscopy_data = test_parse.get('gonioscopy', {})
                        print(f"DEBUG: Gonioscopy data in clinical_content: {gonioscopy_data}")
                        if isinstance(gonioscopy_data, dict):
                            print(f"DEBUG: Gonioscopy keys: {list(gonioscopy_data.keys())}")
                            print(f"DEBUG: Gonioscopy performed: {gonioscopy_data.get('performed', False)}")
                            if 'od' in gonioscopy_data:
                                od_data = gonioscopy_data.get('od', {})
                                print(f"DEBUG: Gonioscopy OD - shaffer: '{od_data.get('shaffer', '')}', pigmentation: '{od_data.get('pigmentation', '')}', pas: {od_data.get('pas', False)}, notes: '{od_data.get('notes', '')}'")
                            if 'os' in gonioscopy_data:
                                os_data = gonioscopy_data.get('os', {})
                                print(f"DEBUG: Gonioscopy OS - shaffer: '{os_data.get('shaffer', '')}', pigmentation: '{os_data.get('pigmentation', '')}', pas: {os_data.get('pas', False)}, notes: '{os_data.get('notes', '')}'")
                    
                    # Check if Anterior Segment is present
                    if isinstance(test_parse, dict) and 'anterior' in test_parse:
                        anterior_data = test_parse.get('anterior', {})
                        print(f"DEBUG: Anterior Segment data in clinical_content: {anterior_data}")
                        if isinstance(anterior_data, dict):
                            print(f"DEBUG: Anterior Segment keys: {list(anterior_data.keys())}")
                            print(f"DEBUG: Anterior Segment - lids: '{anterior_data.get('lids', '')}', conjunctiva: '{anterior_data.get('conjunctiva', '')}', cornea: '{anterior_data.get('cornea', '')}'")
                            print(f"DEBUG: Anterior Segment - anterior_chamber: '{anterior_data.get('anterior_chamber', '')}', iris: '{anterior_data.get('iris', '')}', lens: '{anterior_data.get('lens', '')}'")
                    
                    # Check if Posterior Segment is present
                    if isinstance(test_parse, dict) and 'posterior' in test_parse:
                        posterior_data = test_parse.get('posterior', {})
                        print(f"DEBUG: Posterior Segment data in clinical_content: {posterior_data}")
                        if isinstance(posterior_data, dict):
                            print(f"DEBUG: Posterior Segment keys: {list(posterior_data.keys())}")
                            print(f"DEBUG: Posterior Segment - vitreous: '{posterior_data.get('vitreous', '')}', disc: '{posterior_data.get('disc', '')}', macula: '{posterior_data.get('macula', '')}'")
                            if 'cd_ratio' in posterior_data:
                                cd_ratio = posterior_data.get('cd_ratio', {})
                                print(f"DEBUG: Posterior Segment C/D Ratio - OD: '{cd_ratio.get('OD', '')}', OS: '{cd_ratio.get('OS', '')}'")
                            print(f"DEBUG: Posterior Segment - vessels: '{posterior_data.get('vessels', '')}', periphery: '{posterior_data.get('periphery', '')}'")
                            print(f"DEBUG: Posterior Segment - dr_grade: '{posterior_data.get('dr_grade', '')}', amd_grade: '{posterior_data.get('amd_grade', '')}'")
                    
                    # Check if Tests & Imaging is present
                    if isinstance(test_parse, dict) and 'tests' in test_parse:
                        tests_data = test_parse.get('tests', {})
                        print(f"DEBUG: Tests & Imaging data in clinical_content: {tests_data}")
                        if isinstance(tests_data, dict):
                            print(f"DEBUG: Tests keys: {list(tests_data.keys())}")
                            print(f"DEBUG: Tests notes: '{tests_data.get('notes', '')}'")
                            if 'keratometry' in tests_data:
                                keratometry = tests_data.get('keratometry', {})
                                print(f"DEBUG: Tests Keratometry - k1: '{keratometry.get('k1', '')}', k2: '{keratometry.get('k2', '')}', axis: '{keratometry.get('axis', '')}'")
                            if 'pachymetry' in tests_data:
                                pachymetry = tests_data.get('pachymetry', {})
                                print(f"DEBUG: Tests Pachymetry - cct_od: '{pachymetry.get('cct_od', '')}', cct_os: '{pachymetry.get('cct_os', '')}'")
                            if 'oct' in tests_data:
                                oct = tests_data.get('oct', {})
                                print(f"DEBUG: Tests OCT - rnfl_od: '{oct.get('rnfl_od', '')}', rnfl_os: '{oct.get('rnfl_os', '')}', gcipl_od: '{oct.get('gcipl_od', '')}', gcipl_os: '{oct.get('gcipl_os', '')}'")
                            if 'imaging' in tests_data:
                                imaging = tests_data.get('imaging', [])
                                print(f"DEBUG: Tests imaging array: {imaging}")
                            if 'referenced_docs' in tests_data:
                                referenced_docs = tests_data.get('referenced_docs', [])
                                print(f"DEBUG: Tests referenced_docs array: {referenced_docs}")
                    
                    # Check if Imaging Links is present
                    if isinstance(test_parse, dict) and 'imaging_links' in test_parse:
                        imaging_links_data = test_parse.get('imaging_links', [])
                        print(f"DEBUG: Imaging Links data in clinical_content: {imaging_links_data}")
                        if isinstance(imaging_links_data, list):
                            print(f"DEBUG: Imaging Links count: {len(imaging_links_data)}")
                            for idx, link in enumerate(imaging_links_data):
                                if isinstance(link, dict):
                                    print(f"DEBUG: Imaging Link {idx} - study_uid: '{link.get('study_uid', '')}', modality: '{link.get('modality', '')}', description: '{link.get('description', '')}', attach: '{link.get('attach', '')}'")
                    
                    # Check if Diagnosis is present
                    if isinstance(test_parse, dict) and 'diagnosis' in test_parse:
                        diagnosis_data = test_parse.get('diagnosis', {})
                        print(f"DEBUG: Diagnosis data in clinical_content: {diagnosis_data}")
                        if isinstance(diagnosis_data, dict):
                            print(f"DEBUG: Diagnosis keys: {list(diagnosis_data.keys())}")
                            if 'main' in diagnosis_data:
                                main_diag = diagnosis_data.get('main', {})
                                if isinstance(main_diag, dict):
                                    print(f"DEBUG: Diagnosis main - code: '{main_diag.get('code', '')}', term: '{main_diag.get('term', '')}'")
                                elif isinstance(main_diag, str):
                                    print(f"DEBUG: Diagnosis main (string): '{main_diag}'")
                            if 'secondary' in diagnosis_data:
                                secondary_diag = diagnosis_data.get('secondary', [])
                                print(f"DEBUG: Diagnosis secondary array: {secondary_diag}, count: {len(secondary_diag) if isinstance(secondary_diag, list) else 0}")
                            if 'codes' in diagnosis_data:
                                codes_diag = diagnosis_data.get('codes', [])
                                print(f"DEBUG: Diagnosis codes array: {codes_diag}, count: {len(codes_diag) if isinstance(codes_diag, list) else 0}")
                    
                    # Check if Plan is present
                    if isinstance(test_parse, dict) and 'plan' in test_parse:
                        plan_data = test_parse.get('plan', {})
                        print(f"DEBUG: Plan data in clinical_content: {plan_data}")
                        if isinstance(plan_data, dict):
                            print(f"DEBUG: Plan keys: {list(plan_data.keys())}")
                            if 'meds' in plan_data:
                                meds_data = plan_data.get('meds', [])
                                print(f"DEBUG: Plan meds array: {meds_data}, count: {len(meds_data) if isinstance(meds_data, list) else 0}")
                                if isinstance(meds_data, list):
                                    for idx, med in enumerate(meds_data):
                                        if isinstance(med, dict):
                                            print(f"DEBUG: Plan med[{idx}] - med: '{med.get('med', '')}', conc_strength: '{med.get('conc_strength', '')}', route: '{med.get('route', '')}', freq: '{med.get('freq', '')}', duration: '{med.get('duration', '')}', instructions: '{med.get('instructions', '')}'")
                                        elif isinstance(med, str):
                                            print(f"DEBUG: Plan med[{idx}] (string): '{med}'")
                    
                    # Check if Procedures Done is present
                    if isinstance(test_parse, dict) and 'procedures_done' in test_parse:
                        procedures_done_data = test_parse.get('procedures_done', [])
                        print(f"DEBUG: Procedures Done data in clinical_content: {procedures_done_data}")
                        if isinstance(procedures_done_data, list):
                            print(f"DEBUG: Procedures Done array count: {len(procedures_done_data)}")
                            for idx, proc in enumerate(procedures_done_data):
                                if isinstance(proc, dict):
                                    print(f"DEBUG: Procedures Done[{idx}] - name: '{proc.get('name', '')}', date: '{proc.get('date', '')}', eye: '{proc.get('eye', '')}', anesthesia: '{proc.get('anesthesia', '')}', technique: '{proc.get('technique', '')}', findings: '{proc.get('findings', '')}', result: '{proc.get('result', '')}', complications: '{proc.get('complications', '')}'")
                                elif isinstance(proc, str):
                                    print(f"DEBUG: Procedures Done[{idx}] (string): '{proc}'")
                    
                    # Check if Attachments is present
                    if isinstance(test_parse, dict) and 'attachments' in test_parse:
                        attachments_data = test_parse.get('attachments', [])
                        print(f"DEBUG: Attachments data in clinical_content: {attachments_data}")
                        if isinstance(attachments_data, list):
                            print(f"DEBUG: Attachments array count: {len(attachments_data)}")
                            for idx, att in enumerate(attachments_data):
                                if isinstance(att, dict):
                                    print(f"DEBUG: Attachments[{idx}] - id: '{att.get('id', '')}', label: '{att.get('label', '')}', type: '{att.get('type', '')}', url: '{att.get('url', '')}', filename: '{att.get('filename', '')}'")
                                elif isinstance(att, str):
                                    print(f"DEBUG: Attachments[{idx}] (string): '{att}'")
                    
                    # Check if Neurology-specific modules are present
                    # Check if Vitals is present (neurology-specific)
                    if isinstance(test_parse, dict) and 'vitals' in test_parse:
                        vitals_data = test_parse.get('vitals', {})
                        print(f"DEBUG: Vitals data in clinical_content: {vitals_data}")
                        if isinstance(vitals_data, dict):
                            print(f"DEBUG: Vitals keys: {list(vitals_data.keys())}")
                            print(f"DEBUG: Vitals - bp_right: '{vitals_data.get('bp_right', '')}', bp_left: '{vitals_data.get('bp_left', '')}', hr: '{vitals_data.get('hr', '')}', temp: '{vitals_data.get('temp', '')}', spo2: '{vitals_data.get('spo2', '')}'")
                    
                    # Check if Mental Status is present
                    if isinstance(test_parse, dict) and 'mental_status' in test_parse:
                        mental_status_data = test_parse.get('mental_status', {})
                        print(f"DEBUG: Mental Status data in clinical_content: {mental_status_data}")
                        if isinstance(mental_status_data, dict):
                            print(f"DEBUG: Mental Status keys: {list(mental_status_data.keys())}")
                            print(f"DEBUG: Mental Status - consciousness: '{mental_status_data.get('consciousness', '')}', attention_memory: '{mental_status_data.get('attention_memory', '')}', language: '{mental_status_data.get('language', '')}', behavior: '{mental_status_data.get('behavior', '')}'")
                            if 'orientation' in mental_status_data:
                                orientation = mental_status_data.get('orientation', {})
                                print(f"DEBUG: Mental Status orientation - person: {orientation.get('person', False)}, place: {orientation.get('place', False)}, time: {orientation.get('time', False)}")
                            if 'mmse' in mental_status_data:
                                mmse = mental_status_data.get('mmse', {})
                                print(f"DEBUG: Mental Status MMSE - score: '{mmse.get('score', '')}', date: '{mmse.get('date', '')}'")
                            if 'moca' in mental_status_data:
                                moca = mental_status_data.get('moca', {})
                                print(f"DEBUG: Mental Status MOCA - score: '{moca.get('score', '')}', date: '{moca.get('date', '')}'")
                    
                    # Check if Cranial Nerves is present
                    if isinstance(test_parse, dict) and 'cranial_nerves' in test_parse:
                        cranial_nerves_data = test_parse.get('cranial_nerves', {})
                        print(f"DEBUG: Cranial Nerves data in clinical_content: {cranial_nerves_data}")
                        if isinstance(cranial_nerves_data, dict):
                            print(f"DEBUG: Cranial Nerves keys: {list(cranial_nerves_data.keys())}")
                            print(f"DEBUG: Cranial Nerves - cn1: '{cranial_nerves_data.get('cn1', '')}', cn2_fields: '{cranial_nerves_data.get('cn2_fields', '')}', cn3_4_6_eyemov: '{cranial_nerves_data.get('cn3_4_6_eyemov', '')}', cn5: '{cranial_nerves_data.get('cn5', '')}', cn7: '{cranial_nerves_data.get('cn7', '')}', cn8: '{cranial_nerves_data.get('cn8', '')}', cn9_10: '{cranial_nerves_data.get('cn9_10', '')}', cn11: '{cranial_nerves_data.get('cn11', '')}', cn12: '{cranial_nerves_data.get('cn12', '')}'")
                    
                    # Check if Motor is present
                    if isinstance(test_parse, dict) and 'motor' in test_parse:
                        motor_data = test_parse.get('motor', {})
                        print(f"DEBUG: Motor data in clinical_content: {motor_data}")
                        if isinstance(motor_data, dict):
                            print(f"DEBUG: Motor keys: {list(motor_data.keys())}")
                            print(f"DEBUG: Motor - tone: '{motor_data.get('tone', '')}', bulk: '{motor_data.get('bulk', '')}', fasciculations: {motor_data.get('fasciculations', False)}, pronator_drift: '{motor_data.get('pronator_drift', '')}'")
                            if 'strength' in motor_data:
                                strength = motor_data.get('strength', {})
                                if 'R' in strength:
                                    r_strength = strength.get('R', {})
                                    print(f"DEBUG: Motor Strength R - shoulder: '{r_strength.get('shoulder', '')}', elbow: '{r_strength.get('elbow', '')}', wrist: '{r_strength.get('wrist', '')}', hip: '{r_strength.get('hip', '')}', knee: '{r_strength.get('knee', '')}', ankle: '{r_strength.get('ankle', '')}'")
                                if 'L' in strength:
                                    l_strength = strength.get('L', {})
                                    print(f"DEBUG: Motor Strength L - shoulder: '{l_strength.get('shoulder', '')}', elbow: '{l_strength.get('elbow', '')}', wrist: '{l_strength.get('wrist', '')}', hip: '{l_strength.get('hip', '')}', knee: '{l_strength.get('knee', '')}', ankle: '{l_strength.get('ankle', '')}'")
                    
                    # Check if Reflexes is present
                    if isinstance(test_parse, dict) and 'reflexes' in test_parse:
                        reflexes_data = test_parse.get('reflexes', {})
                        print(f"DEBUG: Reflexes data in clinical_content: {reflexes_data}")
                        if isinstance(reflexes_data, dict):
                            print(f"DEBUG: Reflexes keys: {list(reflexes_data.keys())}")
                            print(f"DEBUG: Reflexes - biceps: '{reflexes_data.get('biceps', '')}', triceps: '{reflexes_data.get('triceps', '')}', brachioradialis: '{reflexes_data.get('brachioradialis', '')}', knee: '{reflexes_data.get('knee', '')}', ankle: '{reflexes_data.get('ankle', '')}', plantar: '{reflexes_data.get('plantar', '')}', hoffman: {reflexes_data.get('hoffman', False)}, clonus: {reflexes_data.get('clonus', False)}")
                    
                    # Check if Sensory is present
                    if isinstance(test_parse, dict) and 'sensory' in test_parse:
                        sensory_data = test_parse.get('sensory', {})
                        print(f"DEBUG: Sensory data in clinical_content: {sensory_data}")
                        if isinstance(sensory_data, dict):
                            print(f"DEBUG: Sensory keys: {list(sensory_data.keys())}")
                            print(f"DEBUG: Sensory - light_touch: '{sensory_data.get('light_touch', '')}', pinprick: '{sensory_data.get('pinprick', '')}', temperature: '{sensory_data.get('temperature', '')}', vibration: '{sensory_data.get('vibration', '')}', proprioception: '{sensory_data.get('proprioception', '')}', dermatomes_note: '{sensory_data.get('dermatomes_note', '')}'")
                    
                    # Check if Cerebellar is present
                    if isinstance(test_parse, dict) and 'cerebellar' in test_parse:
                        cerebellar_data = test_parse.get('cerebellar', {})
                        print(f"DEBUG: Cerebellar data in clinical_content: {cerebellar_data}")
                        if isinstance(cerebellar_data, dict):
                            print(f"DEBUG: Cerebellar keys: {list(cerebellar_data.keys())}")
                            print(f"DEBUG: Cerebellar - fnf: '{cerebellar_data.get('fnf', '')}', hks: '{cerebellar_data.get('hks', '')}', diadochokinesis: '{cerebellar_data.get('diadochokinesis', '')}', romberg: '{cerebellar_data.get('romberg', '')}'")
                            if 'gait' in cerebellar_data:
                                gait = cerebellar_data.get('gait', {})
                                print(f"DEBUG: Cerebellar gait - normal: {gait.get('normal', False)}, tandem: {gait.get('tandem', False)}, heels: {gait.get('heels', False)}, toes: {gait.get('toes', False)}")
                    
                    # Check if Autonomic is present
                    if isinstance(test_parse, dict) and 'autonomic' in test_parse:
                        autonomic_data = test_parse.get('autonomic', {})
                        print(f"DEBUG: Autonomic data in clinical_content: {autonomic_data}")
                        if isinstance(autonomic_data, dict):
                            print(f"DEBUG: Autonomic keys: {list(autonomic_data.keys())}")
                            print(f"DEBUG: Autonomic - orthostasis_bp: '{autonomic_data.get('orthostasis_bp', '')}', bowel_bladder: '{autonomic_data.get('bowel_bladder', '')}', sweating: '{autonomic_data.get('sweating', '')}'")
                    
                    # Check if Meningeal is present
                    if isinstance(test_parse, dict) and 'meningeal' in test_parse:
                        meningeal_data = test_parse.get('meningeal', {})
                        print(f"DEBUG: Meningeal data in clinical_content: {meningeal_data}")
                        if isinstance(meningeal_data, dict):
                            print(f"DEBUG: Meningeal keys: {list(meningeal_data.keys())}")
                            print(f"DEBUG: Meningeal - nuchal_rigidity: {meningeal_data.get('nuchal_rigidity', False)}, kernig: {meningeal_data.get('kernig', False)}, brudzinski: {meningeal_data.get('brudzinski', False)}")
                    
                    # Check if Pain/Headache is present
                    if isinstance(test_parse, dict) and 'pain_headache' in test_parse:
                        pain_headache_data = test_parse.get('pain_headache', {})
                        print(f"DEBUG: Pain/Headache data in clinical_content: {pain_headache_data}")
                        if isinstance(pain_headache_data, dict):
                            print(f"DEBUG: Pain/Headache keys: {list(pain_headache_data.keys())}")
                            print(f"DEBUG: Pain/Headache - site: '{pain_headache_data.get('site', '')}', quality: '{pain_headache_data.get('quality', '')}', severity_vas: '{pain_headache_data.get('severity_vas', '')}', triggers: '{pain_headache_data.get('triggers', '')}'")
                            if 'red_flags' in pain_headache_data:
                                red_flags = pain_headache_data.get('red_flags', [])
                                print(f"DEBUG: Pain/Headache red_flags array: {red_flags}, count: {len(red_flags) if isinstance(red_flags, list) else 0}")
                    
                    # Check if Seizure is present
                    if isinstance(test_parse, dict) and 'seizure' in test_parse:
                        seizure_data = test_parse.get('seizure', {})
                        print(f"DEBUG: Seizure data in clinical_content: {seizure_data}")
                        if isinstance(seizure_data, dict):
                            print(f"DEBUG: Seizure keys: {list(seizure_data.keys())}")
                            print(f"DEBUG: Seizure - semiology: '{seizure_data.get('semiology', '')}', frequency: '{seizure_data.get('frequency', '')}', triggers: '{seizure_data.get('triggers', '')}', postictal: '{seizure_data.get('postictal', '')}', adherence: '{seizure_data.get('adherence', '')}'")
                            if 'aeds' in seizure_data:
                                aeds = seizure_data.get('aeds', [])
                                print(f"DEBUG: Seizure AEDs array: {aeds}, count: {len(aeds) if isinstance(aeds, list) else 0}")
                    
                    # Check if Stroke is present
                    if isinstance(test_parse, dict) and 'stroke' in test_parse:
                        stroke_data = test_parse.get('stroke', {})
                        print(f"DEBUG: Stroke data in clinical_content: {stroke_data}")
                        if isinstance(stroke_data, dict):
                            print(f"DEBUG: Stroke keys: {list(stroke_data.keys())}")
                            print(f"DEBUG: Stroke - lkw_time: '{stroke_data.get('lkw_time', '')}', mrs_pre: '{stroke_data.get('mrs_pre', '')}', mrs_current: '{stroke_data.get('mrs_current', '')}', thrombectomy_consider: {stroke_data.get('thrombectomy_consider', False)}")
                            if 'nihss' in stroke_data:
                                nihss = stroke_data.get('nihss', {})
                                print(f"DEBUG: Stroke NIHSS - total: '{nihss.get('total', '')}'")
                                if 'items' in nihss:
                                    nihss_items = nihss.get('items', {})
                                    print(f"DEBUG: Stroke NIHSS items: {nihss_items}")
                            if 'tpa_checklist' in stroke_data:
                                tpa_checklist = stroke_data.get('tpa_checklist', {})
                                print(f"DEBUG: Stroke TPA checklist - eligible: {tpa_checklist.get('eligible', None)}, contraindications: {tpa_checklist.get('contraindications', [])}")
                    
                    # Check if Localization Hypothesis is present
                    if isinstance(test_parse, dict) and 'localization_hypothesis' in test_parse:
                        localization_data = test_parse.get('localization_hypothesis', {})
                        print(f"DEBUG: Localization Hypothesis data in clinical_content: {localization_data}")
                        if isinstance(localization_data, dict):
                            print(f"DEBUG: Localization Hypothesis keys: {list(localization_data.keys())}")
                            print(f"DEBUG: Localization Hypothesis - lesion_site: '{localization_data.get('lesion_site', '')}', rationale: '{localization_data.get('rationale', '')}'")
                    
                    # Check if Tests (neurology-specific) is present
                    if isinstance(test_parse, dict) and 'tests' in test_parse:
                        tests_data = test_parse.get('tests', {})
                        if isinstance(tests_data, dict):
                            # Check for neurology-specific test fields
                            if 'eeg' in tests_data:
                                eeg_data = tests_data.get('eeg', {})
                                print(f"DEBUG: Tests EEG data in clinical_content: {eeg_data}")
                                if isinstance(eeg_data, dict):
                                    print(f"DEBUG: Tests EEG - date: '{eeg_data.get('date', '')}', summary: '{eeg_data.get('summary', '')}'")
                            if 'emg_ncs' in tests_data:
                                emg_ncs_data = tests_data.get('emg_ncs', {})
                                print(f"DEBUG: Tests EMG/NCS data in clinical_content: {emg_ncs_data}")
                                if isinstance(emg_ncs_data, dict):
                                    print(f"DEBUG: Tests EMG/NCS - date: '{emg_ncs_data.get('date', '')}', summary: '{emg_ncs_data.get('summary', '')}'")
                            if 'labs' in tests_data:
                                labs_data = tests_data.get('labs', {})
                                print(f"DEBUG: Tests Labs data in clinical_content: {labs_data}")
                                if isinstance(labs_data, dict):
                                    print(f"DEBUG: Tests Labs - b12: '{labs_data.get('b12', '')}', tsh: '{labs_data.get('tsh', '')}', a1c: '{labs_data.get('a1c', '')}', ck: '{labs_data.get('ck', '')}', esr_crp: '{labs_data.get('esr_crp', '')}', others: '{labs_data.get('others', '')}'")
                            if 'lp' in tests_data:
                                lp_data = tests_data.get('lp', {})
                                print(f"DEBUG: Tests LP data in clinical_content: {lp_data}")
                                if isinstance(lp_data, dict):
                                    print(f"DEBUG: Tests LP - performed: {lp_data.get('performed', False)}, opening_pressure: '{lp_data.get('opening_pressure', '')}', cells: '{lp_data.get('cells', '')}', protein: '{lp_data.get('protein', '')}', glucose: '{lp_data.get('glucose', '')}', microbiology: '{lp_data.get('microbiology', '')}'")
                except Exception as e:
                    print(f"DEBUG: ERROR - Failed to serialize payload.data to JSON: {e}")
                    import traceback
                    traceback.print_exc()
                    # Fallback: try without indent
                    try:
                        clinical_content = json.dumps(payload.data, ensure_ascii=False) if payload.data else ""
                    except:
                        clinical_content = str(payload.data) if payload.data else ""
            
            # Debug: Log what we're about to save
            print(f"DEBUG: Saving ClinicalNote with fhir_document_reference_id={doc_ref_result['id']}")
            print(f"DEBUG: clinical_content length: {len(clinical_content) if clinical_content else 0}")
            print(f"DEBUG: assessment: {assessment[:100] if assessment else '(empty)'}")
            print(f"DEBUG: plan: {plan[:100] if plan else '(empty)'}")
            print(f"DEBUG: subjective: {subjective[:100] if subjective else '(empty)'}")
            
            # Get encounter/appointment ID if available
            encounter_uuid = None
            if isinstance(payload.data, dict) and payload.data.get("encounter_id"):
                try:
                    encounter_uuid = UUID(payload.data.get("encounter_id"))
                except:
                    encounter_uuid = None
            
            # Check if ClinicalNote already exists for this fhir_document_reference_id (for updates)
            existing_clinical_note = db.query(ClinicalNote).filter(
                ClinicalNote.fhir_document_reference_id == doc_ref_result['id']
            ).first()
            
            if existing_clinical_note:
                # UPDATE existing ClinicalNote
                print(f"DEBUG: Updating existing ClinicalNote with fhir_document_reference_id={doc_ref_result['id']}")
                existing_clinical_note.patient_id = UUID(payload.patient_id) if isinstance(payload.patient_id, str) else payload.patient_id
                existing_clinical_note.doctor_id = doctor_profile_id
                existing_clinical_note.encounter_id = encounter_uuid
                existing_clinical_note.note_type = "consultation"
                existing_clinical_note.note_date = datetime.now(timezone.utc)
                existing_clinical_note.subjective = subjective if subjective else None
                existing_clinical_note.objective = None  # Objective field (not used in general reports)
                existing_clinical_note.assessment = assessment if assessment else None  # JSON string with full assessment data
                existing_clinical_note.plan = plan if plan else None  # JSON string with full plan data
                existing_clinical_note.content = clinical_content if clinical_content else None  # Full JSON data (no truncation)
                existing_clinical_note.is_draft = False
                existing_clinical_note.shared_with_patient = True
                existing_clinical_note.updated_at = datetime.now(timezone.utc)
                # Keep original created_by
                
                clinical_note = existing_clinical_note
                db.commit()  # Commit update
                db.refresh(clinical_note)
                print(f"DEBUG: ClinicalNote updated successfully, id={clinical_note.id}")
            else:
                # CREATE new ClinicalNote record
                print(f"DEBUG: Creating new ClinicalNote with fhir_document_reference_id={doc_ref_result['id']}")
                clinical_note = ClinicalNote(
                    id=uuid4(),
                    patient_id=UUID(payload.patient_id) if isinstance(payload.patient_id, str) else payload.patient_id,
                    doctor_id=doctor_profile_id,
                    encounter_id=encounter_uuid,
                    note_type="consultation",
                    note_date=datetime.now(timezone.utc),
                    subjective=subjective if subjective else None,
                    objective=None,  # Objective field (not used in general reports)
                    assessment=assessment if assessment else None,  # JSON string with full assessment data
                    plan=plan if plan else None,  # JSON string with full plan data
                    content=clinical_content if clinical_content else None,  # Full JSON data (no truncation)
                    is_draft=False,
                    shared_with_patient=True,
                    created_by=UUID(current_doctor.id) if isinstance(current_doctor.id, str) else current_doctor.id,
                    fhir_document_reference_id=doc_ref_result['id']
                )
                
                db.add(clinical_note)
                db.commit()  # Commit clinical note first
                db.refresh(clinical_note)
                print(f"DEBUG: ClinicalNote created successfully, id={clinical_note.id}")
            
            print(f"DEBUG: ClinicalNote committed successfully, id={clinical_note.id}")
            
            # 5b. Extract and create prescriptions from Plan medications
            # Do this AFTER committing the clinical note to avoid transaction issues
            print(f"DEBUG: ==========================================")
            print(f"DEBUG: Starting prescription creation from plan medications")
            print(f"DEBUG: ==========================================")
            try:
                if isinstance(payload.data, dict):
                    plan = payload.data.get("plan", {})
                    print(f"DEBUG: plan type: {type(plan)}, value: {plan}")
                    if isinstance(plan, dict):
                        plan_meds = plan.get("meds", [])
                        print(f"DEBUG: plan.meds type: {type(plan_meds)}, count: {len(plan_meds) if isinstance(plan_meds, list) else 0}")
                        if isinstance(plan_meds, list) and len(plan_meds) > 0:
                            print(f"DEBUG: Processing {len(plan_meds)} medications from plan")
                            
                            # Import prescription CRUD and schemas
                            from app.crud.prescription import prescription as prescription_crud
                            from app.crud.patient_medication import patient_medication
                            from app.common.models.user import User
                            from app.common.models.doctor import Doctor
                            from app.common.models.prescription import PrescriptionStatus
                            from sqlalchemy.orm import joinedload
                            from datetime import timedelta
                            
                            # Get hospital_id (same logic as in prescriptions.py)
                            user = db.query(User).filter(User.id == current_doctor.id).first()
                            hospital_id = str(user.organization_id) if user and getattr(user, "organization_id", None) else None
                            
                            doctor_profile = db.query(Doctor).options(joinedload(Doctor.hospitals)).filter(Doctor.user_id == current_doctor.id).first()
                            if not doctor_profile:
                                print(f"WARNING: Doctor profile not found for user {current_doctor.id}, skipping prescription creation")
                            else:
                                if not hospital_id:
                                    if doctor_profile.hospitals:
                                        hospital_id = str(doctor_profile.hospitals[0].id)
                                
                                if not hospital_id:
                                    hospital_id = 'bc5719be-aa1c-42fd-9b34-f3a6c841770a'  # Default hospital
                                
                                created_prescriptions = []
                                for idx, med in enumerate(plan_meds):
                                    try:
                                        # Handle both dict and string formats
                                        if isinstance(med, dict):
                                            medication_name = med.get("med", "").strip()
                                            conc_strength = med.get("conc_strength", "").strip()
                                            route = med.get("route", "").strip()
                                            freq = med.get("freq", "").strip()
                                            duration = med.get("duration", "").strip()
                                            instructions = med.get("instructions", "").strip()
                                            
                                            # Build full medication name with strength if available
                                            if conc_strength:
                                                full_medication_name = f"{medication_name} {conc_strength}"
                                            else:
                                                full_medication_name = medication_name
                                            
                                            # Build dosage string
                                            dosage_parts = []
                                            if conc_strength:
                                                dosage_parts.append(conc_strength)
                                            if route:
                                                dosage_parts.append(route)
                                            dosage = " ".join(dosage_parts) if dosage_parts else None
                                            
                                            # Build instructions from route, frequency, and custom instructions
                                            instruction_parts = []
                                            if route:
                                                instruction_parts.append(f"Route: {route}")
                                            if freq:
                                                instruction_parts.append(f"Frequency: {freq}")
                                            if instructions:
                                                instruction_parts.append(instructions)
                                            full_instructions = "; ".join(instruction_parts) if instruction_parts else instructions
                                            
                                            print(f"DEBUG: Creating prescription for medication {idx + 1}/{len(plan_meds)}:")
                                            print(f"  medication_name: '{full_medication_name}'")
                                            print(f"  dosage: '{dosage}'")
                                            print(f"  frequency: '{freq}'")
                                            print(f"  duration: '{duration}'")
                                            print(f"  instructions: '{full_instructions}'")
                                            
                                            # Create prescription
                                            db_p = prescription_crud.create_prescription(
                                                db,
                                                patient_id=payload.patient_id,
                                                doctor_id=current_doctor.id,  # user_id
                                                hospital_id=hospital_id,
                                                medicine_name=full_medication_name,
                                                dosage=dosage,
                                                frequency=freq if freq else None,
                                                duration=duration if duration else None,
                                                notes=full_instructions if full_instructions else None,
                                                intent=None,
                                                priority=None,
                                                created_by=current_doctor.id,  # user_id
                                                prescribed_by=current_doctor.id,  # user_id
                                            )
                                            rx_id = str(db_p.id)
                                            print(f"✓ Successfully created Prescription: {rx_id}")
                                            
                                            # Create PatientMedication record
                                            try:
                                                # Calculate end_date from duration if provided
                                                end_date = None
                                                if duration:
                                                    duration_lower = duration.lower()
                                                    if 'day' in duration_lower:
                                                        days = int(''.join(filter(str.isdigit, duration_lower)) or '0')
                                                        if days > 0:
                                                            end_date = date.today() + timedelta(days=days)
                                                    elif 'week' in duration_lower:
                                                        weeks = int(''.join(filter(str.isdigit, duration_lower)) or '0')
                                                        if weeks > 0:
                                                            end_date = date.today() + timedelta(weeks=weeks)
                                                    elif 'month' in duration_lower:
                                                        months = int(''.join(filter(str.isdigit, duration_lower)) or '0')
                                                        if months > 0:
                                                            end_date = date.today() + timedelta(days=months * 30)
                                                
                                                # Use route from medication or extract from instructions
                                                med_route = route if route else None
                                                if not med_route and full_instructions:
                                                    instructions_lower = full_instructions.lower()
                                                    if 'topical' in instructions_lower:
                                                        med_route = 'topical'
                                                    elif 'oral' in instructions_lower:
                                                        med_route = 'oral'
                                                    elif 'injection' in instructions_lower:
                                                        med_route = 'injection'
                                                
                                                created_med = patient_medication.create_medication(
                                                    db,
                                                    patient_id=payload.patient_id,
                                                    medication_name=full_medication_name,
                                                    dosage=dosage,
                                                    frequency=freq if freq else None,
                                                    route=med_route,
                                                    start_date=date.today(),
                                                    end_date=end_date,
                                                    prescription_id=rx_id,
                                                    prescribed_by=current_doctor.id,  # user_id
                                                    prescribed_date=date.today(),
                                                    instructions=full_instructions if full_instructions else None,
                                                    notes=None,
                                                    is_active=True
                                                )
                                                print(f"✓ Successfully created PatientMedication: {created_med.id if created_med else 'None'}")
                                            except Exception as med_error:
                                                print(f"ERROR: Failed to create PatientMedication record: {med_error}")
                                                import traceback
                                                traceback.print_exc()
                                                # Continue with next medication
                                            
                                            created_prescriptions.append(rx_id)
                                            
                                        elif isinstance(med, str):
                                            # Handle string format (legacy)
                                            print(f"DEBUG: Processing medication as string: '{med}'")
                                            # Try to parse the string format
                                            # For now, create prescription with the string as medication name
                                            db_p = prescription_crud.create_prescription(
                                                db,
                                                patient_id=payload.patient_id,
                                                doctor_id=current_doctor.id,
                                                hospital_id=hospital_id,
                                                medicine_name=med,
                                                dosage=None,
                                                frequency=None,
                                                duration=None,
                                                notes=None,
                                                intent=None,
                                                priority=None,
                                                created_by=current_doctor.id,
                                                prescribed_by=current_doctor.id,
                                            )
                                            rx_id = str(db_p.id)
                                            print(f"✓ Successfully created Prescription (string format): {rx_id}")
                                            created_prescriptions.append(rx_id)
                                        
                                    except Exception as med_error:
                                        print(f"ERROR: Failed to create prescription for medication {idx + 1}: {med_error}")
                                        import traceback
                                        traceback.print_exc()
                                        # Continue with next medication
                                
                                print(f"DEBUG: Created {len(created_prescriptions)} prescriptions from plan medications")
                        else:
                            print(f"DEBUG: No medications found in plan.meds (type: {type(plan_meds)}, value: {plan_meds})")
                    else:
                        print(f"DEBUG: Plan is not a dict (type: {type(plan)}, value: {plan})")
                else:
                    print(f"DEBUG: payload.data is not a dict (type: {type(payload.data)})")
            except Exception as e:
                print(f"ERROR: Failed to create prescriptions from plan medications: {e}")
                import traceback
                traceback.print_exc()
                # Don't fail the report creation if prescription creation fails
                try:
                    db.rollback()
                except:
                    pass
            
            # 5c. Extract and save new allergies from HPI allergies field
            # Do this AFTER committing the clinical note to avoid transaction issues
            print(f"DEBUG: ==========================================")
            print(f"DEBUG: Starting allergy extraction process")
            print(f"DEBUG: ==========================================")
            try:
                print(f"DEBUG: Checking for allergies in payload.data")
                print(f"DEBUG: payload.data type: {type(payload.data)}")
                print(f"DEBUG: payload.data keys: {list(payload.data.keys()) if isinstance(payload.data, dict) else 'Not a dict'}")
                if isinstance(payload.data, dict):
                    hpi = payload.data.get("hpi", {})
                    print(f"DEBUG: hpi type: {type(hpi)}, value: {hpi}")
                    if isinstance(hpi, dict):
                        allergies_text = hpi.get("allergies", "").strip()
                        print(f"DEBUG: allergies_text from hpi: '{allergies_text}' (length: {len(allergies_text)})")
                        if allergies_text:
                            print(f"DEBUG: Processing allergies: '{allergies_text}'")
                            # Parse allergies from text (comma-separated or newline-separated)
                            # Remove common separators and split
                            import re
                            from app.crud.clinical import allergy_intolerance
                            from app.common.models.clinical import AllergyType, AllergyCategory, AllergyCriticality
                            from uuid import UUID
                            
                            # Split by comma, semicolon, or newline
                            allergy_names = re.split(r'[,;\n]+', allergies_text)
                            allergy_names = [name.strip() for name in allergy_names if name.strip()]
                            
                            # Get existing allergies for this patient to avoid duplicates
                            # Convert patient_id to UUID for the query (model uses String(36), but CRUD expects UUID)
                            patient_uuid = UUID(payload.patient_id) if isinstance(payload.patient_id, str) else payload.patient_id
                            patient_id_str = str(payload.patient_id)  # Keep string version for model
                            
                            # Wrap in try/except to handle transaction errors
                            existing_allergies = []
                            existing_allergy_names = set()
                            try:
                                existing_allergies = allergy_intolerance.get_patient_allergies(
                                    db,
                                    patient_id=patient_uuid,
                                    include_inactive=False
                                )
                                existing_allergy_names = {a.display_name.lower() for a in existing_allergies}
                            except Exception as query_error:
                                # If query fails, rollback and continue without existing allergies
                                print(f"Warning: Failed to query existing allergies: {query_error}")
                                try:
                                    db.rollback()
                                except:
                                    pass
                                # Continue without existing allergies check
                            
                            # Create new allergies that don't already exist
                            created_count = 0
                            for allergy_name in allergy_names:
                                if not allergy_name:
                                    continue
                                
                                # Check if allergy already exists (case-insensitive)
                                if allergy_name.lower() in existing_allergy_names:
                                    print(f"Allergy '{allergy_name}' already exists for patient {payload.patient_id}, skipping")
                                    continue
                                
                                try:
                                    # Create codeable concept for the allergy
                                    code = {
                                        "coding": [{
                                            "system": "http://snomed.info/sct",
                                            "code": None,  # No SNOMED code available for free-text allergies
                                            "display": allergy_name
                                        }],
                                        "text": allergy_name
                                    }
                                    
                                    # Determine category based on allergy name
                                    allergy_category = AllergyCategory.ENVIRONMENT.value
                                    allergy_name_lower = allergy_name.lower()
                                    if any(keyword in allergy_name_lower for keyword in ["drug", "medication", "medicine", "pill", "tablet", "injection"]):
                                        allergy_category = AllergyCategory.MEDICATION.value
                                    elif any(keyword in allergy_name_lower for keyword in ["food", "peanut", "dairy", "milk", "egg", "wheat", "gluten"]):
                                        allergy_category = AllergyCategory.FOOD.value
                                    
                                    # Create allergy record
                                    # Note: create_allergy expects UUID for patient_id, but model uses String(36)
                                    # The CRUD will handle the conversion
                                    created_allergy = allergy_intolerance.create_allergy(
                                        db,
                                        patient_id=patient_uuid,
                                        code=code,
                                        display_name=allergy_name,
                                        allergy_type=AllergyType.ALLERGY,  # Default to ALLERGY
                                        categories=[allergy_category],
                                        recorder_id=UUID(current_doctor.id) if isinstance(current_doctor.id, str) else current_doctor.id,
                                        criticality=None,  # Unknown by default
                                        encounter_id=encounter_uuid
                                    )
                                    created_count += 1
                                    print(f"✓ Created new allergy record: '{allergy_name}' (id: {created_allergy.id}) for patient {payload.patient_id}")
                                except Exception as allergy_error:
                                    print(f"Warning: Failed to create allergy '{allergy_name}': {allergy_error}")
                                    import traceback
                                    traceback.print_exc()
                                    # Rollback the failed transaction to clean up the session
                                    try:
                                        db.rollback()
                                    except:
                                        pass
                                    continue
                            
                            if created_count > 0:
                                print(f"Created {created_count} new allergy records for patient {payload.patient_id}")
            except Exception as allergy_save_error:
                # Log error but don't fail report creation
                # The clinical note is already committed, so this won't affect it
                print(f"ERROR: Failed to save allergies from report: {allergy_save_error}")
                import traceback
                traceback.print_exc()
                # Rollback any failed transaction to clean up the session
                try:
                    db.rollback()
                except:
                    pass
            else:
                # If no exception occurred but no allergies were processed, log it
                print(f"DEBUG: Allergy extraction completed - no allergies found or processed")
            
            # Debug: Verify it was saved
            print(f"DEBUG: ClinicalNote saved with id={clinical_note.id}, fhir_document_reference_id={clinical_note.fhir_document_reference_id}, content length={len(clinical_note.content) if clinical_note.content else 0}")
            if clinical_note.content:
                try:
                    test_parse = json.loads(clinical_note.content) if isinstance(clinical_note.content, str) else clinical_note.content
                    print(f"DEBUG: Content can be parsed, has keys: {list(test_parse.keys()) if isinstance(test_parse, dict) else 'Not a dict'}")
                except Exception as e:
                    print(f"DEBUG: Content parse test failed: {e}")

        # 6. Send notification to patient via messaging service
        try:
            # Ensure session is clean before querying patient
            try:
                db.rollback()  # Rollback any pending transaction to ensure clean state
            except:
                pass
            
            messaging_service = MessagingService(db)
            # Convert patient_id to user_id for messaging
            from app.common.models.patient import Patient
            from app.common.models.user import User
            patient = db.query(Patient).filter(Patient.patient_id == payload.patient_id).first()
            if patient and patient.user_id:
                await messaging_service.send_system_message(
                    recipient_id=patient.user_id,
                    subject="Report Created",
                    content=f"Your {payload.specialty} report has been created and is available for review.",
                    message_type="report_created"
                )
        except Exception as msg_error:
            # Log error but don't fail report creation if messaging fails
            print(f"Warning: Failed to send message notification: {msg_error}")
            import traceback
            traceback.print_exc()

        # Get patient info for response
        from app.common.models.patient import Patient
        from app.common.models.user import User as UserModel
        # Ensure session is clean before querying patient
        try:
            db.rollback()  # Rollback any pending transaction to ensure clean state
        except:
            pass
        
        patient = db.query(Patient).filter(Patient.patient_id == payload.patient_id).first()
        patient_name = "Unknown Patient"
        if patient:
            if hasattr(patient, 'user') and patient.user:
                patient_name = f"{patient.user.first_name} {patient.user.last_name}".strip()
            elif patient.user_id:
                # If user relationship isn't loaded, query separately
                patient_user = db.query(UserModel).filter(UserModel.id == patient.user_id).first()
                if patient_user:
                    patient_name = f"{patient_user.first_name} {patient_user.last_name}".strip()
        
        # Get report_type and title from payload (with defaults)
        report_type = getattr(payload, 'report_type', 'consultation')
        if isinstance(report_type, str):
            pass  # Already a string
        else:
            report_type = report_type.value if hasattr(report_type, 'value') else str(report_type)
        
        title = getattr(payload, 'title', None) or f"{payload.specialty} Report - {payload.code}"
        
        # Extract doc_type from payload.data if present (for specialty-specific reports like ophthalmology)
        doc_type = ""
        if isinstance(payload.data, dict):
            doc_type = payload.data.get("doc_type", "")
            print(f"DEBUG: create_report - Extracted doc_type from payload.data: '{doc_type}'")
            print(f"DEBUG: create_report - payload.data keys: {list(payload.data.keys()) if isinstance(payload.data, dict) else 'Not a dict'}")
        else:
            print(f"DEBUG: create_report - payload.data is not a dict: {type(payload.data)}")
        
        # Determine specialty from doc_type if available (more specific than payload.specialty)
        final_specialty = payload.specialty
        print(f"DEBUG: create_report - Initial specialty from payload: '{final_specialty}'")
        if doc_type:
            if doc_type.startswith("oph."):
                final_specialty = "ophthalmology"
                print(f"DEBUG: create_report - Detected ophthalmology from doc_type: '{doc_type}'")
            elif doc_type.startswith("neu."):
                final_specialty = "neurology"
            elif doc_type.startswith("uro."):
                final_specialty = "urology"
            elif doc_type.startswith("onc."):
                final_specialty = "oncology"
            elif doc_type.startswith("trauma."):
                final_specialty = "surgery"
        
        # Normalize specialty to match what frontend expects
        specialty_for_response = final_specialty if isinstance(final_specialty, str) else final_specialty.value if hasattr(final_specialty, 'value') else str(final_specialty)
        # Capitalize first letter for display (e.g., "ophthalmology" -> "Ophthalmology")
        # This matches what frontend expects in ViewReport.jsx
        if specialty_for_response:
            # Convert to title case (capitalize first letter of each word)
            specialty_for_response = specialty_for_response.title()
            # Special handling for common specialties
            specialty_map = {
                "Ophthalmology": "Ophthalmology",
                "Neurology": "Neurology",
                "Urology": "Urology",
                "Oncology": "Oncology",
                "Surgery": "Surgery",
                "General Medicine": "General Medicine",
            }
            specialty_for_response = specialty_map.get(specialty_for_response, specialty_for_response)
        
        # Ensure both id and fhir_document_reference_id are set to the DocumentReference ID
        # This is what the frontend will use to navigate and what the backend uses to find ClinicalNote
        document_reference_id = doc_ref_result['id']
        
        response_data = ReportSummary(
            id=document_reference_id,  # Use DocumentReference ID as primary ID
            bundle_id=f"bundle-{uuid4().hex[:8]}",
            date=datetime.now(timezone.utc).isoformat(),
            doctor={"name": doctor_full_name, "specialty": specialty_for_response},
            patient={"id": payload.patient_id, "name": patient_name},
            specialty=specialty_for_response,
            code=payload.code,
            title=title,
            status="final",  # Default to final for completed reports
            report_type=report_type,
            clinic_id=payload.clinic_id,
            doctor_id=current_doctor.id,
            fhir_document_reference_id=document_reference_id,  # Also set explicitly for frontend compatibility
            fhir_binary_id=binary_result['id'],
            fhir_diagnostic_report_id=diag_result['id'] if diag_result else None,
            doc_type=doc_type if doc_type else None
        )
        
        print(f"DEBUG: create_report - Returning response:")
        print(f"  id={response_data.id}")
        print(f"  fhir_document_reference_id={response_data.fhir_document_reference_id}")
        print(f"  specialty='{specialty_for_response}'")
        print(f"  doc_type='{doc_type}'")
        print(f"  ClinicalNote should be saved with fhir_document_reference_id={document_reference_id}")
        
        return SuccessResponse(
            data=response_data,
            message="Report created successfully with FHIR resources"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Report Creation Failed",
            status=500,
            detail=f"Failed to create report: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.post("/vitals", response_model=SuccessResponse[Dict[str, str]], status_code=status.HTTP_201_CREATED)
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("write", "observation", "vitals")
async def create_vitals_observation(
    request: Request,
    payload: CreateVitalsRequest = Body(...),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Create FHIR Observation resources for vital signs."""
    try:
        # Validate clinic and patient access
        if not rbac_service.can_access_clinic(current_doctor.id, payload.clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        if not rbac_service.can_access_patient(current_doctor.id, payload.patient_id, payload.clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Patient Access Denied",
                status=403,
                detail="Doctor does not have access to this patient",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        created_observations = {}
        
        # Create FHIR Observation for each vital sign
        vitals_mapping = {
            "blood_pressure": ("85354-9", "Blood pressure panel"),
            "temperature": ("8310-5", "Body temperature"),
            "heart_rate": ("8867-4", "Heart rate"),
            "respiratory_rate": ("9279-1", "Respiratory rate"),
            "oxygen_saturation": ("2708-6", "Oxygen saturation"),
            "weight": ("29463-7", "Body weight"),
            "height": ("8302-2", "Body height"),
            "bmi": ("39156-5", "Body mass index")
        }

        for vital_name, (loinc_code, display_name) in vitals_mapping.items():
            vital_value = getattr(payload.vitals, vital_name)
            if vital_value:
                observation = {
                    "resourceType": "Observation",
                    "id": f"obs-{vital_name}-{uuid4().hex[:8]}",
                    "status": "final",
                    "category": [{
                        "coding": [{
                            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                            "code": "vital-signs",
                            "display": "Vital Signs"
                        }]
                    }],
                    "code": {
                        "coding": [{
                            "system": "http://loinc.org",
                            "code": loinc_code,
                            "display": display_name
                        }]
                    },
                    "subject": {
                        "reference": f"Patient/{payload.patient_id}"
                    },
                    "encounter": {
                        "reference": f"Encounter/{payload.encounter_id}" if payload.encounter_id else "Encounter/unknown"
                    },
                    "effectiveDateTime": datetime.now(timezone.utc).isoformat(),
                    "issued": datetime.now(timezone.utc).isoformat(),
                    "performer": [{
                        "reference": f"Practitioner/{current_doctor.id}"
                    }],
                    "valueQuantity": {
                        "value": extract_numeric_value(vital_value),
                        "unit": extract_unit(vital_value),
                        "system": "http://unitsofmeasure.org",
                        "code": get_unit_code(vital_name)
                    }
                }

                result = await fhir_client._make_request("POST", "Observation", data=observation)
                created_observations[vital_name] = result['id']

        return SuccessResponse(
            data=created_observations,
            message=f"Created {len(created_observations)} vital sign observations"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Vitals Creation Failed",
            status=500,
            detail=f"Failed to create vitals observations: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("", response_model=PaginatedResponse[ReportSummary])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "document_reference", "reports_list")
async def list_reports(
    request: Request,
    patient_id: Optional[str] = Query(None, description="Filter by patient ID"),
    clinic_id: str = Query(..., description="Clinic ID for scoping"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """List reports with pagination and clinic scoping."""
    try:
        # Get AuthenticatedUser object for RBAC
        from app.common.models.user import User
        from app.common.auth.auth_service import AuthenticatedUser, AuthService
        
        user_obj = db.query(User).filter(User.id == current_doctor.id).first()
        if not user_obj:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_permissions = AuthService.get_user_permissions(user_obj.role) if user_obj.role else []
        authenticated_user = AuthenticatedUser(
            user=user_obj,
            permissions=user_permissions,
            clinic_id=getattr(user_obj, 'clinic_id', None)
        )
        doctor_full_name = f"{user_obj.first_name} {user_obj.last_name}".strip() if user_obj else current_doctor.email
        
        # Validate clinic access
        if not rbac_service.can_access_clinic(authenticated_user, clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Build search parameters
        search_params = {
            "author": f"Practitioner/{current_doctor.id}",
            "_count": size,
            "_offset": (page - 1) * size
        }
        
        if patient_id:
            # Validate patient access
            if not rbac_service.can_access_patient(authenticated_user, patient_id, clinic_id):
                problem = create_problem_detail(
                    error_type=ErrorType.AUTHORIZATION_ERROR,
                    title="Patient Access Denied",
                    status=403,
                    detail="Doctor does not have access to this patient",
                    trace_id=get_trace_id()
                )
                raise HTTPException(status_code=403, detail=problem.dict())
            search_params["subject"] = f"Patient/{patient_id}"

        # Search FHIR DocumentReferences
        result = await fhir_client._make_request("GET", "DocumentReference", params=search_params)
        
        reports = []
        for entry in result.get("entry", []):
            doc_ref = entry["resource"]
            reports.append(ReportSummary(
                id=doc_ref["id"],
                bundle_id=f"bundle-{doc_ref['id']}",
                date=doc_ref.get("context", {}).get("period", {}).get("start", ""),
                doctor={"name": doctor_full_name, "specialty": "General Medicine"},
                fhir_document_reference_id=doc_ref["id"]
            ))

        total = result.get("total", len(reports))
        
        return create_paginated_response(
            data=reports,
            page=page,
            size=size,
            total=total
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Reports Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve reports: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/{report_id}", response_model=SuccessResponse[Dict[str, Any]])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "document_reference", "report_detail")
async def get_report(
    request: Request,
    report_id: str = Path(..., description="DocumentReference ID"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get detailed report with FHIR resources."""
    try:
        # Get AuthenticatedUser object for RBAC
        from app.common.models.user import User
        from app.common.auth.auth_service import AuthenticatedUser, AuthService
        
        user_obj = db.query(User).filter(User.id == current_doctor.id).first()
        if not user_obj:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_permissions = AuthService.get_user_permissions(user_obj.role) if user_obj.role else []
        authenticated_user = AuthenticatedUser(
            user=user_obj,
            permissions=user_permissions,
            clinic_id=getattr(user_obj, 'clinic_id', None)
        )
        doctor_full_name = f"{user_obj.first_name} {user_obj.last_name}".strip() if user_obj else current_doctor.email
        
        # Get DocumentReference
        doc_ref = await fhir_client._make_request("GET", f"DocumentReference/{report_id}")
        
        # Validate access to the patient
        patient_ref = doc_ref.get("subject", {}).get("reference", "")
        patient_id = patient_ref.replace("Patient/", "")
        
        # Get clinic from context or default
        clinic_id = doc_ref.get("context", {}).get("encounter", [{}])[0].get("reference", "").split("/")[-1] if doc_ref.get("context", {}).get("encounter") else "default"
        
        if not rbac_service.can_access_patient(authenticated_user, patient_id, clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Patient Access Denied",
                status=403,
                detail="Doctor does not have access to this patient's report",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Get associated Binary resource if available
        binary_data = None
        if doc_ref.get("content") and doc_ref["content"][0].get("attachment", {}).get("url"):
            binary_url = doc_ref["content"][0]["attachment"]["url"]
            binary_id = binary_url.split("/")[-1]
            try:
                binary_resource = await fhir_client._make_request("GET", f"Binary/{binary_id}")
                binary_data = base64.b64decode(binary_resource.get("data", ""))
            except:
                binary_data = None

        return SuccessResponse(
            data={
                "document_reference": doc_ref,
                "binary_data": binary_data,
                "patient_id": patient_id,
                "doctor_name": doctor_full_name
            },
            message="Report retrieved successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Report Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve report: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.options("/upload-note")
async def upload_note_options(request: Request):
    """Handle CORS preflight for upload-note endpoint"""
    from fastapi.responses import Response
    origin = request.headers.get("origin")
    headers = {}
    if origin and (origin in [
        "http://localhost:3000", "http://localhost:5173", "http://localhost:5174",
        "http://127.0.0.1:3000", "http://127.0.0.1:5173",
        "https://zamez.netlify.app", "https://fiattib.web.app",
        "https://fiattib.firebaseapp.com", "https://fiattib.uz", "https://www.fiattib.uz",
    ] or origin.endswith(".netlify.app")):
        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
    return Response(status_code=204, headers=headers)


@router.post("/upload-note", response_model=SuccessResponse[Dict[str, Any]], status_code=status.HTTP_201_CREATED)
@audit_pii_access("write", "document", "note_upload")
async def upload_note_pdf(
    request: Request,
    file: UploadFile = File(...),
    patient_id: str = Form(...),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """
    Upload a PDF medical note, extract data, translate to English, map to FHIR, and store using hybrid storage.
    
    Pipeline:
    1. Extract structured data from PDF using extractor.py
    2. Translate and map to FHIR Bundle using translate_to_fhir.py
    3. Process FHIR Bundle using fhir_processor.py (raw storage + relational sync + clinical sync + translation metadata)
    """
    try:
        # Get AuthenticatedUser object for RBAC
        from app.common.models.user import User
        from app.common.auth.auth_service import AuthenticatedUser, AuthService
        
        user_obj = db.query(User).filter(User.id == current_doctor.id).first()
        if not user_obj:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_permissions = AuthService.get_user_permissions(user_obj.role) if user_obj.role else []
        authenticated_user = AuthenticatedUser(
            user=user_obj,
            permissions=user_permissions,
            clinic_id=getattr(user_obj, 'clinic_id', None)
        )
        
        # Validate file type (PDF only for now)
        if file.content_type != "application/pdf":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {file.content_type}. Only PDF files are supported."
            )
        
        # Validate file size (max 10MB)
        file_content = await file.read()
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Maximum size: 10MB"
            )
        
        # Validate patient access
        if not rbac_service.can_access_patient(authenticated_user, patient_id, None):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Patient Access Denied",
                status=403,
                detail="Doctor does not have access to this patient",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())
        
        # Log with ASCII-safe filename to avoid UnicodeEncodeError on Windows console
        safe_name = (file.filename or "upload").encode("ascii", "replace").decode("ascii")
        logger.info("Processing PDF note %s for patient %s", safe_name, patient_id)
        
        # Step 1: Extract structured data from PDF
        # Import extractor classes
        import sys
        from pathlib import Path as PathLib
        
        # Calculate scripts path: from app/portals/doctor/routes/reports_enhanced.py
        # Go up: routes -> doctor -> portals -> app -> backend -> scripts
        current_file = PathLib(__file__).resolve()
        scripts_path = current_file.parent.parent.parent.parent.parent / "scripts"
        
        if not scripts_path.exists():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Scripts directory not found at: {scripts_path}"
            )
        
        sys.path.insert(0, str(scripts_path))
        
        try:
            from extractor import MedicalDocumentExtractor
        except ImportError as e:
            logger.error(f"Failed to import MedicalDocumentExtractor: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to import extractor module. Make sure unstructured library is installed: {str(e)}"
            )
        
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        try:
            # Extract data from PDF: use 'fast' first so text-based PDFs work without Tesseract
            extractor = MedicalDocumentExtractor(
                ocr_languages=['rus', 'uzb', 'uzb_cyrl'],
                strategy='fast'
            )
            try:
                extracted_data = extractor.process_document(
                    file_path=PathLib(temp_file_path),
                    infer_table_structure=True
                )
            except Exception as extract_err:
                err_str = str(extract_err)
                err_type = type(extract_err).__name__
                if "tesseract" in err_str.lower() or "TesseractNotFoundError" in err_type:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            "This PDF appears to be a scanned image and requires OCR. "
                            "Tesseract OCR is not installed or not in your PATH. "
                            "Options: (1) Install Tesseract from https://github.com/UB-Mannheim/tesseract/wiki "
                            "and add it to PATH, or (2) Use a PDF with selectable/embedded text."
                        )
                    ) from extract_err
                raise

            total_elements = extracted_data.get('total_elements', 0)
            if total_elements == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "No text could be extracted from this PDF. "
                        "It may be a scanned image. Install Tesseract OCR for scanned PDFs, "
                        "or use a PDF that has selectable text."
                    )
                )
            logger.info("Extracted %s elements from PDF", total_elements)
            
            # Step 2: Translate and map to FHIR Bundle
            try:
                from translate_to_fhir import TranslateToFHIRMapper
            except ImportError as e:
                logger.error(f"Failed to import TranslateToFHIRMapper: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to import translate_to_fhir module: {str(e)}"
                )
            
            try:
                # Check for OpenAI API key (os is imported at module top)
                if not os.getenv("OPENAI_API_KEY"):
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="OPENAI_API_KEY environment variable is not set. Please configure it in your .env file."
                    )
                
                mapper = TranslateToFHIRMapper()
                fhir_bundle = mapper.translate_and_map_to_fhir(extracted_data)
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Failed to translate and map to FHIR: {e}", exc_info=True)
                error_msg = str(e)
                if "OPENAI_API_KEY" in error_msg or "api key" in error_msg.lower():
                    error_msg = "OpenAI API key is missing or invalid. Please check your OPENAI_API_KEY environment variable."
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to translate and map to FHIR: {error_msg}"
                )
            
            logger.info(f"Created FHIR Bundle with {len(fhir_bundle.get('entry', []))} resources")
            
            # Step 3: Process FHIR Bundle using fhir_processor
            # Update patient references in bundle to use the actual patient_id
            for entry in fhir_bundle.get('entry', []):
                resource = entry.get('resource', {})
                if resource.get('resourceType') == 'Patient':
                    # Update Patient resource ID to match our patient_id
                    resource['id'] = patient_id
                    entry['fullUrl'] = f"urn:uuid:{patient_id}"
                elif 'subject' in resource:
                    # Update subject reference to use our patient_id
                    if isinstance(resource['subject'], dict):
                        resource['subject']['reference'] = f"urn:uuid:{patient_id}"
            
            # Process the bundle
            processing_results = fhir_processor.process_resource(fhir_bundle)
            
            logger.info(f"Processed FHIR Bundle: {len(processing_results.get('raw_storage', []))} raw resources, "
                       f"{len(processing_results.get('relational_sync', []))} relational syncs, "
                       f"{len(processing_results.get('clinical_sync', []))} clinical syncs")
            
            # Step 4: Create ClinicalNote record so it appears in the reports list
            from app.common.models.doctor import ClinicalNote, Doctor
            from uuid import UUID
            
            # Get doctor profile
            doctor_profile = db.query(Doctor).filter(Doctor.user_id == current_doctor.id).first()
            if not doctor_profile:
                logger.warning(f"Doctor profile not found for user {current_doctor.id}, skipping ClinicalNote creation")
            else:
                # Use the structured JSON from OpenAI FHIR bundle for SOAP (chief complaint, HPI, assessment, plan)
                import re
                def _strip_div(div: Any) -> str:
                    if not div:
                        return ""
                    s = str(div).strip()
                    if not s:
                        return ""
                    # Remove HTML tags and decode common entities
                    s = re.sub(r"<[^>]+>", " ", s)
                    s = re.sub(r"&nbsp;", " ", s)
                    s = re.sub(r"&amp;", "&", s)
                    s = re.sub(r"&lt;", "<", s)
                    s = re.sub(r"&gt;", ">", s)
                    s = re.sub(r"\s+", " ", s).strip()
                    return s

                subjective_parts = []
                objective_parts = []
                assessment_parts = []
                plan_parts = []

                # 1) Extract chief complaint / HPI from Composition or Encounter in the bundle (structured output)
                for entry in fhir_bundle.get('entry', []):
                    resource = entry.get('resource', {})
                    rtype = resource.get('resourceType')
                    if rtype == 'Composition':
                        for section in resource.get('section', []):
                            title = (section.get('title') or '').lower()
                            if any(x in title for x in ('chief complaint', 'reason for visit', 'present illness', 'history of present', 'complaints', '\u0436\u0430\u043b\u043e\u0431\u044b', '\u0430\u043d\u0430\u043c\u043d\u0435\u0437', 'shikoyat', 'anamnez')):
                                text_block = section.get('text', {})
                                if isinstance(text_block, dict) and text_block.get('div'):
                                    subjective_parts.append(_strip_div(text_block.get('div')))
                                elif isinstance(section.get('text'), str):
                                    subjective_parts.append(section.get('text', '').strip())
                    elif rtype == 'Encounter':
                        reason = resource.get('reasonCode')
                        reasons = [reason] if isinstance(reason, dict) else (reason if isinstance(reason, list) else [])
                        for r in reasons:
                            if isinstance(r, dict) and r.get('text'):
                                subjective_parts.append(r.get('text', '').strip())
                            for c in (r.get('coding') or []) if isinstance(r, dict) else []:
                                if isinstance(c, dict) and c.get('display'):
                                    subjective_parts.append(c.get('display', '').strip())
                                    break

                # 2) Extract from each resource type, using Narrative (text.div) from structured JSON when present
                for entry in fhir_bundle.get('entry', []):
                    resource = entry.get('resource', {})
                    if resource.get('resourceType') == 'Condition':
                        div_text = _strip_div(resource.get('text', {}).get('div') if isinstance(resource.get('text'), dict) else None)
                        if div_text:
                            assessment_parts.append(div_text)
                        else:
                            code_text = resource.get('code', {}).get('text', '')
                            if code_text:
                                assessment_parts.append(f"Condition: {code_text}")
                        clinical_status = resource.get('clinicalStatus', {}).get('coding', [{}])[0].get('display', '')
                        if clinical_status:
                            assessment_parts.append(f"Status: {clinical_status}")

                for entry in fhir_bundle.get('entry', []):
                    resource = entry.get('resource', {})
                    if resource.get('resourceType') == 'Observation':
                        div_text = _strip_div(resource.get('text', {}).get('div') if isinstance(resource.get('text'), dict) else None)
                        if div_text:
                            objective_parts.append(div_text)
                        else:
                            code_text = resource.get('code', {}).get('text', '')
                            value = resource.get('valueString') or resource.get('valueQuantity', {}).get('value', '')
                            unit = resource.get('valueQuantity', {}).get('unit', '')
                            if code_text and value:
                                obs_text = f"{code_text}: {value}"
                                if unit:
                                    obs_text += f" {unit}"
                                objective_parts.append(obs_text)

                for entry in fhir_bundle.get('entry', []):
                    resource = entry.get('resource', {})
                    if resource.get('resourceType') == 'Procedure':
                        div_text = _strip_div(resource.get('text', {}).get('div') if isinstance(resource.get('text'), dict) else None)
                        if div_text:
                            plan_parts.append(div_text)
                        else:
                            code_text = resource.get('code', {}).get('text', '')
                            if code_text:
                                plan_parts.append(f"Procedure: {code_text}")

                for entry in fhir_bundle.get('entry', []):
                    resource = entry.get('resource', {})
                    if resource.get('resourceType') == 'MedicationAdministration':
                        div_text = _strip_div(resource.get('text', {}).get('div') if isinstance(resource.get('text'), dict) else None)
                        if div_text:
                            plan_parts.append(div_text)
                        else:
                            medication = resource.get('medicationCodeableConcept', {}).get('text', '')
                            if medication:
                                plan_parts.append(f"Medication: {medication}")
                
                # Build full narrative from extracted PDF text so view report can show it
                content_narrative = f"Medical note extracted from PDF: {file.filename}"
                elements = extracted_data.get("elements", [])
                if isinstance(elements, list) and elements:
                    parts = []
                    for elem in elements:
                        if isinstance(elem, dict) and elem.get("text"):
                            parts.append(elem["text"].strip())
                    if parts:
                        content_narrative = "\n\n".join(parts)
                
                # Derive subjective (chief complaint / HPI) from narrative when FHIR has no dedicated section.
                # Avoid using letterhead (clinic name/address) as chief complaint: prefer explicit section or first substantive paragraph.
                def _paragraph_looks_like_letterhead(para: str) -> bool:
                    if not para or len(para) < 30:
                        return True
                    p = para.strip().lower()
                    # Address-like: ends with digits, or contains common address/header tokens
                    if p.endswith(("str.", "ul.", "street", "ave.", "blvd.")):
                        return True
                    for token in ("\u0443\u043b.", "ul.", "str.", "\u0433.", "city", "address", "clinic", "\u043a\u043b\u0438\u043d\u0438\u043a", "medical center"):
                        if token in p and len(p) < 120:
                            return True
                    # Too many digits/dots (phone, index, date)
                    digit_ratio = sum(c.isdigit() or c in ".,/" for c in p) / max(len(p), 1)
                    if digit_ratio > 0.35:
                        return True
                    return False

                def _find_subjective_in_narrative(text: str) -> Optional[str]:
                    if not text or not text.strip():
                        return None
                    import re
                    # Look for explicit chief complaint / HPI section (EN/RU/UZ)
                    patterns = [
                        r"(?:chief\s+complaint|reason\s+for\s+visit|present\s+illness|history\s+of\s+present\s+illness|complaints?)\s*[:\u00a0]\s*(.+?)(?=\n\n|\n[A-Z\u0410-\u042f]|\Z)",
                        r"(\u0416\u0430\u043b\u043e\u0431\u044b|\u0410\u043d\u0430\u043c\u043d\u0435\u0437|\u041f\u0440\u0438\u0447\u0438\u043d\u0430)\s*[:\u00a0]\s*(.+?)(?=\n\n|\n[\u0410-\u042f]|\Z)",
                        r"(shikoyat|tashxis|anamnez)\s*[:\u00a0]\s*(.+?)(?=\n\n|\Z)",
                    ]
                    for pat in patterns:
                        m = re.search(pat, text, re.IGNORECASE | re.DOTALL)
                        if m:
                            block = m.group(1).strip()
                            if len(block) > 20:
                                return (block[:500] + "\u2026") if len(block) > 500 else block
                    # Otherwise use first paragraph that does not look like letterhead
                    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
                    for para in paras:
                        if not _paragraph_looks_like_letterhead(para) and len(para) >= 40:
                            return (para[:500] + "\u2026") if len(para) > 500 else para
                    # Fallback: first paragraph longer than 100 chars (skip one-line headers)
                    for para in paras:
                        if len(para) > 100:
                            return (para[:500] + "\u2026") if len(para) > 500 else para
                    return None

                subjective_text = None
                if subjective_parts:
                    subjective_text = "\n".join(subjective_parts)
                elif content_narrative and content_narrative != f"Medical note extracted from PDF: {file.filename}":
                    subjective_text = _find_subjective_in_narrative(content_narrative)
                    if not subjective_text:
                        subjective_text = content_narrative[:500].strip() + ("\u2026" if len(content_narrative) > 500 else "")
                if not subjective_text:
                    subjective_text = f"Uploaded from PDF: {file.filename}"
                
                # Get note date from bundle timestamp or use current date
                note_date = datetime.now(timezone.utc)
                if fhir_bundle.get('timestamp'):
                    try:
                        # Try built-in fromisoformat first (Python 3.7+)
                        note_date = datetime.fromisoformat(fhir_bundle['timestamp'].replace('Z', '+00:00'))
                    except (ValueError, AttributeError):
                        try:
                            # Fallback to dateutil parser
                            from dateutil import parser
                            note_date = parser.isoparse(fhir_bundle['timestamp'])
                        except:
                            pass
                
                # Create ClinicalNote
                clinical_note = ClinicalNote(
                    patient_id=UUID(patient_id),
                    doctor_id=doctor_profile.id,
                    note_type="consultation",  # or "progress" based on your needs
                    note_date=note_date,
                    subjective=subjective_text,
                    objective="\n".join(objective_parts) if objective_parts else None,
                    assessment="\n".join(assessment_parts) if assessment_parts else None,
                    plan="\n".join(plan_parts) if plan_parts else None,
                    content=content_narrative,
                    is_draft=False,
                    created_by=current_doctor.id,
                    fhir_document_reference_id=fhir_bundle.get('id')  # Link to the bundle
                )
                
                db.add(clinical_note)
                db.commit()
                logger.info(f"Created ClinicalNote {clinical_note.id} for patient {patient_id}")
            
            # Helper function to convert datetime objects to ISO format strings
            def serialize_datetime(obj):
                """Recursively convert datetime and date objects to ISO format strings."""
                if isinstance(obj, datetime):
                    return obj.isoformat()
                elif isinstance(obj, date):
                    return obj.isoformat()
                elif isinstance(obj, dict):
                    return {k: serialize_datetime(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [serialize_datetime(item) for item in obj]
                elif isinstance(obj, (int, float, str, bool, type(None))):
                    return obj
                else:
                    # For other types, convert to string
                    return str(obj)
            
            # Serialize processing_results to ensure all datetime objects are converted
            serialized_processing_results = serialize_datetime(processing_results)
            
            from fastapi.responses import JSONResponse
            origin = request.headers.get("origin")
            response_data = SuccessResponse(
                data={
                    "patient_id": patient_id,
                    "filename": file.filename,
                    "extraction_summary": {
                        "total_elements": extracted_data.get('total_elements', 0),
                        "valid_elements": extracted_data.get('valid_elements', 0)
                    },
                    "fhir_processing": {
                        "bundle_id": fhir_bundle.get('id'),
                        "resources_count": len(fhir_bundle.get('entry', [])),
                        "raw_storage_count": len(processing_results.get('raw_storage', [])),
                        "relational_sync_count": len(processing_results.get('relational_sync', [])),
                        "clinical_sync_count": len(processing_results.get('clinical_sync', [])),
                        "translation_metadata_count": len(processing_results.get('translation_metadata', []))
                    },
                    "processing_results": serialized_processing_results
                },
                message="PDF note uploaded, extracted, translated, and processed successfully"
            )
            # Add CORS headers explicitly
            headers = {}
            if origin and (origin in [
                "http://localhost:3000", "http://localhost:5173", "http://localhost:5174",
                "http://127.0.0.1:3000", "http://127.0.0.1:5173",
                "https://zamez.netlify.app", "https://fiattib.web.app",
                "https://fiattib.firebaseapp.com", "https://fiattib.uz", "https://www.fiattib.uz"
            ] or origin.endswith(".netlify.app")):
                headers["Access-Control-Allow-Origin"] = origin
                headers["Access-Control-Allow-Credentials"] = "true"
            
            # Serialize the entire response to handle any datetime objects
            response_dict = response_data.dict()
            serialized_response = serialize_datetime(response_dict)
            
            return JSONResponse(
                content=serialized_response,
                status_code=status.HTTP_201_CREATED,
                headers=headers
            )
            
        finally:
            # Clean up temporary file
            try:
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
            except Exception as e:
                logger.warning(f"Failed to delete temporary file {temp_file_path}: {e}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing PDF note upload: {str(e)}", exc_info=True)
        import traceback
        error_traceback = traceback.format_exc()
        logger.error(f"Full traceback:\n{error_traceback}")
        
        # Extract more detailed error information
        error_detail = str(e)
        if hasattr(e, '__cause__') and e.__cause__:
            error_detail += f" (Caused by: {str(e.__cause__)})"
        
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="PDF Note Processing Failed",
            status=500,
            detail=f"Failed to process PDF note: {error_detail}",
            trace_id=get_trace_id()
        )
        
        # Include CORS headers in error response
        origin = request.headers.get("origin")
        headers = {}
        if origin and (origin in [
            "http://localhost:3000", "http://localhost:5173", "http://localhost:5174",
            "http://127.0.0.1:3000", "http://127.0.0.1:5173",
            "https://zamez.netlify.app", "https://fiattib.web.app",
            "https://fiattib.firebaseapp.com", "https://fiattib.uz", "https://www.fiattib.uz"
        ] or origin.endswith(".netlify.app")):
            headers["Access-Control-Allow-Origin"] = origin
            headers["Access-Control-Allow-Credentials"] = "true"
        
        raise HTTPException(status_code=500, detail=problem.dict(), headers=headers)


# ──────────────────────────────────────────────────────────────────────────────
# Medical Reports Router (for frontend compatibility)
# ──────────────────────────────────────────────────────────────────────────────

@medical_reports_router.get("/appointment/{report_id}", response_model=SuccessResponse[Dict[str, Any]])
@audit_pii_access("read", "document_reference", "report_detail")
async def get_report_by_appointment(
    request: Request,
    report_id: str = Path(..., description="Report ID (DocumentReference ID)"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get report by appointment ID (for frontend compatibility)."""
    try:
        # Get AuthenticatedUser object for RBAC
        from app.common.models.user import User
        from app.common.auth.auth_service import AuthenticatedUser, AuthService
        
        user_obj = db.query(User).filter(User.id == current_doctor.id).first()
        if not user_obj:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_permissions = AuthService.get_user_permissions(user_obj.role) if user_obj.role else []
        authenticated_user = AuthenticatedUser(
            user=user_obj,
            permissions=user_permissions,
            clinic_id=getattr(user_obj, 'clinic_id', None)
        )
        doctor_full_name = f"{user_obj.first_name} {user_obj.last_name}".strip() if user_obj else current_doctor.email
        
        # Get DocumentReference
        doc_ref_result = await fhir_client._make_request("GET", f"DocumentReference/{report_id}")
        
        # Handle case where _make_request returns a string (JSON) or dict
        doc_ref = {}
        if isinstance(doc_ref_result, str):
            try:
                # Use module-level json import (already imported at top)
                parsed = json.loads(doc_ref_result)
                # If parsed is a dict, use it directly; if it has "data", unwrap it
                if isinstance(parsed, dict):
                    doc_ref = parsed.get("data", parsed) if "data" in parsed else parsed
                else:
                    doc_ref = {}
            except (json.JSONDecodeError, ValueError) as e:
                raise HTTPException(status_code=500, detail=f"Invalid DocumentReference format returned from FHIR server: {str(e)}")
        elif isinstance(doc_ref_result, dict):
            # Check if it's wrapped in a "data" key
            doc_ref = doc_ref_result.get("data", doc_ref_result) if "data" in doc_ref_result else doc_ref_result
        elif hasattr(doc_ref_result, 'get') and callable(getattr(doc_ref_result, 'get')):
            # It's a dict-like object
            doc_ref = dict(doc_ref_result) if not isinstance(doc_ref_result, dict) else doc_ref_result
        else:
            # Fallback to empty dict
            doc_ref = {}
        
        # Ensure doc_ref is a dict
        if not isinstance(doc_ref, dict):
            raise HTTPException(status_code=500, detail=f"Expected DocumentReference to be a dict, got {type(doc_ref)} (value: {str(doc_ref)[:100]})")
        
        # Validate access to the patient
        subject = doc_ref.get("subject", {})
        if isinstance(subject, dict):
            patient_ref = subject.get("reference", "")
        elif isinstance(subject, str):
            patient_ref = subject
        else:
            patient_ref = ""
        patient_id = patient_ref.replace("Patient/", "") if patient_ref else ""
        
        # Get clinic from context or default
        context = doc_ref.get("context", {})
        if isinstance(context, dict):
            encounter = context.get("encounter", [])
            if encounter and isinstance(encounter, list) and len(encounter) > 0:
                encounter_ref = encounter[0].get("reference", "") if isinstance(encounter[0], dict) else str(encounter[0]) if encounter[0] else ""
                clinic_id = encounter_ref.split("/")[-1] if encounter_ref else "default"
            else:
                clinic_id = "default"
        else:
            clinic_id = "default"
        
        if not rbac_service.can_access_patient(authenticated_user, patient_id, clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Patient Access Denied",
                status=403,
                detail="Doctor does not have access to this patient's report",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())
        
        # Get associated Binary resource if available
        binary_data = None
        content = doc_ref.get("content", [])
        if content and isinstance(content, list) and len(content) > 0:
            attachment = content[0].get("attachment", {}) if isinstance(content[0], dict) else {}
            if attachment and isinstance(attachment, dict):
                binary_url = attachment.get("url", "")
                if binary_url:
                    binary_id = binary_url.split("/")[-1]
                    try:
                        binary_resource_result = await fhir_client._make_request("GET", f"Binary/{binary_id}")
                        binary_resource = binary_resource_result if isinstance(binary_resource_result, dict) else {}
                        if isinstance(binary_resource, dict) and binary_resource.get("data"):
                            binary_data = base64.b64decode(binary_resource.get("data", ""))
                    except Exception as e:
                        print(f"Warning: Failed to get Binary resource: {e}")
                        binary_data = None
        
        # Try to get report data from ClinicalNote table (where we saved it)
        from app.common.models.doctor import ClinicalNote
        from uuid import UUID as UUIDType
        
        # Try multiple ways to find the ClinicalNote
        clinical_note = None
        
        # Method 1: Exact match by fhir_document_reference_id
        clinical_note = db.query(ClinicalNote).filter(
            ClinicalNote.fhir_document_reference_id == report_id
        ).first()
        
        if not clinical_note:
            # Method 2: If report_id looks like a ClinicalNote ID (UUID format), try that
            try:
                if len(report_id) == 36:  # UUID length
                    note_uuid = UUIDType(report_id)
                    clinical_note = db.query(ClinicalNote).filter(ClinicalNote.id == note_uuid).first()
            except:
                pass
        
        if not clinical_note:
            # Method 3: Get patient_id from doc_ref and find most recent note for this patient
            print(f"DEBUG: No ClinicalNote found with fhir_document_reference_id or id={report_id}, trying patient lookup...")
            patient_id_from_doc = ""
            subject = doc_ref.get("subject", {})
            if isinstance(subject, dict):
                patient_ref = subject.get("reference", "")
                patient_id_from_doc = patient_ref.replace("Patient/", "") if patient_ref else ""
            
            if patient_id_from_doc:
                from datetime import timedelta
                # Try to find ClinicalNote created around the same time (within 24 hours)
                time_window_start = datetime.now(timezone.utc) - timedelta(hours=24)
                try:
                    patient_uuid = UUIDType(patient_id_from_doc)
                    clinical_note = db.query(ClinicalNote).filter(
                        ClinicalNote.patient_id == patient_uuid,
                        ClinicalNote.note_date >= time_window_start
                    ).order_by(ClinicalNote.note_date.desc()).first()
                except:
                    pass
                if clinical_note:
                    print(f"DEBUG: Found ClinicalNote by patient_id and time window: id={clinical_note.id}")
        
        # Debug: log if ClinicalNote was found and what content was retrieved (for PDF-upload / view report)
        def _safe_preview(s, max_len=500):
            """Preview string for debug logs; ASCII-safe to avoid UnicodeEncodeError on Windows console."""
            if s is None:
                return "(None)"
            t = str(s).strip()
            if not t:
                return "(empty)"
            try:
                out = t[:max_len] + ("..." if len(t) > max_len else "")
                return out.encode("ascii", "replace").decode("ascii")
            except Exception:
                return "(preview error)"

        print(f"DEBUG: Looking for ClinicalNote with report_id={report_id}")
        print(f"DEBUG: ClinicalNote found: {clinical_note is not None}")
        if clinical_note:
            print(f"DEBUG: ClinicalNote.id={clinical_note.id}")
            print(f"DEBUG: ClinicalNote.fhir_document_reference_id={clinical_note.fhir_document_reference_id}")
            print(f"DEBUG: --- RETRIEVED CONTENT (from DB) ---")
            print(f"DEBUG:   content length={len(clinical_note.content) if clinical_note.content else 0}, preview: {_safe_preview(clinical_note.content, 400)}")
            print(f"DEBUG:   subjective length={len(clinical_note.subjective) if clinical_note.subjective else 0}, preview: {_safe_preview(clinical_note.subjective, 200)}")
            print(f"DEBUG:   objective length={len(clinical_note.objective) if clinical_note.objective else 0}, preview: {_safe_preview(clinical_note.objective, 200)}")
            print(f"DEBUG:   assessment length={len(clinical_note.assessment) if clinical_note.assessment else 0}, preview: {_safe_preview(clinical_note.assessment, 200)}")
            print(f"DEBUG:   plan length={len(clinical_note.plan) if clinical_note.plan else 0}, preview: {_safe_preview(clinical_note.plan, 200)}")
            print(f"DEBUG: --- END RETRIEVED CONTENT ---")
        else:
            print(f"DEBUG: ERROR - No ClinicalNote found for report_id={report_id}")
        
        # Parse report data - prefer ClinicalNote.content, fallback to DocumentReference description
        report_content = {}
        
        if clinical_note and clinical_note.content:
            # Parse the JSON content from ClinicalNote
            # Use global json module (imported at top of file)
            try:
                content_str = clinical_note.content
                print(f"DEBUG: ClinicalNote.content type: {type(content_str)}, length: {len(content_str) if content_str else 0}")
                print(f"DEBUG: ClinicalNote.content preview (first 500 chars): {str(content_str)[:500] if content_str else '(empty)'}")
                
                report_content = json.loads(content_str) if isinstance(content_str, str) else content_str
                
                if not isinstance(report_content, dict):
                    print(f"DEBUG: WARNING - report_content is not a dict, type: {type(report_content)}")
                    report_content = {}
                else:
                    print(f"DEBUG: Parsed report_content keys: {list(report_content.keys())}")
                    print(f"DEBUG: report_content has hpi: {'hpi' in report_content}, has external: {'external' in report_content}, has acuity: {'acuity' in report_content}, has refraction: {'refraction' in report_content}, has pupils: {'pupils' in report_content}, has motility: {'motility' in report_content}, has alignment: {'alignment' in report_content}, has confrontation_fields: {'confrontation_fields' in report_content}, has iop: {'iop' in report_content}, has dilation: {'dilation' in report_content}, has gonioscopy: {'gonioscopy' in report_content}, has anterior: {'anterior' in report_content}, has posterior: {'posterior' in report_content}, has tests: {'tests' in report_content}, has imaging_links: {'imaging_links' in report_content}, has diagnosis: {'diagnosis' in report_content}, has plan: {'plan' in report_content}, has procedures_done: {'procedures_done' in report_content}, has attachments: {'attachments' in report_content}, has assessment: {'assessment' in report_content}")
                    if 'hpi' in report_content:
                        hpi_val = report_content.get('hpi')
                        print(f"DEBUG: hpi type: {type(hpi_val)}, is dict: {isinstance(hpi_val, dict)}")
                        if isinstance(hpi_val, dict):
                            print(f"DEBUG: hpi keys: {list(hpi_val.keys())}")
                    
                    if 'external' in report_content:
                        external_val = report_content.get('external')
                        print(f"DEBUG: external type: {type(external_val)}, is dict: {isinstance(external_val, dict)}")
                        if isinstance(external_val, dict):
                            print(f"DEBUG: external keys: {list(external_val.keys())}")
                            print(f"DEBUG: external eyebrows: '{external_val.get('eyebrows', '')}'")
                            print(f"DEBUG: external lids_lashes: '{external_val.get('lids_lashes', '')}'")
                            print(f"DEBUG: external lacrimal: '{external_val.get('lacrimal', '')}'")
                            print(f"DEBUG: external orbit: '{external_val.get('orbit', '')}'")
                    
                    if 'acuity' in report_content:
                        acuity_val = report_content.get('acuity')
                        print(f"DEBUG: acuity type: {type(acuity_val)}, is dict: {isinstance(acuity_val, dict)}")
                        if isinstance(acuity_val, dict):
                            print(f"DEBUG: acuity keys: {list(acuity_val.keys())}")
                            if 'distance' in acuity_val:
                                distance_val = acuity_val.get('distance', {})
                                if isinstance(distance_val, dict):
                                    print(f"DEBUG: acuity distance SC: {distance_val.get('sc', {})}")
                                    print(f"DEBUG: acuity distance CC: {distance_val.get('cc', {})}")
                            if 'near' in acuity_val:
                                near_val = acuity_val.get('near', {})
                                if isinstance(near_val, dict):
                                    print(f"DEBUG: acuity near SC: {near_val.get('sc', {})}")
                                    print(f"DEBUG: acuity near CC: {near_val.get('cc', {})}")
                            if 'pinhole' in acuity_val:
                                print(f"DEBUG: acuity pinhole: {acuity_val.get('pinhole', {})}")
                    
                    if 'refraction' in report_content:
                        refraction_val = report_content.get('refraction')
                        print(f"DEBUG: refraction type: {type(refraction_val)}, is dict: {isinstance(refraction_val, dict)}")
                        if isinstance(refraction_val, dict):
                            print(f"DEBUG: refraction keys: {list(refraction_val.keys())}")
                            print(f"DEBUG: refraction cycloplegic: {refraction_val.get('cycloplegic', False)}")
                            if 'od' in refraction_val:
                                od_val = refraction_val.get('od', {})
                                if isinstance(od_val, dict):
                                    print(f"DEBUG: refraction OD - sphere: '{od_val.get('sphere', '')}', cylinder: '{od_val.get('cylinder', '')}', axis: '{od_val.get('axis', '')}', add: '{od_val.get('add', '')}'")
                            if 'os' in refraction_val:
                                os_val = refraction_val.get('os', {})
                                if isinstance(os_val, dict):
                                    print(f"DEBUG: refraction OS - sphere: '{os_val.get('sphere', '')}', cylinder: '{os_val.get('cylinder', '')}', axis: '{os_val.get('axis', '')}', add: '{os_val.get('add', '')}'")
                            if 'final_rx' in refraction_val:
                                final_rx_val = refraction_val.get('final_rx', {})
                                if isinstance(final_rx_val, dict):
                                    print(f"DEBUG: refraction final_rx - od: '{final_rx_val.get('od', '')}', os: '{final_rx_val.get('os', '')}', pd: '{final_rx_val.get('pd', '')}'")
                    
                    if 'pupils' in report_content:
                        pupils_val = report_content.get('pupils')
                        print(f"DEBUG: pupils type: {type(pupils_val)}, is dict: {isinstance(pupils_val, dict)}")
                        if isinstance(pupils_val, dict):
                            print(f"DEBUG: pupils keys: {list(pupils_val.keys())}")
                            if 'od' in pupils_val:
                                od_val = pupils_val.get('od', {})
                                if isinstance(od_val, dict):
                                    print(f"DEBUG: pupils OD - size_mm: '{od_val.get('size_mm', '')}', reaction: '{od_val.get('reaction', '')}', rapd: {od_val.get('rapd', False)}, irregular: {od_val.get('irregular', False)}")
                            if 'os' in pupils_val:
                                os_val = pupils_val.get('os', {})
                                if isinstance(os_val, dict):
                                    print(f"DEBUG: pupils OS - size_mm: '{os_val.get('size_mm', '')}', reaction: '{os_val.get('reaction', '')}', rapd: {os_val.get('rapd', False)}, irregular: {os_val.get('irregular', False)}")
                    
                    if 'motility' in report_content:
                        motility_val = report_content.get('motility')
                        print(f"DEBUG: motility type: {type(motility_val)}, is dict: {isinstance(motility_val, dict)}")
                        if isinstance(motility_val, dict):
                            print(f"DEBUG: motility keys: {list(motility_val.keys())}")
                            print(f"DEBUG: motility versions: '{motility_val.get('versions', '')}'")
                            print(f"DEBUG: motility ductions: '{motility_val.get('ductions', '')}'")
                            print(f"DEBUG: motility deviations: '{motility_val.get('deviations', '')}'")
                    
                    if 'alignment' in report_content:
                        alignment_val = report_content.get('alignment')
                        print(f"DEBUG: alignment type: {type(alignment_val)}, is dict: {isinstance(alignment_val, dict)}")
                        if isinstance(alignment_val, dict):
                            print(f"DEBUG: alignment keys: {list(alignment_val.keys())}")
                            if 'distance' in alignment_val:
                                distance_val = alignment_val.get('distance', {})
                                if isinstance(distance_val, dict):
                                    print(f"DEBUG: alignment distance - type: '{distance_val.get('type', '')}', prism: '{distance_val.get('prism', '')}', axis: '{distance_val.get('axis', '')}'")
                            if 'near' in alignment_val:
                                near_val = alignment_val.get('near', {})
                                if isinstance(near_val, dict):
                                    print(f"DEBUG: alignment near - type: '{near_val.get('type', '')}', prism: '{near_val.get('prism', '')}', axis: '{near_val.get('axis', '')}'")
                    
                    if 'confrontation_fields' in report_content:
                        confrontation_val = report_content.get('confrontation_fields')
                        print(f"DEBUG: confrontation_fields type: {type(confrontation_val)}, is dict: {isinstance(confrontation_val, dict)}")
                        if isinstance(confrontation_val, dict):
                            print(f"DEBUG: confrontation_fields keys: {list(confrontation_val.keys())}")
                            print(f"DEBUG: confrontation_fields summary: '{confrontation_val.get('summary', '')}'")
                    
                    if 'iop' in report_content:
                        iop_val = report_content.get('iop')
                        print(f"DEBUG: iop type: {type(iop_val)}, is dict: {isinstance(iop_val, dict)}")
                        if isinstance(iop_val, dict):
                            print(f"DEBUG: iop keys: {list(iop_val.keys())}")
                            print(f"DEBUG: iop method: '{iop_val.get('method', '')}', time: '{iop_val.get('time', '')}'")
                            print(f"DEBUG: iop OD: '{iop_val.get('od', '')}', OS: '{iop_val.get('os', '')}'")
                            if 'post_dilation' in iop_val:
                                post_dilation_val = iop_val.get('post_dilation', {})
                                if isinstance(post_dilation_val, dict):
                                    print(f"DEBUG: iop post_dilation - time: '{post_dilation_val.get('time', '')}', od: '{post_dilation_val.get('od', '')}', os: '{post_dilation_val.get('os', '')}'")
                    
                    if 'dilation' in report_content:
                        dilation_val = report_content.get('dilation')
                        print(f"DEBUG: dilation type: {type(dilation_val)}, is dict: {isinstance(dilation_val, dict)}")
                        if isinstance(dilation_val, dict):
                            print(f"DEBUG: dilation keys: {list(dilation_val.keys())}")
                            print(f"DEBUG: dilation performed: {dilation_val.get('performed', False)}")
                            print(f"DEBUG: dilation agent: '{dilation_val.get('agent', '')}', time: '{dilation_val.get('time', '')}'")
                    
                    if 'gonioscopy' in report_content:
                        gonioscopy_val = report_content.get('gonioscopy')
                        print(f"DEBUG: gonioscopy type: {type(gonioscopy_val)}, is dict: {isinstance(gonioscopy_val, dict)}")
                        if isinstance(gonioscopy_val, dict):
                            print(f"DEBUG: gonioscopy keys: {list(gonioscopy_val.keys())}")
                            print(f"DEBUG: gonioscopy performed: {gonioscopy_val.get('performed', False)}")
                            if 'od' in gonioscopy_val:
                                od_val = gonioscopy_val.get('od', {})
                                if isinstance(od_val, dict):
                                    print(f"DEBUG: gonioscopy OD - shaffer: '{od_val.get('shaffer', '')}', pigmentation: '{od_val.get('pigmentation', '')}', pas: {od_val.get('pas', False)}, notes: '{od_val.get('notes', '')}'")
                            if 'os' in gonioscopy_val:
                                os_val = gonioscopy_val.get('os', {})
                                if isinstance(os_val, dict):
                                    print(f"DEBUG: gonioscopy OS - shaffer: '{os_val.get('shaffer', '')}', pigmentation: '{os_val.get('pigmentation', '')}', pas: {os_val.get('pas', False)}, notes: '{os_val.get('notes', '')}'")
                    
                    if 'anterior' in report_content:
                        anterior_val = report_content.get('anterior')
                        print(f"DEBUG: anterior type: {type(anterior_val)}, is dict: {isinstance(anterior_val, dict)}")
                        if isinstance(anterior_val, dict):
                            print(f"DEBUG: anterior keys: {list(anterior_val.keys())}")
                            print(f"DEBUG: anterior - lids: '{anterior_val.get('lids', '')}', conjunctiva: '{anterior_val.get('conjunctiva', '')}', cornea: '{anterior_val.get('cornea', '')}'")
                            print(f"DEBUG: anterior - anterior_chamber: '{anterior_val.get('anterior_chamber', '')}', iris: '{anterior_val.get('iris', '')}', lens: '{anterior_val.get('lens', '')}'")
                    
                    if 'posterior' in report_content:
                        posterior_val = report_content.get('posterior')
                        print(f"DEBUG: posterior type: {type(posterior_val)}, is dict: {isinstance(posterior_val, dict)}")
                        if isinstance(posterior_val, dict):
                            print(f"DEBUG: posterior keys: {list(posterior_val.keys())}")
                            print(f"DEBUG: posterior - vitreous: '{posterior_val.get('vitreous', '')}', disc: '{posterior_val.get('disc', '')}', macula: '{posterior_val.get('macula', '')}'")
                            if 'cd_ratio' in posterior_val:
                                cd_ratio_val = posterior_val.get('cd_ratio', {})
                                if isinstance(cd_ratio_val, dict):
                                    print(f"DEBUG: posterior C/D Ratio - OD: '{cd_ratio_val.get('OD', '')}', OS: '{cd_ratio_val.get('OS', '')}'")
                            print(f"DEBUG: posterior - vessels: '{posterior_val.get('vessels', '')}', periphery: '{posterior_val.get('periphery', '')}'")
                            print(f"DEBUG: posterior - dr_grade: '{posterior_val.get('dr_grade', '')}', amd_grade: '{posterior_val.get('amd_grade', '')}'")
                    
                    if 'tests' in report_content:
                        tests_val = report_content.get('tests')
                        print(f"DEBUG: tests type: {type(tests_val)}, is dict: {isinstance(tests_val, dict)}")
                        if isinstance(tests_val, dict):
                            print(f"DEBUG: tests keys: {list(tests_val.keys())}")
                            print(f"DEBUG: tests notes: '{tests_val.get('notes', '')}'")
                            if 'keratometry' in tests_val:
                                keratometry_val = tests_val.get('keratometry', {})
                                if isinstance(keratometry_val, dict):
                                    print(f"DEBUG: tests Keratometry - k1: '{keratometry_val.get('k1', '')}', k2: '{keratometry_val.get('k2', '')}', axis: '{keratometry_val.get('axis', '')}'")
                            if 'pachymetry' in tests_val:
                                pachymetry_val = tests_val.get('pachymetry', {})
                                if isinstance(pachymetry_val, dict):
                                    print(f"DEBUG: tests Pachymetry - cct_od: '{pachymetry_val.get('cct_od', '')}', cct_os: '{pachymetry_val.get('cct_os', '')}'")
                            if 'oct' in tests_val:
                                oct_val = tests_val.get('oct', {})
                                if isinstance(oct_val, dict):
                                    print(f"DEBUG: tests OCT - rnfl_od: '{oct_val.get('rnfl_od', '')}', rnfl_os: '{oct_val.get('rnfl_os', '')}', gcipl_od: '{oct_val.get('gcipl_od', '')}', gcipl_os: '{oct_val.get('gcipl_os', '')}'")
                            if 'imaging' in tests_val:
                                imaging_val = tests_val.get('imaging', [])
                                print(f"DEBUG: tests imaging array: {imaging_val}")
                            if 'referenced_docs' in tests_val:
                                referenced_docs_val = tests_val.get('referenced_docs', [])
                                print(f"DEBUG: tests referenced_docs array: {referenced_docs_val}")
                    
                    if 'imaging_links' in report_content:
                        imaging_links_val = report_content.get('imaging_links')
                        print(f"DEBUG: imaging_links type: {type(imaging_links_val)}, is list: {isinstance(imaging_links_val, list)}")
                        if isinstance(imaging_links_val, list):
                            print(f"DEBUG: imaging_links count: {len(imaging_links_val)}")
                            for idx, link in enumerate(imaging_links_val):
                                if isinstance(link, dict):
                                    print(f"DEBUG: imaging_links[{idx}] - study_uid: '{link.get('study_uid', '')}', modality: '{link.get('modality', '')}', description: '{link.get('description', '')}', attach: '{link.get('attach', '')}', note: '{link.get('note', '')}'")
                    
                    if 'diagnosis' in report_content:
                        diagnosis_val = report_content.get('diagnosis')
                        print(f"DEBUG: diagnosis type: {type(diagnosis_val)}, is dict: {isinstance(diagnosis_val, dict)}")
                        if isinstance(diagnosis_val, dict):
                            print(f"DEBUG: diagnosis keys: {list(diagnosis_val.keys())}")
                            if 'main' in diagnosis_val:
                                main_diag_val = diagnosis_val.get('main', {})
                                if isinstance(main_diag_val, dict):
                                    print(f"DEBUG: diagnosis main - code: '{main_diag_val.get('code', '')}', term: '{main_diag_val.get('term', '')}'")
                                elif isinstance(main_diag_val, str):
                                    print(f"DEBUG: diagnosis main (string): '{main_diag_val}'")
                            if 'secondary' in diagnosis_val:
                                secondary_diag_val = diagnosis_val.get('secondary', [])
                                if isinstance(secondary_diag_val, list):
                                    print(f"DEBUG: diagnosis secondary array count: {len(secondary_diag_val)}")
                                    for idx, sec_diag in enumerate(secondary_diag_val):
                                        if isinstance(sec_diag, dict):
                                            print(f"DEBUG: diagnosis secondary[{idx}] - code: '{sec_diag.get('code', '')}', term: '{sec_diag.get('term', '')}'")
                                        elif isinstance(sec_diag, str):
                                            print(f"DEBUG: diagnosis secondary[{idx}] (string): '{sec_diag}'")
                            if 'codes' in diagnosis_val:
                                codes_diag_val = diagnosis_val.get('codes', [])
                                if isinstance(codes_diag_val, list):
                                    print(f"DEBUG: diagnosis codes array count: {len(codes_diag_val)}")
                                    for idx, code_diag in enumerate(codes_diag_val):
                                        if isinstance(code_diag, dict):
                                            print(f"DEBUG: diagnosis codes[{idx}] - system: '{code_diag.get('system', '')}', code: '{code_diag.get('code', '')}', term: '{code_diag.get('term', '')}'")
                    
                    if 'plan' in report_content:
                        plan_val = report_content.get('plan')
                        print(f"DEBUG: plan type: {type(plan_val)}, is dict: {isinstance(plan_val, dict)}")
                        if isinstance(plan_val, dict):
                            print(f"DEBUG: plan keys: {list(plan_val.keys())}")
                            if 'meds' in plan_val:
                                meds_val = plan_val.get('meds', [])
                                if isinstance(meds_val, list):
                                    print(f"DEBUG: plan meds array count: {len(meds_val)}")
                                    for idx, med in enumerate(meds_val):
                                        if isinstance(med, dict):
                                            print(f"DEBUG: plan meds[{idx}] - med: '{med.get('med', '')}', conc_strength: '{med.get('conc_strength', '')}', route: '{med.get('route', '')}', freq: '{med.get('freq', '')}', duration: '{med.get('duration', '')}', instructions: '{med.get('instructions', '')}'")
                                        elif isinstance(med, str):
                                            print(f"DEBUG: plan meds[{idx}] (string): '{med}'")
                            if 'procedures_planned' in plan_val:
                                procedures_val = plan_val.get('procedures_planned', [])
                                if isinstance(procedures_val, list):
                                    print(f"DEBUG: plan procedures_planned array count: {len(procedures_val)}")
                            if 'counseling' in plan_val:
                                counseling_val = plan_val.get('counseling', [])
                                if isinstance(counseling_val, list):
                                    print(f"DEBUG: plan counseling array count: {len(counseling_val)}")
                            if 'follow_up' in plan_val:
                                print(f"DEBUG: plan follow_up: '{plan_val.get('follow_up', '')}', follow_up_date: '{plan_val.get('follow_up_date', '')}'")
                    
                    if 'procedures_done' in report_content:
                        procedures_done_val = report_content.get('procedures_done')
                        print(f"DEBUG: procedures_done type: {type(procedures_done_val)}, is list: {isinstance(procedures_done_val, list)}")
                        if isinstance(procedures_done_val, list):
                            print(f"DEBUG: procedures_done array count: {len(procedures_done_val)}")
                            for idx, proc in enumerate(procedures_done_val):
                                if isinstance(proc, dict):
                                    print(f"DEBUG: procedures_done[{idx}] - name: '{proc.get('name', '')}', date: '{proc.get('date', '')}', eye: '{proc.get('eye', '')}', anesthesia: '{proc.get('anesthesia', '')}', technique: '{proc.get('technique', '')}', findings: '{proc.get('findings', '')}', result: '{proc.get('result', '')}', complications: '{proc.get('complications', '')}'")
                                elif isinstance(proc, str):
                                    print(f"DEBUG: procedures_done[{idx}] (string): '{proc}'")
                    
                    if 'attachments' in report_content:
                        attachments_val = report_content.get('attachments')
                        print(f"DEBUG: attachments type: {type(attachments_val)}, is list: {isinstance(attachments_val, list)}")
                        if isinstance(attachments_val, list):
                            print(f"DEBUG: attachments array count: {len(attachments_val)}")
                            for idx, att in enumerate(attachments_val):
                                if isinstance(att, dict):
                                    print(f"DEBUG: attachments[{idx}] - id: '{att.get('id', '')}', label: '{att.get('label', '')}', type: '{att.get('type', '')}', url: '{att.get('url', '')}', filename: '{att.get('filename', '')}'")
                                elif isinstance(att, str):
                                    print(f"DEBUG: attachments[{idx}] (string): '{att}'")
            except Exception as e:
                print(f"DEBUG: ERROR - Failed to parse ClinicalNote.content: {e}")
                import traceback
                traceback.print_exc()
                report_content = {}
                # When content is plain text (e.g. PDF upload), keep it so view can show it
                if content_str and isinstance(content_str, str) and content_str.strip():
                    report_content["summary"] = content_str.strip()
                    print(f"DEBUG: Using ClinicalNote.content as plain-text summary (e.g. PDF upload)")
        else:
            print(f"DEBUG: WARNING - No ClinicalNote.content found. clinical_note exists: {clinical_note is not None}, has content: {clinical_note.content if clinical_note else False}")
        
        # If ClinicalNote doesn't have data, try DocumentReference description as fallback
        if not report_content and doc_ref.get("description"):
            try:
                report_content = json.loads(doc_ref.get("description")) if isinstance(doc_ref.get("description"), str) else doc_ref.get("description")
            except:
                report_content = {"notes": doc_ref.get("description")} if doc_ref.get("description") else {}
        
        # CRITICAL: Always merge ClinicalNote SOAP fields into report_content when present.
        # (PDF-uploaded notes store data in SOAP; content is plain text. Manual notes may have JSON content.)
        # This ensures view report shows subjective/objective/assessment/plan from DB.
        if clinical_note:
            try:
                db.refresh(clinical_note)  # Force load latest SOAP columns from DB
            except Exception:
                pass
            if not isinstance(report_content, dict):
                report_content = {}

            def _looks_like_header_or_address(line: str) -> bool:
                if not line:
                    return True
                ln = line.strip().lower()
                if len(ln) < 20:
                    return True
                header_tokens = (
                    "clinic", "medical center", "address", "tel", "phone", "www.", "http", "ул.", "str.",
                    "ул ", "город", "city", "index", "республика", "uzbekistan"
                )
                if any(tok in ln for tok in header_tokens):
                    return True
                digit_ratio = sum(c.isdigit() or c in ".,-/+()" for c in ln) / max(len(ln), 1)
                if digit_ratio > 0.35:
                    return True
                return False

            def _derive_chief_and_hpi(subjective_text: str) -> tuple[Optional[str], Optional[str]]:
                if not subjective_text or not subjective_text.strip():
                    return None, None

                import re
                normalized = subjective_text.strip()
                lines = [ln.strip() for ln in normalized.splitlines() if ln.strip()]
                clinical_lines = [ln for ln in lines if not _looks_like_header_or_address(ln)]
                searchable = "\n".join(clinical_lines) if clinical_lines else normalized

                def _extract_by_pattern(pattern: str) -> Optional[str]:
                    m = re.search(pattern, searchable, re.IGNORECASE | re.DOTALL)
                    if not m:
                        return None
                    val = m.group(1).strip()
                    return val if len(val) >= 10 else None

                chief = _extract_by_pattern(r"(?:chief\s+complaint|reason\s+for\s+visit|complaints?|жалобы|shikoyat)\s*[:\-]\s*(.+?)(?=\n\n|\n[A-ZА-Я]|$)")
                hpi = _extract_by_pattern(r"(?:history\s+of\s+present\s+illness|present\s+illness|hpi|анамнез|anamnez)\s*[:\-]\s*(.+?)(?=\n\n|\n[A-ZА-Я]|$)")

                if not chief:
                    for ln in clinical_lines:
                        if len(ln) >= 30:
                            chief = ln[:500]
                            break

                if not hpi:
                    hpi = "\n".join(clinical_lines[:8]).strip() or normalized

                if chief and hpi and chief == hpi and len(hpi) > 700:
                    hpi = hpi[:700] + "…"

                return chief, hpi

            # Subjective -> chief complaint / HPI (fill if missing or empty)
            if clinical_note.subjective:
                hpi = report_content.get("hpi")
                if not isinstance(hpi, dict):
                    report_content["hpi"] = {}
                need_subjective = not (report_content.get("hpi", {}).get("free") or report_content.get("chief_complaint"))
                if need_subjective:
                    if "hpi" not in report_content or not isinstance(report_content["hpi"], dict):
                        report_content["hpi"] = {}
                    chief_complaint, hpi_text = _derive_chief_and_hpi(clinical_note.subjective)
                    report_content["hpi"]["free"] = hpi_text or clinical_note.subjective
                    report_content["chief_complaint"] = chief_complaint or (hpi_text[:220] if hpi_text else clinical_note.subjective[:220])
                    print(f"DEBUG: Filled chief complaint and HPI from ClinicalNote.subjective")
            # Objective -> physical examination
            if clinical_note.objective:
                if "pe" not in report_content or not report_content.get("pe") or not (report_content.get("pe") or {}).get("notes"):
                    report_content["pe"] = report_content.get("pe") or {}
                    if not isinstance(report_content["pe"], dict):
                        report_content["pe"] = {}
                    report_content["pe"]["notes"] = clinical_note.objective
                    print(f"DEBUG: Filled from ClinicalNote.objective")
            # Assessment -> diagnosis (try JSON, else plain text)
            if clinical_note.assessment and not report_content.get("assessment"):
                try:
                    assessment_data = json.loads(clinical_note.assessment) if isinstance(clinical_note.assessment, str) else clinical_note.assessment
                    if isinstance(assessment_data, dict):
                        report_content["assessment"] = assessment_data
                        print(f"DEBUG: Filled from ClinicalNote.assessment (JSON)")
                except Exception:
                    report_content["assessment"] = clinical_note.assessment
                    print(f"DEBUG: Filled from ClinicalNote.assessment (plain text)")
            # Plan -> treatment plan (try JSON, else plain text)
            if clinical_note.plan and not report_content.get("plan"):
                try:
                    plan_data = json.loads(clinical_note.plan) if isinstance(clinical_note.plan, str) else clinical_note.plan
                    if isinstance(plan_data, dict):
                        report_content["plan"] = plan_data
                        print(f"DEBUG: Filled from ClinicalNote.plan (JSON)")
                except Exception:
                    report_content["plan"] = clinical_note.plan
                    print(f"DEBUG: Filled from ClinicalNote.plan (plain text)")
        
        # When content was plain text (e.g. PDF upload), derive chief_complaint / HPI / diagnosis from summary if still missing
        summary_text = report_content.get("summary", "") if isinstance(report_content, dict) else ""
        if summary_text and isinstance(report_content, dict):
            need_cc = not (report_content.get("chief_complaint") or (report_content.get("hpi") or {}).get("free"))
            if need_cc:
                # Skip letterhead (clinic address): use first substantive paragraph, not first paragraph
                def _para_like_letterhead(p):
                    if not p or len(p) < 30:
                        return True
                    pl = p.strip().lower()
                    for tok in ("ul.", "str.", "\u0443\u043b.", "\u0433.", "address", "clinic", "medical center"):
                        if tok in pl and len(pl) < 120:
                            return True
                    if sum(c.isdigit() or c in ".,/" for c in pl) / max(len(pl), 1) > 0.35:
                        return True
                    return False
                paras_summary = [x.strip() for x in summary_text.split("\n\n") if x.strip()]
                chief_from_summary = None
                for para in paras_summary:
                    if not _para_like_letterhead(para) and len(para) >= 40:
                        chief_from_summary = (para[:500] + "\u2026") if len(para) > 500 else para
                        break
                if not chief_from_summary and paras_summary:
                    for para in paras_summary:
                        if len(para) > 100:
                            chief_from_summary = (para[:500] + "\u2026") if len(para) > 500 else para
                            break
                if not chief_from_summary and paras_summary:
                    chief_from_summary = (paras_summary[0][:500] + "\u2026") if len(paras_summary[0]) > 500 else paras_summary[0]
                if chief_from_summary:
                    if "hpi" not in report_content or not isinstance(report_content.get("hpi"), dict):
                        report_content["hpi"] = {}
                    report_content["hpi"]["free"] = summary_text[:4000] + ("\u2026" if len(summary_text) > 4000 else "")
                    report_content["chief_complaint"] = chief_from_summary
                    print(f"DEBUG: Derived chief_complaint and hpi from summary (plain-text content)")
            # If assessment/diagnosis still missing, try to use summary as fallback for display
            if not report_content.get("assessment") and not report_content.get("diagnosis"):
                for label in ("Diagnosis:", "Assessment:", "Diagnosis", "Assessment"):
                    if label in summary_text:
                        idx = summary_text.find(label)
                        rest = summary_text[idx + len(label):].strip()
                        report_content["assessment"] = rest[:1500].strip() if rest else "(See additional notes)"
                        print(f"DEBUG: Derived assessment from summary (after '{label}')")
                        break
                else:
                    report_content["assessment"] = "(See additional notes)"
            if not report_content.get("plan"):
                for label in ("Plan:", "Treatment plan:", "Plan", "Treatment plan"):
                    if label in summary_text:
                        idx = summary_text.find(label)
                        rest = summary_text[idx + len(label):].strip()
                        report_content["plan"] = rest[:1500].strip() if rest else "(See additional notes)"
                        print(f"DEBUG: Derived plan from summary (after '{label}')")
                        break
                else:
                    report_content["plan"] = "(See additional notes)"
        
        # Debug: what will be sent to the view (report_content after SOAP merge)
        if report_content and isinstance(report_content, dict):
            print(f"DEBUG: --- REPORT_CONTENT FOR VIEW (after merge) ---")
            print(f"DEBUG:   keys: {list(report_content.keys())}")
            if report_content.get("summary"):
                summary_preview = _safe_preview(report_content["summary"], 400)
                print(f"DEBUG:   summary (-> additionalNotes) length={len(report_content['summary'])}, preview: {summary_preview}")
            if report_content.get("chief_complaint"):
                print(f"DEBUG:   chief_complaint preview: {_safe_preview(report_content['chief_complaint'], 150)}")
            if report_content.get("hpi"):
                hpi_free = report_content["hpi"].get("free", "") if isinstance(report_content.get("hpi"), dict) else ""
                print(f"DEBUG:   hpi.free preview: {_safe_preview(hpi_free, 150)}")
            print(f"DEBUG: --- END REPORT_CONTENT ---")
        
        # Final check - if report_content is still empty, log warning
        if not report_content:
            print(f"DEBUG: ERROR - report_content is still empty after all extraction attempts!")
            print(f"DEBUG: ClinicalNote exists: {clinical_note is not None}")
            if clinical_note:
                print(f"DEBUG: ClinicalNote.id: {clinical_note.id}")
                print(f"DEBUG: ClinicalNote.fhir_document_reference_id: {clinical_note.fhir_document_reference_id}")
                print(f"DEBUG: ClinicalNote.content is None/empty: {not clinical_note.content}")
                print(f"DEBUG: ClinicalNote.assessment is None/empty: {not clinical_note.assessment}")
                print(f"DEBUG: ClinicalNote.plan is None/empty: {not clinical_note.plan}")
                print(f"DEBUG: ClinicalNote.subjective is None/empty: {not clinical_note.subjective}")
        
        # Get date - prefer ClinicalNote date, fallback to DocumentReference
        date_str = ""
        if clinical_note and clinical_note.note_date:
            date_str = clinical_note.note_date.isoformat()
        elif isinstance(context, dict):
            period = context.get("period", {})
            if isinstance(period, dict):
                start = period.get("start", "")
                if start:
                    date_str = start
        if not date_str:
            date_value = doc_ref.get("date")
            if date_value:
                date_str = str(date_value)
        
        # Extract specialty from DocumentReference type or report content
        specialty = "General Medicine"
        type_obj = doc_ref.get("type", {})
        if isinstance(type_obj, dict):
            coding_list = type_obj.get("coding", [])
            if isinstance(coding_list, list):
                for coding in coding_list:
                    if isinstance(coding, dict):
                        display = coding.get("display")
                        if display:
                            specialty = str(display)
                            break
        
        # Also check doc_type in report_content for more specific report type
        doc_type = report_content.get("doc_type", "") if report_content else ""
        print(f"DEBUG: get_report_by_appointment - Extracted doc_type from report_content: '{doc_type}'")
        print(f"DEBUG: get_report_by_appointment - report_content keys: {list(report_content.keys()) if isinstance(report_content, dict) else 'Not a dict'}")
        if doc_type and doc_type.startswith("oph."):
            specialty = "Ophthalmology"
            print(f"DEBUG: get_report_by_appointment - Set specialty to 'Ophthalmology' based on doc_type: '{doc_type}'")
        elif doc_type and doc_type.startswith("neu."):
            specialty = "Neurology"
        elif doc_type and doc_type.startswith("uro."):
            specialty = "Urology"
        elif doc_type and doc_type.startswith("onc."):
            specialty = "Oncology"
        elif doc_type and doc_type.startswith("trauma."):
            specialty = "Surgery"
        print(f"DEBUG: get_report_by_appointment - Final specialty: '{specialty}', doc_type: '{doc_type}'")
        
        # Extract data from report_content (form data structure)
        # Map form fields to display format
        chief_complaint = ""
        if report_content:
            # Try multiple possible locations for chief complaint
            chief_complaint = report_content.get("chief_complaint", "") or ""
            if not chief_complaint:
                hpi = report_content.get("hpi", {})
                if isinstance(hpi, dict):
                    chief_complaint = hpi.get("free", "") or ""
            # Debug
            print(f"DEBUG: Extracted chief_complaint: {chief_complaint[:50] if chief_complaint else '(empty)'}")
        
        history_of_present_illness = ""
        if report_content:
            hpi = report_content.get("hpi", {})
            if isinstance(hpi, dict):
                # Check for ophthalmology-style HPI structure first
                if hpi.get("description") or hpi.get("ocular_history") or hpi.get("systemic_history"):
                    # Ophthalmology format
                    hpi_parts = []
                    if hpi.get("description"):
                        hpi_parts.append(f"Description: {hpi.get('description')}")
                    if hpi.get("ocular_history"):
                        hpi_parts.append(f"Ocular History: {hpi.get('ocular_history')}")
                    if hpi.get("systemic_history"):
                        hpi_parts.append(f"Systemic History: {hpi.get('systemic_history')}")
                    if hpi.get("meds"):
                        hpi_parts.append(f"Medications: {hpi.get('meds')}")
                    if hpi.get("allergies"):
                        hpi_parts.append(f"Allergies: {hpi.get('allergies')}")
                    history_of_present_illness = "\n".join(hpi_parts) if hpi_parts else ""
                else:
                    # General report format
                    hpi_parts = []
                    if hpi.get("free"):
                        hpi_parts.append(hpi.get("free"))
                    if hpi.get("onset"):
                        hpi_parts.append(f"Onset: {hpi.get('onset')}")
                    if hpi.get("duration"):
                        hpi_parts.append(f"Duration: {hpi.get('duration')}")
                    if hpi.get("course"):
                        hpi_parts.append(f"Course: {hpi.get('course')}")
                    if hpi.get("modifiers") and isinstance(hpi.get("modifiers"), list) and hpi.get("modifiers"):
                        hpi_parts.append(f"Modifiers: {', '.join([str(m) for m in hpi.get('modifiers')])}")
                    if hpi.get("associated_symptoms") and isinstance(hpi.get("associated_symptoms"), list) and hpi.get("associated_symptoms"):
                        hpi_parts.append(f"Associated symptoms: {', '.join([str(s) for s in hpi.get('associated_symptoms')])}")
                    history_of_present_illness = " | ".join(hpi_parts) if hpi_parts else hpi.get("free", "") or ""
        
        physical_examination = ""
        if report_content:
            pe = report_content.get("pe", {})
            if isinstance(pe, dict):
                # Combine all PE findings - include all fields, not just non-normal ones
                pe_parts = []
                for key in ["general", "lungs", "heart", "abdomen", "neuro", "extremities"]:
                    if pe.get(key):
                        pe_parts.append(f"{key}: {pe[key]}")
                if pe.get("notes"):
                    if isinstance(pe.get("notes"), dict):
                        # If notes is an object, extract its values
                        notes_dict = pe.get("notes")
                        notes_parts = [f"{k}: {v}" for k, v in notes_dict.items() if v]
                        if notes_parts:
                            pe_parts.append(f"Notes: {'; '.join(notes_parts)}")
                    else:
                        pe_parts.append(f"Notes: {pe.get('notes')}")
                physical_examination = "; ".join(pe_parts) if pe_parts else ""
        
        diagnosis_text = ""
        if report_content:
            # Check for ophthalmology-style diagnosis structure first
            diagnosis_obj = report_content.get("diagnosis", {})
            if isinstance(diagnosis_obj, dict):
                # Ophthalmology format: diagnosis.main and diagnosis.secondary
                main = diagnosis_obj.get("main", {})
                secondary = diagnosis_obj.get("secondary", [])
                diagnosis_parts = []
                
                if main and isinstance(main, dict):
                    code = main.get("code", "")
                    term = main.get("term", "")
                    if code and term:
                        diagnosis_parts.append(f"Main Diagnosis: {code} {term}")
                    elif term:
                        diagnosis_parts.append(f"Main Diagnosis: {term}")
                    elif code:
                        diagnosis_parts.append(f"Main Diagnosis: {code}")
                
                if secondary and isinstance(secondary, list) and secondary:
                    secondary_texts = []
                    for d in secondary:
                        if isinstance(d, dict):
                            code = d.get("code", "")
                            term = d.get("term", "")
                            if code and term:
                                secondary_texts.append(f"{code} {term}")
                            elif term:
                                secondary_texts.append(term)
                            elif code:
                                secondary_texts.append(code)
                            else:
                                secondary_texts.append(str(d))
                        else:
                            secondary_texts.append(str(d))
                    if secondary_texts:
                        diagnosis_parts.append("Secondary Diagnoses: " + ", ".join(secondary_texts))
                
                if diagnosis_parts:
                    diagnosis_text = "\n".join(diagnosis_parts)
            
            # If no ophthalmology diagnosis found, try general report format
            if not diagnosis_text:
                assessment = report_content.get("assessment", {})
                if isinstance(assessment, dict):
                    working = assessment.get("working", [])
                    ddx = assessment.get("ddx", [])
                    diagnosis_parts = []
                    if working and isinstance(working, list) and working:
                        working_texts = []
                        for d in working:
                            if isinstance(d, dict):
                                # Format: "ICD Code: term" or just "term"
                                code = d.get("code", "")
                                term = d.get("term", "")
                                if code and term:
                                    working_texts.append(f"{code}: {term}")
                                elif term:
                                    working_texts.append(term)
                                else:
                                    working_texts.append(str(d))
                            else:
                                working_texts.append(str(d))
                        if working_texts:
                            diagnosis_parts.append("Working Diagnosis: " + ", ".join(working_texts))
                    if ddx and isinstance(ddx, list) and ddx:
                        ddx_texts = []
                        for d in ddx:
                            if isinstance(d, dict):
                                code = d.get("code", "")
                                term = d.get("term", "")
                                if code and term:
                                    ddx_texts.append(f"{code}: {term}")
                                elif term:
                                    ddx_texts.append(term)
                                else:
                                    ddx_texts.append(str(d))
                            else:
                                ddx_texts.append(str(d))
                        if ddx_texts:
                            diagnosis_parts.append("Differential Diagnoses: " + ", ".join(ddx_texts))
                    diagnosis_text = "\n".join(diagnosis_parts) if diagnosis_parts else ""
                elif assessment:
                    diagnosis_text = str(assessment)
        
        treatment_plan_text = ""
        if report_content:
            plan = report_content.get("plan", {})
            if isinstance(plan, dict):
                plan_parts = []
                
                # Check for ophthalmology-style plan structure
                if plan.get("meds") and isinstance(plan.get("meds"), list) and plan.get("meds"):
                    med_texts = []
                    for m in plan["meds"]:
                        if isinstance(m, dict):
                            med_parts = []
                            if m.get("med"):
                                med_parts.append(m.get("med"))
                            if m.get("conc_strength"):
                                med_parts.append(m.get("conc_strength"))
                            if m.get("route"):
                                med_parts.append(m.get("route"))
                            if m.get("freq"):
                                med_parts.append(m.get("freq"))
                            if m.get("duration"):
                                med_parts.append(m.get("duration"))
                            med_texts.append(" - ".join(med_parts) if med_parts else str(m))
                        else:
                            med_texts.append(str(m))
                    if med_texts:
                        plan_parts.append("Medications:\n" + "\n".join([f"- {m}" for m in med_texts]))
                
                if plan.get("procedures_planned") and isinstance(plan.get("procedures_planned"), list) and plan.get("procedures_planned"):
                    proc_texts = []
                    for p in plan["procedures_planned"]:
                        if isinstance(p, dict):
                            proc_parts = []
                            if p.get("name"):
                                proc_parts.append(p.get("name"))
                            if p.get("date"):
                                proc_parts.append(f"Date: {p.get('date')}")
                            proc_texts.append(" - ".join(proc_parts) if proc_parts else str(p))
                        else:
                            proc_texts.append(str(p))
                    if proc_texts:
                        plan_parts.append("Planned Procedures:\n" + "\n".join([f"- {p}" for p in proc_texts]))
                
                if plan.get("counseling") and isinstance(plan.get("counseling"), list) and plan.get("counseling"):
                    plan_parts.append("Counseling: " + ", ".join([str(c) for c in plan["counseling"]]))
                
                if plan.get("follow_up"):
                    follow_up_text = f"Follow-up: {plan.get('follow_up')}"
                    if plan.get("follow_up_date"):
                        follow_up_text += f" ({plan.get('follow_up_date')})"
                    plan_parts.append(follow_up_text)
                
                # General report format fields
                if plan.get("tests") and isinstance(plan.get("tests"), list) and plan.get("tests"):
                    plan_parts.append("Tests: " + ", ".join([str(t) if not isinstance(t, dict) else t.get("name", str(t)) for t in plan["tests"]]))
                if plan.get("referrals") and isinstance(plan.get("referrals"), list) and plan.get("referrals"):
                    plan_parts.append("Referrals: " + ", ".join([str(r) if not isinstance(r, dict) else r.get("name", str(r)) for r in plan["referrals"]]))
                if plan.get("med_changes") and isinstance(plan.get("med_changes"), list) and plan.get("med_changes"):
                    plan_parts.append("Medication Changes: " + ", ".join([str(m) if not isinstance(m, dict) else f"{m.get('name', '')} - {m.get('action', '')}" for m in plan["med_changes"]]))
                if plan.get("lifestyle") and isinstance(plan.get("lifestyle"), list) and plan.get("lifestyle"):
                    plan_parts.append("Lifestyle: " + ", ".join([str(l) if not isinstance(l, dict) else l.get("instruction", str(l)) for l in plan["lifestyle"]]))
                
                treatment_plan_text = "\n\n".join(plan_parts) if plan_parts else ""
            elif plan:
                treatment_plan_text = str(plan)
        
        follow_up_data = {}
        if report_content:
            plan = report_content.get("plan", {})
            if isinstance(plan, dict) and plan.get("follow_up"):
                follow_up_data = {
                    "reason": str(plan["follow_up"]) if plan["follow_up"] else "No follow-up reason specified",
                    "date": ""  # Could extract from encounter or report date
                }
        
        # Build response in format expected by frontend
        formatted_response = {
            "id": report_id,
            "doctor": {
                "name": doctor_full_name,
                "specialty": specialty,
                "department": "General"  # Default
            },
            "doctor_info": {
                "name": doctor_full_name,
                "specialty": specialty,
                "department": "General"  # Default (for backward compatibility)
            },
            "date": date_str,
            "chiefComplaint": chief_complaint or "",
            "chief_complaint": chief_complaint or "",  # For backward compatibility
            "historyOfPresentIllness": history_of_present_illness or "",
            "history_of_present_illness": history_of_present_illness or "",  # For backward compatibility
            "physicalExamination": physical_examination or "",
            "physical_examination": physical_examination or "",  # For backward compatibility
            "diagnosis": diagnosis_text or "",
            "treatmentPlan": treatment_plan_text or "",
            "treatment_plan": treatment_plan_text or "",  # For backward compatibility
            "additionalNotes": (report_content.get("summary", "") if report_content else "") or "",
            "additional_notes": (report_content.get("summary", "") if report_content else "") or "",  # For backward compatibility
            "medications": report_content.get("medications", []) if report_content else [],
            "followUp": follow_up_data if follow_up_data else {"reason": "", "date": ""},
            "follow_up": follow_up_data if follow_up_data else {"reason": "", "date": ""},  # For backward compatibility
            # Include specialty and doc_type for frontend routing
            "specialty": specialty,
            "doc_type": doc_type,
            # Include full report data for specialty-specific reports
            "reportData": report_content if report_content else {}
        }
        
        # Debug: Log what we're returning (so you can see what content was retrieved and sent to frontend)
        add_notes = formatted_response.get("additionalNotes") or formatted_response.get("additional_notes") or ""
        print(f"DEBUG: get_report_by_appointment - Returning formatted_response with:")
        print(f"  chiefComplaint: {_safe_preview(formatted_response.get('chiefComplaint'), 80)}")
        print(f"  historyOfPresentIllness: {_safe_preview(formatted_response.get('historyOfPresentIllness'), 80)}")
        print(f"  physicalExamination: {_safe_preview(formatted_response.get('physicalExamination'), 80)}")
        print(f"  diagnosis: {_safe_preview(formatted_response.get('diagnosis'), 80)}")
        print(f"  treatmentPlan: {_safe_preview(formatted_response.get('treatmentPlan'), 80)}")
        print(f"  additionalNotes (extracted content shown here): length={len(add_notes)}, value: {_safe_preview(add_notes, 400)}")
        print(f"  specialty: '{formatted_response.get('specialty', 'NOT SET')}'")
        print(f"  doc_type: '{formatted_response.get('doc_type', 'NOT SET')}'")
        print(f"  hasReportData: {bool(formatted_response.get('reportData'))}")
        print(f"  reportData keys: {list(formatted_response.get('reportData', {}).keys()) if isinstance(formatted_response.get('reportData'), dict) else 'NOT A DICT'}")
        print(f"  reportData sample values:")
        if isinstance(formatted_response.get('reportData'), dict):
            report_data = formatted_response.get('reportData')
            print(f"    - has summary (-> additionalNotes): {bool(report_data.get('summary'))}, len={len(report_data.get('summary') or '')}")
            print(f"    - has hpi: {bool(report_data.get('hpi'))}")
            print(f"    - has assessment: {bool(report_data.get('assessment'))}")
            print(f"    - has plan: {bool(report_data.get('plan'))}")
            print(f"    - has chief_complaint: {bool(report_data.get('chief_complaint'))}")
        
        return SuccessResponse(
            data=formatted_response,
            message="Report retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Report Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve report: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


# ──────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ──────────────────────────────────────────────────────────────────────────────

def generate_report_pdf(data: Dict[str, Any], doctor_name: str, specialty: str) -> bytes:
    """Generate PDF content for the report."""
    # This would integrate with a PDF generation library like reportlab
    # For now, return a simple placeholder
    pdf_content = f"""
    Medical Report
    Specialty: {specialty}
    Doctor: {doctor_name}
    Date: {datetime.now().strftime('%Y-%m-%d')}
    
    Report Data:
    {str(data)}
    """.encode('utf-8')
    
    return pdf_content

def has_lab_or_imaging_data(data: Dict[str, Any]) -> bool:
    """Check if report contains lab or imaging data."""
    lab_imaging_fields = ['lab_results', 'imaging_results', 'blood_tests', 'xray_results', 'mri_results']
    return any(field in data for field in lab_imaging_fields)

def create_diagnostic_report(payload: CreateReportRequest, doctor: DoctorUser) -> Dict[str, Any]:
    """Create FHIR DiagnosticReport for lab/imaging data."""
    return {
        "resourceType": "DiagnosticReport",
        "id": f"diag-{uuid4().hex[:8]}",
        "status": "final",
        "code": {
            "coding": [{
                "system": "http://loinc.org",
                "code": payload.code,
                "display": f"{payload.specialty} Diagnostic Report"
            }]
        },
        "subject": {
            "reference": f"Patient/{payload.patient_id}"
        },
        "effectiveDateTime": datetime.now(timezone.utc).isoformat(),
        "issued": datetime.now(timezone.utc).isoformat(),
        "performer": [{
            "reference": f"Practitioner/{doctor.id}"
        }],
        "result": []  # Would be populated with Observation references
    }

def extract_numeric_value(value: str) -> float:
    """Extract numeric value from vital sign string."""
    import re
    numbers = re.findall(r'\d+\.?\d*', value)
    return float(numbers[0]) if numbers else 0.0

def extract_unit(value: str) -> str:
    """Extract unit from vital sign string."""
    import re
    units = re.findall(r'[a-zA-Z/%]+', value)
    return units[0] if units else ""

def get_unit_code(vital_name: str) -> str:
    """Get standard unit code for vital sign."""
    unit_mapping = {
        "blood_pressure": "mm[Hg]",
        "temperature": "Cel",
        "heart_rate": "/min",
        "respiratory_rate": "/min", 
        "oxygen_saturation": "%",
        "weight": "kg",
        "height": "cm",
        "bmi": "kg/m2"
    }
    return unit_mapping.get(vital_name, "")
