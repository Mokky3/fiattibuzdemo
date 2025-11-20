from __future__ import annotations

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field


class NurseTaskBase(BaseModel):
    patient: str
    room: Optional[str] = None
    task: str
    description: Optional[str] = None
    priority: str = Field(..., pattern=r"^(high|medium|low)$")
    status: str = Field(..., pattern=r"^[a-z\-]+$")
    scheduledTime: Optional[str] = None
    estimatedDuration: Optional[str] = None
    assignedBy: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None


class NurseTaskCreate(NurseTaskBase):
    pass


class NurseTaskUpdate(BaseModel):
    patient: Optional[str] = None
    room: Optional[str] = None
    task: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = Field(None, pattern=r"^(high|medium|low)$")
    status: Optional[str] = Field(None, pattern=r"^[a-z\-]+$")
    scheduledTime: Optional[str] = None
    estimatedDuration: Optional[str] = None
    assignedBy: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        extra = "forbid"


class NurseTask(NurseTaskBase):
    id: str


class NurseTaskCollection(BaseModel):
    items: List[NurseTask]
    total: int