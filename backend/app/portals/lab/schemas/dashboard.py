from __future__ import annotations

from pydantic import BaseModel, Field


class LabDashboardSummary(BaseModel):
    orders_total: int = Field(..., ge=0)
    orders_pending: int = Field(..., ge=0)
    orders_completed: int = Field(..., ge=0)
    orders_urgent: int = Field(..., ge=0)
    orders_cancelled: int = Field(..., ge=0)

    results_total: int = Field(..., ge=0)
    results_completed: int = Field(..., ge=0)
    results_pending: int = Field(..., ge=0)
    results_abnormal: int = Field(..., ge=0)
    results_critical: int = Field(..., ge=0)

    reports_total: int = Field(..., ge=0)
    reports_completed: int = Field(..., ge=0)
    reports_pending: int = Field(..., ge=0)
    reports_processing: int = Field(..., ge=0)
    reports_failed: int = Field(..., ge=0)
    reports_templates: int = Field(..., ge=0)
    reports_downloads: int = Field(..., ge=0)
