"""Doctor portal – prescriptions router
Internally uses FHIR MedicationRequest resources while preserving the existing
public REST contract expected by the React UI.
"""
from datetime import datetime, timezone, date
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Path, Body, Query, status
from pydantic import BaseModel

from .auth import get_current_doctor, DoctorUser
# from db import fhir_repo  # abstraction over fhir_resources table (JSONB) - TODO: implement FHIR repository
# from services.fhir_builders import coding  # reuse helper - TODO: implement FHIR builders

router = APIRouter(prefix="/api/doctor", tags=["Doctor · Prescriptions"])

# ---------------------------------------------------------------------------
# Incoming payload (UI)
# ---------------------------------------------------------------------------
class PrescriptionCreate(BaseModel):
    medication_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: str | None = None
    status: str = "active"            # active | completed | cancelled

# ---------------------------------------------------------------------------
# Thin DTO back to UI (keeps behaviour unchanged)
# ---------------------------------------------------------------------------
class PrescriptionDTO(BaseModel):
    id: str
    patient_id: str
    medication_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: str | None = None
    prescribed_date: str
    status: str
    doctor_name: str

# In‑memory cache so dashboard can list without extra DB round‑trips.
_PRESC_CACHE: Dict[str, PrescriptionDTO] = {}

# ---------------------------------------------------------------------------
# Helper – build a FHIR MedicationRequest resource
# ---------------------------------------------------------------------------

def build_medication_request(
    rx_id: str,
    patient_id: str,
    doctor_id: str,
    data: PrescriptionCreate,
) -> Dict:
    # For demo, we don't resolve real RxNorm; we code the free‑text drug name
    med_code = coding(
        "http://www.nlm.nih.gov/research/umls/rxnorm",
        data.medication_name.lower().replace(" ", "-"),
        data.medication_name,
    )
    written = datetime.now(timezone.utc).isoformat()
    return {
        "resourceType": "MedicationRequest",
        "id": rx_id,
        "status": data.status,          # active | completed | cancelled
        "intent": "order",
        "medicationCodeableConcept": {"coding": [med_code]},
        "subject": {"reference": f"Patient/{patient_id}"},
        "authoredOn": written,
        "requester": {"reference": f"Practitioner/{doctor_id}"},
        "dosageInstruction": [
            {
                "text": data.instructions or 
                        f"{data.dosage}, {data.frequency} × for {data.duration}",
            }
        ],
    }

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@router.post(
    "/patients/{patient_id}/prescriptions",
    response_model=PrescriptionDTO,
    status_code=status.HTTP_201_CREATED,
)
async def create_prescription(
    patient_id: str,
    data: PrescriptionCreate = Body(...),
    current: DoctorUser = Depends(get_current_doctor),
):
    rx_id = f"rx{uuid4().hex[:6]}"
    fhir_res = build_medication_request(rx_id, patient_id, current.id, data)

    bundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "entry": [{"resource": fhir_res}],
    }
    # fhir_repo.save(bundle["entry"][0]["resource"]["id"], bundle) # TODO: implement FHIR repository

    dto = PrescriptionDTO(
        id=rx_id,
        patient_id=patient_id,
        medication_name=data.medication_name,
        dosage=data.dosage,
        frequency=data.frequency,
        duration=data.duration,
        instructions=data.instructions,
        prescribed_date=str(date.today()),
        status=data.status,
        doctor_name=current.full_name,
    )
    _PRESC_CACHE[rx_id] = dto
    return dto


@router.patch("/prescriptions/{rx_id}", response_model=PrescriptionDTO)
async def update_prescription_status(
    rx_id: str,
    payload: dict = Body(...),
    _: DoctorUser = Depends(get_current_doctor),
):
    if rx_id not in _PRESC_CACHE:
        raise HTTPException(status_code=404, detail="Prescription not found")

    # Update FHIR JSONB
    # bundle = fhir_repo.get_by_qr_id(rx_id)  # reusing method; id matches # TODO: implement FHIR repository
    if not bundle:
        raise HTTPException(status_code=500, detail="FHIR bundle missing")
    med_req = bundle["entry"][0]["resource"]
    med_req["status"] = payload.get("status", med_req["status"])
    # fhir_repo.save(rx_id, bundle)  # overwrite # TODO: implement FHIR repository

    # Update cache / DTO
    _PRESC_CACHE[rx_id] = _PRESC_CACHE[rx_id].copy(update=payload)
    return _PRESC_CACHE[rx_id]


@router.delete("/prescriptions/{rx_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prescription(
    rx_id: str,
    _: DoctorUser = Depends(get_current_doctor),
):
    _PRESC_CACHE.pop(rx_id, None)
    # fhir_repo.delete_by_qr_id(rx_id) # TODO: implement FHIR repository
