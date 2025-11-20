"""Lab settings routes backing the LabSettingsModule front-end."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, status, Response
from pydantic import BaseModel, Field, EmailStr

from app.common.auth.auth_service import AuthenticatedUser, require_lab_technician_access
from app.db.session import SessionLocal
from app.crud.lab_settings import (
    get_lab_settings_by_type, create_lab_settings, update_lab_settings,
    get_equipment_instruments, get_equipment_instrument_by_id,
    create_equipment_instrument, update_equipment_instrument, delete_equipment_instrument
)
from app.portals.lab.schemas.settings import (
    WorkingHours,
    WorkingHoursUpdate,
    LabGeneralSettings,
    LabGeneralSettingsUpdate,
    SystemMaintenance,
    SystemMaintenanceUpdate,
    PasswordPolicy,
    PasswordPolicyUpdate,
    LabSystemSettings,
    LabSystemSettingsUpdate,
    CriticalAlertsSettings,
    CriticalAlertsSettingsUpdate,
    ReportDeliverySettings,
    ReportDeliverySettingsUpdate,
    SystemAlertsSettings,
    SystemAlertsSettingsUpdate,
    LabNotificationSettings,
    LabNotificationSettingsUpdate,
    InstrumentSettings,
    InstrumentSettingsUpdate,
    EquipmentInstrument,
    EquipmentInstrumentCreate,
    EquipmentInstrumentUpdate,
    EquipmentAlertThresholds,
    EquipmentAlertThresholdsUpdate,
    EquipmentDefaultSettings,
    EquipmentDefaultSettingsUpdate,
    LabEquipmentSettings,
    LabEquipmentSettingsUpdate,
    UserRole,
    AccountSettings,
    LabUserSettings,
    IntegrationLISSettings,
    IntegrationBillingSettings,
    IntegrationQCSettings,
    IntegrationBackupSettings,
    LabIntegrationSettings,
    LabSettingsEnvelope,
    LabSettingsUpdateRequest,
    LabSettingsPatchRequest,
)

router = APIRouter(prefix="/settings", tags=["Lab Settings"])


def _utc_now_iso() -> str:
    """Return the current UTC timestamp in ISO-8601 format."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class WorkingHours(BaseModel):
    start: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="Day start time HH:MM")
    end: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="Day end time HH:MM")
    days: List[str] = Field(..., min_items=1, description="Active days of the week")


class WorkingHoursUpdate(BaseModel):
    start: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    end: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    days: Optional[List[str]] = None


class LabGeneralSettings(BaseModel):
    labName: str
    labCode: str
    address: str
    phone: str
    email: EmailStr
    website: str
    timezone: str
    dateFormat: str
    timeFormat: str
    language: str
    currency: str
    workingHours: WorkingHours


class LabGeneralSettingsUpdate(BaseModel):
    labName: Optional[str] = None
    labCode: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    timezone: Optional[str] = None
    dateFormat: Optional[str] = None
    timeFormat: Optional[str] = None
    language: Optional[str] = None
    currency: Optional[str] = None
    workingHours: Optional[WorkingHoursUpdate] = None

    class Config:
        extra = "forbid"


class SystemMaintenance(BaseModel):
    enabled: bool
    time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    day: str


class SystemMaintenanceUpdate(BaseModel):
    enabled: Optional[bool] = None
    time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    day: Optional[str] = None


class PasswordPolicy(BaseModel):
    minLength: int = Field(..., ge=6)
    requireUppercase: bool
    requireNumbers: bool
    requireSpecialChars: bool
    expiryDays: int = Field(..., ge=1)


class PasswordPolicyUpdate(BaseModel):
    minLength: Optional[int] = Field(None, ge=6)
    requireUppercase: Optional[bool] = None
    requireNumbers: Optional[bool] = None
    requireSpecialChars: Optional[bool] = None
    expiryDays: Optional[int] = Field(None, ge=1)


class LabSystemSettings(BaseModel):
    autoBackup: bool
    backupFrequency: str
    backupRetention: int = Field(..., ge=1)
    systemMaintenance: SystemMaintenance
    sessionTimeout: int = Field(..., ge=5, le=480)
    maxLoginAttempts: int = Field(..., ge=1)
    passwordPolicy: PasswordPolicy
    auditLogging: bool
    errorReporting: bool


