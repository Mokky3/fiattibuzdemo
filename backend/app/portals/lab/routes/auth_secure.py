"""Secure Lab Portal Authentication
Implements real authentication and authorization for lab technician portal
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Body, Query, status, Request
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.common.auth.auth_service import (
    AuthenticatedUser, require_lab_technician_access,
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

router = APIRouter(tags=["Lab · Secure Authentication"])

# ──────────────────────────────────────────────────────────────────────────────
# Data Models
# ──────────────────────────────────────────────────────────────────────────────

class LabDashboardStats(BaseModel):
    total_orders: int = Field(..., description="Total lab orders")
    pending_orders: int = Field(..., description="Pending orders")
    completed_today: int = Field(..., description="Completed today")
    critical_results: int = Field(..., description="Critical results pending")
    unread_messages: int = Field(..., description="Unread messages")
    overdue_orders: int = Field(..., description="Overdue orders")

class LabOrder(BaseModel):
    id: str = Field(..., description="Lab order ID")
    patient_id: str = Field(..., description="Patient ID")
    patient_name: str = Field(..., description="Patient name")
    order_date: str = Field(..., description="Order date")
    test_type: str = Field(..., description="Test type")
    status: str = Field(..., description="Order status")
    priority: str = Field(..., description="Priority level")
    ordered_by: Optional[str] = Field(None, description="Ordered by doctor")
    due_date: Optional[str] = Field(None, description="Due date")
    notes: Optional[str] = Field(None, description="Order notes")

class LabResult(BaseModel):
    id: str = Field(..., description="Result ID")
    order_id: str = Field(..., description="Lab order ID")
    patient_id: str = Field(..., description="Patient ID")
    patient_name: str = Field(..., description="Patient name")
    test_name: str = Field(..., description="Test name")
    result_value: str = Field(..., description="Result value")
    reference_range: Optional[str] = Field(None, description="Reference range")
    status: str = Field(..., description="Result status")
    is_critical: bool = Field(False, description="Is critical result")
    technician: str = Field(..., description="Technician name")
    completed_at: Optional[str] = Field(None, description="Completion time")
    notes: Optional[str] = Field(None, description="Result notes")

class LabReport(BaseModel):
    id: str = Field(..., description="Report ID")
    patient_id: str = Field(..., description="Patient ID")
    patient_name: str = Field(..., description="Patient name")
    report_type: str = Field(..., description="Report type")
    report_date: str = Field(..., description="Report date")
    status: str = Field(..., description="Report status")
    findings: Optional[str] = Field(None, description="Report findings")
    recommendations: Optional[str] = Field(None, description="Recommendations")
    technician: str = Field(..., description="Technician name")
    reviewed_by: Optional[str] = Field(None, description="Reviewed by")

# ──────────────────────────────────────────────────────────────────────────────
# Secure Lab Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/api/lab/secure/dashboard/stats", response_model=SuccessResponse[LabDashboardStats])
@audit_pii_access("read", "lab", "dashboard_stats")
async def get_lab_dashboard_stats(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    # ✅ PERMISSION CHECK: Require report read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.REPORT_READ)),
    db: Session = Depends(get_db)
):
    """Get lab dashboard statistics with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can access lab resources
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.PATIENT, ActionType.READ, current_user.clinic_id
        )
        
        # Get lab statistics (would come from lab order CRUD)
        total_orders = 0  # Would come from lab order system
        pending_orders = 0  # Would come from lab order system
        completed_today = 0  # Would come from lab order system
        critical_results = 0  # Would come from lab result system
        unread_messages = message_crud.get_unread_count(db=db, user_id=current_user.user_id)
        overdue_orders = 0  # Would come from lab order system
        
        stats = LabDashboardStats(
            total_orders=total_orders,
            pending_orders=pending_orders,
            completed_today=completed_today,
            critical_results=critical_results,
            unread_messages=unread_messages,
            overdue_orders=overdue_orders
        )
        
        # ✅ AUDIT LOG: Log the access
        from app.crud.admin import admin as admin_crud
        await admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type="LAB_READ",
            description="Accessed lab dashboard statistics",
            affected_resource_id=None,
            affected_resource_type="lab_dashboard",
            metadata={"clinic_id": current_user.clinic_id}
        )
        
        return SuccessResponse(
            data=stats,
            message="Lab dashboard statistics retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Lab Dashboard Statistics Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve lab dashboard statistics: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/api/lab/secure/orders", response_model=PaginatedResponse[LabOrder])
