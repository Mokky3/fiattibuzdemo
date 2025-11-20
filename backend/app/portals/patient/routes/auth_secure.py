"""Secure Patient Portal Authentication
Replaces dummy authentication with real authentication and authorization
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Body, Query, status, Request
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.common.auth.auth_service import (
    AuthenticatedUser, get_current_user, require_patient_access,
    require_permission, Permission, AuthService
)
from app.services.rbac_service import RBACService, ResourceType, ActionType
from app.common.models.user import User, UserRole, UserStatus
from app.common.models.patient import Patient
from app.crud.patient import patient as patient_crud
from app.crud.appointment import appointment as appointment_crud
from app.crud.message import message as message_crud
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access
from app.common.utils.tracing import get_trace_id

router = APIRouter(tags=["Patient · Secure Authentication"])

# ──────────────────────────────────────────────────────────────────────────────
# Data Models
# ──────────────────────────────────────────────────────────────────────────────

from app.portals.patient.schemas.profile_enhanced import (
    PatientSettings as _SchemaPatientSettings,
    PatientProfile as _SchemaPatientProfile,
    PatientAppointment as _SchemaPatientAppointment,
)

PatientSettings = _SchemaPatientSettings
PatientProfile = _SchemaPatientProfile

PatientAppointment = _SchemaPatientAppointment

# ──────────────────────────────────────────────────────────────────────────────
# Secure Patient Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/api/patient/secure/settings", response_model=SuccessResponse[PatientSettings])
@audit_pii_access("read", "patient", "patient_settings")
async def get_patient_settings(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication instead of dummy
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    # ✅ PERMISSION CHECK: Require patient read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.PATIENT_READ)),
    db: Session = Depends(get_db)
):
    """Get patient settings with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can access their own patient data
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.PATIENT, ActionType.READ, 
            current_user.clinic_id, current_user.user_id
        )
        
        # Get patient data
        patient = patient_crud.get_by_user_id(db=db, user_id=current_user.user_id)
        if not patient:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Patient Not Found",
                status=404,
                detail="Patient profile not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # Create settings response
        settings = PatientSettings(
            id=str(patient.id),
            patient_id=str(patient.id),
            fhir_token=patient.fhir_patient_id,
            notifications_enabled=getattr(patient, 'notifications_enabled', True),
            email_notifications=getattr(patient, 'email_notifications', True),
            sms_notifications=getattr(patient, 'sms_notifications', False),
            appointment_reminders=getattr(patient, 'appointment_reminders', True),
            medication_reminders=getattr(patient, 'medication_reminders', True),
            language=getattr(patient, 'language', 'en'),
            timezone=getattr(patient, 'timezone', 'Asia/Tashkent')
        )
        
        # ✅ AUDIT LOG: Log the access
        from app.crud.admin import admin as admin_crud
        await admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type="PATIENT_READ",
            description="Accessed patient settings",
            affected_resource_id=str(patient.id),
            affected_resource_type="patient_settings",
            metadata={"clinic_id": current_user.clinic_id}
        )
        
        return SuccessResponse(
            data=settings,
            message="Patient settings retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Patient Settings Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve patient settings: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.put("/api/patient/secure/settings", response_model=SuccessResponse[PatientSettings])
@audit_pii_access("write", "patient", "patient_settings")
async def update_patient_settings(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    # ✅ PERMISSION CHECK: Require patient write permission
    _: AuthenticatedUser = Depends(require_permission(Permission.PATIENT_WRITE)),
    settings_data: PatientSettings = Body(...),
    db: Session = Depends(get_db)
):
    """Update patient settings with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can update their own patient data
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.PATIENT, ActionType.UPDATE, 
            current_user.clinic_id, current_user.user_id
        )
        
        # Get patient data
        patient = patient_crud.get_by_user_id(db=db, user_id=current_user.user_id)
        if not patient:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Patient Not Found",
                status=404,
                detail="Patient profile not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # ✅ OWNERSHIP CHECK: Ensure user can only update their own settings
        if str(patient.id) != settings_data.patient_id:
            raise HTTPException(
                status_code=403,
                detail="Cannot update settings for other patients"
            )
        
        # Update patient settings
        update_data = {
            "notifications_enabled": settings_data.notifications_enabled,
            "email_notifications": settings_data.email_notifications,
            "sms_notifications": settings_data.sms_notifications,
            "appointment_reminders": settings_data.appointment_reminders,
            "medication_reminders": settings_data.medication_reminders,
            "language": settings_data.language,
            "timezone": settings_data.timezone
        }
        
        updated_patient = patient_crud.update(db=db, db_obj=patient, obj_in=update_data)
        
        # Create updated settings response
        updated_settings = PatientSettings(
            id=str(updated_patient.id),
            patient_id=str(updated_patient.id),
            fhir_token=updated_patient.fhir_patient_id,
            notifications_enabled=getattr(updated_patient, 'notifications_enabled', True),
            email_notifications=getattr(updated_patient, 'email_notifications', True),
            sms_notifications=getattr(updated_patient, 'sms_notifications', False),
            appointment_reminders=getattr(updated_patient, 'appointment_reminders', True),
            medication_reminders=getattr(updated_patient, 'medication_reminders', True),
            language=getattr(updated_patient, 'language', 'en'),
            timezone=getattr(updated_patient, 'timezone', 'Asia/Tashkent')
        )
        
        # ✅ AUDIT LOG: Log the update
        from app.crud.admin import admin as admin_crud
        await admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type="PATIENT_UPDATE",
            description="Updated patient settings",
            affected_resource_id=str(updated_patient.id),
            affected_resource_type="patient_settings",
            metadata={"updated_fields": list(update_data.keys())}
        )
        
        return SuccessResponse(
            data=updated_settings,
            message="Patient settings updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Patient Settings Update Failed",
            status=500,
            detail=f"Failed to update patient settings: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/api/patient/secure/profile", response_model=SuccessResponse[PatientProfile])
@audit_pii_access("read", "patient", "patient_profile")
async def get_patient_profile(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    # ✅ PERMISSION CHECK: Require patient read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.PATIENT_READ)),
    db: Session = Depends(get_db)
):
    """Get patient profile with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can access their own patient data
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.PATIENT, ActionType.READ, 
            current_user.clinic_id, current_user.user_id
        )
        
        # Get patient data
        patient = patient_crud.get_by_user_id(db=db, user_id=current_user.user_id)
        if not patient:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Patient Not Found",
                status=404,
                detail="Patient profile not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # Create profile response
        profile = PatientProfile(
            id=str(patient.id),
            first_name=patient.first_name,
            last_name=patient.last_name,
            email=patient.email,
            phone=patient.phone,
            date_of_birth=patient.date_of_birth.isoformat() if patient.date_of_birth else None,
            gender=patient.gender,
            address=patient.address,
            emergency_contact=getattr(patient, 'emergency_contact', None),
            insurance_number=getattr(patient, 'insurance_number', None),
            created_at=patient.created_at.isoformat() if patient.created_at else ""
        )
        
        # ✅ AUDIT LOG: Log the access
        from app.crud.admin import admin as admin_crud
        await admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type="PATIENT_READ",
            description="Accessed patient profile",
            affected_resource_id=str(patient.id),
            affected_resource_type="patient_profile",
            metadata={"clinic_id": current_user.clinic_id}
        )
        
        return SuccessResponse(
            data=profile,
            message="Patient profile retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Patient Profile Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve patient profile: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())

@router.get("/api/patient/secure/appointments", response_model=PaginatedResponse[PatientAppointment])
@audit_pii_access("read", "appointment", "patient_appointments")
async def get_patient_appointments(
    request: Request,
    # ✅ SECURE AUTH: Use real authentication
    current_user: AuthenticatedUser = Depends(require_patient_access()),
    # ✅ PERMISSION CHECK: Require appointment read permission
    _: AuthenticatedUser = Depends(require_permission(Permission.APPOINTMENT_READ)),
    status: Optional[str] = Query(None, description="Filter by appointment status"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db)
):
    """Get patient appointments with proper authentication."""
    try:
        # ✅ RBAC CHECK: Verify user can access their own appointments
        rbac_service = RBACService()
        rbac_service.enforce_permission(
            current_user, ResourceType.APPOINTMENT, ActionType.READ, 
            current_user.clinic_id, current_user.user_id
        )
        
        # Get patient data
        patient = patient_crud.get_by_user_id(db=db, user_id=current_user.user_id)
        if not patient:
            problem = create_problem_detail(
                error_type=ErrorType.NOT_FOUND_ERROR,
                title="Patient Not Found",
                status=404,
                detail="Patient profile not found",
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=404, detail=problem.dict())
        
        # Get appointments for this patient
        appointments = appointment_crud.get_appointments_by_patient(
            db=db,
            patient_id=str(patient.id),
            status=status,
            skip=(page - 1) * size,
            limit=size
        )
        
        # Transform to response format
        appointment_responses = []
        for appointment in appointments:
            appointment_responses.append(PatientAppointment(
                id=str(appointment.id),
                date=appointment.appointment_date.strftime("%Y-%m-%d") if appointment.appointment_date else "",
                time=appointment.appointment_date.strftime("%H:%M") if appointment.appointment_date else "",
                doctor_name=getattr(appointment, 'doctor_name', 'Unknown Doctor'),
                doctor_specialty=getattr(appointment, 'doctor_specialty', None),
                clinic_name=getattr(appointment, 'clinic_name', None),
                status=appointment.status.value if appointment.status else "unknown",
                reason=getattr(appointment, 'reason', None),
                notes=getattr(appointment, 'notes', None)
            ))
        
        # Get total count
        total = appointment_crud.count_by_patient(db=db, patient_id=str(patient.id), status=status)
        
        # ✅ AUDIT LOG: Log the access
        from app.crud.admin import admin as admin_crud
        await admin_crud.log_admin_activity(
            db=db,
            admin_id=current_user.user_id,
            activity_type="APPOINTMENT_READ",
            description=f"Retrieved {len(appointment_responses)} appointments",
            affected_resource_id=str(patient.id),
            affected_resource_type="patient_appointments",
            metadata={"filters": {"status": status}, "clinic_id": current_user.clinic_id}
        )
        
        return create_paginated_response(
            data=appointment_responses,
            page=page,
            size=size,
            total=total
        )
        
    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Patient Appointments Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve patient appointments: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())
