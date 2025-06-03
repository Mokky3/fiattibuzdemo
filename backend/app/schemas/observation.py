from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from app.models.enums import ObservationType

class ObservationBase(BaseModel):
    type: ObservationType
    value: str
    unit: Optional[str] = None
    observed_at: Optional[datetime] = None

class ObservationCreate(ObservationBase):
    pass

class ObservationRead(ObservationBase):
    id: int

    class Config:
        from_attributes = True
