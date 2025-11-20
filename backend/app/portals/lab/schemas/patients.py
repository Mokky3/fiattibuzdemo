from __future__ import annotations

from typing import List
from pydantic import BaseModel, Field


class LabTestResult(BaseModel):
    test: str
    value: str
    unit: str
    range: str
    status: str


class LabTestRecord(BaseModel):
    id: str
    date: str
    time: str
    type: str
    description: str
    physician: str
    status: str
    results: List[LabTestResult] = Field(default_factory=list)


class LabPatientSummary(BaseModel):
    id: str
    name: str
    avatar: str
    age: int
    gender: str
    lastMeasured: str
    recentTests: int = Field(..., ge=0)


class LabPatientDetail(BaseModel):
    id: str
    name: str
    dateOfBirth: str
    age: int
    gender: str
    bloodGroup: str
    rhFactor: str
    height: str
    weight: str
    bmi: str
    lastMeasured: str
    address: str
    temporaryAddress: str
    workPlace: str
    occupation: str
    avatar: str
    recentTests: List[LabTestRecord] = Field(default_factory=list)


class LabPatientsCollection(BaseModel):
    items: List[LabPatientSummary]
    total: int = Field(..., ge=0)
    recentCount: int = Field(..., ge=0)
