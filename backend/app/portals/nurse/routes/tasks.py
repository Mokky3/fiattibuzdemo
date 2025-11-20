from __future__ import annotations

from datetime import date
from typing import Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status

from app.common.auth.auth_service import AuthenticatedUser, require_nurse_access
from app.common.schemas.responses_enhanced import SuccessResponse
from app.portals.nurse.schemas.tasks import (
    NurseTask,
    NurseTaskCreate,
    NurseTaskUpdate,
    NurseTaskCollection,
)
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.crud.nurse_tasks import nurse_tasks
from app.common.models.patient import Patient

router = APIRouter(prefix="/tasks", tags=["Nurse Tasks"])


_ALLOWED_STATUS = {"pending", "in-progress", "completed", "overdue"}
_ALLOWED_PRIORITY = {"high", "medium", "low"}


@router.get("", response_model=SuccessResponse[NurseTaskCollection])
async def list_tasks(
    search: Optional[str] = Query(None),
    status: str = Query("all"),
    priority: str = Query("all"),
    date_filter: Optional[date] = Query(None),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    items_db = nurse_tasks.list_tasks(
        db,
        nurse_id=current_user.user_id,
        status=None if status == "all" else status,
        priority=None if priority == "all" else priority,
        on_date=date_filter,
    )
    items = []
    for t in items_db:
        # Get patient name
        patient_name = ""
        if t.patient_id:
            patient = db.query(Patient).filter(Patient.patient_id == t.patient_id).first()
            if patient:
                patient_name = f"{patient.first_name} {patient.last_name}"
            else:
                patient_name = f"Patient {str(t.patient_id)[:8]}"
        
        items.append(NurseTask(
            id=str(t.id),
            patient=patient_name,
            room=None,
            task=t.description,
            description=t.notes,
            priority=t.priority,
            status=("completed" if t.completed else "pending"),
            scheduledTime=None,
            estimatedDuration=None,
            assignedBy=None,
            category=t.category,
            notes=t.notes,
        ))
    collection = NurseTaskCollection(items=items, total=len(items))
    return SuccessResponse(data=collection, message="Tasks retrieved")


@router.post("", response_model=SuccessResponse[NurseTask], status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: NurseTaskCreate = Body(...),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    obj = nurse_tasks.create(
        db,
        nurse_id=current_user.user_id,
        description=payload.task,
        priority=payload.priority,
        patient_id=payload.patient,
        category=payload.category,
        date_str=payload.date.isoformat() if payload.date else None,
        notes=payload.notes,
    )
    dto = NurseTask(
        id=str(obj.id),
        patient=str(obj.patient_id) if obj.patient_id else "",
        room=None,
        task=obj.description,
        description=obj.notes,
        priority=obj.priority,
        status=("completed" if obj.completed else "pending"),
        scheduledTime=None,
        estimatedDuration=None,
        assignedBy=None,
        category=obj.category,
        notes=obj.notes,
        date=date.fromisoformat(obj.date) if obj.date else None,
    )
    return SuccessResponse(data=dto, message="Task created")


@router.get("/{task_id}", response_model=SuccessResponse[NurseTask])
async def get_task(
    task_id: str,
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    obj = nurse_tasks.get(db, task_id=task_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    dto = NurseTask(
        id=str(obj.id),
        patient=str(obj.patient_id) if obj.patient_id else "",
        room=None,
        task=obj.description,
        description=obj.notes,
        priority=obj.priority,
        status=("completed" if obj.completed else "pending"),
        scheduledTime=None,
        estimatedDuration=None,
        assignedBy=None,
        category=obj.category,
        notes=obj.notes,
        date=date.fromisoformat(obj.date) if obj.date else None,
    )
    return SuccessResponse(data=dto, message="Task retrieved")


@router.patch("/{task_id}", response_model=SuccessResponse[NurseTask])
async def patch_task(
    task_id: str,
    payload: NurseTaskUpdate,
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    values = payload.dict(exclude_none=True)
    # Map schema fields to Todo fields
    mapping = {
        "task": "description",
        "notes": "notes",
        "priority": "priority",
        "category": "category",
        "date": "date",
        "patient": "patient_id",
    }
    mapped = {mapping.get(k, k): (v.isoformat() if k == "date" and v else v) for k, v in values.items()}
    obj = nurse_tasks.update(db, task_id=task_id, values=mapped)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    dto = NurseTask(
        id=str(obj.id),
        patient=str(obj.patient_id) if obj.patient_id else "",
        room=None,
        task=obj.description,
        description=obj.notes,
        priority=obj.priority,
        status=("completed" if obj.completed else "pending"),
        scheduledTime=None,
        estimatedDuration=None,
        assignedBy=None,
        category=obj.category,
        notes=obj.notes,
        date=date.fromisoformat(obj.date) if obj.date else None,
    )
    return SuccessResponse(data=dto, message="Task updated")


@router.post("/{task_id}/status", response_model=SuccessResponse[NurseTask])
async def update_task_status(
    task_id: str,
    payload: dict = Body(...),
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    new_status = payload.get("status")
    if not new_status:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Missing status")
    obj = nurse_tasks.toggle_completed(db, task_id=task_id, completed=(new_status == "completed"))
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    dto = NurseTask(
        id=str(obj.id),
        patient=str(obj.patient_id) if obj.patient_id else "",
        room=None,
        task=obj.description,
        description=obj.notes,
        priority=obj.priority,
        status=("completed" if obj.completed else "pending"),
        scheduledTime=None,
        estimatedDuration=None,
        assignedBy=None,
        category=obj.category,
        notes=obj.notes,
        date=date.fromisoformat(obj.date) if obj.date else None,
    )
    return SuccessResponse(data=dto, message="Task status updated")


@router.delete("/{task_id}", response_model=SuccessResponse[Dict[str, str]])
async def delete_task(
    task_id: str,
    current_user: AuthenticatedUser = Depends(require_nurse_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    ok = nurse_tasks.delete(db, task_id=task_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return SuccessResponse(data={"status": "deleted"}, message="Task deleted")





