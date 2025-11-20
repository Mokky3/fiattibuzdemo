# portals/reception/routes/settings.py
"""Reception Settings API – FHIR‑backed implementation
------------------------------------------------------
Exposes the data required by **ReceptionSettings.jsx** while persisting everything
as FHIR resources.  The goal is to keep the front‑end JSON exactly as it expects
but store a normalised copy in a FHIR repository so the rest of the ecosystem
stays interoperable.

FHIR mapping
============
* **General clinic information**  – [`Organization`](https://hl7.org/fhir/organization.html)
  * `id`:  hard‑coded to `clinic` (singleton)
  * `name`, `telecom`, `address`
  * `extension[workingHours]` –  custom extension holding opening times
* **System / backup / runtime settings** – `Basic` resource coded with
  `code = {system: "http://terminology.hl7.org/CodeSystem/basic-resource-type", code: "config"}`.
* **Notification settings** – `Basic` resource with
  `code = {system: "urn:ietf:rfc:3986", code: "notification-settings"}`.
* **Integrations** – `Endpoint` resources ( keyed by type e.g. `email`, `sms` ).
* **Users** – already handled in auth service / Practitioner resources, so here we
  only return them – no persistence.

At runtime we keep an in‑memory cache (`_CACHE`) to avoid hitting the store on
every GET.  In prod you would back this with a DB or FHIR server.
"""

from __future__ import annotations

from typing import List, Literal, Annotated
from datetime import time
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Body, status
from app.common.auth.auth_service import (
    AuthenticatedUser, require_receptionist_access, require_permission, Permission,
)
from pydantic import BaseModel, Field, EmailStr, constr

# ---------------------------------------------------------------------------
# Dependencies – use DB-backed FHIR repository
# ---------------------------------------------------------------------------

# Auth is enforced via dependencies below

from app.services.fhir_repository import fhir_repo

# ---------------------------------------------------------------------------
# Pydantic models returned to / expected from the UI
# ---------------------------------------------------------------------------

class WorkingHours(BaseModel):
    start: constr(pattern=r"^\d{2}:\d{2}$")
    end: constr(pattern=r"^\d{2}:\d{2}$")
    days: List[Literal[
        "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
    ]]

class GeneralSettings(BaseModel):
    clinicName: str
    address: str
    phone: str
    email: EmailStr
    website: str | None = None
    timezone: str
    language: str
    currency: str
    dateFormat: str
    timeFormat: Literal["12", "24"]
    workingHours: WorkingHours

class SystemSettings(BaseModel):
    autoBackup: bool
    backupFrequency: Literal["hourly", "daily", "weekly", "monthly"]
    dataRetention: str  # e.g. "7years"
    maintenanceMode: bool
    debugMode: bool
    allowRemoteAccess: bool
    sessionTimeout: int
    maxLoginAttempts: int
    enableAuditLog: bool
    autoUpdates: bool

class NotificationSettings(BaseModel):
    emailNotifications: bool
    smsNotifications: bool
    appointmentReminders: bool
    systemAlerts: bool
    emergencyNotifications: bool
    marketingEmails: bool
    reminderTime: int
    escalationTime: int

class IntegrationSettings(BaseModel):
    emailServer: str
    emailPort: str
    emailSecurity: Literal["none", "tls", "ssl"]
    smsProvider: str
    paymentGateway: str
    insuranceApi: Literal["enabled", "disabled"]
    labIntegration: Literal["enabled", "disabled"]
    pharmacyIntegration: Literal["enabled", "disabled"]

class SettingsBundle(BaseModel):
    general: GeneralSettings
    system: SystemSettings
    notifications: NotificationSettings
    integrations: IntegrationSettings

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(tags=["Reception · Settings"])

_CACHE: SettingsBundle | None = None  # lazy‑load & persist

# ---------- helpers ---------------------------------------------------------

def _clinic_org_from_general(g: GeneralSettings) -> dict:
    """Convert GeneralSettings → FHIR Organization."""
    org_id = "clinic"
    return {
        "resourceType": "Organization",
        "id": org_id,
        "name": g.clinicName,
        "telecom": [
            {"system": "phone", "value": g.phone},
            {"system": "email", "value": g.email},
            *( [{"system": "url", "value": g.website}] if g.website else [] ),
        ],
        "address": [{"text": g.address}],
        "extension": [
            {
                "url": "http://fiattib.com/fhir/StructureDefinition/workingHours",
                "extension": [
                    {"url": "start", "valueTime": g.workingHours.start},
                    {"url": "end", "valueTime": g.workingHours.end},
                    {"url": "days", "valueCode": ",".join(g.workingHours.days)},
                ],
            }
        ],
    }

