# app/portals/patient/routes/implementations.py
"""Patient portal route implementations using SQLAlchemy CRUD."""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status, Body, Path
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud import patient_portal_crud
from app.portals.patient.auth import get_current_patient_user, PatientUser

# Import schemas
from app.common.schemas.patient_portal import (
    AppointmentCreate, AppointmentRow, AppointmentPatch,
    Doctor, AppointmentRequest,
    PrescriptionRow, RefillRequest,
    ProfileOut, DemographicsPatch, VitalStat, ImmunizationRec, InsuranceInfo,
    RecordRow, Page,
    SettingsBlob, Notifications, Privacy, Preferences
)


# ==================== Profile Routes ====================

profile_router = APIRouter(prefix="/api/patient/profile", tags=["Patient · Profile"])

@profile_router.get("", response_model=ProfileOut)
async def get_profile(
    db: Session = Depends(get_db),
    current_patient: PatientUser = Depends(get_current_patient_user)
):
    """Get patient profile with medical information."""
    profile_data = patient_portal_crud.get_patient_profile(
        db=db,
        patient_id=current_patient.patient_id
    )
    
    if not profile_data:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient = profile_data["patient"]
    
    # Format vitals
    vitals = []
    for vs in profile_data["vitals"]:
        if vs.weight:
            vitals.append(VitalStat(code="weight", value=f"{vs.weight} kg", date=vs.measured_at))
        if vs.height:
            vitals.append(VitalStat(code="height", value=f"{vs.height} cm", date=vs.measured_at))
        if vs.blood_pressure_systolic and vs.blood_pressure_diastolic:
            vitals.append(VitalStat(
                code="bloodPressure",
                value=f"{vs.blood_pressure_systolic}/{vs.blood_pressure_diastolic} mmHg",
                date=vs.measured_at
            ))
    
    # Format immunizations
    immunizations = [
        ImmunizationRec(
            vaccine=imm.vaccine_name,
            date=imm.occurrence_date,
            status=imm.status.value.capitalize()
        )
        for imm in profile_data["immunizations"]
    ]
    
    # Format insurance
    insurance = None
    if profile_data["insurance"]:
        ins = profile_data["insurance"]
        insurance = InsuranceInfo(
            provider=ins.provider,
            policyNumber=ins.policy_number,
            groupNumber=ins.group_number,
            coverageType="Medical",  # Default
            validUntil=ins.valid_to
        )
    
    # Get emergency contact
    emergency_contact = next((ec for ec in patient.emergency_contacts if ec.is_primary), None)
    
    return ProfileOut(
        fullName=f"{patient.first_name} {patient.last_name}",
        email=patient.email,
        phone=patient.phone,
        gender=patient.gender.value if patient.gender else None,
        dateOfBirth=patient.date_of_birth,
        address=patient.address,
        emergencyContact=emergency_contact.name if emergency_contact else None,
        emergencyPhone=emergency_contact.phone_primary if emergency_contact else None,
        profileImage=None,  # Handle separately if stored
        patientId=str(patient.id),
        registrationDate=patient.registered_at,
        vitals=vitals,
        bloodGroup=patient.blood_group.value if patient.blood_group else None,
        bloodRh=None,  # Add Rh factor if stored separately
        allergies=[allergy.display_name for allergy in profile_data["allergies"]],
        chronicConditions=[condition.display_name for condition in profile_data["conditions"]],
        immunizations=immunizations,
        insurance=insurance
    )


@profile_router.patch("", status_code=status.HTTP_204_NO_CONTENT)
async def patch_demographics(
    payload: DemographicsPatch = Body(...),
    db: Session = Depends(get_db),
    current_patient: PatientUser = Depends(get_current_patient_user)
):
    """Update patient demographics."""
    patient = patient_portal_crud.update_patient_demographics(
        db=db,
        patient_id=current_patient.patient_id,
        demographics_data=payload.dict(exclude_unset=True)
    )
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")


