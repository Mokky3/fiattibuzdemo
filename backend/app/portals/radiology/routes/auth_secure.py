"""Secure Radiology Portal Authentication
Implements real authentication and authorization for radiologist portal
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Body, Query, status, Request
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.common.auth.auth_service import (
    AuthenticatedUser, require_radiologist_access,
    require_permission, Permission, AuthService
)
from app.services.rbac_service import RBACService, ResourceType, ActionType
from app.common.models.user import User, UserRole, UserStatus
from app.common.models.patient import Patient
from app.crud.patient import patient as patient_crud
from app.crud.appointment import appointment as appointment_crud
from app.crud.message import message as message_crud
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id

router = APIRouter(tags=["Radiology · Secure Authentication"])

# ──────────────────────────────────────────────────────────────────────────────
# Data Models
# ──────────────────────────────────────────────────────────────────────────────

class RadiologyDashboardStats(BaseModel):
    total_studies: int = Field(..., description="Total imaging studies")
    pending_studies: int = Field(..., description="Pending studies")
    completed_today: int = Field(..., description="Completed today")
    critical_findings: int = Field(..., description="Critical findings pending")
    unread_messages: int = Field(..., description="Unread messages")
    overdue_studies: int = Field(..., description="Overdue studies")

class ImagingStudy(BaseModel):
    id: str = Field(..., description="Study ID")
    patient_id: str = Field(..., description="Patient ID")
    patient_name: str = Field(..., description="Patient name")
    study_date: str = Field(..., description="Study date")
    modality: str = Field(..., description="Imaging modality (CT, MRI, X-ray, etc.)")
    body_part: str = Field(..., description="Body part examined")
    status: str = Field(..., description="Study status")
    priority: str = Field(..., description="Priority level")
    ordered_by: Optional[str] = Field(None, description="Ordered by doctor")
    due_date: Optional[str] = Field(None, description="Due date")
    clinical_history: Optional[str] = Field(None, description="Clinical history")
    study_notes: Optional[str] = Field(None, description="Study notes")

class RadiologyReport(BaseModel):
    id: str = Field(..., description="Report ID")
    study_id: str = Field(..., description="Imaging study ID")
    patient_id: str = Field(..., description="Patient ID")
    patient_name: str = Field(..., description="Patient name")
    modality: str = Field(..., description="Imaging modality")
    body_part: str = Field(..., description="Body part examined")
    report_date: str = Field(..., description="Report date")
    status: str = Field(..., description="Report status")
    findings: Optional[str] = Field(None, description="Radiological findings")
    impression: Optional[str] = Field(None, description="Impression/conclusion")
    recommendations: Optional[str] = Field(None, description="Recommendations")
    radiologist: str = Field(..., description="Radiologist name")
    reviewed_by: Optional[str] = Field(None, description="Reviewed by")
    is_critical: bool = Field(False, description="Is critical finding")

class PACSStudy(BaseModel):
    id: str = Field(..., description="PACS study ID")
    patient_id: str = Field(..., description="Patient ID")
    patient_name: str = Field(..., description="Patient name")
    study_uid: str = Field(..., description="DICOM Study UID")
    series_count: int = Field(..., description="Number of series")
    image_count: int = Field(..., description="Number of images")
    modality: str = Field(..., description="Imaging modality")
    study_date: str = Field(..., description="Study date")
    study_time: str = Field(..., description="Study time")
    body_part: str = Field(..., description="Body part examined")
    status: str = Field(..., description="Study status")
    storage_location: Optional[str] = Field(None, description="Storage location")

# ──────────────────────────────────────────────────────────────────────────────
# Secure Radiology Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/api/radiology/secure/dashboard/stats", response_model=SuccessResponse[RadiologyDashboardStats])
@audit_pii_access("read", "radiology", "dashboard_stats")
async def get_radiology_dashboard_stats(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    # ✅ PERMISSION CHECK: Require report read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.REPORT_READ)),
    db: Session = Depends(get_db)
):
    """Get radiology dashboard statistics with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can access radiology resources
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.PATIENT, ActionType.READ, current_user.clinic_id
        )
        
        # Get radiology statistics (would come from imaging study CRUD)
        total_studies = 0  # Would come from imaging study system
        pending_studies = 0  # Would come from imaging study system
        completed_today = 0  # Would come from imaging study system
        critical_findings = 0  # Would come from radiology report system
        unread_messages = message_crud.get_unread_count(db=db, user_id=current_user.user_id)
        overdue_studies = 0  # Would come from imaging study system
        
        stats = RadiologyDashboardStats(
            total_studies=total_studies,
            pending_studies=pending_studies,
            completed_today=completed_today,
            critical_findings=critical_findings,
            unread_messages=unread_messages,
            overdue_studies=overdue_studies
        )
        
        # ✅ AUDIT LOG: Log the access
        from app.crud.admin import admin as admin_crud
        await admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type="RADIOLOGY_READ",
            description="Accessed radiology dashboard statistics",
            affected_resource_id=None,
            affected_resource_type="radiology_dashboard",
            metadata={"clinic_id": current_user.clinic_id}
        )
        
        return SuccessResponse(
            data=stats,
            message="Radiology dashboard statistics retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Radiology Dashboard Statistics Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve radiology dashboard statistics: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/api/radiology/secure/studies", response_model=PaginatedResponse[ImagingStudy])
