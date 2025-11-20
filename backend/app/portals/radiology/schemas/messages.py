from __future__ import annotations

from typing import List

from pydantic import BaseModel


class RadiologyContact(BaseModel):
    id: int
    name: str
    role: str
    lastMessage: str
    lastActive: str


class RadiologyMessage(BaseModel):
    id: int
    sender: str
    text: str
    timestamp: str


class RadiologyThread(BaseModel):
    contact: RadiologyContact
    messages: List[RadiologyMessage]





