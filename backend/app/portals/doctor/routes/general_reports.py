"""Doctor portal – General Visit Report (#001) router
Implements endpoints for the General Visit Report form with structured data handling
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Path, Body, Query, status, Request
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from .auth import get_current_doctor, DoctorUser
from app.db.session import get_db
from app.services.fhir_client import FHIRClient
from app.services.fhir_repository import fhir_repo
from app.services.messaging_service import MessagingService
from app.services.rbac_service import RBACService
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access, require_clinic_scope
from app.common.utils.tracing import get_trace_id
from app.crud.general_reports import general_report as general_report_crud
from app.common.schemas.general_reports import (
    GeneralReportData, GeneralReportResponse, GeneralReportSummary,
    CreateGeneralReportRequest, UpdateGeneralReportRequest, ReportStatus
)
from app.services.icd_code_service import IcdCodeService
from app.common.schemas.icd_codes import (
    IcdCodeSearchRequest, IcdCodeSearchResponse, IcdCodeResponse, IcdCodeSelectRequest
)

router = APIRouter(prefix="/general-reports", tags=["Doctor · General Reports"])

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

def get_doctor_profile_id(
    current_doctor: DoctorUser,
    db: Session
) -> str:
    """Get doctor profile ID from ehr.doctors table."""
    from app.common.models.doctor import Doctor
    doctor_profile = db.query(Doctor).filter(Doctor.user_id == current_doctor.id).first()
    if not doctor_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    return str(doctor_profile.id)

# ──────────────────────────────────────────────────────────────────────────────
# General Visit Report Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post("", response_model=SuccessResponse[GeneralReportResponse], status_code=status.HTTP_201_CREATED)
@audit_pii_access("write", "document_reference", "general_report")
async def create_general_report(
    request: Request,
    payload: CreateGeneralReportRequest = Body(...),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Create a General Visit Report (#001) with FHIR integration."""
    try:
        # Get AuthenticatedUser object for RBAC (RBAC methods expect AuthenticatedUser, not just ID)
        from app.common.models.user import User
        from app.common.auth.auth_service import AuthenticatedUser, AuthService
        
        user_obj = db.query(User).filter(User.id == current_doctor.id).first()
        if not user_obj:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Create AuthenticatedUser object with required attributes
        user_permissions = AuthService.get_user_permissions(user_obj.role) if user_obj.role else []
        authenticated_user = AuthenticatedUser(
            user=user_obj,
            permissions=user_permissions,
            clinic_id=getattr(user_obj, 'clinic_id', None)
        )
        
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

        # Get doctor profile ID (from ehr.doctors table, not user_id)
        doctor_profile_id = get_doctor_profile_id(current_doctor, db)

        # Create report using CRUD operations
        response_data = general_report_crud.create_report(
            db=db,
            patient_id=payload.patient_id,
            doctor_id=doctor_profile_id,  # Use doctor profile ID (references ehr.doctors.id)
            clinic_id=payload.clinic_id,
            report_data=payload.report_data,
            encounter_id=payload.encounter_id
        )

        # Send notification to patient
        messaging_service = MessagingService(db)
        await messaging_service.send_system_message(
            recipient_id=payload.patient_id,
            message_type="general_report_created",
            content=f"Your general visit report has been created and is available for review.",
            metadata={
                "report_id": response_data.id,
                "report_type": "general_visit",
                "doctor_name": current_doctor.full_name,
                "chief_complaint": payload.report_data.chief_complaint
            }
        )

        return SuccessResponse(
            data=response_data,
            message="General visit report created successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="General Report Creation Failed",
            status=500,
            detail=f"Failed to create general report: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("", response_model=PaginatedResponse[GeneralReportSummary])
@audit_pii_access("read", "document_reference", "general_reports_list")
async def list_general_reports(
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
    """List general visit reports with pagination."""
    try:
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_doctor.id, clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Get doctor profile ID (from ehr.doctors table, not user_id)
        from app.common.models.doctor import Doctor
        doctor_profile = db.query(Doctor).filter(Doctor.user_id == current_doctor.id).first()
        if not doctor_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
        doctor_profile_id = str(doctor_profile.id)

        # Get reports using CRUD operations
        reports = general_report_crud.list_reports(
            db=db,
            doctor_id=doctor_profile_id,  # Use doctor profile ID
            patient_id=patient_id,
            clinic_id=clinic_id,
            skip=(page - 1) * size,
            limit=size
        )
        
        total = general_report_crud.count_reports(
            db=db,
            doctor_id=doctor_profile_id,  # Use doctor profile ID
            patient_id=patient_id,
            clinic_id=clinic_id
        )

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
            title="General Reports Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve general reports: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/{report_id}", response_model=SuccessResponse[GeneralReportResponse])
@audit_pii_access("read", "document_reference", "general_report_detail")
async def get_general_report(
    request: Request,
    report_id: str = Path(..., description="Report ID"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get detailed general visit report."""
    try:
        # Get doctor profile ID (from ehr.doctors table, not user_id)
        from app.common.models.doctor import Doctor
        doctor_profile = db.query(Doctor).filter(Doctor.user_id == current_doctor.id).first()
        if not doctor_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
        doctor_profile_id = str(doctor_profile.id)

        # Get report using CRUD operations with proper access control
        response_data = general_report_crud.get_report_by_id(
            db=db,
            report_id=report_id,
            doctor_id=doctor_profile_id  # Use doctor profile ID
        )
        
        # Additional security check: Verify the doctor has access to this patient
        if response_data and not rbac_service.can_access_patient(
            current_doctor.id, 
            response_data.patient_id, 
            response_data.clinic_id
        ):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Patient Access Denied",
                status=403,
                detail="Doctor does not have access to this patient's report",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())
        
        if not response_data:
            raise HTTPException(status_code=404, detail="Report not found")

        return SuccessResponse(
            data=response_data,
            message="General visit report retrieved successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="General Report Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve general report: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.put("/{report_id}", response_model=SuccessResponse[GeneralReportResponse])
@audit_pii_access("write", "document_reference", "general_report_update")
async def update_general_report(
    request: Request,
    report_id: str = Path(..., description="Report ID"),
    payload: CreateGeneralReportRequest = Body(...),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Update a general visit report."""
    try:
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_doctor.id, payload.clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Validate patient access
        if not rbac_service.can_access_patient(current_doctor.id, payload.patient_id, payload.clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Patient Access Denied",
                status=403,
                detail="Doctor does not have access to this patient",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Get doctor profile ID (from ehr.doctors table, not user_id)
        from app.common.models.doctor import Doctor
        doctor_profile = db.query(Doctor).filter(Doctor.user_id == current_doctor.id).first()
        if not doctor_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
        doctor_profile_id = str(doctor_profile.id)

        # Update report using CRUD operations with proper access control
        response_data = general_report_crud.update_report(
            db=db,
            report_id=report_id,
            report_data=payload.report_data,
            doctor_id=doctor_profile_id,  # Use doctor profile ID
            patient_id=payload.patient_id,
            clinic_id=payload.clinic_id
        )
        
        if not response_data:
            raise HTTPException(status_code=404, detail="Report not found")

        return SuccessResponse(
            data=response_data,
            message="General visit report updated successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="General Report Update Failed",
            status=500,
            detail=f"Failed to update general report: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.delete("/{report_id}", response_model=SuccessResponse[Dict[str, str]])
@audit_pii_access("write", "document_reference", "general_report_delete")
async def delete_general_report(
    request: Request,
    report_id: str = Path(..., description="Report ID"),
    clinic_id: str = Query(..., description="Clinic ID for scoping"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Delete a general visit report."""
    try:
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_doctor.id, clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Get doctor profile ID (from ehr.doctors table, not user_id)
        from app.common.models.doctor import Doctor
        doctor_profile = db.query(Doctor).filter(Doctor.user_id == current_doctor.id).first()
        if not doctor_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
        doctor_profile_id = str(doctor_profile.id)

        # First get the report to verify patient access
        existing_report = general_report_crud.get_report_by_id(
            db=db,
            report_id=report_id,
            doctor_id=doctor_profile_id  # Use doctor profile ID
        )
        
        if not existing_report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Additional security check: Verify the doctor has access to this patient
        if not rbac_service.can_access_patient(
            current_doctor.id, 
            existing_report.patient_id, 
            existing_report.clinic_id
        ):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Patient Access Denied",
                status=403,
                detail="Doctor does not have access to this patient's report",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Delete report using CRUD operations with proper access control
        success = general_report_crud.delete_report(
            db=db,
            report_id=report_id,
            doctor_id=doctor_profile_id,  # Use doctor profile ID
            patient_id=existing_report.patient_id,
            clinic_id=existing_report.clinic_id
        )

        return SuccessResponse(
            data={"report_id": report_id, "status": "deleted"},
            message="General visit report deleted successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="General Report Deletion Failed",
            status=500,
            detail=f"Failed to delete general report: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


# ──────────────────────────────────────────────────────────────────────────────
# ICD Code Search Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/icd-codes/search", response_model=SuccessResponse[IcdCodeSearchResponse])
async def search_icd_codes_endpoint(
    query: Optional[str] = Query(None, description="Search query (code or description)"),
    version: str = Query("ICD-11", description="ICD version (ICD-10, ICD-11)"),
    language: str = Query("en", description="Language for description search (en, ru, uz)"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Search ICD codes by code or description.
    
    This endpoint allows doctors to search for ICD codes based on:
    - Code (e.g., "280385798")
    - Description/name (e.g., "electrocardiograph", "электрокардиограф")
    
    Supports multilingual search (English, Russian, Uzbek).
    """
    try:
        icd_service = IcdCodeService(db)
        result = icd_service.search(
            query=query,
            version=version,
            language=language,
            limit=limit,
            offset=offset
        )
        return SuccessResponse(data=result)
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="ICD Code Search Failed",
            status=500,
            detail=f"Failed to search ICD codes: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.post("/icd-codes/select", response_model=SuccessResponse[IcdCodeResponse])
async def select_icd_code_endpoint(
    payload: IcdCodeSelectRequest = Body(...),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Get ICD code by code.
    
    This endpoint retrieves a specific ICD code by its code value.
    Useful when the code is already known (e.g., from previous search or external system).
    """
    try:
        icd_service = IcdCodeService(db)
        result = icd_service.get_by_code(
            code=payload.code,
            version=payload.version
        )
        
        if not result:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND,
                title="ICD Code Not Found",
                status=404,
                detail=f"ICD code '{payload.code}' (version: {payload.version}) not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        return SuccessResponse(data=result)
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="ICD Code Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve ICD code: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/icd-codes/{code}", response_model=SuccessResponse[IcdCodeResponse])
async def get_icd_code_by_code_endpoint(
    code: str = Path(..., description="ICD code"),
    version: str = Query("ICD-11", description="ICD version (ICD-10, ICD-11)"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Get ICD code by code (path parameter version).
    
    Alternative endpoint to retrieve ICD code by code using path parameter.
    """
    try:
        icd_service = IcdCodeService(db)
        result = icd_service.get_by_code(
            code=code,
            version=version
        )
        
        if not result:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND,
                title="ICD Code Not Found",
                status=404,
                detail=f"ICD code '{code}' (version: {version}) not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        return SuccessResponse(data=result)
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="ICD Code Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve ICD code: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())
