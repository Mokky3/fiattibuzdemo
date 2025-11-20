from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc

from app.common.models.lab_insurance import LabOrder
from app.common.enums import ServiceRequestStatus, ServiceRequestPriority
from app.common.models.doctor import Doctor, doctor_hospitals


class LabOrderStats:
    def __init__(self, total: int, pending: int, completed: int, urgent: int, cancelled: int) -> None:
        self.total = total
        self.pending = pending
        self.completed = completed
        self.urgent = urgent
        self.cancelled = cancelled


class CRUDLabOrders:
    """CRUD operations for lab orders with filtering, sorting and pagination."""

    def get(self, db: Session, *, order_id: str) -> Optional[LabOrder]:
        from sqlalchemy.orm import joinedload
        from app.common.models.patient import Patient
        return db.query(LabOrder).options(
            joinedload(LabOrder.patient).joinedload(Patient.user),
            joinedload(LabOrder.orderer)
        ).filter(LabOrder.id == order_id).first()

    def list(
        self,
        db: Session,
        *,
        search: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        sort: str = "date",
        organization_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[LabOrder]:
        from sqlalchemy.orm import joinedload
        from app.common.models.patient import Patient
        query = db.query(LabOrder).options(
            joinedload(LabOrder.patient).joinedload(Patient.user),
            joinedload(LabOrder.orderer)
        )
        
        # Filter by organization: join through Doctor -> doctor_hospitals -> Hospital
        # Only show orders from doctors associated with the lab technician's organization
        if organization_id:
            from sqlalchemy import cast
            from sqlalchemy.dialects.postgresql import UUID as PG_UUID
            from uuid import UUID as PyUUID
            # Cast organization_id string to UUID for comparison with hospital_id (UUID column)
            organization_uuid = PyUUID(organization_id) if isinstance(organization_id, str) else organization_id
            # Cast LabOrder.ordered_by (String) to UUID for join with Doctor.id (UUID)
            query = query.join(Doctor, cast(LabOrder.ordered_by, PG_UUID) == Doctor.id)\
                         .join(doctor_hospitals, Doctor.id == doctor_hospitals.c.doctor_id)\
                         .filter(cast(doctor_hospitals.c.hospital_id, PG_UUID) == organization_uuid)
        
        if search:
            like = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    LabOrder.order_number.ilike(like),
                    LabOrder.ordering_provider.ilike(like),
                )
            )
        if status and status != "all":
            query = query.filter(LabOrder.status == status)
        if priority and priority != "all":
            query = query.filter(LabOrder.priority == priority)
        if date_from:
            # created_at date range
            query = query.filter(LabOrder.created_at >= datetime.combine(date_from, datetime.min.time()))
        if date_to:
            query = query.filter(LabOrder.created_at <= datetime.combine(date_to, datetime.max.time()))

        if sort == "date":
            query = query.order_by(desc(LabOrder.created_at))
        elif sort == "priority":
            query = query.order_by(asc(LabOrder.priority))
        elif sort == "status":
            query = query.order_by(asc(LabOrder.status))
        else:
            query = query.order_by(desc(LabOrder.created_at))

        return query.distinct().offset(skip).limit(limit).all()

    def count(
        self,
        db: Session,
        *,
        search: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        organization_id: Optional[str] = None,
    ) -> int:
        query = db.query(LabOrder)
        
        # Filter by organization: join through Doctor -> doctor_hospitals -> Hospital
        if organization_id:
            from sqlalchemy import cast
            from sqlalchemy.dialects.postgresql import UUID as PG_UUID
            from uuid import UUID as PyUUID
            # Cast organization_id string to UUID for comparison with hospital_id (UUID column)
            organization_uuid = PyUUID(organization_id) if isinstance(organization_id, str) else organization_id
            # Cast LabOrder.ordered_by (String) to UUID for join with Doctor.id (UUID)
            query = query.join(Doctor, cast(LabOrder.ordered_by, PG_UUID) == Doctor.id)\
                         .join(doctor_hospitals, Doctor.id == doctor_hospitals.c.doctor_id)\
                         .filter(cast(doctor_hospitals.c.hospital_id, PG_UUID) == organization_uuid)
        
        if search:
            like = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    LabOrder.order_number.ilike(like),
                    LabOrder.ordering_provider.ilike(like),
                )
            )
        if status and status != "all":
            query = query.filter(LabOrder.status == status)
        if priority and priority != "all":
            query = query.filter(LabOrder.priority == priority)
        if date_from:
            query = query.filter(LabOrder.created_at >= datetime.combine(date_from, datetime.min.time()))
        if date_to:
            query = query.filter(LabOrder.created_at <= datetime.combine(date_to, datetime.max.time()))
        return query.distinct().count()

    def get_stats(self, db: Session, *, organization_id: Optional[str] = None) -> LabOrderStats:
        # Base query with organization filter if provided
        base_query = db.query(LabOrder)
        if organization_id:
            from sqlalchemy import cast
            from sqlalchemy.dialects.postgresql import UUID as PG_UUID
            from uuid import UUID as PyUUID
            # Cast organization_id string to UUID for comparison with hospital_id (UUID column)
            organization_uuid = PyUUID(organization_id) if isinstance(organization_id, str) else organization_id
            # Cast LabOrder.ordered_by (String) to UUID for join with Doctor.id (UUID)
            base_query = base_query.join(Doctor, cast(LabOrder.ordered_by, PG_UUID) == Doctor.id)\
                                   .join(doctor_hospitals, Doctor.id == doctor_hospitals.c.doctor_id)\
                                   .filter(cast(doctor_hospitals.c.hospital_id, PG_UUID) == organization_uuid)
        
        total = base_query.distinct().count()
        pending = base_query.filter(LabOrder.status == ServiceRequestStatus.ACTIVE).distinct().count() if organization_id else db.query(LabOrder).filter(LabOrder.status == ServiceRequestStatus.ACTIVE).count()
        completed = base_query.filter(LabOrder.status == ServiceRequestStatus.COMPLETED).distinct().count() if organization_id else db.query(LabOrder).filter(LabOrder.status == ServiceRequestStatus.COMPLETED).count()
        urgent = base_query.filter(LabOrder.priority == ServiceRequestPriority.URGENT).distinct().count() if organization_id else db.query(LabOrder).filter(LabOrder.priority == ServiceRequestPriority.URGENT).count()
        cancelled = base_query.filter(LabOrder.status == ServiceRequestStatus.REVOKED).distinct().count() if organization_id else db.query(LabOrder).filter(LabOrder.status == ServiceRequestStatus.REVOKED).count()
        return LabOrderStats(total=total, pending=pending, completed=completed, urgent=urgent, cancelled=cancelled)

    def create(self, db: Session, *, values: Dict[str, Any]) -> LabOrder:
        obj = LabOrder(**values)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def update(self, db: Session, *, order_id: str, values: Dict[str, Any]) -> Optional[LabOrder]:
        obj = self.get(db, order_id=order_id)
        if not obj:
            return None
        for k, v in values.items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return obj

    def delete(self, db: Session, *, order_id: str) -> bool:
        obj = self.get(db, order_id=order_id)
        if not obj:
            return False
        db.delete(obj)
        db.commit()
        return True


lab_orders = CRUDLabOrders()
