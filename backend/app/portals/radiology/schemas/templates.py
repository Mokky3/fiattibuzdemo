from __future__ import annotations

from datetime import date
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class TemplateContent(BaseModel):
    findings: str
    impression: str
    recommendations: str


class TemplateContentUpdate(BaseModel):
    findings: Optional[str] = None
    impression: Optional[str] = None
    recommendations: Optional[str] = None

    class Config:
        extra = "forbid"


class RadiologyTemplateBase(BaseModel):
    name: str
    modality: str
    bodyPart: str
    category: str
    description: str
    author: str
    createdDate: date
    lastModified: date
    usageCount: int = Field(..., ge=0)
    isPrivate: bool
    isFavorite: bool
    content: TemplateContent
    tags: List[str] = Field(default_factory=list)


class RadiologyTemplate(RadiologyTemplateBase):
    id: str = Field(...)


class RadiologyTemplateSummary(BaseModel):
    total: int = Field(..., ge=0)
    favorites: int = Field(..., ge=0)
    private: int = Field(..., ge=0)
    public: int = Field(..., ge=0)
    mostUsed: int = Field(..., ge=0)
    byModality: Dict[str, int]
    byCategory: Dict[str, int]
    byAuthor: Dict[str, int]


class RadiologyTemplateCollection(BaseModel):
    items: List[RadiologyTemplate]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    size: int = Field(..., ge=1)
    summary: RadiologyTemplateSummary


class RadiologyTemplateCreate(BaseModel):
    name: str
    modality: str
    bodyPart: str
    category: str
    description: str
    content: TemplateContent
    tags: List[str] = Field(default_factory=list)
    isPrivate: bool = False
    isFavorite: bool = False
    author: Optional[str] = None


class RadiologyTemplateReplace(BaseModel):
    name: str
    modality: str
    bodyPart: str
    category: str
    description: str
    author: str
    createdDate: date
    lastModified: date
    usageCount: int = Field(..., ge=0)
    isPrivate: bool
    isFavorite: bool
    content: TemplateContent
    tags: List[str] = Field(default_factory=list)


class RadiologyTemplateUpdate(BaseModel):
    name: Optional[str] = None
    modality: Optional[str] = None
    bodyPart: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    author: Optional[str] = None
    usageCount: Optional[int] = Field(None, ge=0)
    isPrivate: Optional[bool] = None
    isFavorite: Optional[bool] = None
    content: Optional[TemplateContentUpdate] = None
    tags: Optional[List[str]] = None

    class Config:
        extra = "forbid"


class RadiologyTemplateDuplicateRequest(BaseModel):
    name: Optional[str] = None
    author: Optional[str] = None
    isPrivate: Optional[bool] = None
    isFavorite: Optional[bool] = None


class RadiologyTemplateUsageRequest(BaseModel):
    amount: int = Field(1, ge=1)





