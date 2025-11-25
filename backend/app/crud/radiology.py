"""CRUD for Radiology portal entities (studies, worklist, templates, reports)."""
from __future__ import annotations

from datetime import datetime, date
from typing import Any, Dict, List, Optional
from uuid import uuid4

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc

from app.crud.base import CRUDBase
from app.common.models.radiology import RadiologyStudy, WorklistAssignment, RadiologyReport, RadiologyTemplate


class CRUDRadiologyStudy(CRUDBase[RadiologyStudy, Dict[str, Any], Dict[str, Any]]):
    def list(
        self,
        db: Session,
        *,
        status: Optional[str] = None,
        modality: Optional[str] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
        patient_id: Optional[str] = None,
        scheduled_from: Optional[date] = None,
        scheduled_to: Optional[date] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[RadiologyStudy]:
        from uuid import UUID
        query = db.query(RadiologyStudy)
        if status and status != "all":
            query = query.filter(RadiologyStudy.status == status)
        if modality and modality != "all":
            query = query.filter(func.lower(RadiologyStudy.modality) == func.lower(modality))
        if priority and priority != "all":
            query = query.filter(func.lower(RadiologyStudy.priority) == func.lower(priority))
        if patient_id:
            try:
                patient_uuid = UUID(patient_id) if isinstance(patient_id, str) else patient_id
                query = query.filter(RadiologyStudy.patient_id == patient_uuid)
            except (ValueError, TypeError):
                # Invalid UUID format, return empty results
                return []
        if search:
            like = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    func.lower(RadiologyStudy.patient_name).like(like),
                    func.lower(RadiologyStudy.mrn).like(like),
                    func.lower(RadiologyStudy.accession_number).like(like),
                    func.lower(RadiologyStudy.study_description).like(like),
                )
            )
        if scheduled_from:
            query = query.filter(RadiologyStudy.scheduled_date >= scheduled_from)
        if scheduled_to:
            query = query.filter(RadiologyStudy.scheduled_date <= scheduled_to)
        return query.order_by(asc(RadiologyStudy.scheduled_date)).offset(skip).limit(limit).all()

    def get_by_accession(self, db: Session, *, accession_number: str) -> Optional[RadiologyStudy]:
        return db.query(RadiologyStudy).filter(RadiologyStudy.accession_number == accession_number).first()

    def create_with_accession(self, db: Session, *, data: Dict[str, Any]) -> RadiologyStudy:
        if self.get_by_accession(db, accession_number=data["accession_number"]):
            raise ValueError("Study with this accession already exists")
        study = RadiologyStudy(**data)
        db.add(study)
        db.commit()
        db.refresh(study)
        return study


class CRUDWorklist(CRUDBase[WorklistAssignment, Dict[str, Any], Dict[str, Any]]):
    def get_by_study(self, db: Session, *, study_id: str) -> Optional[WorklistAssignment]:
        return db.query(WorklistAssignment).filter(WorklistAssignment.study_id == study_id).first()

    def assign(self, db: Session, *, study_id: str, radiologist_id: Optional[str]) -> WorklistAssignment:
        wa = self.get_by_study(db, study_id=study_id)
        if wa is None:
            wa = WorklistAssignment(id=str(uuid4()), study_id=study_id)
        wa.assigned_radiologist_id = radiologist_id
        db.add(wa)
        db.commit()
        db.refresh(wa)
        return wa

    def update_reading_status(
        self,
        db: Session,
        *,
        study_id: str,
        reading_status: str,
        preliminary_findings: Optional[str] = None,
    ) -> Optional[WorklistAssignment]:
        wa = self.get_by_study(db, study_id=study_id)
        if not wa:
            return None
        wa.reading_status = reading_status
        if preliminary_findings is not None:
            wa.preliminary_findings = preliminary_findings
        db.commit()
        db.refresh(wa)
        return wa


