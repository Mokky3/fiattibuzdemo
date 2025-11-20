from __future__ import annotations

from typing import List

from pydantic import BaseModel


class LabContact(BaseModel):
    id: int
    name: str
    role: str
    lastMessage: str
    lastActive: str


class LabMessage(BaseModel):
    id: int
    sender: str
    text: str
    timestamp: str


class LabThread(BaseModel):
    contact: LabContact
    messages: List[LabMessage]





