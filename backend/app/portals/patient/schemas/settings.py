from pydantic import BaseModel, Field
from typing import Optional

class Notifications(BaseModel):
    enabled: bool = True
    reminderTiming: str = Field("24hours", regex=r"\d+hours?")
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
