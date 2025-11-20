"""
Pydantic schemas for medication API endpoints.
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
import uuid


class UnitResponse(BaseModel):
    """Unit response schema."""
    id: uuid.UUID
    code: str
    name: str
    
    class Config:
        from_attributes = True


class RouteResponse(BaseModel):
    """Route response schema."""
    id: uuid.UUID
    code: str
    name: str
    
    class Config:
        from_attributes = True


class DosageFormResponse(BaseModel):
    """Dosage form response schema."""
    id: uuid.UUID
    code: Optional[str] = None
    name: str
    
    class Config:
        from_attributes = True


class ManufacturerResponse(BaseModel):
    """Manufacturer response schema."""
    id: uuid.UUID
    name: str
    country: Optional[str] = None
    
    class Config:
        from_attributes = True


class MNNResponse(BaseModel):
    """MNN response schema."""
    id: uuid.UUID
    name: str
    
    class Config:
        from_attributes = True


class CategoryTagResponse(BaseModel):
    """Category tag response schema."""
    id: uuid.UUID
    name: str
    
    class Config:
        from_attributes = True


class MedicationPriceResponse(BaseModel):
    """Medication price response schema."""
    id: uuid.UUID
    price_type: str  # retail, wholesale, cap
    currency: str
    amount: Decimal
    source: Optional[str] = None
    noted_at: datetime
    
    class Config:
        from_attributes = True


class MedicationPresentationResponse(BaseModel):
    """Medication presentation response schema."""
    id: uuid.UUID
    pack_text: Optional[str] = None
    items_per_pack: Optional[int] = None
    pack_size_value: Optional[Decimal] = None
    gtin: Optional[str] = None
    prices: List[MedicationPriceResponse] = []
    
    class Config:
        from_attributes = True


class MedicationProductResponse(BaseModel):
    """Medication product response schema."""
    id: uuid.UUID
    pharm_id: Optional[str] = None
    brand_name: str
    registration_number: Optional[str] = None
    mnn: Optional[MNNResponse] = None
    dosage_form: Optional[DosageFormResponse] = None
    route: Optional[RouteResponse] = None
    strength_value: Optional[Decimal] = None
    strength_unit: Optional[UnitResponse] = None
    manufacturer: Optional[ManufacturerResponse] = None
    country_of_origin: Optional[str] = None
    rx_required: Optional[bool] = None
    categories: List[CategoryTagResponse] = []
    presentations: List[MedicationPresentationResponse] = []
    cheapest_retail_price: Optional[Decimal] = None  # Computed field
    cheapest_retail_currency: Optional[str] = None  # Computed field
    
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class MedicationSearchResponse(BaseModel):
    """Medication search response schema."""
    products: List[MedicationProductResponse]
    total: int
    limit: int
    offset: int
    
    class Config:
        from_attributes = True


class MedicationSearchParams(BaseModel):
    """Medication search parameters."""
    q: Optional[str] = Field(None, description="Search query (brand name)")
    mnn: Optional[str] = Field(None, description="Filter by MNN")
    form: Optional[str] = Field(None, description="Filter by dosage form")
    route: Optional[str] = Field(None, description="Filter by route")
    rx: Optional[bool] = Field(None, description="Filter by prescription required")
    category: Optional[str] = Field(None, description="Filter by category")
    limit: int = Field(20, ge=1, le=100, description="Number of results")
    offset: int = Field(0, ge=0, description="Offset for pagination")

