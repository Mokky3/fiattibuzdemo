# app/routers/patient_settings.py
from __future__ import annotations
from typing import Any, Dict, Optional

import os, httpx, jsonpatch
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

FHIR_BASE   = os.getenv("FHIR_BASE_URL")
FHIR_TOKEN  = os.getenv("FHIR_AUTH_TOKEN")

# ------------------------------------------------------------------------------
#  helpers
# ------------------------------------------------------------------------------
def fhir_headers(user) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {getattr(user,'fhir_token',FHIR_TOKEN)}",
        "Content-Type":  "application/fhir+json"
    }

async def fhir_get(path: str, user, **kw):
    async with httpx.AsyncClient() as client:
        r = await client.get(FHIR_BASE + path, headers=fhir_headers(user), **kw)
    r.raise_for_status()
    return r.json()

async def fhir_put(path: str, body: dict, user, **kw):
    async with httpx.AsyncClient() as client:
        r = await client.put(FHIR_BASE + path, headers=fhir_headers(user), json=body, **kw)
    r.raise_for_status()
    return r.json()

async def fhir_patch(path:str, patch: list[dict], user, **kw):
    hdr = fhir_headers(user)
    hdr["Content-Type"]="application/json-patch+json"
    async with httpx.AsyncClient() as client:
        r = await client.patch(FHIR_BASE+path, headers=hdr, json=patch, **kw)
    r.raise_for_status()
    return r.json()

# ------------------------------------------------------------------------------
#  Schemas (trimmed – extend as needed)
# ------------------------------------------------------------------------------
class Notifications(BaseModel):
    emailNotifications: bool = True
    reminderTiming: str = Field("24hours", pattern=r"\d+hours?")
    _id: Optional[str] = None                     # id of CommunicationRequest on FHIR

class Privacy(BaseModel):
    allowResearch: bool = False
    shareHealthData: bool = True
    _id: Optional[str] = None                     # Consent id

class Preferences(BaseModel):
    language: str = "en"

class SettingsBlob(BaseModel):
    notifications: Optional[Notifications]
    privacy:       Optional[Privacy]
    preferences:   Optional[Preferences]

# ------------------------------------------------------------------------------
#  Dependency that injects authenticated user (stub here)
# ------------------------------------------------------------------------------
class User:
    id: str
    patient_id: str
    fhir_token: Optional[str] = None

async def get_current_user() -> User:
    # Replace with real auth (fastapi-users, authlib, jwt etc.)
    dummy           = User()
    dummy.id        = "user-123"
    dummy.patient_id= "pat-123"
    return dummy

# ------------------------------------------------------------------------------
#  Router
# ------------------------------------------------------------------------------
router = APIRouter()

# GET full settings ------------------------------------------------------------
@router.get("/patient/settings", response_model=SettingsBlob)
async def read_settings(user: User = Depends(get_current_user)):
    pat  = await fhir_get(f"/Patient/{user.patient_id}", user)
    cons = await fhir_get(f"/Consent?patient={user.patient_id}&status=active", user)
    comm = await fhir_get(f"/CommunicationRequest?subject={user.patient_id}&status=active", user)

    return SettingsBlob(
        notifications = Notifications(
            enabled = bool(comm.get("entry")),
            reminderTiming = "24hours",
            _id = comm["entry"][0]["resource"]["id"] if comm.get("entry") else None
        ) if comm else None,
        privacy = Privacy(
            allowResearch = bool(cons.get("entry")),
            _id = cons["entry"][0]["resource"]["id"] if cons.get("entry") else None,
            shareHealthData = True        # demo
        ) if cons else None,
        preferences = Preferences(
            language = pat.get("communication",[{}])[0].get("language",{}).get("coding",[{}])[0].get("code","en")
        )
    )

# PATCH update settings --------------------------------------------------------
@router.patch("/patient/settings", status_code=status.HTTP_204_NO_CONTENT)
async def update_settings(payload: SettingsBlob, user:User = Depends(get_current_user)):
    # Notifications  → CommunicationRequest -----------------
    if payload.notifications:
        cr_id = payload.notifications._id or ""
        body  = {
            "resourceType":"CommunicationRequest",
            "status":"active" if payload.notifications.enabled else "completed",
            "subject":{"reference":f"Patient/{user.patient_id}"},
            "reasonCode":[{"text":"Appointment reminder"}],
            "occurrenceTiming":{
                "repeat":{"boundsDuration":{"value":int(payload.notifications.reminderTiming[:-5]),"unit":"hours"}}
            }
        }
        await fhir_put(f"/CommunicationRequest/{cr_id}" if cr_id else "/CommunicationRequest", body, user)

    # Privacy → Consent -------------------------------------
    if payload.privacy:
        consent_id = payload.privacy._id or ""
        body = {
            "resourceType":"Consent",
            "status":"active" if payload.privacy.allowResearch else "inactive",
            "patient":{"reference":f"Patient/{user.patient_id}"},
            "scope":{"coding":[{"system":"http://terminology.hl7.org/CodeSystem/consentscope","code":"research"}]}
        }
        await fhir_put(f"/Consent/{consent_id}" if consent_id else "/Consent", body, user)

    # Preferences (language) --------------------------------
    if payload.preferences and payload.preferences.language:
        patient = await fhir_get(f"/Patient/{user.patient_id}", user)
        patch   = [{"op":"replace","path":"/communication/0/language/coding/0/code",
                    "value":payload.preferences.language}]
        await fhir_patch(f"/Patient/{user.patient_id}", patch, user,
                         headers={"If-Match": patient["meta"]["versionId"]})

    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT)

# Lightweight security endpoints (non-FHIR) ----------------
@router.post("/security/change-password", status_code=204)
async def change_password(data: dict, user:User=Depends(get_current_user)):
    # supply current / new in `data`; integrate with your auth backend (passlib, sqlalchemy…)
    return

@router.get("/security/sessions")
async def list_sessions(user:User=Depends(get_current_user)):
    return []       # plug into your session store

@router.delete("/security/sessions/{sid}", status_code=204)
async def end_session(sid:str, user:User=Depends(get_current_user)):
    return

# Data-rights helpers via FHIR bulk ops --------------------
@router.get("/Patient/$export")
async def export_patient(user:User=Depends(get_current_user)):
    return await fhir_get("/Patient/$export", user)

@router.post("/Patient/$erase", status_code=202)
async def erase_patient(user:User=Depends(get_current_user)):
    await fhir_post("/Patient/$erase", {}, user)
