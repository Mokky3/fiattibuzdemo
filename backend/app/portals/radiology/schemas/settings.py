from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


class OperatingHours(BaseModel):
    start: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="Day start time (HH:MM)")
    end: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="Day end time (HH:MM)")
    days: List[str] = Field(..., min_items=1, description="List of operating days in lowercase")


class GeneralSettings(BaseModel):
    departmentName: str
    departmentCode: str
    address: str
    phone: str
    email: EmailStr
    website: str
    timezone: str
    dateFormat: str
    timeFormat: str
    language: str
    currency: str
    operatingHours: OperatingHours


class SystemMaintenance(BaseModel):
    enabled: bool
    time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    day: str


class PasswordPolicy(BaseModel):
    minLength: int = Field(..., ge=6)
    requireUppercase: bool
    requireNumbers: bool
    requireSpecialChars: bool
    expiryDays: int = Field(..., ge=1)


class SystemSettings(BaseModel):
    autoBackup: bool
    backupFrequency: str
    backupRetention: int = Field(..., ge=1)
    systemMaintenance: SystemMaintenance
    sessionTimeout: int = Field(..., ge=5)
    maxLoginAttempts: int = Field(..., ge=1)
    passwordPolicy: PasswordPolicy
    auditLogging: bool
    errorReporting: bool


class CriticalAlertsSettings(BaseModel):
    enabled: bool
    methods: List[str] = Field(..., min_items=1)
    recipients: List[EmailStr] = Field(..., min_items=1)


class ReportDeliverySettings(BaseModel):
    enabled: bool
    schedule: str
    day: str
    time: str


class SystemAlertsSettings(BaseModel):
    pacsDowntime: bool
    modalityOffline: bool
    diskSpaceLow: bool
    qcFailures: bool


class NotificationSettings(BaseModel):
    emailNotifications: bool
    smsNotifications: bool
    pushNotifications: bool
    criticalAlerts: CriticalAlertsSettings
    reportDelivery: ReportDeliverySettings
    systemAlerts: SystemAlertsSettings


class ModalityFlags(BaseModel):
    autoSend: bool
    qualityControl: str
    dataBackup: bool


class Modality(BaseModel):
    id: str
    name: str
    type: str
    status: str
    location: str
    calibrationDue: str
    maintenanceDue: str
    settings: ModalityFlags


class EquipmentAlertThresholds(BaseModel):
    diskSpaceLow: int = Field(..., ge=0, le=100)
    temperatureHigh: int = Field(...)
    networkLatency: int = Field(..., ge=0)


class DefaultEquipmentSettings(BaseModel):
    calibrationInterval: int = Field(..., ge=1)
    maintenanceInterval: int = Field(..., ge=1)
    qualityControlFrequency: str
    alertThresholds: EquipmentAlertThresholds


class EquipmentSettings(BaseModel):
    modalities: List[Modality]
    defaultSettings: DefaultEquipmentSettings


class UserRole(BaseModel):
    id: str
    name: str
    permissions: List[str]
    description: Optional[str] = None


class AccountSettings(BaseModel):
    passwordExpiry: int = Field(..., ge=1)
    lockoutDuration: int = Field(..., ge=1)
    inactivityTimeout: int = Field(..., ge=1)


class UserSettings(BaseModel):
    defaultRole: str
    autoApproval: bool
    userRoles: List[UserRole]
    accountSettings: AccountSettings


class PACSSettings(BaseModel):
    enabled: bool
    endpoint: str
    vendor: str
    syncFrequency: str


class RISSettings(BaseModel):
    enabled: bool
    provider: str
    endpoint: str
    apiKey: str


class HL7Settings(BaseModel):
    enabled: bool
    provider: str
    autoSync: bool
    version: str


class DICOMSettings(BaseModel):
    provider: str
    endpoint: str
    compression: bool
    archiving: str


class IntegrationSettings(BaseModel):
    pacs: PACSSettings
    ris: RISSettings
    hl7: HL7Settings
    dicom: DICOMSettings


class RadiologySettingsEnvelope(BaseModel):
    generalSettings: GeneralSettings
    systemSettings: SystemSettings
    notificationSettings: NotificationSettings
    equipmentSettings: EquipmentSettings
    userSettings: UserSettings
    integrationSettings: IntegrationSettings
    lastUpdated: str


class OperatingHoursUpdate(BaseModel):
    start: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    end: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    days: Optional[List[str]] = None

    class Config:
        extra = "forbid"


class GeneralSettingsUpdate(BaseModel):
    departmentName: Optional[str] = None
    departmentCode: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    timezone: Optional[str] = None
    dateFormat: Optional[str] = None
    timeFormat: Optional[str] = None
    language: Optional[str] = None
    currency: Optional[str] = None
    operatingHours: Optional[OperatingHoursUpdate] = None

    class Config:
        extra = "forbid"


class SystemMaintenanceUpdate(BaseModel):
    enabled: Optional[bool] = None
    time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    day: Optional[str] = None

    class Config:
        extra = "forbid"


class PasswordPolicyUpdate(BaseModel):
    minLength: Optional[int] = Field(None, ge=6)
    requireUppercase: Optional[bool] = None
    requireNumbers: Optional[bool] = None
    requireSpecialChars: Optional[bool] = None
    expiryDays: Optional[int] = Field(None, ge=1)

    class Config:
        extra = "forbid"


