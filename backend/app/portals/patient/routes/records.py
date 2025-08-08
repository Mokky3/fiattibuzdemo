from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, status
from pydantic import BaseModel

from .auth import get_current_patient, PatientUser
# from .fhir_client import fhir_search  # TODO: implement FHIR client

router = APIRouter(prefix="/api/patient/records", tags=["Patient · Records"])


class RecordRow(BaseModel):
    id: str
    date: str                # "DD.MM.YYYY"
    recordType: str          # Consultation | Cardiologist | …
    description: str
    doctor: Optional[str]
    hospital: Optional[str]


class Page(BaseModel):
    total: int
    page: int
    size: int
    items: List[RecordRow]


# mapping from chip → FHIR search parameters
SPECIALTY_MAP = {
    "Medical card": {},             # no filter – everything
    "Consultations": {"class": "AMB"},          # encounter class ambulatory
    "Cardiologist": {"type:below": "394579002"},  # SNOMED specialist
    "Dermatologist": {"type:below": "394585009"},
    "Psychologist": {"type:below": "394587002"},
    "Allergist": {"type:below": "419772000"},
    "Therapist": {"type:below": "394913002"},
    "Surgery": {"type:below": "394806006"},
    "Dentist": {"type:below": "394589003"},
    "Diagnosis": {"diagnosis": "confirmed"},
    "pregnancy": {"diagnosis": "169745009"},   # example
}


@router.get("", response_model=Page)
async def list_records(
    me: PatientUser = Depends(get_current_patient),
    type: str = Query("Medical card"),          # chip text
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
):
    """
    Aggregate Encounters + Procedures (+DiagnosticReports if you like)
    into a single, paginated list.
    """
    if type not in SPECIALTY_MAP:
        raise HTTPException(400, "unknown type filter")

    # ---- 1. fetch Encounters (the cheapest “all-purpose” record) ----
    params = {
        "patient": me.fhir_patient_id,
        "_sort": "-date",
        "_include": "Encounter:service-provider",   # so we can show hospital
        "_count": size,
        **SPECIALTY_MAP[type],
    }
    # bundle = fhir_search("Encounter", params=params, page=page) # TODO: implement FHIR client

    total = 0 # Placeholder for total
    rows: list[RecordRow] = []

    for entry in []: # Placeholder for bundle.get("entry", [])
        e = entry["resource"]
        facility = (
            e.get("serviceProvider", {}).get("display")
            if isinstance(e.get("serviceProvider"), dict)
            else None
        )

        doc_name = None
        if e.get("participant"):
            doc_ref = e["participant"][0]["individual"]
            doc_name = doc_ref.get("display")

        rows.append(
            RecordRow(
                id=e["id"],
                date=datetime.fromisoformat(e["period"]["start"]).strftime(
                    "%d.%m.%Y"
                ),
                recordType=e["type"][0]["text"] if e.get("type") else "Consultation",
                description=e.get("reasonCode", [{}])[0].get("text", "—"),
                doctor=doc_name,
                hospital=facility,
            )
        )

    return Page(total=total, page=page, size=size, items=rows)
