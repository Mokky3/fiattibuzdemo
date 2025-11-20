from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc
import uuid
from uuid import UUID

from app.common.models.prescription import Prescription, PrescriptionStatus
from app.crud.base import CRUDBase


class CRUDFullPrescription(CRUDBase[Prescription, Dict[str, Any], Dict[str, Any]]):
    def get_by_id(self, db: Session, *, prescription_id: str) -> Optional[Prescription]:
        return db.query(Prescription).filter(Prescription.id == prescription_id).first()

    def create_prescription(
        self,
        db: Session,
        *,
        patient_id: str,
        doctor_id: str,
        hospital_id: str,
        medicine_name: str,
        dosage: str,
        frequency: str,
        duration: Optional[str] = None,
        notes: Optional[str] = None,
        intent: Optional[str] = None,
        priority: Optional[str] = None,
        created_by: Optional[str] = None,
        prescribed_by: Optional[str] = None,
    ) -> Prescription:
        # Convert string UUIDs to UUID objects for PostgreSQL compatibility
        doctor_uuid = UUID(doctor_id) if isinstance(doctor_id, str) else doctor_id
        
        data: Dict[str, Any] = {
            "patient_id": UUID(patient_id) if isinstance(patient_id, str) else patient_id,
            "doctor_id": doctor_uuid,
            "hospital_id": UUID(hospital_id) if isinstance(hospital_id, str) else hospital_id,
            "prescription_number": f"RX-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}",
            "medicine_name": medicine_name,
            "dosage": dosage,
            "frequency": frequency,
            "duration": duration,
            "notes": notes,
            "prescribed_date": datetime.now(timezone.utc),
            "status": PrescriptionStatus.ACTIVE,
            # Set created_by and prescribed_by - use doctor_id (user_id) if not provided
            "created_by": UUID(created_by) if created_by and isinstance(created_by, str) else (doctor_uuid if not created_by else created_by),
            "prescribed_by": UUID(prescribed_by) if prescribed_by and isinstance(prescribed_by, str) else (doctor_uuid if not prescribed_by else prescribed_by),
        }
        if intent:
            data["intent"] = intent
        if priority:
            data["priority"] = priority
        
        # Override create to handle UUID id properly
        obj_in_data = data.copy()
        # Generate UUID for id (not string) - uuid4() already returns UUID object
        if 'id' not in obj_in_data:
            obj_in_data['id'] = uuid.uuid4()
        
        # Set created_at if not provided
        if 'created_at' not in obj_in_data:
            obj_in_data['created_at'] = datetime.now(timezone.utc)
        
        db_obj = Prescription(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def list_by_patient(
        self,
        db: Session,
        *,
        patient_id: str,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Prescription]:
        from uuid import UUID
        # Convert string to UUID for proper database comparison
        patient_uuid = UUID(patient_id)
        query = db.query(Prescription).filter(Prescription.patient_id == patient_uuid)
        if status:
            try:
                query = query.filter(Prescription.status == PrescriptionStatus(status))
            except Exception:
                pass
        return query.order_by(desc(Prescription.prescribed_date)).offset(skip).limit(limit).all()

    def list_by_doctor(
        self,
        db: Session,
        *,
        doctor_id: str,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Prescription]:
        from uuid import UUID
        # Convert string to UUID for proper database comparison
        doctor_uuid = UUID(doctor_id)
        query = db.query(Prescription).filter(Prescription.doctor_id == doctor_uuid)
        if status:
            try:
                query = query.filter(Prescription.status == PrescriptionStatus(status))
            except Exception:
                pass
        return query.order_by(desc(Prescription.prescribed_date)).offset(skip).limit(limit).all()

    def count_by_doctor(
        self,
        db: Session,
        *,
        doctor_id: str,
        status: Optional[str] = None,
    ) -> int:
        from uuid import UUID
        # Convert string to UUID for proper database comparison
        doctor_uuid = UUID(doctor_id)
        query = db.query(Prescription).filter(Prescription.doctor_id == doctor_uuid)
        if status:
            try:
                query = query.filter(Prescription.status == PrescriptionStatus(status))
            except Exception:
                pass
        return query.count()

    def get_by_doctor(
        self,
        db: Session,
        *,
        doctor_id: str,
        skip: int = 0,
        limit: int = 50,
        status: Optional[str] = None,
    ) -> List[Prescription]:
        return self.list_by_doctor(db, doctor_id=doctor_id, status=status, skip=skip, limit=limit)

    def update_status(
        self,
        db: Session,
        *,
        prescription_id: str,
        status: PrescriptionStatus,
        status_reason: Optional[str] = None,
        cancelled_by: Optional[str] = None
    ) -> Optional[Prescription]:
        presc = db.query(Prescription).filter(Prescription.id == prescription_id).first()
        if not presc:
            return None
        update_data: Dict[str, Any] = {
            "status": status,
            "updated_at": datetime.now(timezone.utc),
        }
        if status_reason is not None:
            update_data["status_reason"] = {"text": status_reason}
        if status == PrescriptionStatus.CANCELLED:
            update_data["cancelled_at"] = datetime.now(timezone.utc)
            update_data["cancelled_by"] = cancelled_by
        return self.update(db=db, db_obj=presc, obj_in=update_data)

    def delete_prescription(self, db: Session, *, prescription_id: str) -> bool:
        presc = db.query(Prescription).filter(Prescription.id == prescription_id).first()
        if not presc:
            return False
        db.delete(presc)
        db.commit()
        return True

    def search(
        self,
        db: Session,
        *,
        term: str,
        doctor_id: Optional[str] = None,
        patient_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Prescription]:
        from uuid import UUID
        query = db.query(Prescription).filter(
            or_(
                Prescription.medicine_name.ilike(f"%{term}%"),
                Prescription.generic_name.ilike(f"%{term}%"),
                Prescription.brand_name.ilike(f"%{term}%"),
                Prescription.prescription_number.ilike(f"%{term}%"),
            )
        )
        if doctor_id:
            # Convert string to UUID for proper database comparison
            doctor_uuid = UUID(doctor_id)
            query = query.filter(Prescription.doctor_id == doctor_uuid)
        if patient_id:
            # Convert string to UUID for proper database comparison
            patient_uuid = UUID(patient_id)
            query = query.filter(Prescription.patient_id == patient_uuid)
        return query.order_by(desc(Prescription.prescribed_date)).offset(skip).limit(limit).all()


prescription = CRUDFullPrescription(Prescription)
