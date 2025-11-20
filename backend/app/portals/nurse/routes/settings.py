"""Nurse settings routes mirroring the NurseSettingsModule UI."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Body, Depends

from app.common.auth.auth_service import AuthenticatedUser, require_nurse_access
from app.common.schemas.responses_enhanced import SuccessResponse
from app.portals.nurse.schemas.settings import (
    NurseSettingsBundle,
    NurseSettingsEnvelope,
    NurseNotificationSettings,
    NurseDisplaySettings,
    NurseSecuritySettings,
    NurseWorkflowSettings,
    NurseRegionalSettings,
    NurseDataSettings,
    NurseNotificationSettingsPatch,
    NurseDisplaySettingsPatch,
    NurseSecuritySettingsPatch,
    NurseWorkflowSettingsPatch,
    NurseRegionalSettingsPatch,
    NurseDataSettingsPatch,
    NurseSettingsPatchRequest,
    NotificationEmailSettings,
    NotificationPushSettings,
    NotificationSoundSettings,
    NotificationScheduleSettings,
)

router = APIRouter(prefix="/settings", tags=["Nurse Settings"])


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# ======================
# In-memory storage
# ======================

_SETTINGS = NurseSettingsBundle(
    notifications=NurseNotificationSettings(
        email=NotificationEmailSettings(
            taskReminders=True,
            shiftAlerts=True,
            medicationDue=True,
            patientUpdates=False,
            systemUpdates=True,
            emergencyAlerts=True,
        ),
        push=NotificationPushSettings(
            taskReminders=True,
            shiftAlerts=True,
            medicationDue=True,
            patientUpdates=True,
            systemUpdates=False,
            emergencyAlerts=True,
        ),
        sound=NotificationSoundSettings(
            enableSounds=True,
            volume=70,
            emergencyTone=True,
            keyboardSounds=False,
        ),
        schedule=NotificationScheduleSettings(
            quietHours=True,
            quietStart="22:00",
            quietEnd="07:00",
            weekendMode=False,
        ),
    ),
    display=NurseDisplaySettings(
        theme="light",
        colorScheme="default",
        fontSize="medium",
        compactMode=False,
        animations=True,
        highContrast=False,
    ),
    security=NurseSecuritySettings(
        sessionTimeout=30,
        twoFactorAuth=False,
        biometricLogin=False,
        loginHistory=True,
        deviceTrust=True,
        dataEncryption=True,
    ),
    workflow=NurseWorkflowSettings(
        defaultView="table",
        autoRefresh=True,
        refreshInterval=5,
        confirmActions=True,
        quickActions=True,
        keyboardShortcuts=True,
        autoSave=True,
        taskGrouping="priority",
    ),
    regional=NurseRegionalSettings(
        timezone="UTC+5",
        language="en",
        dateFormat="MM/DD/YYYY",
        timeFormat="12h",
        currency="USD",
        temperatureUnit="celsius",
        measurementSystem="metric",
    ),
    data=NurseDataSettings(
        autoBackup=True,
        backupFrequency="daily",
        dataRetention="90days",
        exportFormat="csv",
        syncSettings=True,
    ),
)

_LAST_UPDATED = _utc_now_iso()


def _touch() -> None:
    global _LAST_UPDATED
    _LAST_UPDATED = _utc_now_iso()


def _envelope() -> NurseSettingsEnvelope:
    return NurseSettingsEnvelope(settings=_SETTINGS.copy(deep=True), lastUpdated=_LAST_UPDATED)


# ======================
# Routes
# ======================


@router.get("", response_model=SuccessResponse[NurseSettingsEnvelope])
async def get_settings(
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
) -> SuccessResponse:
    return SuccessResponse(data=_envelope(), message="Settings retrieved")


@router.put("", response_model=SuccessResponse[NurseSettingsEnvelope])
async def replace_settings(
    payload: NurseSettingsBundle = Body(...),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
) -> SuccessResponse:
    global _SETTINGS
    _SETTINGS = payload.copy(deep=True)
    _touch()
    return SuccessResponse(data=_envelope(), message="Settings updated")


@router.patch("", response_model=SuccessResponse[NurseSettingsEnvelope])
async def patch_settings(
    payload: NurseSettingsPatchRequest,
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
) -> SuccessResponse:
    global _SETTINGS

    if payload.notifications:
        notif = payload.notifications
        if notif.email:
            _SETTINGS.notifications.email = _SETTINGS.notifications.email.copy(update=notif.email.dict(exclude_none=True))
        if notif.push:
            _SETTINGS.notifications.push = _SETTINGS.notifications.push.copy(update=notif.push.dict(exclude_none=True))
        if notif.sound:
            _SETTINGS.notifications.sound = _SETTINGS.notifications.sound.copy(update=notif.sound.dict(exclude_none=True))
        if notif.schedule:
            _SETTINGS.notifications.schedule = _SETTINGS.notifications.schedule.copy(update=notif.schedule.dict(exclude_none=True))

    if payload.display:
        _SETTINGS.display = _SETTINGS.display.copy(update=payload.display.dict(exclude_none=True))

    if payload.security:
        _SETTINGS.security = _SETTINGS.security.copy(update=payload.security.dict(exclude_none=True))

    if payload.workflow:
        _SETTINGS.workflow = _SETTINGS.workflow.copy(update=payload.workflow.dict(exclude_none=True))

    if payload.regional:
        _SETTINGS.regional = _SETTINGS.regional.copy(update=payload.regional.dict(exclude_none=True))

    if payload.data:
        _SETTINGS.data = _SETTINGS.data.copy(update=payload.data.dict(exclude_none=True))

    _touch()
    return SuccessResponse(data=_envelope(), message="Settings patched")


@router.get("/notifications", response_model=SuccessResponse[NurseNotificationSettings])
async def get_notifications(
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
) -> SuccessResponse:
    return SuccessResponse(data=_SETTINGS.notifications.copy(deep=True))


@router.get("/display", response_model=SuccessResponse[NurseDisplaySettings])
async def get_display_settings(
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
) -> SuccessResponse:
    return SuccessResponse(data=_SETTINGS.display.copy(deep=True))


@router.get("/security", response_model=SuccessResponse[NurseSecuritySettings])
async def get_security_settings(
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
) -> SuccessResponse:
    return SuccessResponse(data=_SETTINGS.security.copy(deep=True))


@router.get("/workflow", response_model=SuccessResponse[NurseWorkflowSettings])
async def get_workflow_settings(
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
) -> SuccessResponse:
    return SuccessResponse(data=_SETTINGS.workflow.copy(deep=True))


@router.get("/regional", response_model=SuccessResponse[NurseRegionalSettings])
async def get_regional_settings(
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
) -> SuccessResponse:
    return SuccessResponse(data=_SETTINGS.regional.copy(deep=True))


@router.get("/data", response_model=SuccessResponse[NurseDataSettings])
async def get_data_settings(
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
) -> SuccessResponse:
    return SuccessResponse(data=_SETTINGS.data.copy(deep=True))
