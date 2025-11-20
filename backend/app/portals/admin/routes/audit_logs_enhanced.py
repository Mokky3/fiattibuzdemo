"""Enhanced Admin portal audit logs router with comprehensive audit tracking and export capabilities."""
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import uuid4
import csv
import json

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request, Response
from app.common.auth.auth_service import (
    AuthenticatedUser, require_admin_access, require_permission, Permission
)
from app.services.rbac_service import RBACService, ResourceType, ActionType
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id
from app.common.schemas.responses_enhanced import (
    SuccessResponse, ProblemDetail, ErrorType, create_problem_detail
)


from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.fhir_client import FHIRClient
from app.services.rbac_service import RBACService
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id

router = APIRouter(tags=["Admin · Audit & Logs"])

from app.portals.admin.schemas.audit_logs_enhanced import (
    AuditLogEntry,
    AuditLogFilter,
    AuditLogStats,
    AuditLogExport,
    AuditLogSummary,
)

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

@router.get("/logs", response_model=PaginatedResponse[AuditLogEntry])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "audit", "audit_logs")
async def get_audit_logs(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    actor_id: Optional[str] = Query(None, description="Filter by actor ID"),
    actor_role: Optional[str] = Query(None, description="Filter by actor role"),
    action: Optional[str] = Query(None, description="Filter by action"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    clinic_id: Optional[str] = Query(None, description="Filter by clinic ID"),
    patient_id: Optional[str] = Query(None, description="Filter by patient ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    start_date: Optional[str] = Query(None, description="Start date filter"),
    end_date: Optional[str] = Query(None, description="End date filter"),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get audit logs with comprehensive filtering and clinic scoping."""
    try:
        # Check if user is super_admin or clinic_admin
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles and "clinic_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Enforce clinic scoping for clinic_admin
        if "clinic_admin" in user_roles and "super_admin" not in user_roles:
            clinic_id = current_user.get("clinic_id")
        
        # Get audit logs
        audit_logs = await _get_audit_logs(
            page, size, actor_id, actor_role, action, resource_type,
            clinic_id, patient_id, status, start_date, end_date, db
        )
        
        return create_paginated_response(
            data=audit_logs["logs"],
            page=page,
            size=size,
            total=audit_logs["total"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Audit Logs Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve audit logs: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/summary", response_model=SuccessResponse[AuditLogSummary])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "audit", "audit_summary")
async def get_audit_summary(
    request: Request,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get audit logs summary with key metrics."""
    try:
        # Check if user is super_admin or clinic_admin
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles and "clinic_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Enforce clinic scoping for clinic_admin
        clinic_id = None
        if "clinic_admin" in user_roles and "super_admin" not in user_roles:
            clinic_id = current_user.get("clinic_id")
        
        # Get audit summary
        summary = await _get_audit_summary(clinic_id, db)
        
        return SuccessResponse(
            data=summary,
            message="Audit summary retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Audit Summary Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve audit summary: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/stats", response_model=SuccessResponse[AuditLogStats])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "audit", "audit_stats")
async def get_audit_stats(
    request: Request,
    days: int = Query(7, ge=1, le=365, description="Number of days to analyze"),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get audit logs statistics and analytics."""
    try:
        # Check if user is super_admin or clinic_admin
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles and "clinic_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Enforce clinic scoping for clinic_admin
        clinic_id = None
        if "clinic_admin" in user_roles and "super_admin" not in user_roles:
            clinic_id = current_user.get("clinic_id")
        
        # Get audit stats
        stats = await _get_audit_stats(days, clinic_id, db)
        
        return SuccessResponse(
            data=stats,
            message=f"Audit statistics retrieved for {days} days"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Audit Statistics Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve audit statistics: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.post("/export", response_model=SuccessResponse[AuditLogExport])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("export", "audit", "audit_export")
async def export_audit_logs(
    request: Request,
    export_format: str = Query("csv", description="Export format: csv, ndjson, json"),
    actor_id: Optional[str] = Query(None, description="Filter by actor ID"),
    actor_role: Optional[str] = Query(None, description="Filter by actor role"),
    action: Optional[str] = Query(None, description="Filter by action"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    clinic_id: Optional[str] = Query(None, description="Filter by clinic ID"),
    patient_id: Optional[str] = Query(None, description="Filter by patient ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    start_date: Optional[str] = Query(None, description="Start date filter"),
    end_date: Optional[str] = Query(None, description="End date filter"),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Export audit logs to CSV/NDJSON format."""
    try:
        # Check if user is super_admin or clinic_admin
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles and "clinic_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Enforce clinic scoping for clinic_admin
        if "clinic_admin" in user_roles and "super_admin" not in user_roles:
            clinic_id = current_user.get("clinic_id")
        
        # Validate export format
        if export_format not in ["csv", "ndjson", "json"]:
            raise HTTPException(status_code=400, detail="Invalid export format")
        
        # Create export
        export_result = await _create_audit_export(
            export_format, actor_id, actor_role, action, resource_type,
            clinic_id, patient_id, status, start_date, end_date, current_user, db
        )
        
        return SuccessResponse(
            data=export_result,
            message="Audit logs export created successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Audit Export Creation Failed",
            status=500,
            detail=f"Failed to create audit export: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/export/{export_id}/download")
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("download", "audit", "audit_export_download")
async def download_audit_export(
    request: Request,
    export_id: str,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Download audit logs export file."""
    try:
        # Check if user is super_admin or clinic_admin
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles and "clinic_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get export details
        export_details = await _get_audit_export_details(export_id, current_user, db)
        if not export_details:
            raise HTTPException(status_code=404, detail="Export not found")
        
        # Check if export has expired
        expires_at = datetime.fromisoformat(export_details["expires_at"])
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=410, detail="Export has expired")
        
        # Stream the export file
        return await _stream_audit_export(export_id, export_details["format"], db)
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Audit Export Download Failed",
            status=500,
            detail=f"Failed to download audit export: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/realtime", response_model=SuccessResponse[List[AuditLogEntry]])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "audit", "realtime_audit")
async def get_realtime_audit_logs(
    request: Request,
    last_id: Optional[str] = Query(None, description="Last log ID for polling"),
    limit: int = Query(10, ge=1, le=50, description="Number of logs to return"),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get new audit logs since last ID (for real-time updates)."""
    try:
        # Check if user is super_admin or clinic_admin
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles and "clinic_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Enforce clinic scoping for clinic_admin
        clinic_id = None
        if "clinic_admin" in user_roles and "super_admin" not in user_roles:
            clinic_id = current_user.get("clinic_id")
        
        # Get realtime audit logs
        realtime_logs = await _get_realtime_audit_logs(last_id, limit, clinic_id, db)
        
        return SuccessResponse(
            data=realtime_logs,
            message="Realtime audit logs retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Realtime Audit Logs Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve realtime audit logs: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ──────────────────────────────────────────────────────────────────────────────

async def _get_audit_logs(page: int, size: int, actor_id: Optional[str], actor_role: Optional[str], action: Optional[str], resource_type: Optional[str], clinic_id: Optional[str], patient_id: Optional[str], status: Optional[str], start_date: Optional[str], end_date: Optional[str], db: Session) -> Dict[str, Any]:
    """Get audit logs with filtering and pagination."""
    try:
        # TODO: Implement actual audit log retrieval from database
        # This would typically involve querying an audit_logs table
        
        # Mock audit logs
        audit_logs = [
            AuditLogEntry(
                id="audit-001",
                actor_id="admin",
                actor_name="Admin User",
                actor_role="super_admin",
                action="create",
                resource_type="User",
                resource_id="user-001",
                clinic_id="clinic-001",
                patient_id=None,
                details={"user_email": "user@example.com", "role": "doctor"},
                timestamp=datetime.now(timezone.utc).isoformat(),
                ip_address="192.168.1.100",
                user_agent="Mozilla/5.0",
                session_id="session-001",
                request_id="req-001",
                duration_ms=150,
                status="success"
            )
        ]
        
        # Apply filters
        if actor_id:
            audit_logs = [log for log in audit_logs if log.actor_id == actor_id]
        
        if actor_role:
            audit_logs = [log for log in audit_logs if log.actor_role == actor_role]
        
        if action:
            audit_logs = [log for log in audit_logs if log.action == action]
        
        if resource_type:
            audit_logs = [log for log in audit_logs if log.resource_type == resource_type]
        
        if clinic_id:
            audit_logs = [log for log in audit_logs if log.clinic_id == clinic_id]
        
        if patient_id:
            audit_logs = [log for log in audit_logs if log.patient_id == patient_id]
        
        if status:
            audit_logs = [log for log in audit_logs if log.status == status]
        
        # Apply pagination
        start = (page - 1) * size
        end = start + size
        paginated_logs = audit_logs[start:end]
        
        return {
            "logs": paginated_logs,
            "total": len(audit_logs)
        }
        
    except Exception:
        return {"logs": [], "total": 0}

async def _get_audit_summary(clinic_id: Optional[str], db: Session) -> AuditLogSummary:
    """Get audit logs summary."""
    try:
        # TODO: Implement actual audit summary calculation
        # This would typically involve querying audit logs with date filters
        
        return AuditLogSummary(
            today_logs=150,
            week_logs=1200,
            month_logs=5000,
            active_users=25,
            failed_actions=5,
            critical_events=2,
            recent_activities=[]
        )
        
    except Exception:
        return AuditLogSummary(
            today_logs=0,
            week_logs=0,
            month_logs=0,
            active_users=0,
            failed_actions=0,
            critical_events=0,
            recent_activities=[]
        )

async def _get_audit_stats(days: int, clinic_id: Optional[str], db: Session) -> AuditLogStats:
    """Get audit logs statistics."""
    try:
        # TODO: Implement actual audit statistics calculation
        # This would typically involve querying audit logs with date filters
        
        return AuditLogStats(
            total_logs=1000,
            period=f"{days} days",
            logs_by_action={"create": 300, "read": 400, "update": 200, "delete": 100},
            logs_by_actor={"admin": 500, "doctor": 300, "nurse": 200},
            logs_by_resource={"User": 200, "Patient": 400, "Appointment": 300, "Prescription": 100},
            logs_by_status={"success": 950, "failure": 50},
            logs_by_clinic={"clinic-001": 600, "clinic-002": 400},
            success_rate=95.0,
            average_duration_ms=250.0,
            hourly_activity={"09": 100, "10": 150, "11": 200, "12": 180},
            daily_activity={"2025-01-01": 200, "2025-01-02": 250, "2025-01-03": 300}
        )
        
    except Exception:
        return AuditLogStats(
            total_logs=0,
            period=f"{days} days",
            logs_by_action={},
            logs_by_actor={},
            logs_by_resource={},
            logs_by_status={},
            logs_by_clinic={},
            success_rate=0.0,
            average_duration_ms=0.0,
            hourly_activity={},
            daily_activity={}
        )

async def _create_audit_export(export_format: str, actor_id: Optional[str], actor_role: Optional[str], action: Optional[str], resource_type: Optional[str], clinic_id: Optional[str], patient_id: Optional[str], status: Optional[str], start_date: Optional[str], end_date: Optional[str], current_user: dict, db: Session) -> AuditLogExport:
    """Create audit logs export."""
    try:
        # TODO: Implement actual audit export creation
        # This would typically involve:
        # 1. Creating export job
        # 2. Generating export file
        # 3. Storing it securely
        # 4. Providing download URL
        
        export_id = str(uuid4())
        
        return AuditLogExport(
            export_id=export_id,
            format=export_format,
            filters=AuditLogFilter(
                actor_id=actor_id,
                actor_role=actor_role,
                action=action,
                resource_type=resource_type,
                clinic_id=clinic_id,
                patient_id=patient_id,
                status=status,
                start_date=start_date,
                end_date=end_date
            ),
            record_count=1000,
            file_url=f"/api/admin/audit/export/{export_id}/download",
            expires_at=(datetime.now(timezone.utc).replace(hour=23, minute=59, second=59)).isoformat(),
            created_at=datetime.now(timezone.utc).isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create audit export: {str(e)}")

async def _get_audit_export_details(export_id: str, current_user: dict, db: Session) -> Optional[Dict[str, Any]]:
    """Get audit export details."""
    try:
        # TODO: Implement actual export details retrieval
        # This would typically involve querying an exports table
        
        return {
            "export_id": export_id,
            "format": "csv",
            "expires_at": (datetime.now(timezone.utc).replace(hour=23, minute=59, second=59)).isoformat(),
            "created_by": current_user.get("user_id", "admin")
        }
        
    except Exception:
        return None

async def _stream_audit_export(export_id: str, export_format: str, db: Session) -> StreamingResponse:
    """Stream audit export file."""
    try:
        # TODO: Implement actual export file streaming
        # This would typically involve:
        # 1. Reading export file from storage
        # 2. Streaming it to client
        
        if export_format == "csv":
            return StreamingResponse(
                _generate_csv_export(export_id, db),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=audit_logs_{export_id}.csv"}
            )
        elif export_format == "ndjson":
            return StreamingResponse(
                _generate_ndjson_export(export_id, db),
                media_type="application/x-ndjson",
                headers={"Content-Disposition": f"attachment; filename=audit_logs_{export_id}.ndjson"}
            )
        else:  # json
            return StreamingResponse(
                _generate_json_export(export_id, db),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=audit_logs_{export_id}.json"}
            )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stream audit export: {str(e)}")

async def _generate_csv_export(export_id: str, db: Session):
    """Generate CSV export."""
    try:
        # TODO: Implement actual CSV generation
        # This would typically involve querying audit logs and formatting as CSV
        
        # Mock CSV data
        csv_data = "id,actor_id,action,resource_type,resource_id,clinic_id,patient_id,timestamp,status\n"
        csv_data += "audit-001,admin,create,User,user-001,clinic-001,,2025-01-10T10:00:00Z,success\n"
        
        yield csv_data
        
    except Exception:
        yield ""

async def _generate_ndjson_export(export_id: str, db: Session):
    """Generate NDJSON export."""
    try:
        # TODO: Implement actual NDJSON generation
        # This would typically involve querying audit logs and formatting as NDJSON
        
        # Mock NDJSON data
        ndjson_data = '{"id":"audit-001","actor_id":"admin","action":"create","resource_type":"User","resource_id":"user-001","clinic_id":"clinic-001","patient_id":null,"timestamp":"2025-01-10T10:00:00Z","status":"success"}\n'
        
        yield ndjson_data
        
    except Exception:
        yield ""

async def _generate_json_export(export_id: str, db: Session):
    """Generate JSON export."""
    try:
        # TODO: Implement actual JSON generation
        # This would typically involve querying audit logs and formatting as JSON
        
        # Mock JSON data
        json_data = {
            "export_id": export_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "logs": [
                {
                    "id": "audit-001",
                    "actor_id": "admin",
                    "action": "create",
                    "resource_type": "User",
                    "resource_id": "user-001",
                    "clinic_id": "clinic-001",
                    "patient_id": None,
                    "timestamp": "2025-01-10T10:00:00Z",
                    "status": "success"
                }
            ]
        }
        
        yield json.dumps(json_data, indent=2)
        
    except Exception:
        yield "{}"

async def _get_realtime_audit_logs(last_id: Optional[str], limit: int, clinic_id: Optional[str], db: Session) -> List[AuditLogEntry]:
    """Get realtime audit logs."""
    try:
        # TODO: Implement actual realtime audit log retrieval
        # This would typically involve querying audit logs newer than last_id
        
        # Mock realtime logs
        realtime_logs = [
            AuditLogEntry(
                id="audit-002",
                actor_id="doctor",
                actor_name="Dr. Smith",
                actor_role="doctor",
                action="update",
                resource_type="Patient",
                resource_id="patient-001",
                clinic_id="clinic-001",
                patient_id="patient-001",
                details={"field": "diagnosis", "old_value": "Cold", "new_value": "Flu"},
                timestamp=datetime.now(timezone.utc).isoformat(),
                ip_address="192.168.1.101",
                user_agent="Mozilla/5.0",
                session_id="session-002",
                request_id="req-002",
                duration_ms=200,
                status="success"
            )
        ]
        
        return realtime_logs
        
    except Exception:
        return []