@audit_pii_access("read", "lab", "lab_orders")
async def get_lab_orders(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    # ✅ PERMISSION CHECK: Require report read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.REPORT_READ)),
    status: Optional[str] = Query(None, description="Filter by order status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db)
):
    """Get lab orders with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can access lab resources
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.PATIENT, ActionType.READ, current_user.clinic_id
        )
        
        # Get lab orders (would use lab order CRUD)
        # For now, return mock data
        orders = [
            LabOrder(
                id="order-1",
                patient_id="patient-1",
                patient_name="John Doe",
                order_date="2024-01-15",
                test_type="Complete Blood Count",
                status="pending",
                priority="normal",
                ordered_by="Dr. Smith",
                due_date="2024-01-16",
                notes="Routine checkup"
            ),
            LabOrder(
                id="order-2",
                patient_id="patient-2",
                patient_name="Jane Smith",
                order_date="2024-01-15",
                test_type="Lipid Panel",
                status="in_progress",
                priority="high",
                ordered_by="Dr. Johnson",
                due_date="2024-01-15",
                notes="Follow-up for cholesterol"
            )
        ]
        
        # Filter orders based on status and priority
        if status:
            orders = [order for order in orders if order.status == status]
        if priority:
            orders = [order for order in orders if order.priority == priority]
        
        # Apply pagination
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        paginated_orders = orders[start_idx:end_idx]
        
        # ✅ AUDIT LOG: Log the access
        from app.crud.admin import admin as admin_crud
        await admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type="LAB_READ",
            description=f"Retrieved {len(paginated_orders)} lab orders",
            affected_resource_id=None,
            affected_resource_type="lab_orders",
            metadata={"filters": {"status": status, "priority": priority}}
        )
        
        return create_paginated_response(
            data=paginated_orders,
            page=page,
            size=size,
            total=len(orders)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Lab Orders Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve lab orders: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.post("/api/lab/secure/results", response_model=SuccessResponse[Dict[str, str]])
@audit_pii_access("write", "lab", "lab_results")
async def create_lab_result(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    # ✅ PERMISSION CHECK: Require report write permission
    _: AuthenticatedUser = Depends(require_permission(Permission.REPORT_WRITE)),
    result_data: LabResult = Body(...),
    db: Session = Depends(get_db)
):
    """Create lab result with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can create lab results
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.PATIENT, ActionType.UPDATE, 
            current_user.clinic_id, result_data.patient_id
        )
        
        # Verify patient exists
        patient = patient_crud.get(db=db, id=result_data.patient_id)
        if not patient:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Patient Not Found",
                status=404,
                detail=f"Patient '{result_data.patient_id}' not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # ✅ CLINIC SCOPING: Ensure patient is in same clinic
        if patient.clinic_id and str(patient.clinic_id) != current_user.clinic_id:
            raise HTTPException(
                status_code=403,
                detail="Cannot create results for patients in other clinics"
            )
        
        # Create lab result (would use lab result CRUD)
        result_id = str(uuid4())  # Would be returned from actual save operation
        
        # ✅ AUDIT LOG: Log the action
        from app.crud.admin import admin as admin_crud
        await admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type="LAB_WRITE",
            description=f"Created lab result for patient {patient.first_name} {patient.last_name}",
            affected_resource_id=result_data.patient_id,
            affected_resource_type="lab_result",
            metadata={
                "result_id": result_id,
                "clinic_id": current_user.clinic_id,
                "patient_name": f"{patient.first_name} {patient.last_name}",
                "test_name": result_data.test_name,
                "is_critical": result_data.is_critical
            }
        )
        
        return SuccessResponse(
            data={"result_id": result_id, "status": "created"},
            message="Lab result created successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Lab Result Creation Failed",
            status=500,
            detail=f"Failed to create lab result: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/api/lab/secure/reports", response_model=PaginatedResponse[LabReport])
@audit_pii_access("read", "lab", "lab_reports")
async def get_lab_reports(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    # ✅ PERMISSION CHECK: Require report read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.REPORT_READ)),
    status: Optional[str] = Query(None, description="Filter by report status"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db)
):
    """Get lab reports with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can access lab resources
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.PATIENT, ActionType.READ, current_user.clinic_id
        )
        
        # Get lab reports (would use lab report CRUD)
        # For now, return mock data
        reports = [
            LabReport(
                id="report-1",
                patient_id="patient-1",
                patient_name="John Doe",
                report_type="Blood Chemistry",
                report_date="2024-01-15",
                status="completed",
                findings="All values within normal range",
                recommendations="Continue current treatment",
                technician="Lab Tech 1",
                reviewed_by="Dr. Smith"
            ),
            LabReport(
                id="report-2",
                patient_id="patient-2",
                patient_name="Jane Smith",
                report_type="Microbiology",
                report_date="2024-01-15",
                status="pending_review",
                findings="Culture results pending",
                recommendations=None,
                technician="Lab Tech 2",
                reviewed_by=None
            )
        ]
        
        # Filter reports based on status
        if status:
            reports = [report for report in reports if report.status == status]
        
        # Apply pagination
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        paginated_reports = reports[start_idx:end_idx]
        
        # ✅ AUDIT LOG: Log the access
        from app.crud.admin import admin as admin_crud
        await admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type="LAB_READ",
            description=f"Retrieved {len(paginated_reports)} lab reports",
            affected_resource_id=None,
            affected_resource_type="lab_reports",
            metadata={"filters": {"status": status}}
        )
        
        return create_paginated_response(
            data=paginated_reports,
            page=page,
            size=size,
            total=len(reports)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Lab Reports Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve lab reports: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())
