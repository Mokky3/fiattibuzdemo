from __future__ import annotations

from typing import Dict, Optional

from pydantic import BaseModel, Field


class NurseDashboardSummary(BaseModel):
    patients_total: int = Field(..., ge=0)
    medications_due: int = Field(..., ge=0)
    vitals_pending: int = Field(..., ge=0)
    tasks_completed: int = Field(..., ge=0)


class KeyValueCounts(BaseModel):
    counts: Dict[str, int] = Field(default_factory=dict)





