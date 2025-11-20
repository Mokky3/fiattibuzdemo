"""Enhanced standardized response models using RFC 7807 Problem+JSON format for surgical edits integration."""
from datetime import datetime
from typing import Optional, List, Dict, Any, Generic, TypeVar, Union
from pydantic import BaseModel, Field
from enum import Enum

# Generic type for paginated items
T = TypeVar('T')

class ErrorType(str, Enum):
    """Enhanced error types following RFC 7807 with surgical edits additions."""
    VALIDATION_ERROR = "validation_error"
    AUTHENTICATION_ERROR = "authentication_error"
    AUTHORIZATION_ERROR = "authorization_error"
    NOT_FOUND_ERROR = "not_found_error"
    CONFLICT_ERROR = "conflict_error"
    RATE_LIMIT_ERROR = "rate_limit_error"
    INTERNAL_ERROR = "internal_error"
    EXTERNAL_SERVICE_ERROR = "external_service_error"
    FHIR_ERROR = "fhir_error"
    RBAC_ERROR = "rbac_error"
    CLINIC_SCOPE_ERROR = "clinic_scope_error"
    PII_ACCESS_ERROR = "pii_access_error"
    AUDIT_ERROR = "audit_error"
    DUPLICATE_ERROR = "duplicate_error"
    EXPORT_ERROR = "export_error"
    IMPORT_ERROR = "import_error"

class ProblemDetail(BaseModel):
    """Enhanced RFC 7807 Problem+JSON format for error responses."""
    type: str = Field(..., description="URI reference that identifies the problem type")
    title: str = Field(..., description="Short, human-readable summary of the problem")
    status: int = Field(..., description="HTTP status code")
    detail: Optional[str] = Field(None, description="Human-readable explanation")
    instance: Optional[str] = Field(None, description="URI reference that identifies the specific occurrence")
    errors: Optional[List[Dict[str, Any]]] = Field(None, description="Validation errors")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    trace_id: Optional[str] = Field(None, description="Request trace ID for debugging")
    
    # Enhanced fields for surgical edits
    clinic_id: Optional[str] = Field(None, description="Clinic context for the error")
    user_id: Optional[str] = Field(None, description="User context for the error")
    resource_type: Optional[str] = Field(None, description="Resource type that caused the error")
    resource_id: Optional[str] = Field(None, description="Resource ID that caused the error")
    action: Optional[str] = Field(None, description="Action that caused the error")
    severity: str = Field("medium", description="Error severity: low|medium|high|critical")
    retry_after: Optional[int] = Field(None, description="Seconds to wait before retry")

class PaginationMeta(BaseModel):
    """Enhanced pagination metadata."""
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Number of items per page")
    total: int = Field(..., description="Total number of items")
    pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there's a next page")
    has_prev: bool = Field(..., description="Whether there's a previous page")
    
    # Enhanced fields for surgical edits
    clinic_id: Optional[str] = Field(None, description="Clinic context for pagination")
    user_id: Optional[str] = Field(None, description="User context for pagination")
    filters_applied: Optional[Dict[str, Any]] = Field(None, description="Applied filters")
    sort_applied: Optional[Dict[str, str]] = Field(None, description="Applied sorting")

class PaginatedResponse(BaseModel, Generic[T]):
    """Enhanced standardized paginated response."""
    data: List[T] = Field(..., description="List of items")
    meta: PaginationMeta = Field(..., description="Pagination metadata")
    links: Optional[Dict[str, str]] = Field(None, description="Navigation links")
    
    # Enhanced fields for surgical edits
    clinic_id: Optional[str] = Field(None, description="Clinic context")
    user_id: Optional[str] = Field(None, description="User context")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    trace_id: Optional[str] = Field(None, description="Request trace ID")

