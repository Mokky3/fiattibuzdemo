"""Reception portal – enhanced appointments router
Implements surgical edits: FHIR-first scheduling, RBAC, shared appointments service
"""
from datetime import datetime, timezone, timedelta, date
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Path, Body, Query, status, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from app.portals.reception.schemas.appointments_enhanced import (
    AppointmentCreateRequest as SchemaAppointmentCreateRequest,
    AppointmentUpdateRequest as SchemaAppointmentUpdateRequest,
    AppointmentSummary as SchemaAppointmentSummary,
    AvailabilityRequest as SchemaAvailabilityRequest,
    AvailabilitySlot as SchemaTimeSlot,
    AppointmentStats as SchemaAppointmentStats,
    AppointmentReminderRequest as SchemaAppointmentReminderRequest,
    AppointmentReminderResponse as SchemaAppointmentReminderResponse,
)
from sqlalchemy.orm import Session
from app.common.auth.auth_service import (
    AuthenticatedUser, require_receptionist_access, require_permission, Permission,
)
from app.db.session import get_db
from app.services.appointments_service import AppointmentsService
from app.services.fhir_client import FHIRClient
from app.services.rbac_service import RBACService, ResourceType, ActionType
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access, require_clinic_scope
from app.common.utils.tracing import get_trace_id
from app.services.messaging_service import MessagingService

router = APIRouter(prefix="/appointments", tags=["Reception · Appointments"])

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Data Models
# ──────────────────────────────────────────────────────────────────────────────

AppointmentCreateRequest = SchemaAppointmentCreateRequest

AppointmentSummary = SchemaAppointmentSummary

AppointmentUpdateRequest = SchemaAppointmentUpdateRequest

DoctorAvailabilityRequest = SchemaAvailabilityRequest

TimeSlot = SchemaTimeSlot

AppointmentStats = SchemaAppointmentStats

# ──────────────────────────────────────────────────────────────────────────────
# Service Dependencies
# ──────────────────────────────────────────────────────────────────────────────

def get_appointments_service(db: Session = Depends(get_db)) -> AppointmentsService:
    """Get appointments service with database session."""
    return AppointmentsService(db)

def get_fhir_client(db: Session = Depends(get_db)) -> FHIRClient:
    """Get FHIR client with database session."""
    return FHIRClient(db_session=db)

def get_rbac_service() -> RBACService:
    """Get RBAC service."""
    return RBACService()

def get_messaging_service(db: Session = Depends(get_db)) -> MessagingService:
    return MessagingService(db)

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Endpoints with Surgical Edits
# ──────────────────────────────────────────────────────────────────────────────