class LabSystemSettingsUpdate(BaseModel):
    autoBackup: Optional[bool] = None
    backupFrequency: Optional[str] = None
    backupRetention: Optional[int] = Field(None, ge=1)
    systemMaintenance: Optional[SystemMaintenanceUpdate] = None
    sessionTimeout: Optional[int] = Field(None, ge=5, le=480)
    maxLoginAttempts: Optional[int] = Field(None, ge=1)
    passwordPolicy: Optional[PasswordPolicyUpdate] = None
    auditLogging: Optional[bool] = None
    errorReporting: Optional[bool] = None

    class Config:
        extra = "forbid"


class CriticalAlertsSettings(BaseModel):
    enabled: bool
    methods: List[str] = Field(..., min_items=1)
    recipients: List[EmailStr] = Field(..., min_items=1)


class CriticalAlertsSettingsUpdate(BaseModel):
    enabled: Optional[bool] = None
    methods: Optional[List[str]] = None
    recipients: Optional[List[EmailStr]] = None


class ReportDeliverySettings(BaseModel):
    enabled: bool
    schedule: str
    day: str
    time: str = Field(..., pattern=r"^\d{2}:\d{2}$")


class ReportDeliverySettingsUpdate(BaseModel):
    enabled: Optional[bool] = None
    schedule: Optional[str] = None
    day: Optional[str] = None
    time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")


class SystemAlertsSettings(BaseModel):
    downtime: bool
    maintenance: bool
    backupStatus: bool
    lowStorage: bool


class SystemAlertsSettingsUpdate(BaseModel):
    downtime: Optional[bool] = None
    maintenance: Optional[bool] = None
    backupStatus: Optional[bool] = None
    lowStorage: Optional[bool] = None


class LabNotificationSettings(BaseModel):
    emailNotifications: bool
    smsNotifications: bool
    pushNotifications: bool
    criticalAlerts: CriticalAlertsSettings
    reportDelivery: ReportDeliverySettings
    systemAlerts: SystemAlertsSettings


class LabNotificationSettingsUpdate(BaseModel):
    emailNotifications: Optional[bool] = None
    smsNotifications: Optional[bool] = None
    pushNotifications: Optional[bool] = None
    criticalAlerts: Optional[CriticalAlertsSettingsUpdate] = None
    reportDelivery: Optional[ReportDeliverySettingsUpdate] = None
    systemAlerts: Optional[SystemAlertsSettingsUpdate] = None

    class Config:
        extra = "forbid"


class InstrumentSettings(BaseModel):
    autoStart: bool
    qualityControl: str
    dataBackup: bool


class InstrumentSettingsUpdate(BaseModel):
    autoStart: Optional[bool] = None
    qualityControl: Optional[str] = None
    dataBackup: Optional[bool] = None


class EquipmentInstrument(BaseModel):
    id: str
    name: str
    type: str
    status: str
    location: str
    calibrationDue: str
    maintenanceDue: str
    settings: InstrumentSettings


class EquipmentInstrumentCreate(BaseModel):
    id: str
    name: str
    type: str
    status: str
    location: str
    calibrationDue: str
    maintenanceDue: str
    settings: InstrumentSettings


class EquipmentInstrumentUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    location: Optional[str] = None
    calibrationDue: Optional[str] = None
    maintenanceDue: Optional[str] = None
    settings: Optional[InstrumentSettingsUpdate] = None

    class Config:
        extra = "forbid"


class EquipmentAlertThresholds(BaseModel):
    reagentLow: int = Field(..., ge=0, le=100)
    controlOutOfRange: int = Field(..., ge=0)
    instrumentError: str


class EquipmentAlertThresholdsUpdate(BaseModel):
    reagentLow: Optional[int] = Field(None, ge=0, le=100)
    controlOutOfRange: Optional[int] = Field(None, ge=0)
    instrumentError: Optional[str] = None


class EquipmentDefaultSettings(BaseModel):
    calibrationInterval: int = Field(..., ge=1)
    maintenanceInterval: int = Field(..., ge=1)
    qualityControlFrequency: str
    alertThresholds: EquipmentAlertThresholds


class EquipmentDefaultSettingsUpdate(BaseModel):
    calibrationInterval: Optional[int] = Field(None, ge=1)
    maintenanceInterval: Optional[int] = Field(None, ge=1)
    qualityControlFrequency: Optional[str] = None
    alertThresholds: Optional[EquipmentAlertThresholdsUpdate] = None


class LabEquipmentSettings(BaseModel):
    instruments: List[EquipmentInstrument]
    defaultSettings: EquipmentDefaultSettings


