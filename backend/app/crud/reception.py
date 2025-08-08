from typing import List, Dict, Optional
from fastapi import HTTPException
from uuid import uuid4
from datetime import datetime

from ..schemas.appointments import AppointmentCreate, AppointmentPublic, UpdatePayload
from ..schemas.messages import SendMessage, ConversationItem, ConversationMeta
from ..schemas.profile import ProfileDTO, PasswordChange
from ..schemas.register import PatientRegisterPayload, PatientListItem
from ..schemas.settings import SettingsBundle

# Mock in-memory DBs
APPOINTMENTS: Dict[str, AppointmentPublic] = {}
MESSAGES: Dict[str, List[ConversationItem]] = {}
CONVERSATIONS: Dict[str, ConversationMeta] = {}
PATIENTS: Dict[str, PatientListItem] = {}
RECEPTION_PROFILE: Optional[ProfileDTO] = None
SETTINGS: Optional[SettingsBundle] = None

# ---------------- Appointments ----------------
def create_appointment(payload: AppointmentCreate) -> AppointmentPublic:
    aid = f"apt_{uuid4().hex[:8]}"
    appt = AppointmentPublic(
        id=aid,
        date=payload.appointmentDate,
        time=payload.appointmentTime,
        patient=payload.patientName,
        doctor="Dr. Unknown",
        reason=payload.reason,
        description=payload.notes,
        phone=payload.patientPhone,
        email=payload.patientEmail,
        status="pending",
        priority=payload.priority
    )
    APPOINTMENTS[aid] = appt
    return appt

def update_appointment_status(aid: str, patch: UpdatePayload) -> AppointmentPublic:
    if aid not in APPOINTMENTS:
        raise HTTPException(status_code=404, detail="Appointment not found")
    updated = APPOINTMENTS[aid].copy(update=patch.dict(exclude_unset=True))
    APPOINTMENTS[aid] = updated
    return updated

# ---------------- Messages ----------------
def send_message(msg: SendMessage) -> ConversationItem:
    mid = f"msg_{uuid4().hex[:6]}"
    item = ConversationItem(id=mid, sender="reception", text=msg.text, time=str(datetime.now()))
    MESSAGES.setdefault(msg.patient_id, []).append(item)
    CONVERSATIONS[msg.patient_id] = ConversationMeta(
        patient_id=msg.patient_id,
        patient_name="Unknown",
        lastMessage=msg.text,
        active=True
    )
    return item

def get_conversation(patient_id: str) -> List[ConversationItem]:
    return MESSAGES.get(patient_id, [])

def get_all_conversations() -> List[ConversationMeta]:
    return list(CONVERSATIONS.values())

# ---------------- Profile ----------------
def get_reception_profile() -> ProfileDTO:
    if not RECEPTION_PROFILE:
        raise HTTPException(status_code=404, detail="Profile not found")
    return RECEPTION_PROFILE

def update_reception_profile(data: ProfileDTO) -> ProfileDTO:
    global RECEPTION_PROFILE
    RECEPTION_PROFILE = data
    return data

# ---------------- Registration ----------------
def register_patient(payload: PatientRegisterPayload) -> PatientListItem:
    pid = f"pt_{uuid4().hex[:8]}"
    patient = PatientListItem(
        id=pid,
        first_name=payload.full_name.split(" ")[0],
        last_name=" ".join(payload.full_name.split(" ")[1:]) or "",
        date_of_birth=payload.date_of_birth
    )
    PATIENTS[pid] = patient
    return patient

def search_patients(query: str) -> List[PatientListItem]:
    return [p for p in PATIENTS.values() if query.lower() in p.first_name.lower() or query.lower() in (p.last_name or '').lower()]

# ---------------- Settings ----------------
def save_reception_settings(bundle: SettingsBundle) -> SettingsBundle:
    global SETTINGS
    SETTINGS = bundle
    return bundle

def get_reception_settings() -> SettingsBundle:
    if not SETTINGS:
        raise HTTPException(status_code=404, detail="Settings not found")
    return SETTINGS