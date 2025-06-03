from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.schemas.prescription import PrescriptionCreate, PrescriptionRead
from app.auth.auth import get_current_user
from app.models.user import User
from app.crud import prescription as crud

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=PrescriptionRead)
def create(
    data: PrescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can prescribe.")
    return crud.create_prescription(db, data, doctor_id=current_user.id)

@router.get("/mine", response_model=list[PrescriptionRead])
def list_for_patient(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patients can access this.")
    return crud.get_prescriptions_for_patient(db, current_user.id)


@router.get("/own", response_model=list[PrescriptionRead])
def list_for_doctor(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can access this.")
    return crud.get_prescriptions_by_doctor(db, current_user.id)