class LabEquipmentSettingsUpdate(BaseModel):
    defaultSettings: Optional[EquipmentDefaultSettingsUpdate] = None

    class Config:
        extra = "forbid"


class UserRole(BaseModel):
    id: str
    name: str
    permissions: List[str]
    description: str


class AccountSettings(BaseModel):
    passwordExpiry: int = Field(..., ge=1)
    lockoutDuration: int = Field(..., ge=1)
    inactivityTimeout: int = Field(..., ge=1)


class LabUserSettings(BaseModel):
    defaultRole: str
    autoApproval: bool
    userRoles: List[UserRole]
    accountSettings: AccountSettings


class IntegrationLISSettings(BaseModel):
    enabled: bool
    endpoint: str
    apiKey: str
    syncFrequency: str


class IntegrationBillingSettings(BaseModel):
    enabled: bool
    provider: str
    endpoint: str
    apiKey: str


class IntegrationQCSettings(BaseModel):
    enabled: bool
    provider: str
    autoSync: bool
    alertThreshold: int = Field(..., ge=0)


class IntegrationBackupSettings(BaseModel):
    provider: str
    endpoint: str
    encryption: bool
    frequency: str


class LabIntegrationSettings(BaseModel):
    lis: IntegrationLISSettings
    billing: IntegrationBillingSettings
    qc: IntegrationQCSettings
    backup: IntegrationBackupSettings


class LabSettingsEnvelope(BaseModel):
    generalSettings: LabGeneralSettings
    systemSettings: LabSystemSettings
    notificationSettings: LabNotificationSettings
    equipmentSettings: LabEquipmentSettings
    userSettings: LabUserSettings
    integrationSettings: LabIntegrationSettings
    lastUpdated: str


class LabSettingsUpdateRequest(BaseModel):
    generalSettings: LabGeneralSettings
    systemSettings: LabSystemSettings
    notificationSettings: LabNotificationSettings
    equipmentSettings: LabEquipmentSettings
    userSettings: LabUserSettings
    integrationSettings: LabIntegrationSettings


class LabSettingsPatchRequest(BaseModel):
    generalSettings: Optional[LabGeneralSettingsUpdate] = None
    systemSettings: Optional[LabSystemSettingsUpdate] = None
    notificationSettings: Optional[LabNotificationSettingsUpdate] = None
    equipmentSettings: Optional[LabEquipmentSettingsUpdate] = None

    class Config:
        extra = "forbid"


_GENERAL_SETTINGS = LabGeneralSettings(
    labName="Central Medical Laboratory",
    labCode="CML-001",
    address="123 Medical Center Drive, New York, NY 10001",
    phone="+1 (555) 123-4567",
    email="admin@centralmedlab.com",
    website="www.centralmedlab.com",
    timezone="America/New_York",
    dateFormat="MM/DD/YYYY",
    timeFormat="12-hour",
    language="en",
    currency="USD",
    workingHours=WorkingHours(
        start="08:00",
        end="18:00",
        days=["monday", "tuesday", "wednesday", "thursday", "friday"],
    ),
)

_SYSTEM_SETTINGS = LabSystemSettings(
    autoBackup=True,
    backupFrequency="daily",
    backupRetention=30,
    systemMaintenance=SystemMaintenance(enabled=True, time="02:00", day="sunday"),
    sessionTimeout=30,
    maxLoginAttempts=5,
    passwordPolicy=PasswordPolicy(
        minLength=8,
        requireUppercase=True,
        requireNumbers=True,
        requireSpecialChars=True,
        expiryDays=90,
    ),
    auditLogging=True,
    errorReporting=True,
)

_NOTIFICATION_SETTINGS = LabNotificationSettings(
    emailNotifications=True,
    smsNotifications=False,
    pushNotifications=True,
    criticalAlerts=CriticalAlertsSettings(
        enabled=True,
        methods=["email", "sms", "push"],
        recipients=["admin@centralmedlab.com", "supervisor@centralmedlab.com"],
    ),
    reportDelivery=ReportDeliverySettings(
        enabled=True,
        schedule="weekly",
        day="monday",
        time="09:00",
    ),
    systemAlerts=SystemAlertsSettings(
        downtime=True,
        maintenance=True,
        backupStatus=True,
        lowStorage=True,
    ),
)

