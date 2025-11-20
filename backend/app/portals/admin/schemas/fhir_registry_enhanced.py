"""Enhanced Admin portal FHIR registry schemas for surgical edits integration."""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# ================================
# Enhanced FHIR Registry Schemas
# ================================

class OrganizationStatusEnum(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class LocationStatusEnum(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class PractitionerStatusEnum(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class LocationTypeEnum(str, Enum):
    HOSPITAL = "hospital"
    CLINIC = "clinic"
    DEPARTMENT = "department"
    ROOM = "room"
    WARD = "ward"
    LABORATORY = "laboratory"
    RADIOLOGY = "radiology"
    PHARMACY = "pharmacy"

class PhysicalTypeEnum(str, Enum):
    BUILDING = "building"
    FLOOR = "floor"
    ROOM = "room"
    WING = "wing"
    AREA = "area"

class FHIROrganization(BaseModel):
    """Enhanced FHIR Organization."""
    id: str = Field(..., description="FHIR Organization ID")
    name: str = Field(..., min_length=1, max_length=200, description="Organization name")
    type: str = Field(..., description="Organization type")
    status: OrganizationStatusEnum = Field(..., description="Organization status")
    address: Optional[Dict[str, Any]] = Field(None, description="Organization address")
    telecom: List[Dict[str, str]] = Field(default_factory=list, description="Contact information")
    identifier: List[Dict[str, str]] = Field(default_factory=list, description="Organization identifiers")
    alias: List[str] = Field(default_factory=list, description="Organization aliases")
    description: Optional[str] = Field(None, description="Organization description")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    created_by: str = Field(..., description="User who created the organization")

class FHIRLocation(BaseModel):
    """Enhanced FHIR Location."""
    id: str = Field(..., description="FHIR Location ID")
    name: str = Field(..., min_length=1, max_length=200, description="Location name")
    status: LocationStatusEnum = Field(..., description="Location status")
    type: LocationTypeEnum = Field(..., description="Location type")
    physical_type: PhysicalTypeEnum = Field(..., description="Physical type")
    address: Optional[Dict[str, Any]] = Field(None, description="Location address")
    telecom: List[Dict[str, str]] = Field(default_factory=list, description="Contact information")
    managing_organization: str = Field(..., description="Managing organization ID")
    part_of: Optional[str] = Field(None, description="Parent location ID")
    alias: List[str] = Field(default_factory=list, description="Location aliases")
    description: Optional[str] = Field(None, description="Location description")
    position: Optional[Dict[str, Any]] = Field(None, description="Geographic position")
    hours_of_operation: List[Dict[str, Any]] = Field(default_factory=list, description="Operating hours")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    created_by: str = Field(..., description="User who created the location")

class FHIRPractitioner(BaseModel):
    """Enhanced FHIR Practitioner."""
    id: str = Field(..., description="FHIR Practitioner ID")
    name: str = Field(..., min_length=1, max_length=200, description="Practitioner name")
    status: PractitionerStatusEnum = Field(..., description="Practitioner status")
    gender: str = Field(..., description="Practitioner gender")
    birth_date: Optional[str] = Field(None, description="Birth date")
    telecom: List[Dict[str, str]] = Field(default_factory=list, description="Contact information")
    address: Optional[Dict[str, Any]] = Field(None, description="Practitioner address")
    identifier: List[Dict[str, str]] = Field(default_factory=list, description="Practitioner identifiers")
    qualification: List[Dict[str, Any]] = Field(default_factory=list, description="Professional qualifications")
    communication: List[Dict[str, str]] = Field(default_factory=list, description="Communication preferences")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    created_by: str = Field(..., description="User who created the practitioner")

class FHIRPractitionerRole(BaseModel):
    """Enhanced FHIR PractitionerRole."""
    id: str = Field(..., description="FHIR PractitionerRole ID")
    practitioner_id: str = Field(..., description="Practitioner ID")
    organization_id: str = Field(..., description="Organization ID")
    location_ids: List[str] = Field(default_factory=list, description="Location IDs")
    code: List[Dict[str, str]] = Field(default_factory=list, description="Role codes")
    specialty: List[Dict[str, str]] = Field(default_factory=list, description="Specialties")
    active: bool = Field(True, description="Is role active")
    period: Optional[Dict[str, str]] = Field(None, description="Role period")
    telecom: List[Dict[str, str]] = Field(default_factory=list, description="Contact information")
    availability: List[Dict[str, Any]] = Field(default_factory=list, description="Availability")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    created_by: str = Field(..., description="User who created the practitioner role")

class OrganizationCreateRequest(BaseModel):
    """Enhanced organization creation request."""
    name: str = Field(..., min_length=1, max_length=200, description="Organization name")
    type: str = Field(..., description="Organization type")
    status: OrganizationStatusEnum = Field(OrganizationStatusEnum.ACTIVE, description="Organization status")
    address: Optional[Dict[str, Any]] = Field(None, description="Organization address")
    telecom: List[Dict[str, str]] = Field(default_factory=list, description="Contact information")
    identifier: List[Dict[str, str]] = Field(default_factory=list, description="Organization identifiers")
    alias: List[str] = Field(default_factory=list, description="Organization aliases")
    description: Optional[str] = Field(None, description="Organization description")

class OrganizationUpdateRequest(BaseModel):
    """Enhanced organization update request."""
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Updated organization name")
    type: Optional[str] = Field(None, description="Updated organization type")
    status: Optional[OrganizationStatusEnum] = Field(None, description="Updated organization status")
    address: Optional[Dict[str, Any]] = Field(None, description="Updated organization address")
    telecom: Optional[List[Dict[str, str]]] = Field(None, description="Updated contact information")
    identifier: Optional[List[Dict[str, str]]] = Field(None, description="Updated organization identifiers")
    alias: Optional[List[str]] = Field(None, description="Updated organization aliases")
    description: Optional[str] = Field(None, description="Updated organization description")

class LocationCreateRequest(BaseModel):
    """Enhanced location creation request."""
    name: str = Field(..., min_length=1, max_length=200, description="Location name")
    status: LocationStatusEnum = Field(LocationStatusEnum.ACTIVE, description="Location status")
    type: LocationTypeEnum = Field(..., description="Location type")
    physical_type: PhysicalTypeEnum = Field(..., description="Physical type")
    address: Optional[Dict[str, Any]] = Field(None, description="Location address")
    telecom: List[Dict[str, str]] = Field(default_factory=list, description="Contact information")
    managing_organization: str = Field(..., description="Managing organization ID")
    part_of: Optional[str] = Field(None, description="Parent location ID")
    alias: List[str] = Field(default_factory=list, description="Location aliases")
    description: Optional[str] = Field(None, description="Location description")
    position: Optional[Dict[str, Any]] = Field(None, description="Geographic position")
    hours_of_operation: List[Dict[str, Any]] = Field(default_factory=list, description="Operating hours")

class LocationUpdateRequest(BaseModel):
    """Enhanced location update request."""
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Updated location name")
    status: Optional[LocationStatusEnum] = Field(None, description="Updated location status")
    type: Optional[LocationTypeEnum] = Field(None, description="Updated location type")
    physical_type: Optional[PhysicalTypeEnum] = Field(None, description="Updated physical type")
    address: Optional[Dict[str, Any]] = Field(None, description="Updated location address")
    telecom: Optional[List[Dict[str, str]]] = Field(None, description="Updated contact information")
    managing_organization: Optional[str] = Field(None, description="Updated managing organization ID")
    part_of: Optional[str] = Field(None, description="Updated parent location ID")
    alias: Optional[List[str]] = Field(None, description="Updated location aliases")
    description: Optional[str] = Field(None, description="Updated location description")
    position: Optional[Dict[str, Any]] = Field(None, description="Updated geographic position")
    hours_of_operation: Optional[List[Dict[str, Any]]] = Field(None, description="Updated operating hours")

class PractitionerCreateRequest(BaseModel):
    """Enhanced practitioner creation request."""
    name: str = Field(..., min_length=1, max_length=200, description="Practitioner name")
    status: PractitionerStatusEnum = Field(PractitionerStatusEnum.ACTIVE, description="Practitioner status")
    gender: str = Field(..., description="Practitioner gender")
    birth_date: Optional[str] = Field(None, description="Birth date")
    telecom: List[Dict[str, str]] = Field(default_factory=list, description="Contact information")
    address: Optional[Dict[str, Any]] = Field(None, description="Practitioner address")
    identifier: List[Dict[str, str]] = Field(default_factory=list, description="Practitioner identifiers")
    qualification: List[Dict[str, Any]] = Field(default_factory=list, description="Professional qualifications")
    communication: List[Dict[str, str]] = Field(default_factory=list, description="Communication preferences")

class PractitionerUpdateRequest(BaseModel):
    """Enhanced practitioner update request."""
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Updated practitioner name")
    status: Optional[PractitionerStatusEnum] = Field(None, description="Updated practitioner status")
    gender: Optional[str] = Field(None, description="Updated practitioner gender")
    birth_date: Optional[str] = Field(None, description="Updated birth date")
    telecom: Optional[List[Dict[str, str]]] = Field(None, description="Updated contact information")
    address: Optional[Dict[str, Any]] = Field(None, description="Updated practitioner address")
    identifier: Optional[List[Dict[str, str]]] = Field(None, description="Updated practitioner identifiers")
    qualification: Optional[List[Dict[str, Any]]] = Field(None, description="Updated professional qualifications")
    communication: Optional[List[Dict[str, str]]] = Field(None, description="Updated communication preferences")

class PractitionerRoleCreateRequest(BaseModel):
    """Enhanced practitioner role creation request."""
    practitioner_id: str = Field(..., description="Practitioner ID")
    organization_id: str = Field(..., description="Organization ID")
    location_ids: List[str] = Field(default_factory=list, description="Location IDs")
    code: List[Dict[str, str]] = Field(default_factory=list, description="Role codes")
    specialty: List[Dict[str, str]] = Field(default_factory=list, description="Specialties")
    active: bool = Field(True, description="Is role active")
    period: Optional[Dict[str, str]] = Field(None, description="Role period")
    telecom: List[Dict[str, str]] = Field(default_factory=list, description="Contact information")
    availability: List[Dict[str, Any]] = Field(default_factory=list, description="Availability")

class PractitionerRoleUpdateRequest(BaseModel):
    """Enhanced practitioner role update request."""
    practitioner_id: Optional[str] = Field(None, description="Updated practitioner ID")
    organization_id: Optional[str] = Field(None, description="Updated organization ID")
    location_ids: Optional[List[str]] = Field(None, description="Updated location IDs")
    code: Optional[List[Dict[str, str]]] = Field(None, description="Updated role codes")
    specialty: Optional[List[Dict[str, str]]] = Field(None, description="Updated specialties")
    active: Optional[bool] = Field(None, description="Updated active status")
    period: Optional[Dict[str, str]] = Field(None, description="Updated role period")
    telecom: Optional[List[Dict[str, str]]] = Field(None, description="Updated contact information")
    availability: Optional[List[Dict[str, Any]]] = Field(None, description="Updated availability")

class FHIRRegistryStats(BaseModel):
    """Enhanced FHIR registry statistics."""
    total_organizations: int = Field(..., description="Total organizations")
    active_organizations: int = Field(..., description="Active organizations")
    total_locations: int = Field(..., description="Total locations")
    active_locations: int = Field(..., description="Active locations")
    locations_by_type: Dict[str, int] = Field(..., description="Locations count by type")
    total_practitioners: int = Field(..., description="Total practitioners")
    active_practitioners: int = Field(..., description="Active practitioners")
    total_practitioner_roles: int = Field(..., description="Total practitioner roles")
    active_practitioner_roles: int = Field(..., description="Active practitioner roles")
    practitioners_by_specialty: Dict[str, int] = Field(..., description="Practitioners count by specialty")
    organizations_created_this_month: int = Field(..., description="Organizations created this month")
    locations_created_this_month: int = Field(..., description="Locations created this month")
    practitioners_created_this_month: int = Field(..., description="Practitioners created this month")

class RegistrySearchRequest(BaseModel):
    """Enhanced registry search request."""
    resource_type: str = Field(..., pattern=r'^(Organization|Location|Practitioner|PractitionerRole)$', description="FHIR resource type")
    name: Optional[str] = Field(None, min_length=1, description="Filter by name")
    status: Optional[str] = Field(None, description="Filter by status")
    type: Optional[str] = Field(None, description="Filter by type")
    organization_id: Optional[str] = Field(None, description="Filter by organization ID")
    
    # Search
    search_query: Optional[str] = Field(None, min_length=2, description="Search in resource data")
    
    # Pagination
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Page size")
    
    # Sorting
    sort_by: str = Field("created_at", pattern=r'^(created_at|updated_at|name|status|type)$')
    sort_order: str = Field("desc", pattern=r'^(asc|desc)$')

class RegistryListResponse(BaseModel):
    """Enhanced registry list response."""
    resources: List[Dict[str, Any]] = Field(..., description="List of FHIR resources")
    total: int = Field(..., description="Total number of resources")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    total_pages: int = Field(..., description="Total number of pages")

# ================================
# Enhanced Validators
# ================================

@validator('name')
def validate_name(cls, v):
    """Validate name field."""
    if v:
        # Remove excessive whitespace
        v = v.strip()
        if len(v) == 0:
            raise ValueError('Name cannot be empty')
        if len(v) > 200:
            raise ValueError('Name cannot exceed 200 characters')
    return v

@validator('birth_date')
def validate_birth_date(cls, v):
    """Validate birth date format."""
    if v:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError('Birth date must be in YYYY-MM-DD format')
    return v

@validator('telecom')
def validate_telecom(cls, v):
    """Validate telecom information."""
    if v:
        for contact in v:
            if not isinstance(contact, dict):
                raise ValueError('Each telecom entry must be a dictionary')
            required_fields = ['system', 'value']
            for field in required_fields:
                if field not in contact:
                    raise ValueError(f'Telecom entry missing required field: {field}')
    return v

@validator('identifier')
def validate_identifier(cls, v):
    """Validate identifier information."""
    if v:
        for identifier in v:
            if not isinstance(identifier, dict):
                raise ValueError('Each identifier entry must be a dictionary')
            required_fields = ['system', 'value']
            for field in required_fields:
                if field not in identifier:
                    raise ValueError(f'Identifier entry missing required field: {field}')
    return v

@validator('location_ids')
def validate_location_ids(cls, v):
    """Validate location IDs list."""
    if v:
        for location_id in v:
            if not isinstance(location_id, str):
                raise ValueError('All location IDs must be strings')
            if len(location_id.strip()) == 0:
                raise ValueError('Location ID cannot be empty')
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

# Apply validators to relevant classes (guard for environments where direct assignment may fail)
try:
    FHIROrganization.__validators__['validate_name'] = validator('name', allow_reuse=True)(validate_name)
    FHIRLocation.__validators__['validate_name'] = validator('name', allow_reuse=True)(validate_name)
    FHIRPractitioner.__validators__['validate_name'] = validator('name', allow_reuse=True)(validate_name)
    FHIRPractitioner.__validators__['validate_birth_date'] = validator('birth_date', allow_reuse=True)(validate_birth_date)
    FHIRPractitioner.__validators__['validate_telecom'] = validator('telecom', allow_reuse=True)(validate_telecom)
    FHIRPractitioner.__validators__['validate_identifier'] = validator('identifier', allow_reuse=True)(validate_identifier)

    OrganizationCreateRequest.__validators__['validate_name'] = validator('name', allow_reuse=True)(validate_name)
    OrganizationUpdateRequest.__validators__['validate_name'] = validator('name', allow_reuse=True)(validate_name)

    LocationCreateRequest.__validators__['validate_name'] = validator('name', allow_reuse=True)(validate_name)
    LocationUpdateRequest.__validators__['validate_name'] = validator('name', allow_reuse=True)(validate_name)

    PractitionerCreateRequest.__validators__['validate_name'] = validator('name', allow_reuse=True)(validate_name)
    PractitionerCreateRequest.__validators__['validate_birth_date'] = validator('birth_date', allow_reuse=True)(validate_birth_date)
    PractitionerCreateRequest.__validators__['validate_telecom'] = validator('telecom', allow_reuse=True)(validate_telecom)
    PractitionerCreateRequest.__validators__['validate_identifier'] = validator('identifier', allow_reuse=True)(validate_identifier)

    PractitionerUpdateRequest.__validators__['validate_name'] = validator('name', allow_reuse=True)(validate_name)
    PractitionerUpdateRequest.__validators__['validate_birth_date'] = validator('birth_date', allow_reuse=True)(validate_birth_date)
    PractitionerUpdateRequest.__validators__['validate_telecom'] = validator('telecom', allow_reuse=True)(validate_telecom)
    PractitionerUpdateRequest.__validators__['validate_identifier'] = validator('identifier', allow_reuse=True)(validate_identifier)

    PractitionerRoleCreateRequest.__validators__['validate_location_ids'] = validator('location_ids', allow_reuse=True)(validate_location_ids)
    PractitionerRoleUpdateRequest.__validators__['validate_location_ids'] = validator('location_ids', allow_reuse=True)(validate_location_ids)

    RegistrySearchRequest.__validators__['validate_search_query'] = validator('search_query', allow_reuse=True)(validate_search_query)
except Exception:
    pass
