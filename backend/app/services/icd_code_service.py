"""
Service for ICD code search and retrieval.
"""
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.crud.icd_codes import (
    search_icd_codes,
    get_icd_code_by_code,
    get_icd_code_by_id,
    get_icd_codes_by_codes
)
from app.common.schemas.icd_codes import IcdCodeResponse, IcdCodeSearchResponse
from app.db.models.ref import IcdCode


class IcdCodeService:
    """Service for ICD code operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def search(
        self,
        query: Optional[str] = None,
        version: str = "ICD-11",
        language: str = "en",
        limit: int = 50,
        offset: int = 0
    ) -> IcdCodeSearchResponse:
        """
        Search ICD codes by code or description.
        
        Args:
            query: Search query (code or description)
            version: ICD version (default: ICD-11)
            language: Language for description search (en, ru, uz)
            limit: Maximum number of results
            offset: Offset for pagination
        
        Returns:
            IcdCodeSearchResponse with results and pagination info
        """
        # Normalize language code
        language = language.lower()
        if language not in ["en", "ru", "uz"]:
            language = "en"
        
        # Normalize version
        version = version.upper()
        if version not in ["ICD-10", "ICD-11"]:
            version = "ICD-11"
        
        codes, total = search_icd_codes(
            db=self.db,
            query=query,
            version=version,
            language=language,
            limit=limit,
            offset=offset
        )
        
        # Convert to response models (Pydantic v2 uses model_validate instead of from_orm)
        try:
            results = [IcdCodeResponse.model_validate(code) for code in codes]
        except AttributeError:
            # Fallback for Pydantic v1
            results = [IcdCodeResponse.from_orm(code) for code in codes]
        
        return IcdCodeSearchResponse(
            results=results,
            total=total,
            limit=limit,
            offset=offset
        )
    
    def get_by_code(
        self,
        code: str,
        version: str = "ICD-11"
    ) -> Optional[IcdCodeResponse]:
        """
        Get ICD code by code.
        
        Args:
            code: ICD code
            version: ICD version (default: ICD-11)
        
        Returns:
            IcdCodeResponse if found, None otherwise
        """
        icd_code = get_icd_code_by_code(self.db, code, version)
        if not icd_code:
            return None
        
        try:
            return IcdCodeResponse.model_validate(icd_code)
        except AttributeError:
            return IcdCodeResponse.from_orm(icd_code)
    
    def get_by_id(
        self,
        icd_id: str
    ) -> Optional[IcdCodeResponse]:
        """
        Get ICD code by ID.
        
        Args:
            icd_id: ICD code ID (UUID)
        
        Returns:
            IcdCodeResponse if found, None otherwise
        """
        icd_code = get_icd_code_by_id(self.db, icd_id)
        if not icd_code:
            return None
        
        try:
            return IcdCodeResponse.model_validate(icd_code)
        except AttributeError:
            return IcdCodeResponse.from_orm(icd_code)
    
    def get_multiple_by_codes(
        self,
        codes: List[str],
        version: str = "ICD-11"
    ) -> List[IcdCodeResponse]:
        """
        Get multiple ICD codes by their codes.
        
        Args:
            codes: List of ICD codes
            version: ICD version (default: ICD-11)
        
        Returns:
            List of IcdCodeResponse
        """
        icd_codes = get_icd_codes_by_codes(self.db, codes, version)
        return [IcdCodeResponse.from_orm(code) for code in icd_codes]

