"""Radiology studies routes backing the RadiologyStudies component."""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.common.auth.auth_service import AuthenticatedUser, require_radiologist_access
from app.common.schemas.responses_enhanced import SuccessResponse
from app.db.session import get_db
from app.crud.radiology import radiology_study as radiology_study_crud
from app.common.models.radiology import RadiologyStudy as RadiologyStudyModel
from app.portals.radiology.schemas.studies import (
    RadiologyStudy,
    RadiologyStudyCreate,
    RadiologyStudyUpdate,
    RadiologyStudySummary,
    RadiologyStudyCollection,
)

router = APIRouter(prefix="/studies", tags=["Radiology Studies"])


def _utc_now() -> datetime:
    """Return the current UTC timestamp."""
    return datetime.now(timezone.utc)


def _to_schema(db_obj: RadiologyStudyModel) -> RadiologyStudy:
    return RadiologyStudy(
        id=str(db_obj.id),
        accessionNumber=db_obj.accession_number,
        patientName=db_obj.patient_name or "",
        mrn=db_obj.mrn or "",
        age=db_obj.age or 0,
        gender=db_obj.gender or "O",
        dob=db_obj.dob,
        phone="",  # not stored on study model
        email="",
        address="",
        orderDate=db_obj.order_date,
        scheduledDate=db_obj.scheduled_date,
        modality=db_obj.modality,
        bodyPart=db_obj.body_part,
        studyDescription=db_obj.study_description,
        indication=db_obj.indication or "",
        priority=db_obj.priority,
        status=db_obj.status,
        orderingPhysician=db_obj.ordering_physician or "",
        technologist=db_obj.technologist or "",
        location=db_obj.location or "",
        room=db_obj.room or "",
        contrast=bool(db_obj.contrast),
        preparation=db_obj.preparation or None,
        duration=db_obj.duration_minutes or 0,
        notes=db_obj.notes or None,
        insurance=db_obj.insurance or "",
        authorization=db_obj.authorization or "",
        cptCode=db_obj.cpt_code or "",
        createdAt=db_obj.created_at,
        updatedAt=db_obj.updated_at,
    )


def _calculate_summary(studies: List[RadiologyStudy]) -> RadiologyStudySummary:
    today = _utc_now().date()
    status_counts: Dict[str, int] = {}
    priority_counts: Dict[str, int] = {}
    modality_counts: Dict[str, int] = {}
    scheduled_today = 0

    for study in studies:
        status_counts[study.status] = status_counts.get(study.status, 0) + 1
        priority_counts[study.priority] = priority_counts.get(study.priority, 0) + 1
        modality_counts[study.modality] = modality_counts.get(study.modality, 0) + 1
        if study.scheduledDate.astimezone(timezone.utc).date() == today:
            scheduled_today += 1

    return RadiologyStudySummary(
        total=len(studies),
        statusCounts=status_counts,
        priorityCounts=priority_counts,
        modalityCounts=modality_counts,
        scheduledToday=scheduled_today,
        statPriority=priority_counts.get("STAT", 0),
    )


