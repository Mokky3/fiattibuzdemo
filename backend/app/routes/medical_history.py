from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db  # Use the centralized get_db function
from app.auth.auth import get_current_user
from app.models.user import User
from app.models.medical_history import MedicalHistory
from app.schemas.medical_history import MedicalHistoryCreate, MedicalHistoryRead
from app.crud import medical_history as crud

router = APIRouter(prefix="/medical-history", tags=["Medical History"])

@router.post("/", response_model=MedicalHistoryRead)
def create_medical_record(
    item: MedicalHistoryCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can add medical history.")
    
    # Create medical history with proper parameters
    return crud.create_medical_history(
        db=db, 
        patient_id=item.patient_id,  # Get patient_id from the request
        doctor_id=current_user.id,   # Doctor is the current user
        mh=item
    )

@router.get("/", response_model=list[MedicalHistoryRead])
def get_my_history(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "patient":
        return crud.get_patient_medical_history(db, current_user.id)
    elif current_user.role == "doctor":
        # Show all records created by this doctor
        return db.query(MedicalHistory).filter(MedicalHistory.doctor_id == current_user.id).all()
    elif current_user.role == "admin":
        return db.query(MedicalHistory).all()
    else:
        raise HTTPException(status_code=403, detail="Not authorized")

@router.get("/patient/{patient_id}", response_model=list[MedicalHistoryRead])
def get_patient_history(
    patient_id: int,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Get medical history for a specific patient"""
    if current_user.role not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Only doctors and admins can view patient records.")
    
    return crud.get_patient_medical_history(db, patient_id)