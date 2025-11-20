"""Radiology templates routes backing the RadiologyTemplates component."""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status, Response
from sqlalchemy.orm import Session

from app.common.auth.auth_service import AuthenticatedUser, require_radiologist_access
from app.common.schemas.responses_enhanced import SuccessResponse
from app.db.session import get_db
from app.crud.radiology import radiology_template
from app.common.models.radiology import RadiologyTemplate as RadiologyTemplateModel
from app.portals.radiology.schemas.templates import (
    TemplateContent,
    TemplateContentUpdate,
    RadiologyTemplateBase,
    RadiologyTemplate,
    RadiologyTemplateSummary,
    RadiologyTemplateCollection,
    RadiologyTemplateCreate,
    RadiologyTemplateReplace,
    RadiologyTemplateUpdate,
    RadiologyTemplateDuplicateRequest,
    RadiologyTemplateUsageRequest,
)

router = APIRouter(prefix="/templates", tags=["Radiology Templates"])


def _utc_now() -> datetime:
    """Return the current UTC timestamp."""
    return datetime.now(timezone.utc)


def _today() -> date:
    """Return today's date in UTC."""
    return _utc_now().date()


def _resolve_author(user: AuthenticatedUser) -> Optional[str]:
    """Best effort to extract a display name for the authenticated user."""
    for attr in ("full_name", "display_name", "name", "email"):
        candidate = getattr(user, attr, None)
        if isinstance(candidate, str) and candidate.strip():
            return candidate
    return None


def _to_schema(db_obj: RadiologyTemplateModel) -> RadiologyTemplate:
    content_dict = db_obj.content or {}
    return RadiologyTemplate(
        id=str(db_obj.id),
        name=db_obj.name,
        modality=db_obj.modality,
        bodyPart=db_obj.body_part,
        category=db_obj.category,
        description=db_obj.description or "",
        author=str(db_obj.author_id) if db_obj.author_id else "",
        createdDate=db_obj.created_date,
        lastModified=db_obj.last_modified,
        usageCount=db_obj.usage_count or 0,
        isPrivate=bool(db_obj.is_private),
        isFavorite=bool(db_obj.is_favorite),
        content=TemplateContent(
            findings=content_dict.get("findings", ""),
            impression=content_dict.get("impression", ""),
            recommendations=content_dict.get("recommendations", ""),
        ),
        tags=list(db_obj.tags or []),
    )


def _calculate_summary(templates: List[RadiologyTemplate]) -> RadiologyTemplateSummary:
    favorites = sum(1 for template in templates if template.isFavorite)
    private = sum(1 for template in templates if template.isPrivate)
    public = len(templates) - private
    most_used = max((template.usageCount for template in templates), default=0)

    by_modality: Dict[str, int] = {}
    by_category: Dict[str, int] = {}
    by_author: Dict[str, int] = {}

    for template in templates:
        by_modality[template.modality] = by_modality.get(template.modality, 0) + 1
        by_category[template.category] = by_category.get(template.category, 0) + 1
        by_author[template.author or "unknown"] = by_author.get(template.author or "unknown", 0) + 1

    return RadiologyTemplateSummary(
        total=len(templates),
        favorites=favorites,
        private=private,
        public=public,
        mostUsed=most_used,
        byModality=by_modality,
        byCategory=by_category,
        byAuthor=by_author,
    )


