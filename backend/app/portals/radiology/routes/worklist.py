"""Radiology worklist routes backing the RadiologyWorklist component."""
from __future__ import annotations

from datetime import datetime, date, timedelta, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.common.auth.auth_service import AuthenticatedUser, require_radiologist_access
from app.common.schemas.responses_enhanced import SuccessResponse
from app.portals.radiology.schemas.worklist import (
    FinalReport,
    WorklistStudy,
    WorklistSummary,
    WorklistCollection,
    WorklistUpdate,
    AssignRequest,
    ReadingStatusRequest,
)
from app.db.session import get_db
from app.crud.radiology import worklist as worklist_crud, radiology_study
from app.common.models.radiology import RadiologyStudy as RadiologyStudyModel, WorklistAssignment

router = APIRouter(prefix="/worklist", tags=["Radiology Worklist"])


def _utc_now() -> datetime:
    """Return the current UTC timestamp."""
    return datetime.now(timezone.utc)


def _priority_order(priority: str) -> int:
    mapping = {"STAT": 3, "Urgent": 2, "Routine": 1}
    return mapping.get(priority, 0)


def _build_summary(items: List[WorklistStudy]) -> WorklistSummary:
    unread = sum(1 for i in items if i.readingStatus == "unread")
    reading = sum(1 for i in items if i.readingStatus == "reading")
    preliminary = sum(1 for i in items if i.readingStatus == "preliminary")
    final = sum(1 for i in items if i.readingStatus == "final")
    stat_count = sum(1 for i in items if i.priority == "STAT")
    urgent_count = sum(1 for i in items if i.priority == "Urgent")
    routine_count = sum(1 for i in items if i.priority == "Routine")

    by_modality: Dict[str, int] = {}
    by_assigned: Dict[str, int] = {}
    for i in items:
        by_modality[i.modality] = by_modality.get(i.modality, 0) + 1
        key = i.assignedRadiologist or "unassigned"
        by_assigned[key] = by_assigned.get(key, 0) + 1

    critical_count = sum(1 for i in items if i.criticalFlag)

    return WorklistSummary(
        total=len(items),
        unread=unread,
        reading=reading,
        preliminary=preliminary,
        final=final,
        statCount=stat_count,
        urgentCount=urgent_count,
        routineCount=routine_count,
        criticalCount=critical_count,
        byModality=by_modality,
        byAssigned=by_assigned,
    )


def _to_worklist_schema(study: RadiologyStudyModel, assignment: Optional[WorklistAssignment]) -> WorklistStudy:
    assigned_name = None
    if assignment and assignment.assigned_radiologist_id:
        assigned_name = assignment.assigned_radiologist_id  # display name resolution not available yet

    return WorklistStudy(
        id=str(study.id),
        accessionNumber=study.accession_number,
        patientName=study.patient_name or "",
        patientId=str(study.patient_id) if study.patient_id else "",
        mrn=study.mrn or "",
        age=study.age or 0,
        gender=study.gender or "O",
        dob=study.dob,
        studyDate=study.order_date,
        studyTime=study.order_date.strftime("%H:%M") if study.order_date else "",
        modality=study.modality,
        bodyPart=study.body_part,
        studyDescription=study.study_description,
        indication=study.indication or "",
        priority=study.priority,
        orderingPhysician=study.ordering_physician or "",
        technologist=study.technologist or "",
        status=study.status,
        readingStatus=(assignment.reading_status if assignment else "unread"),
        imageCount=(assignment.image_count if assignment else 0),
        seriesCount=(assignment.series_count if assignment else 0),
        studySize=(assignment.study_size if assignment else ""),
        contrast=bool(study.contrast),
        location=study.location or "",
        room=study.room or "",
        protocolName=(assignment.protocol_name if assignment else ""),
        assignedRadiologist=assigned_name,
        priorStudies=0,
        criticalFlag=(assignment.critical_flag if assignment else False),
        tags=(assignment.tags or [] if assignment else []),
        turnaroundTime=(assignment.turnaround_time if assignment else ""),
        estimatedReadTime=(assignment.estimated_read_time if assignment else ""),
        preliminaryFindings=(assignment.preliminary_findings if assignment else None),
        finalReport=None,
    )


def _filter_in_memory(
    *,
    items: List[WorklistStudy],
    status_filter: Optional[str],
    modality_filter: Optional[str],
    priority_filter: Optional[str],
    body_part_filter: Optional[str],
    physician_filter: Optional[str],
    time_range: Optional[str],
    search_value: Optional[str],
) -> List[WorklistStudy]:
    # Keep client-side filters; DB-level filters can be added later
    filtered = items
    if status_filter and status_filter != "all":
        filtered = [i for i in filtered if i.status == status_filter]
    if modality_filter and modality_filter != "all":
        filtered = [i for i in filtered if i.modality.lower() == modality_filter.lower()]
    if priority_filter and priority_filter != "all":
        filtered = [i for i in filtered if i.priority.lower() == priority_filter.lower()]
    if body_part_filter and body_part_filter != "all":
        filtered = [i for i in filtered if i.bodyPart.lower() == body_part_filter.lower()]
    if physician_filter:
        filtered = [i for i in filtered if i.orderingPhysician.lower() == physician_filter.lower()]
    if search_value:
        needle = search_value.lower()
        filtered = [
            i for i in filtered
            if needle in i.patientName.lower() or needle in i.accessionNumber.lower() or needle in i.mrn.lower()
        ]
    # Time range filter
    if time_range and time_range != "all":
        today = _utc_now().date()
        def within_range(d: date) -> bool:
            if time_range == "today":
                return d == today
            if time_range == "yesterday":
                return d == today - timedelta(days=1)
            if time_range == "week":
                start = today - timedelta(days=6)
                return start <= d <= today
            if time_range == "month":
                start = today.replace(day=1)
                return start <= d <= today
            return True
        filtered = [i for i in filtered if within_range(i.studyDate.astimezone(timezone.utc).date())]
    return filtered


