"""Shared patient lookup service for duplicate detection and patient search.
Used by both Reception and Admin portals to ensure consistent duplicate detection rules.
"""
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import text
import re

from app.db.session import get_db
from app.services.fhir_client import FHIRClient

class PatientLookupService:
    """Shared service for patient lookup and duplicate detection."""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.fhir_client = FHIRClient(db_session=db_session)
    
    async def check_duplicates(
        self,
        pinfl: str,
        phone_number: str,
        email: Optional[str] = None,
        full_name: Optional[str] = None,
        date_of_birth: Optional[str] = None,
        clinic_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Check for potential duplicate patients using multiple criteria.
        
        Returns:
            Dict with keys:
            - is_duplicate: bool
            - existing_patient_id: str or None
            - match_fields: List[str]
            - confidence: float (0.0 to 1.0)
            - suggestions: List[Dict]
        """
        try:
            match_fields = []
            best_match = None
            best_score = 0.0
            suggestions = []
            
            # 1. Check by PINFL (exact match)
            if pinfl:
                pinfl_matches = await self._search_by_pinfl(pinfl, clinic_id)
                if pinfl_matches:
                    best_match = pinfl_matches[0]["id"]
                    best_score = 1.0
                    match_fields.append("pinfl")
                    suggestions.append({
                        "type": "exact_pinfl_match",
                        "patient_id": pinfl_matches[0]["id"],
                        "patient_name": pinfl_matches[0]["full_name"],
                        "confidence": 1.0
                    })
            
            # 2. Check by phone number (exact match)
            if phone_number and best_score < 0.9:
                phone_matches = await self._search_by_phone(phone_number, clinic_id)
                if phone_matches:
                    for match in phone_matches:
                        score = 0.9 if match["phone_number"] == phone_number else 0.8
                        if score > best_score:
                            best_match = match["id"]
                            best_score = score
                            match_fields = ["phone_number"]
                            suggestions.append({
                                "type": "phone_match",
                                "patient_id": match["id"],
                                "patient_name": match["full_name"],
                                "phone_number": match["phone_number"],
                                "confidence": score
                            })
            
            # 3. Check by email (exact match)
            if email and best_score < 0.8:
                email_matches = await self._search_by_email(email, clinic_id)
                if email_matches:
                    for match in email_matches:
                        score = 0.8 if match["email"] == email else 0.7
                        if score > best_score:
                            best_match = match["id"]
                            best_score = score
                            match_fields = ["email"]
                            suggestions.append({
                                "type": "email_match",
                                "patient_id": match["id"],
                                "patient_name": match["full_name"],
                                "email": match["email"],
                                "confidence": score
                            })
            
            # 4. Check by name similarity (fuzzy match)
            if full_name and best_score < 0.7:
                name_matches = await self._search_by_name(full_name, clinic_id)
                if name_matches:
                    for match in name_matches:
                        name_similarity = self._calculate_name_similarity(full_name, match["full_name"])
                        if name_similarity > 0.8 and best_score < name_similarity * 0.7:
                            best_match = match["id"]
                            best_score = name_similarity * 0.7
                            match_fields = ["name"]
                            suggestions.append({
                                "type": "name_similarity",
                                "patient_id": match["id"],
                                "patient_name": match["full_name"],
                                "similarity": name_similarity,
                                "confidence": name_similarity * 0.7
                            })
            
            # 5. Check by date of birth + name combination
            if date_of_birth and full_name and best_score < 0.6:
                dob_name_matches = await self._search_by_dob_and_name(date_of_birth, full_name, clinic_id)
                if dob_name_matches:
                    for match in dob_name_matches:
                        name_similarity = self._calculate_name_similarity(full_name, match["full_name"])
                        score = 0.6 + (name_similarity * 0.2)  # Base 0.6 + up to 0.2 for name similarity
                        if score > best_score:
                            best_match = match["id"]
                            best_score = score
                            match_fields = ["date_of_birth", "name"]
                            suggestions.append({
                                "type": "dob_name_combination",
                                "patient_id": match["id"],
                                "patient_name": match["full_name"],
                                "date_of_birth": match["date_of_birth"],
                                "name_similarity": name_similarity,
                                "confidence": score
                            })
            
            # Determine if this is a duplicate
            is_duplicate = best_score >= 0.8  # Threshold for considering it a duplicate
            
            return {
                "is_duplicate": is_duplicate,
                "existing_patient_id": best_match,
                "match_fields": match_fields,
                "confidence": best_score,
                "suggestions": suggestions
            }
            
        except Exception as e:
            # Log error but don't fail the registration
            return {
                "is_duplicate": False,
                "existing_patient_id": None,
                "match_fields": [],
                "confidence": 0.0,
                "suggestions": [],
                "error": str(e)
            }
    
    async def search_patients(
        self,
        query: str = "",
        pinfl: str = "",
        phone: str = "",
        clinic_id: Optional[str] = None,
        page: int = 1,
        size: int = 20
    ) -> Dict[str, Any]:
        """
        Search patients using multiple criteria.
        
        Returns:
            Dict with keys:
            - patients: List[Dict]
            - total: int
            - page: int
            - size: int
        """
        try:
            patients = []
            search_params = {}
            
            # Build search parameters
            if query:
                search_params["name"] = query
            
            if pinfl:
                search_params["identifier"] = pinfl
            
            if phone:
                search_params["telecom"] = phone
            
            # Add clinic scoping if provided
            if clinic_id:
                search_params["_tag"] = f"clinic-{clinic_id}"
            
            # Add pagination
            search_params["_count"] = size
            search_params["_offset"] = (page - 1) * size
            
            # Search FHIR Patients
            result = await self.fhir_client._make_request("GET", "Patient", params=search_params)
            
            # Transform results
            for entry in result.get("entry", []):
                patient = entry["resource"]
                
                # Extract patient data
                name_obj = patient.get("name", [{}])[0]
                given = name_obj.get("given", [])
                family = name_obj.get("family", "")
                full_name = f"{' '.join(given)} {family}".strip()
                
                # Extract contact info
                telecom = patient.get("telecom", [])
                phone_number = next((t["value"] for t in telecom if t["system"] == "phone" and t.get("use") != "emergency"), "")
                email = next((t["value"] for t in telecom if t["system"] == "email"), None)
                
                # Extract PINFL
                pinfl_value = ""
                for identifier in patient.get("identifier", []):
                    if identifier.get("system") == "https://fiattib.uz/pinfl":
                        pinfl_value = identifier.get("value", "")
                        break
                
                # Calculate match score
                match_score = self._calculate_search_score(query, full_name, phone_number, email, pinfl_value)
                
                patients.append({
                    "id": patient["id"],
                    "full_name": full_name,
                    "date_of_birth": patient.get("birthDate", ""),
                    "phone_number": phone_number,
                    "email": email,
                    "pinfl": pinfl_value,
                    "match_score": match_score
                })
            
            # Sort by match score (highest first)
            patients.sort(key=lambda x: x["match_score"], reverse=True)
            
            total = result.get("total", len(patients))
            
            return {
                "patients": patients,
                "total": total,
                "page": page,
                "size": size
            }
            
        except Exception as e:
            return {
                "patients": [],
                "total": 0,
                "page": page,
                "size": size,
                "error": str(e)
            }
    
    async def _search_by_pinfl(self, pinfl: str, clinic_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Search patients by PINFL."""
        try:
            search_params = {
                "identifier": pinfl,
                "_count": 10
            }
            
            if clinic_id:
                search_params["_tag"] = f"clinic-{clinic_id}"
            
            result = await self.fhir_client._make_request("GET", "Patient", params=search_params)
            
            matches = []
            for entry in result.get("entry", []):
                patient = entry["resource"]
                name_obj = patient.get("name", [{}])[0]
                given = name_obj.get("given", [])
                family = name_obj.get("family", "")
                full_name = f"{' '.join(given)} {family}".strip()
                
                matches.append({
                    "id": patient["id"],
                    "full_name": full_name,
                    "pinfl": pinfl
                })
            
            return matches
            
        except Exception:
            return []
    
    async def _search_by_phone(self, phone: str, clinic_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Search patients by phone number."""
        try:
            search_params = {
                "telecom": phone,
                "_count": 10
            }
            
            if clinic_id:
                search_params["_tag"] = f"clinic-{clinic_id}"
            
            result = await self.fhir_client._make_request("GET", "Patient", params=search_params)
            
            matches = []
            for entry in result.get("entry", []):
                patient = entry["resource"]
                name_obj = patient.get("name", [{}])[0]
                given = name_obj.get("given", [])
                family = name_obj.get("family", "")
                full_name = f"{' '.join(given)} {family}".strip()
                
                telecom = patient.get("telecom", [])
                phone_number = next((t["value"] for t in telecom if t["system"] == "phone" and t.get("use") != "emergency"), "")
                
                matches.append({
                    "id": patient["id"],
                    "full_name": full_name,
                    "phone_number": phone_number
                })
            
            return matches
            
        except Exception:
            return []
    
    async def _search_by_email(self, email: str, clinic_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Search patients by email."""
        try:
            search_params = {
                "telecom": email,
                "_count": 10
            }
            
            if clinic_id:
                search_params["_tag"] = f"clinic-{clinic_id}"
            
            result = await self.fhir_client._make_request("GET", "Patient", params=search_params)
            
            matches = []
            for entry in result.get("entry", []):
                patient = entry["resource"]
                name_obj = patient.get("name", [{}])[0]
                given = name_obj.get("given", [])
                family = name_obj.get("family", "")
                full_name = f"{' '.join(given)} {family}".strip()
                
                telecom = patient.get("telecom", [])
                email_value = next((t["value"] for t in telecom if t["system"] == "email"), "")
                
                matches.append({
                    "id": patient["id"],
                    "full_name": full_name,
                    "email": email_value
                })
            
            return matches
            
        except Exception:
            return []
    
    async def _search_by_name(self, name: str, clinic_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Search patients by name (fuzzy match)."""
        try:
            search_params = {
                "name": name,
                "_count": 10
            }
            
            if clinic_id:
                search_params["_tag"] = f"clinic-{clinic_id}"
            
            result = await self.fhir_client._make_request("GET", "Patient", params=search_params)
            
            matches = []
            for entry in result.get("entry", []):
                patient = entry["resource"]
                name_obj = patient.get("name", [{}])[0]
                given = name_obj.get("given", [])
                family = name_obj.get("family", "")
                full_name = f"{' '.join(given)} {family}".strip()
                
                matches.append({
                    "id": patient["id"],
                    "full_name": full_name
                })
            
            return matches
            
        except Exception:
            return []
    
    async def _search_by_dob_and_name(self, date_of_birth: str, name: str, clinic_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Search patients by date of birth and name combination."""
        try:
            search_params = {
                "birthdate": date_of_birth,
                "name": name,
                "_count": 10
            }
            
            if clinic_id:
                search_params["_tag"] = f"clinic-{clinic_id}"
            
            result = await self.fhir_client._make_request("GET", "Patient", params=search_params)
            
            matches = []
            for entry in result.get("entry", []):
                patient = entry["resource"]
                name_obj = patient.get("name", [{}])[0]
                given = name_obj.get("given", [])
                family = name_obj.get("family", "")
                full_name = f"{' '.join(given)} {family}".strip()
                
                matches.append({
                    "id": patient["id"],
                    "full_name": full_name,
                    "date_of_birth": patient.get("birthDate", "")
                })
            
            return matches
            
        except Exception:
            return []
    
    def _calculate_name_similarity(self, name1: str, name2: str) -> float:
        """Calculate similarity between two names."""
        try:
            # Normalize names
            name1_normalized = re.sub(r'\s+', ' ', name1.lower().strip())
            name2_normalized = re.sub(r'\s+', ' ', name2.lower().strip())
            
            if name1_normalized == name2_normalized:
                return 1.0
            
            # Split into words
            words1 = set(name1_normalized.split())
            words2 = set(name2_normalized.split())
            
            if not words1 or not words2:
                return 0.0
            
            # Calculate Jaccard similarity
            intersection = len(words1.intersection(words2))
            union = len(words1.union(words2))
            
            return intersection / union if union > 0 else 0.0
            
        except Exception:
            return 0.0
    
    def _calculate_search_score(self, query: str, full_name: str, phone: str, email: str, pinfl: str) -> float:
        """Calculate search relevance score."""
        try:
            if not query:
                return 1.0
            
            query_lower = query.lower()
            score = 0.0
            
            # Check exact matches
            if query_lower in full_name.lower():
                score += 0.8
            if query_lower in phone:
                score += 0.9
            if query_lower in email.lower():
                score += 0.9
            if query_lower in pinfl:
                score += 1.0
            
            # Check partial matches
            if any(word in full_name.lower() for word in query_lower.split()):
                score += 0.4
            
            return min(score, 1.0)
            
        except Exception:
            return 0.0
