"""Lab orders routes backing the LabOrdersModule front-end."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status, Response
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from app.common.auth.auth_service import AuthenticatedUser, require_lab_technician_access
from app.db.session import get_db
from app.crud.lab_orders import lab_orders as lab_orders_crud, LabOrderStats as DbOrderStats
from app.common.models.lab_insurance import LabOrder as LabOrderModel
from app.portals.lab.schemas.orders import LabOrderCollection, LabOrder

router = APIRouter(prefix="/orders", tags=["Lab Orders"])



class LabOrderTest(BaseModel):
    id: str
    name: str
    category: str
    code: str
    cost: float = Field(..., ge=0)


class LabOrderTestCreate(BaseModel):
    id: Optional[str] = None
    name: str
    category: str
    code: str
    cost: float = Field(..., ge=0)


class LabOrderBase(BaseModel):
    patientName: str
    patientId: str
    age: int = Field(..., ge=0)
    gender: str
    orderDate: date
    orderTime: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    physician: str
    department: str
    status: str = Field(..., pattern=r"^[a-z\-]+$")
    priority: str = Field(..., pattern=r"^(urgent|routine)$")
    sampleType: str
    clinicalInfo: Optional[str] = None
    instructions: Optional[str] = None
    estimatedTime: Optional[str] = None
    totalCost: float = Field(..., ge=0)
    insurance: Optional[str] = None
    authorizedBy: Optional[str] = None
    notes: Optional[str] = None



class LabOrderCreate(LabOrderBase):
    id: Optional[str] = None
    tests: List[LabOrderTestCreate] = Field(default_factory=list)


class LabOrderUpdate(BaseModel):
    patientName: Optional[str] = None
    patientId: Optional[str] = None
    age: Optional[int] = Field(None, ge=0)
    gender: Optional[str] = None
    orderDate: Optional[date] = None
    orderTime: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    physician: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = Field(None, pattern=r"^[a-z\-]+$")
    priority: Optional[str] = Field(None, pattern=r"^(urgent|routine)$")
    sampleType: Optional[str] = None
    clinicalInfo: Optional[str] = None
    instructions: Optional[str] = None
    estimatedTime: Optional[str] = None
    totalCost: Optional[float] = Field(None, ge=0)
    insurance: Optional[str] = None
    authorizedBy: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        extra = "forbid"

    @validator("status")
    def validate_status(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            raise ValueError("Invalid status value")
        return value

    @validator("priority")
    def validate_priority(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            raise ValueError("Invalid priority value")
        return value


class LabOrder(LabOrderBase):
    id: str
    tests: List[LabOrderTest]
    createdAt: datetime
    updatedAt: datetime


class LabOrderCollection(BaseModel):
    items: List[LabOrder]
    total: int = Field(..., ge=0)
    pending: int = Field(..., ge=0)
    completed: int = Field(..., ge=0)
    urgent: int = Field(..., ge=0)
    cancelled: int = Field(..., ge=0)


class LabOrderStatusUpdate(BaseModel):
    status: str = Field(..., pattern=r"^[a-z\-]+$")

    @validator("status")
    def validate_status(cls, value: str) -> str:
        if value:
            raise ValueError("Invalid status value")
        return value


class LabOrderSort(str):
    ALLOWED = {"date", "patient", "priority", "status"}


class LabOrderStats(BaseModel):
    total: int
    pending: int
    completed: int
    urgent: int
    cancelled: int


# ──────────────────────────────────────────────────────────────────────────────
# Mapping helpers
# ──────────────────────────────────────────────────────────────────────────────


def _from_create(payload: LabOrderCreate) -> Dict[str, object]:
    return {
        "id": payload.id,
        "order_number": payload.id or None,
        "patient_id": payload.patientId,
        "ordering_provider": payload.physician,
        "priority": payload.priority,
        "status": payload.status,
        "samples": [{"type": payload.sampleType}] if payload.sampleType else None,
        "tests": [
            {
                "id": t.id,
                "name": t.name,
                "category": t.category,
                "code": t.code,
                "cost": t.cost,
            }
            for t in payload.tests
        ],
        "notes": payload.notes,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ──────────────────────────────────────────────────────────────────────────────

def _to_schema(db_order: LabOrderModel) -> LabOrder:
    """Convert database LabOrder model to Pydantic schema."""
    from datetime import date as date_type
    
    # Convert enum objects to their actual string values
    status_value = db_order.status.value if hasattr(db_order.status, 'value') else str(db_order.status)
    priority_value = db_order.priority.value if hasattr(db_order.priority, 'value') else str(db_order.priority)
    
    # Normalize status/priority to match frontend expectations
    status_value = status_value.lower().replace('_', '-') if status_value else 'pending'
    priority_value = priority_value.lower() if priority_value else 'routine'
    
    # Get patient data
    patient = db_order.patient if hasattr(db_order, 'patient') and db_order.patient else None
    patient_name = "Unknown Patient"
    patient_age = 0
    patient_gender = "Unknown"
    
    if patient:
        # Try to get name from user relationship first
        user = getattr(patient, 'user', None) if hasattr(patient, 'user') else None
        if user:
            first_name = getattr(user, 'first_name', '') or ''
            last_name = getattr(user, 'last_name', '') or ''
            patient_name = f"{first_name} {last_name}".strip() or "Unknown Patient"
        else:
            # Fallback: try direct patient fields (if they exist)
            patient_name = f"Patient {str(db_order.patient_id)[:8]}"
        
        # Calculate age from date of birth
        dob = getattr(patient, 'date_of_birth', None)
        if dob:
            if isinstance(dob, str):
                try:
                    dob = datetime.strptime(dob, '%Y-%m-%d').date()
                except:
                    dob = None
            if dob and isinstance(dob, date_type):
                today = date.today()
                # Simple age calculation
                patient_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        
        patient_gender = getattr(patient, 'sex', 'Unknown') or 'Unknown'
    
    # Get physician name
    physician = "Unknown"
    if hasattr(db_order, 'orderer') and db_order.orderer:
        first_name = getattr(db_order.orderer, 'first_name', '') or ''
        last_name = getattr(db_order.orderer, 'last_name', '') or ''
        physician = f"{first_name} {last_name}".strip() or "Unknown"
    elif db_order.ordered_by:
        physician = str(db_order.ordered_by)
    
    # Parse tests_ordered JSON
    tests = []
    if db_order.tests_ordered:
        if isinstance(db_order.tests_ordered, str):
            import json
            try:
                tests_data = json.loads(db_order.tests_ordered)
            except:
                tests_data = []
        else:
            tests_data = db_order.tests_ordered
        
        if isinstance(tests_data, list):
            for idx, test in enumerate(tests_data):
                if isinstance(test, dict):
                    tests.append(LabOrderTest(
                        id=str(test.get("id") or test.get("code") or f"T-{idx+1:03d}"),
                        name=str(test.get("name") or test.get("display") or "Unknown Test"),
                        category=str(test.get("category") or "general"),
                        code=str(test.get("code") or ""),
                        cost=float(test.get("cost") or 0.0),
                    ))
    
    # Calculate total cost
    total_cost = sum(t.cost for t in tests) if tests else 0.0
    
    # Get sample type
    sample_type = "Blood"  # Default
    if hasattr(db_order, 'specimen_type') and db_order.specimen_type:
        sample_type = str(db_order.specimen_type.value if hasattr(db_order.specimen_type, 'value') else db_order.specimen_type)
    
    # Get order date/time
    order_date = date.today()
    order_time = "00:00"
    if db_order.ordered_date:
        if isinstance(db_order.ordered_date, datetime):
            order_date = db_order.ordered_date.date()
            order_time = db_order.ordered_date.strftime("%H:%M")
        elif isinstance(db_order.ordered_date, date_type):
            order_date = db_order.ordered_date
    
    return LabOrder(
        id=str(db_order.id),
        orderNumber=db_order.order_number or "",
        patientName=patient_name,
        patientId=str(db_order.patient_id or ""),
        age=patient_age,
        gender=patient_gender,
        orderDate=order_date,
        orderTime=order_time,
        physician=physician,
        department="Lab",
        status=status_value,
        priority=priority_value,
        sampleType=sample_type,
        clinicalInfo=db_order.clinical_notes or db_order.clinical_indication or "",
        instructions=db_order.patient_instructions or db_order.lab_instructions or None,
        estimatedTime=None,
        totalCost=total_cost,
        insurance=None,
        authorizedBy=None,
        notes=db_order.notes or None,
        tests=tests,
        createdAt=db_order.created_at or datetime.now(),
        updatedAt=db_order.updated_at or datetime.now(),
    )


# ──────────────────────────────────────────────────────────────────────────────
# Routes (DB-backed)
# ──────────────────────────────────────────────────────────────────────────────


@router.get("", response_model=LabOrderCollection)
async def list_orders(
    search: Optional[str] = Query(None, description="Search across patient, order, physician"),
    status: str = Query("all"),
    priority: str = Query("all"),
    date_filter: str = Query("all", pattern=r"^(all|today|week)$"),
    tab: str = Query("all", pattern=r"^(all|pending|completed|urgent|cancelled)$"),
    sort: str = Query("date"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabOrderCollection:
    # Map date_filter to from/to
    today = date.today()
    date_from = None
    date_to = None
    if date_filter == "today":
        date_from = today
        date_to = today
    elif date_filter == "week":
        date_from = today - timedelta(days=6)
        date_to = today

    # Get the current user's organization_id
    from app.common.models.user import User
    user = db.query(User).filter(User.id == current_user.user_id).first()
    organization_id = str(user.organization_id) if user and user.organization_id else None

    skip = (page - 1) * size
    items_db = lab_orders_crud.list(
        db,
        search=search,
        status=None if status == "all" else status,
        priority=None if priority == "all" else priority,
        date_from=date_from,
        date_to=date_to,
        sort=sort,
        organization_id=organization_id,
        skip=skip,
        limit=size,
    )
    total = lab_orders_crud.count(
        db,
        search=search,
        status=None if status == "all" else status,
        priority=None if priority == "all" else priority,
        date_from=date_from,
        date_to=date_to,
        organization_id=organization_id,
    )
    stats: DbOrderStats = lab_orders_crud.get_stats(db, organization_id=organization_id)
    return LabOrderCollection(
        items=[_to_schema(o) for o in items_db],
        total=total,
        pending=stats.pending,
        completed=stats.completed,
        urgent=stats.urgent,
        cancelled=stats.cancelled,
    )


@router.get("/summary", response_model=LabOrderStats)
async def get_order_summary(
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabOrderStats:
    # Get the current user's organization_id
    from app.common.models.user import User
    user = db.query(User).filter(User.id == current_user.user_id).first()
    organization_id = str(user.organization_id) if user and user.organization_id else None
    
    stats = lab_orders_crud.get_stats(db, organization_id=organization_id)
    return LabOrderStats(
        total=stats.total,
        pending=stats.pending,
        completed=stats.completed,
        urgent=stats.urgent,
        cancelled=stats.cancelled,
    )


@router.post("", response_model=LabOrder, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: LabOrderCreate = Body(...),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabOrder:
    obj = lab_orders_crud.create(db, values=_from_create(payload))
    return _to_schema(obj)


@router.get("/{order_id}", response_model=LabOrder)
async def get_order(
    order_id: str,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabOrder:
    obj = lab_orders_crud.get(db, order_id=order_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return _to_schema(obj)


@router.put("/{order_id}", response_model=LabOrder)
async def replace_order(
    order_id: str,
    payload: LabOrderCreate,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabOrder:
    values = _from_create(payload)
    obj = lab_orders_crud.update(db, order_id=order_id, values=values)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return _to_schema(obj)


@router.patch("/{order_id}", response_model=LabOrder)
async def patch_order(
    order_id: str,
    payload: LabOrderUpdate,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabOrder:
    updates = payload.dict(exclude_none=True)
    mapped: Dict[str, object] = {}
    if "patientId" in updates:
        mapped["patient_id"] = updates.pop("patientId")
    if "physician" in updates:
        mapped["ordering_provider"] = updates.pop("physician")
    if "priority" in updates:
        mapped["priority"] = updates.pop("priority")
    if "status" in updates:
        mapped["status"] = updates.pop("status")
    if "sampleType" in updates:
        mapped["samples"] = [{"type": updates.pop("sampleType")}]
    if "notes" in updates:
        mapped["notes"] = updates.pop("notes")
    obj = lab_orders_crud.update(db, order_id=order_id, values=mapped)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return _to_schema(obj)


@router.post("/{order_id}/status", response_model=LabOrder)
async def update_order_status(
    order_id: str,
    payload: LabOrderStatusUpdate,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabOrder:
    obj = lab_orders_crud.update(db, order_id=order_id, values={"status": payload.status})
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return _to_schema(obj)


@router.post("/{order_id}/tests", response_model=LabOrder)
async def add_order_test(
    order_id: str,
    payload: LabOrderTestCreate,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> LabOrder:
    obj = lab_orders_crud.get(db, order_id=order_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    tests = list(obj.tests or [])
    test_id = payload.id or f"T-{len(tests) + 1:03d}"
    if any(str(t.get("id")) == test_id for t in tests):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Test id already exists")
    tests.append({"id": test_id, **payload.dict(exclude={"id"})})
    obj = lab_orders_crud.update(db, order_id=order_id, values={"tests": tests})
    return _to_schema(obj)


@router.delete(
    "/{order_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_order(
    order_id: str,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> Response:
    ok = lab_orders_crud.delete(db, order_id=order_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
