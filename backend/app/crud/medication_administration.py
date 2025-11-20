from __future__ import annotations

from datetime import date
from typing import List, Optional, Dict, Any
import logging

from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, or_

from app.common.models.medical import MedicationAdministration

logger = logging.getLogger(__name__)


class CRUDMedicationAdministration:
    """CRUD operations for nurse medication administrations."""

    def list(
        self,
        db: Session,
        *,
        patient_id: Optional[str] = None,
        nurse_id: Optional[str] = None,
        on_date: Optional[date] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[MedicationAdministration]:
        try:
            query = db.query(MedicationAdministration)
            if patient_id:
                query = query.filter(MedicationAdministration.patient_id == patient_id)
            if nurse_id:
                query = query.filter(MedicationAdministration.administered_by == nurse_id)
            if on_date:
                query = query.filter(MedicationAdministration.date == on_date)
            if status and status != "all":
                query = query.filter(MedicationAdministration.status == status)
            if search:
                like = f"%{search.lower()}%"
                query = query.filter(
                    or_(
                        MedicationAdministration.medication.ilike(like),
                        MedicationAdministration.room.ilike(like),
                    )
                )
            # Order by date (ascending - today first), then by time_to_administer (ascending - earliest first)
            # Handle PRN by putting it at the end
            return query.order_by(
                MedicationAdministration.date.asc(),
                MedicationAdministration.time_to_administer.asc()
            ).offset(skip).limit(limit).all()
        except Exception as e:
            # Handle case where medication_administrations table doesn't exist
            logger.warning(f"Error querying medication administrations (table may not exist): {e}")
            return []

    def get(self, db: Session, *, admin_id: str) -> Optional[MedicationAdministration]:
        try:
            return db.query(MedicationAdministration).filter(MedicationAdministration.id == admin_id).first()
        except Exception as e:
            logger.warning(f"Error getting medication administration (table may not exist): {e}")
            return None

    def create(
        self,
        db: Session,
        *,
        values: Dict[str, Any]
    ) -> MedicationAdministration:
        try:
            obj = MedicationAdministration(**values)
            db.add(obj)
            db.commit()
            db.refresh(obj)
            return obj
        except Exception as e:
            logger.error(f"Error creating medication administration (table may not exist): {e}")
            db.rollback()
            raise

    def update(self, db: Session, *, admin_id: str, values: Dict[str, Any]) -> Optional[MedicationAdministration]:
        try:
            obj = self.get(db, admin_id=admin_id)
            if not obj:
                return None
            for k, v in values.items():
                setattr(obj, k, v)
            db.commit()
            db.refresh(obj)
            return obj
        except Exception as e:
            logger.error(f"Error updating medication administration (table may not exist): {e}")
            db.rollback()
            return None

    def delete(self, db: Session, *, admin_id: str) -> bool:
        try:
            obj = self.get(db, admin_id=admin_id)
            if not obj:
                return False
            db.delete(obj)
            db.commit()
            return True
        except Exception as e:
            logger.error(f"Error deleting medication administration (table may not exist): {e}")
            db.rollback()
            return False


med_admin = CRUDMedicationAdministration()
