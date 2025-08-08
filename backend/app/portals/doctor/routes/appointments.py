"""Doctor portal – appointments router
Internally uses FHIR Appointment resources while preserving the existing
public REST contract expected by the React UI.
"""
from datetime import datetime, timezone, date
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Path, Body, Query, status
from pydantic import BaseModel

from .auth import get_current_doctor, DoctorUser
# from db import fhir_repo  # abstraction over fhir_resources table - TODO: implement FHIR repository

router = APIRouter(prefix="/api/doctor/appointments", tags=["Doctor · Appointments"])

# ──────────────────────────────────────────────────────────────────────────────
# DTOs exposed to frontend - matching your React component expectations
# ──────────────────────────────────────────────────────────────────────────────

class AppointmentDTO(BaseModel):
    id: str
    date: str            # YYYY‑MM‑DD (ISO) for backend
    time: str            # HH:MM
    patient: str
    problem: str | None = None
    description: str | None = None
    provider: str
    formattedDate: str   # DD.MM.YYYY – kept for UI convenience
    status: str          # pending | upcoming | completed | cancelled
    # Additional fields for frontend compatibility
    patient_name: Optional[str] = None
    patient_id: Optional[str] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    appointment_type: Optional[str] = None
    notes: Optional[str] = None
    doctor_name: Optional[str] = None

class AppointmentCreate(BaseModel):
    patient_name: str
    patient_id: str | None = None
    appointment_date: str  # YYYY‑MM‑DD
    appointment_time: str  # HH:MM
    appointment_type: str | None = None
    notes: str | None = None
    status: str = "pending"

class AppointmentUpdate(BaseModel):
    status: Optional[str] = None
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    appointment_type: Optional[str] = None
    notes: Optional[str] = None

class AppointmentStatusUpdate(BaseModel):
    status: str

# ──────────────────────────────────────────────────────────────────────────────
# Mock Data Store (replace with actual FHIR repository calls)
# ──────────────────────────────────────────────────────────────────────────────

_APPOINTMENTS: Dict[str, AppointmentDTO] = {
    "apt1": AppointmentDTO(
        id="apt1",
        date="2024-07-15",
        time="09:00",
        patient="Jane Doe",
        problem="Regular Check-up",
        description="Annual health screening and vital signs check",
        provider="Current Doctor",
        formattedDate="15.07.2024",
        status="upcoming",
        patient_name="Jane Doe",
        patient_id="p1",
        appointment_date="2024-07-15",
        appointment_time="09:00",
        appointment_type="Regular Check-up",
        notes="Annual health screening and vital signs check",
        doctor_name="Dr. Sarah Johnson"
    ),
    "apt2": AppointmentDTO(
        id="apt2",
        date="2024-07-15",
        time="11:30",
        patient="John Smith",
        problem="Consultation",
        description="Follow-up consultation for back pain treatment",
        provider="Current Doctor",
        formattedDate="15.07.2024",
        status="pending",
        patient_name="John Smith",
        patient_id="p2",
        appointment_date="2024-07-15",
        appointment_time="11:30",
        appointment_type="Consultation",
        notes="Follow-up consultation for back pain treatment",
        doctor_name="Dr. Sarah Johnson"
    ),
    "apt3": AppointmentDTO(
        id="apt3",
        date="2024-07-10",
        time="14:00",
        patient="Mary Wilson",
        problem="Anxiety problems",
        description="Follow-up session for anxiety management",
        provider="Current Doctor",
        formattedDate="10.07.2024",
        status="past",
        patient_name="Mary Wilson",
        patient_id="p3",
        appointment_date="2024-07-10",
        appointment_time="14:00",
        appointment_type="Anxiety problems",
        notes="Follow-up session for anxiety management",
        doctor_name="Dr. Sarah Johnson"
    ),
    "apt4": AppointmentDTO(
        id="apt4",
        date="2024-07-16",
        time="10:00",
        patient="Robert Brown",
        problem="Emergency",
        description="Urgent consultation for chest pain",
        provider="Current Doctor",
        formattedDate="16.07.2024",
        status="pending",
        patient_name="Robert Brown",
        patient_id="p4",
        appointment_date="2024-07-16",
        appointment_time="10:00",
        appointment_type="Emergency",
        notes="Urgent consultation for chest pain",
        doctor_name="Dr. Sarah Johnson"
    )
}

