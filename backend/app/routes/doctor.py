from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.schemas.doctor import DoctorCreate, DoctorRead, DoctorBase
from app.crud import doctor as crud

router = APIRouter(prefix="/doctors", tags=["Doctors"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=DoctorRead)
def create_doctor(doctor: DoctorCreate, db: Session = Depends(get_db)):
    return crud.create_doctor(db, doctor)

@router.get("/", response_model=list[DoctorRead])
def list_doctors(db: Session = Depends(get_db)):
    return crud.get_doctors(db)

@router.get("/{doctor_id}", response_model=DoctorRead)
def read_doctor(doctor_id: int, db: Session = Depends(get_db)):
    return crud.get_doctor(db, doctor_id)

@router.put("/{doctor_id}", response_model=DoctorRead)
def update_doctor(doctor_id: int, doctor: DoctorBase, db: Session = Depends(get_db)):
    return crud.update_doctor(db, doctor_id, doctor)

@router.delete("/{doctor_id}")
def delete_doctor(doctor_id: int, db: Session = Depends(get_db)):
    crud.delete_doctor(db, doctor_id)
    return {"message": f"Doctor {doctor_id} deleted"}
