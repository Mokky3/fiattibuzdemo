from pydantic import BaseModel
from typing import Optional

class PrescriptionRow(BaseModel):
    id: str
    medicineName: str
    knownAs: Optional[str]
    description: Optional[str]
    prescribedDate: str
    endDate: Optional[str]
    prescribedBy: str
    hospital: Optional[str]
    dosage: Optional[str]
    frequency: Optional[str]
    status: str
    remainingRefills: int
    totalRefills: int
    price: Optional[str]

class RefillRequest(BaseModel):
    pharmacy_id: Optional[str] = None