# ==================== Appointments Routes ====================

appointments_router = APIRouter(prefix="/api/patient/appointments", tags=["Patient · Appointments"])

@appointments_router.post("", status_code=status.HTTP_201_CREATED)
async def book_appointment(
    data: AppointmentCreate = Body(...),
    db: Session = Depends(get_db),
    current_patient: PatientUser = Depends(get_current_patient_user)
):
    """Create an appointment for the logged-in patient."""
    appointment = patient_portal_crud.create_appointment(
        db=db,
        patient_id=current_patient.patient_id,
        appointment_data=data.dict()
    )
    return {"id": str(appointment.id)}


@appointments_router.get("", response_model=List[AppointmentRow])
async def list_my_appointments(
    scope: str = Query("upcoming", regex="^(upcoming|past)$"),
    db: Session = Depends(get_db),
    current_patient: PatientUser = Depends(get_current_patient_user)
):
    """Get patient appointments (upcoming or past)."""
    appointments = patient_portal_crud.get_patient_appointments(
        db=db,
        patient_id=current_patient.patient_id,
        scope=scope
    )
    
    rows = []
    for apt in appointments:
        days_until = None
        if scope == "upcoming" and apt.appointment_date >= datetime.utcnow().date():
            days_until = (apt.appointment_date - datetime.utcnow().date()).days
        
        rows.append(AppointmentRow(
            id=str(apt.id),
            date=apt.appointment_date.strftime("%d.%m.%Y"),
            time=apt.start_time.strftime("%H:%M"),
            daysUntil=days_until,
            description=apt.description or apt.appointment_type.value,
            hospital=apt.hospital.name if apt.hospital else "",
            room=apt.room_number,
            type=apt.appointment_type.value
        ))
    
    return rows


@appointments_router.patch("/{apt_id}", status_code=status.HTTP_200_OK)
async def update_appointment(
    apt_id: str = Path(...),
    data: AppointmentPatch = Body(...),
    db: Session = Depends(get_db),
    current_patient: PatientUser = Depends(get_current_patient_user)
):
    """Update appointment (reschedule or cancel)."""
    appointment = patient_portal_crud.update_appointment(
        db=db,
        patient_id=current_patient.patient_id,
        appointment_id=apt_id,
        update_data=data.dict(exclude_unset=True)
    )
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    return {"ok": True}


# ==================== Doctor Search Routes ====================

doctor_router = APIRouter(prefix="/api/patient", tags=["Patient · Doctors"])

@doctor_router.get("/doctors/search", response_model=List[Doctor])
async def search_doctors(
    fullName: Optional[str] = Query(None),
    hospital: Optional[str] = Query(None),
    specialty: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db)
):
    """Search for doctors."""
    doctors = patient_portal_crud.search_doctors(
        db=db,
        full_name=fullName,
        hospital=hospital,
        specialty=specialty,
        limit=limit
    )
    
    return [Doctor(**doc) for doc in doctors]


@doctor_router.post("/appointments", status_code=status.HTTP_201_CREATED)
async def book_appointment_with_doctor(
    req: AppointmentRequest,
    db: Session = Depends(get_db)
):
    """Book appointment with specific doctor."""
    appointment_data = {
        "appointmentDate": req.appointmentDate,
        "appointmentTime": req.appointmentTime,
        "appointmentType": req.appointmentType,
        "additionalNote": req.additionalNote,
        "doctor_id": req.doctorId,
        "hospital": "Default Hospital"  # Would be determined from doctor
    }
    
    appointment = patient_portal_crud.create_appointment(
        db=db,
        patient_id=UUID(req.patientId),
        appointment_data=appointment_data
    )
    
    return {"id": str(appointment.id)}


# ==================== Prescriptions Routes ====================

prescriptions_router = APIRouter(prefix="/api/patient/prescriptions", tags=["Patient · Prescriptions"])

