"""Shared hospital/department/service pricing schemas."""
from typing import Optional, Dict, List
from pydantic import BaseModel, Field, EmailStr


class HospitalResponse(BaseModel):
    id: str = Field(..., description="Hospital ID")
    name: str = Field(..., description="Hospital name")
    hospital_type: str = Field(..., description="Hospital type")
    status: str = Field(..., description="Hospital status")
    address: str = Field(..., description="Hospital address")
    phone: Optional[str] = Field(None, description="Hospital phone")
    email: Optional[EmailStr] = Field(None, description="Hospital email")
    website: Optional[str] = Field(None, description="Hospital website")
    logo_url: Optional[str] = Field(None, description="Hospital logo URL")
    capacity: Optional[int] = Field(None, description="Hospital capacity")
    established_date: Optional[str] = Field(None, description="Established date")
    license_number: Optional[str] = Field(None, description="License number")
    accreditation: Optional[str] = Field(None, description="Accreditation status")
    created_at: str = Field(..., description="Created timestamp")
    updated_at: str = Field(..., description="Updated timestamp")
    # Additional fields for frontend display
    beds: Optional[int] = Field(0, description="Total beds across all departments")
    departments: List[str] = Field(default_factory=list, description="Department names")


class HospitalCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200, description="Hospital name")
    hospital_type: str = Field(..., description="Hospital type")
    address: str = Field(..., min_length=10, max_length=500, description="Hospital address")
    phone: Optional[str] = Field(None, description="Hospital phone")
    email: Optional[EmailStr] = Field(None, description="Hospital email")
    website: Optional[str] = Field(None, description="Hospital website")
    capacity: Optional[int] = Field(None, ge=1, description="Hospital capacity")
    established_date: Optional[str] = Field(None, description="Established date")
    license_number: Optional[str] = Field(None, description="License number")
    accreditation: Optional[str] = Field(None, description="Accreditation status")


class HospitalUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200, description="Hospital name")
    hospital_type: Optional[str] = Field(None, description="Hospital type")
    status: Optional[str] = Field(None, description="Hospital status")
    address: Optional[str] = Field(None, min_length=10, max_length=500, description="Hospital address")
    phone: Optional[str] = Field(None, description="Hospital phone")
    email: Optional[EmailStr] = Field(None, description="Hospital email")
    website: Optional[str] = Field(None, description="Hospital website")
    capacity: Optional[int] = Field(None, ge=1, description="Hospital capacity")
    license_number: Optional[str] = Field(None, description="License number")
    accreditation: Optional[str] = Field(None, description="Accreditation status")


class DepartmentResponse(BaseModel):
    id: str = Field(..., description="Department ID")
    name: str = Field(..., description="Department name")
    department_type: str = Field(..., description="Department type")
    hospital_id: str = Field(..., description="Hospital ID")
    hospital_name: str = Field(..., description="Hospital name")
    head_doctor_id: Optional[str] = Field(None, description="Head doctor ID")
    head_doctor_name: Optional[str] = Field(None, description="Head doctor name")
    capacity: Optional[int] = Field(None, description="Department capacity")
    description: Optional[str] = Field(None, description="Department description")
    created_at: str = Field(..., description="Created timestamp")


class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Department name")
    code: str = Field(..., min_length=2, max_length=20, description="Department code")
    department_type: str = Field(..., description="Department type")
    hospital_id: str = Field(..., description="Hospital ID")
    head_doctor_id: Optional[str] = Field(None, description="Head doctor ID")
    capacity: Optional[int] = Field(None, ge=1, description="Department capacity")
    description: Optional[str] = Field(None, description="Department description")


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    department_type: Optional[str] = None
    head_doctor_id: Optional[str] = None
    capacity: Optional[int] = Field(None, ge=1)
    description: Optional[str] = None


class ServicePriceResponse(BaseModel):
    id: str
    service: str
    department: Optional[str] = None
    price: float
    currency: str
    active: bool


class ServicePriceCreate(BaseModel):
    service: str
    department_id: Optional[str] = None
    price: float
    currency: str = "UZS"
    active: bool = True


class ServicePriceUpdate(BaseModel):
    service: Optional[str] = None
    department_id: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    active: Optional[bool] = None
