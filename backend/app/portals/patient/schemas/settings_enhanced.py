"""Shared settings schemas for patient portal settings route."""
from typing import Optional
from pydantic import BaseModel, Field


class Notifications(BaseModel):
    enabled: bool = True
    emailNotifications: bool = True
    reminderTiming: str = Field("24hours", pattern=r"\d+hours?")
    _id: Optional[str] = None


class Privacy(BaseModel):
    allowResearch: bool = False
    shareHealthData: bool = True
    _id: Optional[str] = None


class Preferences(BaseModel):
    language: str = "en"


class SettingsBlob(BaseModel):
    notifications: Optional[Notifications]
    privacy: Optional[Privacy]
    preferences: Optional[Preferences]


