"""Secure Doctor Portal Authentication
Implements real authentication and authorization for doctor portal
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Body, Query, status, Request
from pydantic import BaseModel, Field, EmailStr
from app.portals.doctor.schemas.dashboard import PatientSummary as SchemaPatientSummary
from app.portals.doctor.schemas.appointments_enhanced import AppointmentSummary as SchemaAppointmentSummary
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.common.auth.auth_service import (
    AuthenticatedUser, get_current_user, require_doctor_access,
    require_permission, Permission, AuthService, ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.services.rbac_service import RBACService, ResourceType, ActionType
from app.common.models.user import User, UserRole, UserStatus
from app.common.models.doctor import Doctor
from app.common.models.patient import Patient
from app.common.models.appointment import Appointment
from app.crud.patient import patient as patient_crud
from app.crud.appointment import appointment as appointment_crud
from app.crud.prescription import prescription as prescription_crud
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id
from app.common.schemas.user_enhanced import (
    LoginRequest,
    LoginResponse,
    TokenRefreshRequest,
    DoctorUser as SchemaDoctorUser,
)

router = APIRouter(prefix="/secure", tags=["Doctor · Secure Authentication"])

# ──────────────────────────────────────────────────────────────────────────────
# Auth Endpoints (Login/Refresh)
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/auth/login", response_model=LoginResponse)
async def doctor_login(
    payload: LoginRequest = Body(...),
    db: Session = Depends(get_db),
):
    """Doctor login using shared LoginRequest/LoginResponse schemas."""
    # Find user by email, phone, or username
    user: Optional[User] = None
    
    if payload.phone:
        # Find by phone number
        user = db.query(User).filter(User.phone == payload.phone.strip()).first()
    elif payload.email:
        # Find by email
        user = db.query(User).filter(User.email.ilike(payload.email)).first()
    elif payload.username_or_email:
        # Legacy support: try email, username, or phone
        identifier = payload.username_or_email.strip()
        if "@" in identifier:
            # It's an email
            user = db.query(User).filter(User.email.ilike(identifier)).first()
        else:
            # Try username first
            user = db.query(User).filter(User.username.ilike(identifier)).first()
            # If not found, try phone number
            if not user:
                user = db.query(User).filter(User.phone == identifier).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found. Please check your email/phone/username and try again.")
    if user.role != UserRole.DOCTOR:
        raise HTTPException(status_code=401, detail="Access denied. This portal is for doctors only.")
    if not user.is_active or user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="Your account is inactive. Please contact support for assistance.")
    if not AuthService.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password. Please check your password and try again.")

    # Update last_login timestamp
    from datetime import datetime, timezone
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    # Clinic context from organization_id if present
    clinic_id: Optional[str] = None
    try:
        clinic_id = str(user.organization_id) if getattr(user, "organization_id", None) else None
    except Exception:
        clinic_id = None

    # Create tokens
    access_token = AuthService.create_access_token({
        "sub": str(user.id),
        "role": user.role.value,
        "clinic_id": clinic_id,
    })
    refresh_token = AuthService.create_refresh_token({
        "sub": str(user.id),
        "role": user.role.value,
        "clinic_id": clinic_id,
    })

    # Build DoctorUser payload
    full_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    doctor_user = SchemaDoctorUser(
        id=str(user.id),
        full_name=full_name or user.email,
        email=user.email,
        role=user.role.value,
        specialty=None,
        clinic_id=clinic_id or "",
        is_active=user.is_active,
        fhir_practitioner_id=None,
        fhir_practitioner_role_id=None,
        permissions=AuthService.get_user_permissions(user.role),
    )

    expires_in = int(ACCESS_TOKEN_EXPIRE_MINUTES) * 60

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=expires_in,
        user=doctor_user,
        requires_2fa=False,
        clinic_id=clinic_id or "",
        permissions=doctor_user.permissions or [],
        fhir_access=False,
        audit_access=False,
        session_id=str(uuid4()),
    )

@router.post("/auth/refresh", response_model=LoginResponse)
async def doctor_token_refresh(
    payload: TokenRefreshRequest = Body(...),
    db: Session = Depends(get_db),
):
    
    refresh_payload = AuthService.verify_token(payload.refresh_token)
    if not refresh_payload or refresh_payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user_id = refresh_payload.get("sub")
    user: Optional[User] = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != UserRole.DOCTOR or not user.is_active or user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    clinic_id = refresh_payload.get("clinic_id")

    access_token = AuthService.create_access_token({
        "sub": str(user.id),
        "role": user.role.value,
        "clinic_id": clinic_id,
    })
    new_refresh_token = AuthService.create_refresh_token({
        "sub": str(user.id),
        "role": user.role.value,
        "clinic_id": clinic_id,
    })

    full_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    doctor_user = SchemaDoctorUser(
        id=str(user.id),
        full_name=full_name or user.email,
        email=user.email,
        role=user.role.value,
        specialty=None,
        clinic_id=clinic_id or "",
        is_active=user.is_active,
        fhir_practitioner_id=None,
        fhir_practitioner_role_id=None,
        permissions=AuthService.get_user_permissions(user.role),
    )

    expires_in = int(ACCESS_TOKEN_EXPIRE_MINUTES) * 60

    return LoginResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=expires_in,
        user=doctor_user,
        requires_2fa=False,
        clinic_id=clinic_id or "",
        permissions=doctor_user.permissions or [],
        fhir_access=False,
        audit_access=False,
        session_id=str(uuid4()),
    )

# ──────────────────────────────────────────────────────────────────────────────
# Data Models
# ──────────────────────────────────────────────────────────────────────────────

class DoctorDashboardStats(BaseModel):
    total_patients: int = Field(..., description="Total patients assigned")
    today_appointments: int = Field(..., description="Appointments today")
    pending_prescriptions: int = Field(..., description="Pending prescriptions")
    completed_appointments: int = Field(..., description="Completed appointments today")
    upcoming_appointments: int = Field(..., description="Upcoming appointments")
    patient_messages: int = Field(..., description="Unread patient messages")

PatientSummary = SchemaPatientSummary

AppointmentSummary = SchemaAppointmentSummary

class PrescriptionSummary(BaseModel):
    id: str = Field(..., description="Prescription ID")
    patient_id: str = Field(..., description="Patient ID")
    patient_name: str = Field(..., description="Patient name")
    medication_name: str = Field(..., description="Medication name")
    dosage: str = Field(..., description="Dosage")
    frequency: str = Field(..., description="Frequency")
    duration: str = Field(..., description="Duration")
    status: str = Field(..., description="Prescription status")
    prescribed_date: str = Field(..., description="Prescribed date")
    instructions: Optional[str] = Field(None, description="Instructions")

# ──────────────────────────────────────────────────────────────────────────────
# Secure Doctor Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/dashboard/stats", response_model=SuccessResponse[DoctorDashboardStats])
@audit_pii_access("read", "doctor", "dashboard_stats")
async def get_doctor_dashboard_stats(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_doctor_access()),
    # ✅ PERMISSION CHECK: Require patient read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.PATIENT_READ)),
    db: Session = Depends(get_db)
):
    """Get doctor dashboard statistics with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can access doctor resources
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.PATIENT, ActionType.READ, current_user.clinic_id
        )
        
        # Get doctor statistics
        total_patients = patient_crud.count_by_doctor(db=db, doctor_id=current_user.user_id)
        today_appointments = appointment_crud.count_today_by_doctor(db=db, doctor_id=current_user.user_id)
        pending_prescriptions = prescription_crud.count_pending_by_doctor(db=db, doctor_id=current_user.user_id)
        completed_appointments = appointment_crud.count_completed_today_by_doctor(db=db, doctor_id=current_user.user_id)
        upcoming_appointments = appointment_crud.count_upcoming_by_doctor(db=db, doctor_id=current_user.user_id)
        patient_messages = 0  # Would come from messaging system
        
        stats = DoctorDashboardStats(
            total_patients=total_patients,
            today_appointments=today_appointments,
            pending_prescriptions=pending_prescriptions,
            completed_appointments=completed_appointments,
            upcoming_appointments=upcoming_appointments,
            patient_messages=patient_messages
        )
        
        # ✅ AUDIT LOG: Log the access
        from app.crud.admin import admin as admin_crud
        await admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type="DOCTOR_READ",
            description="Accessed doctor dashboard statistics",
            affected_resource_id=None,
            affected_resource_type="doctor_dashboard",
            metadata={"clinic_id": current_user.clinic_id}
        )
        
        return SuccessResponse(
            data=stats,
            message="Doctor dashboard statistics retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Doctor Dashboard Statistics Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve doctor dashboard statistics: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/patients", response_model=PaginatedResponse[PatientSummary])
