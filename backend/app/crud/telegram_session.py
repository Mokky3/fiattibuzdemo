"""CRUD helpers for TelegramSession."""
from typing import Optional

from sqlalchemy.orm import Session

from app.common.models.telegram_session import TelegramSession


def get_or_create_session(db: Session, chat_id: str) -> TelegramSession:
    session: Optional[TelegramSession] = (
        db.query(TelegramSession).filter(TelegramSession.chat_id == chat_id).first()
    )
    if session:
        return session

    session = TelegramSession(chat_id=chat_id, mode="PREVISIT", slots={}, history=[])
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def save_session(db: Session, session: TelegramSession) -> TelegramSession:
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


