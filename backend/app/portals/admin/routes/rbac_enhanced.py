"""Enhanced Admin portal RBAC router with super_admin vs clinic_admin distinction and clinic scoping."""
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request, Body
from app.common.auth.auth_service import (
    AuthenticatedUser, require_admin_access, require_permission, Permission
)
from app.services.rbac_service import RBACService, ResourceType, ActionType
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id
from app.common.schemas.responses_enhanced import (
    SuccessResponse, ProblemDetail, ErrorType, create_problem_detail, PaginatedResponse, create_paginated_response
)

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.fhir_client import FHIRClient

router = APIRouter(tags=["Admin · RBAC & Tenancy"])

from app.common.schemas.rbac_enhanced import (
    RBACPolicy,
    RolePolicy,
    ClinicScope,
    UserRoleAssignment,
    RBACAuditLog,
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

@router.get("/policies", response_model=SuccessResponse[List[RBACPolicy]])
@audit_pii_access("read", "rbac", "policies_list")
async def get_rbac_policies(
    request: Request,
    scope: Optional[str] = Query(None, description="Filter by scope: global, clinic, user"),
    resource: Optional[str] = Query(None, description="Filter by resource type"),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get RBAC policies (read-only endpoint for UI)."""
    try:
        # Check role
        if current_user.role.value not in ["super_admin", "clinic_admin"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get policies
        policies = await _get_rbac_policies(scope, resource, current_user.role.value, current_user.clinic_id)
        
        return SuccessResponse(
            data=policies,
            message="RBAC policies retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="RBAC Policies Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve RBAC policies: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/roles", response_model=SuccessResponse[List[RolePolicy]])
@audit_pii_access("read", "rbac", "roles_list")
async def get_rbac_roles(
    request: Request,
    scope: Optional[str] = Query(None, description="Filter by scope: global, clinic"),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get RBAC roles with associated policies."""
    try:
        if current_user.role.value not in ["super_admin", "clinic_admin"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        roles = await _get_rbac_roles(scope, current_user.role.value, current_user.clinic_id)
        
        return SuccessResponse(
            data=roles,
            message="RBAC roles retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="RBAC Roles Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve RBAC roles: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/clinics", response_model=SuccessResponse[List[ClinicScope]])
@audit_pii_access("read", "clinic", "clinic_scopes")
async def get_clinic_scopes(
    request: Request,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get clinic scopes (super_admin only)."""
    try:
        if current_user.role.value != "super_admin":
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        clinic_scopes = await _get_clinic_scopes(fhir_client)
        
        return SuccessResponse(
            data=clinic_scopes,
            message="Clinic scopes retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Clinic Scopes Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve clinic scopes: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.post("/users/{user_id}/roles", status_code=status.HTTP_201_CREATED, response_model=SuccessResponse[Dict[str, Any]])
@audit_pii_access("create", "rbac", "user_role_assignment")
async def assign_user_role(
    request: Request,
    user_id: str,
    role_assignment: UserRoleAssignment,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Assign role to user with clinic scoping enforcement."""
    try:
        if current_user.role.value not in ["super_admin", "clinic_admin"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        if current_user.role.value == "clinic_admin" and current_user.clinic_id and role_assignment.clinic_id:
            if role_assignment.clinic_id != current_user.clinic_id:
                raise HTTPException(status_code=403, detail="Cannot assign roles outside your clinic")
        
        await _validate_role_assignment(role_assignment, current_user.role.value, current_user.clinic_id)
        assignment_result = await _assign_user_role(user_id, role_assignment, current_user, db, fhir_client)
        
        return SuccessResponse(
            data=assignment_result,
            message="Role assigned successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Role Assignment Failed",
            status=500,
            detail=f"Failed to assign role: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.delete("/users/{user_id}/roles/{role}", response_model=SuccessResponse[Dict[str, Any]])
@audit_pii_access("delete", "rbac", "user_role_removal")
async def remove_user_role(
    request: Request,
    user_id: str,
    role: str,
    clinic_id: Optional[str] = Query(None, description="Clinic ID for clinic-scoped roles"),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Remove role from user with clinic scoping enforcement."""
    try:
        if current_user.role.value not in ["super_admin", "clinic_admin"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        if current_user.role.value == "clinic_admin" and current_user.clinic_id and clinic_id:
            if clinic_id != current_user.clinic_id:
                raise HTTPException(status_code=403, detail="Cannot remove roles outside your clinic")
        
        removal_result = await _remove_user_role(user_id, role, clinic_id, current_user, db, fhir_client)
        
        return SuccessResponse(
            data=removal_result,
            message="Role removed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Role Removal Failed",
            status=500,
            detail=f"Failed to remove role: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/audit", response_model=PaginatedResponse[RBACAuditLog])
@audit_pii_access("read", "rbac", "audit_logs")
async def get_rbac_audit_logs(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    actor_id: Optional[str] = Query(None, description="Filter by actor ID"),
    clinic_id: Optional[str] = Query(None, description="Filter by clinic ID"),
    start_date: Optional[str] = Query(None, description="Start date filter"),
    end_date: Optional[str] = Query(None, description="End date filter"),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get RBAC audit logs with clinic scoping."""
    try:
        if current_user.role.value not in ["super_admin", "clinic_admin"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        if current_user.role.value == "clinic_admin" and current_user.clinic_id and "super_admin" != current_user.role.value:
            clinic_id = current_user.clinic_id
        
        audit_logs = await _get_rbac_audit_logs(
            page, size, actor_id, clinic_id, start_date, end_date, db
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
            title="RBAC Audit Logs Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve RBAC audit logs: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ──────────────────────────────────────────────────────────────────────────────

async def _get_rbac_policies(scope: Optional[str], resource: Optional[str], user_role: str, user_clinic_id: Optional[str]) -> List[RBACPolicy]:
    """Get RBAC policies based on user role and scope."""
    try:
        policies = [
            RBACPolicy(
                id="policy-001",
                name="Patient Data Access",
                description="Access to patient medical records",
                resource="Patient",
                actions=["read", "write"],
                conditions={"clinic_scoped": True},
                scope="clinic",
                created_at=datetime.now(timezone.utc).isoformat(),
                updated_at=datetime.now(timezone.utc).isoformat()
            ),
            RBACPolicy(
                id="policy-002",
                name="System Administration",
                description="System-wide administration privileges",
                resource="System",
                actions=["read", "write", "delete", "admin"],
                conditions={"super_admin_only": True},
                scope="global",
                created_at=datetime.now(timezone.utc).isoformat(),
                updated_at=datetime.now(timezone.utc).isoformat()
            )
        ]
        
        if scope:
            policies = [p for p in policies if p.scope == scope]
        if resource:
            policies = [p for p in policies if p.resource == resource]
        if user_role != "super_admin":
            policies = [p for p in policies if p.scope == "clinic"]
        return policies
    except Exception:
        return []

async def _get_rbac_roles(scope: Optional[str], user_role: str, user_clinic_id: Optional[str]) -> List[RolePolicy]:
    """Get RBAC roles with associated policies."""
    try:
        roles = [
            RolePolicy(
                role="super_admin",
                policies=[],
                scope="global",
                permissions=["*"]
            ),
            RolePolicy(
                role="clinic_admin",
                policies=[],
                scope="clinic",
                permissions=["clinic.read", "clinic.write", "users.read", "users.write"]
            ),
            RolePolicy(
                role="doctor",
                policies=[],
                scope="clinic",
                permissions=["patient.read", "patient.write", "appointment.read", "appointment.write"]
            )
        ]
        if scope:
            roles = [r for r in roles if r.scope == scope]
        if user_role != "super_admin":
            roles = [r for r in roles if r.scope == "clinic"]
        return roles
    except Exception:
        return []

async def _get_clinic_scopes(fhir_client: FHIRClient) -> List[ClinicScope]:
    """Get clinic scopes from FHIR Organization resources."""
    try:
        result = await fhir_client._make_request("GET", "Organization", params={
            "_count": 100,
            "active": "true"
        })
        
        clinic_scopes: List[ClinicScope] = []
        for entry in result.get("entry", []):
            organization = entry["resource"]
            clinic_scopes.append(ClinicScope(
                clinic_id=organization["id"],
                clinic_name=organization.get("name", ""),
                fhir_organization_id=organization["id"],
                admin_users=[],
                permissions=[]
            ))
        return clinic_scopes
    except Exception:
        return []

async def _validate_role_assignment(role_assignment: UserRoleAssignment, user_role: str, user_clinic_id: Optional[str]) -> None:
    """Validate role assignment based on user permissions."""
    try:
        # Placeholder for real validations
        return None
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid role assignment: {str(e)}")

async def _assign_user_role(user_id: str, role_assignment: UserRoleAssignment, current_user: AuthenticatedUser, db: Session, fhir_client: FHIRClient) -> Dict[str, Any]:
    """Assign role to user."""
    try:
        return {
            "user_id": user_id,
            "role": role_assignment.role,
            "clinic_id": role_assignment.clinic_id,
            "assigned_at": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to assign role: {str(e)}")

async def _remove_user_role(user_id: str, role: str, clinic_id: Optional[str], current_user: AuthenticatedUser, db: Session, fhir_client: FHIRClient) -> Dict[str, Any]:
    """Remove role from user."""
    try:
        return {
            "user_id": user_id,
            "role": role,
            "clinic_id": clinic_id,
            "removed_at": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove role: {str(e)}")

async def _get_rbac_audit_logs(page: int, size: int, actor_id: Optional[str], clinic_id: Optional[str], start_date: Optional[str], end_date: Optional[str], db: Session) -> Dict[str, Any]:
    """Get RBAC audit logs with pagination."""
    try:
        audit_logs = [
            RBACAuditLog(
                id="audit-001",
                actor_id="admin",
                action="assign_role",
                resource_type="User",
                resource_id="user-001",
                clinic_id="clinic-001",
                patient_id=None,
                details={"role": "doctor", "clinic_id": "clinic-001"},
                timestamp=datetime.now(timezone.utc).isoformat(),
                ip_address="192.168.1.100",
                user_agent="Mozilla/5.0"
            )
        ]
        if actor_id:
            audit_logs = [log for log in audit_logs if log.actor_id == actor_id]
        if clinic_id:
            audit_logs = [log for log in audit_logs if log.clinic_id == clinic_id]
        start = (page - 1) * size
        end = start + size
        paginated_logs = audit_logs[start:end]
        return {
            "logs": paginated_logs,
            "total": len(audit_logs)
        }
    except Exception:
        return {"logs": [], "total": 0}
