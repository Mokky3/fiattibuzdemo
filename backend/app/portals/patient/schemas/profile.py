from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class VitalStat(BaseModel):
    code: str
    value: str
    date: datetime

class ImmunizationRec(BaseModel):
    vaccine: str
    date: datetime
    status: str

class InsuranceInfo(BaseModel):
    provider: str
    policyNumber: str
    groupNumber: Optional[str]
    coverageType: str
    validUntil: Optional[datetime]

class ProfileOut(BaseModel):
    fullName: str
    email: Optional[str]
    phone: Optional[str]
    gender: Optional[str]
    dateOfBirth: Optional[datetime]
    address: Optional[str]
    emergencyContact: Optional[str]
    emergencyPhone: Optional[str]
    profileImage: Optional[str]
    patientId: str
    registrationDate: datetime
    vitals: List[VitalStat]
    bloodGroup: Optional[str]
    bloodRh: Optional[str]
    allergies: List[str]
    chronicConditions: List[str]
    immunizations: List[ImmunizationRec]
    insurance: Optional[InsuranceInfo]

class DemographicsPatch(BaseModel):
    fullName: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    emergencyContact: Optional[str]
    emergencyPhone: Optional[str]
    profileImage: Optional[str]