_EQUIPMENT_SETTINGS = LabEquipmentSettings(
    instruments=[
        EquipmentInstrument(
            id="INST-001",
            name="Hematology Analyzer XN-1000",
            type="Hematology",
            status="active",
            location="Lab Room A",
            calibrationDue="2025-07-15",
            maintenanceDue="2025-08-01",
            settings=InstrumentSettings(autoStart=True, qualityControl="daily", dataBackup=True),
        ),
        EquipmentInstrument(
            id="INST-002",
            name="Chemistry Analyzer AU-5800",
            type="Chemistry",
            status="active",
            location="Lab Room B",
            calibrationDue="2025-07-20",
            maintenanceDue="2025-07-30",
            settings=InstrumentSettings(autoStart=True, qualityControl="daily", dataBackup=True),
        ),
        EquipmentInstrument(
            id="INST-003",
            name="PCR System 7500",
            type="Molecular",
            status="maintenance",
            location="Lab Room C",
            calibrationDue="2025-06-30",
            maintenanceDue="2025-06-29",
            settings=InstrumentSettings(autoStart=False, qualityControl="weekly", dataBackup=True),
        ),
    ],
    defaultSettings=EquipmentDefaultSettings(
        calibrationInterval=30,
        maintenanceInterval=90,
        qualityControlFrequency="daily",
        alertThresholds=EquipmentAlertThresholds(
            reagentLow=10,
            controlOutOfRange=2,
            instrumentError="immediate",
        ),
    ),
)

_USER_SETTINGS = LabUserSettings(
    defaultRole="technician",
    autoApproval=False,
    userRoles=[
        UserRole(id="admin", name="Administrator", permissions=["all"], description="Full system access"),
        UserRole(
            id="supervisor",
            name="Lab Supervisor",
            permissions=["manage_orders", "manage_results", "manage_reports", "view_all"],
            description="Supervisory access to lab operations",
        ),
        UserRole(
            id="technician",
            name="Lab Technician",
            permissions=["process_orders", "enter_results", "generate_reports"],
            description="Standard technician access",
        ),
        UserRole(
            id="viewer",
            name="Viewer",
            permissions=["view_results", "view_reports"],
            description="Read-only access",
        ),
    ],
    accountSettings=AccountSettings(passwordExpiry=90, lockoutDuration=15, inactivityTimeout=30),
)

_INTEGRATION_SETTINGS = LabIntegrationSettings(
    lis=IntegrationLISSettings(
        enabled=True,
        endpoint="https://api.hospitallis.com/v1",
        apiKey="********",
        syncFrequency="realtime",
    ),
    billing=IntegrationBillingSettings(
        enabled=True,
        provider="MedBill Pro",
        endpoint="https://api.medbillpro.com/v2",
        apiKey="********",
    ),
    qc=IntegrationQCSettings(enabled=True, provider="QC Manager", autoSync=True, alertThreshold=2),
    backup=IntegrationBackupSettings(
        provider="Cloud Backup Pro",
        endpoint="https://backup.cloudpro.com",
        encryption=True,
        frequency="daily",
    ),
)

_LAST_UPDATED = _utc_now_iso()


def _touch() -> None:
    global _LAST_UPDATED
    _LAST_UPDATED = _utc_now_iso()


def _build_envelope() -> LabSettingsEnvelope:
    return LabSettingsEnvelope(
        generalSettings=_GENERAL_SETTINGS.copy(deep=True),
        systemSettings=_SYSTEM_SETTINGS.copy(deep=True),
        notificationSettings=_NOTIFICATION_SETTINGS.copy(deep=True),
        equipmentSettings=_EQUIPMENT_SETTINGS.copy(deep=True),
        userSettings=_USER_SETTINGS.copy(deep=True),
        integrationSettings=_INTEGRATION_SETTINGS.copy(deep=True),
        lastUpdated=_LAST_UPDATED,
    )


def _find_instrument(instrument_id: str) -> Optional[EquipmentInstrument]:
    for instrument in _EQUIPMENT_SETTINGS.instruments:
        if instrument.id == instrument_id:
            return instrument
    return None