class SystemSettingsUpdate(BaseModel):
    autoBackup: Optional[bool] = None
    backupFrequency: Optional[str] = None
    backupRetention: Optional[int] = Field(None, ge=1)
    systemMaintenance: Optional[SystemMaintenanceUpdate] = None
    sessionTimeout: Optional[int] = Field(None, ge=5)
    maxLoginAttempts: Optional[int] = Field(None, ge=1)
    passwordPolicy: Optional[PasswordPolicyUpdate] = None
    auditLogging: Optional[bool] = None
    errorReporting: Optional[bool] = None

    class Config:
        extra = "forbid"


class CriticalAlertsUpdate(BaseModel):
    enabled: Optional[bool] = None
    methods: Optional[List[str]] = None
    recipients: Optional[List[EmailStr]] = None

    class Config:
        extra = "forbid"


class ReportDeliveryUpdate(BaseModel):
    enabled: Optional[bool] = None
    schedule: Optional[str] = None
    day: Optional[str] = None
    time: Optional[str] = None

    class Config:
        extra = "forbid"


class SystemAlertsUpdate(BaseModel):
    pacsDowntime: Optional[bool] = None
    modalityOffline: Optional[bool] = None
    diskSpaceLow: Optional[bool] = None
    qcFailures: Optional[bool] = None

    class Config:
        extra = "forbid"


class NotificationSettingsUpdate(BaseModel):
    emailNotifications: Optional[bool] = None
    smsNotifications: Optional[bool] = None
    pushNotifications: Optional[bool] = None
    criticalAlerts: Optional[CriticalAlertsUpdate] = None
    reportDelivery: Optional[ReportDeliveryUpdate] = None
    systemAlerts: Optional[SystemAlertsUpdate] = None

    class Config:
        extra = "forbid"


class ModalityFlagsUpdate(BaseModel):
    autoSend: Optional[bool] = None
    qualityControl: Optional[str] = None
    dataBackup: Optional[bool] = None

    class Config:
        extra = "forbid"


class ModalityUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    location: Optional[str] = None
    calibrationDue: Optional[str] = None
    maintenanceDue: Optional[str] = None
    settings: Optional[ModalityFlagsUpdate] = None

    class Config:
        extra = "forbid"


class EquipmentAlertThresholdsUpdate(BaseModel):
    diskSpaceLow: Optional[int] = Field(None, ge=0, le=100)
    temperatureHigh: Optional[int] = None
    networkLatency: Optional[int] = Field(None, ge=0)

    class Config:
        extra = "forbid"


class DefaultEquipmentSettingsUpdate(BaseModel):
    calibrationInterval: Optional[int] = Field(None, ge=1)
    maintenanceInterval: Optional[int] = Field(None, ge=1)
    qualityControlFrequency: Optional[str] = None
    alertThresholds: Optional[EquipmentAlertThresholdsUpdate] = None

    class Config:
        extra = "forbid"


class EquipmentSettingsUpdate(BaseModel):
    modalities: Optional[List[Modality]] = None
    defaultSettings: Optional[DefaultEquipmentSettingsUpdate] = None

    class Config:
        extra = "forbid"


class AccountSettingsUpdate(BaseModel):
    passwordExpiry: Optional[int] = Field(None, ge=1)
    lockoutDuration: Optional[int] = Field(None, ge=1)
    inactivityTimeout: Optional[int] = Field(None, ge=1)

    class Config:
        extra = "forbid"


class UserSettingsUpdate(BaseModel):
    defaultRole: Optional[str] = None
    autoApproval: Optional[bool] = None
    userRoles: Optional[List[UserRole]] = None
    accountSettings: Optional[AccountSettingsUpdate] = None

    class Config:
        extra = "forbid"


class PACSSettingsUpdate(BaseModel):
    enabled: Optional[bool] = None
    endpoint: Optional[str] = None
    vendor: Optional[str] = None
    syncFrequency: Optional[str] = None

    class Config:
        extra = "forbid"


class RISSettingsUpdate(BaseModel):
    enabled: Optional[bool] = None
    provider: Optional[str] = None
    endpoint: Optional[str] = None
    apiKey: Optional[str] = None

    class Config:
        extra = "forbid"


class HL7SettingsUpdate(BaseModel):
    enabled: Optional[bool] = None
    provider: Optional[str] = None
    autoSync: Optional[bool] = None
    version: Optional[str] = None

    class Config:
        extra = "forbid"


class DICOMSettingsUpdate(BaseModel):
    provider: Optional[str] = None
    endpoint: Optional[str] = None
    compression: Optional[bool] = None
    archiving: Optional[str] = None

    class Config:
        extra = "forbid"


class IntegrationSettingsUpdate(BaseModel):
    pacs: Optional[PACSSettingsUpdate] = None
    ris: Optional[RISSettingsUpdate] = None
    hl7: Optional[HL7SettingsUpdate] = None
    dicom: Optional[DICOMSettingsUpdate] = None

    class Config:
        extra = "forbid"


class RadiologySettingsUpdate(BaseModel):
    generalSettings: Optional[GeneralSettingsUpdate] = None
    systemSettings: Optional[SystemSettingsUpdate] = None
    notificationSettings: Optional[NotificationSettingsUpdate] = None
    equipmentSettings: Optional[EquipmentSettingsUpdate] = None
    userSettings: Optional[UserSettingsUpdate] = None
    integrationSettings: Optional[IntegrationSettingsUpdate] = None

    class Config:
        extra = "forbid"


class ModalityCreate(BaseModel):
    id: str
    name: str
    type: str
    status: str
    location: str
    calibrationDue: str
    maintenanceDue: str
    settings: ModalityFlags


