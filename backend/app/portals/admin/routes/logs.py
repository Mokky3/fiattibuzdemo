"""Admin portal - logs router
System logs and audit trail management connected to models and CRUD
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.common.models.admin import (
    AdminActivity, ActivityType, SystemAlert, AlertType, AlertSeverity
)
from app.common.models.user import User, UserRole
from app.crud.admin import admin as admin_crud
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id
from app.common.auth.auth_service import (
    AuthenticatedUser, require_admin_access, require_permission, Permission
)

router = APIRouter(tags=["Admin · System Logs"])

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Data Models
# ──────────────────────────────────────────────────────────────────────────────

class ActivityLogResponse(BaseModel):
    id: str = Field(..., description="Activity log ID")
    admin_id: str = Field(..., description="Admin user ID")
    admin_name: str = Field(..., description="Admin user name")
    activity_type: str = Field(..., description="Activity type")
    description: str = Field(..., description="Activity description")
    affected_resource_id: Optional[str] = Field(None, description="Affected resource ID")
    affected_resource_type: Optional[str] = Field(None, description="Affected resource type")
    ip_address: Optional[str] = Field(None, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")
    created_at: str = Field(..., description="Created timestamp")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

class SystemLogResponse(BaseModel):
    id: str = Field(..., description="System log ID")
    level: str = Field(..., description="Log level")
    message: str = Field(..., description="Log message")
    module: str = Field(..., description="Module name")
    function: str = Field(..., description="Function name")
    line_number: Optional[int] = Field(None, description="Line number")
    timestamp: str = Field(..., description="Timestamp")
    user_id: Optional[str] = Field(None, description="User ID")
    session_id: Optional[str] = Field(None, description="Session ID")
    request_id: Optional[str] = Field(None, description="Request ID")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

class AuditTrailResponse(BaseModel):
    id: str = Field(..., description="Audit trail ID")
    user_id: str = Field(..., description="User ID")
    user_name: str = Field(..., description="User name")
    action: str = Field(..., description="Action performed")
    resource_type: str = Field(..., description="Resource type")
    resource_id: str = Field(..., description="Resource ID")
    old_values: Optional[Dict[str, Any]] = Field(None, description="Old values")
    new_values: Optional[Dict[str, Any]] = Field(None, description="New values")
    ip_address: Optional[str] = Field(None, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")
    timestamp: str = Field(..., description="Timestamp")

class LogStatsResponse(BaseModel):
    total_activities: int = Field(..., description="Total activity logs")
    total_system_logs: int = Field(..., description="Total system logs")
    total_audit_trails: int = Field(..., description="Total audit trails")
    activities_by_type: Dict[str, int] = Field(..., description="Activities count by type")
    logs_by_level: Dict[str, int] = Field(..., description="Logs count by level")
    recent_activities: int = Field(..., description="Recent activities (last 24 hours)")

# ──────────────────────────────────────────────────────────────────────────────
# Activity Logs Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/activities", response_model=PaginatedResponse[ActivityLogResponse])
@audit_pii_access("read", "activity_log", "activities_list")
async def get_activity_logs(
    request: Request,
    activity_type: Optional[str] = Query(None, description="Filter by activity type"),
    admin_id: Optional[str] = Query(None, description="Filter by admin ID"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    date_from: Optional[str] = Query(None, description="Filter from date (ISO format)"),
    date_to: Optional[str] = Query(None, description="Filter to date (ISO format)"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db)
):
    """Get activity logs with filtering and pagination."""
    try:
        # Parse date filters
        date_from_obj = None
        date_to_obj = None
        if date_from and date_from != 'undefined':
            try:
                date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            except ValueError:
                # If date format is invalid, ignore the filter
                pass
        if date_to and date_to != 'undefined':
            try:
                date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            except ValueError:
                # If date format is invalid, ignore the filter
                pass
        
        # Get activity logs using CRUD
        activities = admin_crud.get_activity_logs(
            db=db,
            activity_type=activity_type,
            admin_id=admin_id,
            resource_type=resource_type,
            date_from=date_from_obj,
            date_to=date_to_obj,
            skip=(page - 1) * size,
            limit=size
        )
        
        # Transform to response format
        activity_responses = []
        for activity in activities:
            activity_responses.append(ActivityLogResponse(
                id=str(activity.id),
                admin_id=str(activity.admin_id),
                admin_name=activity.admin_name,
                activity_type=activity.activity_type.value if activity.activity_type else "",
                description=activity.description,
                affected_resource_id=str(activity.affected_resource_id) if activity.affected_resource_id else None,
                affected_resource_type=activity.affected_resource_type,
                ip_address=activity.ip_address,
                user_agent=activity.user_agent,
                created_at=activity.created_at.isoformat() if activity.created_at else "",
                metadata=activity.metadata
            ))
        
        # Get total count
        total = admin_crud.count_activity_logs(
            db=db,
            activity_type=activity_type,
            admin_id=admin_id,
            resource_type=resource_type,
            date_from=date_from_obj,
            date_to=date_to_obj
        )
        
        return create_paginated_response(
            items=activity_responses,
            page=page,
            size=size,
            total=total
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Activity Logs Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve activity logs: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/activities/{activity_id}", response_model=SuccessResponse[ActivityLogResponse])
@audit_pii_access("read", "activity_log", "activity_detail")
async def get_activity_log(
    request: Request,
    activity_id: str,
    db: Session = Depends(get_db)
):
    """Get specific activity log details."""
    try:
        activity = admin_crud.get_activity_log(db=db, activity_id=activity_id)
        
        if not activity:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Activity Log Not Found",
                status=404,
                detail=f"Activity log '{activity_id}' not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        activity_response = ActivityLogResponse(
            id=str(activity.id),
            admin_id=str(activity.admin_id),
            admin_name=activity.admin_name,
            activity_type=activity.activity_type.value if activity.activity_type else "",
            description=activity.description,
            affected_resource_id=str(activity.affected_resource_id) if activity.affected_resource_id else None,
            affected_resource_type=activity.affected_resource_type,
            ip_address=activity.ip_address,
            user_agent=activity.user_agent,
            created_at=activity.created_at.isoformat() if activity.created_at else "",
            metadata=activity.metadata
        )
        
        return SuccessResponse(
            data=activity_response,
            message="Activity log retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Activity Log Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve activity log: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# System Logs Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/system", response_model=PaginatedResponse[SystemLogResponse])
@audit_pii_access("read", "system_log", "system_logs_list")
async def get_system_logs(
    request: Request,
    level: Optional[str] = Query(None, description="Filter by log level"),
    module: Optional[str] = Query(None, description="Filter by module"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    date_from: Optional[str] = Query(None, description="Filter from date (ISO format)"),
    date_to: Optional[str] = Query(None, description="Filter to date (ISO format)"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(100, ge=1, le=500, description="Page size"),
    db: Session = Depends(get_db)
):
    """Get system logs with filtering and pagination."""
    try:
        # Parse date filters
        date_from_obj = None
        date_to_obj = None
        if date_from and date_from != 'undefined':
            try:
                date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            except ValueError:
                # If date format is invalid, ignore the filter
                pass
        if date_to and date_to != 'undefined':
            try:
                date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            except ValueError:
                # If date format is invalid, ignore the filter
                pass
        
        # Get system logs using CRUD
        logs = admin_crud.get_system_logs(
            db=db,
            level=level,
            module=module,
            user_id=user_id,
            date_from=date_from_obj,
            date_to=date_to_obj,
            skip=(page - 1) * size,
            limit=size
        )
        
        # Transform to response format
        log_responses = []
        for log in logs:
            log_responses.append(SystemLogResponse(
                id=str(log.id),
                level=log.level,
                message=log.message,
                module=log.module,
                function=log.function,
                line_number=log.line_number,
                timestamp=log.timestamp.isoformat() if log.timestamp else "",
                user_id=str(log.user_id) if log.user_id else None,
                session_id=log.session_id,
                request_id=log.request_id,
                metadata=log.metadata
            ))
        
        # Get total count
        total = admin_crud.count_system_logs(
            db=db,
            level=level,
            module=module,
            user_id=user_id,
            date_from=date_from_obj,
            date_to=date_to_obj
        )
        
        return create_paginated_response(
            items=log_responses,
            page=page,
            size=size,
            total=total
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="System Logs Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve system logs: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Audit Trail Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/audit-trail", response_model=PaginatedResponse[AuditTrailResponse])
@audit_pii_access("read", "audit_trail", "audit_trail_list")
async def get_audit_trail(
    request: Request,
    clinic_id: Optional[str] = Query(None, description="Filter by clinic ID"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    action: Optional[str] = Query(None, description="Filter by action"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    date_from: Optional[str] = Query(None, description="Filter from date (ISO format)"),
    date_to: Optional[str] = Query(None, description="Filter to date (ISO format)"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ))
):
    """Get comprehensive audit trail showing all staff activities across connected clinics."""
    try:
        # Parse date filters
        date_from_obj = None
        date_to_obj = None
        if date_from and date_from != 'undefined':
            try:
                date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            except ValueError:
                # If date format is invalid, ignore the filter
                pass
        if date_to and date_to != 'undefined':
            try:
                date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            except ValueError:
                # If date format is invalid, ignore the filter
                pass
        
        # Determine clinic filtering
        target_clinic_id = None
        if clinic_id and clinic_id != 'global':
            # Check if user has access to this specific clinic
            if current_user.role != "SUPER_ADMIN":
                user = db.query(User).filter(User.id == current_user.user_id).first()
                if user and user.organization_id:
                    from uuid import UUID
                    user_clinic_id = str(user.organization_id)
                    if user_clinic_id != clinic_id:
                        problem = create_problem_detail(
                            error_type=ErrorType.ACCESS_DENIED_ERROR,
                            title="Access Denied",
                            status=403,
                            detail=f"User does not have access to clinic {clinic_id}",
                            trace_id=get_trace_id(),
                        )
                        raise HTTPException(status_code=403, detail=problem.dict())
            target_clinic_id = clinic_id
        elif current_user.role != "SUPER_ADMIN":
            # For non-super admins, filter to their clinic only
            user = db.query(User).filter(User.id == current_user.user_id).first()
            if user and user.organization_id:
                target_clinic_id = str(user.organization_id)
        
        # Get comprehensive audit trail data
        audit_responses = []
        
        # 1. Get AdminActivity records (admin activities)
        # Filter by clinic if specified
        if target_clinic_id:
            # Get users from the target clinic
            clinic_users = db.query(User).filter(User.organization_id == target_clinic_id).all()
            clinic_user_ids = [str(user.id) for user in clinic_users]
            
            # Filter admin activities by clinic users
            admin_activities = []
            for user_id in clinic_user_ids:
                user_activities = admin_crud.get_activity_logs(
                    db=db,
                    activity_type=action,
                    admin_id=user_id,
                    resource_type=resource_type,
                    date_from=date_from_obj,
                    date_to=date_to_obj,
                    skip=0,  # We'll handle pagination later
                    limit=1000  # Get more to filter properly
                )
                admin_activities.extend(user_activities)
        else:
            admin_activities = admin_crud.get_activity_logs(
                db=db,
                activity_type=action,
                admin_id=user_id,
                resource_type=resource_type,
                date_from=date_from_obj,
                date_to=date_to_obj,
                skip=(page - 1) * size,
                limit=size
            )
        
        for activity in admin_activities:
            # Get user info for admin activities
            user = db.query(User).filter(User.id == activity.user_id).first()
            user_name = f"{user.first_name} {user.last_name}".strip() if user else "Unknown User"
            
            audit_responses.append(AuditTrailResponse(
                id=str(activity.id),
                user_id=str(activity.user_id),
                user_name=user_name,
                action=activity.action or activity.activity_type.value if activity.activity_type else "Unknown Action",
                resource_type=activity.resource_type or "admin_activity",
                resource_id=str(activity.resource_id) if activity.resource_id else "",
                old_values=activity.old_values,
                new_values=activity.new_values,
                ip_address=activity.ip_address,
                user_agent=activity.user_agent,
                timestamp=activity.performed_at.isoformat() if activity.performed_at else ""
            ))
        
        # 2. Get AuditTrail records (general audit trail)
        audit_trails = admin_crud.get_audit_trail(
            db=db,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            date_from=date_from_obj,
            date_to=date_to_obj,
            skip=(page - 1) * size,
            limit=size
        )
        
        for audit in audit_trails:
            audit_responses.append(AuditTrailResponse(
                id=str(audit.id),
                user_id=str(audit.user_id),
                user_name=audit.user_name or "Unknown User",
                action=audit.action,
                resource_type=audit.resource_type,
                resource_id=str(audit.resource_id),
                old_values=audit.old_values,
                new_values=audit.new_values,
                ip_address=audit.ip_address,
                user_agent=audit.user_agent,
                timestamp=audit.timestamp.isoformat() if audit.timestamp else ""
            ))
        
        # 3. Get SystemLog records (system activities)
        system_logs = admin_crud.get_system_logs(
            db=db,
            level=None,  # Get all levels
            module=resource_type,
            user_id=user_id,
            date_from=date_from_obj,
            date_to=date_to_obj,
            skip=(page - 1) * size,
            limit=size
        )
        
        for log in system_logs:
            # Get user info for system logs
            user = db.query(User).filter(User.id == log.user_id).first() if log.user_id else None
            user_name = f"{user.first_name} {user.last_name}".strip() if user else "System"
            
            audit_responses.append(AuditTrailResponse(
                id=str(log.id),
                user_id=str(log.user_id) if log.user_id else "system",
                user_name=user_name,
                action=f"System {log.level}: {log.message[:100]}",
                resource_type=log.module or "system",
                resource_id="",
                old_values=None,
                new_values={"level": log.level, "module": log.module, "function": log.function},
                ip_address=None,
                user_agent=None,
                timestamp=log.timestamp.isoformat() if log.timestamp else ""
            ))
        
        # Sort all responses by timestamp (most recent first)
        audit_responses.sort(key=lambda x: x.timestamp, reverse=True)
        
        # Apply pagination to the combined results
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        paginated_responses = audit_responses[start_idx:end_idx]
        
        # Get total count from all sources
        admin_count = admin_crud.count_activity_logs(
            db=db,
            activity_type=action,
            admin_id=user_id,
            resource_type=resource_type,
            date_from=date_from_obj,
            date_to=date_to_obj
        )
        
        audit_count = admin_crud.count_audit_trail(
            db=db,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            date_from=date_from_obj,
            date_to=date_to_obj
        )
        
        system_count = admin_crud.count_system_logs(
            db=db,
            level=None,
            module=resource_type,
            user_id=user_id,
            date_from=date_from_obj,
            date_to=date_to_obj
        )
        
        total = admin_count + audit_count + system_count
        
        return create_paginated_response(
            items=paginated_responses,
            page=page,
            size=size,
            total=total
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Audit Trail Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve audit trail: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Clinic-Specific Logs Endpoint
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/clinic/{clinic_id}", response_model=PaginatedResponse[AuditTrailResponse])
@audit_pii_access("read", "clinic_logs", "clinic_logs_list")
async def get_clinic_logs(
    request: Request,
    clinic_id: str,
    log_type: Optional[str] = Query("all", description="Filter by log type: all, activities, system, errors, warnings"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    date_from: Optional[str] = Query(None, description="Filter from date (ISO format)"),
    date_to: Optional[str] = Query(None, description="Filter to date (ISO format)"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ))
):
    """Get comprehensive logs for a specific clinic including staff activities, warnings, and errors."""
    try:
        # Check if user has access to this clinic
        if current_user.role != "SUPER_ADMIN":
            user = db.query(User).filter(User.id == current_user.user_id).first()
            if user and user.organization_id:
                from uuid import UUID
                user_clinic_id = str(user.organization_id)
                if user_clinic_id != clinic_id:
                    problem = create_problem_detail(
                        error_type=ErrorType.ACCESS_DENIED_ERROR,
                        title="Access Denied",
                        status=403,
                        detail=f"User does not have access to clinic {clinic_id}",
                        trace_id=get_trace_id(),
                    )
                    raise HTTPException(status_code=403, detail=problem.dict())
        
        # Parse date filters
        date_from_obj = None
        date_to_obj = None
        if date_from and date_from != 'undefined':
            try:
                date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            except ValueError:
                # If date format is invalid, ignore the filter
                pass
        if date_to and date_to != 'undefined':
            try:
                date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            except ValueError:
                # If date format is invalid, ignore the filter
                pass
        
        # Get clinic users
        clinic_users = db.query(User).filter(User.organization_id == clinic_id).all()
        clinic_user_ids = [str(user.id) for user in clinic_users]
        
        # Get comprehensive logs for this clinic
        clinic_logs = []
        
        # 1. Get AdminActivity records for clinic users
        if log_type in ["all", "activities"]:
            for user_id in clinic_user_ids:
                user_activities = admin_crud.get_activity_logs(
                    db=db,
                    activity_type=None,
                    admin_id=user_id,
                    resource_type=None,
                    date_from=date_from_obj,
                    date_to=date_to_obj,
                    skip=0,
                    limit=1000
                )
                for activity in user_activities:
                    user = db.query(User).filter(User.id == activity.user_id).first()
                    user_name = f"{user.first_name} {user.last_name}".strip() if user else "Unknown User"
                    
                    clinic_logs.append(AuditTrailResponse(
                        id=str(activity.id),
                        user_id=str(activity.user_id),
                        user_name=user_name,
                        action=activity.action or activity.activity_type.value if activity.activity_type else "Unknown Action",
                        resource_type=activity.resource_type or "admin_activity",
                        resource_id=str(activity.resource_id) if activity.resource_id else "",
                        old_values=activity.old_values,
                        new_values=activity.new_values,
                        ip_address=activity.ip_address,
                        user_agent=activity.user_agent,
                        timestamp=activity.performed_at.isoformat() if activity.performed_at else ""
                    ))
        
        # 2. Get SystemLog records for clinic users (errors, warnings, info)
        if log_type in ["all", "system", "errors", "warnings"]:
            system_logs = admin_crud.get_system_logs(
                db=db,
                level=None,
                module=None,
                user_id=None,  # We'll filter by clinic users manually
                date_from=date_from_obj,
                date_to=date_to_obj,
                skip=0,
                limit=1000
            )
            
            for log in system_logs:
                # Filter by clinic users
                if log.user_id and str(log.user_id) in clinic_user_ids:
                    user = db.query(User).filter(User.id == log.user_id).first()
                    user_name = f"{user.first_name} {user.last_name}".strip() if user else "System"
                    
                    # Filter by log type
                    if log_type == "errors" and log.level not in ["ERROR", "CRITICAL"]:
                        continue
                    if log_type == "warnings" and log.level not in ["WARN", "WARNING"]:
                        continue
                    if log_type == "system" and log.level not in ["INFO", "DEBUG"]:
                        continue
                    
                    clinic_logs.append(AuditTrailResponse(
                        id=str(log.id),
                        user_id=str(log.user_id) if log.user_id else "system",
                        user_name=user_name,
                        action=f"System {log.level}: {log.message[:100]}",
                        resource_type=log.module or "system",
                        resource_id="",
                        old_values=None,
                        new_values={"level": log.level, "module": log.module, "function": log.function},
                        ip_address=None,
                        user_agent=None,
                        timestamp=log.timestamp.isoformat() if log.timestamp else ""
                    ))
        
        # 3. Get UserActivity records for clinic users
        if log_type in ["all", "activities"]:
            from app.common.models.user import UserActivity
            user_activities = db.query(UserActivity).filter(
                UserActivity.user_id.in_(clinic_user_ids),
                UserActivity.created_at >= date_from_obj if date_from_obj else True,
                UserActivity.created_at <= date_to_obj if date_to_obj else True
            ).order_by(UserActivity.created_at.desc()).limit(1000).all()
            
            for activity in user_activities:
                user = db.query(User).filter(User.id == activity.user_id).first()
                user_name = f"{user.first_name} {user.last_name}".strip() if user else "Unknown User"
                
                clinic_logs.append(AuditTrailResponse(
                    id=str(activity.id),
                    user_id=str(activity.user_id),
                    user_name=user_name,
                    action=f"{activity.activity_type}: {activity.description or 'User activity'}",
                    resource_type="user_activity",
                    resource_id=str(activity.resource_id) if activity.resource_id else "",
                    old_values=None,
                    new_values={"metadata": activity.user_metadata} if activity.user_metadata else None,
                    ip_address=activity.ip_address,
                    user_agent=activity.user_agent,
                    timestamp=activity.created_at.isoformat() if activity.created_at else ""
                ))
        
        # Sort all logs by timestamp (most recent first)
        clinic_logs.sort(key=lambda x: x.timestamp, reverse=True)
        
        # Apply pagination
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        paginated_logs = clinic_logs[start_idx:end_idx]
        
        return create_paginated_response(
            items=paginated_logs,
            page=page,
            size=size,
            total=len(clinic_logs)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Clinic Logs Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve clinic logs: {str(e)}",
            trace_id=get_trace_id(),
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Log Statistics Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=SuccessResponse[LogStatsResponse])
@audit_pii_access("read", "log_stats", "stats_summary")
async def get_log_stats(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get log statistics summary."""
    try:
        # Get log statistics using CRUD
        stats = admin_crud.get_log_stats(db=db)
        
        stats_response = LogStatsResponse(
            total_activities=stats.get("total_activities", 0),
            total_system_logs=stats.get("total_system_logs", 0),
            total_audit_trails=stats.get("total_audit_trails", 0),
            activities_by_type=stats.get("activities_by_type", {}),
            logs_by_level=stats.get("logs_by_level", {}),
            recent_activities=stats.get("recent_activities", 0)
        )
        
        return SuccessResponse(
            data=stats_response,
            message="Log statistics retrieved successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Log Stats Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve log statistics: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Log Export Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/export", response_model=SuccessResponse[Dict[str, str]])