@prescriptions_router.get("", response_model=List[PrescriptionRow])
async def list_my_prescriptions(
    scope: str = Query("active", regex="^(active|expired|all)$"),
    db: Session = Depends(get_db),
    current_patient: PatientUser = Depends(get_current_patient_user)
):
    """Get patient prescriptions."""
    prescriptions = patient_portal_crud.get_patient_prescriptions(
        db=db,
        patient_id=current_patient.patient_id,
        scope=scope if scope != "all" else None
    )
    
    rows = []
    for rx in prescriptions:
        rows.append(PrescriptionRow(
            id=str(rx.id),
            medicineName=rx.medicine_name,
            knownAs=rx.generic_name,
            description=rx.description,
            prescribedDate=rx.prescribed_date.strftime("%d.%m.%Y"),
            endDate=rx.end_date.strftime("%d.%m.%Y") if rx.end_date else None,
            prescribedBy=f"Dr. {rx.doctor.user.first_name} {rx.doctor.user.last_name}",
            hospital=rx.hospital.name if rx.hospital else None,
            dosage=rx.dosage,
            frequency=rx.frequency,
            status=rx.status.value,
            remainingRefills=rx.remaining_refills,
            totalRefills=rx.total_refills,
            price=f"{rx.estimated_price:.2f} {rx.currency}" if rx.estimated_price else None
        ))
    
    return rows


