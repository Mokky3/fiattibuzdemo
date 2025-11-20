from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class NotificationEmailSettings(BaseModel):
    taskReminders: bool
    shiftAlerts: bool
    medicationDue: bool
    patientUpdates: bool
    systemUpdates: bool
    emergencyAlerts: bool


class NotificationPushSettings(BaseModel):
    taskReminders: bool
    shiftAlerts: bool
    medicationDue: bool
    patientUpdates: bool
    systemUpdates: bool
    emergencyAlerts: bool


class NotificationSoundSettings(BaseModel):
    enableSounds: bool
    volume: int = Field(..., ge=0, le=100)
    emergencyTone: bool
    keyboardSounds: bool


class NotificationScheduleSettings(BaseModel):
    quietHours: bool
    quietStart: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    quietEnd: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    weekendMode: bool


class NurseNotificationSettings(BaseModel):
    email: NotificationEmailSettings
    push: NotificationPushSettings
    sound: NotificationSoundSettings
    schedule: NotificationScheduleSettings


class NurseDisplaySettings(BaseModel):
    theme: str
    colorScheme: str
    fontSize: str
    compactMode: bool
    animations: bool
    highContrast: bool


class NurseSecuritySettings(BaseModel):
    sessionTimeout: int = Field(..., ge=5, le=480)
    twoFactorAuth: bool
    biometricLogin: bool
    loginHistory: bool
    deviceTrust: bool
    dataEncryption: bool


class NurseWorkflowSettings(BaseModel):
    defaultView: str
    autoRefresh: bool
    refreshInterval: int = Field(..., ge=1, le=60)
    confirmActions: bool
    quickActions: bool
    keyboardShortcuts: bool
    autoSave: bool
    taskGrouping: str


class NurseRegionalSettings(BaseModel):
    timezone: str
    language: str
    dateFormat: str
    timeFormat: str
    currency: str
    temperatureUnit: str
    measurementSystem: str


class NurseDataSettings(BaseModel):
    autoBackup: bool
    backupFrequency: str
    dataRetention: str
    exportFormat: str
    syncSettings: bool


class NurseSettingsBundle(BaseModel):
    notifications: NurseNotificationSettings
    display: NurseDisplaySettings
    security: NurseSecuritySettings
    workflow: NurseWorkflowSettings
    regional: NurseRegionalSettings
    data: NurseDataSettings


class NurseSettingsEnvelope(BaseModel):
    settings: NurseSettingsBundle
    lastUpdated: str


class NotificationEmailSettingsPatch(BaseModel):
    taskReminders: Optional[bool] = None
    shiftAlerts: Optional[bool] = None
    medicationDue: Optional[bool] = None
    patientUpdates: Optional[bool] = None
    systemUpdates: Optional[bool] = None
    emergencyAlerts: Optional[bool] = None


class NotificationPushSettingsPatch(BaseModel):
    taskReminders: Optional[bool] = None
    shiftAlerts: Optional[bool] = None
    medicationDue: Optional[bool] = None
    patientUpdates: Optional[bool] = None
    systemUpdates: Optional[bool] = None
    emergencyAlerts: Optional[bool] = None


class NotificationSoundSettingsPatch(BaseModel):
    enableSounds: Optional[bool] = None
    volume: Optional[int] = Field(None, ge=0, le=100)
    emergencyTone: Optional[bool] = None
    keyboardSounds: Optional[bool] = None


class NotificationScheduleSettingsPatch(BaseModel):
    quietHours: Optional[bool] = None
    quietStart: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    quietEnd: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    weekendMode: Optional[bool] = None


class NurseNotificationSettingsPatch(BaseModel):
    email: Optional[NotificationEmailSettingsPatch] = None
    push: Optional[NotificationPushSettingsPatch] = None
    sound: Optional[NotificationSoundSettingsPatch] = None
    schedule: Optional[NotificationScheduleSettingsPatch] = None

    class Config:
        extra = "forbid"


class NurseDisplaySettingsPatch(BaseModel):
    theme: Optional[str] = None
    colorScheme: Optional[str] = None
    fontSize: Optional[str] = None
    compactMode: Optional[bool] = None
    animations: Optional[bool] = None
    highContrast: Optional[bool] = None


class NurseSecuritySettingsPatch(BaseModel):
    sessionTimeout: Optional[int] = Field(None, ge=5, le=480)
    twoFactorAuth: Optional[bool] = None
    biometricLogin: Optional[bool] = None
    loginHistory: Optional[bool] = None
    deviceTrust: Optional[bool] = None
    dataEncryption: Optional[bool] = None


class NurseWorkflowSettingsPatch(BaseModel):
    defaultView: Optional[str] = None
    autoRefresh: Optional[bool] = None
    refreshInterval: Optional[int] = Field(None, ge=1, le=60)
    confirmActions: Optional[bool] = None
    quickActions: Optional[bool] = None
    keyboardShortcuts: Optional[bool] = None
    autoSave: Optional[bool] = None
    taskGrouping: Optional[str] = None


class NurseRegionalSettingsPatch(BaseModel):
    timezone: Optional[str] = None
    language: Optional[str] = None
    dateFormat: Optional[str] = None
    timeFormat: Optional[str] = None
    currency: Optional[str] = None
    temperatureUnit: Optional[str] = None
    measurementSystem: Optional[str] = None


class NurseDataSettingsPatch(BaseModel):
    autoBackup: Optional[bool] = None
    backupFrequency: Optional[str] = None
    dataRetention: Optional[str] = None
    exportFormat: Optional[str] = None
    syncSettings: Optional[bool] = None


class NurseSettingsPatchRequest(BaseModel):
    notifications: Optional[NurseNotificationSettingsPatch] = None
    display: Optional[NurseDisplaySettingsPatch] = None
    security: Optional[NurseSecuritySettingsPatch] = None
    workflow: Optional[NurseWorkflowSettingsPatch] = None
    regional: Optional[NurseRegionalSettingsPatch] = None
    data: Optional[NurseDataSettingsPatch] = None

    class Config:
        extra = "forbid"





