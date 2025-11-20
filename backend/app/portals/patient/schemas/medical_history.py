"""Patient medical history schemas."""
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class AllergyItem(BaseModel):
    """Allergy item."""
    name: str = Field(..., description="Allergy name")
    severity: Optional[str] = Field(None, description="Allergy severity (mild, moderate, severe)")
    reaction: Optional[str] = Field(None, description="Reaction description")
    onset_date: Optional[date] = Field(None, description="Onset date")
    status: Optional[str] = Field("active", description="Status (active, resolved)")


class ChronicConditionItem(BaseModel):
    """Chronic condition item."""
    condition: str = Field(..., description="Condition name")
    icd10_code: Optional[str] = Field(None, description="ICD-10 code")
    diagnosed_date: Optional[date] = Field(None, description="Diagnosis date")
    status: Optional[str] = Field("active", description="Status (active, resolved, chronic)")
    severity: Optional[str] = Field(None, description="Severity (mild, moderate, severe)")
    notes: Optional[str] = Field(None, description="Additional notes")


class MedicalHistoryOut(BaseModel):
    """Medical history output schema."""
    allergies: List[AllergyItem] = Field(default_factory=list, description="List of allergies")
    chronic_conditions: List[ChronicConditionItem] = Field(default_factory=list, description="List of chronic conditions")
    last_updated: Optional[datetime] = Field(None, description="Last update timestamp")


class MedicalHistoryUpdate(BaseModel):
    """Medical history update request."""
    allergies: Optional[List[AllergyItem]] = Field(None, description="List of allergies to update")
    chronic_conditions: Optional[List[ChronicConditionItem]] = Field(None, description="List of chronic conditions to update")


class MedicalHistorySimpleUpdate(BaseModel):
    """Simplified medical history update (for frontend compatibility)."""
    allergies: Optional[List[str]] = Field(None, description="List of allergy names (strings)")
    chronic_conditions: Optional[List[str]] = Field(None, description="List of condition names (strings)")

