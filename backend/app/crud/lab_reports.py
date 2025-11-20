from __future__ import annotations

from datetime import datetime, date
from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
from sqlalchemy.orm import joinedload

from app.common.models.lab_insurance import LabReport, LabOrder
from app.common.models.doctor import Doctor, doctor_hospitals


class LabReportStats:
    def __init__(self, total: int, completed: int, pending: int, processing: int, failed: int, templates: int, downloads: int) -> None:
        self.total = total
        self.completed = completed
        self.pending = pending
        self.processing = processing
        self.failed = failed
        self.templates = templates
        self.downloads = downloads


class CRUDLabReports:
    """CRUD operations for lab reports."""

    def get(self, db: Session, *, report_id: str) -> Optional[LabReport]:
        return db.query(LabReport).filter(LabReport.id == report_id).first()

    def list(
        self,
        db: Session,
        *,
        order_id: Optional[str] = None,
        patient_id: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        organization_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[LabReport]:
        query = db.query(LabReport)
        
        # Filter by organization: join through LabOrder -> Doctor -> doctor_hospitals -> Hospital
        # Only show reports that have orders from doctors associated with the lab technician's organization
        if organization_id:
            from sqlalchemy import cast
            from sqlalchemy.dialects.postgresql import UUID as PG_UUID
            from uuid import UUID as PyUUID
            # Cast organization_id string to UUID for comparison with hospital_id (UUID column)
            organization_uuid = PyUUID(organization_id) if isinstance(organization_id, str) else organization_id
            query = query.join(LabOrder, LabReport.order_id == LabOrder.id)\
                         .join(Doctor, LabOrder.ordered_by == Doctor.id)\
                         .join(doctor_hospitals, Doctor.id == doctor_hospitals.c.doctor_id)\
                         .filter(cast(doctor_hospitals.c.hospital_id, PG_UUID) == organization_uuid)
        
        if order_id:
            query = query.filter(LabReport.order_id == order_id)
        if patient_id:
            query = query.filter(LabReport.patient_id == patient_id)
        if date_from:
            query = query.filter(LabReport.report_date >= date_from)
        if date_to:
            query = query.filter(LabReport.report_date <= date_to)

        # Use distinct to avoid duplicates from joins
        return query.distinct().order_by(desc(LabReport.report_date)).offset(skip).limit(limit).all()

    def count(self, db: Session, *, order_id: Optional[str] = None, patient_id: Optional[str] = None, organization_id: Optional[str] = None) -> int:
        query = db.query(LabReport)
        
        # Filter by organization: join through LabOrder -> Doctor -> doctor_hospitals -> Hospital
        # Only show reports that have orders from doctors associated with the lab technician's organization
        if organization_id:
            from sqlalchemy import cast
            from sqlalchemy.dialects.postgresql import UUID as PG_UUID
            from uuid import UUID as PyUUID
            # Cast organization_id string to UUID for comparison with hospital_id (UUID column)
            organization_uuid = PyUUID(organization_id) if isinstance(organization_id, str) else organization_id
            query = query.join(LabOrder, LabReport.order_id == LabOrder.id)\
                         .join(Doctor, LabOrder.ordered_by == Doctor.id)\
                         .join(doctor_hospitals, Doctor.id == doctor_hospitals.c.doctor_id)\
                         .filter(cast(doctor_hospitals.c.hospital_id, PG_UUID) == organization_uuid)
        
        if order_id:
            query = query.filter(LabReport.order_id == order_id)
        if patient_id:
            query = query.filter(LabReport.patient_id == patient_id)
        return query.distinct().count()

    def get_stats(self, db: Session, *, organization_id: Optional[str] = None) -> LabReportStats:
        query = db.query(LabReport)
        
        # Filter by organization: join through LabOrder -> Doctor -> doctor_hospitals -> Hospital
        # Only show reports that have orders from doctors associated with the lab technician's organization
        if organization_id:
            from sqlalchemy import cast
            from sqlalchemy.dialects.postgresql import UUID as PG_UUID
            from uuid import UUID as PyUUID
            # Cast organization_id string to UUID for comparison with hospital_id (UUID column)
            organization_uuid = PyUUID(organization_id) if isinstance(organization_id, str) else organization_id
            query = query.join(LabOrder, LabReport.order_id == LabOrder.id)\
                         .join(Doctor, LabOrder.ordered_by == Doctor.id)\
                         .join(doctor_hospitals, Doctor.id == doctor_hospitals.c.doctor_id)\
                         .filter(cast(doctor_hospitals.c.hospital_id, PG_UUID) == organization_uuid)
        
        total = query.distinct().count()
        # Without status in LabReport model, approximate counts
        return LabReportStats(total=total, completed=total, pending=0, processing=0, failed=0, templates=0, downloads=0)

    def create(self, db: Session, *, values: Dict[str, Any]) -> LabReport:
        obj = LabReport(**values)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def update(self, db: Session, *, report_id: str, values: Dict[str, Any]) -> Optional[LabReport]:
        obj = self.get(db, report_id=report_id)
        if not obj:
            return None
        for k, v in values.items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return obj

    def delete(self, db: Session, *, report_id: str) -> bool:
        obj = self.get(db, report_id=report_id)
        if not obj:
            return False
        db.delete(obj)
        db.commit()
        return True


lab_reports = CRUDLabReports()
