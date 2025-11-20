"""Admin portal - user management router
Advanced user management operations connected to models and CRUD
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Body, Query, status, Request
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.common.models.user import User, UserRole, UserStatus, UserProfile, Permission, RolePermission
from app.common.models.admin import AdminActivity, ActivityType, BulkOperation
from app.crud.user import user as user_crud
from app.crud.admin import admin as admin_crud
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id

router = APIRouter(tags=["Admin · User Management"])

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Data Models
# ──────────────────────────────────────────────────────────────────────────────

class BulkUserOperationRequest(BaseModel):
    user_ids: List[str] = Field(..., description="List of user IDs")
    operation: str = Field(..., description="Operation to perform")
    reason: Optional[str] = Field(None, description="Reason for bulk operation")

class UserRoleAssignmentRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    role: str = Field(..., description="New role")
    permissions: Optional[List[str]] = Field(None, description="Additional permissions")

class PermissionResponse(BaseModel):
    id: str = Field(..., description="Permission ID")
    name: str = Field(..., description="Permission name")
    description: str = Field(..., description="Permission description")
    resource: str = Field(..., description="Resource type")
    action: str = Field(..., description="Action type")

class RolePermissionResponse(BaseModel):
    role: str = Field(..., description="Role name")
    permissions: List[PermissionResponse] = Field(..., description="Role permissions")

class BulkOperationResponse(BaseModel):
    operation_id: str = Field(..., description="Operation ID")
    status: str = Field(..., description="Operation status")
    total_users: int = Field(..., description="Total users affected")
    successful: int = Field(..., description="Successful operations")
    failed: int = Field(..., description="Failed operations")
    created_at: str = Field(..., description="Created timestamp")

# ──────────────────────────────────────────────────────────────────────────────
# Bulk Operations Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/bulk-operations", response_model=SuccessResponse[BulkOperationResponse])
@audit_pii_access("write", "bulk_operation", "bulk_operation_create")
async def create_bulk_operation(
    request: Request,
    payload: BulkUserOperationRequest = Body(...),
    db: Session = Depends(get_db)
):
    """Create a bulk user operation."""
    try:
        # Validate operation type
        valid_operations = ["activate", "deactivate", "delete", "change_role", "reset_password"]
        if payload.operation not in valid_operations:
            problem = create_problem_detail(
                error_type=ErrorType.VALIDATION_ERROR,
                title="Invalid Operation",
                status=400,
                detail=f"Operation '{payload.operation}' is not valid. Valid operations: {valid_operations}",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=400, detail=problem.dict())
        
        # Create bulk operation record
        operation_id = str(uuid4())
        bulk_operation = admin_crud.create_bulk_operation(
            db=db,
            operation_id=operation_id,
            operation_type=payload.operation,
            user_ids=payload.user_ids,
            reason=payload.reason,
            created_by=uuid4()  # TODO: Get from auth context
        )
        
        # Execute bulk operation
        result = await _execute_bulk_operation(db, payload.operation, payload.user_ids, operation_id)
        
        bulk_response = BulkOperationResponse(
            operation_id=operation_id,
            status=result["status"],
            total_users=len(payload.user_ids),
            successful=result["successful"],
            failed=result["failed"],
            created_at=bulk_operation.created_at.isoformat() if bulk_operation.created_at else ""
        )
        
        return SuccessResponse(
            data=bulk_response,
            message="Bulk operation completed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Bulk Operation Failed",
            status=500,
            detail=f"Failed to execute bulk operation: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/bulk-operations/{operation_id}", response_model=SuccessResponse[BulkOperationResponse])
@audit_pii_access("read", "bulk_operation", "bulk_operation_detail")
async def get_bulk_operation(
    request: Request,
    operation_id: str,
    db: Session = Depends(get_db)
):
    """Get bulk operation details."""
    try:
        operation = admin_crud.get_bulk_operation(db=db, operation_id=operation_id)
        
        if not operation:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Operation Not Found",
                status=404,
                detail=f"Bulk operation '{operation_id}' not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        bulk_response = BulkOperationResponse(
            operation_id=str(operation.id),
            status=operation.status,
            total_users=operation.total_users,
            successful=operation.successful_count,
            failed=operation.failed_count,
            created_at=operation.created_at.isoformat() if operation.created_at else ""
        )
        
        return SuccessResponse(
            data=bulk_response,
            message="Bulk operation retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Bulk Operation Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve bulk operation: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Role and Permission Management
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/roles", response_model=SuccessResponse[List[str]])
@audit_pii_access("read", "user_role", "roles_list")
async def get_user_roles(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get all available user roles."""
    try:
        roles = [role.value for role in UserRole]
        
        return SuccessResponse(
            data=roles,
            message="User roles retrieved successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Roles Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve user roles: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/permissions", response_model=PaginatedResponse[PermissionResponse])
