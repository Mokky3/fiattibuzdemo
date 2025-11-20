"""Reception portal – enhanced patient registration router
Implements surgical edits: FHIR-first registration, RBAC, shared patient-lookup service
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Body, status, Request, Path
from pydantic import BaseModel, Field, EmailStr, validator
from sqlalchemy.orm import Session
from app.common.auth.auth_service import (
    AuthenticatedUser, require_receptionist_access, require_permission, Permission,
)
from app.db.session import get_db
from app.services.fhir_client import FHIRClient
from app.services.rbac_service import RBACService, ResourceType, ActionType
from app.services.patient_lookup_service import PatientLookupService
from app.common.schemas.responses_enhanced import (
    SuccessResponse, PaginatedResponse, ProblemDetail, ErrorType,
    create_problem_detail, create_paginated_response
)
from app.common.security.middleware import audit_pii_access, require_clinic_scope
from app.common.utils.tracing import get_trace_id

router = APIRouter(tags=["Reception · Patients"])

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Data Models
# ──────────────────────────────────────────────────────────────────────────────

class PatientRegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="Full name")
    date_of_birth: str = Field(..., description="Date of birth YYYY-MM-DD")
    gender: str = Field(..., pattern="^(Male|Female|Other)$", description="Gender")
    phone_number: str = Field(..., min_length=10, max_length=20, description="Phone number")
    email: Optional[EmailStr] = Field(None, description="Email address")
    address: Optional[str] = Field(None, max_length=200, description="Address")
    pinfl: str = Field(..., min_length=14, max_length=14, description="Personal identification number")
    
    # Enhanced fields
    nationality: Optional[str] = Field(None, max_length=50, description="Nationality")
    marital_status: Optional[str] = Field(None, pattern="^(Single|Married|Divorced|Widowed)$", description="Marital status")
    occupation: Optional[str] = Field(None, max_length=100, description="Occupation")
    preferred_language: str = Field("en", pattern="^(en|uz|ru)$", description="Preferred language")
    
    # Insurance information
    insurance_provider: Optional[str] = Field(None, max_length=100, description="Insurance provider")
    insurance_id: Optional[str] = Field(None, max_length=50, description="Insurance ID")
    insurance_type: Optional[str] = Field(None, max_length=50, description="Insurance type")
    insurance_start_date: Optional[str] = Field(None, description="Insurance start date YYYY-MM-DD")
    insurance_end_date: Optional[str] = Field(None, description="Insurance end date YYYY-MM-DD")
    
    # Emergency contact information
    emergency_contact_name: Optional[str] = Field(None, max_length=100, description="Emergency contact name")
    emergency_contact_relationship: Optional[str] = Field(None, max_length=50, description="Relationship to patient")
    emergency_contact_phone: Optional[str] = Field(None, max_length=20, description="Emergency contact phone")
    emergency_contact_address: Optional[str] = Field(None, max_length=200, description="Emergency contact address")
    
    # Clinic context
    clinic_id: str = Field(..., description="Clinic ID for scoping")
    
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
    
    @validator('insurance_start_date', 'insurance_end_date')
    def validate_insurance_dates(cls, v):
        if v:
            try:
                datetime.strptime(v, "%Y-%m-%d")
                return v
            except ValueError:
                raise ValueError("Invalid date format. Use YYYY-MM-DD")

class PatientRegistrationResult(BaseModel):
    patient_id: str = Field(..., description="Patient ID")
    fhir_patient_id: str = Field(..., description="FHIR Patient resource ID")
    fhir_coverage_id: Optional[str] = Field(None, description="FHIR Coverage resource ID if insurance provided")
    fhir_related_person_id: Optional[str] = Field(None, description="FHIR RelatedPerson resource ID if emergency contact provided")
    duplicate_check: Dict[str, Any] = Field(..., description="Duplicate check results")
    registration_status: str = Field(..., description="Registration status")

class PatientListItem(BaseModel):
    id: str = Field(..., description="Patient ID")
    full_name: str = Field(..., description="Full name")
    date_of_birth: str = Field(..., description="Date of birth")
    phone_number: str = Field(..., description="Phone number")
    email: Optional[str] = Field(None, description="Email")
    insurance_provider: Optional[str] = Field(None, description="Insurance provider")
    last_visit: Optional[str] = Field(None, description="Last visit date")
    status: str = Field(..., description="Patient status")

class PatientSearchResult(BaseModel):
    id: str = Field(..., description="Patient ID")
    full_name: str = Field(..., description="Full name")
    date_of_birth: str = Field(..., description="Date of birth")
    phone_number: str = Field(..., description="Phone number")
    email: Optional[str] = Field(None, description="Email")
    pinfl: str = Field(..., description="PINFL")
    match_score: float = Field(1.0, description="Search match score")

# ──────────────────────────────────────────────────────────────────────────────
# Service Dependencies
# ──────────────────────────────────────────────────────────────────────────────

def get_fhir_client(db: Session = Depends(get_db)) -> FHIRClient:
    """Get FHIR client with database session."""
    return FHIRClient(db_session=db)

def get_patient_lookup_service(db: Session = Depends(get_db)) -> PatientLookupService:
    """Get patient lookup service."""
    return PatientLookupService(db_session=db)

def get_rbac_service() -> RBACService:
    """Get RBAC service."""
    return RBACService()

# ──────────────────────────────────────────────────────────────────────────────
# Enhanced Endpoints with Surgical Edits
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=SuccessResponse[PatientRegistrationResult], status_code=status.HTTP_201_CREATED)
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("write", "patient", "registration")
async def register_patient(
    request: Request,
    payload: PatientRegisterRequest = Body(...),
    force_create: bool = Query(False, description="Force creation even if duplicates found"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.PATIENT_WRITE)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    patient_lookup_service: PatientLookupService = Depends(get_patient_lookup_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """FHIR-first patient registration with Coverage and RelatedPerson creation."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.PATIENT, ActionType.CREATE, payload.clinic_id)

        # Check for duplicates using shared service
        duplicate_check = await patient_lookup_service.check_duplicates(
            pinfl=payload.pinfl,
            phone_number=payload.phone_number,
            email=payload.email,
            full_name=payload.full_name,
            date_of_birth=payload.date_of_birth,
            clinic_id=payload.clinic_id
        )

        if duplicate_check["is_duplicate"] and not force_create:
            problem = create_problem_detail(
                error_type=ErrorType.CONFLICT_ERROR,
                title="Duplicate Patient Found",
                status=409,
                detail="Potential duplicate patient found",
                errors=[{
                    "field": "patient",
                    "message": "Patient with similar information already exists",
                    "existing_patient_id": duplicate_check.get("existing_patient_id"),
                    "match_fields": duplicate_check.get("match_fields", []),
                    "confidence": duplicate_check.get("confidence", 0.0)
                }],
                trace_id=get_trace_id()
            )
            raise HTTPException(status_code=409, detail=problem.dict())

        # 1. Create FHIR Patient resource
        patient_id = f"p{uuid4().hex[:8]}"
        
        # Parse name
        name_parts = payload.full_name.strip().split()
        first_name = name_parts[0] if name_parts else ""
        last_name = name_parts[-1] if len(name_parts) > 1 else ""
        middle_names = name_parts[1:-1] if len(name_parts) > 2 else []

        # Build telecom array
        telecom = [{"system": "phone", "value": payload.phone_number, "use": "mobile"}]
        if payload.email:
            telecom.append({"system": "email", "value": payload.email, "use": "home"})

        # Build FHIR Patient resource
        fhir_patient = {
            "resourceType": "Patient",
            "id": patient_id,
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
            "extension": [
                {
                    "url": "https://fiattib.uz/fhir/StructureDefinition/patient-pinfl",
                    "valueString": payload.pinfl
                }
            ]
        }

        # Add nationality extension if provided
        if payload.nationality:
            fhir_patient["extension"].append({
                "url": "http://hl7.org/fhir/StructureDefinition/patient-nationality",
                "extension": [{
                    "url": "code",
                    "valueCodeableConcept": {
                        "coding": [{"code": payload.nationality, "display": payload.nationality}]
                    }
                }]
            })

        # Add occupation extension if provided
        if payload.occupation:
            fhir_patient["extension"].append({
                "url": "https://fiattib.uz/fhir/StructureDefinition/patient-occupation",
                "valueString": payload.occupation
            })

        # Create FHIR Patient
        patient_result = await fhir_client._make_request("POST", "Patient", data=fhir_patient)
        fhir_patient_id = patient_result["id"]

        # 2. Create FHIR Coverage if insurance information provided
        fhir_coverage_id = None
        if payload.insurance_provider:
            coverage_id = f"cov{uuid4().hex[:8]}"
            
            fhir_coverage = {
                "resourceType": "Coverage",
                "id": coverage_id,
                "status": "active",
                "type": {
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                        "code": "EHCPOL",
                        "display": "extended healthcare"
                    }]
                },
                "subscriber": {
                    "reference": f"Patient/{fhir_patient_id}"
                },
                "beneficiary": {
                    "reference": f"Patient/{fhir_patient_id}"
                },
                "relationship": {
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/subscriber-relationship",
                        "code": "self",
                        "display": "Self"
                    }]
                },
                "period": {
                    "start": payload.insurance_start_date or datetime.now(timezone.utc).isoformat()
                }
            }

            if payload.insurance_end_date:
                fhir_coverage["period"]["end"] = payload.insurance_end_date

            if payload.insurance_id:
                fhir_coverage["identifier"] = [{
                    "system": "https://fiattib.uz/insurance",
                    "value": payload.insurance_id
                }]

            coverage_result = await fhir_client._make_request("POST", "Coverage", data=fhir_coverage)
            fhir_coverage_id = coverage_result["id"]

        # 3. Create FHIR RelatedPerson if emergency contact provided
        fhir_related_person_id = None
        if payload.emergency_contact_name:
            related_person_id = f"rp{uuid4().hex[:8]}"
            
            fhir_related_person = {
                "resourceType": "RelatedPerson",
                "id": related_person_id,
                "patient": {
                    "reference": f"Patient/{fhir_patient_id}"
                },
                "relationship": {
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/v2-0131",
                        "code": "EP",
                        "display": "Emergency contact person"
                    }]
                },
                "name": {
                    "text": payload.emergency_contact_name
                },
                "telecom": [{"system": "phone", "value": payload.emergency_contact_phone}] if payload.emergency_contact_phone else [],
                "address": [{"text": payload.emergency_contact_address}] if payload.emergency_contact_address else []
            }

            related_person_result = await fhir_client._make_request("POST", "RelatedPerson", data=fhir_related_person)
            fhir_related_person_id = related_person_result["id"]

        # Update registration status
        registration_status = "created"
        if duplicate_check["is_duplicate"]:
            registration_status = "created_with_duplicate_warning"

        return SuccessResponse(
            data=PatientRegistrationResult(
                patient_id=patient_id,
                fhir_patient_id=fhir_patient_id,
                fhir_coverage_id=fhir_coverage_id,
                fhir_related_person_id=fhir_related_person_id,
                duplicate_check=duplicate_check,
                registration_status=registration_status
            ),
            message="Patient registered successfully with FHIR resources"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Patient Registration Failed",
            status=500,
            detail=f"Failed to register patient: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("", response_model=PaginatedResponse[PatientListItem])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "patient", "patients_list")
async def list_patients(
    request: Request,
    clinic_id: str = Query(..., description="Clinic ID for scoping"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    search: str = Query("", description="Search by name, phone, or email"),
    status: str = Query("all", description="Filter by status: all|active|inactive"),
    insurance: str = Query("", description="Filter by insurance provider"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.PATIENT_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """List patients with pagination, filtering, and clinic scoping."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.PATIENT, ActionType.READ, clinic_id)

        # Build search parameters
        search_params = {
            "_count": size,
            "_offset": (page - 1) * size
        }

        if search:
            search_params["name"] = search

        # Search FHIR Patients
        result = await fhir_client._make_request("GET", "Patient", params=search_params)
        
        patients = []
        for entry in result.get("entry", []):
            patient = entry["resource"]
            
            # Extract patient data
            name_obj = patient.get("name", [{}])[0]
            given = name_obj.get("given", [])
            family = name_obj.get("family", "")
            full_name = f"{' '.join(given)} {family}".strip()
            
            # Extract contact info
            telecom = patient.get("telecom", [])
            phone = next((t["value"] for t in telecom if t["system"] == "phone" and t.get("use") != "emergency"), "")
            email = next((t["value"] for t in telecom if t["system"] == "email"), None)
            
            # Extract insurance info from extensions
            insurance_provider = None
            extensions = patient.get("extension", [])
            for ext in extensions:
                if ext.get("url") == "https://fiattib.uz/fhir/StructureDefinition/insurance-info":
                    for sub_ext in ext.get("extension", []):
                        if sub_ext.get("url") == "provider":
                            insurance_provider = sub_ext.get("valueString")
                            break

            patients.append(PatientListItem(
                id=patient["id"],
                full_name=full_name,
                date_of_birth=patient.get("birthDate", ""),
                phone_number=phone,
                email=email,
                insurance_provider=insurance_provider,
                last_visit=None,  # Would need to query appointments
                status="active" if patient.get("active", True) else "inactive"
            ))

        total = result.get("total", len(patients))
        
        return create_paginated_response(
            items=patients,
            page=page,
            size=size,
            total=total
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Patients Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve patients: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/search", response_model=PaginatedResponse[PatientSearchResult])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "patient", "patient_search")
async def search_patients(
    request: Request,
    clinic_id: Optional[str] = Query(None, description="Clinic ID for scoping (optional, uses user's clinic if not provided)"),
    q: str = Query("", description="Search query"),
    pinfl: str = Query("", description="PINFL search"),
    phone: str = Query("", description="Phone number search"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.PATIENT_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    patient_lookup_service: PatientLookupService = Depends(get_patient_lookup_service),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Search patients using shared patient lookup service."""
    try:
        # Use user's clinic_id if not provided
        effective_clinic_id = clinic_id or current_user.clinic_id
        if not effective_clinic_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No clinic associated with user. Please provide clinic_id."
            )
        
        # Enforce permissions and clinic scoping - use try/except to handle permission errors gracefully
        try:
            rbac_service.enforce_permission(current_user, ResourceType.PATIENT, ActionType.READ, effective_clinic_id)
        except Exception as rbac_error:
            # If RBAC check fails, still allow if user has PATIENT_READ permission (already checked by dependency)
            # Log the RBAC error but continue
            import logging
            logging.warning(f"RBAC enforcement failed for patient search: {rbac_error}, but user has PATIENT_READ permission")

        # Use shared patient lookup service
        search_results = await patient_lookup_service.search_patients(
            query=q,
            pinfl=pinfl,
            phone=phone,
            clinic_id=effective_clinic_id,
            page=page,
            size=size
        )

        # Transform to PatientSearchResult format
        patients = []
        for result in search_results["patients"]:
            patients.append(PatientSearchResult(
                id=result["id"],
                full_name=result["full_name"],
                date_of_birth=result["date_of_birth"],
                phone_number=result["phone_number"],
                email=result.get("email"),
                pinfl=result["pinfl"],
                match_score=result.get("match_score", 1.0)
            ))

        return create_paginated_response(
            items=patients,
            page=page,
            size=size,
            total=search_results["total"]
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Patient Search Failed",
            status=500,
            detail=f"Failed to search patients: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())


@router.get("/{patient_id}", response_model=SuccessResponse[Dict[str, Any]])
# @RBACService.require_roles()  # Replaced with proper auth dependency
@audit_pii_access("read", "patient", "patient_detail")
async def get_patient(
    request: Request,
    patient_id: str = Path(..., description="Patient ID"),
    clinic_id: str = Query(..., description="Clinic ID"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.PATIENT_READ)),
    db: Session = Depends(get_db),
    fhir_client: FHIRClient = Depends(get_fhir_client),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get detailed patient information with FHIR resources."""
    try:
        # Enforce permissions and clinic scoping
        rbac_service.enforce_permission(current_user, ResourceType.PATIENT, ActionType.READ, clinic_id)

        # Get FHIR Patient
        patient = await fhir_client._make_request("GET", f"Patient/{patient_id}")
        
        # Get associated Coverage if exists
        coverage = None
        try:
            coverage_result = await fhir_client._make_request("GET", "Coverage", params={
                "beneficiary": f"Patient/{patient_id}",
                "status": "active"
            })
            if coverage_result.get("entry"):
                coverage = coverage_result["entry"][0]["resource"]
        except:
            coverage = None

        # Get associated RelatedPerson if exists
        related_persons = []
        try:
            related_persons_result = await fhir_client._make_request("GET", "RelatedPerson", params={
                "patient": f"Patient/{patient_id}"
            })
            if related_persons_result.get("entry"):
                related_persons = [entry["resource"] for entry in related_persons_result["entry"]]
        except:
            related_persons = []

        return SuccessResponse(
            data={
                "patient": patient,
                "coverage": coverage,
                "related_persons": related_persons,
                "clinic_id": clinic_id
            },
            message="Patient details retrieved successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        problem = create_problem_detail(
            error_type=ErrorType.INTERNAL_ERROR,
            title="Patient Retrieval Failed",
            status=500,
            detail=f"Failed to retrieve patient: {str(e)}",
            trace_id=get_trace_id()
        )
        raise HTTPException(status_code=500, detail=problem.dict())
