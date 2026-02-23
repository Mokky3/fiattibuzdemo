"""
Clinical conversation orchestrator for Telegram.

This module is the "brain" that:
- Tracks conversation state (in-memory for now)
- Decides interaction mode (PREVISIT / RECOMMENDATION / DOCTOR_ASSIST)
- Calls the AI inference client

NOTE: For production, replace the in-memory session store with a
database-backed implementation (e.g., telegram_sessions table).
"""
from __future__ import annotations

from typing import Dict, Any, List

from sqlalchemy.orm import Session

from app.services.medgemma_client import call_medgemma
from app.crud.telegram_session import get_or_create_session, save_session


async def handle_telegram_message(
    db: Session,
    chat_id: str,
    message: str,
) -> str:
    """
    Main entrypoint for Telegram messages.

    High-level steps:
    1) Load/create session for chat_id
    2) Build AI input payload
    3) Call MedGemma inference service
    4) Update session state
    5) Return assistant reply text
    """
    session = get_or_create_session(db, chat_id)

    ai_input = {
        "mode": (session.mode or "PREVISIT").lower(),
        "history": session.history or [],
        "slots": session.slots or {},
        "patient_message": message,
    }

    ai_output = await call_medgemma(ai_input)

    assistant_message: str = ai_output.get(
        "assistant_message",
        "Kechirasiz, hozircha javob bera olmadim.",
    )
    updated_slots: Dict[str, Any] = ai_output.get("updated_slots", session.slots or {})
    status: str = ai_output.get("status", "CONTINUE").upper()

    # Append to history
    history: List[Dict[str, str]] = session.history or []
    history = history + [
        {"role": "user", "content": message},
        {"role": "assistant", "content": assistant_message},
    ]

    session.history = history
    session.slots = updated_slots

    if status == "DONE":
        # TODO: persist previsit data for the patient once patient mapping is in place
        session.mode = "RECOMMENDATION"

    save_session(db, session)

    return assistant_message

