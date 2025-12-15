"""
Lightweight Telegram bot integration endpoints.

The bot authenticates with an `X-Telegram-Bot-Token` header (shared secret
stored in TELEGRAM_BOT_TOKEN). Patients are resolved by phone number and the
bot can fetch their recent reports and appointments.
"""
import os
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.common.models.user import User, UserRole
from app.common.models.patient import Patient
from app.common.auth.auth_service import AuthService
from app.crud.patient_portal import patient_portal_crud
from app.crud.general_reports import general_report

router = APIRouter(prefix="/telegram", tags=["Integrations · Telegram Bot"])

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")


# ----------------------- helpers ----------------------- #
def _normalize_phone(phone: Optional[str]) -> str:
    """Keep digits only to make loose phone comparisons tolerant."""
    return "".join(ch for ch in (phone or "") if ch.isdigit())


def require_bot_token(
    x_telegram_bot_token: Optional[str] = Header(None),
) -> None:
    """
    Simple shared-secret auth to protect bot-only endpoints.

    Note: with the default `convert_underscores=True`, this will correctly read the
    standard `X-Telegram-Bot-Token` header from the client.
    """
    if not BOT_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="TELEGRAM_BOT_TOKEN is not configured",
        )
    if not x_telegram_bot_token or x_telegram_bot_token != BOT_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram bot token",
        )


def _find_patient_by_phone(db: Session, raw_phone: str) -> tuple[User, Optional[Patient]]:
    """Locate a patient user by phone, matching on digits only."""
    normalized = _normalize_phone(raw_phone)
    if not normalized:
        raise HTTPException(status_code=422, detail="Phone is required")

    # Grab patient users with a phone and compare in Python to avoid DB-specific
    # string mangling for normalization.
    rows = (
        db.query(User, Patient)
        .join(Patient, Patient.user_id == User.id, isouter=True)
        .filter(User.role == UserRole.PATIENT, User.phone.isnot(None))
        .all()
    )

    for user_row, patient_row in rows:
        if _normalize_phone(user_row.phone) == normalized:
            return user_row, patient_row

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Patient with this phone was not found",
    )


# ----------------------- schemas ----------------------- #
class LinkRequest(BaseModel):
    phone: str = Field(..., description="Patient phone number to look up")
    chat_id: Optional[str] = Field(
        None, description="Telegram chat id (stored client-side only)"
    )


class LinkResponse(BaseModel):
    user_id: str
    patient_id: str
    full_name: str
    phone: Optional[str]
    access_token: str


class AppointmentItem(BaseModel):
    id: str
    date: str
    time: str
    status: Optional[str] = None
    hospital: Optional[str] = None
    doctor: Optional[str] = None
    notes: Optional[str] = None


class ReportItem(BaseModel):
    id: str
    chief_complaint: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None


# ----------------------- endpoints ----------------------- #
@router.post("/link", response_model=LinkResponse, status_code=status.HTTP_200_OK)
def link_patient(
    payload: LinkRequest,
    db: Session = Depends(get_db),
    _bot: None = Depends(require_bot_token),
) -> LinkResponse:
    """Resolve patient by phone and mint a JWT for follow-up calls from the bot."""
    user_row, patient_row = _find_patient_by_phone(db, payload.phone)

    patient_id = (
        str(patient_row.patient_id) if patient_row else str(user_row.id)
    )  # fallback to user id if patient row missing

    full_name = user_row.full_name or " ".join(
        part for part in [user_row.first_name, user_row.last_name] if part
    )

    token = AuthService.create_access_token(
        {
            "sub": str(user_row.id),
            "role": user_row.role.value,
            "channel": "telegram",
        }
    )

    return LinkResponse(
        user_id=str(user_row.id),
        patient_id=patient_id,
        full_name=full_name.strip() or "Patient",
        phone=user_row.phone,
        access_token=token,
    )


@router.get(
    "/patient/{patient_id}/appointments",
    response_model=List[AppointmentItem],
    status_code=status.HTTP_200_OK,
)
def patient_appointments(
    patient_id: str,
    scope: str = Query("upcoming", pattern="^(upcoming|past)$"),
    db: Session = Depends(get_db),
    _bot: None = Depends(require_bot_token),
) -> List[AppointmentItem]:
    """Return upcoming or past appointments for the patient."""
    try:
        patient_uuid = UUID(patient_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid patient_id")

    appts = patient_portal_crud.get_patient_appointments(
        db, patient_id=patient_uuid, scope=scope
    )

    items: List[AppointmentItem] = []
    for appt in appts:
        dt = getattr(appt, "appointment_date", None)
        date_str = dt.strftime("%d.%m.%Y") if dt else ""
        time_str = dt.strftime("%H:%M") if dt else ""

        doctor_name = ""
        if getattr(appt, "doctor", None) and getattr(appt.doctor, "user", None):
            u = appt.doctor.user
            doctor_name = u.full_name or " ".join(
                part for part in [u.first_name, u.last_name] if part
            ).strip()

        hospital_name = ""
        if getattr(appt, "hospital", None):
            hospital_name = appt.hospital.name

        items.append(
            AppointmentItem(
                id=str(appt.id),
                date=date_str,
                time=time_str,
                status=str(appt.status) if appt.status else None,
                hospital=hospital_name or None,
                doctor=doctor_name or None,
                notes=getattr(appt, "notes", None),
            )
        )
    return items


@router.get(
    "/patient/{patient_id}/reports",
    response_model=List[ReportItem],
    status_code=status.HTTP_200_OK,
)
def patient_reports(
    patient_id: str,
    limit: int = Query(5, ge=1, le=50),
    db: Session = Depends(get_db),
    _bot: None = Depends(require_bot_token),
) -> List[ReportItem]:
    """Return recent general visit reports for the patient."""
    reports = general_report.get_reports_by_patient(
        db, patient_id=patient_id, limit=limit
    )

    items: List[ReportItem] = []
    for rep in reports:
        items.append(
            ReportItem(
                id=str(rep.id),
                chief_complaint=rep.chief_complaint,
                status=rep.status.value if rep.status else None,
                created_at=rep.created_at,
            )
        )
    return items

