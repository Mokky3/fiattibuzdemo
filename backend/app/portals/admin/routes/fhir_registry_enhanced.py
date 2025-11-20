"""Enhanced Admin portal FHIR registry router for authoritative directory management."""
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
    SuccessResponse, ProblemDetail, ErrorType, create_problem_detail
)


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

router = APIRouter(prefix="/api/admin/fhir-registry", tags=["Admin · FHIR Registry"])

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Data Models
# ──────────────────────────────────────────────────────────────────────────────

class FHIROrganization(BaseModel):
    id: str = Field(..., description="FHIR Organization ID")
    name: str = Field(..., description="Organization name")
    type: str = Field(..., description="Organization type")
    status: str = Field(..., description="Organization status")
    address: Optional[Dict[str, Any]] = Field(None, description="Organization address")
    telecom: List[Dict[str, str]] = Field(..., description="Contact information")
    identifier: List[Dict[str, str]] = Field(..., description="Organization identifiers")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")

class FHIRLocation(BaseModel):
    id: str = Field(..., description="FHIR Location ID")
    name: str = Field(..., description="Location name")
    status: str = Field(..., description="Location status")
    type: str = Field(..., description="Location type")
    physical_type: str = Field(..., description="Physical type")
    address: Optional[Dict[str, Any]] = Field(None, description="Location address")
    telecom: List[Dict[str, str]] = Field(..., description="Contact information")
    managing_organization: str = Field(..., description="Managing organization ID")
    part_of: Optional[str] = Field(None, description="Parent location ID")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")

class FHIRPractitioner(BaseModel):
    id: str = Field(..., description="FHIR Practitioner ID")
    name: Dict[str, Any] = Field(..., description="Practitioner name")
    identifier: List[Dict[str, str]] = Field(..., description="Practitioner identifiers")
    telecom: List[Dict[str, str]] = Field(..., description="Contact information")
    gender: str = Field(..., description="Practitioner gender")
    birth_date: Optional[str] = Field(None, description="Birth date")
    address: List[Dict[str, Any]] = Field(..., description="Practitioner addresses")
    qualification: List[Dict[str, Any]] = Field(..., description="Professional qualifications")
    communication: List[Dict[str, str]] = Field(..., description="Languages spoken")
    active: bool = Field(..., description="Active status")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")

class FHIRPractitionerRole(BaseModel):
    id: str = Field(..., description="FHIR PractitionerRole ID")
    practitioner: str = Field(..., description="Practitioner ID")
    organization: str = Field(..., description="Organization ID")
    location: List[str] = Field(..., description="Location IDs")
    specialty: List[Dict[str, Any]] = Field(..., description="Medical specialties")
    code: List[Dict[str, Any]] = Field(..., description="Role codes")
    active: bool = Field(..., description="Active status")
    period: Dict[str, str] = Field(..., description="Role period")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")

class FHIRRegistrySummary(BaseModel):
    organizations: int = Field(..., description="Total organizations")
    locations: int = Field(..., description="Total locations")
    practitioners: int = Field(..., description="Total practitioners")
    practitioner_roles: int = Field(..., description="Total practitioner roles")
    active_organizations: int = Field(..., description="Active organizations")
    active_practitioners: int = Field(..., description="Active practitioners")
    last_sync: str = Field(..., description="Last synchronization timestamp")

class OrganizationCreateRequest(BaseModel):
    name: str = Field(..., description="Organization name")
    type: str = Field(..., description="Organization type")
    address: Optional[Dict[str, Any]] = Field(None, description="Organization address")
    telecom: List[Dict[str, str]] = Field(..., description="Contact information")
    identifier: List[Dict[str, str]] = Field(..., description="Organization identifiers")

class LocationCreateRequest(BaseModel):
    name: str = Field(..., description="Location name")
    type: str = Field(..., description="Location type")
    physical_type: str = Field(..., description="Physical type")
    address: Optional[Dict[str, Any]] = Field(None, description="Location address")
    telecom: List[Dict[str, str]] = Field(..., description="Contact information")
    managing_organization: str = Field(..., description="Managing organization ID")
    part_of: Optional[str] = Field(None, description="Parent location ID")

