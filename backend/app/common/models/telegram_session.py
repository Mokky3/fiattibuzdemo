"""Telegram conversational session model.

Tracks per-chat conversational state for Telegram integrations:
- chat_id: Telegram chat identifier
- patient_id: linked patient (optional)
- mode: PREVISIT / RECOMMENDATION / DOCTOR_ASSIST
- slots: JSON of structured intake fields
- history: JSON list of message turns
"""
from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.sql import func

from app.db.base_class import Base


class TelegramSession(Base):
    __tablename__ = "telegram_sessions"

    chat_id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, nullable=True)
    mode = Column(String(50), nullable=False, default="PREVISIT")
    slots = Column(JSON, nullable=False, default=dict)
    history = Column(JSON, nullable=False, default=list)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


