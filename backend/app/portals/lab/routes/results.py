"""Lab results routes powering the LabResultsModule UI."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status, Response
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from app.common.auth.auth_service import AuthenticatedUser, require_lab_technician_access
from app.db.session import get_db
from app.crud.lab_results import lab_results as lab_results_crud, LabResultStats as DbResultStats
from app.common.models.lab_insurance import LabResult as LabResultModel

router = APIRouter(prefix="/results", tags=["Lab Results"])

_ALLOWED_RESULT_STATUS = {"completed", "pending", "abnormal", "critical"}
_ALLOWED_PRIORITY = {"urgent", "routine"}


class LabResultValue(BaseModel):
    test: str
    value: str
    unit: str
    range: str
    status: Optional[str] = None
    trend: Optional[str] = None


class LabResultBase(BaseModel):
    patientName: str
    patientId: str
    orderId: str
    testType: str
    testCategory: str
    orderDate: date
    completedDate: Optional[date] = None
    time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    physician: str
    status: str = Field(..., pattern=r"^[a-z\-]+$")
    priority: str = Field(..., pattern=r"^(urgent|routine)$")
    technician: Optional[str] = None
    results: List[LabResultValue] = Field(default_factory=list)
    flags: List[str] = Field(default_factory=list)
    notes: Optional[str] = None

    @validator("status")
    def validate_status(cls, value: str) -> str:
        if value not in _ALLOWED_RESULT_STATUS:
            raise ValueError("Invalid result status")
        return value

    @validator("priority")
    def validate_priority(cls, value: str) -> str:
        if value not in _ALLOWED_PRIORITY:
            raise ValueError("Invalid priority value")
        return value


class LabResultCreate(LabResultBase):
    id: Optional[str] = None


class LabResultUpdate(BaseModel):
    patientName: Optional[str] = None
    patientId: Optional[str] = None
    orderId: Optional[str] = None
    testType: Optional[str] = None
    testCategory: Optional[str] = None
    orderDate: Optional[date] = None
    completedDate: Optional[date] = None
    time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    physician: Optional[str] = None
    status: Optional[str] = Field(None, pattern=r"^[a-z\-]+$")
    priority: Optional[str] = Field(None, pattern=r"^(urgent|routine)$")
    technician: Optional[str] = None
    results: Optional[List[LabResultValue]] = None
    flags: Optional[List[str]] = None
    notes: Optional[str] = None

    class Config:
        extra = "forbid"

    @validator("status")
    def validate_status(cls, value: Optional[str]) -> Optional[str]:
        if value and value not in _ALLOWED_RESULT_STATUS:
            raise ValueError("Invalid result status")
        return value

    @validator("priority")
    def validate_priority(cls, value: Optional[str]) -> Optional[str]:
        if value and value not in _ALLOWED_PRIORITY:
            raise ValueError("Invalid priority value")
        return value


class LabResult(LabResultBase):
    id: str
    createdAt: datetime
    updatedAt: datetime


class LabResultCollection(BaseModel):
    items: List[LabResult]
    total: int = Field(..., ge=0)
    abnormal: int = Field(..., ge=0)
    critical: int = Field(..., ge=0)
    pending: int = Field(..., ge=0)


class LabResultStats(BaseModel):
    total: int
    completed: int
    pending: int
    abnormal: int
    critical: int


class LabResultStatusUpdate(BaseModel):
    status: str = Field(..., pattern=r"^[a-z\-]+$")

    @validator("status")
    def validate_status(cls, value: str) -> str:
        if value not in _ALLOWED_RESULT_STATUS:
            raise ValueError("Invalid result status")
        return value


# ──────────────────────────────────────────────────────────────────────────────
# Mapping helpers
# ──────────────────────────────────────────────────────────────────────────────

def _get_patient_name(patient_id: str) -> str:
    """Get patient name from patient ID."""
    try:
        from app.db.session import SessionLocal
        from app.common.models.patient import Patient
        
        db = SessionLocal()
        try:
            patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
            if patient:
                first_name = patient.first_name or ''
                last_name = patient.last_name or ''
                name = f"{first_name} {last_name}".strip()
                return name if name else f"Patient {patient_id}"
        finally:
            db.close()
    except Exception:
        pass
    return f"Patient {patient_id}"

def _to_schema(db_obj: LabResultModel) -> LabResult:
    created = db_obj.created_at or datetime.utcnow()
    analyzed = db_obj.resulted_date or created
    
    # Create a single result value from the database fields
    result_value = LabResultValue(
        test=db_obj.test_name or "",
        value=str(db_obj.result_value or ""),
        unit=str(db_obj.result_unit or ""),
        range=str(db_obj.reference_range or ""),
        status="high" if db_obj.is_abnormal and db_obj.abnormality_type == "HIGH" else 
               "low" if db_obj.is_abnormal and db_obj.abnormality_type == "LOW" else
               "critical" if db_obj.is_critical else "normal",
    )
    
    # Determine flags based on abnormality
    flags = []
    if db_obj.is_abnormal:
        flags.append("abnormal")
    if db_obj.is_critical:
        flags.append("critical")
    
    return LabResult(
        id=str(db_obj.id),
        patientName=_get_patient_name(db_obj.patient_id),  # Get patient name from database
        patientId=str(db_obj.patient_id),
        orderId=str(db_obj.lab_order_id or ""),
        testType=db_obj.test_name or "",
        testCategory=db_obj.test_category or "",
        orderDate=created.date(),
        completedDate=analyzed.date() if analyzed else None,
        time=analyzed.time().strftime("%H:%M") if analyzed else created.time().strftime("%H:%M"),
        physician="",  # Will be populated by joining with orders table
        status="completed" if str(db_obj.status) in ["final", "completed"] else 
               "pending" if str(db_obj.status) in ["in_progress", "pending"] else
               "abnormal" if db_obj.is_abnormal else
               "critical" if db_obj.is_critical else "completed",
        priority="urgent" if db_obj.is_critical else "routine",
        technician=db_obj.performed_by,
        results=[result_value],
        flags=flags,
        notes=db_obj.comments,
        createdAt=db_obj.created_at or created,
        updatedAt=db_obj.updated_at or created,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Routes (DB-backed)
# ──────────────────────────────────────────────────────────────────────────────


@router.get("", response_model=LabResultCollection)
async def list_results(
    search: Optional[str] = Query(None),
    status: str = Query("all"),
    test_category: str = Query("all"),
    date_filter: str = Query("all", pattern=r"^(all|today|week)$"),
    tab: str = Query("all", pattern=r"^(all|abnormal|critical|pending)$"),
    sort: str = Query("date", pattern=r"^(date|patient|test)$"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabResultCollection:
    # For now, we support simple filters by status; search/category can be added by extending model
    analyzed_from = None
    analyzed_to = None
    if date_filter == "today":
        today = datetime.utcnow().date()
        analyzed_from = datetime.combine(today, datetime.min.time())
        analyzed_to = datetime.combine(today, datetime.max.time())
    elif date_filter == "week":
        today = datetime.utcnow().date()
        start = today - timedelta(days=6)
        analyzed_from = datetime.combine(start, datetime.min.time())
        analyzed_to = datetime.combine(today, datetime.max.time())

    # Get the current user's organization_id
    from app.common.models.user import User
    user = db.query(User).filter(User.id == current_user.user_id).first()
    organization_id = str(user.organization_id) if user and user.organization_id else None
    
    skip = (page - 1) * size
    items_db = lab_results_crud.list(
        db,
        status=None if status == "all" else status,
        analyzed_from=analyzed_from,
        analyzed_to=analyzed_to,
        organization_id=organization_id,
        skip=skip,
        limit=size,
    )
    total = lab_results_crud.count(db, status=None if status == "all" else status, organization_id=organization_id)
    # Compute counts from stats helper
    stats: DbResultStats = lab_results_crud.get_stats(db, organization_id=organization_id)
    return LabResultCollection(
        items=[_to_schema(r) for r in items_db],
        total=total,
        abnormal=stats.abnormal,
        critical=stats.critical,
        pending=stats.pending,
    )


@router.get("/summary", response_model=LabResultStats)
async def get_results_summary(
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabResultStats:
    # Get the current user's organization_id
    from app.common.models.user import User
    user = db.query(User).filter(User.id == current_user.user_id).first()
    organization_id = str(user.organization_id) if user and user.organization_id else None
    
    stats = lab_results_crud.get_stats(db, organization_id=organization_id)
    return LabResultStats(
        total=stats.total,
        completed=stats.completed,
        pending=stats.pending,
        abnormal=stats.abnormal,
        critical=stats.critical,
    )


@router.post("", response_model=LabResult, status_code=status.HTTP_201_CREATED)
async def create_result(
    payload: LabResultCreate = Body(...),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabResult:
    values = {
        "order_id": payload.orderId,
        "patient_id": payload.patientId,
        "status": payload.status,
        "values": [
            {"name": v.test, "value": v.value, "unit": v.unit, "refRange": v.range, "flag": v.status}
            for v in payload.results
        ],
        "comments": payload.notes,
        "analyzed_at": datetime.utcnow(),
    }
    obj = lab_results_crud.create(db, values=values)
    return _to_schema(obj)


@router.get("/{result_id}", response_model=LabResult)
async def get_result(
    result_id: str,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabResult:
    obj = lab_results_crud.get(db, result_id=result_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not found")
    return _to_schema(obj)


@router.put("/{result_id}", response_model=LabResult)
async def replace_result(
    result_id: str,
    payload: LabResultCreate,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabResult:
    values = {
        "order_id": payload.orderId,
        "patient_id": payload.patientId,
        "status": payload.status,
        "values": [
            {"name": v.test, "value": v.value, "unit": v.unit, "refRange": v.range, "flag": v.status}
            for v in payload.results
        ],
        "comments": payload.notes,
        "analyzed_at": datetime.utcnow(),
    }
    obj = lab_results_crud.update(db, result_id=result_id, values=values)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not found")
    return _to_schema(obj)


@router.patch("/{result_id}", response_model=LabResult)
async def patch_result(
    result_id: str,
    payload: LabResultUpdate,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabResult:
    updates = payload.dict(exclude_none=True)
    mapped: Dict[str, object] = {}
    if "patientId" in updates:
        mapped["patient_id"] = updates.pop("patientId")
    if "orderId" in updates:
        mapped["order_id"] = updates.pop("orderId")
    if "status" in updates:
        mapped["status"] = updates.pop("status")
    if "results" in updates:
        mapped["values"] = [
            {"name": v.test, "value": v.value, "unit": v.unit, "refRange": v.range, "flag": v.status}
            for v in updates.pop("results")
        ]
    if "notes" in updates:
        mapped["comments"] = updates.pop("notes")
    obj = lab_results_crud.update(db, result_id=result_id, values=mapped)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not found")
    return _to_schema(obj)


@router.post("/{result_id}/status", response_model=LabResult)
async def update_result_status(
    result_id: str,
    payload: LabResultStatusUpdate,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabResult:
    obj = lab_results_crud.update(db, result_id=result_id, values={"status": payload.status})
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not found")
    return _to_schema(obj)


@router.delete(
    "/{result_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_result(
    result_id: str,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> Response:
    ok = lab_results_crud.delete(db, result_id=result_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