def _sort_studies(studies: List[WorklistStudy], sort_by: str, sort_order: str) -> List[WorklistStudy]:
    reverse = sort_order == "desc"
    if sort_by == "priority":
        return sorted(studies, key=lambda s: _priority_order(s.priority), reverse=True)
    if sort_by == "time":
        return sorted(studies, key=lambda s: s.studyDate, reverse=reverse)
    if sort_by == "patient":
        return sorted(studies, key=lambda s: s.patientName.lower(), reverse=reverse)
    if sort_by == "modality":
        return sorted(studies, key=lambda s: s.modality.lower(), reverse=reverse)
    return studies


@router.get("", response_model=SuccessResponse[WorklistCollection])
async def list_worklist(
    status_filter: Optional[str] = Query(None, alias="status"),
    modality: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    body_part: Optional[str] = Query(None),
    physician: Optional[str] = Query(None),
    time_range: Optional[str] = Query("today", description="today|yesterday|week|month|all"),
    search: Optional[str] = Query(None),
    sort_by: str = Query("priority", pattern=r"^(priority|time|patient|modality)$"),
    sort_order: str = Query("desc", pattern=r"^(asc|desc)$"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    # Query DB: join assignments to studies; simple two-query approach
    db_studies: List[RadiologyStudyModel] = radiology_study.list(db, skip=0, limit=10_000)
    study_id_to_assignment: Dict[str, WorklistAssignment] = {}
    # Fetch assignments for all studies present
    assignments = db.query(WorklistAssignment).all()
    for a in assignments:
        study_id_to_assignment[str(a.study_id)] = a

    items = [_to_worklist_schema(s, study_id_to_assignment.get(str(s.id))) for s in db_studies]

    filtered = _filter_in_memory(
        items=items,
        status_filter=status_filter,
        modality_filter=modality,
        priority_filter=priority,
        body_part_filter=body_part,
        physician_filter=physician,
        time_range=time_range,
        search_value=search,
    )

    sorted_items = _sort_studies(filtered, sort_by, sort_order)

    total = len(sorted_items)
    start = (page - 1) * size
    end = start + size
    page_items = sorted_items[start:end]

    collection = WorklistCollection(
        items=[i.copy(deep=True) for i in page_items],
        total=total,
        page=page,
        size=size,
        summary=_build_summary(filtered),
    )
    return SuccessResponse(data=collection)


@router.get("/stats", response_model=SuccessResponse[WorklistSummary])
async def get_worklist_stats(
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    db_studies: List[RadiologyStudyModel] = radiology_study.list(db, skip=0, limit=10_000)
    study_id_to_assignment: Dict[str, WorklistAssignment] = {}
    assignments = db.query(WorklistAssignment).all()
    for a in assignments:
        study_id_to_assignment[str(a.study_id)] = a
    items = [_to_worklist_schema(s, study_id_to_assignment.get(str(s.id))) for s in db_studies]
    return SuccessResponse(data=_build_summary(items))


@router.get("/{study_id}", response_model=SuccessResponse[WorklistStudy])
async def get_worklist_study(
    study_id: str,
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    study = radiology_study.get(db, id=study_id)
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study not found")
    assignment = worklist_crud.get_by_study(db, study_id=study_id)
    return SuccessResponse(data=_to_worklist_schema(study, assignment))


@router.patch("/{study_id}", response_model=SuccessResponse[WorklistStudy])
async def patch_worklist_study(
    study_id: str,
    payload: WorklistUpdate = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    study = radiology_study.get(db, id=study_id)
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study not found")

    assignment = worklist_crud.get_by_study(db, study_id=study_id)
    if payload.assignedRadiologist is not None:
        assignment = worklist_crud.assign(db, study_id=study_id, radiologist_id=None)
    if payload.readingStatus is not None or payload.preliminaryFindings is not None:
        assignment = worklist_crud.update_reading_status(
            db,
            study_id=study_id,
            reading_status=payload.readingStatus or (assignment.reading_status if assignment else "unread"),
            preliminary_findings=payload.preliminaryFindings,
        )

    # The rest of fields are UI metadata; we don't persist them here
    return SuccessResponse(data=_to_worklist_schema(study, assignment))


@router.post("/{study_id}/assign", response_model=SuccessResponse[WorklistStudy])
async def assign_worklist_study(
    study_id: str,
    payload: AssignRequest = Body(default_factory=AssignRequest),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    study = radiology_study.get(db, id=study_id)
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study not found")

    worklist_crud.assign(db, study_id=study_id, radiologist_id=None)
    assignment = worklist_crud.get_by_study(db, study_id=study_id)
    return SuccessResponse(data=_to_worklist_schema(study, assignment))


@router.post("/{study_id}/reading-status", response_model=SuccessResponse[WorklistStudy])
async def update_reading_status(
    study_id: str,
    payload: ReadingStatusRequest,
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    study = radiology_study.get(db, id=study_id)
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study not found")

    assignment = worklist_crud.update_reading_status(
        db,
        study_id=study_id,
        reading_status=payload.readingStatus,
        preliminary_findings=payload.preliminaryFindings,
    )
    if not assignment:
        assignment = worklist_crud.get_by_study(db, study_id=study_id)
    return SuccessResponse(data=_to_worklist_schema(study, assignment))
