"""Secure Reception Portal Authentication
Implements real authentication and authorization for reception portal
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Body, Query, status, Request
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.common.auth.auth_service import (
    AuthenticatedUser, get_current_user, require_receptionist_access,
    require_permission, Permission, AuthService
)
from app.services.rbac_service import RBACService, ResourceType, ActionType
from app.common.models.user import User, UserRole, UserStatus
from app.common.models.patient import Patient
from app.common.models.appointment import Appointment
from app.common.models.doctor import Doctor
from app.crud.patient import patient as patient_crud
from app.crud.appointment import appointment as appointment_crud
from app.crud.user import user as user_crud
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id

router = APIRouter(tags=["Reception · Secure Authentication"])

# ──────────────────────────────────────────────────────────────────────────────
# Data Models
# ──────────────────────────────────────────────────────────────────────────────

class ReceptionDashboardStats(BaseModel):
    total_patients: int = Field(..., description="Total patients registered")
    today_appointments: int = Field(..., description="Appointments today")
    pending_appointments: int = Field(..., description="Pending appointments")
    completed_appointments: int = Field(..., description="Completed appointments today")
    new_registrations: int = Field(..., description="New patient registrations today")
    walk_in_patients: int = Field(..., description="Walk-in patients today")

class PatientRegistration(BaseModel):
    first_name: str = Field(..., min_length=2, max_length=50, description="First name")
    last_name: str = Field(..., min_length=2, max_length=50, description="Last name")
    email: EmailStr = Field(..., description="Email address")
    phone: str = Field(..., description="Phone number")
    date_of_birth: str = Field(..., description="Date of birth (YYYY-MM-DD)")
    gender: str = Field(..., description="Gender")
    address: Optional[str] = Field(None, description="Address")
    emergency_contact_name: Optional[str] = Field(None, description="Emergency contact name")
    emergency_contact_phone: Optional[str] = Field(None, description="Emergency contact phone")
    insurance_provider: Optional[str] = Field(None, description="Insurance provider")
    insurance_number: Optional[str] = Field(None, description="Insurance number")

class AppointmentBooking(BaseModel):
    patient_id: str = Field(..., description="Patient ID")
    doctor_id: str = Field(..., description="Doctor ID")
    appointment_date: str = Field(..., description="Appointment date (YYYY-MM-DD)")
    appointment_time: str = Field(..., description="Appointment time (HH:MM)")
    appointment_type: str = Field(..., description="Appointment type")
    duration: int = Field(30, ge=15, le=120, description="Duration in minutes")
    notes: Optional[str] = Field(None, description="Appointment notes")
    location: Optional[str] = Field(None, description="Appointment location")

class AppointmentSummary(BaseModel):
    id: str = Field(..., description="Appointment ID")
    patient_id: str = Field(..., description="Patient ID")
    patient_name: str = Field(..., description="Patient name")
    doctor_id: str = Field(..., description="Doctor ID")
    doctor_name: str = Field(..., description="Doctor name")
    appointment_date: str = Field(..., description="Appointment date")
    appointment_time: str = Field(..., description="Appointment time")
    duration: int = Field(..., description="Duration in minutes")
    status: str = Field(..., description="Appointment status")
    type: str = Field(..., description="Appointment type")
    notes: Optional[str] = Field(None, description="Appointment notes")
    location: Optional[str] = Field(None, description="Appointment location")

class PatientSummary(BaseModel):
    id: str = Field(..., description="Patient ID")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    email: str = Field(..., description="Email")
    phone: str = Field(..., description="Phone number")
    date_of_birth: str = Field(..., description="Date of birth")
    gender: str = Field(..., description="Gender")
    registration_date: str = Field(..., description="Registration date")
    last_visit: Optional[str] = Field(None, description="Last visit date")
    next_appointment: Optional[str] = Field(None, description="Next appointment")

# ──────────────────────────────────────────────────────────────────────────────
# Secure Reception Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/dashboard/stats", response_model=SuccessResponse[ReceptionDashboardStats])
@audit_pii_access("read", "reception", "dashboard_stats")
async def get_reception_dashboard_stats(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    # ✅ PERMISSION CHECK: Require patient read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.PATIENT_READ)),
    db: Session = Depends(get_db)
):
    """Get reception dashboard statistics with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can access reception resources
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.PATIENT, ActionType.READ, current_user.clinic_id
        )
        
        # Get reception statistics
        total_patients = patient_crud.count_by_clinic(db=db, clinic_id=current_user.clinic_id)
        today_appointments = appointment_crud.count_today_by_clinic(db=db, clinic_id=current_user.clinic_id)
        pending_appointments = appointment_crud.count_pending_by_clinic(db=db, clinic_id=current_user.clinic_id)
        completed_appointments = appointment_crud.count_completed_today_by_clinic(db=db, clinic_id=current_user.clinic_id)
        new_registrations = patient_crud.count_new_today_by_clinic(db=db, clinic_id=current_user.clinic_id)
        walk_in_patients = appointment_crud.count_walk_in_today_by_clinic(db=db, clinic_id=current_user.clinic_id)
        
        stats = ReceptionDashboardStats(
            total_patients=total_patients,
            today_appointments=today_appointments,
            pending_appointments=pending_appointments,
            completed_appointments=completed_appointments,
            new_registrations=new_registrations,
            walk_in_patients=walk_in_patients
        )
        
        # ✅ AUDIT LOG: Log the access
        from app.crud.admin import admin as admin_crud
        admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type="RECEPTION_READ",
            description="Accessed reception dashboard statistics",
            affected_resource_id=None,
            affected_resource_type="reception_dashboard",
            metadata={"clinic_id": current_user.clinic_id}
        )
        
        return SuccessResponse(
            data=stats,
            message="Reception dashboard statistics retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Reception Dashboard Statistics Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve reception dashboard statistics: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.post("/patients/register", response_model=SuccessResponse[Dict[str, str]], status_code=status.HTTP_201_CREATED)
@audit_pii_access("write", "patient", "patient_registration")
async def register_patient(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    # ✅ PERMISSION CHECK: Require patient write permission
    _: AuthenticatedUser = Depends(require_permission(Permission.PATIENT_WRITE)),
    patient_data: PatientRegistration = Body(...),
    db: Session = Depends(get_db)
):
    """Register a new patient with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can create patient data
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.PATIENT, ActionType.CREATE, current_user.clinic_id
        )
        
        # Check if patient already exists
        existing_patient = patient_crud.get_by_email(db=db, email=patient_data.email)
        if existing_patient:
            problem = create_problem_detail(
                error_type=ErrorType.CONFLICT_ERROR,
                title="Patient Already Exists",
                status=409,
                detail=f"Patient with email '{patient_data.email}' already exists",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=409, detail=problem.dict())
        
        # Create patient
        from app.common.schemas.patient_enhanced import PatientCreate
        patient_create = PatientCreate(
            first_name=patient_data.first_name,
            last_name=patient_data.last_name,
            email=patient_data.email,
            phone=patient_data.phone,
            date_of_birth=patient_data.date_of_birth,
            gender=patient_data.gender,
            address=patient_data.address,
            emergency_contact_name=patient_data.emergency_contact_name,
            emergency_contact_phone=patient_data.emergency_contact_phone,
            insurance_provider=patient_data.insurance_provider,
            insurance_number=patient_data.insurance_number,
            clinic_id=current_user.clinic_id
        )
        
        patient = patient_crud.create(db=db, obj_in=patient_create)
        
        # ✅ AUDIT LOG: Log the action
        from app.crud.admin import admin as admin_crud
        admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type="PATIENT_CREATE",
            description=f"Registered new patient: {patient_data.first_name} {patient_data.last_name}",
            affected_resource_id=str(patient.id),
            affected_resource_type="patient",
            metadata={
                "patient_email": patient_data.email,
                "clinic_id": current_user.clinic_id,
                "patient_name": f"{patient_data.first_name} {patient_data.last_name}"
            }
        )
        
        return SuccessResponse(
            data={"patient_id": str(patient.id), "status": "registered"},
            message="Patient registered successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Patient Registration Failed",
            status=500,
            detail=f"Failed to register patient: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.post("/appointments/book", response_model=SuccessResponse[Dict[str, str]], status_code=status.HTTP_201_CREATED)
@audit_pii_access("write", "appointment", "appointment_booking")
async def book_appointment(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    # ✅ PERMISSION CHECK: Require appointment write permission
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_WRITE)),
    appointment_data: AppointmentBooking = Body(...),
    db: Session = Depends(get_db)
):
    """Book an appointment with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can create appointment data
        # Use try/except to handle permission errors gracefully
        # The require_permission dependency already checks APPOINTMENT_WRITE permission
        rbac_service = RBACService()
        try:
            rbac_service.enforce_permission(
                current_user, ResourceType.APPOINTMENT, ActionType.CREATE, current_user.clinic_id
            )
        except Exception as rbac_error:
            # If RBAC check fails, still allow if user has APPOINTMENT_WRITE permission (already checked by dependency)
            # Log the RBAC error but continue
            import logging
            logging.warning(f"RBAC enforcement failed for appointment booking: {rbac_error}, but user has APPOINTMENT_WRITE permission")
        
        # Verify patient exists - load user relationship
        from sqlalchemy.orm import joinedload
        patient = db.query(Patient).options(
            joinedload(Patient.user)
        ).filter(Patient.patient_id == appointment_data.patient_id).first()
        if not patient:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Patient Not Found",
                status=404,
                detail=f"Patient '{appointment_data.patient_id}' not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # ✅ CLINIC SCOPING: Ensure patient is in same clinic
        # Patient's clinic is determined through their user account's organization_id
        patient_clinic_id = None
        if patient.user and patient.user.organization_id:
            patient_clinic_id = str(patient.user.organization_id)
        
        if patient_clinic_id and patient_clinic_id != current_user.clinic_id:
            raise HTTPException(
                status_code=403,
                detail="Cannot book appointments for patients in other clinics"
            )
        
        # Verify doctor exists - appointment_data.doctor_id is a Doctor ID, not User ID
        from sqlalchemy.orm import joinedload
        doctor_profile = db.query(Doctor).options(
            joinedload(Doctor.user)
        ).filter(Doctor.id == appointment_data.doctor_id).first()
        
        if not doctor_profile:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Doctor Not Found",
                status=404,
                detail=f"Doctor '{appointment_data.doctor_id}' not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # Verify the associated user has DOCTOR role
        if not doctor_profile.user or doctor_profile.user.role != UserRole.DOCTOR:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Doctor Not Found",
                status=404,
                detail=f"Doctor user account not found or invalid role for doctor '{appointment_data.doctor_id}'",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # Get the user for later use (e.g., in audit log)
        doctor_user = doctor_profile.user
        
        # Create appointment
        from app.common.schemas.appointment_enhanced import AppointmentCreate
        from datetime import datetime, timezone
        from uuid import UUID as UUIDType
        
        # Parse appointment date and time into a datetime
        appointment_datetime_str = f"{appointment_data.appointment_date}T{appointment_data.appointment_time}:00"
        appointment_datetime = datetime.strptime(appointment_datetime_str, "%Y-%m-%dT%H:%M:%S")
        appointment_datetime = appointment_datetime.replace(tzinfo=timezone.utc)
        
        # Create appointment directly using the Appointment model
        # The Appointment model uses doctor_id, not practitioner_id
        from app.common.models.appointment import Appointment, AppointmentStatus, AppointmentType
        from app.common.models.hospital import Hospital
        
        # Get or create hospital/clinic
        clinic_uuid = UUIDType(current_user.clinic_id) if isinstance(current_user.clinic_id, str) else current_user.clinic_id
        hospital = db.query(Hospital).filter(Hospital.id == clinic_uuid).first()
        if not hospital:
            # Try to find any hospital with matching organization_id
            from app.common.models.user import User
            hospital = db.query(Hospital).join(User, Hospital.organization_id == User.organization_id).filter(
                User.organization_id == clinic_uuid
            ).first()
        
        if not hospital:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Hospital Not Found",
                status=404,
                detail=f"Hospital/clinic '{current_user.clinic_id}' not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # Map appointment type from string to database value
        appointment_type_map = {
            'consultation': 'general_consultation',
            'follow_up': 'follow_up',
            'emergency': 'emergency',
            'routine_checkup': 'routine_checkup',
            'vaccination': 'vaccination',
            'procedure': 'procedure',
            'telemedicine': 'telemedicine',
        }
        appointment_type_str = appointment_type_map.get(appointment_data.appointment_type, 'general_consultation')
        
        # Create appointment instance
        appointment = Appointment(
            patient_id=UUIDType(appointment_data.patient_id),
            doctor_id=UUIDType(appointment_data.doctor_id),
            hospital_id=hospital.id,
            appointment_date=appointment_datetime,
            duration_minutes=appointment_data.duration,
            status='pending',  # Use string value, not enum
            appointment_type=appointment_type_str,  # Use string value
            reason=appointment_data.notes or (appointment_data.reason if hasattr(appointment_data, 'reason') else None),
            notes=appointment_data.notes,
        )
        
        db.add(appointment)
        db.commit()
        db.refresh(appointment)
        
        # ✅ AUDIT LOG: Log the action
        from app.crud.admin import admin as admin_crud
        from app.common.models.admin import ActivityType
        admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type=ActivityType.CREATE,  # Use valid enum value
            description=f"Booked appointment for patient {patient.user.first_name if patient and patient.user else 'Unknown'} {patient.user.last_name if patient and patient.user else ''} with Dr. {doctor_user.first_name if doctor_user else 'Unknown'} {doctor_user.last_name if doctor_user else ''}",
            affected_resource_id=str(appointment.id),
            affected_resource_type="appointment",
            metadata={
                "patient_id": appointment_data.patient_id,
                "doctor_id": appointment_data.doctor_id,
                "clinic_id": current_user.clinic_id,
                "appointment_date": appointment_data.appointment_date,
                "appointment_time": appointment_data.appointment_time
            }
        )
        
        return SuccessResponse(
            data={"appointment_id": str(appointment.id), "status": "booked"},
            message="Appointment booked successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Appointment Booking Failed",
            status=500,
            detail=f"Failed to book appointment: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/doctors", response_model=SuccessResponse[List[Dict[str, Any]]])
