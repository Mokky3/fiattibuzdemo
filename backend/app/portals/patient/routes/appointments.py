# ── portals/patient/routes/appointments.py ───────────────
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, status
from pydantic import BaseModel, Field

from .auth import get_current_patient, PatientUser
# from ..fhir_client import (
#     fhir_create,          # POST {resource}
#     fhir_read,            # GET  {resource}/{id}
#     fhir_update,          # PUT  {resource}/{id}
#     fhir_search,          # GET  {resource}?…
# )  # TODO: implement FHIR client

router = APIRouter(prefix="/api/patient/appointments", tags=["Patient · Appointments"])

# ---------------------------------------------------------
# DTOs-for-UI  (what the React page expects)
# ---------------------------------------------------------
class AppointmentCreate(BaseModel):
    hospital: str
    appointmentDate: str        # "YYYY-MM-DD"
    appointmentTime: str        # "HH:MM"
    appointmentType: str        # free-text label
    additionalNote: Optional[str] = None
    doctor_id: Optional[str] = None   # optional Practitioner.id selected in modal


class AppointmentRow(BaseModel):
    id: str
    date: str                   # "DD.MM.YYYY"
    time: str                   # "HH:MM"
    daysUntil: Optional[int]    # present for upcoming records
    description: str
    hospital: str
    room: Optional[str]
    type: str                   # same label we stored


# ---------------------------------------------------------
#   POST  →  FHIR Appointment
# ---------------------------------------------------------
@router.post("", status_code=status.HTTP_201_CREATED)
async def book_appointment(
    data: AppointmentCreate = Body(...),
    me: PatientUser = Depends(get_current_patient),
):
    """Create a FHIR Appointment for the logged-in patient."""
    # ── 1. compose ISO datetime for start / end
    start_iso = datetime.fromisoformat(f"{data.appointmentDate}T{data.appointmentTime}:00").replace(
        tzinfo=timezone.utc
    )
    # naive example – 30-min slot:
    end_iso = start_iso + timedelta(minutes=30)

    # ── 2. build FHIR resource
    resource = {
        "resourceType": "Appointment",
        "status": "booked",
        "serviceCategory": [{"text": data.hospital}],
        "serviceType": [{"text": data.appointmentType}],
        "description": data.additionalNote or data.appointmentType,
        "start": start_iso.isoformat(),
        "end": end_iso.isoformat(),
        "participant": [
            {
                "actor": {"reference": f"Patient/{me.fhir_patient_id}"},
                "status": "accepted",
            }
        ],
    }
    if data.doctor_id:
        resource["participant"].append(
            {"actor": {"reference": f"Practitioner/{data.doctor_id}"}, "status": "needs-action"}
        )

    # created = fhir_create("Appointment", resource) # TODO: implement FHIR client
    return {"id": "mock_id"}   # UI doesn’t need more right now


# ---------------------------------------------------------
#   GET list (upcoming / past)
# ---------------------------------------------------------
@router.get("", response_model=List[AppointmentRow])
async def list_my_appointments(
    scope: str = Query("upcoming", regex="^(upcoming|past)$"),
    me: PatientUser = Depends(get_current_patient),
):
    """
    – upcoming  → future appointments (status≠cancelled, start>=today)  
    – past      → start<today OR status in {fulfilled, noshow, …}
    """
    today_iso = datetime.utcnow().date().isoformat()

    # basic search params (most servers support these search modifiers)
    params = {
        "patient": me.fhir_patient_id,
        "_sort": "-date",
        "_count": 50,   # low for demo; UI paginates client-side
    }
    # bundle = fhir_search("Appointment", params=params) # TODO: implement FHIR client

    rows: list[AppointmentRow] = []
    for e in [b["resource"] for b in {"entry": []}]: # Mock data for now
        start_dt = datetime.fromisoformat(e["start"])
        is_future = start_dt.date().isoformat() >= today_iso and e["status"] not in {"cancelled", "noshow"}

        if (scope == "upcoming" and not is_future) or (scope == "past" and is_future):
            continue

        rows.append(
            AppointmentRow(
                id=e["id"],
                date=start_dt.strftime("%d.%m.%Y"),
                time=start_dt.strftime("%H:%M"),
                daysUntil=(start_dt.date() - datetime.utcnow().date()).days if is_future else None,
                description=e.get("description", ""),
                hospital=e["serviceCategory"][0]["text"] if e.get("serviceCategory") else "",
                room=e.get("slot", [{}])[0].get("display"),
                type=e["serviceType"][0]["text"] if e.get("serviceType") else "",
            )
        )

    return rows


# ---------------------------------------------------------
#   PATCH (reschedule / cancel)
# ---------------------------------------------------------
class AppointmentPatch(BaseModel):
    status: Optional[str] = Field(None, pattern="^(cancelled|noshow)$")
    appointmentDate: Optional[str]
    appointmentTime: Optional[str]
    additionalNote: Optional[str]

@router.patch("/{apt_id}", status_code=status.HTTP_200_OK)
async def update_appointment(
    apt_id: str = Path(...),
    data: AppointmentPatch = Body(...),
    me: PatientUser = Depends(get_current_patient),
):
    # appt = fhir_read("Appointment", apt_id) # TODO: implement FHIR client
    appt = {"id": apt_id, "status": "booked", "start": "2023-10-27T10:00:00Z", "end": "2023-10-27T10:30:00Z", "participant": [{"actor": {"reference": f"Patient/{me.fhir_patient_id}"}, "status": "accepted"}]}
    # rudimentary ownership check
    if not any(
        p.get("actor", {}).get("reference") == f"Patient/{me.fhir_patient_id}"
        for p in appt.get("participant", [])
    ):
        raise HTTPException(403, "Not your appointment")

    if data.status:
        appt["status"] = data.status
    if data.appointmentDate and data.appointmentTime:
        new_start = datetime.fromisoformat(f"{data.appointmentDate}T{data.appointmentTime}:00").replace(
            tzinfo=timezone.utc
        )
        appt["start"] = new_start.isoformat()
        appt["end"] = (new_start + timedelta(minutes=30)).isoformat()
    if data.additionalNote is not None:
        appt["description"] = data.additionalNote

    # fhir_update("Appointment", apt_id, appt) # TODO: implement FHIR client
    return {"ok": True}
