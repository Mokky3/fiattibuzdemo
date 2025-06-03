from sqlalchemy.orm import Session
from app.models.prescription import Prescription
from app.schemas.prescription import PrescriptionCreate

def create_prescription(db: Session, data: PrescriptionCreate, doctor_id: int):
    db_prescription = Prescription(**data.dict(), doctor_id=doctor_id)
    db.add(db_prescription)
    db.commit()
    db.refresh(db_prescription)
    return db_prescription

def get_prescriptions_for_patient(db: Session, patient_id: int):
    return db.query(Prescription).filter(Prescription.patient_id == patient_id).all()

def get_prescriptions_by_doctor(db: Session, doctor_id: int):
    return db.query(Prescription).filter(Prescription.doctor_id == doctor_id).all()
