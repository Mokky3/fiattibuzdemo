"""
Telegram Gateway: thin layer between Telegram and FIATTIB orchestration.

Responsibilities:
- Receive Telegram webhook updates
- Extract chat/message
- Delegate to orchestrator
- Return a plain JSON response (actual sendMessage can be added later)
"""
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.previsit_orchestrator import handle_telegram_message
from app.api.v1.telegram_bot import require_bot_token


router = APIRouter(
    prefix="/integrations/telegram",
    tags=["Integrations · Telegram Gateway"],
)


# ----------------------- Telegram update schemas ----------------------- #
class TelegramChat(BaseModel):
    id: int


class TelegramMessage(BaseModel):
    message_id: int
    chat: TelegramChat
    text: Optional[str] = None


class TelegramUpdate(BaseModel):
    update_id: int
    message: Optional[TelegramMessage] = None


# ----------------------- Webhook endpoint ----------------------- #
@router.post(
    "/webhook",
    status_code=status.HTTP_200_OK,
)
async def telegram_webhook(
    update: TelegramUpdate,
    db: Session = Depends(get_db),
    _bot: None = Depends(require_bot_token),
):
    """
    Telegram webhook entrypoint.

    This is intentionally thin:
    - Parses update
    - Delegates to `handle_telegram_message`
    - Returns the text that should be sent back to the user

    The actual HTTP call to Telegram's `sendMessage` API can be done by
    the bot infrastructure or added as a separate helper.
    """
    if not update.message or not update.message.text:
        # Non-text or unsupported updates are acknowledged but ignored
        return {"ok": True}

    chat_id = str(update.message.chat.id)
    text = update.message.text

    reply_text = await handle_telegram_message(
        db=db,
        chat_id=chat_id,
        message=text,
    )

    # For now we just return the reply so you can inspect it or have
    # an upstream component call Telegram's sendMessage.
    return {
        "ok": True,
        "chat_id": chat_id,
        "reply": reply_text,
    }


