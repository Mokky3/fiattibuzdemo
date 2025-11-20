"""Enhanced Admin portal RBAC schemas for surgical edits integration."""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# ================================
# Enhanced RBAC Schemas
# ================================

class RoleEnum(str, Enum):
    SUPER_ADMIN = "super_admin"
    CLINIC_ADMIN = "clinic_admin"
    DOCTOR = "doctor"
    NURSE = "nurse"
    RECEPTIONIST = "receptionist"
    PATIENT = "patient"
    LAB_TECHNICIAN = "lab_technician"
    RADIOLOGIST = "radiologist"
    PHARMACIST = "pharmacist"

class ScopeEnum(str, Enum):
    GLOBAL = "global"
    CLINIC = "clinic"
    USER = "user"

class PolicyStatusEnum(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DRAFT = "draft"

class RBACPolicy(BaseModel):
    """Enhanced RBAC policy."""
    id: str = Field(..., description="Policy ID")
    name: str = Field(..., min_length=1, max_length=100, description="Policy name")
    description: str = Field(..., min_length=1, max_length=500, description="Policy description")
    resource: str = Field(..., min_length=1, max_length=50, description="Resource type")
    actions: List[str] = Field(..., description="Allowed actions")
    conditions: Dict[str, Any] = Field(default_factory=dict, description="Policy conditions")
    scope: ScopeEnum = Field(..., description="Policy scope")
    status: PolicyStatusEnum = Field(PolicyStatusEnum.ACTIVE, description="Policy status")
    clinic_id: Optional[str] = Field(None, description="Clinic ID for clinic-scoped policies")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    created_by: str = Field(..., description="User who created the policy")

class RolePolicy(BaseModel):
    """Enhanced role policy mapping."""
    role: RoleEnum = Field(..., description="Role name")
    policies: List[RBACPolicy] = Field(default_factory=list, description="Associated policies")
    scope: ScopeEnum = Field(..., description="Role scope")
    permissions: List[str] = Field(default_factory=list, description="Direct permissions")
    clinic_id: Optional[str] = Field(None, description="Clinic ID for clinic-scoped roles")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")

class ClinicScope(BaseModel):
    """Enhanced clinic scope."""
    clinic_id: str = Field(..., description="Clinic ID")
    clinic_name: str = Field(..., description="Clinic name")
    fhir_organization_id: str = Field(..., description="FHIR Organization ID")
    admin_users: List[str] = Field(default_factory=list, description="Admin user IDs")
    permissions: List[str] = Field(default_factory=list, description="Clinic-specific permissions")
    is_active: bool = Field(True, description="Is clinic active")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")

class UserRoleAssignment(BaseModel):
    """Enhanced user role assignment."""
    user_id: str = Field(..., description="User ID")
    user_name: str = Field(..., description="User name")
    user_email: str = Field(..., description="User email")
    roles: List[RoleEnum] = Field(..., description="Assigned roles")
    clinic_assignments: List[Dict[str, Any]] = Field(default_factory=list, description="Clinic-specific role assignments")
    is_active: bool = Field(True, description="Is assignment active")
    assigned_at: str = Field(..., description="Assignment timestamp")
    assigned_by: str = Field(..., description="User who made the assignment")
    expires_at: Optional[str] = Field(None, description="Assignment expiration date")

class RBACAuditLog(BaseModel):
    """Audit log entry for RBAC actions."""
    id: str = Field(..., description="Audit log ID")
    actor_id: str = Field(..., description="User who performed action")
    action: str = Field(..., description="Action performed")
    resource_type: str = Field(..., description="Resource type")
    resource_id: str = Field(..., description="Resource ID")
    clinic_id: Optional[str] = Field(None, description="Clinic ID")
    patient_id: Optional[str] = Field(None, description="Patient ID if applicable")
    details: Dict[str, Any] = Field(..., description="Additional details")
    timestamp: str = Field(..., description="Action timestamp")
    ip_address: Optional[str] = Field(None, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")

class PermissionCheck(BaseModel):
    """Enhanced permission check request."""
    user_id: str = Field(..., description="User ID")
    resource: str = Field(..., description="Resource type")
    action: str = Field(..., description="Action to perform")
    clinic_id: Optional[str] = Field(None, description="Clinic ID for scoping")
    context: Dict[str, Any] = Field(default_factory=dict, description="Additional context")

class PermissionCheckResponse(BaseModel):
    """Enhanced permission check response."""
    user_id: str = Field(..., description="User ID")
    resource: str = Field(..., description="Resource type")
    action: str = Field(..., description="Action checked")
    allowed: bool = Field(..., description="Is action allowed")
    reason: Optional[str] = Field(None, description="Reason for denial")
    applicable_policies: List[str] = Field(default_factory=list, description="Applicable policy IDs")
    clinic_id: Optional[str] = Field(None, description="Clinic ID")

class PolicyCreateRequest(BaseModel):
    """Enhanced policy creation request."""
    name: str = Field(..., min_length=1, max_length=100, description="Policy name")
    description: str = Field(..., min_length=1, max_length=500, description="Policy description")
    resource: str = Field(..., min_length=1, max_length=50, description="Resource type")
    actions: List[str] = Field(..., description="Allowed actions")
    conditions: Dict[str, Any] = Field(default_factory=dict, description="Policy conditions")
    scope: ScopeEnum = Field(..., description="Policy scope")
    clinic_id: Optional[str] = Field(None, description="Clinic ID for clinic-scoped policies")

class PolicyUpdateRequest(BaseModel):
    """Enhanced policy update request."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Updated policy name")
    description: Optional[str] = Field(None, min_length=1, max_length=500, description="Updated policy description")
    resource: Optional[str] = Field(None, min_length=1, max_length=50, description="Updated resource type")
    actions: Optional[List[str]] = Field(None, description="Updated allowed actions")
    conditions: Optional[Dict[str, Any]] = Field(None, description="Updated policy conditions")
    scope: Optional[ScopeEnum] = Field(None, description="Updated policy scope")
    status: Optional[PolicyStatusEnum] = Field(None, description="Updated policy status")
    clinic_id: Optional[str] = Field(None, description="Clinic ID for clinic-scoped policies")

class RoleAssignmentRequest(BaseModel):
    """Enhanced role assignment request."""
    user_id: str = Field(..., description="User ID")
    roles: List[RoleEnum] = Field(..., description="Roles to assign")
    clinic_assignments: Optional[List[Dict[str, Any]]] = Field(None, description="Clinic-specific assignments")
    expires_at: Optional[str] = Field(None, description="Assignment expiration date")
    reason: Optional[str] = Field(None, max_length=200, description="Assignment reason")

class RoleAssignmentUpdateRequest(BaseModel):
    """Enhanced role assignment update request."""
    roles: Optional[List[RoleEnum]] = Field(None, description="Updated roles")
    clinic_assignments: Optional[List[Dict[str, Any]]] = Field(None, description="Updated clinic assignments")
    expires_at: Optional[str] = Field(None, description="Updated expiration date")
    is_active: Optional[bool] = Field(None, description="Updated active status")
    reason: Optional[str] = Field(None, max_length=200, description="Update reason")

class RBACStats(BaseModel):
    """Enhanced RBAC statistics."""
    total_policies: int = Field(..., description="Total policies")
    active_policies: int = Field(..., description="Active policies")
    inactive_policies: int = Field(..., description="Inactive policies")
    policies_by_scope: Dict[str, int] = Field(..., description="Policies count by scope")
    policies_by_resource: Dict[str, int] = Field(..., description="Policies count by resource")
    total_role_assignments: int = Field(..., description="Total role assignments")
    active_role_assignments: int = Field(..., description="Active role assignments")
    assignments_by_role: Dict[str, int] = Field(..., description="Assignments count by role")
    assignments_by_clinic: Dict[str, int] = Field(..., description="Assignments count by clinic")
    expired_assignments: int = Field(..., description="Expired assignments")

class PolicySearchRequest(BaseModel):
    """Enhanced policy search request."""
    name: Optional[str] = Field(None, min_length=1, description="Filter by policy name")
    resource: Optional[str] = Field(None, description="Filter by resource type")
    scope: Optional[ScopeEnum] = Field(None, description="Filter by scope")
    status: Optional[PolicyStatusEnum] = Field(None, description="Filter by status")
    clinic_id: Optional[str] = Field(None, description="Filter by clinic ID")
    
    # Search
    search_query: Optional[str] = Field(None, min_length=2, description="Search in policy name or description")
    
    # Pagination
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Page size")
    
    # Sorting
    sort_by: str = Field("created_at", pattern=r'^(created_at|updated_at|name|resource|scope)$')
    sort_order: str = Field("desc", pattern=r'^(asc|desc)$')

class PolicyListResponse(BaseModel):
    """Enhanced policy list response."""
    policies: List[RBACPolicy] = Field(..., description="List of policies")
    total: int = Field(..., description="Total number of policies")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    total_pages: int = Field(..., description="Total number of pages")

class UserRoleSearchRequest(BaseModel):
    """Enhanced user role search request."""
    user_id: Optional[str] = Field(None, description="Filter by user ID")
    role: Optional[RoleEnum] = Field(None, description="Filter by role")
    clinic_id: Optional[str] = Field(None, description="Filter by clinic ID")
    is_active: Optional[bool] = Field(None, description="Filter by active status")
    
    # Search
    search_query: Optional[str] = Field(None, min_length=2, description="Search by user name or email")
    
    # Pagination
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Page size")
    
    # Sorting
    sort_by: str = Field("assigned_at", pattern=r'^(assigned_at|user_name|role|clinic_id)$')
    sort_order: str = Field("desc", pattern=r'^(asc|desc)$')

class UserRoleListResponse(BaseModel):
    """Enhanced user role list response."""
    assignments: List[UserRoleAssignment] = Field(..., description="List of role assignments")
    total: int = Field(..., description="Total number of assignments")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    total_pages: int = Field(..., description="Total number of pages")

# ================================
# Enhanced Validators
# ================================

@validator('name')
def validate_policy_name(cls, v):
    """Validate policy name."""
    if v:
        # Remove excessive whitespace
        v = v.strip()
        if len(v) == 0:
            raise ValueError('Policy name cannot be empty')
        if len(v) > 100:
            raise ValueError('Policy name cannot exceed 100 characters')
    return v

@validator('description')
def validate_policy_description(cls, v):
    """Validate policy description."""
    if v:
        # Remove excessive whitespace
        v = v.strip()
        if len(v) == 0:
            raise ValueError('Policy description cannot be empty')
        if len(v) > 500:
            raise ValueError('Policy description cannot exceed 500 characters')
    return v

@validator('resource')
def validate_resource_type(cls, v):
    """Validate resource type."""
    if v:
        # Remove excessive whitespace
        v = v.strip()
        if len(v) == 0:
            raise ValueError('Resource type cannot be empty')
        if len(v) > 50:
            raise ValueError('Resource type cannot exceed 50 characters')
    return v

@validator('actions')
def validate_actions(cls, v):
    """Validate actions list."""
    if v:
        if len(v) == 0:
            raise ValueError('Actions list cannot be empty')
        for action in v:
            if not isinstance(action, str):
                raise ValueError('All actions must be strings')
            if len(action.strip()) == 0:
                raise ValueError('Action names cannot be empty')
    return v

@validator('roles')
def validate_roles(cls, v):
    """Validate roles list."""
    if v:
        if len(v) == 0:
            raise ValueError('Roles list cannot be empty')
        for role in v:
            if not isinstance(role, str):
                raise ValueError('All roles must be strings')
    return v

@validator('expires_at')
def validate_expiration_date(cls, v):
    """Validate expiration date format."""
    if v:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError('Expiration date must be in YYYY-MM-DD format')
    return v

@validator('search_query')
def validate_search_query(cls, v):
    """Validate search query."""
    if v:
        # Remove excessive whitespace
        v = v.strip()
        if len(v) < 2:
            raise ValueError('Search query must be at least 2 characters')
        if len(v) > 100:
            raise ValueError('Search query cannot exceed 100 characters')
    return v

# Apply validators to relevant classes (guard for Pydantic v1-style only)
try:
    RBACPolicy.__validators__['validate_policy_name'] = validator('name', allow_reuse=True)(validate_policy_name)
    RBACPolicy.__validators__['validate_policy_description'] = validator('description', allow_reuse=True)(validate_policy_description)
    RBACPolicy.__validators__['validate_resource_type'] = validator('resource', allow_reuse=True)(validate_resource_type)
    RBACPolicy.__validators__['validate_actions'] = validator('actions', allow_reuse=True)(validate_actions)

    PolicyCreateRequest.__validators__['validate_policy_name'] = validator('name', allow_reuse=True)(validate_policy_name)
    PolicyCreateRequest.__validators__['validate_policy_description'] = validator('description', allow_reuse=True)(validate_policy_description)
    PolicyCreateRequest.__validators__['validate_resource_type'] = validator('resource', allow_reuse=True)(validate_resource_type)
    PolicyCreateRequest.__validators__['validate_actions'] = validator('actions', allow_reuse=True)(validate_actions)

    PolicyUpdateRequest.__validators__['validate_policy_name'] = validator('name', allow_reuse=True)(validate_policy_name)
    PolicyUpdateRequest.__validators__['validate_policy_description'] = validator('description', allow_reuse=True)(validate_policy_description)
    PolicyUpdateRequest.__validators__['validate_resource_type'] = validator('resource', allow_reuse=True)(validate_resource_type)
    PolicyUpdateRequest.__validators__['validate_actions'] = validator('actions', allow_reuse=True)(validate_actions)

    RoleAssignmentRequest.__validators__['validate_roles'] = validator('roles', allow_reuse=True)(validate_roles)
    RoleAssignmentRequest.__validators__['validate_expiration_date'] = validator('expires_at', allow_reuse=True)(validate_expiration_date)

    RoleAssignmentUpdateRequest.__validators__['validate_roles'] = validator('roles', allow_reuse=True)(validate_roles)
    RoleAssignmentUpdateRequest.__validators__['validate_expiration_date'] = validator('expires_at', allow_reuse=True)(validate_expiration_date)

    PolicySearchRequest.__validators__['validate_search_query'] = validator('search_query', allow_reuse=True)(validate_search_query)
    UserRoleSearchRequest.__validators__['validate_search_query'] = validator('search_query', allow_reuse=True)(validate_search_query)
except Exception:
    # Running under Pydantic v2 where direct __validators__ assignment may not be supported
    pass
