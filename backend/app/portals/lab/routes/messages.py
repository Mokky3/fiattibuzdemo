from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends

from app.common.auth.auth_service import AuthenticatedUser, require_lab_technician_access
from app.common.schemas.responses_enhanced import SuccessResponse
from app.portals.lab.schemas.messages import LabContact, LabMessage, LabThread


_CONTACTS: List[LabContact] = [
    LabContact(id=1, name="Dr. Johnson", role="Physician", lastMessage="Please prioritize the urgent CBC.", lastActive="2025-06-28 14:22"),
    LabContact(id=2, name="Lab Manager", role="Manager", lastMessage="Daily summary ready.", lastActive="2025-06-28 13:10"),
]

_THREADS: dict[int, LabThread] = {
    1: LabThread(
        contact=_CONTACTS[0],
        messages=[
            LabMessage(id=1, sender="Dr. Johnson", text="Please prioritize the urgent CBC.", timestamp="2025-06-28 14:22"),
            LabMessage(id=2, sender="You", text="Acknowledged. Processing now.", timestamp="2025-06-28 14:25"),
        ],
    ),
    2: LabThread(
        contact=_CONTACTS[1],
        messages=[
            LabMessage(id=1, sender="Lab Manager", text="Daily summary ready.", timestamp="2025-06-28 13:10"),
        ],
    ),
}


router = APIRouter(prefix="/messages", tags=["Lab Messages"])


@router.get("/contacts", response_model=SuccessResponse[List[LabContact]])
async def contacts(
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> SuccessResponse:
    return SuccessResponse(data=_CONTACTS)


@router.get("/threads/{contact_id}", response_model=SuccessResponse[LabThread])
async def get_thread(
    contact_id: int,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> SuccessResponse:
    thread = _THREADS.get(contact_id) or LabThread(contact=LabContact(id=contact_id, name="Unknown", role="", lastMessage="", lastActive=""), messages=[])
    return SuccessResponse(data=thread)