@router.get("", response_model=SuccessResponse[RadiologyTemplateCollection])
async def list_templates(
    tab: Optional[str] = Query(None, description="Active tab context"),
    modality: Optional[str] = Query(None, description="Filter by modality"),
    category: Optional[str] = Query(None, description="Filter by category"),
    author: Optional[str] = Query(None, description="Filter by author (ignored, author_id used)"),
    search: Optional[str] = Query(None, description="Full-text search across template fields"),
    favorite: Optional[bool] = Query(None, description="Filter favorites"),
    private: Optional[bool] = Query(None, description="Filter by visibility"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=200, description="Page size"),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    # Map tab context to filters
    author_id: Optional[str] = None
    fav_flag = favorite
    priv_flag = private
    if tab:
        key = tab.lower()
        if key == "favorites":
            fav_flag = True
        elif key == "my_templates":
            author_id = getattr(current_user, "user_id", None)
        elif key not in ("all",):
            # Non-standard tabs may be categories; apply via 'category' param if not already set
            if not category:
                category = key

    skip = (page - 1) * size
    rows = radiology_template.list(
        db,
        modality=modality,
        category=category,
        author_id=author_id,
        favorite=fav_flag,
        private=priv_flag,
        search=search,
        skip=skip,
        limit=size,
    )

    items = [_to_schema(r) for r in rows]
    # For total count, do a light re-query without pagination for now
    all_rows = radiology_template.list(
        db,
        modality=modality,
        category=category,
        author_id=author_id,
        favorite=fav_flag,
        private=priv_flag,
        search=search,
        skip=0,
        limit=10_000,
    )
    total = len(all_rows)

    collection = RadiologyTemplateCollection(
        items=items,
        total=total,
        page=page,
        size=size,
        summary=_calculate_summary([_to_schema(r) for r in all_rows]),
    )
    return SuccessResponse(data=collection)


@router.get("/stats", response_model=RadiologyTemplateSummary)
async def get_template_stats(
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> RadiologyTemplateSummary:
    rows = radiology_template.list(db, skip=0, limit=10_000)
    return _calculate_summary([_to_schema(r) for r in rows])


@router.get("/{template_id}", response_model=RadiologyTemplate)
async def get_template(
    template_id: str,
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> RadiologyTemplate:
    obj = radiology_template.get(db, id=template_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return _to_schema(obj)


@router.post("", response_model=RadiologyTemplate, status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: RadiologyTemplateCreate = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> RadiologyTemplate:
    author_value = payload.author or _resolve_author(current_user) or None
    db_obj = radiology_template.create(
        db,
        obj_in={
            "name": payload.name,
            "modality": payload.modality,
            "body_part": payload.bodyPart,
            "category": payload.category,
            "description": payload.description,
            "author_id": author_value,
            "created_date": _today(),
            "last_modified": _today(),
            "usage_count": 0,
            "is_private": payload.isPrivate,
            "is_favorite": payload.isFavorite,
            "content": payload.content.dict(),
            "tags": list(payload.tags),
        },
    )
    return _to_schema(db_obj)


@router.put("/{template_id}", response_model=RadiologyTemplate)
async def replace_template(
    template_id: str,
    payload: RadiologyTemplateReplace = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> RadiologyTemplate:
    existing = radiology_template.get(db, id=template_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    updated = radiology_template.update(
        db,
        db_obj=existing,
        obj_in={
            "name": payload.name,
            "modality": payload.modality,
            "body_part": payload.bodyPart,
            "category": payload.category,
            "description": payload.description,
            "author_id": payload.author,
            "created_date": payload.createdDate,
            "last_modified": payload.lastModified,
            "usage_count": payload.usageCount,
            "is_private": payload.isPrivate,
            "is_favorite": payload.isFavorite,
            "content": payload.content.dict(),
            "tags": list(payload.tags),
        },
    )
    return _to_schema(updated)


@router.patch("/{template_id}", response_model=RadiologyTemplate)
async def patch_template(
    template_id: str,
    payload: RadiologyTemplateUpdate = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> RadiologyTemplate:
    existing = radiology_template.get(db, id=template_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    updates = payload.dict(exclude_none=True)
    obj_in: Dict[str, object] = {}

    if "name" in updates:
        obj_in["name"] = updates["name"]
    if "modality" in updates:
        obj_in["modality"] = updates["modality"]
    if "bodyPart" in updates:
        obj_in["body_part"] = updates["bodyPart"]
    if "category" in updates:
        obj_in["category"] = updates["category"]
    if "description" in updates:
        obj_in["description"] = updates["description"]
    if "author" in updates:
        obj_in["author_id"] = updates["author"]
    if "usageCount" in updates:
        obj_in["usage_count"] = updates["usageCount"]
    if "isPrivate" in updates:
        obj_in["is_private"] = updates["isPrivate"]
    if "isFavorite" in updates:
        obj_in["is_favorite"] = updates["isFavorite"]
    if "tags" in updates and updates["tags"] is not None:
        obj_in["tags"] = list(updates["tags"])

    # Handle nested content updates
    if "content" in updates and updates["content"] is not None:
        existing_content = existing.content or {}
        content_updates = updates["content"] or {}
        merged_content = {**existing_content, **content_updates}
        obj_in["content"] = merged_content

    # Always update last_modified
    obj_in["last_modified"] = _today()

    updated = radiology_template.update(db, db_obj=existing, obj_in=obj_in)
    return _to_schema(updated)


@router.delete(
    "/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_template(
    template_id: str,
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> Response:
    existing = radiology_template.get(db, id=template_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    radiology_template.remove(db, id=template_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{template_id}/duplicate", response_model=RadiologyTemplate, status_code=status.HTTP_201_CREATED)
async def duplicate_template(
    template_id: str,
    payload: RadiologyTemplateDuplicateRequest = Body(default_factory=RadiologyTemplateDuplicateRequest),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> RadiologyTemplate:
    author_id = getattr(current_user, "user_id", None)
    dup = radiology_template.duplicate(
        db,
        template_id=template_id,
        name=payload.name,
        author_id=author_id,
        is_private=payload.isPrivate,
        is_favorite=payload.isFavorite,
    )
    if not dup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return _to_schema(dup)


@router.post("/{template_id}/usage", response_model=RadiologyTemplate)
async def increment_template_usage(
    template_id: str,
    payload: RadiologyTemplateUsageRequest = Body(default_factory=RadiologyTemplateUsageRequest),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> RadiologyTemplate:
    updated = radiology_template.increment_usage(db, template_id=template_id, amount=payload.amount)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return _to_schema(updated)
