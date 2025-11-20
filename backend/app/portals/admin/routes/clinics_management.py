"""Admin portal - clinics management router
Advanced clinic management operations connected to models and CRUD
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Body, Query, status, Request
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.common.models.hospital import (
    Hospital, HospitalType, HospitalStatus, HospitalDepartment,
    DepartmentType, Location
)
from app.common.models.admin import AdminActivity, ActivityType, BulkOperation
from app.crud.hospital import hospital as hospital_crud
from app.crud.admin import admin as admin_crud
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id

router = APIRouter(tags=["Admin · Clinics Management"])

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Data Models
# ──────────────────────────────────────────────────────────────────────────────

class BulkHospitalOperationRequest(BaseModel):
    hospital_ids: List[str] = Field(..., description="List of hospital IDs")
    operation: str = Field(..., description="Operation to perform")
    reason: Optional[str] = Field(None, description="Reason for bulk operation")

class HospitalCapacityRequest(BaseModel):
    hospital_id: str = Field(..., description="Hospital ID")
    new_capacity: int = Field(..., ge=1, description="New capacity (maps to total_beds)")
    reason: str = Field(..., description="Reason for capacity change")

class HospitalAccreditationRequest(BaseModel):
    hospital_id: str = Field(..., description="Hospital ID")
    accreditation_body: str = Field(..., description="Accreditation body")
    accreditation_level: str = Field(..., description="Accreditation level")
    valid_until: str = Field(..., description="Accreditation valid until date")
    certificate_number: Optional[str] = Field(None, description="Certificate number")

class DepartmentAssignmentRequest(BaseModel):
    department_id: str = Field(..., description="Department ID")
    head_doctor_id: str = Field(..., description="Head doctor ID")
    assignment_date: str = Field(..., description="Assignment date")

class HospitalLocationRequest(BaseModel):
    hospital_id: str = Field(..., description="Hospital ID")
    latitude: float = Field(..., description="Latitude")
    longitude: float = Field(..., description="Longitude")
    address: str = Field(..., description="Full address")
    city: str = Field(..., description="City")
    state: str = Field(..., description="State/Province")
    country: str = Field(..., description="Country")
    postal_code: Optional[str] = Field(None, description="Postal code")

class BulkOperationResponse(BaseModel):
    operation_id: str = Field(..., description="Operation ID")
    status: str = Field(..., description="Operation status")
    total_hospitals: int = Field(..., description="Total hospitals affected")
    successful: int = Field(..., description="Successful operations")
    failed: int = Field(..., description="Failed operations")
    created_at: str = Field(..., description="Created timestamp")

# ──────────────────────────────────────────────────────────────────────────────
# Bulk Operations Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/bulk-operations", response_model=SuccessResponse[BulkOperationResponse])
@audit_pii_access("write", "bulk_hospital_operation", "bulk_operation_create")
async def create_bulk_hospital_operation(
    request: Request,
    payload: BulkHospitalOperationRequest = Body(...),
    db: Session = Depends(get_db)
):
    """Create a bulk hospital operation."""
    try:
        # Validate operation type
        valid_operations = ["activate", "deactivate", "suspend", "update_type", "update_status"]
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
            operation_type=f"hospital_{payload.operation}",
            resource_ids=payload.hospital_ids,
            reason=payload.reason,
            created_by=uuid4()  # TODO: Get from auth context
        )
        
        # Execute bulk operation
        result = await _execute_bulk_hospital_operation(db, payload.operation, payload.hospital_ids, operation_id)
        
        bulk_response = BulkOperationResponse(
            operation_id=operation_id,
            status=result["status"],
            total_hospitals=len(payload.hospital_ids),
            successful=result["successful"],
            failed=result["failed"],
            created_at=bulk_operation.created_at.isoformat() if bulk_operation.created_at else ""
        )
        
        return SuccessResponse(
            data=bulk_response,
            message="Bulk hospital operation completed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Bulk Hospital Operation Failed",
            status=500,
            detail=f"Failed to execute bulk hospital operation: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Capacity Management Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.put("/capacity", response_model=SuccessResponse[Dict[str, str]])
@audit_pii_access("write", "hospital_capacity", "capacity_update")
async def update_hospital_capacity(
    request: Request,
    payload: HospitalCapacityRequest = Body(...),
    db: Session = Depends(get_db)
):
    """Update hospital capacity."""
    try:
        # Verify hospital exists
        hospital = hospital_crud.get(db=db, id=payload.hospital_id)
        if not hospital:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Hospital Not Found",
                status=404,
                detail=f"Hospital '{payload.hospital_id}' not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # Update capacity -> map to total_beds
        hospital_crud.update(db=db, db_obj=hospital, obj_in={"total_beds": payload.new_capacity})
        
        # Log admin activity
        admin_crud.log_admin_activity(
            db=db,
            admin_id=uuid4(),  # TODO: Get from auth context
            activity_type=ActivityType.HOSPITAL_CAPACITY_UPDATED,
            description=f"Updated capacity for '{hospital.name}' to {payload.new_capacity}. Reason: {payload.reason}",
            affected_resource_id=str(hospital.id)
        )
        
        return SuccessResponse(
            data={"status": "capacity_updated"},
            message="Hospital capacity updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Capacity Update Failed",
            status=500,
            detail=f"Failed to update hospital capacity: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/capacity/summary", response_model=SuccessResponse[Dict[str, Any]])
@audit_pii_access("read", "hospital_capacity", "capacity_summary")
async def get_capacity_summary(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get hospital capacity summary."""
    try:
        # Get capacity summary using CRUD
        capacity_data = hospital_crud.get_capacity_summary(db=db)
        
        return SuccessResponse(
            data=capacity_data,
            message="Hospital capacity summary retrieved successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Capacity Summary Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve capacity summary: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Accreditation Management Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/accreditation", response_model=SuccessResponse[Dict[str, str]])
