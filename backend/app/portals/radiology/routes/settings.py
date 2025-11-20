"""Radiology settings routes backing the RadiologySettingsModule front-end."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, status, Response
from pydantic import BaseModel, EmailStr, Field

from app.common.auth.auth_service import AuthenticatedUser, require_radiologist_access
from app.portals.radiology.schemas.settings import (
    OperatingHours,
    GeneralSettings,
    SystemMaintenance,
    PasswordPolicy,
    SystemSettings,
    CriticalAlertsSettings,
    ReportDeliverySettings,
    SystemAlertsSettings,
    NotificationSettings,
    ModalityFlags,
    Modality,
    EquipmentAlertThresholds,
    DefaultEquipmentSettings,
    EquipmentSettings,
    UserRole,
    AccountSettings,
    UserSettings,
    PACSSettings,
    RISSettings,
    HL7Settings,
    DICOMSettings,
    IntegrationSettings,
    RadiologySettingsEnvelope,
    OperatingHoursUpdate,
    GeneralSettingsUpdate,
    SystemMaintenanceUpdate,
    PasswordPolicyUpdate,
    SystemSettingsUpdate,
    CriticalAlertsUpdate,
    ReportDeliveryUpdate,
    SystemAlertsUpdate,
    NotificationSettingsUpdate,
    ModalityFlagsUpdate,
    ModalityUpdate,
    EquipmentAlertThresholdsUpdate,
    DefaultEquipmentSettingsUpdate,
    EquipmentSettingsUpdate,
    AccountSettingsUpdate,
    UserSettingsUpdate,
    PACSSettingsUpdate,
    RISSettingsUpdate,
    HL7SettingsUpdate,
    DICOMSettingsUpdate,
    IntegrationSettingsUpdate,
    RadiologySettingsUpdate,
    ModalityCreate,
)
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.admin import admin

router = APIRouter(prefix="/settings", tags=["Radiology Settings"])

CONFIG_KEY = "radiology.settings.global"


def _utc_now_iso() -> str:
    """Return current UTC timestamp in ISO-8601 format."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _build_default_envelope() -> RadiologySettingsEnvelope:
    # Provide the same defaults as before
    general = GeneralSettings(
        departmentName="Diagnostic Radiology Department",
        departmentCode="RAD-001",
        address="123 Medical Center Drive, New York, NY 10001",
        phone="+1 (555) 123-4567",
        email="radiology@hospitalcenter.com",
        website="www.hospitalcenter.com/radiology",
        timezone="America/New_York",
        dateFormat="MM/DD/YYYY",
        timeFormat="12-hour",
        language="en",
        currency="USD",
        operatingHours=OperatingHours(
            start="06:00",
            end="22:00",
            days=["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
        ),
    )
    system = SystemSettings(
        autoBackup=True,
        backupFrequency="daily",
        backupRetention=90,
        systemMaintenance=SystemMaintenance(enabled=True, time="02:00", day="sunday"),
        sessionTimeout=45,
        maxLoginAttempts=3,
        passwordPolicy=PasswordPolicy(
            minLength=12,
            requireUppercase=True,
            requireNumbers=True,
            requireSpecialChars=True,
            expiryDays=60,
        ),
        auditLogging=True,
        errorReporting=True,
    )
    notifications = NotificationSettings(
        emailNotifications=True,
        smsNotifications=True,
        pushNotifications=True,
        criticalAlerts=CriticalAlertsSettings(
            enabled=True,
            methods=["email", "sms", "push"],
            recipients=["radiologist@hospitalcenter.com", "supervisor@hospitalcenter.com"],
        ),
        reportDelivery=ReportDeliverySettings(enabled=True, schedule="immediate", day="daily", time="realtime"),
        systemAlerts=SystemAlertsSettings(pacsDowntime=True, modalityOffline=True, diskSpaceLow=True, qcFailures=True),
    )
    equipment = EquipmentSettings(
        modalities=[
            Modality(
                id="CT-001",
                name="Siemens SOMATOM Force",
                type="CT",
                status="active",
                location="CT Suite 1",
                calibrationDue="2025-07-15",
                maintenanceDue="2025-08-01",
                settings=ModalityFlags(autoSend=True, qualityControl="daily", dataBackup=True),
            ),
            Modality(
                id="MRI-001",
                name="GE Signa Premier",
                type="MRI",
                status="active",
                location="MRI Suite 1",
                calibrationDue="2025-07-20",
                maintenanceDue="2025-07-30",
                settings=ModalityFlags(autoSend=True, qualityControl="daily", dataBackup=True),
            ),
            Modality(
                id="XR-001",
                name="Philips DigitalDiagnost C90",
                type="XR",
                status="maintenance",
                location="X-Ray Room 1",
                calibrationDue="2025-06-30",
                maintenanceDue="2025-06-29",
                settings=ModalityFlags(autoSend=False, qualityControl="weekly", dataBackup=True),
            ),
        ],
        defaultSettings=DefaultEquipmentSettings(
            calibrationInterval=90,
            maintenanceInterval=180,
            qualityControlFrequency="daily",
            alertThresholds=EquipmentAlertThresholds(diskSpaceLow=15, temperatureHigh=75, networkLatency=500),
        ),
    )
    user_settings = UserSettings(
        defaultRole="radiologist",
        autoApproval=False,
        userRoles=[
            UserRole(id="admin", name="System Administrator", permissions=["all"], description="Full system access and configuration"),
            UserRole(id="chief", name="Chief Radiologist", permissions=["manage_users", "view_reports", "manage_worklist", "critical_findings"], description="Departmental oversight and management"),
            UserRole(id="radiologist", name="Staff Radiologist", permissions=["read_studies", "create_reports", "view_worklist"], description="Standard radiologist access"),
            UserRole(id="tech", name="Radiology Technologist", permissions=["operate_modalities", "view_worklist"], description="Technical operation access"),
        ],
        accountSettings=AccountSettings(passwordExpiry=60, lockoutDuration=30, inactivityTimeout=45),
    )
    integrations = IntegrationSettings(
        pacs=PACSSettings(enabled=True, endpoint="https://pacs.hospitalcenter.com/api", vendor="Philips IntelliSpace", syncFrequency="realtime"),
        ris=RISSettings(enabled=True, provider="Epic Radiant", endpoint="https://ris.hospitalcenter.com/api/v1", apiKey="******"),
        hl7=HL7Settings(enabled=True, provider="HL7 Interface", autoSync=True, version="2.5.1"),
        dicom=DICOMSettings(provider="DICOM Gateway", endpoint="https://dicom.hospitalcenter.com", compression=True, archiving="cloud"),
    )
    return RadiologySettingsEnvelope(
        generalSettings=general,
        systemSettings=system,
        notificationSettings=notifications,
        equipmentSettings=equipment,
        userSettings=user_settings,
        integrationSettings=integrations,
        lastUpdated=_utc_now_iso(),
    )


def _load_envelope(db: Session) -> RadiologySettingsEnvelope:
    data = admin.get_config_json(db, CONFIG_KEY)
    if not data:
        return _build_default_envelope()
    # Pydantic will validate/parse incoming dict
    return RadiologySettingsEnvelope(**data)


def _save_envelope(db: Session, env: RadiologySettingsEnvelope, user_id: Optional[str]) -> RadiologySettingsEnvelope:
    admin.set_config_json(
        db,
        key=CONFIG_KEY,
        value=env.dict(),
        category="settings",
        is_global=True,
        updated_by=user_id,
        description="Radiology settings bundle",
    )
    return env


@router.get("", response_model=RadiologySettingsEnvelope)
async def get_radiology_settings(
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> RadiologySettingsEnvelope:
    return _load_envelope(db)


@router.put("", response_model=RadiologySettingsEnvelope)
async def replace_radiology_settings(
    payload: RadiologySettingsEnvelope = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> RadiologySettingsEnvelope:
    env = payload.copy(deep=True)
    env.lastUpdated = _utc_now_iso()
    return _save_envelope(db, env, getattr(current_user, "user_id", None))


@router.patch("", response_model=RadiologySettingsEnvelope)
async def patch_radiology_settings(
    payload: RadiologySettingsUpdate = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> RadiologySettingsEnvelope:
    env = _load_envelope(db)
    if payload.generalSettings:
        env.generalSettings = env.generalSettings.copy(update=payload.generalSettings.dict(exclude_none=True), deep=True)
    if payload.systemSettings:
        env.systemSettings = env.systemSettings.copy(update=payload.systemSettings.dict(exclude_none=True), deep=True)
    if payload.notificationSettings:
        env.notificationSettings = env.notificationSettings.copy(update=payload.notificationSettings.dict(exclude_none=True), deep=True)
    if payload.equipmentSettings:
        # handle nested defaultSettings.alertThresholds merges
        updates = payload.equipmentSettings.dict(exclude_none=True)
        if "defaultSettings" in updates:
            ds_updates = updates["defaultSettings"]
            if "alertThresholds" in ds_updates:
                ds_updates["alertThresholds"] = env.equipmentSettings.defaultSettings.alertThresholds.copy(update=ds_updates["alertThresholds"], deep=True)
            updates["defaultSettings"] = env.equipmentSettings.defaultSettings.copy(update=ds_updates, deep=True)
        env.equipmentSettings = env.equipmentSettings.copy(update=updates, deep=True)
    if payload.userSettings:
        env.userSettings = env.userSettings.copy(update=payload.userSettings.dict(exclude_none=True), deep=True)
    if payload.integrationSettings:
        integ_updates = payload.integrationSettings.dict(exclude_none=True)
        for key in ["pacs", "ris", "hl7", "dicom"]:
            if key in integ_updates:
                current = getattr(env.integrationSettings, key)
                integ_updates[key] = current.copy(update=integ_updates[key], deep=True)
        env.integrationSettings = env.integrationSettings.copy(update=integ_updates, deep=True)

    env.lastUpdated = _utc_now_iso()
    return _save_envelope(db, env, getattr(current_user, "user_id", None))


@router.get("/general", response_model=GeneralSettings)
async def get_general_settings(
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> GeneralSettings:
    return _load_envelope(db).generalSettings


@router.put("/general", response_model=GeneralSettings)
async def replace_general_settings(
    payload: GeneralSettings = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> GeneralSettings:
    env = _load_envelope(db)
    env.generalSettings = payload.copy(deep=True)
    env.lastUpdated = _utc_now_iso()
    _save_envelope(db, env, getattr(current_user, "user_id", None))
    return env.generalSettings


@router.patch("/general", response_model=GeneralSettings)
async def patch_general_settings(
    payload: GeneralSettingsUpdate = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> GeneralSettings:
    env = _load_envelope(db)
    env.generalSettings = env.generalSettings.copy(update=payload.dict(exclude_none=True), deep=True)
    env.lastUpdated = _utc_now_iso()
    _save_envelope(db, env, getattr(current_user, "user_id", None))
    return env.generalSettings


@router.get("/system", response_model=SystemSettings)
async def get_system_settings(
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SystemSettings:
    return _load_envelope(db).systemSettings


@router.put("/system", response_model=SystemSettings)
async def replace_system_settings(
    payload: SystemSettings = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SystemSettings:
    env = _load_envelope(db)
    env.systemSettings = payload.copy(deep=True)
    env.lastUpdated = _utc_now_iso()
    _save_envelope(db, env, getattr(current_user, "user_id", None))
    return env.systemSettings


@router.patch("/system", response_model=SystemSettings)
async def patch_system_settings(
    payload: SystemSettingsUpdate = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SystemSettings:
    env = _load_envelope(db)
    env.systemSettings = env.systemSettings.copy(update=payload.dict(exclude_none=True), deep=True)
    env.lastUpdated = _utc_now_iso()
    _save_envelope(db, env, getattr(current_user, "user_id", None))
    return env.systemSettings


@router.get("/notifications", response_model=NotificationSettings)
async def get_notification_settings(
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> NotificationSettings:
    return _load_envelope(db).notificationSettings


@router.put("/notifications", response_model=NotificationSettings)
async def replace_notification_settings(
    payload: NotificationSettings = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> NotificationSettings:
    env = _load_envelope(db)
    env.notificationSettings = payload.copy(deep=True)
    env.lastUpdated = _utc_now_iso()
    _save_envelope(db, env, getattr(current_user, "user_id", None))
    return env.notificationSettings


@router.patch("/notifications", response_model=NotificationSettings)
async def patch_notification_settings(
    payload: NotificationSettingsUpdate = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> NotificationSettings:
    env = _load_envelope(db)
    env.notificationSettings = env.notificationSettings.copy(update=payload.dict(exclude_none=True), deep=True)
    env.lastUpdated = _utc_now_iso()
    _save_envelope(db, env, getattr(current_user, "user_id", None))
    return env.notificationSettings


@router.get("/equipment", response_model=EquipmentSettings)
async def get_equipment_settings(
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> EquipmentSettings:
    return _load_envelope(db).equipmentSettings


@router.put("/equipment", response_model=EquipmentSettings)
async def replace_equipment_settings(
    payload: EquipmentSettings = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> EquipmentSettings:
    env = _load_envelope(db)
    env.equipmentSettings = payload.copy(deep=True)
    env.lastUpdated = _utc_now_iso()
    _save_envelope(db, env, getattr(current_user, "user_id", None))
    return env.equipmentSettings


@router.patch("/equipment", response_model=EquipmentSettings)
async def patch_equipment_settings(
    payload: EquipmentSettingsUpdate = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> EquipmentSettings:
    env = _load_envelope(db)
    updates = payload.dict(exclude_none=True)
    if "defaultSettings" in updates:
        ds_updates = updates["defaultSettings"]
        if "alertThresholds" in ds_updates:
            ds_updates["alertThresholds"] = env.equipmentSettings.defaultSettings.alertThresholds.copy(update=ds_updates["alertThresholds"], deep=True)
        updates["defaultSettings"] = env.equipmentSettings.defaultSettings.copy(update=ds_updates, deep=True)
    env.equipmentSettings = env.equipmentSettings.copy(update=updates, deep=True)
    env.lastUpdated = _utc_now_iso()
    _save_envelope(db, env, getattr(current_user, "user_id", None))
    return env.equipmentSettings


@router.post("/equipment/modalities", response_model=Modality, status_code=status.HTTP_201_CREATED)
async def add_modality(
    payload: ModalityCreate = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> Modality:
    env = _load_envelope(db)
    if any(m.id == payload.id for m in env.equipmentSettings.modalities):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Modality with id '{payload.id}' already exists")
    modality = Modality(**payload.dict())
    env.equipmentSettings.modalities.append(modality)
    env.lastUpdated = _utc_now_iso()
    _save_envelope(db, env, getattr(current_user, "user_id", None))
    return modality.copy(deep=True)


@router.put("/equipment/modalities/{modality_id}", response_model=Modality)
async def replace_modality(
    modality_id: str,
    payload: ModalityCreate = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> Modality:
    env = _load_envelope(db)
    existing = next((m for m in env.equipmentSettings.modalities if m.id == modality_id), None)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modality not found")
    replacement = Modality(**payload.dict())
    idx = env.equipmentSettings.modalities.index(existing)
    env.equipmentSettings.modalities[idx] = replacement
    env.lastUpdated = _utc_now_iso()
    _save_envelope(db, env, getattr(current_user, "user_id", None))
    return replacement.copy(deep=True)


@router.patch("/equipment/modalities/{modality_id}", response_model=Modality)
async def patch_modality(
    modality_id: str,
    payload: ModalityUpdate = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> Modality:
    env = _load_envelope(db)
    existing = next((m for m in env.equipmentSettings.modalities if m.id == modality_id), None)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modality not found")
    updates = payload.dict(exclude_none=True)
    if "settings" in updates:
        updates["settings"] = existing.settings.copy(update=updates["settings"], deep=True)
    updated = existing.copy(update=updates)
    idx = env.equipmentSettings.modalities.index(existing)
    env.equipmentSettings.modalities[idx] = updated
    env.lastUpdated = _utc_now_iso()
    _save_envelope(db, env, getattr(current_user, "user_id", None))
    return updated.copy(deep=True)


@router.delete(
    "/equipment/modalities/{modality_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_modality(
    modality_id: str,
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> Response:
    env = _load_envelope(db)
    existing = next((m for m in env.equipmentSettings.modalities if m.id == modality_id), None)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Modality not found")
    env.equipmentSettings.modalities.remove(existing)
    env.lastUpdated = _utc_now_iso()
    _save_envelope(db, env, getattr(current_user, "user_id", None))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/users", response_model=UserSettings)
async def get_user_settings(
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> UserSettings:
    return _load_envelope(db).userSettings


@router.put("/users", response_model=UserSettings)
async def replace_user_settings(
    payload: UserSettings = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> UserSettings:
    env = _load_envelope(db)
    env.userSettings = payload.copy(deep=True)
    env.lastUpdated = _utc_now_iso()
    _save_envelope(db, env, getattr(current_user, "user_id", None))
    return env.userSettings


@router.patch("/users", response_model=UserSettings)
async def patch_user_settings(
    payload: UserSettingsUpdate = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> UserSettings:
    env = _load_envelope(db)
    env.userSettings = env.userSettings.copy(update=payload.dict(exclude_none=True), deep=True)
    env.lastUpdated = _utc_now_iso()
    _save_envelope(db, env, getattr(current_user, "user_id", None))
    return env.userSettings


@router.get("/integrations", response_model=IntegrationSettings)
async def get_integration_settings(
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> IntegrationSettings:
    return _load_envelope(db).integrationSettings


@router.put("/integrations", response_model=IntegrationSettings)
async def replace_integration_settings(
    payload: IntegrationSettings = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> IntegrationSettings:
    env = _load_envelope(db)
    env.integrationSettings = payload.copy(deep=True)
    env.lastUpdated = _utc_now_iso()
    _save_envelope(db, env, getattr(current_user, "user_id", None))
    return env.integrationSettings


@router.patch("/integrations", response_model=IntegrationSettings)
async def patch_integration_settings(
    payload: IntegrationSettingsUpdate = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> IntegrationSettings:
    env = _load_envelope(db)
    integ_updates = payload.dict(exclude_none=True)
    for key in ["pacs", "ris", "hl7", "dicom"]:
        if key in integ_updates:
            current = getattr(env.integrationSettings, key)
            integ_updates[key] = current.copy(update=integ_updates[key], deep=True)
    env.integrationSettings = env.integrationSettings.copy(update=integ_updates, deep=True)
    env.lastUpdated = _utc_now_iso()
    _save_envelope(db, env, getattr(current_user, "user_id", None))
    return env.integrationSettings
