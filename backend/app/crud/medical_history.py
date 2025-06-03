from sqlalchemy.orm import Session
from app.models.medical_history import MedicalHistory
from app.schemas.medical_history import MedicalHistoryCreate


def get_summary_for_patient(db: Session, user_id: int):
    entries = db.query(MedicalHistory).filter_by(patient_id=user_id).all()
    return {
        "total_entries": len(entries),
        "last_diagnosis": entries[-1].diagnosis if entries else None,
        "last_visit": entries[-1].date if entries else None,
    }


def create_medical_history(db: Session, patient_id: int, mh: MedicalHistoryCreate):
    db_mh = MedicalHistory(**mh.dict(), patient_id=patient_id)
    db.add(db_mh)
    db.commit()
    db.refresh(db_mh)
    return db_mh


def get_patient_medical_history(db: Session, user_id: int):
    return db.query(MedicalHistory).filter(MedicalHistory.patient_id == user_id).all()