"""
Schemas for ICD codes API responses.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID


class IcdCodeBase(BaseModel):
    """Base ICD code schema."""
    code: str = Field(..., description="ICD code")
    version: str = Field(default="ICD-11", description="ICD version (ICD-10, ICD-11, etc.)")


class IcdCodeResponse(IcdCodeBase):
    """ICD code response schema."""
    id: UUID = Field(..., description="ICD code ID")
    description: Optional[str] = Field(None, description="Legacy description (backward compatibility)")
    description_en: Optional[str] = Field(None, description="English description")
    description_ru: Optional[str] = Field(None, description="Russian description")
    description_uz: Optional[str] = Field(None, description="Uzbek description")
    category: Optional[str] = Field(None, description="Category")
    chapter: Optional[str] = Field(None, description="Chapter number")
    parent_code: Optional[str] = Field(None, description="Parent code")
    level: Optional[int] = Field(None, description="Hierarchy level")
    is_active: bool = Field(default=True, description="Is active")
    
    class Config:
        from_attributes = True
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "code": "280385798",
                "version": "ICD-11",
                "description": "General purpose electrocardiographs",
                "description_en": "General purpose electrocardiographs",
                "description_ru": "Электрокардиографы общего назначения",
                "description_uz": "Umumiy maqsadlar uchun elektrokardiograflar",
                "category": "category",
                "chapter": "X",
                "parent_code": None,
                "level": 1,
                "is_active": True
            }
        }


class IcdCodeSearchRequest(BaseModel):
    """ICD code search request schema."""
    query: Optional[str] = Field(None, description="Search query (code or description)")
    version: str = Field(default="ICD-11", description="ICD version to search")
    language: str = Field(default="en", description="Language for description search (en, ru, uz)")
    limit: int = Field(default=50, ge=1, le=100, description="Maximum number of results")
    offset: int = Field(default=0, ge=0, description="Offset for pagination")


class IcdCodeSearchResponse(BaseModel):
    """ICD code search response schema."""
    results: List[IcdCodeResponse] = Field(..., description="Search results")
    total: int = Field(..., description="Total number of matching results")
    limit: int = Field(..., description="Results per page")
    offset: int = Field(..., description="Current offset")


class IcdCodeSelectRequest(BaseModel):
    """Request to select ICD code by code."""
    code: str = Field(..., description="ICD code")
    version: str = Field(default="ICD-11", description="ICD version")

