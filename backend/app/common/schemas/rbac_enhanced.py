"""Shared RBAC schemas used across admin RBAC endpoints."""
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class RBACPolicy(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    resource: str
    actions: List[str]
    conditions: Optional[Dict[str, Any]] = None
    scope: str = Field("clinic", description="global|clinic|user")
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class RolePolicy(BaseModel):
    role: str
    policies: List[RBACPolicy] = Field(default_factory=list)
    scope: str = Field("clinic", description="global|clinic")
    permissions: List[str] = Field(default_factory=list)


class ClinicScope(BaseModel):
    clinic_id: str
    clinic_name: str
    fhir_organization_id: Optional[str] = None
    admin_users: List[str] = Field(default_factory=list)
    permissions: List[str] = Field(default_factory=list)


class UserRoleAssignment(BaseModel):
    role: str
    clinic_id: Optional[str] = None
    permissions: Optional[List[str]] = None


class RBACAuditLog(BaseModel):
    id: str
    actor_id: str
    action: str
    resource_type: str
    resource_id: str
    clinic_id: Optional[str] = None
    patient_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    timestamp: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
