"""Public authentication endpoints for patient self-registration.
Creates patient accounts only and issues JWT tokens on success.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import uuid4, UUID

from fastapi import APIRouter, HTTPException, Body, status, Depends
from pydantic import BaseModel, EmailStr, Field, validator
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db.session import get_db
from app.common.auth.auth_service import AuthService
from app.common.models.user import User, UserRole, UserStatus
from app.common.models.patient import Patient, Gender


router = APIRouter(prefix="/auth", tags=["Auth"])


class PatientSelfRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    confirm_password: str
    first_name: str = Field(..., min_length=2, max_length=100)
    last_name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    date_of_birth: str = Field(..., description="YYYY-MM-DD")
    gender: str = Field(..., pattern=r"^(male|female|other)$")
    national_id: str = Field(..., min_length=14, max_length=14, description="PINFL (14 digits)")
    clinic_id: Optional[str] = Field(None, description="Optional clinic/organization ID for scoping")

    @validator("confirm_password")
    def passwords_match(cls, v, values):
        if "password" in values and v != values["password"]:
            raise ValueError("Passwords do not match")
        return v

    @validator("date_of_birth")
    def validate_dob(cls, v):
        try:
            datetime.strptime(v, "%Y-%m-%d")
            return v
        except Exception:
            raise ValueError("Invalid date format. Use YYYY-MM-DD")

    @validator("national_id")
    def validate_national_id(cls, v):
        if not v.isdigit():
            raise ValueError("PINFL must contain only digits")
        return v


class AuthRegisterResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


@router.post("/register", response_model=AuthRegisterResponse, status_code=status.HTTP_201_CREATED)
async def patient_self_register(payload: PatientSelfRegisterRequest = Body(...), db: Session = Depends(get_db)):
    """Allow only patients to self-register. Creates `users` and linked `patients` rows.
    Returns access and refresh tokens for immediate login.
    """
    # Check existing user by email
    existing: Optional[User] = db.query(User).filter(User.email.ilike(payload.email)).first()
    if existing:
        raise HTTPException(status_code=409, detail={
            "type": "conflict",
            "title": "User Already Exists",
            "status": 409,
            "detail": f"Account with email '{payload.email}' already exists"
        })

    # Derive username from email (ensure uniqueness best-effort)
    base_username = payload.email.split("@")[0][:50]
    username = base_username
    suffix = 1
    while db.query(User).filter(User.username == username).first() is not None:
        username = f"{base_username}-{suffix}"
        suffix += 1

    # Hash password
    password_hash = AuthService.get_password_hash(payload.password)

    # Create user
    user = User(
        id=str(uuid4()),
        email=payload.email,
        username=username,
        password_hash=password_hash,
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
        role=UserRole.PATIENT,
        status=UserStatus.ACTIVE,
        is_active=True,
    )
    if payload.clinic_id:
        # Store clinic context if model supports it, always as string for SQLite
        try:
            user.organization_id = str(UUID(payload.clinic_id))  # type: ignore[attr-defined]
        except Exception:
            try:
                user.organization_id = str(payload.clinic_id)  # type: ignore[attr-defined]
            except Exception:
                pass

    db.add(user)
    db.flush()

    # Create or link patient profile (dedupe by national_id)
    gender_map = {
        "male": Gender.MALE,
        "female": Gender.FEMALE,
        "other": Gender.OTHER,
    }
    existing_patient = db.query(Patient).filter(Patient.national_id == payload.national_id).first()
    if existing_patient:
        # Link if unowned; otherwise conflict if owned by different user
        if not existing_patient.user_id:
            existing_patient.user_id = str(user.id)
            if not existing_patient.first_name:
                existing_patient.first_name = payload.first_name
            if not existing_patient.last_name:
                existing_patient.last_name = payload.last_name
            if not existing_patient.date_of_birth:
                existing_patient.date_of_birth = datetime.strptime(payload.date_of_birth, "%Y-%m-%d").date()
            if not existing_patient.gender:
                existing_patient.gender = gender_map[payload.gender]
            if not existing_patient.phone and payload.phone:
                existing_patient.phone = payload.phone
            if not existing_patient.email:
                existing_patient.email = payload.email
            db.add(existing_patient)
            try:
                db.commit()
            except IntegrityError:
                db.rollback()
                raise HTTPException(status_code=409, detail="A patient with this national ID already exists")
            patient = existing_patient
        else:
            if str(existing_patient.user_id) != str(user.id):
                raise HTTPException(status_code=409, detail="This national ID is already registered to another account")
            patient = existing_patient
    else:
        patient = Patient(
            id=str(uuid4()),
            medical_record_number=f"MRN-{uuid4().hex[:8].upper()}",
            user_id=str(user.id),
            first_name=payload.first_name,
            last_name=payload.last_name,
            date_of_birth=datetime.strptime(payload.date_of_birth, "%Y-%m-%d").date(),
            gender=gender_map[payload.gender],
            national_id=payload.national_id,
            phone=payload.phone or "",
            email=payload.email,
        )
        db.add(patient)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=409, detail="A patient with this national ID already exists")
    db.refresh(user)

    # Issue tokens
    access_token = AuthService.create_access_token({
        "sub": str(user.id),
        "role": user.role.value,
        "clinic_id": payload.clinic_id
    })
    refresh_token = AuthService.create_refresh_token({
        "sub": str(user.id),
        "role": user.role.value,
        "clinic_id": payload.clinic_id
    })

    return AuthRegisterResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "role": user.role.value,
            "status": user.status.value,
        }
    )


# ──────────────────────────────────────────────────────────────────────────────
# Login (Patient)
# ──────────────────────────────────────────────────────────────────────────────

class AuthLoginRequest(BaseModel):
    username_or_email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)


@router.post("/login", response_model=AuthRegisterResponse)
async def patient_login(payload: AuthLoginRequest = Body(...), db: Session = Depends(get_db)):
    """Authenticate patient and return JWT tokens."""
    # Locate user by username or email
    user: Optional[User] = None  # type: ignore[assignment]
    if "@" in payload.username_or_email:
        user = db.query(User).filter(User.email.ilike(payload.username_or_email)).first()
    else:
        user = db.query(User).filter(User.username.ilike(payload.username_or_email)).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found. Please check your email/username and try again.")
    if user.role != UserRole.PATIENT:
        raise HTTPException(status_code=401, detail="Access denied. This portal is for patients only.")
    if not user.is_active or user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="Your account is inactive. Please contact support for assistance.")
    if not AuthService.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password. Please check your password and try again.")

    # Update last_login timestamp
    from datetime import datetime, timezone
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    # Optional clinic context
    clinic_id: Optional[str] = None
    try:
        clinic_id = str(user.organization_id) if getattr(user, "organization_id", None) else None
    except Exception:
        clinic_id = None

    # Issue tokens
    access_token = AuthService.create_access_token({
        "sub": str(user.id),
        "role": user.role.value,
        "clinic_id": clinic_id,
    })
    refresh_token = AuthService.create_refresh_token({
        "sub": str(user.id),
        "role": user.role.value,
        "clinic_id": clinic_id,
    })

    return AuthRegisterResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "role": user.role.value,
            "status": user.status.value,
        }
    )