@audit_pii_access("read", "log_export", "logs_export")
async def export_logs(
    request: Request,
    log_type: str = Query("activities", description="Log type: activities, system, audit"),
    format: str = Query("csv", description="Export format: csv, json, xlsx"),
    date_from: Optional[str] = Query(None, description="Filter from date (ISO format)"),
    date_to: Optional[str] = Query(None, description="Filter to date (ISO format)"),
    db: Session = Depends(get_db)
):
    """Export logs in various formats."""
    try:
        # Parse date filters
        date_from_obj = None
        date_to_obj = None
        if date_from and date_from != 'undefined':
            try:
                date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            except ValueError:
                # If date format is invalid, ignore the filter
                pass
        if date_to and date_to != 'undefined':
            try:
                date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            except ValueError:
                # If date format is invalid, ignore the filter
                pass
        
        # Export logs using CRUD
        export_data = admin_crud.export_logs(
            db=db,
            log_type=log_type,
            format=format,
            date_from=date_from_obj,
            date_to=date_to_obj
        )
        
        # Log admin activity
        admin_crud.log_admin_activity(
            db=db,
            admin_id=uuid4(),  # TODO: Get from auth context
            activity_type=ActivityType.LOG_EXPORT,
            description=f"Exported {log_type} logs in {format.upper()} format",
            affected_resource_id=None
        )
        
        return SuccessResponse(
            data=export_data,
            message="Logs exported successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Log Export Failed",
            status=500,
            detail=f"Failed to export logs: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Log Cleanup Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/cleanup", response_model=SuccessResponse[Dict[str, Any]])
@audit_pii_access("write", "log_cleanup", "logs_cleanup")
async def cleanup_logs(
    request: Request,
    log_type: str = Query("system", description="Log type to cleanup"),
    older_than_days: int = Query(90, ge=1, le=365, description="Cleanup logs older than N days"),
    db: Session = Depends(get_db)
):
    """Cleanup old logs."""
    try:
        # Cleanup logs using CRUD
        cleanup_result = admin_crud.cleanup_logs(
            db=db,
            log_type=log_type,
            older_than_days=older_than_days
        )
        
        # Log admin activity
        admin_crud.log_admin_activity(
            db=db,
            admin_id=uuid4(),  # TODO: Get from auth context
            activity_type=ActivityType.LOG_CLEANUP,
            description=f"Cleaned up {log_type} logs older than {older_than_days} days",
            affected_resource_id=None
        )
        
        return SuccessResponse(
            data=cleanup_result,
            message="Logs cleaned up successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Log Cleanup Failed",
            status=500,
            detail=f"Failed to cleanup logs: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())