@audit_pii_access("write", "hospital_accreditation", "accreditation_update")
async def update_hospital_accreditation(
    request: Request,
    payload: HospitalAccreditationRequest = Body(...),
    db: Session = Depends(get_db)
):
    """Update hospital accreditation."""
    try:
        # Verify hospital exists
        hospital = hospital_crud.get(db=db, id=payload.hospital_id)
        if not hospital:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Hospital Not Found",
                status=404,
                detail=f"Hospital '{payload.hospital_id}' not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # Update accreditation (map to available model fields)
        accreditation_data = {
            "accreditation_date": datetime.fromisoformat(payload.valid_until)
        }
        
        hospital_crud.update(db=db, db_obj=hospital, obj_in=accreditation_data)
        
        # Log admin activity
        admin_crud.log_admin_activity(
            db=db,
            admin_id=uuid4(),  # TODO: Get from auth context
            activity_type=ActivityType.HOSPITAL_ACCREDITATION_UPDATED,
            description=f"Updated accreditation for '{hospital.name}' to {payload.accreditation_level}",
            affected_resource_id=str(hospital.id)
        )
        
        return SuccessResponse(
            data={"status": "accreditation_updated"},
            message="Hospital accreditation updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Accreditation Update Failed",
            status=500,
            detail=f"Failed to update hospital accreditation: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/accreditation/expiring", response_model=SuccessResponse[List[Dict[str, Any]]])
@audit_pii_access("read", "hospital_accreditation", "expiring_accreditations")
async def get_expiring_accreditations(
    request: Request,
    days: int = Query(90, ge=1, le=365, description="Days ahead to check"),
    db: Session = Depends(get_db)
):
    """Get hospitals with expiring accreditations."""
    try:
        # Get expiring accreditations using CRUD
        expiring_data = hospital_crud.get_expiring_accreditations(db=db, days=days)
        
        return SuccessResponse(
            data=expiring_data,
            message="Expiring accreditations retrieved successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Expiring Accreditations Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve expiring accreditations: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Department Management Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/departments/assign-head", response_model=SuccessResponse[Dict[str, str]])
@audit_pii_access("write", "department_assignment", "head_doctor_assignment")
async def assign_department_head(
    request: Request,
    payload: DepartmentAssignmentRequest = Body(...),
    db: Session = Depends(get_db)
):
    """Assign head doctor to a department."""
    try:
        # Verify department exists
        department = hospital_crud.get_department(db=db, id=payload.department_id)
        if not department:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Department Not Found",
                status=404,
                detail=f"Department '{payload.department_id}' not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # Update department head
        hospital_crud.update_department_head(
            db=db,
            department_id=payload.department_id,
            head_doctor_id=payload.head_doctor_id,
            assignment_date=datetime.fromisoformat(payload.assignment_date)
        )
        
        # Log admin activity
        admin_crud.log_admin_activity(
            db=db,
            admin_id=uuid4(),  # TODO: Get from auth context
            activity_type=ActivityType.DEPARTMENT_HEAD_ASSIGNED,
            description=f"Assigned head doctor to department '{department.name}'",
            affected_resource_id=str(department.id)
        )
        
        return SuccessResponse(
            data={"status": "head_assigned"},
            message="Department head assigned successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Department Head Assignment Failed",
            status=500,
            detail=f"Failed to assign department head: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/departments/unassigned", response_model=SuccessResponse[List[Dict[str, Any]]])