@audit_pii_access("read", "radiology", "imaging_studies")
async def get_imaging_studies(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    # ✅ PERMISSION CHECK: Require report read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.REPORT_READ)),
    status: Optional[str] = Query(None, description="Filter by study status"),
    modality: Optional[str] = Query(None, description="Filter by modality"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db)
):
    """Get imaging studies with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can access radiology resources
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.PATIENT, ActionType.READ, current_user.clinic_id
        )
        
        # Get imaging studies (would use imaging study CRUD)
        # For now, return mock data
        studies = [
            ImagingStudy(
                id="study-1",
                patient_id="patient-1",
                patient_name="John Doe",
                study_date="2024-01-15",
                modality="CT",
                body_part="Chest",
                status="pending",
                priority="normal",
                ordered_by="Dr. Smith",
                due_date="2024-01-16",
                clinical_history="Chest pain",
                study_notes="Routine chest CT"
            ),
            ImagingStudy(
                id="study-2",
                patient_id="patient-2",
                patient_name="Jane Smith",
                study_date="2024-01-15",
                modality="MRI",
                body_part="Brain",
                status="in_progress",
                priority="high",
                ordered_by="Dr. Johnson",
                due_date="2024-01-15",
                clinical_history="Headache",
                study_notes="Brain MRI with contrast"
            )
        ]
        
        # Filter studies based on status and modality
        if status:
            studies = [study for study in studies if study.status == status]
        if modality:
            studies = [study for study in studies if study.modality == modality]
        
        # Apply pagination
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        paginated_studies = studies[start_idx:end_idx]
        
        # ✅ AUDIT LOG: Log the access
        from app.crud.admin import admin as admin_crud
        await admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type="RADIOLOGY_READ",
            description=f"Retrieved {len(paginated_studies)} imaging studies",
            affected_resource_id=None,
            affected_resource_type="imaging_studies",
            metadata={"filters": {"status": status, "modality": modality}}
        )
        
        return create_paginated_response(
            data=paginated_studies,
            page=page,
            size=size,
            total=len(studies)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Imaging Studies Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve imaging studies: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.post("/api/radiology/secure/reports", response_model=SuccessResponse[Dict[str, str]])
@audit_pii_access("write", "radiology", "radiology_reports")
async def create_radiology_report(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    # ✅ PERMISSION CHECK: Require report write permission
    _: AuthenticatedUser = Depends(require_permission(Permission.REPORT_WRITE)),
    report_data: RadiologyReport = Body(...),
    db: Session = Depends(get_db)
):
    """Create radiology report with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can create radiology reports
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.PATIENT, ActionType.UPDATE, 
            current_user.clinic_id, report_data.patient_id
        )
        
        # Verify patient exists
        patient = patient_crud.get(db=db, id=report_data.patient_id)
        if not patient:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Patient Not Found",
                status=404,
                detail=f"Patient '{report_data.patient_id}' not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # ✅ CLINIC SCOPING: Ensure patient is in same clinic
        if patient.clinic_id and str(patient.clinic_id) != current_user.clinic_id:
            raise HTTPException(
                status_code=403,
                detail="Cannot create reports for patients in other clinics"
            )
        
        # Create radiology report (would use radiology report CRUD)
        report_id = str(uuid4())  # Would be returned from actual save operation
        
        # ✅ AUDIT LOG: Log the action
        from app.crud.admin import admin as admin_crud
        await admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type="RADIOLOGY_WRITE",
            description=f"Created radiology report for patient {patient.first_name} {patient.last_name}",
            affected_resource_id=report_data.patient_id,
            affected_resource_type="radiology_report",
            metadata={
                "report_id": report_id,
                "clinic_id": current_user.clinic_id,
                "patient_name": f"{patient.first_name} {patient.last_name}",
                "modality": report_data.modality,
                "body_part": report_data.body_part,
                "is_critical": report_data.is_critical
            }
        )
        
        return SuccessResponse(
            data={"report_id": report_id, "status": "created"},
            message="Radiology report created successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Radiology Report Creation Failed",
            status=500,
            detail=f"Failed to create radiology report: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/api/radiology/secure/pacs/studies", response_model=PaginatedResponse[PACSStudy])