class SuccessResponse(BaseModel, Generic[T]):
    """Enhanced standardized success response."""
    data: T = Field(..., description="Response data")
    message: Optional[str] = Field(None, description="Success message")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Enhanced fields for surgical edits
    clinic_id: Optional[str] = Field(None, description="Clinic context")
    user_id: Optional[str] = Field(None, description="User context")
    trace_id: Optional[str] = Field(None, description="Request trace ID")
    warnings: Optional[List[str]] = Field(None, description="Non-critical warnings")

class AuditLogEntry(BaseModel):
    """Enhanced audit log entry for PII operations."""
    user_id: str = Field(..., description="User performing the action")
    action: str = Field(..., description="Action performed (read/write/delete)")
    resource_type: str = Field(..., description="Type of resource accessed")
    resource_id: str = Field(..., description="ID of the resource")
    clinic_id: Optional[str] = Field(None, description="Clinic context")
    ip_address: Optional[str] = Field(None, description="IP address of the request")
    user_agent: Optional[str] = Field(None, description="User agent of the request")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")
    
    # Enhanced fields for surgical edits
    session_id: Optional[str] = Field(None, description="Session ID")
    trace_id: Optional[str] = Field(None, description="Request trace ID")
    pii_fields_accessed: Optional[List[str]] = Field(None, description="PII fields accessed")
    fhir_resource_ids: Optional[List[str]] = Field(None, description="FHIR resource IDs involved")
    severity: str = Field("medium", description="Audit severity: low|medium|high|critical")

class RateLimitInfo(BaseModel):
    """Enhanced rate limiting information."""
    limit: int = Field(..., description="Request limit")
    remaining: int = Field(..., description="Remaining requests")
    reset_time: datetime = Field(..., description="When the limit resets")
    retry_after: Optional[int] = Field(None, description="Seconds to wait before retry")
    
    # Enhanced fields for surgical edits
    clinic_id: Optional[str] = Field(None, description="Clinic context for rate limiting")
    user_id: Optional[str] = Field(None, description="User context for rate limiting")
    endpoint: Optional[str] = Field(None, description="Rate limited endpoint")
    rate_limit_type: str = Field("user", description="Rate limit type: user|clinic|global")

class FHIRSyncStatus(BaseModel):
    """FHIR synchronization status."""
    resource_type: str = Field(..., description="FHIR resource type")
    resource_id: str = Field(..., description="FHIR resource ID")
    local_id: str = Field(..., description="Local resource ID")
    sync_status: str = Field(..., description="Sync status: synced|pending|failed|conflict")
    last_sync: datetime = Field(..., description="Last sync timestamp")
    sync_errors: Optional[List[str]] = Field(None, description="Sync error messages")
    version_id: Optional[str] = Field(None, description="FHIR version ID")

class ExportJobStatus(BaseModel):
    """Export job status."""
    job_id: str = Field(..., description="Export job ID")
    status: str = Field(..., description="Job status: pending|processing|completed|failed")
    progress: int = Field(0, ge=0, le=100, description="Progress percentage")
    total_records: int = Field(..., description="Total records to export")
    processed_records: int = Field(0, description="Processed records")
    file_url: Optional[str] = Field(None, description="Download URL")
    expires_at: Optional[datetime] = Field(None, description="Export expiration")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    error_message: Optional[str] = Field(None, description="Error message if failed")

class BulkOperationResult(BaseModel):
    """Bulk operation result."""
    operation_id: str = Field(..., description="Operation ID")
    total_items: int = Field(..., description="Total items processed")
    successful_items: int = Field(..., description="Successfully processed items")
    failed_items: int = Field(..., description="Failed items")
    success_rate: float = Field(..., description="Success rate percentage")
    errors: List[Dict[str, Any]] = Field(default_factory=list, description="Error details")
    warnings: List[str] = Field(default_factory=list, description="Warning messages")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")

