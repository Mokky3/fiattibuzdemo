from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


class ProfileData(BaseModel):
    firstName: str = Field(..., description="Radiologist first name")
    lastName: str = Field(..., description="Radiologist last name")
    email: EmailStr = Field(..., description="Work email address")
    phone: str = Field(..., description="Contact phone number")
    address: str = Field(..., description="Street address")
    city: str = Field(..., description="City")
    state: str = Field(..., description="State or region")
    zipCode: str = Field(..., description="Postal code")
    dateOfBirth: str = Field(..., description="Date of birth (YYYY-MM-DD)")
    employeeId: str = Field(..., description="Employee identifier")
    position: str = Field(..., description="Position title")
    department: str = Field(..., description="Department name")
    supervisor: str = Field(..., description="Supervisor name")
    hireDate: str = Field(..., description="Hire date (YYYY-MM-DD)")
    certification: str = Field(..., description="Certification details")
    licenseNumber: str = Field(..., description="Medical license number")
    licenseExpiry: str = Field(..., description="Medical license expiry date")
    subspecialty: str = Field(..., description="Medical subspecialty")
    medicalSchool: str = Field(..., description="Medical school attended")
    residency: str = Field(..., description="Residency program")
    fellowship: str = Field(..., description="Fellowship training")
    emailNotifications: bool = Field(..., description="Receive email notifications")
    smsNotifications: bool = Field(..., description="Receive SMS notifications")
    criticalAlerts: bool = Field(..., description="Receive critical finding alerts")
    weeklyReports: bool = Field(..., description="Receive weekly performance reports")
    systemUpdates: bool = Field(..., description="Receive system updates")
    pacsAlerts: bool = Field(..., description="Receive PACS alerts")
    reportReminders: bool = Field(..., description="Receive report reminders")
    twoFactorAuth: bool = Field(..., description="Two-factor authentication enabled")
    sessionTimeout: int = Field(..., ge=5, le=480, description="Session timeout in minutes")
    loginAlerts: bool = Field(..., description="Receive login alerts")
    theme: str = Field(..., description="Preferred UI theme")
    language: str = Field(..., description="Preferred language")
    timezone: str = Field(..., description="Preferred timezone")
    dateFormat: str = Field(..., description="Preferred date format")
    timeFormat: str = Field(..., description="Preferred time format")
    pacsLayout: str = Field(..., description="Default PACS layout")
    windowingPreset: str = Field(..., description="Default windowing preset")


class ProfileDataPartial(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zipCode: Optional[str] = None
    dateOfBirth: Optional[str] = None
    employeeId: Optional[str] = None
    position: Optional[str] = None
    department: Optional[str] = None
    supervisor: Optional[str] = None
    hireDate: Optional[str] = None
    certification: Optional[str] = None
    licenseNumber: Optional[str] = None
    licenseExpiry: Optional[str] = None
    subspecialty: Optional[str] = None
    medicalSchool: Optional[str] = None
    residency: Optional[str] = None
    fellowship: Optional[str] = None
    emailNotifications: Optional[bool] = None
    smsNotifications: Optional[bool] = None
    criticalAlerts: Optional[bool] = None
    weeklyReports: Optional[bool] = None
    systemUpdates: Optional[bool] = None
    pacsAlerts: Optional[bool] = None
    reportReminders: Optional[bool] = None
    twoFactorAuth: Optional[bool] = None
    sessionTimeout: Optional[int] = Field(None, ge=5, le=480)
    loginAlerts: Optional[bool] = None
    theme: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    dateFormat: Optional[str] = None
    timeFormat: Optional[str] = None
    pacsLayout: Optional[str] = None
    windowingPreset: Optional[str] = None

    class Config:
        extra = "forbid"


class PeriodStats(BaseModel):
    studiesRead: int = Field(..., ge=0)
    reportsFinalized: int = Field(..., ge=0)
    criticalFindings: int = Field(..., ge=0)
    hoursWorked: int = Field(..., ge=0)
    avgTurnaroundTime: str = Field(...)


class StatsData(BaseModel):
    totalStudies: int = Field(..., ge=0)
    reportsFinalized: int = Field(..., ge=0)
    avgReportTime: str = Field(...)
    criticalFindings: int = Field(..., ge=0)
    consultations: int = Field(..., ge=0)
    accuracy: str = Field(...)
    productivity: str = Field(...)
    thisWeek: PeriodStats
    thisMonth: PeriodStats
    modalityBreakdown: Dict[str, int]


class ActivityItem(BaseModel):
    id: int = Field(..., ge=1)
    action: str = Field(...)
    timestamp: str = Field(...)
    type: str = Field(...)
    details: str = Field(...)


class RadiologyProfileEnvelope(BaseModel):
    profileData: ProfileData
    statsData: StatsData
    activityData: List[ActivityItem]
    lastUpdated: str = Field(..., description="ISO-8601 timestamp of last profile update")


class RadiologyProfileUpdateRequest(BaseModel):
    profileData: ProfileData


class RadiologyProfilePatchRequest(BaseModel):
    profileData: ProfileDataPartial


class PasswordChangeRequest(BaseModel):
    currentPassword: str = Field(..., min_length=6)
    newPassword: str = Field(..., min_length=8)
    confirmPassword: str = Field(..., min_length=8)


