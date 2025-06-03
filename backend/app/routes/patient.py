from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.crud import patient as crud
from app.schemas.patient import PatientCreate, PatientRead

router = APIRouter(prefix="/patients", tags=["Patients"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=PatientRead)
def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    return crud.create_patient(db, patient)

@router.get("/", response_model=list[PatientRead])
def list_patients(db: Session = Depends(get_db)):
    return crud.get_patients(db)

@router.get("/{patient_id}", response_model=PatientRead)
def read_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = crud.get_patient(db, patient_id)
    if not patient:
        return {"error": "Patient not found"}
    return patient

@router.put("/{patient_id}", response_model=PatientRead)
def update_patient(patient_id: int, updated_data: PatientCreate, db: Session = Depends(get_db)):
    patient = crud.update_patient(db, patient_id, updated_data)
    if not patient:
        return {"error": "Patient not found"}
    return patient

@router.delete("/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = crud.delete_patient(db, patient_id)
    if not patient:
        return {"error": "Patient not found"}
    return {"message": f"Patient {patient_id} deleted"}