def _basic_resource(id_: str, code: str, content: dict) -> dict:
    return {
        "resourceType": "Basic",
        "id": id_,
        "code": {
            "system": "urn:ietf:rfc:3986",
            "code": code,
        },
        "extension": [
            {
                "url": "http://fiattib.com/fhir/StructureDefinition/json",
                "valueString": content.json(),
            }
        ],
    }

# ---------- endpoints -------------------------------------------------------

@router.get("", response_model=SettingsBundle)
async def get_settings(
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
):
    """Return all settings in a single payload."""
    global _CACHE  # noqa: PLW0603
    if _CACHE:
        return _CACHE

    # First request – build from repo or defaults
    org = fhir_repo.get("Organization", "clinic") or _clinic_org_from_general(
        GeneralSettings(
            clinicName="FIATTIB Medical Center",
            address="123 Healthcare Avenue, Medical City, HC 12345",
            phone="+1 (555) 123‑4567",
            email="info@fiattib.com",
            website="www.fiattib.com",
            timezone="America/New_York",
            language="en",
            currency="USD",
            dateFormat="MM/DD/YYYY",
            timeFormat="12",
            workingHours=WorkingHours(start="08:00", end="18:00", days=["monday", "tuesday", "wednesday", "thursday", "friday"]),
        )
    )
    general = GeneralSettings(
        clinicName=org["name"],
        address=org["address"][0]["text"],
        phone=next(t["value"] for t in org["telecom"] if t["system"] == "phone"),
        email=next(t["value"] for t in org["telecom"] if t["system"] == "email"),
        website=next((t["value"] for t in org["telecom"] if t["system"] == "url"), None),
        timezone="America/New_York",
        language="en",
        currency="USD",
        dateFormat="MM/DD/YYYY",
        timeFormat="12",
        workingHours=WorkingHours(start="08:00", end="18:00", days=["monday", "tuesday", "wednesday", "thursday", "friday"]),
    )

    # The rest – try repo, else defaults
    systemSettings_defaults = SystemSettings(
        autoBackup=True,
        backupFrequency="daily",
        dataRetention="7years",
        maintenanceMode=False,
        debugMode=False,
        allowRemoteAccess=True,
        sessionTimeout=30,
        maxLoginAttempts=5,
        enableAuditLog=True,
        autoUpdates=False,
    )
    sys_basic = fhir_repo.get("Basic", "system-config") or _basic_resource("system-config", "config", systemSettings_defaults.model_dump())
    system = SystemSettings.model_validate_json(sys_basic["extension"][0]["valueString"])

    notificationSettings_defaults = NotificationSettings(
        emailNotifications=True,
        smsNotifications=False,
        appointmentReminders=True,
        systemAlerts=True,
        emergencyNotifications=True,
        marketingEmails=False,
        reminderTime=24,
        escalationTime=60,
    )
    notif_basic = fhir_repo.get("Basic", "notification-settings") or _basic_resource("notification-settings", "notification-settings", notificationSettings_defaults.model_dump())
    notifications = NotificationSettings.model_validate_json(notif_basic["extension"][0]["valueString"])

    integrationSettings_defaults = IntegrationSettings(
        emailServer="smtp.fiattib.com",
        emailPort="587",
        emailSecurity="tls",
        smsProvider="twilio",
        paymentGateway="stripe",
        insuranceApi="enabled",
        labIntegration="enabled",
        pharmacyIntegration="disabled",
    )
    integrations_basic = fhir_repo.get("Basic", "integration-settings") or _basic_resource("integration-settings", "integrations", integrationSettings_defaults.model_dump())
    integrations = IntegrationSettings.model_validate_json(integrations_basic["extension"][0]["valueString"])

    _CACHE = SettingsBundle(
        general=general,
        system=system,
        notifications=notifications,
        integrations=integrations,
    )
    return _CACHE

@router.put("", response_model=SettingsBundle, status_code=status.HTTP_200_OK)
async def save_settings(
    payload: SettingsBundle = Body(...),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
):
    """Persist settings – creates/updates FHIR resources then returns the payload."""
    # General → Organization
    org = _clinic_org_from_general(payload.general)
    fhir_repo.save(org)

    # System / notifications / integrations → Basic resources
    fhir_repo.save(_basic_resource("system-config", "config", payload.system))
    fhir_repo.save(_basic_resource("notification-settings", "notification-settings", payload.notifications))
    fhir_repo.save(_basic_resource("integration-settings", "integrations", payload.integrations))

    global _CACHE  # noqa: PLW0603
    _CACHE = payload
    return payload