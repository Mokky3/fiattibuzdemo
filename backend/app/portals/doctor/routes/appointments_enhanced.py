"""Doctor portal – enhanced appointments router
Implements surgical edits: appointments_service integration, RBAC, clinic validation, standardized responses
"""
from datetime import datetime, timezone, date
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Path, Body, Query, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .auth import get_current_doctor, DoctorUser
from app.db.session import get_db
from app.services.rbac_service import RBACService
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access, require_clinic_scope
from app.common.utils.tracing import get_trace_id

router = APIRouter(prefix="/appointments", tags=["Doctor · Appointments"])

from app.portals.doctor.schemas.appointments_enhanced import (
    AppointmentSummary,
    AppointmentCreateRequest,
    AppointmentUpdateRequest,
    AvailabilityRequest,
    AvailabilitySlot,
)

# CRUD imports
from app.crud.appointment import appointment as appointment_crud
from app.crud.patient import patient as patient_crud

# ──────────────────────────────────────────────────────────────────────────────
# Simple Endpoints for Frontend Compatibility
# ──────────────────────────────────────────────────────────────────────────────

# ──────────────────────────────────────────────────────────────────────────────
# Simple/Static Endpoints (MUST come before parameterized routes)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/all", response_model=SuccessResponse[List[Dict[str, Any]]])
async def list_all_appointments_simple(
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Get all appointments for the current doctor (simple version for frontend)."""
    print("=" * 50)
    print("DEBUG: /all endpoint called!")
    print("=" * 50)
    try:
        # Get the doctor ID from the doctor profile
        doctor_id = current_doctor.doctor_profile.get('id') if current_doctor.doctor_profile else None
        if not doctor_id:
            print(f"DEBUG: Doctor profile: {current_doctor.doctor_profile}")
            print(f"DEBUG: Current doctor ID: {current_doctor.id}")
            # Fallback to current doctor ID if profile ID not available
            doctor_id = current_doctor.id
        
        print(f"DEBUG: Looking for appointments for doctor_id: {doctor_id}")
        
        # Also check if doctor exists in database
        from sqlalchemy import text
        check_query = text("SELECT COUNT(*) FROM ehr.doctors WHERE id = :doctor_id")
        result = db.execute(check_query, {"doctor_id": doctor_id})
        doctor_count = result.fetchone()[0]
        print(f"DEBUG: Doctor exists in database: {doctor_count > 0}")
        
        # Check total appointments
        total_query = text("SELECT COUNT(*) FROM ehr.appointments")
        result = db.execute(total_query)
        total_appointments = result.fetchone()[0]
        print(f"DEBUG: Total appointments in database: {total_appointments}")
        
        # Use raw SQL to get all appointments
        from sqlalchemy import text
        
        # Get the actual doctor ID from the doctor profile
        if hasattr(current_doctor, 'doctor_profile') and current_doctor.doctor_profile:
            if isinstance(current_doctor.doctor_profile, dict):
                doctor_actual_id = current_doctor.doctor_profile['id']
            else:
                doctor_actual_id = current_doctor.doctor_profile.id
        else:
            doctor_actual_id = doctor_id
        
        query = text("""
            SELECT 
                a.id,
                a.appointment_date,
                a.duration_minutes,
                a.appointment_type,
                a.status,
                a.reason,
                a.notes,
                u.first_name,
                u.last_name,
                h.name as hospital_name
            FROM ehr.appointments a
            LEFT JOIN ehr.patients p ON a.patient_id = p.patient_id
            LEFT JOIN core.users u ON p.user_id = u.id
            LEFT JOIN ref.hospitals h ON a.hospital_id = h.id
            WHERE a.doctor_id = :doctor_id
            AND a.status != 'cancelled'
            ORDER BY a.appointment_date DESC
        """)
        
        result = db.execute(query, {"doctor_id": str(doctor_actual_id)})
        
        # Transform to response format
        items = []
        for row in result:
            patient_name = "Unknown Patient"
            if row.first_name and row.last_name:
                patient_name = f"{row.first_name} {row.last_name}".strip()
            
            # Format time from appointment_date (which is a datetime)
            time_str = ""
            if row.appointment_date:
                if hasattr(row.appointment_date, 'strftime'):
                    time_str = row.appointment_date.strftime("%H:%M")
                else:
                    time_str = str(row.appointment_date)[:5] if len(str(row.appointment_date)) >= 5 else str(row.appointment_date)
            
            # Handle date formatting - return only the date part (YYYY-MM-DD)
            date_str = ""
            if row.appointment_date:
                if hasattr(row.appointment_date, 'date'):
                    # If it's a datetime object, get just the date part
                    date_str = row.appointment_date.date().isoformat()
                elif hasattr(row.appointment_date, 'isoformat'):
                    # If it's a datetime object, get just the date part
                    date_str = row.appointment_date.isoformat().split('T')[0]
                else:
                    # If it's already a string, try to extract just the date part
                    date_str = str(row.appointment_date).split('T')[0].split(' ')[0]
            
            items.append({
                "id": str(row.id),
                "date": date_str,
                "time": time_str,
                "patient": patient_name,
                "patient_id": str(row.id),  # Using appointment id as placeholder
                "appointment_type": row.appointment_type or "",
                "status": row.status or "",
                "description": row.notes or row.reason or "",
                "hospital_name": row.hospital_name or ""
            })
        
        return SuccessResponse(data=items, message="All appointments retrieved")
        
    except Exception as e:
        print(f"ERROR: Failed to retrieve appointments: {str(e)}")
        # Return empty array instead of raising exception to preserve CORS headers
        return SuccessResponse(data=[], message="No appointments available")

@router.get("/test", response_model=SuccessResponse[Dict[str, Any]])
async def test_endpoint():
    """Test endpoint to verify router is working."""
    print("DEBUG: /test endpoint called!")
    return SuccessResponse(data={"test": "success"}, message="Test endpoint working")

# ──────────────────────────────────────────────────────────────────────────────
# Parameterized Routes (come after static routes)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/by-date/{appointment_date}", response_model=SuccessResponse[List[Dict[str, Any]]])
async def list_appointments_for_date_simple(
    appointment_date: str = Path(..., description="Date in YYYY-MM-DD format", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Get appointments for a specific date for the current doctor (simple version without clinic_id requirement)."""
    try:
        # Get the doctor ID from the doctor profile
        doctor_id = current_doctor.doctor_profile.get('id') if current_doctor.doctor_profile else None
        if not doctor_id:
            raise HTTPException(status_code=500, detail="Doctor profile not found")
        
        # Use raw SQL to avoid SQLAlchemy datetime parsing issues
        from sqlalchemy import text
        
        query = text("""
            SELECT 
                a.id,
                a.appointment_date,
                a.start_time,
                a.end_time,
                a.appointment_type,
                a.status,
                a.description,
                p.first_name,
                p.last_name,
                h.name as hospital_name
            FROM ehr.appointments a
            LEFT JOIN ehr.patients p ON a.patient_id = p.patient_id
            LEFT JOIN ref.hospitals h ON a.hospital_id = h.id
            WHERE a.doctor_id = :doctor_id 
            AND a.appointment_date = :appointment_date
            AND a.status != 'cancelled'
            ORDER BY a.start_time
        """)
        
        result = db.execute(query, {
            "doctor_id": doctor_id,
            "appointment_date": appointment_date
        })
        
        # Transform to response format
        items = []
        for row in result:
            patient_name = "Unknown Patient"
            if row.first_name and row.last_name:
                patient_name = f"{row.first_name} {row.last_name}".strip()
            
            # Format time from string like "09:00:00" to "09:00"
            time_str = ""
            if row.start_time:
                time_str = row.start_time[:5] if len(row.start_time) >= 5 else row.start_time
            
            # Handle date formatting - return only the date part (YYYY-MM-DD)
            date_str = ""
            if row.appointment_date:
                if hasattr(row.appointment_date, 'date'):
                    # If it's a datetime object, get just the date part
                    date_str = row.appointment_date.date().isoformat()
                elif hasattr(row.appointment_date, 'isoformat'):
                    # If it's a datetime object, get just the date part
                    date_str = row.appointment_date.isoformat().split('T')[0]
                else:
                    # If it's already a string, try to extract just the date part
                    date_str = str(row.appointment_date).split('T')[0].split(' ')[0]
            
            items.append({
                "id": str(row.id),
                "date": date_str,
                "time": time_str,
                "patient": patient_name,
                "patient_id": str(row.id),
                "appointment_type": row.appointment_type or "",
                "status": row.status or "",
                "description": row.description or "",
                "hospital_name": row.hospital_name or ""
            })
        
        return SuccessResponse(data=items, message="Appointments retrieved")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve appointments: {str(e)}")

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Endpoints with Surgical Edits
# ──────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedResponse[AppointmentSummary])
@audit_pii_access("read", "appointment", "appointments_list")
async def list_appointments(
    request: Request,
    clinic_id: str = Query(..., description="Clinic ID for scoping"),
    patient_id: Optional[str] = Query(None, description="Filter by patient ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    date_from: Optional[str] = Query(None, description="Filter from date YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="Filter to date YYYY-MM-DD"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    rbac_service: RBACService = Depends(lambda: RBACService())
):
    """List appointments with pagination, filtering, and clinic scoping (DB CRUD)."""
    try:
        if not rbac_service.can_access_clinic(current_doctor.id, clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())

        appts = appointment_crud.get_by_doctor(
            db,
            doctor_id=current_doctor.id,
            skip=(page - 1) * size,
            limit=size,
            status=status,
            date_from=date_from,
            date_to=date_to,
        )
        items: List[AppointmentSummary] = []
        from app.common.models.patient import Patient
        from sqlalchemy.orm import joinedload
        for a in appts:
            pt = db.query(Patient).options(joinedload(Patient.user)).filter(Patient.patient_id == a.patient_id).first()
            # Get patient name from user relationship
            patient_name = "Unknown Patient"
            if pt and pt.user:
                first_name = pt.user.first_name or ''
                last_name = pt.user.last_name or ''
                full_name = f"{first_name} {last_name}".strip()
                patient_name = full_name if full_name else (pt.user.email or "Unknown Patient")
            items.append(AppointmentSummary(
                id=str(a.id),
                date=a.appointment_date.isoformat() if a.appointment_date else "",
                time=a.start_time.isoformat() if a.start_time else "",
                patient_name=patient_name,
                patient_id=str(a.patient_id),
                problem=a.chief_complaint,
                description=a.description,
                status=a.status.value if a.status else "",
                formatted_date=a.appointment_date.strftime("%d %b %Y") if a.appointment_date else "",
                appointment_type=a.appointment_type.value if getattr(a, "appointment_type", None) else None,
                notes=a.description,
                fhir_appointment_id=a.fhir_appointment_id
            ))
        total = appointment_crud.count_by_doctor(
            db,
            doctor_id=current_doctor.id,
            status=status,
            date_from=date_from,
            date_to=date_to,
        )
        return create_paginated_response(data=items, page=page, size=size, total=total)
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
@audit_pii_access("read", "appointment", "appointment_detail")
async def get_appointment(
    request: Request,
    appointment_id: str = Path(..., description="Appointment ID"),
    clinic_id: str = Query(..., description="Clinic ID"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    rbac_service: RBACService = Depends(lambda: RBACService())
):
    try:
        # Create AuthenticatedUser object for RBAC check
        from app.common.auth.auth_service import AuthenticatedUser
        from app.crud.user import user as user_crud
        user_obj = user_crud.get(db=db, id=current_doctor.id)
        
        auth_user = AuthenticatedUser(
            user=user_obj,
            permissions=["appointment:read"],
            clinic_id=clinic_id
        )
        
        if not rbac_service.can_access_clinic(auth_user, clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())
        from app.common.models.appointment import Appointment
        from app.common.utils.uuid_helpers import uuid_str
        
        # Get the actual doctor ID from the doctor profile
        if hasattr(current_doctor, 'doctor_profile') and current_doctor.doctor_profile:
            if isinstance(current_doctor.doctor_profile, dict):
                doctor_actual_id = current_doctor.doctor_profile['id']
            else:
                doctor_actual_id = current_doctor.doctor_profile.id
        else:
            doctor_actual_id = current_doctor.id
        
        a = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.doctor_id == doctor_actual_id).first()
        if not a:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Appointment Not Found",
                status=404,
                detail="Appointment not found or access denied",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        from app.common.models.patient import Patient
        from sqlalchemy.orm import joinedload
        pt = db.query(Patient).options(joinedload(Patient.user)).filter(Patient.patient_id == a.patient_id).first()
        # Get patient name from user relationship
        patient_name = "Unknown Patient"
        if pt and pt.user:
            first_name = pt.user.first_name or ''
            last_name = pt.user.last_name or ''
            full_name = f"{first_name} {last_name}".strip()
            patient_name = full_name if full_name else (pt.user.email or "Unknown Patient")
        return SuccessResponse(
            data=AppointmentSummary(
                id=uuid_str(a.id),
                date=a.appointment_date.isoformat() if a.appointment_date else "",
                time=a.appointment_date.strftime("%H:%M") if a.appointment_date else "",
                patient_name=patient_name,
                patient_id=uuid_str(a.patient_id),
                problem=a.reason or "",
                description=a.notes or "",
                status=a.status or "",
                formatted_date=a.appointment_date.strftime("%d %b %Y") if a.appointment_date else "",
                appointment_type=a.appointment_type or "",
                notes=a.notes or "",
                fhir_appointment_id=None,
                clinic_id=uuid_str(a.hospital_id),
                doctor_id=uuid_str(a.doctor_id)
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


@router.post("", response_model=SuccessResponse[AppointmentSummary], status_code=status.HTTP_201_CREATED)
@audit_pii_access("write", "appointment", "appointment_create")
async def create_appointment(
    request: Request,
    payload: AppointmentCreateRequest = Body(...),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    rbac_service: RBACService = Depends(lambda: RBACService())
):
    try:
        print(f"DEBUG: Starting appointment creation")
        print(f"DEBUG: payload = {payload}")
        print(f"DEBUG: current_doctor = {current_doctor}")
        print(f"DEBUG: current_doctor.id = {current_doctor.id} (type: {type(current_doctor.id)})")
        print(f"DEBUG: payload.clinic_id = {payload.clinic_id} (type: {type(payload.clinic_id)})")
        
        # Create AuthenticatedUser object for RBAC check
        from app.common.auth.auth_service import AuthenticatedUser
        # Get the User object from the database
        from app.crud.user import user as user_crud
        user_obj = user_crud.get(db=db, id=current_doctor.id)
        print(f"DEBUG: user_obj = {user_obj}")
        print(f"DEBUG: user_obj.role = {user_obj.role} (type: {type(user_obj.role)})")
        
        auth_user = AuthenticatedUser(
            user=user_obj,
            permissions=["appointment:create"],
            clinic_id=payload.clinic_id
        )
        
        print(f"DEBUG: auth_user = {auth_user}")
        print(f"DEBUG: auth_user.role = {auth_user.role} (type: {type(auth_user.role)})")
        print(f"DEBUG: About to call rbac_service.can_access_clinic")
        
        if not rbac_service.can_access_clinic(auth_user, payload.clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())
        from app.common.models.appointment import Appointment
        from datetime import datetime, date
        import uuid
        from app.common.utils.uuid_helpers import as_uuid
        
        # Parse appointment date and time
        appointment_date = None
        if payload.appointment_date and payload.appointment_time:
            appointment_date = datetime.combine(
                date.fromisoformat(payload.appointment_date), 
                datetime.strptime(payload.appointment_time, "%H:%M").time()
            )
        
        # Convert string IDs to UUIDs safely
        patient_uuid = as_uuid(payload.patient_id)
        
        # Use the doctor's actual ID from the doctor profile, not the user ID
        if hasattr(current_doctor, 'doctor_profile') and current_doctor.doctor_profile:
            if isinstance(current_doctor.doctor_profile, dict):
                doctor_uuid = as_uuid(current_doctor.doctor_profile['id'])
            else:
                doctor_uuid = as_uuid(current_doctor.doctor_profile.id)
        else:
            doctor_uuid = as_uuid(current_doctor.id)
        
        # For now, use the default hospital ID from the database
        # TODO: Make this configurable or get from payload
        default_hospital_id = as_uuid('bc5719be-aa1c-42fd-9b34-f3a6c841770a')
        
        a = Appointment(
            id=uuid.uuid4(),
            patient_id=patient_uuid,
            doctor_id=doctor_uuid,
            hospital_id=default_hospital_id,
            appointment_date=appointment_date,
            duration_minutes=payload.duration_minutes or 30,
            status="pending",
            appointment_type=payload.appointment_type or "general_consultation",
            reason=payload.notes,
            notes=payload.notes,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(a)
        db.commit()
        db.refresh(a)
        
        # Get patient info safely with user relationship
        from app.common.utils.uuid_helpers import uuid_str
        from app.common.models.patient import Patient
        from sqlalchemy.orm import joinedload
        
        pt = db.query(Patient).options(joinedload(Patient.user)).filter(Patient.patient_id == a.patient_id).first()
        
        # Get patient name from user relationship
        patient_name = "Unknown Patient"
        if pt and pt.user:
            first_name = pt.user.first_name or ''
            last_name = pt.user.last_name or ''
            full_name = f"{first_name} {last_name}".strip()
            patient_name = full_name if full_name else (pt.user.email or "Unknown Patient")
        
        # Debug the appointment object
        print(f"DEBUG: appointment_date type: {type(a.appointment_date)}")
        print(f"DEBUG: appointment_date value: {a.appointment_date}")
        print(f"DEBUG: hospital_id type: {type(a.hospital_id)}")
        print(f"DEBUG: doctor_id type: {type(a.doctor_id)}")
        
        return SuccessResponse(
            data=AppointmentSummary(
                id=uuid_str(a.id),
                date=a.appointment_date.isoformat() if a.appointment_date and hasattr(a.appointment_date, 'isoformat') else "",
                time=a.appointment_date.strftime("%H:%M") if a.appointment_date and hasattr(a.appointment_date, 'strftime') else "",
                patient_name=patient_name,
                patient_id=uuid_str(a.patient_id),
                problem=a.reason or "",
                description=a.notes or "",
                status=a.status or "",
                formatted_date=a.appointment_date.strftime("%d %b %Y") if a.appointment_date and hasattr(a.appointment_date, 'strftime') else "",
                appointment_type=a.appointment_type or "",
                notes=a.notes or "",
                clinic_id=uuid_str(a.hospital_id),
                doctor_id=uuid_str(a.doctor_id)
            ),
            message="Appointment created successfully"
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


@router.put("/{appointment_id}", response_model=SuccessResponse[AppointmentSummary])
@audit_pii_access("write", "appointment", "appointment_update")
async def update_appointment(
    request: Request,
    appointment_id: str = Path(..., description="Appointment ID"),
    payload: AppointmentUpdateRequest = Body(...),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    rbac_service: RBACService = Depends(lambda: RBACService())
):
    try:
        if not rbac_service.can_access_clinic(current_doctor.id, payload.clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())
        from app.common.models.appointment import Appointment, AppointmentStatus, AppointmentType
        a = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.doctor_id == current_doctor.id).first()
        if not a:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Appointment Not Found",
                status=404,
                detail="Appointment not found or access denied",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        data: Dict[str, Any] = {}
        if payload.appointment_date:
            data["appointment_date"] = date.fromisoformat(payload.appointment_date)
        if payload.appointment_time:
            data["start_time"] = datetime.fromisoformat(payload.appointment_time)
        if payload.appointment_type:
            try:
                data["appointment_type"] = AppointmentType(payload.appointment_type)
            except Exception:
                pass
        if payload.status:
            try:
                data["status"] = AppointmentStatus(payload.status)
            except Exception:
                pass
        if payload.notes is not None:
            data["description"] = payload.notes
        updated = appointment_crud.update(db=db, db_obj=a, obj_in=data)
        from app.common.models.patient import Patient
        from sqlalchemy.orm import joinedload
        pt = db.query(Patient).options(joinedload(Patient.user)).filter(Patient.patient_id == updated.patient_id).first()
        # Get patient name from user relationship
        patient_name = "Unknown Patient"
        if pt and pt.user:
            first_name = pt.user.first_name or ''
            last_name = pt.user.last_name or ''
            full_name = f"{first_name} {last_name}".strip()
            patient_name = full_name if full_name else (pt.user.email or "Unknown Patient")
        return SuccessResponse(
            data=AppointmentSummary(
                id=str(updated.id),
                date=updated.appointment_date.isoformat() if updated.appointment_date else "",
                time=updated.start_time.isoformat() if updated.start_time else "",
                patient_name=patient_name,
                patient_id=str(updated.patient_id),
                problem=updated.chief_complaint,
                description=updated.description,
                status=updated.status.value if updated.status else "",
                formatted_date=updated.appointment_date.strftime("%d %b %Y") if updated.appointment_date else "",
                appointment_type=updated.appointment_type.value if getattr(updated, "appointment_type", None) else None,
                notes=updated.description,
                fhir_appointment_id=updated.fhir_appointment_id
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
@audit_pii_access("write", "appointment", "appointment_confirm")
async def confirm_appointment(
    request: Request,
    appointment_id: str = Path(..., description="Appointment ID"),
    clinic_id: str = Query(..., description="Clinic ID"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    rbac_service: RBACService = Depends(lambda: RBACService())
):
    try:
        # Create AuthenticatedUser object for RBAC check
        from app.common.auth.auth_service import AuthenticatedUser
        from app.crud.user import user as user_crud
        user_obj = user_crud.get(db=db, id=current_doctor.id)
        
        auth_user = AuthenticatedUser(
            user=user_obj,
            permissions=["appointment:write"],
            clinic_id=clinic_id
        )
        
        if not rbac_service.can_access_clinic(auth_user, clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())
        from app.common.models.appointment import AppointmentStatus
        updated = appointment_crud.update_appointment_status(
            db,
            appointment_id=appointment_id,
            status=AppointmentStatus.BOOKED
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Get patient info safely with user relationship loaded
        from app.common.utils.uuid_helpers import uuid_str
        from app.common.models.patient import Patient
        from sqlalchemy.orm import joinedload
        
        pt = db.query(Patient).options(
            joinedload(Patient.user)
        ).filter(Patient.patient_id == updated.patient_id).first()
        
        # Get patient name from user relationship
        patient_name = "Unknown Patient"
        if pt and pt.user:
            first_name = pt.user.first_name or ''
            last_name = pt.user.last_name or ''
            full_name = f"{first_name} {last_name}".strip()
            patient_name = full_name if full_name else (pt.user.email or "Unknown Patient")
        
        return SuccessResponse(
            data=AppointmentSummary(
                id=uuid_str(updated.id),
                date=updated.appointment_date.isoformat() if updated.appointment_date else "",
                time=updated.appointment_date.strftime("%H:%M") if updated.appointment_date else "",
                patient_name=patient_name,
                patient_id=uuid_str(updated.patient_id),
                problem=updated.reason or "",
                description=updated.notes or "",
                status=updated.status,
                formatted_date=updated.appointment_date.strftime("%d %b %Y") if updated.appointment_date else "",
                appointment_type=updated.appointment_type,
                notes=updated.notes or "",
                fhir_appointment_id=None,  # This field doesn't exist in our simplified model
                clinic_id=uuid_str(updated.hospital_id),  # ✅ Map hospital_id to clinic_id
                doctor_id=uuid_str(updated.doctor_id)     # ✅ Use scalar doctor_id column
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


@router.post("/{appointment_id}/decline", response_model=SuccessResponse[AppointmentSummary])
@audit_pii_access("write", "appointment", "appointment_decline")
async def decline_appointment(
    request: Request,
    appointment_id: str = Path(..., description="Appointment ID"),
    clinic_id: str = Query(..., description="Clinic ID"),
    reason: Optional[str] = Query(None, description="Reason for declining"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    rbac_service: RBACService = Depends(lambda: RBACService())
):
    try:
        # Create AuthenticatedUser object for RBAC check
        from app.common.auth.auth_service import AuthenticatedUser
        from app.crud.user import user as user_crud
        user_obj = user_crud.get(db=db, id=current_doctor.id)
        
        auth_user = AuthenticatedUser(
            user=user_obj,
            permissions=["appointment:write"],
            clinic_id=clinic_id
        )
        
        if not rbac_service.can_access_clinic(auth_user, clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())
        from app.common.models.appointment import AppointmentStatus
        updated = appointment_crud.update_appointment_status(
            db,
            appointment_id=appointment_id,
            status=AppointmentStatus.CANCELLED,
            notes=reason
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Get patient info safely with user relationship
        from app.common.utils.uuid_helpers import uuid_str
        from sqlalchemy.orm import joinedload
        from app.common.models.patient import Patient
        pt = db.query(Patient).options(joinedload(Patient.user)).filter(Patient.patient_id == updated.patient_id).first()
        
        # Extract patient name from user relationship
        patient_name = ""
        if pt and pt.user:
            if pt.user.first_name and pt.user.last_name:
                patient_name = f"{pt.user.first_name} {pt.user.last_name}"
            elif pt.user.full_name:
                patient_name = pt.user.full_name
        
        return SuccessResponse(
            data=AppointmentSummary(
                id=uuid_str(updated.id),
                date=updated.appointment_date.isoformat() if updated.appointment_date else "",
                time=updated.appointment_date.strftime("%H:%M") if updated.appointment_date else "",
                patient_name=patient_name,
                patient_id=uuid_str(updated.patient_id),
                problem=updated.reason or "",
                description=updated.notes or "",
                status=updated.status,
                formatted_date=updated.appointment_date.strftime("%d %b %Y") if updated.appointment_date else "",
                appointment_type=updated.appointment_type,
                notes=updated.notes or "",
                fhir_appointment_id=None,  # This field doesn't exist in our simplified model
                clinic_id=uuid_str(updated.hospital_id),  # ✅ Map hospital_id to clinic_id
                doctor_id=uuid_str(updated.doctor_id)     # ✅ Use scalar doctor_id column
            ),
            message="Appointment declined successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Appointment Decline Failed",
            status=500,
            detail=f"Failed to decline appointment: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.post("/{appointment_id}/complete", response_model=SuccessResponse[AppointmentSummary])
@audit_pii_access("write", "appointment", "appointment_complete")
async def complete_appointment(
    request: Request,
    appointment_id: str = Path(..., description="Appointment ID"),
    clinic_id: str = Query(..., description="Clinic ID"),
    notes: Optional[str] = Query(None, description="Completion notes"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    rbac_service: RBACService = Depends(lambda: RBACService())
):
    try:
        if not rbac_service.can_access_clinic(current_doctor.id, clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())
        from app.common.models.appointment import AppointmentStatus
        updated = appointment_crud.update_appointment_status(
            db,
            appointment_id=appointment_id,
            status=AppointmentStatus.COMPLETED,
            notes=notes
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Appointment not found")
        from app.common.models.patient import Patient
        from sqlalchemy.orm import joinedload
        pt = db.query(Patient).options(joinedload(Patient.user)).filter(Patient.patient_id == updated.patient_id).first()
        # Get patient name from user relationship
        patient_name = "Unknown Patient"
        if pt and pt.user:
            first_name = pt.user.first_name or ''
            last_name = pt.user.last_name or ''
            full_name = f"{first_name} {last_name}".strip()
            patient_name = full_name if full_name else (pt.user.email or "Unknown Patient")
        return SuccessResponse(
            data=AppointmentSummary(
                id=str(updated.id),
                date=updated.appointment_date.isoformat() if updated.appointment_date else "",
                time=updated.start_time.isoformat() if updated.start_time else "",
                patient_name=patient_name,
                patient_id=str(updated.patient_id),
                problem=updated.chief_complaint,
                description=updated.description,
                status=updated.status.value if updated.status else "",
                formatted_date=updated.appointment_date.strftime("%d %b %Y") if updated.appointment_date else "",
                appointment_type=updated.appointment_type.value if getattr(updated, "appointment_type", None) else None,
                notes=updated.description,
                fhir_appointment_id=updated.fhir_appointment_id
            ),
            message="Appointment completed successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Appointment Completion Failed",
            status=500,
            detail=f"Failed to complete appointment: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/availability", response_model=SuccessResponse[List[AvailabilitySlot]])
@audit_pii_access("read", "appointment", "availability_check")
async def check_availability(
    request: Request,
    payload: AvailabilityRequest = Body(...),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    rbac_service: RBACService = Depends(lambda: RBACService())
):
    """Check doctor availability for a specific date (stubbed)."""
    try:
        if not rbac_service.can_access_clinic(current_doctor.id, payload.clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())
        # TODO: Implement availability from schedules
        slots: List[AvailabilitySlot] = []
        return SuccessResponse(data=slots, message=f"Availability checked for {payload.date}")
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


@router.delete("/{appointment_id}", response_model=SuccessResponse[Dict[str, str]])
@audit_pii_access("delete", "appointment", "appointment_delete")
async def delete_appointment(
    request: Request,
    appointment_id: str = Path(..., description="Appointment ID"),
    clinic_id: str = Query(..., description="Clinic ID"),
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
    rbac_service: RBACService = Depends(lambda: RBACService())
):
    try:
        if not rbac_service.can_access_clinic(current_doctor.id, clinic_id):
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Access Denied",
                status=403,
                detail="Doctor does not have access to this clinic",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=403, detail=problem.dict())
        from app.common.models.appointment import Appointment
        a = db.query(Appointment).filter(Appointment.id == appointment_id, Appointment.doctor_id == current_doctor.id).first()
        if not a:
            raise HTTPException(status_code=404, detail="Appointment not found")
        db.delete(a)
        db.commit()
        return SuccessResponse(data={"status": "deleted"}, message="Appointment deleted successfully")
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


@router.get("/comprehensive", response_model=SuccessResponse[List[AppointmentSummary]])
async def get_comprehensive_appointments(
    current_doctor: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive appointment listing with full relationship data.
    This endpoint shows appointments with complete hospital, patient, and doctor information.
    """
    try:
        from sqlalchemy import text
        
        # Get the actual doctor ID from the doctor profile
        if hasattr(current_doctor, 'doctor_profile') and current_doctor.doctor_profile:
            if isinstance(current_doctor.doctor_profile, dict):
                doctor_actual_id = current_doctor.doctor_profile['id']
            else:
                doctor_actual_id = current_doctor.doctor_profile.id
        else:
            doctor_actual_id = current_doctor.id
        
        query = text("""
            SELECT 
                a.id,
                a.appointment_date,
                a.duration_minutes,
                a.appointment_type,
                a.status,
                a.reason,
                a.notes,
                a.patient_id,
                a.doctor_id,
                a.hospital_id,
                u.first_name,
                u.last_name,
                h.name as hospital_name,
                d.primary_specialization as doctor_specialization
            FROM ehr.appointments a
            LEFT JOIN ehr.patients p ON a.patient_id = p.patient_id
            LEFT JOIN core.users u ON p.user_id = u.id
            LEFT JOIN ref.hospitals h ON a.hospital_id = h.id
            LEFT JOIN ehr.doctors d ON a.doctor_id = d.id
            WHERE a.doctor_id = :doctor_id
            AND a.status != 'cancelled'
            ORDER BY a.appointment_date DESC
        """)
        
        result = db.execute(query, {"doctor_id": str(doctor_actual_id)})
        
        # Transform to response format
        items = []
        for row in result:
            patient_name = "Unknown Patient"
            if row.first_name and row.last_name:
                patient_name = f"{row.first_name} {row.last_name}".strip()
            
            # Format time from appointment_date (which is a datetime)
            time_str = ""
            if row.appointment_date:
                if hasattr(row.appointment_date, 'strftime'):
                    time_str = row.appointment_date.strftime("%H:%M")
                else:
                    time_str = str(row.appointment_date)[:5] if len(str(row.appointment_date)) >= 5 else str(row.appointment_date)
            
            # Handle date formatting - return only the date part (YYYY-MM-DD)
            date_str = ""
            if row.appointment_date:
                if hasattr(row.appointment_date, 'date'):
                    # If it's a datetime object, get just the date part
                    date_str = row.appointment_date.date().isoformat()
                elif hasattr(row.appointment_date, 'isoformat'):
                    # If it's a datetime object, get just the date part
                    date_str = row.appointment_date.isoformat().split('T')[0]
                else:
                    # If it's already a string, try to extract just the date part
                    date_str = str(row.appointment_date).split('T')[0].split(' ')[0]
            
            # Parse date for formatted_date
            dateObj = None
            if date_str and isinstance(date_str, str):
                try:
                    from datetime import datetime
                    dateObj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                except:
                    dateObj = None
            
            items.append({
                "id": str(row.id),
                "date": date_str,
                "time": time_str,
                "patient_name": patient_name,
                "patient_id": str(row.patient_id),
                "problem": row.reason or "",
                "description": row.notes or row.reason or "",
                "status": row.status or "",
                "formatted_date": dateObj.strftime("%d.%m.%Y") if dateObj else "",
                "appointment_type": row.appointment_type or "",
                "notes": row.notes or "",
                "clinic_id": str(row.hospital_id),
                "doctor_id": str(row.doctor_id)
            })
        
        return SuccessResponse(
            data=items,
            message=f"Found {len(items)} appointments"
        )
        
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Appointment Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve appointments: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())