class CRUDRadiologyReport(CRUDBase[RadiologyReport, Dict[str, Any], Dict[str, Any]]):
    def get_by_study(self, db: Session, *, study_id: str) -> Optional[RadiologyReport]:
        return db.query(RadiologyReport).filter(RadiologyReport.study_id == study_id).first()

    def create_or_replace(
        self,
        db: Session,
        *,
        study_id: str,
        radiologist_id: Optional[str],
        findings: str,
        impression: str,
        recommendations: Optional[str] = None,
        is_critical: Optional[bool] = None,
    ) -> RadiologyReport:
        report = self.get_by_study(db, study_id=study_id)
        if report is None:
            report = RadiologyReport(
                id=str(uuid4()),
                study_id=study_id,
                radiologist_id=radiologist_id,
                findings=findings,
                impression=impression,
                recommendations=recommendations,
                is_critical=is_critical or False,
                status="final",
            )
            db.add(report)
        else:
            report.findings = findings
            report.impression = impression
            report.recommendations = recommendations
            if is_critical is not None:
                report.is_critical = is_critical
            report.status = "final"
            report.report_date = datetime.utcnow()
        db.commit()
        db.refresh(report)
        return report


class CRUDRadiologyTemplate(CRUDBase[RadiologyTemplate, Dict[str, Any], Dict[str, Any]]):
    def list(
        self,
        db: Session,
        *,
        tab: Optional[str] = None,
        modality: Optional[str] = None,
        category: Optional[str] = None,
        author_id: Optional[str] = None,
        favorite: Optional[bool] = None,
        private: Optional[bool] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[RadiologyTemplate]:
        query = db.query(RadiologyTemplate)

        if modality:
            query = query.filter(func.lower(RadiologyTemplate.modality) == func.lower(modality))
        if category:
            query = query.filter(func.lower(RadiologyTemplate.category) == func.lower(category))
        if author_id:
            query = query.filter(RadiologyTemplate.author_id == author_id)
        if favorite is not None:
            query = query.filter(RadiologyTemplate.is_favorite == favorite)
        if private is not None:
            query = query.filter(RadiologyTemplate.is_private == private)
        if search:
            like = f"%{search.lower()}%"
            query = query.filter(
                or_(
                    func.lower(RadiologyTemplate.name).like(like),
                    func.lower(RadiologyTemplate.description).like(like),
                )
            )
        return (
            query.order_by(desc(RadiologyTemplate.last_modified))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def duplicate(
        self,
        db: Session,
        *,
        template_id: str,
        name: Optional[str],
        author_id: Optional[str],
        is_private: Optional[bool],
        is_favorite: Optional[bool],
    ) -> Optional[RadiologyTemplate]:
        existing = self.get(db, id=template_id)
        if not existing:
            return None
        dup = RadiologyTemplate(
            id=str(uuid4()),
            name=name or f"{existing.name} (Copy)",
            modality=existing.modality,
            body_part=existing.body_part,
            category=existing.category,
            description=existing.description,
            author_id=author_id or existing.author_id,
            created_date=date.today(),
            last_modified=date.today(),
            usage_count=0,
            is_private=is_private if is_private is not None else True,
            is_favorite=is_favorite if is_favorite is not None else False,
            content=existing.content,
            tags=existing.tags,
        )
        db.add(dup)
        db.commit()
        db.refresh(dup)
        return dup

    def increment_usage(self, db: Session, *, template_id: str, amount: int = 1) -> Optional[RadiologyTemplate]:
        t = self.get(db, id=template_id)
        if not t:
            return None
        t.usage_count = (t.usage_count or 0) + amount
        t.last_modified = date.today()
        db.commit()
        db.refresh(t)
        return t


# Instances
radiology_study = CRUDRadiologyStudy(RadiologyStudy)
worklist = CRUDWorklist(WorklistAssignment)
radiology_report = CRUDRadiologyReport(RadiologyReport)
radiology_template = CRUDRadiologyTemplate(RadiologyTemplate)