@audit_pii_access("read", "permission", "permissions_list")
async def get_permissions(
    request: Request,
    role: Optional[str] = Query(None, description="Filter by role"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db)
):
    """Get permissions with optional role filtering."""
    try:
        # Get permissions using CRUD
        permissions = admin_crud.get_permissions(
            db=db,
            role=role,
            skip=(page - 1) * size,
            limit=size
        )
        
        # Transform to response format
        permission_responses = []
        for permission in permissions:
            permission_responses.append(PermissionResponse(
                id=str(permission.id),
                name=permission.name,
                description=permission.description,
                resource=permission.resource,
                action=permission.action
            ))
        
        # Get total count
        total = admin_crud.count_permissions(db=db, role=role)
        
        return create_paginated_response(
            data=permission_responses,
            page=page,
            size=size,
            total=total
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Permissions Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve permissions: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/role-permissions", response_model=SuccessResponse[List[RolePermissionResponse]])
@audit_pii_access("read", "role_permission", "role_permissions_list")
async def get_role_permissions(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get role-permission mappings."""
    try:
        # Get role permissions using CRUD
        role_permissions = admin_crud.get_role_permissions(db=db)
        
        # Transform to response format
        role_permission_responses = []
        for role, permissions in role_permissions.items():
            permission_responses = []
            for permission in permissions:
                permission_responses.append(PermissionResponse(
                    id=str(permission.id),
                    name=permission.name,
                    description=permission.description,
                    resource=permission.resource,
                    action=permission.action
                ))
            
            role_permission_responses.append(RolePermissionResponse(
                role=role,
                permissions=permission_responses
            ))
        
        return SuccessResponse(
            data=role_permission_responses,
            message="Role permissions retrieved successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Role Permissions Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve role permissions: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.post("/assign-role", response_model=SuccessResponse[Dict[str, str]])
@audit_pii_access("write", "user_role", "role_assignment")
async def assign_user_role(
    request: Request,
    payload: UserRoleAssignmentRequest = Body(...),
    db: Session = Depends(get_db)
):
    """Assign role and permissions to a user."""
    try:
        # Validate user exists
        user = user_crud.get(db=db, id=payload.user_id)
        if not user:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="User Not Found",
                status=404,
                detail=f"User '{payload.user_id}' not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # Validate role
        try:
            role = UserRole(payload.role)
        except ValueError:
            problem = create_problem_detail(
                error_type=ErrorType.VALIDATION_ERROR,
                title="Invalid Role",
                status=400,
                detail=f"Role '{payload.role}' is not valid",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=400, detail=problem.dict())
        
        # Update user role
        user_crud.update(db=db, db_obj=user, obj_in={"role": role})
        
        # Assign additional permissions if provided
        if payload.permissions:
            admin_crud.assign_user_permissions(
                db=db,
                user_id=payload.user_id,
                permissions=payload.permissions
            )
        
        # Log admin activity
        admin_crud.log_admin_activity(
            db=db,
            admin_id=uuid4(),  # TODO: Get from auth context
            activity_type=ActivityType.ROLE_ASSIGNED,
            description=f"Assigned role '{payload.role}' to user: {user.email}",
            affected_resource_id=str(user.id)
        )
        
        return SuccessResponse(
            data={"status": "role_assigned"},
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

# ──────────────────────────────────────────────────────────────────────────────
# User Import/Export Operations
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/import", response_model=SuccessResponse[Dict[str, Any]])
@audit_pii_access("write", "user_import", "users_import")
async def import_users(
    request: Request,
    csv_data: str = Body(..., description="CSV data as string"),
    db: Session = Depends(get_db)
):
    """Import users from CSV data."""
    try:
        # Parse CSV data and create users
        result = await _import_users_from_csv(db, csv_data)
        
        # Log admin activity
        admin_crud.log_admin_activity(
            db=db,
            admin_id=uuid4(),  # TODO: Get from auth context
            activity_type=ActivityType.BULK_IMPORT,
            description=f"Imported {result['successful']} users from CSV",
            affected_resource_id=None
        )
        
        return SuccessResponse(
            data=result,
            message="Users imported successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="User Import Failed",
            status=500,
            detail=f"Failed to import users: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/export", response_model=SuccessResponse[Dict[str, str]])
@audit_pii_access("read", "user_export", "users_export")
async def export_users(
    request: Request,
    format: str = Query("csv", description="Export format"),
    role: Optional[str] = Query(None, description="Filter by role"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db)
):
    """Export users to CSV or JSON format."""
    try:
        # Export users using CRUD
        export_data = user_crud.export_users(
            db=db,
            format=format,
            role=role,
            status=status
        )
        
        # Log admin activity
        admin_crud.log_admin_activity(
            db=db,
            admin_id=uuid4(),  # TODO: Get from auth context
            activity_type=ActivityType.DATA_EXPORT,
            description=f"Exported users in {format.upper()} format",
            affected_resource_id=None
        )
        
        return SuccessResponse(
            data=export_data,
            message="Users exported successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="User Export Failed",
            status=500,
            detail=f"Failed to export users: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ──────────────────────────────────────────────────────────────────────────────

async def _execute_bulk_operation(db: Session, operation: str, user_ids: List[str], operation_id: str) -> Dict[str, Any]:
    """Execute bulk operation on users."""
    successful = 0
    failed = 0
    
    for user_id in user_ids:
        try:
            user = user_crud.get(db=db, id=user_id)
            if not user:
                failed += 1
                continue
            
            if operation == "activate":
                user_crud.update(db=db, db_obj=user, obj_in={"is_active": True, "status": UserStatus.ACTIVE})
            elif operation == "deactivate":
                user_crud.update(db=db, db_obj=user, obj_in={"is_active": False, "status": UserStatus.INACTIVE})
            elif operation == "delete":
                user_crud.soft_delete(db=db, id=user_id)
            elif operation == "reset_password":
                # TODO: Implement password reset
                pass
            
            successful += 1
            
        except Exception:
            failed += 1
    
    # Update bulk operation status
    admin_crud.update_bulk_operation(
        db=db,
        operation_id=operation_id,
        successful_count=successful,
        failed_count=failed,
        status="completed" if failed == 0 else "partial"
    )
    
    return {
        "status": "completed" if failed == 0 else "partial",
        "successful": successful,
        "failed": failed
    }

async def _import_users_from_csv(db: Session, csv_data: str) -> Dict[str, Any]:
    """Import users from CSV data."""
    import csv
    import io
    
    successful = 0
    failed = 0
    errors = []
    
    csv_reader = csv.DictReader(io.StringIO(csv_data))
    
    for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 for header
        try:
            # Validate required fields
            required_fields = ["email", "first_name", "last_name", "role"]
            for field in required_fields:
                if not row.get(field):
                    raise ValueError(f"Missing required field: {field}")
            
            # Check if user already exists
            existing_user = user_crud.get_by_field(db=db, field_name="email", field_value=row["email"])
            if existing_user:
                raise ValueError("User already exists")
            
            # Create user
            user_data = {
                "email": row["email"],
                "password": row.get("password", "temporary123"),
                "confirm_password": row.get("password", "temporary123"),
                "first_name": row["first_name"],
                "last_name": row["last_name"],
                "phone": row.get("phone"),
                "role": UserRole(row["role"]),
                "organization_id": row.get("organization_id")
            }
            
            user_crud.create(db=db, obj_in=user_data)
            successful += 1
            
        except Exception as e:
            failed += 1
            errors.append(f"Row {row_num}: {str(e)}")
    
    return {
        "successful": successful,
        "failed": failed,
        "errors": errors
    }
