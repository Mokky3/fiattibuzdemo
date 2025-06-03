from sqlalchemy.orm import Session
from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientBase


def create_patient(db: Session, patient: PatientCreate):
    db_patient = Patient(**patient.dict())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

def get_patient(db: Session, patient_id: int):
    return db.query(Patient).filter(Patient.id == patient_id).first()

def update_patient(db: Session, patient_id: int, patient_data: PatientBase):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient:
        for field, value in patient_data.dict().items():
            setattr(patient, field, value)
        db.commit()
        db.refresh(patient)
    return patient

def delete_patient(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient:
        db.delete(patient)
        db.commit()
    return patient
