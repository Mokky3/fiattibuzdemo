# ── portals/patient/routes/appointments.py ───────────────
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, status
from pydantic import BaseModel, Field
from app.portals.patient.schemas.profile_enhanced import (
    AppointmentCreate as _SchemaAppointmentCreate,
    AppointmentRow as _SchemaAppointmentRow,
    AppointmentPatch as _SchemaAppointmentPatch,
)

from app.common.auth.auth_service import AuthenticatedUser, require_patient_access
# DB and CRUD access
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.patient import patient as patient_crud
from app.crud.patient_portal import patient_portal_crud
# from ..fhir_client import (
#     fhir_create,          # POST {resource}
#     fhir_read,            # GET  {resource}/{id}
#     fhir_update,          # PUT  {resource}/{id}
#     fhir_search,          # GET  {resource}?…
# )  # TODO: implement FHIR client

# Note: Router prefix is applied in app.main include_router. Do not add an internal prefix here
router = APIRouter(tags=["Patient · Appointments"])

# ---------------------------------------------------------
# DTOs-for-UI  (what the React page expects)
# ---------------------------------------------------------
AppointmentCreate = _SchemaAppointmentCreate


AppointmentRow = _SchemaAppointmentRow


# ---------------------------------------------------------
#   POST  →  FHIR Appointment
# ---------------------------------------------------------
def _patient_id_for_user(db: Session, me: AuthenticatedUser) -> str:
    row = patient_crud.get_by_user_id(db=db, user_id=me.user_id)
    return str(row.id) if row else me.user_id


@router.post("", status_code=status.HTTP_201_CREATED)
async def book_appointment(
    data: AppointmentCreate = Body(...),
    me: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db),
):
    """Create an appointment: persist locally, then best-effort FHIR sync later."""
    # Validate required fields
    if not data.appointmentDate:
        raise HTTPException(status_code=422, detail="appointmentDate is required")
    if not data.appointmentTime:
        raise HTTPException(status_code=422, detail="appointmentTime is required")
    if not data.hospital:
        raise HTTPException(status_code=422, detail="hospital is required")
    if not data.appointmentType:
        raise HTTPException(status_code=422, detail="appointmentType is required")

    # Prepare appointment data - let CRUD function handle doctor selection
    appointment_data = {
        "hospital": data.hospital,
        "appointmentDate": data.appointmentDate,
        "appointmentTime": data.appointmentTime,
        "appointmentType": data.appointmentType,
        "additionalNote": data.additionalNote or "",
    }
    
    # Only include doctor_id if it's provided and valid
    if hasattr(data, 'doctor_id') and data.doctor_id:
        appointment_data["doctor_id"] = str(data.doctor_id)

    # Persist locally (source of truth) - CRUD will find a valid doctor if none provided
    patient_id_str = _patient_id_for_user(db, me)
    patient_id_uuid = UUID(patient_id_str)  # Convert string to UUID
    created = patient_portal_crud.create_appointment(db, patient_id_uuid, appointment_data)

    # TODO: best-effort FHIR sync can be added here
    # ── 2. build FHIR resource (commented out until FHIR client is implemented)
    # patient_id = _patient_id_for_user(db, me)
    # start_iso = datetime.fromisoformat(f"{data.appointmentDate}T{data.appointmentTime}:00").replace(
    #     tzinfo=timezone.utc
    # )
    # end_iso = start_iso + timedelta(minutes=30)
    # resource = {
    #     "resourceType": "Appointment",
    #     "status": "booked",
    #     "serviceCategory": [{"text": data.hospital}],
    #     "serviceType": [{"text": data.appointmentType}],
    #     "description": data.additionalNote or data.appointmentType,
    #     "start": start_iso.isoformat(),
    #     "end": end_iso.isoformat(),
    #     "participant": [
    #         {
    #             "actor": {"reference": f"Patient/{patient_id}"},
    #             "status": "accepted",
    #         }
    #     ],
    # }
    # if data.doctor_id:
    #     resource["participant"].append(
    #         {"actor": {"reference": f"Practitioner/{data.doctor_id}"}, "status": "needs-action"}
    #     )
    # fhir_create("Appointment", resource)

    return {"id": str(created.id), "status": "booked"}


