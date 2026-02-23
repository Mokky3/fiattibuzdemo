from __future__ import annotations

from datetime import datetime, date
from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, cast, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

from app.common.models.lab_insurance import LabResult, LabOrder
from app.common.models.doctor import Doctor, doctor_hospitals


class LabResultStats:
    def __init__(self, total: int, completed: int, pending: int, abnormal: int, critical: int) -> None:
        self.total = total
        self.completed = completed
        self.pending = pending
        self.abnormal = abnormal
        self.critical = critical


class CRUDLabResults:
    """CRUD operations for lab results with filtering and stats."""

    def get(self, db: Session, *, result_id: str) -> Optional[LabResult]:
        return db.query(LabResult).filter(LabResult.id == result_id).first()

    def list(
        self,
        db: Session,
        *,
        order_id: Optional[str] = None,
        patient_id: Optional[str] = None,
        status: Optional[str] = None,
        analyzed_from: Optional[datetime] = None,
        analyzed_to: Optional[datetime] = None,
        organization_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[LabResult]:
        query = db.query(LabResult)
        
        # Filter by organization: join through LabOrder -> Doctor -> doctor_hospitals -> Hospital
        # Only show results that have orders from doctors associated with the lab technician's organization
        if organization_id:
            from sqlalchemy import cast
            from sqlalchemy.dialects.postgresql import UUID as PG_UUID
            from uuid import UUID as PyUUID
            # Cast organization_id string to UUID for comparison with hospital_id (UUID column)
            organization_uuid = PyUUID(organization_id) if isinstance(organization_id, str) else organization_id
            # Cast LabOrder.id (String in model, but UUID in DB) to UUID for join with LabResult.lab_order_id (UUID)
            # Cast LabOrder.ordered_by (String) to UUID for join with Doctor.id (UUID)
            query = query.join(LabOrder, LabResult.lab_order_id == cast(LabOrder.id, PG_UUID))\
                         .join(Doctor, cast(LabOrder.ordered_by, PG_UUID) == Doctor.id)\
                         .join(doctor_hospitals, Doctor.id == doctor_hospitals.c.doctor_id)\
                         .filter(cast(doctor_hospitals.c.hospital_id, PG_UUID) == organization_uuid)
        
        if order_id:
            query = query.filter(LabResult.lab_order_id == order_id)
        if patient_id:
            query = query.filter(LabResult.patient_id == patient_id)
        if status and status != "all":
            query = query.filter(LabResult.status == status)
        if analyzed_from:
            query = query.filter(LabResult.resulted_date >= analyzed_from)
        if analyzed_to:
            query = query.filter(LabResult.resulted_date <= analyzed_to)

        return query.distinct().order_by(desc(LabResult.created_at)).offset(skip).limit(limit).all()

    def count(self, db: Session, *, order_id: Optional[str] = None, patient_id: Optional[str] = None, status: Optional[str] = None, organization_id: Optional[str] = None) -> int:
        query = db.query(LabResult)
        
        # Filter by organization: join through LabOrder -> Doctor -> doctor_hospitals -> Hospital
        if organization_id:
            from sqlalchemy import cast
            from sqlalchemy.dialects.postgresql import UUID as PG_UUID
            from uuid import UUID as PyUUID
            # Cast organization_id string to UUID for comparison with hospital_id (UUID column)
            organization_uuid = PyUUID(organization_id) if isinstance(organization_id, str) else organization_id
            # Cast LabOrder.id (String in model, but UUID in DB) to UUID for join with LabResult.lab_order_id (UUID)
            # Cast LabOrder.ordered_by (String) to UUID for join with Doctor.id (UUID)
            query = query.join(LabOrder, LabResult.lab_order_id == cast(LabOrder.id, PG_UUID))\
                         .join(Doctor, cast(LabOrder.ordered_by, PG_UUID) == Doctor.id)\
                         .join(doctor_hospitals, Doctor.id == doctor_hospitals.c.doctor_id)\
                         .filter(cast(doctor_hospitals.c.hospital_id, PG_UUID) == organization_uuid)
        
        if order_id:
            query = query.filter(LabResult.lab_order_id == order_id)
        if patient_id:
            query = query.filter(LabResult.patient_id == patient_id)
        if status and status != "all":
            query = query.filter(LabResult.status == status)
        return query.distinct().count()

    def get_stats(self, db: Session, *, organization_id: Optional[str] = None) -> LabResultStats:
        # Base query with organization filter if provided
        from app.common.models.lab_insurance import LabResultStatus
        base_query = db.query(LabResult)
        if organization_id:
            from sqlalchemy import cast
            from sqlalchemy.dialects.postgresql import UUID as PG_UUID
            from uuid import UUID as PyUUID
            # Cast organization_id string to UUID for comparison with hospital_id (UUID column)
            organization_uuid = PyUUID(organization_id) if isinstance(organization_id, str) else organization_id
            # Cast LabOrder.id (String in model, but UUID in DB) to UUID for join with LabResult.lab_order_id (UUID)
            # Cast LabOrder.ordered_by (String) to UUID for join with Doctor.id (UUID)
            base_query = base_query.join(LabOrder, LabResult.lab_order_id == cast(LabOrder.id, PG_UUID))\
                                   .join(Doctor, cast(LabOrder.ordered_by, PG_UUID) == Doctor.id)\
                                   .join(doctor_hospitals, Doctor.id == doctor_hospitals.c.doctor_id)\
                                   .filter(cast(doctor_hospitals.c.hospital_id, PG_UUID) == organization_uuid)
        
        total = base_query.distinct().count()
        completed = base_query.filter(LabResult.status == LabResultStatus.FINAL).distinct().count()
        # Pending results are those that are not FINAL and not CANCELLED
        pending = base_query.filter(
            and_(
                LabResult.status != LabResultStatus.FINAL,
                LabResult.status != LabResultStatus.CANCELLED
            )
        ).distinct().count()
        abnormal = base_query.filter(LabResult.is_abnormal == True).distinct().count()
        critical = base_query.filter(LabResult.is_critical == True).distinct().count()
        return LabResultStats(total=total, completed=completed, pending=pending, abnormal=abnormal, critical=critical)

    def create(self, db: Session, *, values: Dict[str, Any]) -> LabResult:
        obj = LabResult(**values)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def update(self, db: Session, *, result_id: str, values: Dict[str, Any]) -> Optional[LabResult]:
        obj = self.get(db, result_id=result_id)
        if not obj:
            return None
        for k, v in values.items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return obj

    def delete(self, db: Session, *, result_id: str) -> bool:
        obj = self.get(db, result_id=result_id)
        if not obj:
            return False
        db.delete(obj)
        db.commit()
        return True


lab_results = CRUDLabResults()
