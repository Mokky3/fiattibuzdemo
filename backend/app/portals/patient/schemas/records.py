from pydantic import BaseModel
from typing import List, Optional

class RecordRow(BaseModel):
    id: str
    date: str
    recordType: str
    description: str
    doctor: Optional[str]
    hospital: Optional[str]

class Page(BaseModel):
    total: int
    page: int
    size: int
    items: List[RecordRow]