class PractitionerCreateRequest(BaseModel):
    name: Dict[str, Any] = Field(..., description="Practitioner name")
    identifier: List[Dict[str, str]] = Field(..., description="Practitioner identifiers")
    telecom: List[Dict[str, str]] = Field(..., description="Contact information")
    gender: str = Field(..., description="Practitioner gender")
    birth_date: Optional[str] = Field(None, description="Birth date")
    address: List[Dict[str, Any]] = Field(..., description="Practitioner addresses")
    qualification: List[Dict[str, Any]] = Field(..., description="Professional qualifications")
    communication: List[Dict[str, str]] = Field(..., description="Languages spoken")

class PractitionerRoleCreateRequest(BaseModel):
    practitioner: str = Field(..., description="Practitioner ID")
    organization: str = Field(..., description="Organization ID")
    location: List[str] = Field(..., description="Location IDs")
    specialty: List[Dict[str, Any]] = Field(..., description="Medical specialties")
    code: List[Dict[str, Any]] = Field(..., description="Role codes")
    period: Dict[str, str] = Field(..., description="Role period")

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

@router.get("/summary", response_model=SuccessResponse[FHIRRegistrySummary])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "fhir", "registry_summary")
async def get_fhir_registry_summary(
    request: Request,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get FHIR registry summary statistics."""
    try:
        # Check if user is super_admin or clinic_admin
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles and "clinic_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get registry summary
        summary = await _get_fhir_registry_summary(fhir_client)
        
        return SuccessResponse(
            data=summary,
            message="FHIR registry summary retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="FHIR Registry Summary Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve FHIR registry summary: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/organizations", response_model=PaginatedResponse[FHIROrganization])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "organization", "organizations_list")
async def get_organizations(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    status: Optional[str] = Query(None, description="Filter by status"),
    type: Optional[str] = Query(None, description="Filter by type"),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get FHIR Organization resources (authoritative directory)."""
    try:
        # Check if user is super_admin or clinic_admin
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles and "clinic_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get organizations
        organizations = await _get_organizations(page, size, status, type, fhir_client)
        
        return create_paginated_response(
            data=organizations["organizations"],
            page=page,
            size=size,
            total=organizations["total"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Organizations Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve organizations: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.post("/organizations", status_code=status.HTTP_201_CREATED)
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("create", "organization", "organization_creation")
async def create_organization(
    request: Request,
    organization_request: OrganizationCreateRequest,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Create FHIR Organization resource (super_admin only)."""
    try:
        # Only super_admin can create organizations
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        # Create organization
        organization = await _create_organization(organization_request, current_user, fhir_client)
        
        return SuccessResponse(
            data=organization,
            message="Organization created successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Organization Creation Failed",
            status=500,
            detail=f"Failed to create organization: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/locations", response_model=PaginatedResponse[FHIRLocation])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "location", "locations_list")
async def get_locations(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    status: Optional[str] = Query(None, description="Filter by status"),
    type: Optional[str] = Query(None, description="Filter by type"),
    organization: Optional[str] = Query(None, description="Filter by organization"),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get FHIR Location resources (branches/rooms)."""
    try:
        # Check if user is super_admin or clinic_admin
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles and "clinic_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get locations
        locations = await _get_locations(page, size, status, type, organization, fhir_client)
        
        return create_paginated_response(
            data=locations["locations"],
            page=page,
            size=size,
            total=locations["total"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Locations Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve locations: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.post("/locations", status_code=status.HTTP_201_CREATED)
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("create", "location", "location_creation")
async def create_location(
    request: Request,
    location_request: LocationCreateRequest,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Create FHIR Location resource."""
    try:
        # Check if user is super_admin or clinic_admin
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles and "clinic_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Create location
        location = await _create_location(location_request, current_user, fhir_client)
        
        return SuccessResponse(
            data=location,
            message="Location created successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Location Creation Failed",
            status=500,
            detail=f"Failed to create location: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/practitioners", response_model=PaginatedResponse[FHIRPractitioner])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "practitioner", "practitioners_list")
async def get_practitioners(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    active: Optional[bool] = Query(None, description="Filter by active status"),
    gender: Optional[str] = Query(None, description="Filter by gender"),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get FHIR Practitioner resources (staff)."""
    try:
        # Check if user is super_admin or clinic_admin
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles and "clinic_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get practitioners
        practitioners = await _get_practitioners(page, size, active, gender, fhir_client)
        
        return create_paginated_response(
            data=practitioners["practitioners"],
            page=page,
            size=size,
            total=practitioners["total"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Practitioners Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve practitioners: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.post("/practitioners", status_code=status.HTTP_201_CREATED)
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("create", "practitioner", "practitioner_creation")
async def create_practitioner(
    request: Request,
    practitioner_request: PractitionerCreateRequest,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Create FHIR Practitioner resource."""
    try:
        # Check if user is super_admin or clinic_admin
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles and "clinic_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Create practitioner
        practitioner = await _create_practitioner(practitioner_request, current_user, fhir_client)
        
        return SuccessResponse(
            data=practitioner,
            message="Practitioner created successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Practitioner Creation Failed",
            status=500,
            detail=f"Failed to create practitioner: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/practitioner-roles", response_model=PaginatedResponse[FHIRPractitionerRole])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "practitioner_role", "practitioner_roles_list")
async def get_practitioner_roles(
    request: Request,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    active: Optional[bool] = Query(None, description="Filter by active status"),
    organization: Optional[str] = Query(None, description="Filter by organization"),
    practitioner: Optional[str] = Query(None, description="Filter by practitioner"),
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get FHIR PractitionerRole resources."""
    try:
        # Check if user is super_admin or clinic_admin
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles and "clinic_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Get practitioner roles
        practitioner_roles = await _get_practitioner_roles(page, size, active, organization, practitioner, fhir_client)
        
        return create_paginated_response(
            data=practitioner_roles["practitioner_roles"],
            page=page,
            size=size,
            total=practitioner_roles["total"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Practitioner Roles Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve practitioner roles: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.post("/practitioner-roles", status_code=status.HTTP_201_CREATED)
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("create", "practitioner_role", "practitioner_role_creation")
async def create_practitioner_role(
    request: Request,
    practitioner_role_request: PractitionerRoleCreateRequest,
    current_user: AuthenticatedUser = Depends(require_admin_access()),
    # ✅ PERMISSION CHECK: Require admin read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.ADMIN_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Create FHIR PractitionerRole resource."""
    try:
        # Check if user is super_admin or clinic_admin
        user_roles = current_user.get("roles", [])
        if "super_admin" not in user_roles and "clinic_admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Create practitioner role
        practitioner_role = await _create_practitioner_role(practitioner_role_request, current_user, fhir_client)
        
        return SuccessResponse(
            data=practitioner_role,
            message="Practitioner role created successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Practitioner Role Creation Failed",
            status=500,
            detail=f"Failed to create practitioner role: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ──────────────────────────────────────────────────────────────────────────────

async def _get_fhir_registry_summary(fhir_client: FHIRClient) -> FHIRRegistrySummary:
    """Get FHIR registry summary statistics."""
    try:
        # Get counts from FHIR resources
        organizations_result = await fhir_client._make_request("GET", "Organization", params={"_count": 0})
        locations_result = await fhir_client._make_request("GET", "Location", params={"_count": 0})
        practitioners_result = await fhir_client._make_request("GET", "Practitioner", params={"_count": 0})
        practitioner_roles_result = await fhir_client._make_request("GET", "PractitionerRole", params={"_count": 0})
        
        # Get active counts
        active_organizations_result = await fhir_client._make_request("GET", "Organization", params={"active": "true", "_count": 0})
        active_practitioners_result = await fhir_client._make_request("GET", "Practitioner", params={"active": "true", "_count": 0})
        
        return FHIRRegistrySummary(
            organizations=organizations_result.get("total", 0),
            locations=locations_result.get("total", 0),
            practitioners=practitioners_result.get("total", 0),
            practitioner_roles=practitioner_roles_result.get("total", 0),
            active_organizations=active_organizations_result.get("total", 0),
            active_practitioners=active_practitioners_result.get("total", 0),
            last_sync=datetime.now(timezone.utc).isoformat()
        )
        
    except Exception:
        return FHIRRegistrySummary(
            organizations=0,
            locations=0,
            practitioners=0,
            practitioner_roles=0,
            active_organizations=0,
            active_practitioners=0,
            last_sync=datetime.now(timezone.utc).isoformat()
        )

async def _get_organizations(page: int, size: int, status: Optional[str], type: Optional[str], fhir_client: FHIRClient) -> Dict[str, Any]:
    """Get FHIR Organization resources."""
    try:
        params = {
            "_count": size,
            "_offset": (page - 1) * size
        }
        
        if status:
            params["status"] = status
        if type:
            params["type"] = type
        
        result = await fhir_client._make_request("GET", "Organization", params=params)
        
        organizations = []
        for entry in result.get("entry", []):
            org = entry["resource"]
            organizations.append(FHIROrganization(
                id=org["id"],
                name=org.get("name", ""),
                type=org.get("type", [{}])[0].get("text", "") if org.get("type") else "",
                status=org.get("status", ""),
                address=org.get("address", [{}])[0] if org.get("address") else None,
                telecom=org.get("telecom", []),
                identifier=org.get("identifier", []),
                created_at=org.get("meta", {}).get("lastUpdated", ""),
                updated_at=org.get("meta", {}).get("lastUpdated", "")
            ))
        
        return {
            "organizations": organizations,
            "total": result.get("total", 0)
        }
        
    except Exception:
        return {"organizations": [], "total": 0}

async def _create_organization(organization_request: OrganizationCreateRequest, current_user: dict, fhir_client: FHIRClient) -> FHIROrganization:
    """Create FHIR Organization resource."""
    try:
        organization_resource = {
            "resourceType": "Organization",
            "name": organization_request.name,
            "type": [{"text": organization_request.type}],
            "status": "active",
            "address": [organization_request.address] if organization_request.address else [],
            "telecom": organization_request.telecom,
            "identifier": organization_request.identifier
        }
        
        result = await fhir_client._make_request("POST", "Organization", data=organization_resource)
        
        return FHIROrganization(
            id=result["id"],
            name=result.get("name", ""),
            type=result.get("type", [{}])[0].get("text", "") if result.get("type") else "",
            status=result.get("status", ""),
            address=result.get("address", [{}])[0] if result.get("address") else None,
            telecom=result.get("telecom", []),
            identifier=result.get("identifier", []),
            created_at=result.get("meta", {}).get("lastUpdated", ""),
            updated_at=result.get("meta", {}).get("lastUpdated", "")
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create organization: {str(e)}")

async def _get_locations(page: int, size: int, status: Optional[str], type: Optional[str], organization: Optional[str], fhir_client: FHIRClient) -> Dict[str, Any]:
    """Get FHIR Location resources."""
    try:
        params = {
            "_count": size,
            "_offset": (page - 1) * size
        }
        
        if status:
            params["status"] = status
        if type:
            params["type"] = type
        if organization:
            params["organization"] = f"Organization/{organization}"
        
        result = await fhir_client._make_request("GET", "Location", params=params)
        
        locations = []
        for entry in result.get("entry", []):
            loc = entry["resource"]
            locations.append(FHIRLocation(
                id=loc["id"],
                name=loc.get("name", ""),
                status=loc.get("status", ""),
                type=loc.get("type", [{}])[0].get("text", "") if loc.get("type") else "",
                physical_type=loc.get("physicalType", {}).get("text", "") if loc.get("physicalType") else "",
                address=loc.get("address", [{}])[0] if loc.get("address") else None,
                telecom=loc.get("telecom", []),
                managing_organization=loc.get("managingOrganization", {}).get("reference", "").replace("Organization/", ""),
                part_of=loc.get("partOf", {}).get("reference", "").replace("Location/", "") if loc.get("partOf") else None,
                created_at=loc.get("meta", {}).get("lastUpdated", ""),
                updated_at=loc.get("meta", {}).get("lastUpdated", "")
            ))
        
        return {
            "locations": locations,
            "total": result.get("total", 0)
        }
        
    except Exception:
        return {"locations": [], "total": 0}

async def _create_location(location_request: LocationCreateRequest, current_user: dict, fhir_client: FHIRClient) -> FHIRLocation:
    """Create FHIR Location resource."""
    try:
        location_resource = {
            "resourceType": "Location",
            "name": location_request.name,
            "type": [{"text": location_request.type}],
            "physicalType": {"text": location_request.physical_type},
            "status": "active",
            "address": [location_request.address] if location_request.address else [],
            "telecom": location_request.telecom,
            "managingOrganization": {"reference": f"Organization/{location_request.managing_organization}"},
            "partOf": {"reference": f"Location/{location_request.part_of}"} if location_request.part_of else None
        }
        
        result = await fhir_client._make_request("POST", "Location", data=location_resource)
        
        return FHIRLocation(
            id=result["id"],
            name=result.get("name", ""),
            status=result.get("status", ""),
            type=result.get("type", [{}])[0].get("text", "") if result.get("type") else "",
            physical_type=result.get("physicalType", {}).get("text", "") if result.get("physicalType") else "",
            address=result.get("address", [{}])[0] if result.get("address") else None,
            telecom=result.get("telecom", []),
            managing_organization=result.get("managingOrganization", {}).get("reference", "").replace("Organization/", ""),
            part_of=result.get("partOf", {}).get("reference", "").replace("Location/", "") if result.get("partOf") else None,
            created_at=result.get("meta", {}).get("lastUpdated", ""),
            updated_at=result.get("meta", {}).get("lastUpdated", "")
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create location: {str(e)}")

async def _get_practitioners(page: int, size: int, active: Optional[bool], gender: Optional[str], fhir_client: FHIRClient) -> Dict[str, Any]:
    """Get FHIR Practitioner resources."""
    try:
        params = {
            "_count": size,
            "_offset": (page - 1) * size
        }
        
        if active is not None:
            params["active"] = str(active).lower()
        if gender:
            params["gender"] = gender
        
        result = await fhir_client._make_request("GET", "Practitioner", params=params)
        
        practitioners = []
        for entry in result.get("entry", []):
            prac = entry["resource"]
            practitioners.append(FHIRPractitioner(
                id=prac["id"],
                name=prac.get("name", [{}])[0] if prac.get("name") else {},
                identifier=prac.get("identifier", []),
                telecom=prac.get("telecom", []),
                gender=prac.get("gender", ""),
                birth_date=prac.get("birthDate"),
                address=prac.get("address", []),
                qualification=prac.get("qualification", []),
                communication=prac.get("communication", []),
                active=prac.get("active", True),
                created_at=prac.get("meta", {}).get("lastUpdated", ""),
                updated_at=prac.get("meta", {}).get("lastUpdated", "")
            ))
        
        return {
            "practitioners": practitioners,
            "total": result.get("total", 0)
        }
        
    except Exception:
        return {"practitioners": [], "total": 0}

async def _create_practitioner(practitioner_request: PractitionerCreateRequest, current_user: dict, fhir_client: FHIRClient) -> FHIRPractitioner:
    """Create FHIR Practitioner resource."""
    try:
        practitioner_resource = {
            "resourceType": "Practitioner",
            "name": [practitioner_request.name],
            "identifier": practitioner_request.identifier,
            "telecom": practitioner_request.telecom,
            "gender": practitioner_request.gender,
            "birthDate": practitioner_request.birth_date,
            "address": practitioner_request.address,
            "qualification": practitioner_request.qualification,
            "communication": practitioner_request.communication,
            "active": True
        }
        
        result = await fhir_client._make_request("POST", "Practitioner", data=practitioner_resource)
        
        return FHIRPractitioner(
            id=result["id"],
            name=result.get("name", [{}])[0] if result.get("name") else {},
            identifier=result.get("identifier", []),
            telecom=result.get("telecom", []),
            gender=result.get("gender", ""),
            birth_date=result.get("birthDate"),
            address=result.get("address", []),
            qualification=result.get("qualification", []),
            communication=result.get("communication", []),
            active=result.get("active", True),
            created_at=result.get("meta", {}).get("lastUpdated", ""),
            updated_at=result.get("meta", {}).get("lastUpdated", "")
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create practitioner: {str(e)}")

async def _get_practitioner_roles(page: int, size: int, active: Optional[bool], organization: Optional[str], practitioner: Optional[str], fhir_client: FHIRClient) -> Dict[str, Any]:
    """Get FHIR PractitionerRole resources."""
    try:
        params = {
            "_count": size,
            "_offset": (page - 1) * size
        }
        
        if active is not None:
            params["active"] = str(active).lower()
        if organization:
            params["organization"] = f"Organization/{organization}"
        if practitioner:
            params["practitioner"] = f"Practitioner/{practitioner}"
        
        result = await fhir_client._make_request("GET", "PractitionerRole", params=params)
        
        practitioner_roles = []
        for entry in result.get("entry", []):
            role = entry["resource"]
            practitioner_roles.append(FHIRPractitionerRole(
                id=role["id"],
                practitioner=role.get("practitioner", {}).get("reference", "").replace("Practitioner/", ""),
                organization=role.get("organization", {}).get("reference", "").replace("Organization/", ""),
                location=[loc.get("reference", "").replace("Location/", "") for loc in role.get("location", [])],
                specialty=role.get("specialty", []),
                code=role.get("code", []),
                active=role.get("active", True),
                period=role.get("period", {}),
                created_at=role.get("meta", {}).get("lastUpdated", ""),
                updated_at=role.get("meta", {}).get("lastUpdated", "")
            ))
        
        return {
            "practitioner_roles": practitioner_roles,
            "total": result.get("total", 0)
        }
        
    except Exception:
        return {"practitioner_roles": [], "total": 0}

async def _create_practitioner_role(practitioner_role_request: PractitionerRoleCreateRequest, current_user: dict, fhir_client: FHIRClient) -> FHIRPractitionerRole:
    """Create FHIR PractitionerRole resource."""
    try:
        practitioner_role_resource = {
            "resourceType": "PractitionerRole",
            "practitioner": {"reference": f"Practitioner/{practitioner_role_request.practitioner}"},
            "organization": {"reference": f"Organization/{practitioner_role_request.organization}"},
            "location": [{"reference": f"Location/{loc}"} for loc in practitioner_role_request.location],
            "specialty": practitioner_role_request.specialty,
            "code": practitioner_role_request.code,
            "active": True,
            "period": practitioner_role_request.period
        }
        
        result = await fhir_client._make_request("POST", "PractitionerRole", data=practitioner_role_resource)
        
        return FHIRPractitionerRole(
            id=result["id"],
            practitioner=result.get("practitioner", {}).get("reference", "").replace("Practitioner/", ""),
            organization=result.get("organization", {}).get("reference", "").replace("Organization/", ""),
            location=[loc.get("reference", "").replace("Location/", "") for loc in result.get("location", [])],
            specialty=result.get("specialty", []),
            code=result.get("code", []),
            active=result.get("active", True),
            period=result.get("period", {}),
            created_at=result.get("meta", {}).get("lastUpdated", ""),
            updated_at=result.get("meta", {}).get("lastUpdated", "")
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create practitioner role: {str(e)}")
