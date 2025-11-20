"""Doctor portal – Test Orders and Referrals router
Implements endpoints for managing test orders and referrals based on General Visit Reports
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Path, Body, Query, status, Request
from sqlalchemy.orm import Session

from .auth import get_current_doctor, DoctorUser
from app.db.session import get_db
from app.services.fhir_client import FHIRClient
from app.services.messaging_service import MessagingService
from app.services.rbac_service import RBACService
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access, require_clinic_scope
from app.common.utils.tracing import get_trace_id
from app.crud.test_orders_referrals import test_order as test_order_crud, referral as referral_crud
from app.common.schemas.test_orders_referrals import (
    TestOrderData, TestOrderResponse, TestOrderSummary, TestOrderStatus,
    ReferralData, ReferralResponse, ReferralSummary, ReferralStatus,
    CreateTestOrderRequest, UpdateTestOrderRequest,
    CreateReferralRequest, UpdateReferralRequest,
    TestType, Priority, Urgency
)

router = APIRouter(prefix="/test-orders-referrals", tags=["Doctor · Test Orders & Referrals"])

# ──────────────────────────────────────────────────────────────────────────────
# Service Dependencies
# ──────────────────────────────────────────────────────────────────────────────

def get_fhir_client(db: Session = Depends(get_db)) -> FHIRClient:
    """Get FHIR client with database session."""
    return FHIRClient(db_session=db)

def get_messaging_service(db: Session = Depends(get_db)) -> MessagingService:
    """Get messaging service."""
    return MessagingService(db)

def get_rbac_service() -> RBACService:
    """Get RBAC service."""
    return RBACService()

# ──────────────────────────────────────────────────────────────────────────────
# Test Orders Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/test-orders", response_model=SuccessResponse[TestOrderResponse], status_code=status.HTTP_201_CREATED)
@audit_pii_access("write", "service_request", "test_order")
async def create_test_order(
    request: Request,
    payload: CreateTestOrderRequest = Body(...),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Create a test order for a patient."""
    try:
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_doctor.id, payload.clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Validate patient access
        if not rbac_service.can_access_patient(current_doctor.id, payload.patient_id, payload.clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Patient Access Denied",
                status=403,
                detail="Doctor does not have access to this patient",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Create test order using CRUD operations
        response_data = test_order_crud.create_test_order(
            db=db,
            patient_id=payload.patient_id,
            doctor_id=current_doctor.id,
            clinic_id=payload.clinic_id,
            test_data=payload.test_data,
            encounter_id=payload.encounter_id,
            general_report_id=payload.general_report_id
        )

        # Send notification to patient
        messaging_service = MessagingService(db)
        await messaging_service.send_system_message(
            recipient_id=payload.patient_id,
            message_type="test_order_created",
            content=f"A {payload.test_data.test_name} test has been ordered for you.",
            metadata={
                "test_order_id": response_data.id,
                "test_name": payload.test_data.test_name,
                "test_type": payload.test_data.test_type.value,
                "priority": payload.test_data.priority.value,
                "doctor_name": current_doctor.full_name
            }
        )

        return SuccessResponse(
            data=response_data,
            message="Test order created successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Test Order Creation Failed",
            status=500,
            detail=f"Failed to create test order: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/test-orders", response_model=PaginatedResponse[TestOrderSummary])
@audit_pii_access("read", "service_request", "test_orders_list")
async def list_test_orders(
    request: Request,
    patient_id: Optional[str] = Query(None, description="Filter by patient ID"),
    clinic_id: str = Query(..., description="Clinic ID for scoping"),
    status: Optional[TestOrderStatus] = Query(None, description="Filter by status"),
    test_type: Optional[TestType] = Query(None, description="Filter by test type"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """List test orders with pagination."""
    try:
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_doctor.id, clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Get test orders using CRUD operations
        test_orders = test_order_crud.list_test_orders(
            db=db,
            doctor_id=current_doctor.id,
            patient_id=patient_id,
            clinic_id=clinic_id,
            status=status,
            test_type=test_type.value if test_type else None,
            skip=(page - 1) * size,
            limit=size
        )
        
        total = test_order_crud.count_test_orders(
            db=db,
            doctor_id=current_doctor.id,
            patient_id=patient_id,
            clinic_id=clinic_id,
            status=status,
            test_type=test_type.value if test_type else None
        )

        return create_paginated_response(
            data=test_orders,
            page=page,
            size=size,
            total=total
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Test Orders Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve test orders: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/test-orders/{test_order_id}", response_model=SuccessResponse[TestOrderResponse])
@audit_pii_access("read", "service_request", "test_order_detail")
async def get_test_order(
    request: Request,
    test_order_id: str = Path(..., description="Test Order ID"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get detailed test order."""
    try:
        # Get test order using CRUD operations with proper access control
        response_data = test_order_crud.get_test_order_by_id(
            db=db,
            test_order_id=test_order_id,
            doctor_id=current_doctor.id
        )
        
        if not response_data:
            raise HTTPException(status_code=404, detail="Test order not found")

        return SuccessResponse(
            data=response_data,
            message="Test order retrieved successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Test Order Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve test order: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.put("/test-orders/{test_order_id}", response_model=SuccessResponse[TestOrderResponse])
@audit_pii_access("write", "service_request", "test_order_update")
async def update_test_order(
    request: Request,
    test_order_id: str = Path(..., description="Test Order ID"),
    payload: UpdateTestOrderRequest = Body(...),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Update a test order."""
    try:
        # Update test order using CRUD operations with proper access control
        response_data = test_order_crud.update_test_order(
            db=db,
            test_order_id=test_order_id,
            test_data=payload.test_data,
            status=payload.status,
            scheduled_at=payload.scheduled_at,
            result_data=payload.result_data,
            result_notes=payload.result_notes,
            doctor_id=current_doctor.id
        )
        
        if not response_data:
            raise HTTPException(status_code=404, detail="Test order not found")

        return SuccessResponse(
            data=response_data,
            message="Test order updated successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Test Order Update Failed",
            status=500,
            detail=f"Failed to update test order: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.delete("/test-orders/{test_order_id}", response_model=SuccessResponse[Dict[str, str]])
@audit_pii_access("write", "service_request", "test_order_delete")
async def delete_test_order(
    request: Request,
    test_order_id: str = Path(..., description="Test Order ID"),
    clinic_id: str = Query(..., description="Clinic ID for scoping"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Delete a test order."""
    try:
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_doctor.id, clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Delete test order using CRUD operations with proper access control
        success = test_order_crud.delete_test_order(
            db=db,
            test_order_id=test_order_id,
            doctor_id=current_doctor.id
        )

        if not success:
            raise HTTPException(status_code=404, detail="Test order not found")

        return SuccessResponse(
            data={"test_order_id": test_order_id, "status": "deleted"},
            message="Test order deleted successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Test Order Deletion Failed",
            status=500,
            detail=f"Failed to delete test order: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

# ──────────────────────────────────────────────────────────────────────────────
# Referrals Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/referrals", response_model=SuccessResponse[ReferralResponse], status_code=status.HTTP_201_CREATED)
@audit_pii_access("write", "referral_request", "referral")
async def create_referral(
    request: Request,
    payload: CreateReferralRequest = Body(...),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Create a referral for a patient."""
    try:
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_doctor.id, payload.clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Validate patient access
        if not rbac_service.can_access_patient(current_doctor.id, payload.patient_id, payload.clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Patient Access Denied",
                status=403,
                detail="Doctor does not have access to this patient",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Create referral using CRUD operations
        response_data = referral_crud.create_referral(
            db=db,
            patient_id=payload.patient_id,
            referring_doctor_id=current_doctor.id,
            referring_clinic_id=payload.clinic_id,
            referral_data=payload.referral_data,
            referred_to_doctor_id=payload.referred_to_doctor_id,
            referred_to_clinic_id=payload.referred_to_clinic_id,
            encounter_id=payload.encounter_id,
            general_report_id=payload.general_report_id
        )

        # Send notification to patient
        messaging_service = MessagingService(db)
        await messaging_service.send_system_message(
            recipient_id=payload.patient_id,
            message_type="referral_created",
            content=f"You have been referred to {payload.referral_data.specialty} for {payload.referral_data.referral_reason}.",
            metadata={
                "referral_id": response_data.id,
                "specialty": payload.referral_data.specialty,
                "department": payload.referral_data.department,
                "urgency": payload.referral_data.urgency.value,
                "doctor_name": current_doctor.full_name
            }
        )

        return SuccessResponse(
            data=response_data,
            message="Referral created successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Referral Creation Failed",
            status=500,
            detail=f"Failed to create referral: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/referrals", response_model=PaginatedResponse[ReferralSummary])
@audit_pii_access("read", "referral_request", "referrals_list")
async def list_referrals(
    request: Request,
    patient_id: Optional[str] = Query(None, description="Filter by patient ID"),
    clinic_id: str = Query(..., description="Clinic ID for scoping"),
    status: Optional[ReferralStatus] = Query(None, description="Filter by status"),
    specialty: Optional[str] = Query(None, description="Filter by specialty"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """List referrals with pagination."""
    try:
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_doctor.id, clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Get referrals using CRUD operations
        referrals = referral_crud.list_referrals(
            db=db,
            doctor_id=current_doctor.id,
            patient_id=patient_id,
            clinic_id=clinic_id,
            status=status,
            specialty=specialty,
            skip=(page - 1) * size,
            limit=size
        )
        
        total = referral_crud.count_referrals(
            db=db,
            doctor_id=current_doctor.id,
            patient_id=patient_id,
            clinic_id=clinic_id,
            status=status,
            specialty=specialty
        )

        return create_paginated_response(
            data=referrals,
            page=page,
            size=size,
            total=total
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Referrals Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve referrals: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/referrals/{referral_id}", response_model=SuccessResponse[ReferralResponse])
@audit_pii_access("read", "referral_request", "referral_detail")
async def get_referral(
    request: Request,
    referral_id: str = Path(..., description="Referral ID"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get detailed referral."""
    try:
        # Get referral using CRUD operations with proper access control
        response_data = referral_crud.get_referral_by_id(
            db=db,
            referral_id=referral_id,
            doctor_id=current_doctor.id
        )
        
        if not response_data:
            raise HTTPException(status_code=404, detail="Referral not found")

        return SuccessResponse(
            data=response_data,
            message="Referral retrieved successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Referral Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve referral: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.put("/referrals/{referral_id}", response_model=SuccessResponse[ReferralResponse])
@audit_pii_access("write", "referral_request", "referral_update")
async def update_referral(
    request: Request,
    referral_id: str = Path(..., description="Referral ID"),
    payload: UpdateReferralRequest = Body(...),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Update a referral."""
    try:
        # Update referral using CRUD operations with proper access control
        response_data = referral_crud.update_referral(
            db=db,
            referral_id=referral_id,
            referral_data=payload.referral_data,
            status=payload.status,
            appointment_date=payload.appointment_date,
            response_notes=payload.response_notes,
            doctor_id=current_doctor.id
        )
        
        if not response_data:
            raise HTTPException(status_code=404, detail="Referral not found")

        return SuccessResponse(
            data=response_data,
            message="Referral updated successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Referral Update Failed",
            status=500,
            detail=f"Failed to update referral: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.delete("/referrals/{referral_id}", response_model=SuccessResponse[Dict[str, str]])
@audit_pii_access("write", "referral_request", "referral_delete")
async def delete_referral(
    request: Request,
    referral_id: str = Path(..., description="Referral ID"),
    clinic_id: str = Query(..., description="Clinic ID for scoping"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Delete a referral."""
    try:
        # Validate clinic access
        if not rbac_service.can_access_clinic(current_doctor.id, clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        # Delete referral using CRUD operations with proper access control
        success = referral_crud.delete_referral(
            db=db,
            referral_id=referral_id,
            doctor_id=current_doctor.id
        )

        if not success:
            raise HTTPException(status_code=404, detail="Referral not found")

        return SuccessResponse(
            data={"referral_id": referral_id, "status": "deleted"},
            message="Referral deleted successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Referral Deletion Failed",
            status=500,
            detail=f"Failed to delete referral: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())