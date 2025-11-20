"""Shared settings schemas for admin settings bundle."""
from pydantic import BaseModel, Field


class GeneralSettings(BaseModel):
    """General UI and locale settings."""
    timezone: str = Field("Asia/Tashkent", description="Default timezone identifier")
    language: str = Field("en", description="UI language code: en|uz|ru")
    theme_color: str = Field("#5ACCC3", description="Primary theme color hex")


class FeatureSettings(BaseModel):
    """Feature flags used by the admin UI."""
    tabib_ai_enabled: bool = Field(False, description="Enable Tabib AI access for clinic staff")
    notifications_enabled: bool = Field(True, description="Enable notification system access for clinic staff")


class BackupSettings(BaseModel):
    """Backup and retention configuration."""
    backup_frequency: str = Field("Weekly", description="Backup frequency label")
    data_retention_years: int = Field(5, ge=1, le=50, description="Years to retain data")
