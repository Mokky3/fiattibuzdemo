from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends

from app.common.auth.auth_service import AuthenticatedUser, require_radiologist_access
from app.common.schemas.radiology import RadiologyContact, RadiologyThread
from app.common.services.radiology_service import list_contacts_mock, get_thread, send_message

router = APIRouter(prefix="/messages", tags=["Radiology Messages"])


@router.get("/contacts", response_model=List[RadiologyContact])
async def contacts(
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
) -> List[RadiologyContact]:
    return list_contacts_mock()


@router.get("/threads/{contact_id}", response_model=RadiologyThread)
async def get_messages(
    contact_id: int,
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
) -> RadiologyThread:
    return get_thread(contact_id)


@router.post("/threads/{contact_id}", response_model=RadiologyThread)
async def post_message(
    contact_id: int,
    content: str,
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
) -> RadiologyThread:
    send_message(contact_id, current_user.email if getattr(current_user, "email", None) else "Me", content)
    return get_thread(contact_id)





