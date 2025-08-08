from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, status
from pydantic import BaseModel, Field

from .auth import get_current_patient, PatientUser
# from ..fhir_client import fhir_create, fhir_read, fhir_search   # existing helper thin-wrapper - TODO: implement FHIR client

router = APIRouter(prefix="/api/patient/prescriptions", tags=["Patient · Prescriptions"])

# ───────────────────────── DTOs returned to the React component ──────────────────────────
class PrescriptionRow(BaseModel):
    id: str
    medicineName: str
    knownAs: Optional[str]
    description: Optional[str]
    prescribedDate: str          # "DD.MM.YYYY"
    endDate: Optional[str]       # "DD.MM.YYYY"
    prescribedBy: str
    hospital: Optional[str]
    dosage: Optional[str]
    frequency: Optional[str]
    status: str                  # active | expired | completed
    remainingRefills: int
    totalRefills: int
    price: Optional[str]         # placeholder, if you implement price-lookup later


# ───────────────────────── helpers ──────────────────────────
def mr_to_row(mr: dict) -> PrescriptionRow:
    """Convert a FHIR MedicationRequest into the UI friendly shape."""
    authored = datetime.fromisoformat(mr["authoredOn"])
    end = mr.get("dispenseRequest", {}).get("validityPeriod", {}).get("end")
    dosage = (
        mr.get("dosageInstruction", [{}])[0]
        .get("text")
    )
    repeats = mr.get("dispenseRequest", {}).get("numberOfRepeatsAllowed", 0)
    refills_left = repeats  # simple demo – in reality you’d subtract already-dispensed

    return PrescriptionRow(
        id=mr["id"],
        medicineName=mr["medicationCodeableConcept"]["text"],
        knownAs=mr["medicationCodeableConcept"]["coding"][0]["display"]
        if mr["medicationCodeableConcept"].get("coding")
        else None,
        description=mr.get("note", [{}])[0].get("text"),
        prescribedDate=authored.strftime("%d.%m.%Y"),
        endDate=datetime.fromisoformat(end).strftime("%d.%m.%Y") if end else None,
        prescribedBy=mr["requester"]["display"],
        hospital=mr.get("encounter", {}).get("display"),
        dosage=dosage,
        frequency=None,
        status=mr["status"],                       # “active”, “stopped”, “completed”, …
        remainingRefills=refills_left,
        totalRefills=repeats,
        price=None,
    )


# ───────────────────────── GET list ──────────────────────────
@router.get("", response_model=List[PrescriptionRow])
async def list_my_prescriptions(
    scope: str = Query("active", regex="^(active|expired|all)$"),
    me: PatientUser = Depends(get_current_patient),
):
    """
    Returns a flattened list for the UI.
    *active*   – status=active and validity still in the future  
    *expired*  – validityPeriod.end < today OR status ∈ {stopped, completed}  
    *all*      – no filter
    """
    bundle = fhir_search("MedicationRequest", params={"patient": me.fhir_patient_id, "_count": 100})
    today = datetime.utcnow().date()

    rows: list[PrescriptionRow] = []
    for entry in bundle.get("entry", []):
        mr = entry["resource"]
        row = mr_to_row(mr)

        if scope == "active":
            valid_end = mr.get("dispenseRequest", {}).get("validityPeriod", {}).get("end")
            still_valid = valid_end is None or datetime.fromisoformat(valid_end).date() >= today
            if mr["status"] != "active" or not still_valid:
                continue
        elif scope == "expired":
            valid_end = mr.get("dispenseRequest", {}).get("validityPeriod", {}).get("end")
            ended = valid_end and datetime.fromisoformat(valid_end).date() < today
            if not ended and mr["status"] == "active":
                continue

        rows.append(row)

    return rows


# ───────────────────────── POST refill request ──────────────────────────
class RefillRequest(BaseModel):
    pharmacy_id: Optional[str] = None  # if user already chose a pharmacy

@router.post("/{rx_id}/refill", status_code=status.HTTP_202_ACCEPTED)
async def request_refill(
    rx_id: str = Path(...),
    data: RefillRequest = Body(...),
    me: PatientUser = Depends(get_current_patient),
):
    """Creates a FHIR Task so the doctor (or automated workflow) can approve a refill."""
    # 1. check the prescription belongs to this patient
    mr = fhir_read("MedicationRequest", rx_id)
    if mr["subject"]["reference"] != f"Patient/{me.fhir_patient_id}":
        raise HTTPException(403, "Not your prescription")

    # 2. create Task requesting action
    task_resource = {
        "resourceType": "Task",
        "status": "requested",
        "intent": "order",
        "for": {"reference": f"Patient/{me.fhir_patient_id}"},
        "focus": {"reference": f"MedicationRequest/{rx_id}"},
        "description": "Patient requested refill via portal",
        "authoredOn": datetime.utcnow().isoformat(),
    }
    if data.pharmacy_id:
        task_resource["owner"] = {"reference": f"Organization/{data.pharmacy_id}"}

    created = fhir_create("Task", task_resource)
    return {"taskId": created["id"]}