# ──────────────────────────────────────────────────────────────────────────────
# FHIR helpers
# ──────────────────────────────────────────────────────────────────────────────

FHIR_STATUS_MAP = {
    "pending": "proposed",
    "upcoming": "booked",
    "completed": "fulfilled",
    "cancelled": "cancelled",
    "past": "fulfilled"
}

REVERSE_FHIR_STATUS_MAP = {v: k for k, v in FHIR_STATUS_MAP.items()}

def make_fhir_appointment(dto: AppointmentDTO, patient_id: str | None, doctor_id: str) -> Dict[str, Any]:
    """Convert UI DTO → FHIR Appointment resource."""
    start_dt = datetime.strptime(f"{dto.date} {dto.time}", "%Y-%m-%d %H:%M")
    # Default 30-minute duration
    end_dt = start_dt.replace(minute=start_dt.minute + 30)
    
    return {
        "resourceType": "Appointment",
        "id": dto.id,
        "status": FHIR_STATUS_MAP.get(dto.status, "proposed"),
        "description": dto.problem or dto.description,
        "start": start_dt.replace(tzinfo=timezone.utc).isoformat(),
        "end": end_dt.replace(tzinfo=timezone.utc).isoformat(),
        "participant": [
            {
                "actor": {"reference": f"Practitioner/{doctor_id}"},
                "status": "accepted",
            },
            *(
                [
                    {
                        "actor": {"reference": f"Patient/{patient_id}"},
                        "status": "accepted",
                    }
                ]
                if patient_id
                else []
            ),
        ],
        # Custom extension for additional data
        "extension": [
            {
                "url": "http://example.org/appointment-type",
                "valueString": dto.appointment_type or dto.problem
            },
            {
                "url": "http://example.org/appointment-notes", 
                "valueString": dto.notes or dto.description
            }
        ]
    }

def fhir_to_dto(fhir_appointment: Dict[str, Any]) -> AppointmentDTO:
    """Convert FHIR Appointment → UI DTO."""
    start_iso = fhir_appointment["start"][:16]  # YYYY-MM-DDTHH:MM
    dt, tm = start_iso.split("T")
    
    # Extract patient name from participant
    patient_ref = None
    doctor_ref = None
    for participant in fhir_appointment.get("participant", []):
        ref = participant["actor"]["reference"]
        if ref.startswith("Patient/"):
            patient_ref = ref.split("/")[-1]
        elif ref.startswith("Practitioner/"):
            doctor_ref = ref.split("/")[-1]
    
    # Extract additional data from extensions
    appointment_type = None
    notes = None
    for ext in fhir_appointment.get("extension", []):
        if ext["url"] == "http://example.org/appointment-type":
            appointment_type = ext.get("valueString")
        elif ext["url"] == "http://example.org/appointment-notes":
            notes = ext.get("valueString")
    
    return AppointmentDTO(
        id=fhir_appointment["id"],
        date=dt,
        time=tm,
        patient=patient_ref or "Unknown Patient",
        problem=fhir_appointment.get("description") or appointment_type,
        description=notes or "",
        provider=doctor_ref or "Current Doctor",
        formattedDate=datetime.strptime(dt, "%Y-%m-%d").strftime("%d.%m.%Y"),
        status=REVERSE_FHIR_STATUS_MAP.get(fhir_appointment["status"], "pending"),
        patient_name=patient_ref or "Unknown Patient",
        patient_id=patient_ref,
        appointment_date=dt,
        appointment_time=tm,
        appointment_type=appointment_type,
        notes=notes,
        doctor_name="Dr. Sarah Johnson"  # In real implementation, fetch from user
    )

# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[AppointmentDTO])
async def list_appointments(
    status: Optional[str] = Query(None, description="Filter by status: pending, upcoming, past, completed"),
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    patient_id: Optional[str] = Query(None, description="Filter by patient ID"),
    current: DoctorUser = Depends(get_current_doctor)
):
    """Get all appointments with optional filtering"""
    
    # In real implementation, query FHIR repository
    # bundles = fhir_repo.query_resources("Appointment", filters={...})
    
    appointments = list(_APPOINTMENTS.values())
    
    # Apply filters
    if status:
        appointments = [apt for apt in appointments if apt.status == status]
    
    if date:
        appointments = [apt for apt in appointments if apt.date == date]
    
    if patient_id:
        appointments = [apt for apt in appointments if apt.patient_id == patient_id]
    
    # Sort by date and time (newest first for past, oldest first for upcoming)
    if status == "past":
        appointments.sort(key=lambda x: (x.date, x.time), reverse=True)
    else:
        appointments.sort(key=lambda x: (x.date, x.time))
    
    return appointments


@router.get("/{appointment_id}", response_model=AppointmentDTO)
async def get_appointment(
    appointment_id: str = Path(..., description="Appointment ID"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Get a specific appointment by ID"""
    appointment = _APPOINTMENTS.get(appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


@router.post("", response_model=AppointmentDTO, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    data: AppointmentCreate,
    current: DoctorUser = Depends(get_current_doctor),
):
    """Create a new appointment"""
    new_id = f"apt{uuid4().hex[:6]}"
    
    # Format date for UI display
    formatted_date = datetime.strptime(data.appointment_date, "%Y-%m-%d").strftime("%d.%m.%Y")
    
    dto = AppointmentDTO(
        id=new_id,
        date=data.appointment_date,
        time=data.appointment_time,
        patient=data.patient_name,
        problem=data.appointment_type or "General consultation",
        description=data.notes or "",
        provider=current.full_name,
        formattedDate=formatted_date,
        status=data.status,
        patient_name=data.patient_name,
        patient_id=data.patient_id,
        appointment_date=data.appointment_date,
        appointment_time=data.appointment_time,
        appointment_type=data.appointment_type,
        notes=data.notes,
        doctor_name=current.full_name
    )

    # In real implementation, save to FHIR repository
    # fhir_appt = make_fhir_appointment(dto, data.patient_id, current.id)
    # bundle = {...}
    # fhir_repo.save(bundle["id"], bundle)
    
    # Store in mock data
    _APPOINTMENTS[new_id] = dto
    
    return dto


@router.put("/{appointment_id}", response_model=AppointmentDTO)
async def update_appointment(
    data: AppointmentUpdate,
    appointment_id: str = Path(..., description="Appointment ID"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Update an existing appointment"""
    if appointment_id not in _APPOINTMENTS:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    appointment = _APPOINTMENTS[appointment_id]
    
    # Update only provided fields
    update_data = data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(appointment, field):
            setattr(appointment, field, value)
    
    # Update corresponding fields for frontend compatibility
    if data.appointment_date:
        appointment.date = data.appointment_date
        appointment.formattedDate = datetime.strptime(data.appointment_date, "%Y-%m-%d").strftime("%d.%m.%Y")
    
    if data.appointment_time:
        appointment.time = data.appointment_time
    
    if data.appointment_type:
        appointment.problem = data.appointment_type
    
    if data.notes:
        appointment.description = data.notes
    
    return appointment


@router.patch("/{appointment_id}/status", response_model=AppointmentDTO)
async def update_appointment_status(
    status_update: AppointmentStatusUpdate,
    appointment_id: str = Path(..., description="Appointment ID"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Update appointment status (accept/decline/complete)"""
    if appointment_id not in _APPOINTMENTS:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    valid_statuses = ["pending", "upcoming", "completed", "cancelled", "past"]
    if status_update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    appointment = _APPOINTMENTS[appointment_id]
    appointment.status = status_update.status
    
    # In real implementation, update FHIR repository
    # bundle = fhir_repo.get_by_resource_id("Appointment", appointment_id)
    # ... update FHIR resource ...
    # fhir_repo.update(bundle["id"], bundle)
    
    return appointment


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(
    appointment_id: str = Path(..., description="Appointment ID"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Delete an appointment (decline)"""
    if appointment_id not in _APPOINTMENTS:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # In real implementation, delete from FHIR repository
    # fhir_repo.delete_by_resource_id("Appointment", appointment_id)
    
    del _APPOINTMENTS[appointment_id]


# ──────────────────────────────────────────────────────────────────────────────
# Additional endpoints for enhanced functionality
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/date/{appointment_date}", response_model=List[AppointmentDTO])
async def get_appointments_by_date(
    appointment_date: str = Path(..., description="Date in YYYY-MM-DD format"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Get all appointments for a specific date"""
    appointments = [apt for apt in _APPOINTMENTS.values() if apt.date == appointment_date]
    appointments.sort(key=lambda x: x.time)
    return appointments


@router.get("/status/{status}", response_model=List[AppointmentDTO])
async def get_appointments_by_status(
    status: str = Path(..., description="Status: pending, upcoming, completed, cancelled, past"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Get all appointments with specific status"""
    appointments = [apt for apt in _APPOINTMENTS.values() if apt.status == status]
    
    # Sort appropriately based on status
    if status == "past":
        appointments.sort(key=lambda x: (x.date, x.time), reverse=True)
    else:
        appointments.sort(key=lambda x: (x.date, x.time))
    
    return appointments


@router.post("/{appointment_id}/accept", response_model=AppointmentDTO)
async def accept_appointment(
    appointment_id: str = Path(..., description="Appointment ID"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Accept a pending appointment"""
    if appointment_id not in _APPOINTMENTS:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    appointment = _APPOINTMENTS[appointment_id]
    appointment.status = "upcoming"
    
    return appointment


@router.post("/{appointment_id}/decline", status_code=status.HTTP_204_NO_CONTENT)
async def decline_appointment(
    appointment_id: str = Path(..., description="Appointment ID"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Decline a pending appointment (same as delete)"""
    if appointment_id not in _APPOINTMENTS:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    del _APPOINTMENTS[appointment_id]


@router.post("/{appointment_id}/complete", response_model=AppointmentDTO)
async def complete_appointment(
    appointment_id: str = Path(..., description="Appointment ID"),
    _: DoctorUser = Depends(get_current_doctor)
):
    """Mark an appointment as completed"""
    if appointment_id not in _APPOINTMENTS:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    appointment = _APPOINTMENTS[appointment_id]
    appointment.status = "past"  # Frontend uses "past" for completed appointments
    
    return appointment


@router.get("/stats/summary")
async def get_appointment_stats(
    _: DoctorUser = Depends(get_current_doctor)
):
    """Get appointment statistics for dashboard"""
    total_appointments = len(_APPOINTMENTS)
    pending_count = len([apt for apt in _APPOINTMENTS.values() if apt.status == "pending"])
    upcoming_count = len([apt for apt in _APPOINTMENTS.values() if apt.status == "upcoming"])
    completed_count = len([apt for apt in _APPOINTMENTS.values() if apt.status in ["past", "completed"]])
    
    # Today's appointments
    today = date.today().isoformat()
    today_appointments = len([apt for apt in _APPOINTMENTS.values() if apt.date == today])
    
    return {
        "total_appointments": total_appointments,
        "pending_appointments": pending_count,
        "upcoming_appointments": upcoming_count,
        "completed_appointments": completed_count,
        "today_appointments": today_appointments,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }