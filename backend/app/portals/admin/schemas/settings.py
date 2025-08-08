from pydantic import BaseModel
from typing import List

class SettingsGeneral(BaseModel):
    timezone: str
    language: str
    theme_color: str

class SettingsSecurity(BaseModel):
    session_timeout: int
    max_login_attempts: int
    enable_two_factor: bool
    enable_encryption: bool
    enable_audit_logs: bool

class SettingsFeatures(BaseModel):
    ai_module: bool

class SettingsNotifications(BaseModel):
    enable_notifications: bool
    email_notifications: bool
    sms_notifications: bool

class SettingsBackup(BaseModel):
    backup_frequency: str
    data_retention_years: int

class SystemSettings(BaseModel):
    general: SettingsGeneral
    security: SettingsSecurity
    features: SettingsFeatures
    notifications: SettingsNotifications
    backup: SettingsBackup

class SettingsUpdate(SystemSettings):
    pass