# Enhanced predefined problem types
class ProblemTypes:
    """Enhanced predefined problem type URIs."""
    VALIDATION_ERROR = "https://api.healthcare.com/problems/validation-error"
    AUTHENTICATION_ERROR = "https://api.healthcare.com/problems/authentication-error"
    AUTHORIZATION_ERROR = "https://api.healthcare.com/problems/authorization-error"
    NOT_FOUND_ERROR = "https://api.healthcare.com/problems/not-found-error"
    CONFLICT_ERROR = "https://api.healthcare.com/problems/conflict-error"
    RATE_LIMIT_ERROR = "https://api.healthcare.com/problems/rate-limit-error"
    INTERNAL_ERROR = "https://api.healthcare.com/problems/internal-error"
    EXTERNAL_SERVICE_ERROR = "https://api.healthcare.com/problems/external-service-error"
    FHIR_ERROR = "https://api.healthcare.com/problems/fhir-error"
    RBAC_ERROR = "https://api.healthcare.com/problems/rbac-error"
    CLINIC_SCOPE_ERROR = "https://api.healthcare.com/problems/clinic-scope-error"
    PII_ACCESS_ERROR = "https://api.healthcare.com/problems/pii-access-error"
    AUDIT_ERROR = "https://api.healthcare.com/problems/audit-error"
    DUPLICATE_ERROR = "https://api.healthcare.com/problems/duplicate-error"
    EXPORT_ERROR = "https://api.healthcare.com/problems/export-error"
    IMPORT_ERROR = "https://api.healthcare.com/problems/import-error"

# Enhanced helper functions for creating standardized responses
def create_problem_detail(
    error_type: ErrorType,
    title: str,
    status: int,
    detail: Optional[str] = None,
    instance: Optional[str] = None,
    errors: Optional[List[Dict[str, Any]]] = None,
    trace_id: Optional[str] = None,
    clinic_id: Optional[str] = None,
    user_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    action: Optional[str] = None,
    severity: str = "medium",
    retry_after: Optional[int] = None
) -> ProblemDetail:
    """Create an enhanced standardized problem detail response."""
    type_map = {
        ErrorType.VALIDATION_ERROR: ProblemTypes.VALIDATION_ERROR,
        ErrorType.AUTHENTICATION_ERROR: ProblemTypes.AUTHENTICATION_ERROR,
        ErrorType.AUTHORIZATION_ERROR: ProblemTypes.AUTHORIZATION_ERROR,
        ErrorType.NOT_FOUND_ERROR: ProblemTypes.NOT_FOUND_ERROR,
        ErrorType.CONFLICT_ERROR: ProblemTypes.CONFLICT_ERROR,
        ErrorType.RATE_LIMIT_ERROR: ProblemTypes.RATE_LIMIT_ERROR,
        ErrorType.INTERNAL_ERROR: ProblemTypes.INTERNAL_ERROR,
        ErrorType.EXTERNAL_SERVICE_ERROR: ProblemTypes.EXTERNAL_SERVICE_ERROR,
        ErrorType.FHIR_ERROR: ProblemTypes.FHIR_ERROR,
        ErrorType.RBAC_ERROR: ProblemTypes.RBAC_ERROR,
        ErrorType.CLINIC_SCOPE_ERROR: ProblemTypes.CLINIC_SCOPE_ERROR,
        ErrorType.PII_ACCESS_ERROR: ProblemTypes.PII_ACCESS_ERROR,
        ErrorType.AUDIT_ERROR: ProblemTypes.AUDIT_ERROR,
        ErrorType.DUPLICATE_ERROR: ProblemTypes.DUPLICATE_ERROR,
        ErrorType.EXPORT_ERROR: ProblemTypes.EXPORT_ERROR,
        ErrorType.IMPORT_ERROR: ProblemTypes.IMPORT_ERROR,
    }
    
    return ProblemDetail(
        type=type_map[error_type],
        title=title,
        status=status,
        detail=detail,
        instance=instance,
        errors=errors,
        trace_id=trace_id,
        clinic_id=clinic_id,
        user_id=user_id,
        resource_type=resource_type,
        resource_id=resource_id,
        action=action,
        severity=severity,
        retry_after=retry_after
    )

