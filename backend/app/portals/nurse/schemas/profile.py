from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, EmailStr


class NurseProfileData(BaseModel):
    fullName: str
    email: EmailStr
    phone: str
    department: str
    licenseNumber: str
    experience: str


class NurseProfilePartial(BaseModel):
    fullName: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    licenseNumber: Optional[str] = None
    experience: Optional[str] = None

    class Config:
        extra = "forbid"


class NurseProfileEnvelope(BaseModel):
    profileData: NurseProfileData
    lastUpdated: str


class NurseProfileUpdateRequest(BaseModel):
    profileData: NurseProfileData


class NurseProfilePatchRequest(BaseModel):
    profileData: NurseProfilePartial





