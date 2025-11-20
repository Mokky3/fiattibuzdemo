"""
CRUD operations for ICD codes.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, case
from app.db.models.ref import IcdCode


def get_icd_code_by_id(db: Session, icd_id: str) -> Optional[IcdCode]:
    """Get ICD code by ID."""
    return db.query(IcdCode).filter(IcdCode.id == icd_id).first()


def get_icd_code_by_code(db: Session, code: str, version: str = "ICD-11") -> Optional[IcdCode]:
    """Get ICD code by code and version."""
    return db.query(IcdCode).filter(
        IcdCode.code == code,
        IcdCode.version == version,
        IcdCode.is_active == True
    ).first()


def search_icd_codes(
    db: Session,
    query: Optional[str] = None,
    version: str = "ICD-11",
    language: str = "en",
    limit: int = 50,
    offset: int = 0
) -> tuple[List[IcdCode], int]:
    """
    Search ICD codes by code or description.
    
    Args:
        db: Database session
        query: Search query (code or description)
        version: ICD version (default: ICD-11)
        language: Language for description search (en, ru, uz)
        limit: Maximum number of results
        offset: Offset for pagination
    
    Returns:
        Tuple of (list of ICD codes, total count)
    """
    base_query = db.query(IcdCode).filter(
        IcdCode.version == version,
        IcdCode.is_active == True
    )
    
    if query:
        query_trimmed = query.strip()
        query_lower = query_trimmed.lower()
        
        # Build search conditions
        # Search in code, description_en, description_ru, description_uz
        search_conditions = [
            IcdCode.code.ilike(f"%{query_lower}%")
        ]
        
        # Search in descriptions based on language
        # Use trimmed query for description search (ilike is case-insensitive)
        if language == "en":
            search_conditions.append(IcdCode.description_en.ilike(f"%{query_trimmed}%"))
            # Also search in legacy description field
            search_conditions.append(IcdCode.description.ilike(f"%{query_trimmed}%"))
        elif language == "ru":
            search_conditions.append(IcdCode.description_ru.ilike(f"%{query_trimmed}%"))
        elif language == "uz":
            search_conditions.append(IcdCode.description_uz.ilike(f"%{query_trimmed}%"))
        else:
            # Default: search in all descriptions
            search_conditions.extend([
                IcdCode.description_en.ilike(f"%{query_trimmed}%"),
                IcdCode.description_ru.ilike(f"%{query_trimmed}%"),
                IcdCode.description_uz.ilike(f"%{query_trimmed}%"),
                IcdCode.description.ilike(f"%{query_trimmed}%")
            ])
        
        base_query = base_query.filter(or_(*search_conditions))
    
    # Get total count
    total_count = base_query.count()
    
    # Apply ordering and pagination
    if query:
        query_trimmed = query.strip()
        query_lower = query_trimmed.lower()
        # Prioritize exact code matches, then code starts with query, then descriptions
        results = base_query.order_by(
            case(
                (IcdCode.code == query_trimmed, 0),
                (IcdCode.code.ilike(f"{query_lower}%"), 1),
                else_=2
            ),
            IcdCode.code
        ).offset(offset).limit(limit).all()
    else:
        # No query - just order by code
        results = base_query.order_by(IcdCode.code).offset(offset).limit(limit).all()
    
    return results, total_count


def get_icd_codes_by_codes(
    db: Session,
    codes: List[str],
    version: str = "ICD-11"
) -> List[IcdCode]:
    """Get multiple ICD codes by their codes."""
    return db.query(IcdCode).filter(
        IcdCode.code.in_(codes),
        IcdCode.version == version,
        IcdCode.is_active == True
    ).all()


def get_icd_code_hierarchy(
    db: Session,
    code: str,
    version: str = "ICD-11"
) -> dict:
    """Get ICD code with parent and children hierarchy."""
    icd_code = get_icd_code_by_code(db, code, version)
    if not icd_code:
        return None
    
    result = {
        "code": icd_code,
        "parent": None,
        "children": []
    }
    
    # Get parent if exists
    if icd_code.parent_code:
        result["parent"] = get_icd_code_by_code(db, icd_code.parent_code, version)
    
    # Get children
    result["children"] = db.query(IcdCode).filter(
        IcdCode.parent_code == code,
        IcdCode.version == version,
        IcdCode.is_active == True
    ).all()
    
    return result

