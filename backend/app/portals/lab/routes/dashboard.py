from __future__ import annotations

from typing import Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.common.auth.auth_service import AuthenticatedUser, require_lab_technician_access
from app.common.schemas.responses_enhanced import SuccessResponse
from app.portals.lab.schemas.dashboard import LabDashboardSummary
from app.db.session import get_db
from app.crud.lab_orders import lab_orders
from app.crud.lab_results import lab_results
from app.crud.lab_reports import lab_reports

router = APIRouter(prefix="/dashboard", tags=["Lab Dashboard"])


@router.get("/summary", response_model=SuccessResponse[LabDashboardSummary])
async def dashboard_summary(
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    # Get the current user's organization_id
    from app.common.models.user import User
    user = db.query(User).filter(User.id == current_user.user_id).first()
    organization_id = str(user.organization_id) if user and user.organization_id else None
    
    orders_stats = lab_orders.get_stats(db, organization_id=organization_id)
    res_stats = lab_results.get_stats(db, organization_id=organization_id)
    rpt_stats = lab_reports.get_stats(db, organization_id=organization_id)
    summary = LabDashboardSummary(
        orders_total=orders_stats.total,
        orders_pending=orders_stats.pending,
        orders_completed=orders_stats.completed,
        orders_urgent=orders_stats.urgent,
        orders_cancelled=orders_stats.cancelled,
        results_total=res_stats.total,
        results_completed=res_stats.completed,
        results_pending=res_stats.pending,
        results_abnormal=res_stats.abnormal,
        results_critical=res_stats.critical,
        reports_total=rpt_stats.total,
        reports_completed=rpt_stats.completed,
        reports_pending=rpt_stats.pending,
        reports_processing=rpt_stats.processing,
        reports_failed=rpt_stats.failed,
        reports_templates=rpt_stats.templates,
        reports_downloads=rpt_stats.downloads,
    )
    return SuccessResponse(data=summary, message="Dashboard summary")