@prescriptions_router.post("/{rx_id}/refill", status_code=status.HTTP_202_ACCEPTED)
async def request_refill(
    rx_id: str = Path(...),
    data: RefillRequest = Body(...),
    db: Session = Depends(get_db),
    current_patient: PatientUser = Depends(get_current_patient_user)
):
    """Request prescription refill."""
    result = patient_portal_crud.request_prescription_refill(
        db=db,
        patient_id=current_patient.patient_id,
        prescription_id=rx_id,
        pharmacy_id=data.pharmacy_id
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


# ==================== Medical Records Routes ====================

records_router = APIRouter(prefix="/api/patient/records", tags=["Patient · Records"])

@records_router.get("", response_model=Page)
async def list_records(
    type: str = Query("Medical card"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_patient: PatientUser = Depends(get_current_patient_user)
):
    """Get patient medical records with pagination."""
    records_data = patient_portal_crud.get_patient_records(
        db=db,
        patient_id=current_patient.patient_id,
        record_type=type,
        page=page,
        size=size
    )
    
    rows = []
    for record in records_data["items"]:
        rows.append(RecordRow(
            id=str(record.id),
            date=record.record_date.strftime("%d.%m.%Y"),
            recordType=record.record_type.value.replace("_", " ").title(),
            description=record.chief_complaint or record.summary or "Medical Record",
            doctor=f"Dr. {record.doctor.user.first_name} {record.doctor.user.last_name}" if record.doctor else None,
            hospital=record.hospital.name if record.hospital else None
        ))
    
    return Page(
        total=records_data["total"],
        page=records_data["page"],
        size=records_data["size"],
        items=rows
    )


# ==================== Settings Routes ====================

settings_router = APIRouter(prefix="/api/patient", tags=["Patient · Settings"])

@settings_router.get("/settings", response_model=SettingsBlob)
async def read_settings(
    db: Session = Depends(get_db),
    current_patient: PatientUser = Depends(get_current_patient_user)
):
    """Get patient settings."""
    settings = patient_portal_crud.get_patient_settings(
        db=db,
        patient_id=current_patient.patient_id
    )
    
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    return SettingsBlob(
        notifications=Notifications(
            enabled=settings["notifications"]["enabled"],
            reminderTiming=settings["notifications"]["reminderTiming"],
            _id=settings["notifications"]["_id"]
        ),
        privacy=Privacy(
            allowResearch=settings["privacy"]["allowResearch"],
            shareHealthData=settings["privacy"]["shareHealthData"],
            _id=settings["privacy"]["_id"]
        ),
        preferences=Preferences(
            language=settings["preferences"]["language"]
        )
    )


@settings_router.patch("/settings", status_code=status.HTTP_204_NO_CONTENT)
async def update_settings(
    payload: SettingsBlob,
    db: Session = Depends(get_db),
    current_patient: PatientUser = Depends(get_current_patient_user)
):
    """Update patient settings."""
    success = patient_portal_crud.update_patient_settings(
        db=db,
        patient_id=current_patient.patient_id,
        settings_data=payload.dict(exclude_unset=True)
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update settings")


# ==================== Additional Routes ====================

@profile_router.get("/summary")
async def get_patient_summary(
    db: Session = Depends(get_db),
    current_patient: PatientUser = Depends(get_current_patient_user)
):
    """Get patient dashboard summary."""
    summary = patient_portal_crud.get_patient_summary(
        db=db,
        patient_id=current_patient.patient_id
    )
    
    if not summary:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    return summary


# ==================== Security Routes ====================

@settings_router.post("/security/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    data: dict,
    db: Session = Depends(get_db),
    current_patient: PatientUser = Depends(get_current_patient_user)
):
    """Change password."""
    from app.crud import user as user_crud
    
    # Get user
    user = db.query(User).filter(User.id == current_patient.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Change password
    updated_user = user_crud.change_password(
        db=db,
        user=user,
        current_password=data.get("currentPassword"),
        new_password=data.get("newPassword")
    )
    
    if not updated_user:
        raise HTTPException(status_code=400, detail="Invalid current password")


@settings_router.get("/security/sessions")
async def list_sessions(
    db: Session = Depends(get_db),
    current_patient: PatientUser = Depends(get_current_patient_user)
):
    """List active sessions."""
    from app.common.models.user import UserSession
    
    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_patient.user_id,
        UserSession.is_active == True
    ).all()
    
    return [
        {
            "id": str(session.id),
            "device": session.device_type,
            "location": session.location,
            "lastActivity": session.last_activity,
            "current": False  # Would need to check against current session
        }
        for session in sessions
    ]


@settings_router.delete("/security/sessions/{sid}", status_code=status.HTTP_204_NO_CONTENT)
async def end_session(
    sid: str,
    db: Session = Depends(get_db),
    current_patient: PatientUser = Depends(get_current_patient_user)
):
    """End a specific session."""
    from app.common.models.user import UserSession
    
    session = db.query(UserSession).filter(
        UserSession.id == UUID(sid),
        UserSession.user_id == current_patient.user_id
    ).first()
    
    if session:
        session.is_active = False
        session.revoked_at = datetime.utcnow()
        session.revoked_reason = "User terminated session"
        db.commit()


# ==================== Export Data Routes ====================

@settings_router.get("/export")
async def export_patient_data(
    db: Session = Depends(get_db),
    current_patient: PatientUser = Depends(get_current_patient_user)
):
    """Export patient data."""
    # This would generate a comprehensive export of patient data
    # For now, return a summary
    profile = patient_portal_crud.get_patient_profile(
        db=db,
        patient_id=current_patient.patient_id
    )
    
    return {
        "exportDate": datetime.utcnow(),
        "patientId": str(current_patient.patient_id),
        "dataIncluded": [
            "profile",
            "appointments",
            "prescriptions",
            "medical_records",
            "allergies",
            "immunizations",
            "vitals"
        ],
        "format": "json",
        "status": "ready"
    }


# ==================== Main Router Aggregation ====================

def create_patient_portal_router() -> APIRouter:
    """Create and configure the main patient portal router."""
    main_router = APIRouter()
    
    # Include all sub-routers
    main_router.include_router(profile_router)
    main_router.include_router(appointments_router)
    main_router.include_router(doctor_router)
    main_router.include_router(prescriptions_router)
    main_router.include_router(records_router)
    main_router.include_router(settings_router)
    
    return main_router


# Create the main router instance
patient_portal_router = create_patient_portal_router()