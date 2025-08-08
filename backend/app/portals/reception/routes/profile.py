"""Reception portal – profile/settings router
This router lets a receptionist view & update their profile, password,
notification preferences, and system preferences.

FHIR mapping
------------
* Personal info is stored in a **Practitioner** resource (even though a
  receptionist is non‑clinical staff, FHIR allows `Practitioner.role`
  "Receptionist" per SNOMED 224609009).
* Profile image is stored as a **Binary** resource; the Practitioner
  `photo` element has a reference with `contentType` and `url`.
* Notification & system preference objects are carried as JSON blobs in
  an `extension` on the Practitioner (url: `http://fiattib.com/fhir/StructureDefinition/reception‑prefs`).

Public JSON contract
--------------------
Exactly matches the shape used by *ReceptionProfile.jsx* so the front‑end
needs zero changes.
"""
from __future__ import annotations

import base64
from datetime import datetime
from typing import Dict, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Body, status
from pydantic import BaseModel, EmailStr

from .auth import get_current_receptionist, ReceptionistUser
# from db import fhir_repo  # type: ignore – your wrapper for fhir_resources - TODO: implement FHIR repository

router = APIRouter(prefix="/api/v1/reception/profile", tags=["Reception · Profile"])


# ──────────────────────────────────────────────────────────────────────────────
# Front‑end DTO models
# ──────────────────────────────────────────────────────────────────────────────
class PersonalInfo(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zipCode: str | None = None
    birthDate: str | None = None        # YYYY‑MM‑DD
    employeeId: str
    department: str | None = None
    startDate: str | None = None        # YYYY‑MM‑DD
    emergencyContact: str | None = None
    emergencyPhone: str | None = None

class NotificationPrefs(BaseModel):
    appointmentReminders: bool = True
    newPatientAlerts: bool = True
    systemUpdates: bool = False
    emergencyAlerts: bool = True
    emailNotifications: bool = True
    smsNotifications: bool = False
    desktopNotifications: bool = True
    soundAlerts: bool = True

class SystemPrefs(BaseModel):
    language: str = "en"
    timezone: str = "UTC"
    dateFormat: str = "YYYY‑MM‑DD"
    timeFormat: str = "24"
    theme: str = "light"
    fontSize: str = "medium"
    autoLogout: str = "30"     # minutes, or "never"
    defaultView: str = "dashboard"

class ProfileDTO(BaseModel):
    personalInfo: PersonalInfo
    notifications: NotificationPrefs
    systemPrefs: SystemPrefs
    profileImage: str | None = None   # data URL base64
    lastUpdated: str


# ──────────────────────────────────────────────────────────────────────────────
# Helper – build FHIR Practitioner & Binary
# ──────────────────────────────────────────────────────────────────────────────
FHIR_NS = "http://hl7.org/fhir"
PREFS_EXT_URL = "http://fiattib.com/fhir/StructureDefinition/reception-prefs"


def _build_practitioner(user: ReceptionistUser, dto: ProfileDTO) -> Dict[str, Any]:
    p = dto.personalInfo
    ext_value = {
        "notifications": dto.notifications.dict(),
        "systemPrefs": dto.systemPrefs.dict(),
    }
    practitioner: Dict[str, Any] = {
        "resourceType": "Practitioner",
        "id": user.practitioner_id,   # created at signup; str(uuid)
        "meta": {
            "profile": ["http://hl7.org/fhir/StructureDefinition/Practitioner"],
            "lastUpdated": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        },
        "identifier": [{
            "system": "http://fiattib.com/employee-id",
            "value": p.employeeId,
        }],
        "name": [{
            "use": "official",
            "family": p.lastName,
            "given": [p.firstName],
        }],
        "telecom": [t for t in [
            {"system": "email", "value": p.email, "use": "work"},
            {"system": "phone", "value": p.phone, "use": "work"} if p.phone else None,
        ] if t],
        "address": [{
            "text": p.address,
            "city": p.city,
            "state": p.state,
            "postalCode": p.zipCode,
        }],
        "birthDate": p.birthDate,
        "extension": [{
            "url": PREFS_EXT_URL,
            "valueJson": ext_value,
        }],
    }
    if dto.profileImage:
        bin_id = f"bin-{uuid4().hex[:8]}"
        practitioner["photo"] = [{
            "contentType": dto.profileImage.split(";")[0].replace("data:", "") if dto.profileImage.startswith("data:") else "image/png",
            "url": f"Binary/{bin_id}"
        }]
        _save_binary(bin_id, dto.profileImage)
    return practitioner


def _save_binary(bin_id: str, data_url: str):
    """Decode a data URL and store as Binary resource."""
    if not data_url.startswith("data:"):
        return
    header, b64 = data_url.split(",", 1)
    content_type = header.split(";")[0].replace("data:", "")
    content_bytes = base64.b64decode(b64)
    binary_res = {
        "resourceType": "Binary",
        "id": bin_id,
        "contentType": content_type,
        "data": base64.b64encode(content_bytes).decode(),
    }
    # fhir_repo.save(binary_res)  # abstract helper – inserts/updates JSONB row


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────
@router.get("", response_model=ProfileDTO)
async def get_profile(current: ReceptionistUser = Depends(get_current_receptionist)):
    # prac = fhir_repo.get("Practitioner", current.practitioner_id)
    prac = None  # Placeholder for FHIR repository
    if not prac:
        raise HTTPException(500, "Practitioner resource missing")
    
    # Extract name
    name_obj = prac.get("name", [{}])[0] if prac else {}
    given = name_obj.get("given", [])
    family = name_obj.get("family", "")
    full_name = f"{' '.join(given)} {family}".strip()
    
    # Extract contact info
    telecom = prac.get("telecom", []) if prac else []
    phone = next((t["value"] for t in telecom if t["system"] == "phone"), None)
    email = next((t["value"] for t in telecom if t["system"] == "email"), None)
    
    # Get photo if available
    photo_url = None
    photo_ref = prac.get("photo", [{}])[0].get("url") if prac else None
    if photo_ref and photo_ref.startswith("Binary/"):
        bin_id = photo_ref.split("/", 1)[1]
        # bin_res = fhir_repo.get("Binary", bin_id)
        bin_res = None  # Placeholder for FHIR repository
        if bin_res:
            data_url = f"data:{bin_res['contentType']};base64,{bin_res['data']}"
            photo_url = data_url
    
    return ProfileDTO(
        personalInfo=PersonalInfo(
            firstName=name_obj.get("given", [""])[0],
            lastName=family,
            email=email,
            phone=phone,
            address=prac.get("address", [{}])[0].get("text"),
            city=prac.get("address", [{}])[0].get("city"),
            state=prac.get("address", [{}])[0].get("state"),
            zipCode=prac.get("address", [{}])[0].get("postalCode"),
            birthDate=prac.get("birthDate"),
            employeeId=prac["identifier"][0]["value"],
            department=current.department or "Reception",
            startDate=current.start_date,
            emergencyContact=prac.get("extension", [{}])[0].get("valueJson", {}).get("emergencyContact"),
            emergencyPhone=prac.get("extension", [{}])[0].get("valueJson", {}).get("emergencyPhone"),
        ),
        notifications=NotificationPrefs(**prac.get("extension", [{}])[0].get("valueJson", {}).get("notifications", {})),
        systemPrefs=SystemPrefs(**prac.get("extension", [{}])[0].get("valueJson", {}).get("systemPrefs", {})),
        profileImage=photo_url,
        lastUpdated=prac["meta"].get("lastUpdated"),
    )


@router.put("", response_model=ProfileDTO, status_code=status.HTTP_200_OK)
async def update_profile(
    payload: ProfileDTO = Body(...),
    current: ReceptionistUser = Depends(get_current_receptionist),
):
    practitioner = _build_practitioner(current, payload)
    # fhir_repo.save(practitioner)
    return payload


class PasswordChange(BaseModel):
    currentPassword: str
    newPassword: str
    confirmPassword: str


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    data: PasswordChange,
    current: ReceptionistUser = Depends(get_current_receptionist),
):
    if data.newPassword != data.confirmPassword:
        raise HTTPException(400, "Passwords do not match")
    # demo: verify currentPassword matches stored hash (omitted)
    # user_repo.update_password(current.user_id, hash(data.newPassword))
    return None