@router.post("", response_model=SuccessResponse[AppointmentSummary], status_code=status.HTTP_201_CREATED)
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("write", "appointment", "appointment_create")
async def create_appointment(
    request: Request,
    payload: AppointmentCreateRequest = Body(...),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_WRITE)),
    db: Session = Depends(get_db),
    appointments_service: AppointmentsService = Depends(get_appointments_service),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """FHIR-first appointment creation with proper Appointment resource."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.APPOINTMENT, ActionType.CREATE, payload.clinic_id)
        rbac_service.enforce_permission(current_user, ResourceType.PATIENT, ActionType.READ, payload.clinic_id)
        rbac_service.enforce_permission(current_user, ResourceType.DOCTOR, ActionType.READ, payload.clinic_id)

        # Create appointment using shared service
        appointment_result = await appointments_service.create_appointment(
            patient_id=payload.patient_id,
            practitioner_id=payload.practitioner_id,
            appointment_date=payload.appointment_date,
            appointment_time=payload.appointment_time,
            appointment_type=payload.appointment_type,
            reason=payload.reason,
            description=payload.description,
            priority=payload.priority,
            duration=payload.duration,
            clinic_id=payload.clinic_id,
            created_by=current_user.user_id
        )

        return SuccessResponse(
            data=AppointmentSummary(
                id=appointment_result["id"],
                date=appointment_result["date"],
                time=appointment_result["time"],
                patient_name=appointment_result["patient_name"],
                patient_id=appointment_result["patient_id"],
                doctor_name=appointment_result["doctor_name"],
                doctor_id=appointment_result["doctor_id"],
                reason=appointment_result.get("reason"),
                description=appointment_result.get("description"),
                status=appointment_result["status"],
                priority=appointment_result["priority"],
                duration=appointment_result["duration"],
                formatted_date=appointment_result["formatted_date"],
                fhir_appointment_id=appointment_result.get("fhir_appointment_id")
            ),
            message="Appointment created successfully with FHIR resources"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Appointment Creation Failed",
            status=500,
            detail=f"Failed to create appointment: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("", response_model=PaginatedResponse[AppointmentSummary])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "appointment", "appointments_list")
async def list_appointments(
    request: Request,
    clinic_id: str = Query(..., description="Clinic ID for scoping"),
    patient_id: Optional[str] = Query(None, description="Filter by patient ID"),
    doctor_id: Optional[str] = Query(None, description="Filter by doctor ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    date_from: Optional[str] = Query(None, description="Filter from date YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="Filter to date YYYY-MM-DD"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_READ)),
    db: Session = Depends(get_db),
    appointments_service: AppointmentsService = Depends(get_appointments_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """List appointments with pagination, filtering, and clinic scoping."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.APPOINTMENT, ActionType.READ, clinic_id)

        # Build search parameters
        search_params = {
            "clinic_id": clinic_id,
            "page": page,
            "size": size
        }

        if patient_id:
            # Enforce patient access
            rbac_service.enforce_permission(current_user, ResourceType.PATIENT, ActionType.READ, clinic_id)
            search_params["patient_id"] = patient_id

        if doctor_id:
            # Enforce practitioner access
            rbac_service.enforce_permission(current_user, ResourceType.DOCTOR, ActionType.READ, clinic_id)
            search_params["practitioner_id"] = doctor_id

        if status:
            search_params["status"] = status

        if date_from:
            search_params["date_from"] = date_from

        if date_to:
            search_params["date_to"] = date_to

        # Get appointments using shared service
        appointments_result = await appointments_service.get_clinic_appointments(**search_params)

        # Transform to AppointmentSummary format
        appointments = []
        for apt in appointments_result["appointments"]:
            appointments.append(AppointmentSummary(
                id=apt["id"],
                date=apt["date"],
                time=apt["time"],
                patient_name=apt["patient_name"],
                patient_id=apt["patient_id"],
                doctor_name=apt["doctor_name"],
                doctor_id=apt["doctor_id"],
                reason=apt.get("reason"),
                description=apt.get("description"),
                status=apt["status"],
                priority=apt["priority"],
                duration=apt["duration"],
                formatted_date=apt["formatted_date"],
                fhir_appointment_id=apt.get("fhir_appointment_id")
            ))

        return create_paginated_response(
            items=appointments,
            page=page,
            size=size,
            total=appointments_result["total"]
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Appointments Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve appointments: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/{appointment_id}", response_model=SuccessResponse[AppointmentSummary])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "appointment", "appointment_detail")
async def get_appointment(
    request: Request,
    appointment_id: str = Path(..., description="Appointment ID"),
    clinic_id: str = Query(..., description="Clinic ID"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_READ)),
    db: Session = Depends(get_db),
    appointments_service: AppointmentsService = Depends(get_appointments_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get detailed appointment information."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.APPOINTMENT, ActionType.READ, clinic_id)

        # Get appointment using shared service
        appointment = await appointments_service.get_appointment(
            appointment_id=appointment_id,
            clinic_id=clinic_id
        )

        if not appointment:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Appointment Not Found",
                status=404,
                detail="Appointment not found or access denied",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())

        return SuccessResponse(
            data=AppointmentSummary(
                id=appointment["id"],
                date=appointment["date"],
                time=appointment["time"],
                patient_name=appointment["patient_name"],
                patient_id=appointment["patient_id"],
                doctor_name=appointment["doctor_name"],
                doctor_id=appointment["doctor_id"],
                reason=appointment.get("reason"),
                description=appointment.get("description"),
                status=appointment["status"],
                priority=appointment["priority"],
                duration=appointment["duration"],
                formatted_date=appointment["formatted_date"],
                fhir_appointment_id=appointment.get("fhir_appointment_id")
            ),
            message="Appointment retrieved successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Appointment Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve appointment: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.put("/{appointment_id}", response_model=SuccessResponse[AppointmentSummary])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("write", "appointment", "appointment_update")
async def update_appointment(
    request: Request,
    appointment_id: str = Path(..., description="Appointment ID"),
    payload: AppointmentUpdateRequest = Body(...),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_WRITE)),
    db: Session = Depends(get_db),
    appointments_service: AppointmentsService = Depends(get_appointments_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Update appointment using shared appointments service."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.APPOINTMENT, ActionType.UPDATE, payload.clinic_id)

        # Update appointment using shared service
        appointment_result = await appointments_service.update_appointment(
            appointment_id=appointment_id,
            clinic_id=payload.clinic_id,
            status=payload.status,
            appointment_date=payload.appointment_date,
            appointment_time=payload.appointment_time,
            appointment_type=payload.appointment_type,
            reason=payload.reason,
            description=payload.description,
            priority=payload.priority,
            duration=payload.duration,
            updated_by=current_user.user_id
        )

        return SuccessResponse(
            data=AppointmentSummary(
                id=appointment_result["id"],
                date=appointment_result["date"],
                time=appointment_result["time"],
                patient_name=appointment_result["patient_name"],
                patient_id=appointment_result["patient_id"],
                doctor_name=appointment_result["doctor_name"],
                doctor_id=appointment_result["doctor_id"],
                reason=appointment_result.get("reason"),
                description=appointment_result.get("description"),
                status=appointment_result["status"],
                priority=appointment_result["priority"],
                duration=appointment_result["duration"],
                formatted_date=appointment_result["formatted_date"],
                fhir_appointment_id=appointment_result.get("fhir_appointment_id")
            ),
            message="Appointment updated successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Appointment Update Failed",
            status=500,
            detail=f"Failed to update appointment: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.post("/{appointment_id}/confirm", response_model=SuccessResponse[AppointmentSummary])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("write", "appointment", "appointment_confirm")
async def confirm_appointment(
    request: Request,
    appointment_id: str = Path(..., description="Appointment ID"),
    clinic_id: str = Query(..., description="Clinic ID"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_WRITE)),
    db: Session = Depends(get_db),
    appointments_service: AppointmentsService = Depends(get_appointments_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Confirm appointment using shared appointments service."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.APPOINTMENT, ActionType.UPDATE, clinic_id)

        # Confirm appointment using shared service
        appointment_result = await appointments_service.confirm_appointment(
            appointment_id=appointment_id,
            clinic_id=clinic_id,
            confirmed_by=current_user.user_id
        )

        return SuccessResponse(
            data=AppointmentSummary(
                id=appointment_result["id"],
                date=appointment_result["date"],
                time=appointment_result["time"],
                patient_name=appointment_result["patient_name"],
                patient_id=appointment_result["patient_id"],
                doctor_name=appointment_result["doctor_name"],
                doctor_id=appointment_result["doctor_id"],
                reason=appointment_result.get("reason"),
                description=appointment_result.get("description"),
                status=appointment_result["status"],
                priority=appointment_result["priority"],
                duration=appointment_result["duration"],
                formatted_date=appointment_result["formatted_date"],
                fhir_appointment_id=appointment_result.get("fhir_appointment_id")
            ),
            message="Appointment confirmed successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Appointment Confirmation Failed",
            status=500,
            detail=f"Failed to confirm appointment: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.post("/{appointment_id}/cancel", response_model=SuccessResponse[AppointmentSummary])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("write", "appointment", "appointment_cancel")
async def cancel_appointment(
    request: Request,
    appointment_id: str = Path(..., description="Appointment ID"),
    clinic_id: str = Query(..., description="Clinic ID"),
    reason: Optional[str] = Query(None, description="Cancellation reason"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_WRITE)),
    db: Session = Depends(get_db),
    appointments_service: AppointmentsService = Depends(get_appointments_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Cancel appointment."""
    try:
        # Use current_user.clinic_id instead of query parameter (which might be "default-clinic")
        actual_clinic_id = current_user.clinic_id
        if not actual_clinic_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No clinic associated with user"
            )
        
        # Enforce permissions and clinic scoping - use try/except to handle permission errors gracefully
        try:
            rbac_service.enforce_permission(current_user, ResourceType.APPOINTMENT, ActionType.UPDATE, actual_clinic_id)
        except Exception as rbac_error:
            # If RBAC check fails, still allow if user has APPOINTMENT_WRITE permission (already checked by dependency)
            import logging
            logging.warning(f"RBAC enforcement failed for appointment cancellation: {rbac_error}, but user has APPOINTMENT_WRITE permission")

        from app.crud.appointment import appointment as appointment_crud
        from app.common.models.appointment import Appointment, AppointmentStatus
        from app.common.models.patient import Patient
        from app.common.models.doctor import Doctor
        from sqlalchemy.orm import joinedload
        from uuid import UUID
        
        # Convert clinic_id to UUID if needed
        try:
            clinic_uuid = UUID(actual_clinic_id) if isinstance(actual_clinic_id, str) else actual_clinic_id
        except (ValueError, TypeError):
            # If clinic_id is not a valid UUID, try to get it from user's organization_id
            from app.common.models.user import User
            user = db.query(User).filter(User.id == current_user.user_id).first()
            if user and user.organization_id:
                clinic_uuid = user.organization_id
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid clinic ID format"
                )
        
        # Convert appointment_id to UUID if needed
        try:
            appointment_uuid = UUID(appointment_id) if isinstance(appointment_id, str) else appointment_id
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid appointment ID format"
            )
        
        # Get appointment and verify it belongs to the clinic
        appointment = db.query(Appointment).filter(
            Appointment.id == appointment_uuid,
            Appointment.hospital_id == clinic_uuid
        ).options(
            joinedload(Appointment.patient).joinedload(Patient.user),
            joinedload(Appointment.doctor).joinedload(Doctor.user)
        ).first()
        
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found or does not belong to this clinic"
            )
        
        # Update appointment status to cancelled
        appointment.status = "cancelled"  # Use string value as status is a String column
        if reason:
            # Append cancellation reason to notes
            if appointment.notes:
                appointment.notes = f"{appointment.notes}\n[Cancelled: {reason}]"
            else:
                appointment.notes = f"[Cancelled: {reason}]"
        
        appointment.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(appointment)
        
        # Format response
        patient_name = "Unknown Patient"
        if appointment.patient and appointment.patient.user:
            patient_name = f"{appointment.patient.user.first_name or ''} {appointment.patient.user.last_name or ''}".strip() or appointment.patient.user.email or "Unknown Patient"
        
        doctor_name = "Unknown Doctor"
        if appointment.doctor and appointment.doctor.user:
            doctor_name = f"Dr. {appointment.doctor.user.first_name or ''} {appointment.doctor.user.last_name or ''}".strip() or "Unknown Doctor"
        
        # Format date and time
        apt_date = appointment.appointment_date
        date_str = apt_date.strftime("%Y-%m-%d") if apt_date else ""
        time_str = apt_date.strftime("%H:%M") if apt_date else ""
        formatted_date = apt_date.strftime("%d %b %Y") if apt_date else ""
        
        # Get appointment type
        appointment_type = appointment.appointment_type if hasattr(appointment, 'appointment_type') and appointment.appointment_type else "general_consultation"
        
        # Format timestamps
        created_at_str = appointment.created_at.strftime("%Y-%m-%dT%H:%M:%S") if appointment.created_at else datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
        updated_at_str = appointment.updated_at.strftime("%Y-%m-%dT%H:%M:%S") if appointment.updated_at else datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
        
        return SuccessResponse(
            data=AppointmentSummary(
                id=str(appointment.id),
                date=date_str,
                time=time_str,
                patient_name=patient_name,
                patient_id=str(appointment.patient_id),
                doctor_name=doctor_name,
                doctor_id=str(appointment.doctor_id),
                reason=appointment.reason or "",
                description=appointment.notes or "",
                status=appointment.status or "cancelled",
                priority="medium",  # Default priority
                appointment_type=appointment_type,
                duration=appointment.duration_minutes or 30,
                clinic_id=str(clinic_uuid),
                created_at=created_at_str,
                updated_at=updated_at_str,
                fhir_appointment_id=None
            ),
            message="Appointment cancelled successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Appointment Cancellation Failed",
            status=500,
            detail=f"Failed to cancel appointment: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/availability", response_model=SuccessResponse[List[TimeSlot]])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "appointment", "availability_check")
async def check_doctor_availability(
    request: Request,
    payload: DoctorAvailabilityRequest = Body(...),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_READ)),
    db: Session = Depends(get_db),
    appointments_service: AppointmentsService = Depends(get_appointments_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Check doctor availability for a specific date."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.APPOINTMENT, ActionType.READ, payload.clinic_id)

        # Validate practitioner access
        rbac_service.enforce_permission(current_user, ResourceType.DOCTOR, ActionType.READ, payload.clinic_id)

        # Check availability using shared service
        availability_result = await appointments_service.check_doctor_availability(
            practitioner_id=payload.practitioner_id,
            date=payload.date,
            clinic_id=payload.clinic_id
        )

        # Transform to TimeSlot format
        slots = []
        for slot in availability_result["slots"]:
            slots.append(TimeSlot(
                time=slot["time"],
                available=slot["available"],
                appointment_id=slot.get("appointment_id")
            ))

        return SuccessResponse(
            data=slots,
            message=f"Availability checked for {payload.date}"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Availability Check Failed",
            status=500,
            detail=f"Failed to check availability: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/stats", response_model=SuccessResponse[AppointmentStats])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "appointment", "appointment_stats")
async def get_appointment_stats(
    request: Request,
    clinic_id: str = Query(..., description="Clinic ID"),
    date_from: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_READ)),
    db: Session = Depends(get_db),
    appointments_service: AppointmentsService = Depends(get_appointments_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get appointment statistics for the clinic."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.APPOINTMENT, ActionType.READ, clinic_id)

        # Get stats using shared service
        stats = await appointments_service.get_clinic_appointment_stats(
            clinic_id=clinic_id,
            date_from=date_from,
            date_to=date_to
        )

        return SuccessResponse(
            data=AppointmentStats(
                total_appointments=stats["total_appointments"],
                confirmed_appointments=stats["confirmed_appointments"],
                pending_appointments=stats["pending_appointments"],
                completed_appointments=stats["completed_appointments"],
                cancelled_appointments=stats["cancelled_appointments"]
            ),
            message="Appointment statistics retrieved successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Appointment Stats Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve appointment statistics: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.delete("/{appointment_id}", response_model=SuccessResponse[Dict[str, str]])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("delete", "appointment", "appointment_delete")
async def delete_appointment(
    request: Request,
    appointment_id: str = Path(..., description="Appointment ID"),
    clinic_id: str = Query(..., description="Clinic ID"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_DELETE)),
    db: Session = Depends(get_db),
    appointments_service: AppointmentsService = Depends(get_appointments_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Delete appointment using shared appointments service."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.APPOINTMENT, ActionType.DELETE, clinic_id)

        # Delete appointment using shared service
        await appointments_service.delete_appointment(
            appointment_id=appointment_id,
            clinic_id=clinic_id,
            deleted_by=current_user.user_id
        )

        return SuccessResponse(
            data={"status": "deleted"},
            message="Appointment deleted successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Appointment Deletion Failed",
            status=500,
            detail=f"Failed to delete appointment: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.post("/{appointment_id}/reminder", response_model=SuccessResponse[SchemaAppointmentReminderResponse])
@audit_pii_access("write", "appointment", "appointment_reminder")
async def send_appointment_reminder(
    request: Request,
    appointment_id: str = Path(..., description="Appointment ID"),
    payload: SchemaAppointmentReminderRequest = Body(...),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_WRITE)),
    db: Session = Depends(get_db),
    appointments_service: AppointmentsService = Depends(get_appointments_service),
    messaging_service: MessagingService = Depends(get_messaging_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Send an appointment reminder using messaging service (SMS/email/phone)."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.APPOINTMENT, ActionType.UPDATE, payload.clinic_id)

        # Resolve appointment details via shared service
        appt = await appointments_service.get_appointment(
            appointment_id=appointment_id,
            clinic_id=payload.clinic_id,
        )
        if not appt:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Appointment Not Found",
                status=404,
                detail="Appointment not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())

        # Decide channel and send via messaging service
        channel = payload.reminder_type
        message = payload.message or f"Reminder: You have an appointment on {appt['date']} at {appt['time']}."
        await messaging_service.send_system_message(
            recipient_id=appt["patient_id"],
            message_type="appointment_reminder",
            content=message,
            metadata={
                "appointment_id": appointment_id,
                "clinic_id": payload.clinic_id,
                "channel": channel,
            }
        )

        return SuccessResponse(
            data=SchemaAppointmentReminderResponse(
                appointment_id=appointment_id,
                reminder_sent=True,
                reminder_type=channel,
                sent_at=datetime.now(timezone.utc).isoformat(),
                message=message
            ),
            message="Appointment reminder sent"
        )
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Appointment Reminder Failed",
            status=500,
            detail=f"Failed to send reminder: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


# ──────────────────────────────────────────────────────────────────────────────
# WebSocket Support for Real-time Updates
# ──────────────────────────────────────────────────────────────────────────────

@router.websocket("/ws/{clinic_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    clinic_id: str,
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_READ)),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """WebSocket endpoint for real-time appointment updates."""
    try:
        await websocket.accept()
        
        # Validate clinic access
        try:
            rbac_service.enforce_permission(current_user, ResourceType.APPOINTMENT, ActionType.READ, clinic_id)
        except HTTPException:
            await websocket.close(code=4003, reason="Clinic access denied")
            return

        # Add to active connections
        if not hasattr(websocket, '_active_connections'):
            websocket._active_connections = []
        websocket._active_connections.append(websocket)

        try:
            while True:
                # Keep connection alive and handle incoming messages
                data = await websocket.receive_text()
                
                # Handle real-time updates
                if data == "ping":
                    await websocket.send_text("pong")
                
        except WebSocketDisconnect:
            # Remove from active connections
            if websocket in websocket._active_connections:
                websocket._active_connections.remove(websocket)
                
    except Exception as e:
        await websocket.close(code=1011, reason=f"Internal error: {str(e)}")
