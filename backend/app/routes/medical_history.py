from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.auth.auth import get_current_user
from app.models.user import User
from app.schemas.medical_history import MedicalHistoryCreate, MedicalHistoryRead
from app.crud import medical_history as crud

router = APIRouter(prefix="/medical-history", tags=["Medical History"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=MedicalHistoryRead)
def create_medical_record(item: MedicalHistoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can add medical history.")
    return crud.create_medical_history(db, user_id=current_user.id, doctor_id=current_user.id, item=item)

@router.get("/", response_model=list[MedicalHistoryRead])
def get_my_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == "patient":
        return crud.get_patient_medical_history(db, current_user.id)
    elif current_user.role == "doctor":
        # Optional: show all patients’ records, or doctor’s own
        return db.query(MedicalHistory).filter(MedicalHistory.doctor_id == current_user.id).all()
    elif current_user.role == "admin":
        return db.query(MedicalHistory).all()
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
