from sqlalchemy.orm import Session
from app.models.medical_history import MedicalHistory
from app.schemas.medical_history import MedicalHistoryCreate


def get_summary_for_patient(db: Session, user_id: int):
    """Get summary of medical history for a patient"""
    entries = db.query(MedicalHistory).filter_by(patient_id=user_id).all()
    return {
        "total_entries": len(entries),
        "last_diagnosis": entries[-1].diagnosis if entries else None,
        "last_visit": entries[-1].created_at if entries else None,  # Use created_at instead of date
    }


def create_medical_history(db: Session, patient_id: int, doctor_id: int, mh: MedicalHistoryCreate):
    """Create a new medical history record"""
    # Create the medical history record with all required fields
    db_mh = MedicalHistory(
        patient_id=patient_id,
        doctor_id=doctor_id,
        description=mh.description,
        diagnosis=mh.diagnosis
    )
    
    db.add(db_mh)
    db.commit()
    db.refresh(db_mh)
    return db_mh


def get_patient_medical_history(db: Session, user_id: int):
    """Get all medical history records for a patient"""
    return db.query(MedicalHistory).filter(MedicalHistory.patient_id == user_id).all()


def get_medical_history_by_id(db: Session, record_id: int):
    """Get a specific medical history record by ID"""
    return db.query(MedicalHistory).filter(MedicalHistory.id == record_id).first()


def update_medical_history(db: Session, record_id: int, mh: MedicalHistoryCreate):
    """Update an existing medical history record"""
    db_mh = db.query(MedicalHistory).filter(MedicalHistory.id == record_id).first()
    if db_mh:
        db_mh.description = mh.description
        db_mh.diagnosis = mh.diagnosis
        db.commit()
        db.refresh(db_mh)
    return db_mh


def delete_medical_history(db: Session, record_id: int):
    """Delete a medical history record"""
    db_mh = db.query(MedicalHistory).filter(MedicalHistory.id == record_id).first()
    if db_mh:
        db.delete(db_mh)
        db.commit()
    return db_mh