def create_paginated_response(
    items: List[T],
    page: int,
    size: int,
    total: int,
    base_url: Optional[str] = None,
    clinic_id: Optional[str] = None,
    user_id: Optional[str] = None,
    trace_id: Optional[str] = None,
    filters_applied: Optional[Dict[str, Any]] = None,
    sort_applied: Optional[Dict[str, str]] = None
) -> PaginatedResponse[T]:
    """Create an enhanced standardized paginated response."""
    pages = (total + size - 1) // size
    has_next = page < pages
    has_prev = page > 1
    
    meta = PaginationMeta(
        page=page,
        size=size,
        total=total,
        pages=pages,
        has_next=has_next,
        has_prev=has_prev,
        clinic_id=clinic_id,
        user_id=user_id,
        filters_applied=filters_applied,
        sort_applied=sort_applied
    )
    
    links = None
    if base_url:
        links = {
            "first": f"{base_url}?page=1&size={size}",
            "last": f"{base_url}?page={pages}&size={size}",
        }
        if has_prev:
            links["prev"] = f"{base_url}?page={page-1}&size={size}"
        if has_next:
            links["next"] = f"{base_url}?page={page+1}&size={size}"
    
    return PaginatedResponse(
        data=items,
        meta=meta,
        links=links,
        clinic_id=clinic_id,
        user_id=user_id,
        trace_id=trace_id
    )

def create_success_response(
    data: T,
    message: Optional[str] = None,
    clinic_id: Optional[str] = None,
    user_id: Optional[str] = None,
    trace_id: Optional[str] = None,
    warnings: Optional[List[str]] = None
) -> SuccessResponse[T]:
    """Create an enhanced standardized success response."""
    return SuccessResponse(
        data=data,
        message=message,
        clinic_id=clinic_id,
        user_id=user_id,
        trace_id=trace_id,
        warnings=warnings
    )

def create_audit_log_entry(
    user_id: str,
    action: str,
    resource_type: str,
    resource_id: str,
    clinic_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    session_id: Optional[str] = None,
    trace_id: Optional[str] = None,
    pii_fields_accessed: Optional[List[str]] = None,
    fhir_resource_ids: Optional[List[str]] = None,
    severity: str = "medium",
    details: Optional[Dict[str, Any]] = None
) -> AuditLogEntry:
    """Create an enhanced audit log entry."""
    return AuditLogEntry(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        clinic_id=clinic_id,
        ip_address=ip_address,
        user_agent=user_agent,
        session_id=session_id,
        trace_id=trace_id,
        pii_fields_accessed=pii_fields_accessed,
        fhir_resource_ids=fhir_resource_ids,
        severity=severity,
        details=details
    )

def create_rate_limit_info(
    limit: int,
    remaining: int,
    reset_time: datetime,
    retry_after: Optional[int] = None,
    clinic_id: Optional[str] = None,
    user_id: Optional[str] = None,
    endpoint: Optional[str] = None,
    rate_limit_type: str = "user"
) -> RateLimitInfo:
    """Create enhanced rate limiting information."""
    return RateLimitInfo(
        limit=limit,
        remaining=remaining,
        reset_time=reset_time,
        retry_after=retry_after,
        clinic_id=clinic_id,
        user_id=user_id,
        endpoint=endpoint,
        rate_limit_type=rate_limit_type
    )

def create_bulk_operation_result(
    operation_id: str,
    total_items: int,
    successful_items: int,
    failed_items: int,
    errors: Optional[List[Dict[str, Any]]] = None,
    warnings: Optional[List[str]] = None,
    completed_at: Optional[datetime] = None
) -> BulkOperationResult:
    """Create bulk operation result."""
    success_rate = (successful_items / total_items * 100) if total_items > 0 else 0.0
    
    return BulkOperationResult(
        operation_id=operation_id,
        total_items=total_items,
        successful_items=successful_items,
        failed_items=failed_items,
        success_rate=success_rate,
        errors=errors or [],
        warnings=warnings or [],
        completed_at=completed_at
    )
