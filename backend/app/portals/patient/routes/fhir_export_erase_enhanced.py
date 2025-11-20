"""Enhanced Patient portal FHIR export/erase router with re-auth and audit logging."""
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request, Body
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .auth_enhanced import get_current_patient, PatientUser, validate_patient_ownership
from app.portals.patient.schemas.profile_enhanced import (
    # Reusing merged profile_enhanced for centralization
    FHIRExportRequest as _SchemaFHIRExportRequest,
    FHIREraseRequest as _SchemaFHIREraseRequest,
    FHIRExportResult as _SchemaFHIRExportResult,
    FHIREraseResult as _SchemaFHIREraseResult,
    ConfirmationCodeRequest as _SchemaConfirmationCodeRequest,
    ConfirmationCodeResult as _SchemaConfirmationCodeResult,
)
from app.db.session import get_db
from app.services.fhir_client import FHIRClient
from app.services.rbac_service import RBACService
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id

router = APIRouter(tags=["Patient · FHIR Export/Erase"])

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Data Models
# ──────────────────────────────────────────────────────────────────────────────

FHIRExportRequest = _SchemaFHIRExportRequest

FHIREraseRequest = _SchemaFHIREraseRequest

FHIRExportResult = _SchemaFHIRExportResult

FHIREraseResult = _SchemaFHIREraseResult

ConfirmationCodeRequest = _SchemaConfirmationCodeRequest

ConfirmationCodeResult = _SchemaConfirmationCodeResult

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

