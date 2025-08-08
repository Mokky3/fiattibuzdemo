# portals/patient/routes/profile.py
from fastapi import APIRouter, Depends, HTTPException, status, Body
from datetime import datetime
from typing import List, Optional

from .auth import get_current_patient, PatientUser
# from ..fhir_client import fhir_get, fhir_patch   # tiny wrapper around requests - TODO: implement FHIR client

router = APIRouter(prefix="/api/patient/profile", tags=["Patient · Profile"])


# ───── API models returned to React ────────────────────────────
from pydantic import BaseModel


class VitalStat(BaseModel):
    code: str       # e.g. "weight"
    value: str      # "70 kg"
    date: datetime


class ImmunizationRec(BaseModel):
    vaccine: str
    date: datetime
    status: str     # Completed | Due | Overdue


class InsuranceInfo(BaseModel):
    provider: str
    policyNumber: str
    groupNumber: Optional[str]
    coverageType: str
    validUntil: Optional[datetime]


class ProfileOut(BaseModel):
    # demography
    fullName: str
    email: Optional[str]
    phone: Optional[str]
    gender: Optional[str]
    dateOfBirth: Optional[datetime]
    address: Optional[str]
    emergencyContact: Optional[str]
    emergencyPhone: Optional[str]
    profileImage: Optional[str]       # base64 or public URL
    patientId: str
    registrationDate: datetime

    # medical
    vitals: List[VitalStat]
    bloodGroup: Optional[str]
    bloodRh: Optional[str]
    allergies: List[str]
    chronicConditions: List[str]
    immunizations: List[ImmunizationRec]

    # insurance
    insurance: Optional[InsuranceInfo]


class DemographicsPatch(BaseModel):
    fullName: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    emergencyContact: Optional[str]
    emergencyPhone: Optional[str]
    profileImage: Optional[str]  # base64 data-URL


# ───── GET profile ─────────────────────────────────────────────
@router.get("", response_model=ProfileOut)
async def get_profile(me: PatientUser = Depends(get_current_patient)):
    """Aggregate Patient + Coverage + latest Observations."""
    # — 1. Patient
    patient = fhir_get(f"Patient/{me.fhir_patient_id}")

    # — 2. Insurance (Coverage with status=active)
    coverages = fhir_get(
        "Coverage",
        params={"patient": me.fhir_patient_id, "status": "active"}
    ).get("entry", [])
    coverage = coverages[0]["resource"] if coverages else None

    # — 3. Latest height / weight / BP observations
    vital_codes = ["8302-2", "29463-7", "85354-9"]  # LOINC height, weight, BP
    observations = fhir_get(
        "Observation",
        params={
            "patient": me.fhir_patient_id,
            "code": ",".join(vital_codes),
            "_sort": "-date",
            "_count": 20,
        },
    ).get("entry", [])

    vitals = []
    for e in observations:
        obs = e["resource"]
        loinc = obs["code"]["coding"][0]["code"]
        if loinc == "8302-2":
            code = "height"
        elif loinc == "29463-7":
            code = "weight"
        else:
            code = "bloodPressure"
        value = (
            f"{obs['valueQuantity']['value']} {obs['valueQuantity']['unit']}"
            if "valueQuantity" in obs
            else "—"
        )
        vitals.append(
            VitalStat(
                code=code,
                value=value,
                date=obs["effectiveDateTime"],
            )
        )

    # — 4. Immunizations
    imms = fhir_get(
        "Immunization",
        params={"patient": me.fhir_patient_id, "_sort": "-date", "_count": 50},
    ).get("entry", [])
    immunizations = [
        ImmunizationRec(
            vaccine=i["resource"]["vaccineCode"]["text"],
            date=i["resource"]["occurrenceDateTime"],
            status=i["resource"]["status"].capitalize(),  # completed / due
        )
        for i in imms
    ]

    # — 5. Build response
    name = patient["name"][0]
    full_name = " ".join(name.get(k, "") for k in ("given", "family") if k in name).strip()
    telecom = {t["system"]: t["value"] for t in patient.get("telecom", [])}

    return ProfileOut(
        fullName=full_name,
        email=telecom.get("email"),
        phone=telecom.get("phone"),
        gender=patient.get("gender"),
        dateOfBirth=patient.get("birthDate"),
        address=patient.get("address", [{}])[0].get("text"),
        emergencyContact=patient.get("contact", [{}])[0].get("name", {}).get("text"),
        emergencyPhone=patient.get("contact", [{}])[0].get("telecom", [{}])[0].get("value"),
        profileImage=patient.get("photo", [{}])[0].get("url"),
        patientId=patient["id"],
        registrationDate=patient["meta"]["lastUpdated"],
        vitals=vitals,
        bloodGroup=patient.get("extension", [{}])[0].get("valueString"),
        bloodRh=patient.get("extension", [{}])[1].get("valueString") if len(patient.get("extension", [])) > 1 else None,
        allergies=[],  # you could slot AllergyIntolerance query here
        chronicConditions=[],
        immunizations=immunizations,
        insurance=InsuranceInfo(
            provider=coverage["payor"][0]["display"],
            policyNumber=coverage["subscriberId"],
            groupNumber=coverage.get("grouping", {}).get("group"),
            validUntil=coverage.get("period", {}).get("end"),
            coverageType=coverage["type"]["coding"][0]["display"],
        ) if coverage else None,
    )


# ───── PATCH demographics ─────────────────────────────────────
@router.patch("", status_code=status.HTTP_204_NO_CONTENT)
async def patch_demographics(
    payload: DemographicsPatch = Body(...),
    me: PatientUser = Depends(get_current_patient),
):
    """Patient can update a subset of their own Patient resource."""
    updates = {}

    if payload.fullName:
        given, *rest = payload.fullName.split(" ")
        updates["name"] = [
            {
                "use": "official",
                "family": " ".join(rest) if rest else "",
                "given": [given],
            }
        ]

    if payload.email:
        updates.setdefault("telecom", []).append(
            {"system": "email", "value": payload.email, "use": "home"}
        )
    if payload.phone:
        updates.setdefault("telecom", []).append(
            {"system": "phone", "value": payload.phone, "use": "mobile"}
        )

    if payload.address:
        updates["address"] = [{"text": payload.address}]

    if payload.profileImage:
        updates["photo"] = [{"contentType": "image/png", "data": payload.profileImage}]

    if not updates:
        return  # nothing to change

    fhir_patch(f"Patient/{me.fhir_patient_id}", updates)
