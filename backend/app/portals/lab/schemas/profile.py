from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


class LabProfileData(BaseModel):
    firstName: str = Field(..., description="First name")
    lastName: str = Field(..., description="Last name")
    email: EmailStr = Field(..., description="Work email address")
    phone: str = Field(..., description="Primary contact phone")
    address: str = Field(..., description="Street address")
    city: str = Field(..., description="City name")
    state: str = Field(..., description="State or region")
    zipCode: str = Field(..., description="Postal code")
    dateOfBirth: str = Field(..., description="Date of birth (YYYY-MM-DD)")
    employeeId: str = Field(..., description="Employee identifier")
    position: str = Field(..., description="Job title")
    department: str = Field(..., description="Department name")
    supervisor: str = Field(..., description="Supervisor name")
    hireDate: str = Field(..., description="Hire date (YYYY-MM-DD)")
    certification: str = Field(..., description="Certification details")
    licenseNumber: str = Field(..., description="License identifier")
    licenseExpiry: str = Field(..., description="License expiry date")
    emailNotifications: bool = Field(..., description="Enable email alerts")
    smsNotifications: bool = Field(..., description="Enable SMS alerts")
    criticalAlerts: bool = Field(..., description="Receive critical result alerts")
    weeklyReports: bool = Field(..., description="Receive weekly reports")
    systemUpdates: bool = Field(..., description="Receive system update notifications")
    twoFactorAuth: bool = Field(..., description="Two-factor authentication enabled")
    sessionTimeout: int = Field(..., ge=5, le=480, description="Session timeout in minutes")
    loginAlerts: bool = Field(..., description="Receive login alerts")
    theme: str = Field(..., description="Preferred UI theme")
    language: str = Field(..., description="Preferred language")
    timezone: str = Field(..., description="Preferred timezone")
    dateFormat: str = Field(..., description="Preferred date format")
    timeFormat: str = Field(..., description="Preferred time format")


class LabProfileDataPartial(BaseModel):
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
    emailNotifications: Optional[bool] = None
    smsNotifications: Optional[bool] = None
    criticalAlerts: Optional[bool] = None
    weeklyReports: Optional[bool] = None
    systemUpdates: Optional[bool] = None
    twoFactorAuth: Optional[bool] = None
    sessionTimeout: Optional[int] = Field(None, ge=5, le=480)
    loginAlerts: Optional[bool] = None
    theme: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    dateFormat: Optional[str] = None
    timeFormat: Optional[str] = None

    class Config:
        extra = "forbid"


class LabStatsPeriod(BaseModel):
    ordersProcessed: int = Field(..., ge=0)
    reportsGenerated: int = Field(..., ge=0)
    hoursWorked: int = Field(..., ge=0)


class LabStatsData(BaseModel):
    totalOrders: int = Field(..., ge=0)
    completedTests: int = Field(..., ge=0)
    reportsGenerated: int = Field(..., ge=0)
    avgProcessingTime: str = Field(...)
    accuracy: str = Field(...)
    thisWeek: LabStatsPeriod
    thisMonth: LabStatsPeriod


class ActivityItem(BaseModel):
    id: int = Field(..., ge=1)
    action: str
    timestamp: str
    type: str
    details: str


class LabProfileEnvelope(BaseModel):
    profileData: LabProfileData
    statsData: LabStatsData
    activityData: List[ActivityItem]
    lastUpdated: str


class LabProfileUpdateRequest(BaseModel):
    profileData: LabProfileData


class LabProfilePatchRequest(BaseModel):
    profileData: LabProfileDataPartial


class PasswordChangeRequest(BaseModel):
    currentPassword: str = Field(..., min_length=6)
    newPassword: str = Field(..., min_length=8)
    confirmPassword: str = Field(..., min_length=8)

    class Config:
        extra = "forbid"
