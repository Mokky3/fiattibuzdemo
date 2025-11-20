from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Body, HTTPException
from sqlalchemy.orm import Session

from app.common.auth.auth_service import AuthenticatedUser, require_radiologist_access
from app.common.schemas.radiology import RadiologyReport, RadiologyReportCreate
from app.db.session import get_db
from app.crud.radiology import radiology_report
from app.common.models.radiology import RadiologyReport as RadiologyReportModel

router = APIRouter(prefix="/reports", tags=["Radiology Reports"])


def _to_schema(db_obj: RadiologyReportModel) -> RadiologyReport:
    return RadiologyReport(
        id=str(db_obj.id),
        studyId=str(db_obj.study_id),
        radiologistId=str(db_obj.radiologist_id) if db_obj.radiologist_id else None,
        reportDate=db_obj.report_date,
        findings=db_obj.findings,
        impression=db_obj.impression,
        recommendations=db_obj.recommendations,
        isCritical=db_obj.is_critical,
        status=db_obj.status,
    )


@router.get("", response_model=List[RadiologyReport])
async def reports_list(
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> List[RadiologyReport]:
    rows = db.query(RadiologyReportModel).order_by(RadiologyReportModel.report_date.desc()).all()
    return [_to_schema(r) for r in rows]


@router.post("", response_model=RadiologyReport)
async def reports_create(
    payload: RadiologyReportCreate = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> RadiologyReport:
    obj = radiology_report.create_or_replace(
        db,
        study_id=payload.studyId,
        radiologist_id=getattr(current_user, "user_id", None),
        findings=payload.findings,
        impression=payload.impression,
        recommendations=payload.recommendations,
        is_critical=payload.isCritical,
    )
    return _to_schema(obj)