@router.get("", response_model=SuccessResponse[RadiologyStudyCollection])
async def list_studies(
    status: Optional[str] = Query(None, description="Filter by status"),
    modality: Optional[str] = Query(None, description="Filter by modality"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    search: Optional[str] = Query(None, description="Search by patient, MRN, or accession"),
    scheduled_from: Optional[date] = Query(None, description="Scheduled date from (inclusive)"),
    scheduled_to: Optional[date] = Query(None, description="Scheduled date to (inclusive)"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=200, description="Page size"),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    skip = (page - 1) * size
    rows = radiology_study_crud.list(
        db,
        status=status,
        modality=modality,
        priority=priority,
        search=search,
        scheduled_from=scheduled_from,
        scheduled_to=scheduled_to,
        skip=skip,
        limit=size,
    )

    # For total and summary, do a count by listing without pagination (bounded)
    all_rows = radiology_study_crud.list(
        db,
        status=status,
        modality=modality,
        priority=priority,
        search=search,
        scheduled_from=scheduled_from,
        scheduled_to=scheduled_to,
        skip=0,
        limit=10_000,
    )

    items = [_to_schema(r) for r in rows]
    all_items = [_to_schema(r) for r in all_rows]

    collection = RadiologyStudyCollection(
        items=items,
        total=len(all_items),
        page=page,
        size=size,
        summary=_calculate_summary(all_items),
    )
    return SuccessResponse(data=collection, message="Studies retrieved")


@router.get("/stats", response_model=SuccessResponse[RadiologyStudySummary])
async def get_study_stats(
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    rows = radiology_study_crud.list(db, skip=0, limit=10_000)
    return SuccessResponse(data=_calculate_summary([_to_schema(r) for r in rows]))


@router.get("/{study_id}", response_model=SuccessResponse[RadiologyStudy])
async def get_study(
    study_id: str,
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    study = radiology_study_crud.get(db, id=study_id)
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study not found")
    return SuccessResponse(data=_to_schema(study))


@router.post("", response_model=SuccessResponse[RadiologyStudy], status_code=status.HTTP_201_CREATED)
async def create_study(
    payload: RadiologyStudyCreate = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    # Enforce unique accession_number
    data = {
        "accession_number": payload.accessionNumber,
        "patient_id": None,  # unknown linkage at creation from UI; may be set via other flows
        "mrn": payload.mrn,
        "patient_name": payload.patientName,
        "age": payload.age,
        "gender": payload.gender,
        "dob": payload.dob,
        "order_date": payload.orderDate,
        "scheduled_date": payload.scheduledDate,
        "modality": payload.modality,
        "body_part": payload.bodyPart,
        "study_description": payload.studyDescription,
        "indication": payload.indication,
        "priority": payload.priority,
        "status": payload.status,
        "ordering_physician": payload.orderingPhysician,
        "technologist": payload.technologist,
        "location": payload.location,
        "room": payload.room,
        "contrast": payload.contrast,
        "preparation": payload.preparation,
        "duration_minutes": payload.duration,
        "notes": payload.notes,
        "insurance": payload.insurance,
        "authorization": payload.authorization,
        "cpt_code": payload.cptCode,
    }
    try:
        study = radiology_study_crud.create_with_accession(db, data=data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return SuccessResponse(data=_to_schema(study), message="Study created")


@router.put("/{study_id}", response_model=SuccessResponse[RadiologyStudy])
async def replace_study(
    study_id: str,
    payload: RadiologyStudyCreate = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    existing = radiology_study_crud.get(db, id=study_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study not found")

    # Ensure unique accession across other studies
    other = radiology_study_crud.get_by_accession(db, accession_number=payload.accessionNumber)
    if other and str(other.id) != str(study_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Study with accession already exists")

    updated = radiology_study_crud.update(
        db,
        db_obj=existing,
        obj_in={
            "accession_number": payload.accessionNumber,
            "mrn": payload.mrn,
            "patient_name": payload.patientName,
            "age": payload.age,
            "gender": payload.gender,
            "dob": payload.dob,
            "order_date": payload.orderDate,
            "scheduled_date": payload.scheduledDate,
            "modality": payload.modality,
            "body_part": payload.bodyPart,
            "study_description": payload.studyDescription,
            "indication": payload.indication,
            "priority": payload.priority,
            "status": payload.status,
            "ordering_physician": payload.orderingPhysician,
            "technologist": payload.technologist,
            "location": payload.location,
            "room": payload.room,
            "contrast": payload.contrast,
            "preparation": payload.preparation,
            "duration_minutes": payload.duration,
            "notes": payload.notes,
            "insurance": payload.insurance,
            "authorization": payload.authorization,
            "cpt_code": payload.cptCode,
        },
    )
    return SuccessResponse(data=_to_schema(updated), message="Study replaced")


@router.patch("/{study_id}", response_model=SuccessResponse[RadiologyStudy])
async def patch_study(
    study_id: str,
    payload: RadiologyStudyUpdate = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    existing = radiology_study_crud.get(db, id=study_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study not found")

    updates = payload.dict(exclude_none=True)
    obj_in: Dict[str, object] = {}

    mapping = {
        "accessionNumber": "accession_number",
        "patientName": "patient_name",
        "mrn": "mrn",
        "age": "age",
        "gender": "gender",
        "dob": "dob",
        "orderDate": "order_date",
        "scheduledDate": "scheduled_date",
        "modality": "modality",
        "bodyPart": "body_part",
        "studyDescription": "study_description",
        "indication": "indication",
        "priority": "priority",
        "status": "status",
        "orderingPhysician": "ordering_physician",
        "technologist": "technologist",
        "location": "location",
        "room": "room",
        "contrast": "contrast",
        "preparation": "preparation",
        "duration": "duration_minutes",
        "notes": "notes",
        "insurance": "insurance",
        "authorization": "authorization",
        "cptCode": "cpt_code",
    }

    for k, v in updates.items():
        if k in mapping:
            obj_in[mapping[k]] = v

    updated = radiology_study_crud.update(db, db_obj=existing, obj_in=obj_in)
    return SuccessResponse(data=_to_schema(updated), message="Study updated")


@router.delete("/{study_id}", response_model=SuccessResponse[Dict[str, str]])
async def delete_study(
    study_id: str,
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    existing = radiology_study_crud.get(db, id=study_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study not found")
    radiology_study_crud.remove(db, id=study_id)
    return SuccessResponse(data={"status": "deleted"}, message="Study deleted")