# ---------------------------------------------------------
#   GET list (upcoming / past)
# ---------------------------------------------------------
@router.get("", response_model=List[AppointmentRow])
async def list_my_appointments(
    scope: str = Query("upcoming", pattern="^(upcoming|past)$"),
    me: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db),
):
    """
    – upcoming  → future appointments (status≠cancelled, start>=today)  
    – past      → start<today OR status in {fulfilled, noshow, …}
    """
    # Read from local DB
    patient_id = _patient_id_for_user(db, me)
    items = patient_portal_crud.get_patient_appointments(db, patient_id=patient_id, scope=scope)

    # Map to AppointmentRow DTO
    rows = []
    for appt in items:
        # Extract date and time from appointment_date (DateTime field)
        appointment_datetime = appt.appointment_date if getattr(appt, 'appointment_date', None) else None
        date_str = appointment_datetime.strftime("%d.%m.%Y") if appointment_datetime else ""
        time_str = appointment_datetime.strftime("%H:%M") if appointment_datetime else ""
        
        # Get hospital name - check if relationship is loaded, otherwise query separately
        hospital_name = ""
        if hasattr(appt, 'hospital') and appt.hospital:
            hospital_name = appt.hospital.name
        elif hasattr(appt, 'hospital_id') and appt.hospital_id:
            # Fallback: query hospital if relationship not loaded
            from app.common.models.hospital import Hospital
            hospital = db.query(Hospital).filter(Hospital.id == appt.hospital_id).first()
            hospital_name = hospital.name if hospital else ""
        
        # Get description from reason or notes
        description = appt.reason or appt.notes or ""
        
        # Calculate days until appointment
        days_until = None
        if appointment_datetime:
            today = datetime.now(timezone.utc).date()
            appt_date = appointment_datetime.date()
            days_until = (appt_date - today).days
        
        rows.append({
            "id": str(appt.id),
            "date": date_str,
            "time": time_str,
            "daysUntil": days_until,
            "description": description,
            "hospital": hospital_name,
            "room": getattr(appt, 'room_number', None) or "",
            "type": appt.appointment_type if isinstance(appt.appointment_type, str) else (appt.appointment_type.value if hasattr(appt.appointment_type, 'value') else str(appt.appointment_type)),
        })
    return rows


# ---------------------------------------------------------
#   PATCH (reschedule / cancel)
# ---------------------------------------------------------
AppointmentPatch = _SchemaAppointmentPatch

@router.patch("/{apt_id}", status_code=status.HTTP_200_OK)
async def update_appointment(
    apt_id: str = Path(...),
    data: AppointmentPatch = Body(...),
    me: AuthenticatedUser = Depends(require_patient_access()),
    db: Session = Depends(get_db),
):
    """Update an appointment (cancel, reschedule, or update notes)."""
    patient_id_uuid = UUID(_patient_id_for_user(db, me))
    
    # Prepare update data
    update_data = {}
    if data.status:
        update_data["status"] = data.status
    if data.appointmentDate and data.appointmentTime:
        update_data["appointmentDate"] = data.appointmentDate
        update_data["appointmentTime"] = data.appointmentTime
    if data.additionalNote is not None:
        update_data["additionalNote"] = data.additionalNote
    
    # Update appointment using CRUD function
    updated = patient_portal_crud.update_appointment(
        db=db,
        patient_id=patient_id_uuid,
        appointment_id=apt_id,
        update_data=update_data
    )
    
    if not updated:
        raise HTTPException(status_code=404, detail="Appointment not found or you don't have permission to update it")
    
    return {"ok": True, "id": str(updated.id), "status": updated.status}
