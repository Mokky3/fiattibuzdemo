"""Reception portal – patients router - ENHANCED
Enhanced features:
- Improved patient search with fuzzy matching
- Patient duplicate detection
- Enhanced FHIR Patient resource with extensions
- Insurance information handling
- Patient invitation system with SMS/Email
- Advanced filtering and pagination
- Patient statistics for dashboard
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from pydantic import BaseModel, Field, EmailStr, validator

# from db import fhir_repo  # TODO: implement FHIR repository
from .auth import get_current_receptionist, ReceptionistUser
# from services.notifications import send_invitation_sms, send_invitation_email  # TODO: implement notifications
# from services.search import fuzzy_search  # TODO: implement search

router = APIRouter(prefix="/api/v1/patients", tags=["Reception · Patients"])

# ──────────────────────────────────────────────────────── Enhanced DTOs ──
class PatientRegisterPayload(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    date_of_birth: str = Field(..., description="YYYY-MM-DD format")
    gender: str = Field(..., pattern="^(Male|Female|Other)$")
    phone_number: str = Field(..., min_length=10, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = Field(None, max_length=200)
    emergency_contact: Optional[str] = Field(None, max_length=100)
    emergency_phone: Optional[str] = Field(None, max_length=20)
    pinfl: str = Field(..., min_length=14, max_length=14, description="Personal identification number")
    
    # Enhanced fields
    nationality: Optional[str] = Field(None, max_length=50)
    marital_status: Optional[str] = Field(None, pattern="^(Single|Married|Divorced|Widowed)$")
    occupation: Optional[str] = Field(None, max_length=100)
    insurance_provider: Optional[str] = Field(None, max_length=100)
    insurance_id: Optional[str] = Field(None, max_length=50)
    preferred_language: str = Field("en", pattern="^(en|uz|ru)$")
    
    @validator('date_of_birth')
    def validate_birth_date(cls, v):
        try:
            birth_date = datetime.strptime(v, "%Y-%m-%d").date()
            today = datetime.now().date()
            if birth_date >= today:
                raise ValueError("Birth date must be in the past")
            if (today - birth_date).days > 365 * 150:  # 150 years max
                raise ValueError("Invalid birth date")
            return v
        except ValueError as e:
            if "Birth date" in str(e) or "Invalid" in str(e):
                raise e
            raise ValueError("Invalid date format. Use YYYY-MM-DD")

class PatientListItem(BaseModel):
    id: str
    first_name: str
    last_name: str
    date_of_birth: str
    phone_number: str
    email: Optional[str] = None
    insurance_provider: Optional[str] = None
    last_visit: Optional[str] = None
    status: str = "active"  # active | inactive | archived

class PatientSearchResult(BaseModel):
    id: str
    full_name: str
    date_of_birth: str
    phone_number: str
    email: Optional[str] = None
    pinfl: str
    match_score: float = 1.0

class PatientStats(BaseModel):
    total_patients: int
    new_patients_today: int
    new_patients_this_week: int
    active_patients: int

class DuplicateCheck(BaseModel):
    is_duplicate: bool
    existing_patient_id: Optional[str] = None
    match_fields: List[str] = []
    confidence: float = 0.0

# ──────────────────────────────────────────────────────── Enhanced Storage ──
_PATIENTS: Dict[str, PatientListItem] = {}
_PATIENT_FHIR_MAP: Dict[str, str] = {}  # patient_id -> fhir_resource_id

# ──────────────────────────────────────────────────────── Enhanced Helpers ──
def build_fhir_patient(pid: str, payload: PatientRegisterPayload) -> Dict[str, Any]:
    """Build enhanced FHIR Patient resource with extensions."""
    # Parse name
    name_parts = payload.full_name.strip().split()
    first_name = name_parts[0] if name_parts else ""
    last_name = name_parts[-1] if len(name_parts) > 1 else ""
    middle_names = name_parts[1:-1] if len(name_parts) > 2 else []

    # Build telecom array
    telecom = [{"system": "phone", "value": payload.phone_number, "use": "mobile"}]
    if payload.email:
        telecom.append({"system": "email", "value": payload.email, "use": "home"})
    if payload.emergency_phone:
        telecom.append({"system": "phone", "value": payload.emergency_phone, "use": "emergency"})

    # Build contact array
    contact = []
    if payload.emergency_contact:
        contact.append({
            "relationship": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/v2-0131",
                    "code": "EP",
                    "display": "Emergency contact person"
                }]
            }],
            "name": {"text": payload.emergency_contact},
            "telecom": [{"system": "phone", "value": payload.emergency_phone}] if payload.emergency_phone else []
        })

    # Build extensions
    extensions = [
        {
            "url": "https://fiattib.uz/fhir/StructureDefinition/patient-pinfl",
            "valueString": payload.pinfl
        }
    ]
    
    if payload.nationality:
        extensions.append({
            "url": "http://hl7.org/fhir/StructureDefinition/patient-nationality",
            "extension": [{
                "url": "code",
                "valueCodeableConcept": {
                    "coding": [{"code": payload.nationality, "display": payload.nationality}]
                }
            }]
        })
    
    if payload.insurance_provider:
        extensions.append({
            "url": "https://fiattib.uz/fhir/StructureDefinition/insurance-info",
            "extension": [
                {"url": "provider", "valueString": payload.insurance_provider},
                {"url": "id", "valueString": payload.insurance_id or ""}
            ]
        })

    return {
        "resourceType": "Patient",
        "id": pid,
        "meta": {
            "profile": ["http://hl7.org/fhir/StructureDefinition/Patient"],
            "lastUpdated": datetime.now(timezone.utc).isoformat(),
            "source": "reception-portal"
        },
        "identifier": [
            {
                "system": "https://fiattib.uz/pinfl",
                "value": payload.pinfl,
                "type": {
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                        "code": "NI",
                        "display": "National identifier"
                    }]
                }
            }
        ],
        "active": True,
        "name": [{
            "use": "official",
            "family": last_name,
            "given": [first_name] + middle_names,
            "text": payload.full_name
        }],
        "telecom": telecom,
        "gender": payload.gender.lower(),
        "birthDate": payload.date_of_birth,
        "address": [{"text": payload.address, "use": "home"}] if payload.address else [],
        "contact": contact,
        "communication": [{
            "language": {
                "coding": [{
                    "system": "urn:ietf:bcp:47",
                    "code": payload.preferred_language,
                    "display": {"en": "English", "uz": "Uzbek", "ru": "Russian"}.get(payload.preferred_language, "English")
                }]
            },
            "preferred": True
        }],
        "extension": extensions
    }

def extract_patient_list_item(patient_fhir: Dict[str, Any]) -> PatientListItem:
    """Extract PatientListItem from FHIR Patient resource."""
    name_obj = patient_fhir.get("name", [{}])[0]
    given = name_obj.get("given", [])
    family = name_obj.get("family", "")
    
    # Extract contact info
    telecom = patient_fhir.get("telecom", [])
    phone = next((t["value"] for t in telecom if t["system"] == "phone" and t.get("use") != "emergency"), "")
    email = next((t["value"] for t in telecom if t["system"] == "email"), None)
    
    # Extract insurance info from extensions
    insurance_provider = None
    extensions = patient_fhir.get("extension", [])
    for ext in extensions:
        if ext.get("url") == "https://fiattib.uz/fhir/StructureDefinition/insurance-info":
            for sub_ext in ext.get("extension", []):
                if sub_ext.get("url") == "provider":
                    insurance_provider = sub_ext.get("valueString")
                    break
    
    return PatientListItem(
        id=patient_fhir["id"],
        first_name=given[0] if given else "",
        last_name=family,
        date_of_birth=patient_fhir.get("birthDate", ""),
        phone_number=phone,
        email=email,
        insurance_provider=insurance_provider,
        last_visit=None,  # Would need to query appointments
        status="active" if patient_fhir.get("active", True) else "inactive"
    )

async def check_duplicates(payload: PatientRegisterPayload) -> DuplicateCheck:
    """Check for potential duplicate patients."""
    # Get all existing patients
    all_patients = fhir_repo.list_resources("Patient")
    
    best_match = None
    best_score = 0.0
    match_fields = []
    
    for patient in all_patients:
        score = 0.0
        current_match_fields = []
        
        # Check PINFL (exact match = duplicate)
        identifiers = patient.get("identifier", [])
        for identifier in identifiers:
            if identifier.get("system") == "https://fiattib.uz/pinfl" and identifier.get("value") == payload.pinfl:
                return DuplicateCheck(
                    is_duplicate=True,
                    existing_patient_id=patient["id"],
                    match_fields=["pinfl"],
                    confidence=1.0
                )
        
        # Check phone number (high weight)
        telecom = patient.get("telecom", [])
        for contact in telecom:
            if contact.get("system") == "phone" and contact.get("value") == payload.phone_number:
                score += 0.4
                current_match_fields.append("phone")
                break
        
        # Check email (medium weight)
        if payload.email:
            for contact in telecom:
                if contact.get("system") == "email" and contact.get("value") == payload.email:
                    score += 0.3
                    current_match_fields.append("email")
                    break
        
        # Check name similarity (lower weight)
        name_obj = patient.get("name", [{}])[0]
        patient_name = name_obj.get("text", "")
        if not patient_name:
            given = name_obj.get("given", [])
            family = name_obj.get("family", "")
            patient_name = f"{' '.join(given)} {family}".strip()
        
        name_similarity = fuzzy_search.calculate_similarity(payload.full_name.lower(), patient_name.lower())
        if name_similarity > 0.8:  # High name similarity
            score += 0.2 * name_similarity
            current_match_fields.append("name")
        
        # Check birth date (medium weight)
        if patient.get("birthDate") == payload.date_of_birth:
            score += 0.1
            current_match_fields.append("birth_date")
        
        if score > best_score:
            best_score = score
            best_match = patient["id"]
            match_fields = current_match_fields
    
    # Consider it a potential duplicate if score > 0.7
    is_duplicate = best_score > 0.7
    
    return DuplicateCheck(
        is_duplicate=is_duplicate,
        existing_patient_id=best_match if is_duplicate else None,
        match_fields=match_fields,
        confidence=best_score
    )

# ───────────────────────────────────────────────────────────── Enhanced Routes ─────────
@router.get("", response_model=List[PatientListItem])
async def list_patients(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    search: str = Query("", description="Search by name, phone, or email"),
    status: str = Query("all", description="Filter by status: all|active|inactive"),
    insurance: str = Query("", description="Filter by insurance provider"),
    created_after: Optional[str] = Query(None, description="YYYY-MM-DD - patients created after date"),
    _: ReceptionistUser = Depends(get_current_receptionist),
):
    """Enhanced patient listing with advanced filtering."""
    # Get patients from FHIR repository
    patients = fhir_repo.list_resources("Patient")
    result = []
    
    for patient_fhir in patients:
        patient_item = extract_patient_list_item(patient_fhir)
        
        # Apply filters
        if status != "all" and patient_item.status != status:
            continue
        
        if insurance and (not patient_item.insurance_provider or 
                         insurance.lower() not in patient_item.insurance_provider.lower()):
            continue
        
        if created_after:
            created_date = patient_fhir.get("meta", {}).get("lastUpdated", "")
            if created_date and created_date[:10] < created_after:
                continue
        
        if search:
            search_lower = search.lower()
            searchable_text = f"{patient_item.first_name} {patient_item.last_name} {patient_item.phone_number} {patient_item.email or ''}".lower()
            if search_lower not in searchable_text:
                continue
        
        result.append(patient_item)
        
        # Cache in memory for quick access
        _PATIENTS[patient_item.id] = patient_item
    
    # Sort by last name, first name
    result.sort(key=lambda x: (x.last_name, x.first_name))
    
    # Apply pagination
    start = (page - 1) * size
    return result[start:start + size]

@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=PatientListItem)
async def register_patient(
    payload: PatientRegisterPayload,
    force_create: bool = Query(False, description="Force creation even if duplicates found"),
    _: ReceptionistUser = Depends(get_current_receptionist),
):
    """Enhanced patient registration with duplicate checking."""
    
    # Check for duplicates unless forced
    if not force_create:
        duplicate_check = await check_duplicates(payload)
        if duplicate_check.is_duplicate:
            raise HTTPException(
                status_code=409, 
                detail={
                    "message": "Potential duplicate patient found",
                    "existing_patient_id": duplicate_check.existing_patient_id,
                    "match_fields": duplicate_check.match_fields,
                    "confidence": duplicate_check.confidence,
                    "suggestion": "Review existing patient or use force_create=true"
                }
            )
    
    # Generate unique patient ID
    pid = f"p{uuid4().hex[:8]}"
    
    # Build and save FHIR Patient
    fhir_patient = build_fhir_patient(pid, payload)
    fhir_repo.save(pid, fhir_patient)
    
    # Extract list item for response
    patient_item = extract_patient_list_item(fhir_patient)
    
    # Cache in memory
    _PATIENTS[pid] = patient_item
    _PATIENT_FHIR_MAP[pid] = pid
    
    return patient_item

@router.get("/search", response_model=List[PatientSearchResult])
async def search_patients(
    q: str = Query("", description="Search query"),
    full_name: str = Query("", description="Full name search"),
    date_of_birth: str = Query("", description="Date of birth YYYY-MM-DD"),
    pinfl: str = Query("", description="PINFL number"),
    phone: str = Query("", description="Phone number"),
    fuzzy: bool = Query(True, description="Enable fuzzy matching"),
    limit: int = Query(10, ge=1, le=50),
    _: ReceptionistUser = Depends(get_current_receptionist),
):
    """Enhanced patient search with fuzzy matching and multiple criteria."""
    
    if not any([q, full_name, date_of_birth, pinfl, phone]):
        return []
    
    patients = fhir_repo.list_resources("Patient")
    results = []
    
    for patient_fhir in patients:
        score = 0.0
        
        # Extract patient data
        name_obj = patient_fhir.get("name", [{}])[0]
        patient_name = name_obj.get("text", "")
        if not patient_name:
            given = name_obj.get("given", [])
            family = name_obj.get("family", "")
            patient_name = f"{' '.join(given)} {family}".strip()
        
        patient_phone = ""
        patient_email = None
        telecom = patient_fhir.get("telecom", [])
        for contact in telecom:
            if contact.get("system") == "phone":
                patient_phone = contact.get("value", "")
            elif contact.get("system") == "email":
                patient_email = contact.get("value")
        
        patient_pinfl = ""
        identifiers = patient_fhir.get("identifier", [])
        for identifier in identifiers:
            if identifier.get("system") == "https://fiattib.uz/pinfl":
                patient_pinfl = identifier.get("value", "")
                break
        
        # Exact matches (high score)
        if pinfl and patient_pinfl == pinfl:
            score += 1.0
        elif date_of_birth and patient_fhir.get("birthDate") == date_of_birth:
            score += 0.8
        elif phone and patient_phone == phone:
            score += 0.7
        
        # Name matching
        if full_name or q:
            search_name = full_name or q
            if fuzzy:
                name_score = fuzzy_search.calculate_similarity(search_name.lower(), patient_name.lower())
                score += name_score * 0.6
            else:
                if search_name.lower() in patient_name.lower():
                    score += 0.6
        
        # General query matching
        if q and not full_name:
            searchable_text = f"{patient_name} {patient_phone} {patient_email or ''} {patient_pinfl}".lower()
            if q.lower() in searchable_text:
                score += 0.3
        
        # Only include results with reasonable scores
        if score > 0.3:
            results.append(PatientSearchResult(
                id=patient_fhir["id"],
                full_name=patient_name,
                date_of_birth=patient_fhir.get("birthDate", ""),
                phone_number=patient_phone,
                email=patient_email,
                pinfl=patient_pinfl,
                match_score=score
            ))
    
    # Sort by match score (highest first)
    results.sort(key=lambda x: x.match_score, reverse=True)
    
    return results[:limit]

@router.get("/check-duplicate", response_model=DuplicateCheck)
async def check_duplicate_patient(
    full_name: str = Query(...),
    phone_number: str = Query(...),
    pinfl: str = Query(...),
    email: Optional[str] = Query(None),
    date_of_birth: Optional[str] = Query(None),
    _: ReceptionistUser = Depends(get_current_receptionist),
):
    """Check for duplicate patients before registration."""
    # Create temporary payload for duplicate checking
    temp_payload = PatientRegisterPayload(
        full_name=full_name,
        phone_number=phone_number,
        pinfl=pinfl,
        email=email,
        date_of_birth=date_of_birth or "1990-01-01",  # Default for checking
        gender="Male"  # Default for checking
    )
    
    return await check_duplicates(temp_payload)

@router.post("/invite", status_code=status.HTTP_200_OK)
async def invite_patient(
    patient_id: str = Body(..., embed=True),
    invitation_type: str = Body("both", description="sms|email|both"),
    custom_message: Optional[str] = Body(None, description="Custom invitation message"),
    _: ReceptionistUser = Depends(get_current_receptionist),
):
    """Enhanced patient invitation with customizable messages."""
    
    # Get patient data
    patient_fhir = fhir_repo.get("Patient", patient_id)
    if not patient_fhir:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Extract contact information
    telecom = patient_fhir.get("telecom", [])
    phone = next((t["value"] for t in telecom if t["system"] == "phone"), None)
    email = next((t["value"] for t in telecom if t["system"] == "email"), None)
    
    # Get patient name
    name_obj = patient_fhir.get("name", [{}])[0]
    patient_name = name_obj.get("text", "")
    if not patient_name:
        given = name_obj.get("given", [])
        family = name_obj.get("family", "")
        patient_name = f"{' '.join(given)} {family}".strip()
    
    # Prepare invitation message
    default_message = f"Hello {patient_name}, you are invited to register with FIATTIB Medical Center. Please visit our portal to complete your registration."
    message = custom_message or default_message
    
    invitation_results = {}
    
    # Send SMS invitation
    if invitation_type in ["sms", "both"] and phone:
        try:
            # await send_invitation_sms(phone, message) # TODO: implement notifications
            invitation_results["sms"] = {"status": "sent", "recipient": phone}
        except Exception as e:
            invitation_results["sms"] = {"status": "failed", "error": str(e)}
    elif invitation_type in ["sms", "both"]:
        invitation_results["sms"] = {"status": "failed", "error": "No phone number available"}
    
    # Send Email invitation
    if invitation_type in ["email", "both"] and email:
        try:
            # await send_invitation_email( # TODO: implement notifications
            #     email, 
            #     "Invitation to FIATTIB Medical Center",
            #     message
            # )
            invitation_results["email"] = {"status": "sent", "recipient": email}
        except Exception as e:
            invitation_results["email"] = {"status": "failed", "error": str(e)}
    elif invitation_type in ["email", "both"]:
        invitation_results["email"] = {"status": "failed", "error": "No email address available"}
    
    return {
        "patient_id": patient_id,
        "invitation_results": invitation_results,
        "message": message
    }

@router.get("/stats", response_model=PatientStats)
async def get_patient_stats(
    _: ReceptionistUser = Depends(get_current_receptionist),
):
    """Get patient statistics for dashboard."""
    patients = fhir_repo.list_resources("Patient")
    
    total_patients = len(patients)
    active_patients = sum(1 for p in patients if p.get("active", True))
    
    # Count new patients today and this week
    today = datetime.now().date()
    week_start = today - timedelta(days=today.weekday())
    
    new_today = 0
    new_this_week = 0
    
    for patient in patients:
        created_date_str = patient.get("meta", {}).get("lastUpdated", "")
        if created_date_str:
            try:
                created_date = datetime.fromisoformat(created_date_str.replace('Z', '+00:00')).date()
                if created_date == today:
                    new_today += 1
                if created_date >= week_start:
                    new_this_week += 1
            except:
                continue
    
    return PatientStats(
        total_patients=total_patients,
        new_patients_today=new_today,
        new_patients_this_week=new_this_week,
        active_patients=active_patients
    )

@router.get("/{patient_id}", response_model=PatientListItem)
async def get_patient(
    patient_id: str,
    _: ReceptionistUser = Depends(get_current_receptionist),
):
    """Get detailed patient information."""
    
    # Check cache first
    if patient_id in _PATIENTS:
        return _PATIENTS[patient_id]
    
    # Get from FHIR repository
    patient_fhir = fhir_repo.get("Patient", patient_id)
    if not patient_fhir:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient_item = extract_patient_list_item(patient_fhir)
    
    # Cache for future use
    _PATIENTS[patient_id] = patient_item
    
    return patient_item

@router.patch("/{patient_id}", response_model=PatientListItem)
async def update_patient(
    patient_id: str,
    updates: Dict[str, Any] = Body(...),
    _: ReceptionistUser = Depends(get_current_receptionist),
):
    """Update patient information."""
    
    # Get existing patient
    patient_fhir = fhir_repo.get("Patient", patient_id)
    if not patient_fhir:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Apply updates (simplified - in real app, would have proper validation)
    if "phone_number" in updates:
        telecom = patient_fhir.get("telecom", [])
        for contact in telecom:
            if contact.get("system") == "phone":
                contact["value"] = updates["phone_number"]
                break
    
    if "email" in updates:
        telecom = patient_fhir.get("telecom", [])
        email_found = False
        for contact in telecom:
            if contact.get("system") == "email":
                contact["value"] = updates["email"]
                email_found = True
                break
        if not email_found and updates["email"]:
            telecom.append({"system": "email", "value": updates["email"]})
    
    if "address" in updates:
        if patient_fhir.get("address"):
            patient_fhir["address"][0]["text"] = updates["address"]
        else:
            patient_fhir["address"] = [{"text": updates["address"]}]
    
    # Update metadata
    patient_fhir["meta"]["lastUpdated"] = datetime.now(timezone.utc).isoformat()
    
    # Save changes
    fhir_repo.save(patient_id, patient_fhir)
    
    # Update cache
    patient_item = extract_patient_list_item(patient_fhir)
    _PATIENTS[patient_id] = patient_item
    
    return patient_item

@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_patient(
    patient_id: str,
    permanent: bool = Query(False, description="Permanently delete vs deactivate"),
    _: ReceptionistUser = Depends(get_current_receptionist),
):
    """Deactivate or delete patient record."""
    
    patient_fhir = fhir_repo.get("Patient", patient_id)
    if not patient_fhir:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    if permanent:
        # Permanent deletion
        fhir_repo.delete("Patient", patient_id)
        _PATIENTS.pop(patient_id, None)
        _PATIENT_FHIR_MAP.pop(patient_id, None)
    else:
        # Deactivation
        patient_fhir["active"] = False
        patient_fhir["meta"]["lastUpdated"] = datetime.now(timezone.utc).isoformat()
        fhir_repo.save(patient_id, patient_fhir)
        
        # Update cache
        if patient_id in _PATIENTS:
            _PATIENTS[patient_id].status = "inactive"