@audit_pii_access("read", "patient", "doctor_patients")
async def get_doctor_patients(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_doctor_access()),
    # ✅ PERMISSION CHECK: Require patient read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.PATIENT_READ)),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db)
):
    """Get patients assigned to the current doctor with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can access patient data
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.PATIENT, ActionType.READ, current_user.clinic_id
        )
        
        # Get patients assigned to this doctor, filtered by clinic via organization_patients
        patients = patient_crud.get_by_doctor(
            db=db,
            doctor_id=current_user.user_id,
            clinic_id=current_user.clinic_id,  # Filter by doctor's clinic
            skip=(page - 1) * size,
            limit=size
        )
        
        # Transform to response format
        patient_summaries = []
        for patient in patients:
            # Get name from User relationship
            first_name = ""
            last_name = ""
            email = ""
            phone = ""
            if patient.user:
                first_name = patient.user.first_name or ""
                last_name = patient.user.last_name or ""
                email = patient.user.email or ""
                phone = patient.user.phone or ""
            
            patient_summaries.append(PatientSummary(
                id=str(patient.patient_id),
                first_name=first_name,
                last_name=last_name,
                age=None,  # Would calculate from date_of_birth
                gender=patient.sex or "",
                phone=phone or patient.phone or "",
                email=email,
                last_visit=None,  # Would get from appointments
                next_appointment=None,  # Would get from appointments
                medical_conditions=[],
                current_medications=[]
            ))
        
        # Get total count, filtered by clinic
        total = patient_crud.count_by_doctor(
            db=db, 
            doctor_id=current_user.user_id,
            clinic_id=current_user.clinic_id  # Filter by doctor's clinic
        )
        
        # ✅ AUDIT LOG: Log the access
        from app.crud.admin import admin as admin_crud
        await admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type="PATIENT_READ",
            description=f"Retrieved {len(patient_summaries)} assigned patients",
            affected_resource_id=None,
            affected_resource_type="doctor_patients",
            metadata={"clinic_id": current_user.clinic_id}
        )
        
        return create_paginated_response(
            data=patient_summaries,
            page=page,
            size=size,
            total=total
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Doctor Patients Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve doctor patients: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/appointments", response_model=PaginatedResponse[AppointmentSummary])
@audit_pii_access("read", "appointment", "doctor_appointments")
async def get_doctor_appointments(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_doctor_access()),
    # ✅ PERMISSION CHECK: Require appointment read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_READ)),
    status: Optional[str] = Query(None, description="Filter by appointment status"),
    date_from: Optional[str] = Query(None, description="Filter from date"),
    date_to: Optional[str] = Query(None, description="Filter to date"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db)
):
    """Get appointments for the current doctor with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can access appointment data
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.APPOINTMENT, ActionType.READ, current_user.clinic_id
        )
        
        # Get appointments for this doctor
        appointments = appointment_crud.get_by_doctor(
            db=db,
            doctor_id=current_user.user_id,
            skip=(page - 1) * size,
            limit=size,
            status=status,
            date_from=date_from,
            date_to=date_to
        )
        
        # Transform to response format
        appointment_summaries = []
        for appointment in appointments:
            # Get patient name
            patient = patient_crud.get(db=db, id=appointment.patient_id)
            patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Unknown Patient"
            
            appointment_summaries.append(AppointmentSummary(
                id=str(appointment.id),
                patient_id=str(appointment.patient_id),
                patient_name=patient_name,
                appointment_date=appointment.appointment_date.strftime("%Y-%m-%d") if appointment.appointment_date else "",
                appointment_time=appointment.appointment_date.strftime("%H:%M") if appointment.appointment_date else "",
                duration=appointment.duration_minutes if hasattr(appointment, 'duration_minutes') else (appointment.duration if hasattr(appointment, 'duration') else 30),
                status=appointment.status.value if appointment.status else "scheduled",
                type=appointment.appointment_type or "consultation",
                notes=appointment.notes,
                location=appointment.location
            ))
        
        # Get total count
        total = appointment_crud.count_by_doctor(
            db=db, 
            doctor_id=current_user.user_id,
            status=status,
            date_from=date_from,
            date_to=date_to
        )
        
        # ✅ AUDIT LOG: Log the access
        from app.crud.admin import admin as admin_crud
        await admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type="APPOINTMENT_READ",
            description=f"Retrieved {len(appointment_summaries)} appointments",
            affected_resource_id=None,
            affected_resource_type="doctor_appointments",
            metadata={"filters": {"status": status, "date_from": date_from, "date_to": date_to}}
        )
        
        return create_paginated_response(
            data=appointment_summaries,
            page=page,
            size=size,
            total=total
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Doctor Appointments Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve doctor appointments: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/prescriptions", response_model=PaginatedResponse[PrescriptionSummary])
@audit_pii_access("read", "prescription", "doctor_prescriptions")
async def get_doctor_prescriptions(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_doctor_access()),
    # ✅ PERMISSION CHECK: Require prescription read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.DOCTOR_PRESCRIPTIONS)),
    status: Optional[str] = Query(None, description="Filter by prescription status"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db)
):
    """Get prescriptions written by the current doctor with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can access prescription data
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.PRESCRIPTION, ActionType.READ, current_user.clinic_id
        )
        
        # Get prescriptions written by this doctor
        prescriptions = prescription_crud.get_by_doctor(
            db=db,
            doctor_id=current_user.user_id,
            skip=(page - 1) * size,
            limit=size,
            status=status
        )
        
        # Transform to response format
        prescription_summaries = []
        for prescription in prescriptions:
            # Get patient name
            patient = patient_crud.get(db=db, id=prescription.patient_id)
            patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Unknown Patient"
            
            prescription_summaries.append(PrescriptionSummary(
                id=str(prescription.id),
                patient_id=str(prescription.patient_id),
                patient_name=patient_name,
                medication_name=prescription.medication_name,
                dosage=prescription.dosage,
                frequency=prescription.frequency,
                duration=prescription.duration,
                status=prescription.status.value if prescription.status else "active",
                prescribed_date=prescription.created_at.isoformat() if prescription.created_at else "",
                instructions=prescription.instructions
            ))
        
        # Get total count
        total = prescription_crud.count_by_doctor(db=db, doctor_id=current_user.user_id, status=status)
        
        # ✅ AUDIT LOG: Log the access
        from app.crud.admin import admin as admin_crud
        await admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type="PRESCRIPTION_READ",
            description=f"Retrieved {len(prescription_summaries)} prescriptions",
            affected_resource_id=None,
            affected_resource_type="doctor_prescriptions",
            metadata={"filters": {"status": status}}
        )
        
        return create_paginated_response(
            data=prescription_summaries,
            page=page,
            size=size,
            total=total
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Doctor Prescriptions Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve doctor prescriptions: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())
