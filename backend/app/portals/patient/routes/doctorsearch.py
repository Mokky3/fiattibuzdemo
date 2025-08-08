from __future__ import annotations
from typing import Optional, List, Dict

import os, httpx, urllib.parse as ul
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()
FHIR_BASE   = os.getenv("FHIR_BASE_URL")
FHIR_TOKEN  = os.getenv("FHIR_AUTH_TOKEN")

# ------------------------------------------------------------------ helpers ---
async def fhir_get(path: str) -> dict:
    async with httpx.AsyncClient(
        headers={
            "Authorization": f"Bearer {FHIR_TOKEN}",
            "Accept": "application/fhir+json",
        }
    ) as client:
        resp = await client.get(FHIR_BASE + path)
    if resp.status_code >= 400:
        raise HTTPException(resp.status_code, resp.text)
    return resp.json()

async def fhir_post(path: str, body: dict) -> dict:
    async with httpx.AsyncClient(
        headers={
            "Authorization": f"Bearer {FHIR_TOKEN}",
            "Content-Type": "application/fhir+json",
        }
    ) as client:
        resp = await client.post(FHIR_BASE + path, json=body)
    if resp.status_code >= 400:
        raise HTTPException(resp.status_code, resp.text)
    return resp.json()

# ------------------------------------------------------------- pydantic ------
class Doctor(BaseModel):
    id: str
    fullName: str
    specialty: Optional[str]
    hospital: Optional[str]

class AppointmentRequest(BaseModel):
    doctorId: str
    patientId: str        # front-end has this in auth context
    appointmentDate: str  # ISO 8601 - yyyy-mm-dd
    appointmentTime: str  # HH:MM
    appointmentType: str
    additionalNote: Optional[str]

# ---------------------------------------------------------------- router -----
router = APIRouter()

# GET /api/doctors/search ------------------------------------------------------
@router.get("/doctors/search", response_model=List[Doctor])
async def search_doctors(
    fullName: Optional[str] = Query(None, alias="fullName"),
    hospital: Optional[str] = Query(None),
    specialty: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
):
    """
    Quick practitioner lookup over FHIR.
    Supports: name, organization(hospital) & specialty filters.
    """
    # --- build FHIR query ----------------------------------------------------
    q: list[str] = []
    if fullName:
        q.append(f"name:contains={ul.quote(fullName)}")
    if specialty:
        q.append(f"specialty:contains={ul.quote(specialty)}")
    if hospital:
        # filter by organization name – FHIR search uses `organization.name`
        q.append(f"organization.name:contains={ul.quote(hospital)}")

    url = "/PractitionerRole"
    if q:
        url += "?" + "&".join(q)
    url += f"&_count={limit}"

    bundle = await fhir_get(url)

    doctors: list[Doctor] = []
    for e in bundle.get("entry", []):
        pr  = e["resource"]
        doc = pr["practitioner"]["display"]
        spec= pr.get("specialty", [{}])[0].get("text")
        hosp= pr.get("organization", {}).get("display")
        doctors.append(
            Doctor(
                id=pr["id"],
                fullName=doc,
                specialty=spec,
                hospital=hosp,
            )
        )
    return doctors


# POST /api/appointments -------------------------------------------------------
@router.post("/appointments", status_code=status.HTTP_201_CREATED)
async def book_appointment(req: AppointmentRequest):
    """
    Creates a FHIR `Appointment` resource that links the patient & practitioner.
    """
    # Build ISO datetime range (assume 30-min slots; adjust if you track slots)
    start = f"{req.appointmentDate}T{req.appointmentTime}:00Z"
    # naive 30-minute increment
    hour, minute = map(int, req.appointmentTime.split(":"))
    minute += 30
    if minute >= 60:
        hour += 1
        minute -= 60
    end = f"{req.appointmentDate}T{hour:02d}:{minute:02d}:00Z"

    appointment: Dict = {
        "resourceType": "Appointment",
        "status": "booked",
        "description": req.appointmentType,
        "comment": req.additionalNote,
        "start": start,
        "end": end,
        "participant": [
            {  # patient
                "actor": {"reference": f"Patient/{req.patientId}"},
                "status": "accepted",
            },
            {  # practitioner
                "actor": {"reference": f"Practitioner/{req.doctorId}"},
                "status": "accepted",
            },
        ],
    }

    created = await fhir_post("/Appointment", appointment)
    return {"id": created["id"]}