@audit_pii_access("read", "department", "unassigned_departments")
async def get_unassigned_departments(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get departments without head doctors."""
    try:
        # Get unassigned departments using CRUD
        unassigned_data = hospital_crud.get_unassigned_departments(db=db)
        
        return SuccessResponse(
            data=unassigned_data,
            message="Unassigned departments retrieved successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Unassigned Departments Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve unassigned departments: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Location Management Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/location", response_model=SuccessResponse[Dict[str, str]])
@audit_pii_access("write", "hospital_location", "location_update")
async def update_hospital_location(
    request: Request,
    payload: HospitalLocationRequest = Body(...),
    db: Session = Depends(get_db)
):
    """Update hospital location information."""
    try:
        # Verify hospital exists
        hospital = hospital_crud.get(db=db, id=payload.hospital_id)
        if not hospital:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Hospital Not Found",
                status=404,
                detail=f"Hospital '{payload.hospital_id}' not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # Create or update location
        location_data = {
            "hospital_id": payload.hospital_id,
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "address": payload.address,
            "city": payload.city,
            "state": payload.state,
            "country": payload.country,
            "postal_code": payload.postal_code
        }
        
        hospital_crud.update_hospital_location(db=db, location_data=location_data)
        
        # Log admin activity
        admin_crud.log_admin_activity(
            db=db,
            admin_id=uuid4(),  # TODO: Get from auth context
            activity_type=ActivityType.HOSPITAL_LOCATION_UPDATED,
            description=f"Updated location for '{hospital.name}'",
            affected_resource_id=str(hospital.id)
        )
        
        return SuccessResponse(
            data={"status": "location_updated"},
            message="Hospital location updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Location Update Failed",
            status=500,
            detail=f"Failed to update hospital location: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/location/nearby", response_model=SuccessResponse[List[Dict[str, Any]]])
@audit_pii_access("read", "hospital_location", "nearby_hospitals")
async def get_nearby_hospitals(
    request: Request,
    latitude: float = Query(..., description="Latitude"),
    longitude: float = Query(..., description="Longitude"),
    radius: float = Query(10.0, ge=0.1, le=100.0, description="Radius in kilometers"),
    db: Session = Depends(get_db)
):
    """Get hospitals within a specified radius."""
    try:
        # Get nearby hospitals using CRUD
        nearby_data = hospital_crud.get_nearby_hospitals(
            db=db,
            latitude=latitude,
            longitude=longitude,
            radius=radius
        )
        
        return SuccessResponse(
            data=nearby_data,
            message="Nearby hospitals retrieved successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Nearby Hospitals Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve nearby hospitals: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Reporting Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/report/compliance", response_model=SuccessResponse[Dict[str, Any]])
@audit_pii_access("read", "hospital_compliance", "compliance_report")
async def get_compliance_report(
    request: Request,
    report_type: str = Query("accreditation", description="Report type"),
    db: Session = Depends(get_db)
):
    """Generate hospital compliance report."""
    try:
        # Generate compliance report using CRUD
        compliance_data = hospital_crud.generate_compliance_report(
            db=db,
            report_type=report_type
        )
        
        # Log admin activity
        admin_crud.log_admin_activity(
            db=db,
            admin_id=uuid4(),  # TODO: Get from auth context
            activity_type=ActivityType.COMPLIANCE_REPORT_GENERATED,
            description=f"Generated {report_type} compliance report",
            affected_resource_id=None
        )
        
        return SuccessResponse(
            data=compliance_data,
            message="Compliance report generated successfully"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Compliance Report Generation Failed",
            status=500,
            detail=f"Failed to generate compliance report: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ──────────────────────────────────────────────────────────────────────────────

async def _execute_bulk_hospital_operation(db: Session, operation: str, hospital_ids: List[str], operation_id: str) -> Dict[str, Any]:
    """Execute bulk operation on hospitals."""
    successful = 0
    failed = 0
    
    for hospital_id in hospital_ids:
        try:
            hospital = hospital_crud.get(db=db, id=hospital_id)
            if not hospital:
                failed += 1
                continue
            
            if operation == "activate":
                hospital_crud.update(db=db, db_obj=hospital, obj_in={"status": HospitalStatus.ACTIVE})
            elif operation == "deactivate":
                hospital_crud.update(db=db, db_obj=hospital, obj_in={"status": HospitalStatus.INACTIVE})
            elif operation == "suspend":
                hospital_crud.update(db=db, db_obj=hospital, obj_in={"status": HospitalStatus.SUSPENDED})
            
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
