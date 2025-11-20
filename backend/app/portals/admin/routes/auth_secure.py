"""Secure Admin Portal Authentication
Replaces all mock authentication with real authentication and authorization
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Body, Query, status, Request
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.common.auth.auth_service import (
    AuthenticatedUser, get_current_user, require_admin_access,
    require_permission, Permission, AuthService
)
from app.services.rbac_service import RBACService, ResourceType, ActionType
from app.common.models.user import User, UserRole, UserStatus
from app.common.models.admin import AdminActivity, ActivityType, SystemAlert
from app.common.models.hospital import Hospital, HospitalStatus
from app.crud.admin import admin as admin_crud
from app.crud.user import user as user_crud
from app.crud.hospital import hospital as hospital_crud
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id

router = APIRouter(tags=["Admin · Secure Authentication"])

# ──────────────────────────────────────────────────────────────────────────────
# Data Models
# ──────────────────────────────────────────────────────────────────────────────

class AdminDashboardStats(BaseModel):
    total_users: int = Field(..., description="Total number of users")
    active_clinics: int = Field(..., description="Number of active clinics")
    total_logs_today: int = Field(..., description="Logs generated today")
    active_roles: int = Field(..., description="Number of active roles")
    reports_generated: int = Field(..., description="Reports generated")
    pending_announcements: int = Field(..., description="Pending announcements")
    user_trend: float = Field(..., description="User growth trend percentage")
    clinic_trend: float = Field(..., description="Clinic growth trend percentage")
    logs_trend: float = Field(..., description="Logs trend percentage")
    reports_trend: float = Field(..., description="Reports trend percentage")

class SystemAlertSchema(BaseModel):
    id: str = Field(..., description="Alert ID")
    type: str = Field(..., description="Alert type")
    title: str = Field(..., description="Alert title")
    message: str = Field(..., description="Alert message")
    severity: str = Field(..., description="Alert severity")
    timestamp: str = Field(..., description="Alert timestamp")
    acknowledged: bool = Field(..., description="Whether alert is acknowledged")

class QuickAction(BaseModel):
    id: str = Field(..., description="Action ID")
    title: str = Field(..., description="Action title")
    description: str = Field(..., description="Action description")
    icon: str = Field(..., description="Action icon")
    url: str = Field(..., description="Action URL")
    permission_required: str = Field(..., description="Required permission")

# ──────────────────────────────────────────────────────────────────────────────
# Secure Admin Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/api/admin/secure/dashboard/stats", response_model=SuccessResponse[AdminDashboardStats])
@audit_pii_access("read", "admin", "dashboard_stats")
async def get_admin_dashboard_stats(
    request: Request,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db)
):
    """Get admin dashboard statistics with proper authentication."""
    try:
        # ✅ RBAC CHECK
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.SYSTEM_CONFIG, ActionType.READ, current_user.clinic_id
        )
        # Users
        total_users = db.query(User).count()
        # Active clinics
        active_clinics = db.query(Hospital).filter(Hospital.status == HospitalStatus.ACTIVE).count()
        # Logs today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        total_logs_today = db.query(AdminActivity).filter(AdminActivity.performed_at >= today_start).count()
        # Active roles
        active_roles = len(UserRole)
        # Reports generated today (placeholder)
        reports_generated = 0
        # Pending announcements
        pending_announcements = admin_crud.count_system_alerts(db=db, status="active")
        stats = AdminDashboardStats(
            total_users=total_users,
            active_clinics=active_clinics,
            total_logs_today=total_logs_today,
            active_roles=active_roles,
            reports_generated=reports_generated,
            pending_announcements=pending_announcements,
            user_trend=0.0,
            clinic_trend=0.0,
            logs_trend=0.0,
            reports_trend=0.0,
        )
        # Audit
        admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type=ActivityType.ADMIN_READ if hasattr(ActivityType, "ADMIN_READ") else ActivityType.VIEW,
            description="Accessed admin dashboard statistics",
            affected_resource_id=None,
            affected_resource_type="admin_dashboard",
            metadata={"clinic_id": current_user.clinic_id}
        )
        return SuccessResponse(data=stats, message="Dashboard statistics retrieved successfully")
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Dashboard Statistics Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve dashboard statistics: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/api/admin/secure/system/alerts", response_model=SuccessResponse[List[SystemAlertSchema]])
@audit_pii_access("read", "admin", "system_alerts")
async def get_system_alerts(
    request: Request,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    acknowledged: Optional[bool] = Query(None, description="Filter by acknowledgment status"),
    db: Session = Depends(get_db)
):
    """Get system alerts with proper authentication."""
    try:
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.SYSTEM_CONFIG, ActionType.READ, current_user.clinic_id
        )
        # Map acknowledged filter to status for admin_crud
        status_filter: Optional[str] = None
        if acknowledged is True:
            status_filter = "acknowledged"
        elif acknowledged is False:
            status_filter = "active"
        alerts = admin_crud.get_system_alerts(
            db=db,
            severity=severity,
            alert_type=None,
            status=status_filter,
            skip=0,
            limit=100,
        )
        alert_responses: List[SystemAlertSchema] = []
        for alert in alerts:
            # If clinic admin, enforce clinic scoping of alerts
            if current_user.role == UserRole.CLINIC_ADMIN and getattr(alert, "organization_id", None):
                if str(alert.organization_id) != current_user.clinic_id:
                    continue
            alert_responses.append(SystemAlertSchema(
                id=str(alert.id),
                type=alert.alert_type.value if alert.alert_type else "",
                title=alert.title,
                message=alert.message,
                severity=alert.severity.value if alert.severity else "",
                timestamp=alert.created_at.isoformat() if alert.created_at else "",
                acknowledged=bool(getattr(alert, "is_acknowledged", False))
            ))
        admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type=ActivityType.ADMIN_READ if hasattr(ActivityType, "ADMIN_READ") else ActivityType.VIEW,
            description=f"Retrieved {len(alert_responses)} system alerts",
            affected_resource_id=None,
            affected_resource_type="system_alerts",
            metadata={"filters": {"severity": severity, "acknowledged": acknowledged}}
        )
        return SuccessResponse(data=alert_responses, message="System alerts retrieved successfully")
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="System Alerts Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve system alerts: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/api/admin/secure/quick-actions", response_model=SuccessResponse[List[QuickAction]])
@audit_pii_access("read", "admin", "quick_actions")
async def get_quick_actions(
    request: Request,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    db: Session = Depends(get_db)
):
    """Get quick actions available to the current admin user."""
    try:
        quick_actions = []
        if Permission.USER_READ.value in current_user.permissions:
            quick_actions.append(QuickAction(
                id="manage-users",
                title="Manage Users",
                description="Add, edit, or remove system users",
                icon="users",
                url="/admin/users",
                permission_required=Permission.USER_READ.value
            ))
        if Permission.USER_WRITE.value in current_user.permissions:
            quick_actions.append(QuickAction(
                id="create-user",
                title="Create User",
                description="Add a new user to the system",
                icon="user-plus",
                url="/admin/users/create",
                permission_required=Permission.USER_WRITE.value
            ))
        if Permission.HOSPITAL_READ.value in current_user.permissions:
            quick_actions.append(QuickAction(
                id="manage-hospitals",
                title="Manage Hospitals",
                description="View and manage hospital information",
                icon="building",
                url="/admin/clinics",
                permission_required=Permission.HOSPITAL_READ.value
            ))
        if Permission.ADMIN_SYSTEM_CONFIG.value in current_user.permissions:
            quick_actions.append(QuickAction(
                id="system-settings",
                title="System Settings",
                description="Configure system-wide settings",
                icon="settings",
                url="/admin/settings",
                permission_required=Permission.ADMIN_SYSTEM_CONFIG.value
            ))
        if Permission.ADMIN_AUDIT_LOGS.value in current_user.permissions:
            quick_actions.append(QuickAction(
                id="audit-logs",
                title="Audit Logs",
                description="View system audit logs",
                icon="shield",
                url="/admin/logs",
                permission_required=Permission.ADMIN_AUDIT_LOGS.value
            ))
        admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type=ActivityType.ADMIN_READ if hasattr(ActivityType, "ADMIN_READ") else ActivityType.VIEW,
            description=f"Retrieved {len(quick_actions)} quick actions",
            affected_resource_id=None,
            affected_resource_type="quick_actions",
            metadata={"user_permissions": current_user.permissions}
        )
        return SuccessResponse(data=quick_actions, message="Quick actions retrieved successfully")
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Quick Actions Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve quick actions: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.post("/api/admin/secure/system/alerts/{alert_id}/acknowledge", response_model=SuccessResponse[Dict[str, str]])
@audit_pii_access("write", "admin", "alert_acknowledge")
async def acknowledge_system_alert(
    request: Request,
    alert_id: str,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_WRITE)),
    db: Session = Depends(get_db)
):
    """Acknowledge a system alert with proper authentication."""
    try:
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.SYSTEM_CONFIG, ActionType.UPDATE, current_user.clinic_id
        )
        # Fetch alert for scoping
        alert: SystemAlert | None = db.query(SystemAlert).filter(SystemAlert.id == alert_id).first()
        if not alert:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Alert Not Found",
                status=404,
                detail=f"System alert '{alert_id}' not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        if current_user.role == UserRole.CLINIC_ADMIN and getattr(alert, "organization_id", None):
            if str(alert.organization_id) != current_user.clinic_id:
                raise HTTPException(status_code=403, detail="Cannot acknowledge alerts from other clinics")
        # Acknowledge (mark read)
        updated = admin_crud.mark_alert_read(db=db, alert_id=alert_id, acknowledged_by=current_user.user_id)
        if not updated:
            problem = create_problem_detail(
                error_type=ErrorType.INTERNAL_ERROR,
                title="Alert Update Failed",
                status=500,
                detail="Failed to acknowledge alert",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=500, detail=problem.dict())
        admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type=ActivityType.UPDATE,
            description=f"Acknowledged system alert: {alert.title}",
            affected_resource_id=str(alert.id),
            affected_resource_type="system_alert",
            metadata={"alert_type": alert.alert_type.value if alert.alert_type else None, "severity": alert.severity.value if alert.severity else None}
        )
        return SuccessResponse(data={"status": "acknowledged"}, message="System alert acknowledged successfully")
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Alert Acknowledgment Failed",
            status=500,
            detail=f"Failed to acknowledge alert: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())
