# backend/app/services/snomed.py
"""SNOMED CT integration service"""
import httpx
from typing import List, Dict, Optional

class SNOMEDService:
    def __init__(self):
        self.base_url = "https://snowstorm.ihtsdotools.org"
        self.edition = "SNOMEDCT-US"
        self.client = httpx.AsyncClient()
    
    async def search_concepts(self, term: str, semantic_tag: Optional[str] = None) -> List[Dict]:
        """Search SNOMED CT concepts"""
        params = {
            "term": term,
            "limit": 20,
            "active": True
        }
        
        if semantic_tag:
            params["semanticTag"] = semantic_tag
        
        url = f"{self.base_url}/MAIN/{self.edition}/concepts"
        response = await self.client.get(url, params=params)
        
        if response.status_code == 200:
            data = response.json()
            return data.get("items", [])
        else:
            return []
    
    async def get_concept(self, concept_id: str) -> Dict:
        """Get a specific SNOMED CT concept"""
        url = f"{self.base_url}/MAIN/{self.edition}/concepts/{concept_id}"
        response = await self.client.get(url)
        
        if response.status_code == 200:
            return response.json()
        else:
            return None

snomed_service = SNOMEDService()

async def search_snomed_concepts(term: str, semantic_tag: Optional[str] = None) -> List[Dict]:
    """Search SNOMED CT concepts"""
    concepts = await snomed_service.search_concepts(term, semantic_tag)
    return [
        {
            "code": concept.get("conceptId"),
            "display": concept.get("fsn", {}).get("term", ""),
            "preferred_term": concept.get("pt", {}).get("term", "")
        }
        for concept in concepts
    ]