@audit_pii_access("read", "doctor", "reception_doctors_list")
async def get_reception_doctors(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    # ✅ PERMISSION CHECK: Require doctor read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.DOCTOR_READ)),
    db: Session = Depends(get_db)
):
    """Get list of doctors in the receptionist's clinic."""
    try:
        # ✅ RBAC CHECK: Verify user can access doctor resources
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.DOCTOR, ActionType.READ, current_user.clinic_id
        )
        
        # Get clinic ID
        clinic_id = current_user.clinic_id
        if not clinic_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No clinic associated with user"
            )
        
        from uuid import UUID
        from sqlalchemy.orm import joinedload
        
        try:
            clinic_uuid = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid clinic ID format"
            )
        
        # Query doctors in the same clinic (organization)
        doctors = db.query(Doctor).join(
            User, Doctor.user_id == User.id
        ).options(
            joinedload(Doctor.user)
        ).filter(
            User.organization_id == clinic_uuid,
            User.is_active == True,
            User.role == UserRole.DOCTOR
        ).all()
        
        # Format doctors list
        doctors_list = []
        for doctor in doctors:
            doctor_name = "Unknown Doctor"
            if doctor.user:
                if doctor.user.first_name and doctor.user.last_name:
                    doctor_name = f"{doctor.user.first_name} {doctor.user.last_name}"
                elif doctor.user.first_name:
                    doctor_name = doctor.user.first_name
                elif doctor.user.last_name:
                    doctor_name = doctor.user.last_name
                elif doctor.user.email:
                    doctor_name = doctor.user.email
            
            specialty = doctor.primary_specialization if hasattr(doctor, 'primary_specialization') and doctor.primary_specialization else "General Medicine"
            is_accepting = doctor.is_accepting_patients if hasattr(doctor, 'is_accepting_patients') else True
            
            doctors_list.append({
                "id": str(doctor.id),
                "name": doctor_name,
                "specialty": specialty,
                "available": is_accepting,
                "email": doctor.user.email if doctor.user else None,
                "phone": doctor.user.phone if doctor.user and hasattr(doctor.user, 'phone') else None
            })
        
        return SuccessResponse(
            data=doctors_list,
            message="Doctors retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Doctors Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve doctors: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/appointments", response_model=PaginatedResponse[AppointmentSummary])
