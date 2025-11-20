from __future__ import annotations

from typing import Dict

from pydantic import BaseModel, Field


class LabDashboardSummary(BaseModel):
    total: int = Field(..., ge=0)
    notReceived: int = Field(..., ge=0)
    pending: int = Field(..., ge=0)
    ready: int = Field(..., ge=0)
    sent: int = Field(..., ge=0)


class KeyValueCounts(BaseModel):
    counts: Dict[str, int] = Field(default_factory=dict)