@router.get("", response_model=LabSettingsEnvelope)
async def get_settings(
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> LabSettingsEnvelope:
    return _build_envelope()


@router.put("", response_model=LabSettingsEnvelope)
async def replace_settings(
    payload: LabSettingsUpdateRequest = Body(...),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> LabSettingsEnvelope:
    global _GENERAL_SETTINGS, _SYSTEM_SETTINGS, _NOTIFICATION_SETTINGS, _EQUIPMENT_SETTINGS
    global _USER_SETTINGS, _INTEGRATION_SETTINGS

    _GENERAL_SETTINGS = payload.generalSettings.copy(deep=True)
    _SYSTEM_SETTINGS = payload.systemSettings.copy(deep=True)
    _NOTIFICATION_SETTINGS = payload.notificationSettings.copy(deep=True)
    _EQUIPMENT_SETTINGS = payload.equipmentSettings.copy(deep=True)
    _USER_SETTINGS = payload.userSettings.copy(deep=True)
    _INTEGRATION_SETTINGS = payload.integrationSettings.copy(deep=True)
    _touch()
    return _build_envelope()


@router.patch("", response_model=LabSettingsEnvelope)
async def patch_settings(
    payload: LabSettingsPatchRequest = Body(...),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> LabSettingsEnvelope:
    global _GENERAL_SETTINGS, _SYSTEM_SETTINGS, _NOTIFICATION_SETTINGS, _EQUIPMENT_SETTINGS

    if payload.generalSettings:
        updates = payload.generalSettings.dict(exclude_none=True)
        if "workingHours" in updates and updates["workingHours"] is not None:
            working_updates = updates.pop("workingHours")
            _GENERAL_SETTINGS = _GENERAL_SETTINGS.copy(
                update={**updates, "workingHours": _GENERAL_SETTINGS.workingHours.copy(update=working_updates)}
            )
        else:
            _GENERAL_SETTINGS = _GENERAL_SETTINGS.copy(update=updates)

    if payload.systemSettings:
        updates = payload.systemSettings.dict(exclude_none=True)
        if "systemMaintenance" in updates and updates["systemMaintenance"] is not None:
            maintenance_updates = updates.pop("systemMaintenance")
            _SYSTEM_SETTINGS = _SYSTEM_SETTINGS.copy(
                update={**updates, "systemMaintenance": _SYSTEM_SETTINGS.systemMaintenance.copy(update=maintenance_updates)}
            )
        elif "passwordPolicy" in updates and updates["passwordPolicy"] is not None:
            policy_updates = updates.pop("passwordPolicy")
            _SYSTEM_SETTINGS = _SYSTEM_SETTINGS.copy(
                update={**updates, "passwordPolicy": _SYSTEM_SETTINGS.passwordPolicy.copy(update=policy_updates)}
            )
        else:
            _SYSTEM_SETTINGS = _SYSTEM_SETTINGS.copy(update=updates)

    if payload.notificationSettings:
        updates = payload.notificationSettings.dict(exclude_none=True)
        new_values = {}
        for key, value in updates.items():
            if key == "criticalAlerts":
                new_values[key] = _NOTIFICATION_SETTINGS.criticalAlerts.copy(update=value)
            elif key == "reportDelivery":
                new_values[key] = _NOTIFICATION_SETTINGS.reportDelivery.copy(update=value)
            elif key == "systemAlerts":
                new_values[key] = _NOTIFICATION_SETTINGS.systemAlerts.copy(update=value)
            else:
                new_values[key] = value
        _NOTIFICATION_SETTINGS = _NOTIFICATION_SETTINGS.copy(update=new_values)

    if payload.equipmentSettings:
        updates = payload.equipmentSettings.dict(exclude_none=True)
        if "defaultSettings" in updates and updates["defaultSettings"] is not None:
            default_updates = updates["defaultSettings"]
            defaults = _EQUIPMENT_SETTINGS.defaultSettings
            if "alertThresholds" in default_updates and default_updates["alertThresholds"] is not None:
                thresholds = default_updates.pop("alertThresholds")
                defaults = defaults.copy(update={**default_updates, "alertThresholds": defaults.alertThresholds.copy(update=thresholds)})
            else:
                defaults = defaults.copy(update=default_updates)
            _EQUIPMENT_SETTINGS = _EQUIPMENT_SETTINGS.copy(update={"defaultSettings": defaults})

    _touch()
    return _build_envelope()


@router.get("/general", response_model=LabGeneralSettings)
async def get_general_settings(
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> LabGeneralSettings:
    db = SessionLocal()
    try:
        settings = get_lab_settings_by_type(db, "general")
        if settings and settings.settings_data:
            try:
                # Try to validate and return database settings
                return LabGeneralSettings(**settings.settings_data)
            except Exception as e:
                # If validation fails, log and return defaults
                import logging
                logging.warning(f"Invalid general settings data in database: {e}. Returning defaults.")
                return _GENERAL_SETTINGS.copy(deep=True)
        else:
            # Return default settings if none exist in database
            return _GENERAL_SETTINGS.copy(deep=True)
    finally:
        db.close()


@router.put("/general", response_model=LabGeneralSettings)
async def replace_general_settings(
    payload: LabGeneralSettings,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> LabGeneralSettings:
    db = SessionLocal()
    try:
        # Save to database
        update_lab_settings(db, "general", payload.dict(), str(current_user.user_id))
        
        # Also update global variable for backward compatibility
        global _GENERAL_SETTINGS
        _GENERAL_SETTINGS = payload.copy(deep=True)
        _touch()
        
        return _GENERAL_SETTINGS.copy(deep=True)
    finally:
        db.close()


@router.patch("/general", response_model=LabGeneralSettings)
async def patch_general_settings(
    payload: LabGeneralSettingsUpdate,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> LabGeneralSettings:
    global _GENERAL_SETTINGS
    db = SessionLocal()
    try:
        # Get current settings
        current_settings = get_lab_settings_by_type(db, "general")
        if current_settings:
            current_data = current_settings.settings_data
        else:
            current_data = _GENERAL_SETTINGS.dict()
        
        # Apply updates
        updates = payload.dict(exclude_none=True)
        if "workingHours" in updates:
            working_updates = updates.pop("workingHours") or {}
            if "workingHours" in current_data:
                current_data["workingHours"].update(working_updates)
            else:
                current_data["workingHours"] = working_updates
        
        # Update the rest of the data
        current_data.update(updates)
        
        # Save to database
        update_lab_settings(db, "general", current_data, str(current_user.user_id))
        
        # Also update global variable for backward compatibility
        _GENERAL_SETTINGS = LabGeneralSettings(**current_data)
        _touch()
        
        return _GENERAL_SETTINGS.copy(deep=True)
    finally:
        db.close()


@router.get("/system", response_model=LabSystemSettings)
async def get_system_settings(
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> LabSystemSettings:
    db = SessionLocal()
    try:
        settings = get_lab_settings_by_type(db, "system")
        if settings and settings.settings_data:
            try:
                return LabSystemSettings(**settings.settings_data)
            except Exception as e:
                import logging
                logging.warning(f"Invalid system settings data in database: {e}. Returning defaults.")
                return _SYSTEM_SETTINGS.copy(deep=True)
        else:
            return _SYSTEM_SETTINGS.copy(deep=True)
    finally:
        db.close()


@router.put("/system", response_model=LabSystemSettings)
async def replace_system_settings(
    payload: LabSystemSettings,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> LabSystemSettings:
    global _SYSTEM_SETTINGS
    db = SessionLocal()
    try:
        update_lab_settings(db, "system", payload.dict(), str(current_user.user_id))
        
        _SYSTEM_SETTINGS = payload.copy(deep=True)
        _touch()
        
        return _SYSTEM_SETTINGS.copy(deep=True)
    finally:
        db.close()


@router.patch("/system", response_model=LabSystemSettings)
async def patch_system_settings(
    payload: LabSystemSettingsUpdate,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> LabSystemSettings:
    global _SYSTEM_SETTINGS
    db = SessionLocal()
    try:
        # Get current settings
        current_settings = get_lab_settings_by_type(db, "system")
        if current_settings:
            current_data = current_settings.settings_data
        else:
            current_data = _SYSTEM_SETTINGS.dict()
        
        # Apply updates
        updates = payload.dict(exclude_none=True)
        new_values: Dict[str, object] = {}
        for key, value in updates.items():
            if key == "systemMaintenance":
                if "systemMaintenance" in current_data:
                    current_data["systemMaintenance"].update(value)
                else:
                    current_data["systemMaintenance"] = value
            elif key == "passwordPolicy":
                if "passwordPolicy" in current_data:
                    current_data["passwordPolicy"].update(value)
                else:
                    current_data["passwordPolicy"] = value
            else:
                current_data[key] = value
        
        # Save to database
        update_lab_settings(db, "system", current_data, str(current_user.user_id))
        
        # Also update global variable for backward compatibility
        _SYSTEM_SETTINGS = LabSystemSettings(**current_data)
        _touch()
        
        return _SYSTEM_SETTINGS.copy(deep=True)
    finally:
        db.close()


@router.get("/notifications", response_model=LabNotificationSettings)
async def get_notification_settings(
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> LabNotificationSettings:
    db = SessionLocal()
    try:
        settings = get_lab_settings_by_type(db, "notifications")
        if settings and settings.settings_data:
            try:
                return LabNotificationSettings(**settings.settings_data)
            except Exception as e:
                import logging
                logging.warning(f"Invalid notification settings data in database: {e}. Returning defaults.")
                return _NOTIFICATION_SETTINGS.copy(deep=True)
        else:
            return _NOTIFICATION_SETTINGS.copy(deep=True)
    finally:
        db.close()


@router.put("/notifications", response_model=LabNotificationSettings)
async def replace_notification_settings(
    payload: LabNotificationSettings,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> LabNotificationSettings:
    global _NOTIFICATION_SETTINGS
    db = SessionLocal()
    try:
        update_lab_settings(db, "notifications", payload.dict(), str(current_user.user_id))
        
        _NOTIFICATION_SETTINGS = payload.copy(deep=True)
        _touch()
        
        return _NOTIFICATION_SETTINGS.copy(deep=True)
    finally:
        db.close()


@router.patch("/notifications", response_model=LabNotificationSettings)
async def patch_notification_settings(
    payload: LabNotificationSettingsUpdate,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> LabNotificationSettings:
    global _NOTIFICATION_SETTINGS
    db = SessionLocal()
    try:
        # Get current settings
        current_settings = get_lab_settings_by_type(db, "notifications")
        if current_settings:
            current_data = current_settings.settings_data
        else:
            current_data = _NOTIFICATION_SETTINGS.dict()
        
        # Apply updates
        updates = payload.dict(exclude_none=True)
        for key, value in updates.items():
            if key == "criticalAlerts":
                if "criticalAlerts" in current_data:
                    current_data["criticalAlerts"].update(value)
                else:
                    current_data["criticalAlerts"] = value
            elif key == "reportDelivery":
                if "reportDelivery" in current_data:
                    current_data["reportDelivery"].update(value)
                else:
                    current_data["reportDelivery"] = value
            elif key == "systemAlerts":
                if "systemAlerts" in current_data:
                    current_data["systemAlerts"].update(value)
                else:
                    current_data["systemAlerts"] = value
            else:
                current_data[key] = value
        
        # Save to database
        update_lab_settings(db, "notifications", current_data, str(current_user.user_id))
        
        # Also update global variable for backward compatibility
        _NOTIFICATION_SETTINGS = LabNotificationSettings(**current_data)
        _touch()
        
        return _NOTIFICATION_SETTINGS.copy(deep=True)
    finally:
        db.close()


@router.get("/equipment", response_model=LabEquipmentSettings)
async def get_equipment_settings(
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> LabEquipmentSettings:
    db = SessionLocal()
    try:
        # Get equipment settings from database
        settings = get_lab_settings_by_type(db, "equipment")
        instruments = get_equipment_instruments(db)
        
        if settings and settings.settings_data:
            try:
                # Convert database instruments to the expected format
                db_instruments = []
                for instrument in instruments:
                    db_instruments.append({
                        "id": instrument.instrument_id,
                        "name": instrument.name,
                        "type": instrument.type,
                        "status": instrument.status,
                        "location": instrument.location,
                        "calibrationDue": instrument.calibration_due.isoformat() if instrument.calibration_due else None,
                        "maintenanceDue": instrument.maintenance_due.isoformat() if instrument.maintenance_due else None,
                        "settings": instrument.settings or {}
                    })
                
                # Get default settings
                default_settings_data = settings.settings_data.get("defaultSettings", {})
                # Validate default settings
                default_settings = EquipmentDefaultSettings(**default_settings_data) if default_settings_data else _EQUIPMENT_SETTINGS.defaultSettings
                
                return LabEquipmentSettings(
                    instruments=db_instruments,
                    defaultSettings=default_settings
                )
            except Exception as e:
                import logging
                logging.warning(f"Invalid equipment settings data in database: {e}. Returning defaults.")
                return _EQUIPMENT_SETTINGS.copy(deep=True)
        else:
            return _EQUIPMENT_SETTINGS.copy(deep=True)
    finally:
        db.close()


@router.put("/equipment/defaults", response_model=EquipmentDefaultSettings)
async def replace_equipment_defaults(
    payload: EquipmentDefaultSettings,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> EquipmentDefaultSettings:
    global _EQUIPMENT_SETTINGS
    db = SessionLocal()
    try:
        # Get current equipment settings
        current_settings = get_lab_settings_by_type(db, "equipment")
        if current_settings:
            current_data = current_settings.settings_data
        else:
            current_data = {"defaultSettings": {}}
        
        # Update default settings
        current_data["defaultSettings"] = payload.dict()
        
        # Save to database
        update_lab_settings(db, "equipment", current_data, str(current_user.user_id))
        
        # Also update global variable for backward compatibility
        _EQUIPMENT_SETTINGS.defaultSettings = payload.copy(deep=True)
        _touch()
        
        return _EQUIPMENT_SETTINGS.defaultSettings.copy(deep=True)
    finally:
        db.close()


@router.patch("/equipment/defaults", response_model=EquipmentDefaultSettings)
async def patch_equipment_defaults(
    payload: EquipmentDefaultSettingsUpdate,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> EquipmentDefaultSettings:
    global _EQUIPMENT_SETTINGS
    db = SessionLocal()
    try:
        # Get current equipment settings
        current_settings = get_lab_settings_by_type(db, "equipment")
        if current_settings:
            current_data = current_settings.settings_data
        else:
            current_data = {"defaultSettings": _EQUIPMENT_SETTINGS.defaultSettings.dict()}
        
        # Apply updates to default settings
        updates = payload.dict(exclude_none=True)
        defaults = current_data.get("defaultSettings", {})
        
        if "alertThresholds" in updates and updates["alertThresholds"] is not None:
            thresholds = updates.pop("alertThresholds")
            if "alertThresholds" in defaults:
                defaults["alertThresholds"].update(thresholds)
            else:
                defaults["alertThresholds"] = thresholds
        
        # Update the rest of the defaults
        defaults.update(updates)
        current_data["defaultSettings"] = defaults
        
        # Save to database
        update_lab_settings(db, "equipment", current_data, str(current_user.user_id))
        
        # Also update global variable for backward compatibility
        _EQUIPMENT_SETTINGS.defaultSettings = EquipmentDefaultSettings(**defaults)
        _touch()
        
        return _EQUIPMENT_SETTINGS.defaultSettings.copy(deep=True)
    finally:
        db.close()


@router.post("/equipment/instruments", response_model=EquipmentInstrument, status_code=status.HTTP_201_CREATED)
async def add_equipment_instrument(
    payload: EquipmentInstrumentCreate,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> EquipmentInstrument:
    if _find_instrument(payload.id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Instrument id already exists")
    instrument = EquipmentInstrument(**payload.dict())
    _EQUIPMENT_SETTINGS.instruments.append(instrument)
    _touch()
    return instrument.copy(deep=True)


@router.put("/equipment/instruments/{instrument_id}", response_model=EquipmentInstrument)
async def replace_equipment_instrument(
    instrument_id: str,
    payload: EquipmentInstrumentCreate,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> EquipmentInstrument:
    instrument = _find_instrument(instrument_id)
    if not instrument:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instrument not found")
    replacement = EquipmentInstrument(**payload.dict())
    index = _EQUIPMENT_SETTINGS.instruments.index(instrument)
    _EQUIPMENT_SETTINGS.instruments[index] = replacement
    _touch()
    return replacement.copy(deep=True)


@router.patch("/equipment/instruments/{instrument_id}", response_model=EquipmentInstrument)
async def patch_equipment_instrument(
    instrument_id: str,
    payload: EquipmentInstrumentUpdate,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> EquipmentInstrument:
    instrument = _find_instrument(instrument_id)
    if not instrument:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instrument not found")
    updates = payload.dict(exclude_none=True)
    original = instrument
    if "settings" in updates and updates["settings"] is not None:
        settings_updates = updates.pop("settings")
        instrument = instrument.copy(update={**updates, "settings": instrument.settings.copy(update=settings_updates)})
    else:
        instrument = instrument.copy(update=updates)
    index = _EQUIPMENT_SETTINGS.instruments.index(original)
    _EQUIPMENT_SETTINGS.instruments[index] = instrument
    _touch()
    return instrument.copy(deep=True)


@router.delete(
    "/equipment/instruments/{instrument_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_equipment_instrument(
    instrument_id: str,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> Response:
    instrument = _find_instrument(instrument_id)
    if not instrument:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instrument not found")
    _EQUIPMENT_SETTINGS.instruments.remove(instrument)
    _touch()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/users", response_model=LabUserSettings)
async def get_user_settings(
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> LabUserSettings:
    return _USER_SETTINGS.copy(deep=True)


@router.get("/integrations", response_model=LabIntegrationSettings)
async def get_integration_settings(
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> LabIntegrationSettings:
    return _INTEGRATION_SETTINGS.copy(deep=True)
