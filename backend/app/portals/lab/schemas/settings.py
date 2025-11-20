from __future__ import annotations

from typing import Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field


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