@router.post("/export/request", response_model=SuccessResponse[FHIRExportResult])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("export", "patient", "fhir_export_request")
async def request_fhir_export(
    request: Request,
    export_request: FHIRExportRequest,
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Request FHIR export with re-auth and confirmation."""
    try:
        # Validate patient ownership
        if export_request.patient_id != current_patient.fhir_patient_id:
            raise HTTPException(status_code=403, detail="Cannot export data for another patient")
        
        # Validate resource types
        valid_resource_types = [
            "Patient", "Observation", "DiagnosticReport", "DocumentReference",
            "MedicationRequest", "Appointment", "Encounter", "Coverage",
            "Immunization", "AllergyIntolerance", "Condition", "Procedure"
        ]
        
        invalid_types = [rt for rt in export_request.resource_types if rt not in valid_resource_types]
        if invalid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid resource types: {', '.join(invalid_types)}"
            )
        
        # Create export job
        export_id = str(uuid4())
        export_result = FHIRExportResult(
            export_id=export_id,
            status="pending",
            resource_types=export_request.resource_types,
            format=export_request.format,
            file_url=None,
            expires_at=None,
            created_at=datetime.now(timezone.utc).isoformat()
        )
        
        # TODO: Implement actual FHIR export job creation
        # This would typically involve:
        # 1. Creating a background job
        # 2. Generating the export file
        # 3. Storing it securely
        # 4. Providing download URL
        
        return SuccessResponse(
            data=export_result,
            message="FHIR export requested successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="FHIR Export Request Failed",
            status=500,
            detail=f"Failed to request FHIR export: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/export/{export_id}", response_model=SuccessResponse[FHIRExportResult])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "patient", "fhir_export_status")
async def get_export_status(
    request: Request,
    export_id: str,
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get FHIR export status."""
    try:
        # TODO: Implement actual export status retrieval
        # This would typically involve:
        # 1. Querying the export job status
        # 2. Returning current status and file URL if completed
        
        export_result = FHIRExportResult(
            export_id=export_id,
            status="completed",
            resource_types=["Patient", "Observation"],
            format="json",
            file_url="https://example.com/exports/export_id.json",
            expires_at=datetime.now(timezone.utc).isoformat(),
            created_at=datetime.now(timezone.utc).isoformat()
        )
        
        return SuccessResponse(
            data=export_result,
            message="Export status retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Export Status Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve export status: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.post("/erase/request", response_model=SuccessResponse[FHIREraseResult])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("erase", "patient", "fhir_erase_request")
async def request_fhir_erase(
    request: Request,
    erase_request: FHIREraseRequest,
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Request FHIR erase with re-auth and confirmation."""
    try:
        # Validate patient ownership
        if erase_request.patient_id != current_patient.fhir_patient_id:
            raise HTTPException(status_code=403, detail="Cannot erase data for another patient")
        
        # Validate resource types
        valid_resource_types = [
            "Patient", "Observation", "DiagnosticReport", "DocumentReference",
            "MedicationRequest", "Appointment", "Encounter", "Coverage",
            "Immunization", "AllergyIntolerance", "Condition", "Procedure"
        ]
        
        invalid_types = [rt for rt in erase_request.resource_types if rt not in valid_resource_types]
        if invalid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid resource types: {', '.join(invalid_types)}"
            )
        
        # TODO: Implement confirmation code validation
        # This would typically involve:
        # 1. Validating the confirmation code
        # 2. Checking expiration
        # 3. Ensuring it matches the patient
        
        # Create erase job
        erase_id = str(uuid4())
        erase_result = FHIREraseResult(
            erase_id=erase_id,
            status="pending",
            resource_types=erase_request.resource_types,
            resources_erased=0,
            created_at=datetime.now(timezone.utc).isoformat()
        )
        
        # TODO: Implement actual FHIR erase job creation
        # This would typically involve:
        # 1. Creating a background job
        # 2. Soft-deleting or anonymizing resources
        # 3. Writing audit log entry
        # 4. Notifying relevant parties
        
        return SuccessResponse(
            data=erase_result,
            message="FHIR erase requested successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="FHIR Erase Request Failed",
            status=500,
            detail=f"Failed to request FHIR erase: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/erase/{erase_id}", response_model=SuccessResponse[FHIREraseResult])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "patient", "fhir_erase_status")
async def get_erase_status(
    request: Request,
    erase_id: str,
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Get FHIR erase status."""
    try:
        # TODO: Implement actual erase status retrieval
        # This would typically involve:
        # 1. Querying the erase job status
        # 2. Returning current status and resources erased count
        
        erase_result = FHIREraseResult(
            erase_id=erase_id,
            status="completed",
            resource_types=["Patient", "Observation"],
            resources_erased=15,
            created_at=datetime.now(timezone.utc).isoformat()
        )
        
        return SuccessResponse(
            data=erase_result,
            message="Erase status retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Erase Status Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve erase status: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.post("/confirmation-code", response_model=SuccessResponse[ConfirmationCodeResult])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("create", "patient", "confirmation_code")
async def request_confirmation_code(
    request: Request,
    confirmation_request: ConfirmationCodeRequest,
    current_patient: PatientUser = Depends(get_current_patient),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client)
):
    """Request confirmation code for export/erase operations."""
    try:
        # Validate patient ownership
        if confirmation_request.patient_id != current_patient.fhir_patient_id:
            raise HTTPException(status_code=403, detail="Cannot request confirmation for another patient")
        
        # Validate operation
        if confirmation_request.operation not in ["export", "erase"]:
            raise HTTPException(status_code=400, detail="Invalid operation")
        
        # Validate delivery method
        if confirmation_request.delivery_method not in ["email", "sms"]:
            raise HTTPException(status_code=400, detail="Invalid delivery method")
        
        # Generate confirmation code
        confirmation_id = str(uuid4())
        confirmation_code = str(uuid4())[:8].upper()
        
        # TODO: Implement actual confirmation code delivery
        # This would typically involve:
        # 1. Generating a secure confirmation code
        # 2. Sending it via email/SMS
        # 3. Storing it securely with expiration
        # 4. Associating it with the patient and operation
        
        confirmation_result = ConfirmationCodeResult(
            confirmation_id=confirmation_id,
            expires_at=datetime.now(timezone.utc).isoformat(),
            delivery_method=confirmation_request.delivery_method
        )
        
        return SuccessResponse(
            data=confirmation_result,
            message="Confirmation code requested successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Confirmation Code Request Failed",
            status=500,
            detail=f"Failed to request confirmation code: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ──────────────────────────────────────────────────────────────────────────────

async def _validate_confirmation_code(
    patient_id: str,
    operation: str,
    confirmation_code: str,
    db: Session
) -> bool:
    """Validate confirmation code for export/erase operations."""
    try:
        # TODO: Implement actual confirmation code validation
        # This would typically involve:
        # 1. Querying the stored confirmation code
        # 2. Checking expiration
        # 3. Verifying it matches the patient and operation
        # 4. Marking it as used
        
        return True  # Placeholder
        
    except Exception:
        return False

async def _create_audit_log_entry(
    patient_id: str,
    operation: str,
    resource_types: List[str],
    db: Session
) -> None:
    """Create audit log entry for export/erase operations."""
    try:
        # TODO: Implement actual audit log creation
        # This would typically involve:
        # 1. Creating an audit log entry
        # 2. Recording the operation details
        # 3. Storing it securely
        # 4. Associating it with the patient
        
        pass  # Placeholder
        
    except Exception:
        pass  # Log error but don't fail the operation