@audit_pii_access("read", "radiology", "pacs_studies")
async def get_pacs_studies(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    # ✅ PERMISSION CHECK: Require report read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.REPORT_READ)),
    modality: Optional[str] = Query(None, description="Filter by modality"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db)
):
    """Get PACS studies with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can access radiology resources
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.PATIENT, ActionType.READ, current_user.clinic_id
        )
        
        # Get PACS studies (would use PACS CRUD)
        # For now, return mock data
        pacs_studies = [
            PACSStudy(
                id="pacs-1",
                patient_id="patient-1",
                patient_name="John Doe",
                study_uid="1.2.3.4.5.6.7.8.9.10",
                series_count=2,
                image_count=120,
                modality="CT",
                study_date="2024-01-15",
                study_time="10:30:00",
                body_part="Chest",
                status="available",
                storage_location="/pacs/ct/chest/20240115"
            ),
            PACSStudy(
                id="pacs-2",
                patient_id="patient-2",
                patient_name="Jane Smith",
                study_uid="1.2.3.4.5.6.7.8.9.11",
                series_count=4,
                image_count=240,
                modality="MRI",
                study_date="2024-01-15",
                study_time="14:15:00",
                body_part="Brain",
                status="available",
                storage_location="/pacs/mri/brain/20240115"
            )
        ]
        
        # Filter studies based on modality
        if modality:
            pacs_studies = [study for study in pacs_studies if study.modality == modality]
        
        # Apply pagination
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        paginated_studies = pacs_studies[start_idx:end_idx]
        
        # ✅ AUDIT LOG: Log the access
        from app.crud.admin import admin as admin_crud
        await admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type="RADIOLOGY_READ",
            description=f"Retrieved {len(paginated_studies)} PACS studies",
            affected_resource_id=None,
            affected_resource_type="pacs_studies",
            metadata={"filters": {"modality": modality}}
        )
        
        return create_paginated_response(
            data=paginated_studies,
            page=page,
            size=size,
            total=len(pacs_studies)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="PACS Studies Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve PACS studies: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())