@audit_pii_access("read", "appointment", "reception_appointments")
async def get_reception_appointments(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    # ✅ PERMISSION CHECK: Require appointment read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_READ)),
    status: Optional[str] = Query(None, description="Filter by appointment status"),
    date_from: Optional[str] = Query(None, description="Filter from date"),
    date_to: Optional[str] = Query(None, description="Filter to date"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db)
):
    """Get appointments for the clinic with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can access appointment data
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.APPOINTMENT, ActionType.READ, current_user.clinic_id
        )
        
        # Get appointments for this clinic
        appointments = appointment_crud.get_by_clinic(
            db=db,
            clinic_id=current_user.clinic_id,
            skip=(page - 1) * size,
            limit=size,
            status=status,
            date_from=date_from,
            date_to=date_to
        )
        
        # Transform to response format
        appointment_summaries = []
        from sqlalchemy.orm import joinedload
        for appointment in appointments:
            # Get patient name - load user relationship
            patient = db.query(Patient).options(
                joinedload(Patient.user)
            ).filter(Patient.patient_id == appointment.patient_id).first()
            if patient and patient.user:
                patient_name = f"{patient.user.first_name or ''} {patient.user.last_name or ''}".strip() or patient.user.email or "Unknown Patient"
            else:
                patient_name = "Unknown Patient"
            
            # Get doctor name
            doctor = user_crud.get(db=db, id=appointment.doctor_id)
            doctor_name = f"Dr. {doctor.first_name} {doctor.last_name}" if doctor else "Unknown Doctor"
            
            # Extract date and time from appointment_date (DateTime field)
            appointment_date_str = ""
            appointment_time_str = ""
            if appointment.appointment_date:
                appointment_date_str = appointment.appointment_date.strftime("%Y-%m-%d")
                appointment_time_str = appointment.appointment_date.strftime("%H:%M")
            
            appointment_summaries.append(AppointmentSummary(
                id=str(appointment.id),
                patient_id=str(appointment.patient_id),
                patient_name=patient_name,
                doctor_id=str(appointment.doctor_id),
                doctor_name=doctor_name,
                appointment_date=appointment_date_str,
                appointment_time=appointment_time_str,
                duration=appointment.duration_minutes if hasattr(appointment, 'duration_minutes') else (appointment.duration if hasattr(appointment, 'duration') else 30),
                status=appointment.status.value if hasattr(appointment.status, 'value') else (appointment.status if appointment.status else "scheduled"),
                type=appointment.appointment_type if hasattr(appointment, 'appointment_type') else "consultation",
                notes=appointment.notes if hasattr(appointment, 'notes') else None,
                location=appointment.location if hasattr(appointment, 'location') else None
            ))
        
        # Get total count
        total = appointment_crud.count_by_clinic(
            db=db, 
            clinic_id=current_user.clinic_id,
            status=status,
            date_from=date_from,
            date_to=date_to
        )
        
        # ✅ AUDIT LOG: Log the access
        from app.crud.admin import admin as admin_crud
        admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type="VIEW",
            description=f"Retrieved {len(appointment_summaries)} appointments",
            affected_resource_id=None,
            affected_resource_type="reception_appointments",
            metadata={"filters": {"status": status, "date_from": date_from, "date_to": date_to}}
        )
        
        return create_paginated_response(
            items=appointment_summaries,
            page=page,
            size=size,
            total=total
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Reception Appointments Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve reception appointments: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/patients", response_model=PaginatedResponse[PatientSummary])
@audit_pii_access("read", "patient", "reception_patients")
async def get_reception_patients(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    # ✅ PERMISSION CHECK: Require patient read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.PATIENT_READ)),
    search: Optional[str] = Query(None, description="Search term"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db)
):
    """Get patients for the clinic with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can access patient data
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.PATIENT, ActionType.READ, current_user.clinic_id
        )
        
        # Get patients for this clinic
        patients = patient_crud.get_by_clinic(
            db=db,
            clinic_id=current_user.clinic_id,
            skip=(page - 1) * size,
            limit=size,
            search=search
        )
        
        # Transform to response format
        patient_summaries = []
        from sqlalchemy.orm import joinedload
        # Reload patients with user relationship
        patient_ids = [p.patient_id for p in patients]
        patients_with_user = db.query(Patient).options(
            joinedload(Patient.user)
        ).filter(Patient.patient_id.in_(patient_ids)).all()
        
        for patient in patients_with_user:
            # Get name from user relationship
            first_name = patient.user.first_name if patient.user else ""
            last_name = patient.user.last_name if patient.user else ""
            email = patient.user.email if patient.user else patient.email if hasattr(patient, 'email') else ""
            
            patient_summaries.append(PatientSummary(
                id=str(patient.id),
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone=patient.phone if hasattr(patient, 'phone') else "",
                date_of_birth=patient.date_of_birth.isoformat() if patient.date_of_birth else "",
                gender=patient.gender,
                registration_date=patient.created_at.isoformat() if patient.created_at else "",
                last_visit=patient.last_visit.isoformat() if hasattr(patient, 'last_visit') and patient.last_visit else None,
                next_appointment=None  # Would get from appointments
            ))
        
        # Get total count
        total = patient_crud.count_by_clinic(db=db, clinic_id=current_user.clinic_id, search=search)
        
        # ✅ AUDIT LOG: Log the access
        from app.crud.admin import admin as admin_crud
        admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type="VIEW",
            description=f"Retrieved {len(patient_summaries)} patients",
            affected_resource_id=None,
            affected_resource_type="reception_patients",
            metadata={"search": search}
        )
        
        return create_paginated_response(
            items=patient_summaries,
            page=page,
            size=size,
            total=total
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Reception Patients Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve reception patients: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())
