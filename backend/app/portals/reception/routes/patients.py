"""Reception portal – patients list router
Aggregates patients from appointments, reports, and registrations for the clinic.
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Set
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.common.auth.auth_service import (
    AuthenticatedUser, require_receptionist_access, require_permission, Permission,
)
from app.db.session import get_db
from app.services.fhir_repository import fhir_repo
from app.services.rbac_service import RBACService, ResourceType, ActionType
from app.crud.patient import patient as patient_crud
from app.common.models.patient import Patient
from app.common.models.appointment import Appointment
from app.common.models.doctor import Doctor
from sqlalchemy.orm import joinedload

router = APIRouter(tags=["Reception · Patients"])

class PatientListItem(BaseModel):
    """Patient list item for sidebar."""
    id: str
    full_name: str
    date_of_birth: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    last_visit: Optional[str] = None
    has_appointment: bool = False
    has_report: bool = False
    registered_by_reception: bool = False
    
    class Config:
        from_attributes = True

@router.get("/list", response_model=List[PatientListItem])
async def get_patients_list(
    search: Optional[str] = Query(None, description="Search by name, phone, or email"),
    current_user: AuthenticatedUser = Depends(require_receptionist_access()),
    _: AuthenticatedUser = Depends(require_permission(Permission.PATIENT_READ)),
    db: Session = Depends(get_db),
):
    """
    Get comprehensive list of patients for the receptionist's clinic.
    Includes patients who:
    - Have appointments
    - Have reports/documents
    - Were registered by receptionist
    """
    try:
        # Get clinic ID from user
        clinic_id = current_user.clinic_id
        if not clinic_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Receptionist must be connected to a clinic"
            )
        
        print(f"[PATIENTS LIST] Getting patients for clinic_id: {clinic_id} (type: {type(clinic_id)})")
        
        # Track unique patients by ID
        patients_dict: Dict[str, PatientListItem] = {}
        db_patients = []
        
        # Debug: Check if clinic_id is valid UUID
        try:
            from uuid import UUID
            clinic_uuid_test = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
            print(f"[PATIENTS LIST] Clinic UUID: {clinic_uuid_test}")
        except Exception as e:
            print(f"[PATIENTS LIST] Error converting clinic_id to UUID: {e}")
        
        # 0. Get patients from database via organization_patients (many-to-many relationship)
        try:
            # Query patients through organization_patients junction table
            from uuid import UUID
            clinic_uuid = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
            from app.common.models.user import User
            from app.common.models.patient import OrganizationPatient
            
            # Query patients that belong to this organization via organization_patients
            db_patients = db.query(Patient).join(
                OrganizationPatient, Patient.patient_id == OrganizationPatient.patient_id
            ).filter(
                OrganizationPatient.organization_id == clinic_uuid,
                OrganizationPatient.status == "active"  # Only active patients
            ).options(
                joinedload(Patient.user)
            ).distinct().limit(1000).all()
            
            print(f"[PATIENTS LIST] Found {len(db_patients)} patients in database for clinic_id: {clinic_id} via organization_patients")
            for db_patient in db_patients:
                patient_id = str(db_patient.patient_id) if hasattr(db_patient, 'patient_id') else str(db_patient.id)
                # Get name from User model if available, otherwise use a default
                if db_patient.user:
                    full_name = f"{db_patient.user.first_name or ''} {db_patient.user.last_name or ''}".strip() or db_patient.user.email or "Unknown"
                else:
                    full_name = "Unknown Patient"
                
                if patient_id not in patients_dict:
                    # Get email from User model, not Patient
                    email = db_patient.user.email if db_patient.user else None
                    
                    patients_dict[patient_id] = PatientListItem(
                        id=patient_id,
                        full_name=full_name,
                        date_of_birth=db_patient.date_of_birth.isoformat() if hasattr(db_patient, 'date_of_birth') and db_patient.date_of_birth else None,
                        phone_number=db_patient.phone if hasattr(db_patient, 'phone') else None,
                        email=email,
                        has_appointment=False,
                        has_report=False,
                        registered_by_reception=True
                    )
                else:
                    patients_dict[patient_id].registered_by_reception = True
        except Exception as e:
            print(f"[PATIENTS LIST] Error fetching patients from database: {e}")
            import traceback
            traceback.print_exc()
        
        # 1. Get patients from Appointments (from database)
        try:
            # Get appointments for doctors in the same clinic
            from uuid import UUID
            clinic_uuid = UUID(clinic_id) if isinstance(clinic_id, str) else clinic_id
            print(f"[PATIENTS LIST] Querying appointments for hospital_id: {clinic_uuid}")
            
            # Query appointments where hospital_id matches clinic
            db_appointments = db.query(Appointment).filter(
                Appointment.hospital_id == clinic_uuid
            ).options(
                joinedload(Appointment.patient).joinedload(Patient.user)
            ).distinct().limit(1000).all()
            
            print(f"[PATIENTS LIST] Found {len(db_appointments)} appointments in database for hospital_id: {clinic_uuid}")
            
            # Debug: Check a few appointments to see their hospital_id
            if len(db_appointments) == 0:
                # Try to see what hospital_ids exist
                sample_appts = db.query(Appointment).limit(5).all()
                print(f"[PATIENTS LIST] Sample appointments (first 5):")
                for apt in sample_appts:
                    print(f"  Appointment ID: {apt.id}, hospital_id: {apt.hospital_id}, patient_id: {apt.patient_id}")
            for apt in db_appointments:
                if not apt.patient:
                    continue
                
                # Ensure patient is linked to this organization via organization_patients
                # This handles cases where appointments exist but organization_patients entry doesn't
                from app.common.models.patient import OrganizationPatient
                existing_org_patient = db.query(OrganizationPatient).filter(
                    OrganizationPatient.organization_id == clinic_uuid,
                    OrganizationPatient.patient_id == apt.patient.patient_id
                ).first()
                
                if not existing_org_patient:
                    # Auto-create organization_patients entry for patients with appointments
                    org_patient = OrganizationPatient(
                        organization_id=clinic_uuid,
                        patient_id=apt.patient.patient_id,
                        status="active",
                        first_seen_at=apt.appointment_date if hasattr(apt, 'appointment_date') and apt.appointment_date else datetime.now(timezone.utc)
                    )
                    db.add(org_patient)
                    try:
                        db.commit()
                        print(f"[PATIENTS LIST] Auto-created organization_patients entry for patient {apt.patient.patient_id} from appointment")
                    except Exception as e:
                        db.rollback()
                        print(f"[PATIENTS LIST] Warning: Could not create organization_patients entry: {e}")
                    
                patient_id = str(apt.patient.patient_id)
                # Get name from User model if available, otherwise use a default
                if apt.patient.user:
                    full_name = f"{apt.patient.user.first_name or ''} {apt.patient.user.last_name or ''}".strip() or apt.patient.user.email or "Unknown"
                    email = apt.patient.user.email
                else:
                    full_name = "Unknown Patient"
                    email = None
                
                if patient_id not in patients_dict:
                    patients_dict[patient_id] = PatientListItem(
                        id=patient_id,
                        full_name=full_name,
                        date_of_birth=apt.patient.date_of_birth.isoformat() if apt.patient.date_of_birth else None,
                        phone_number=apt.patient.phone if hasattr(apt.patient, 'phone') else None,
                        email=email,
                        has_appointment=True,
                        has_report=False,
                        registered_by_reception=False
                    )
                else:
                    patients_dict[patient_id].has_appointment = True
        except Exception as e:
            print(f"[PATIENTS LIST] Error fetching appointments from database: {e}")
            import traceback
            traceback.print_exc()
        
        # 1b. Get patients from FHIR Appointments (if any)
        appointment_bundles = fhir_repo.list_bundles(resource_type="Appointment")
        print(f"[PATIENTS LIST] Found {len(appointment_bundles)} appointment bundles in FHIR")
        for bundle in appointment_bundles:
            apt_res = bundle["entry"][0]["resource"] if bundle.get("entry") else None
            if not apt_res:
                continue
            
            # Extract patient reference
            participants = apt_res.get("participant", [])
            patient_ref = next(
                (p["actor"]["reference"] for p in participants 
                 if p["actor"]["reference"].startswith("Patient/")),
                None
            )
            
            if patient_ref:
                patient_id = patient_ref.split("/")[-1]
                
                # Get patient details from FHIR
                try:
                    patient = fhir_repo.get("Patient", patient_id)
                    if patient:
                        
                        # Extract patient info
                        name_obj = patient.get("name", [{}])[0]
                        given = name_obj.get("given", [])
                        family = name_obj.get("family", "")
                        full_name = f"{' '.join(given)} {family}".strip() or "Unknown"
                        
                        telecom = patient.get("telecom", [])
                        phone = next(
                            (t["value"] for t in telecom 
                             if t["system"] == "phone" and t.get("use") != "emergency"),
                            None
                        )
                        email = next(
                            (t["value"] for t in telecom if t["system"] == "email"),
                            None
                        )
                        
                        if patient_id not in patients_dict:
                            patients_dict[patient_id] = PatientListItem(
                                id=patient_id,
                                full_name=full_name,
                                date_of_birth=patient.get("birthDate"),
                                phone_number=phone,
                                email=email,
                                has_appointment=True,
                                has_report=False,
                                registered_by_reception=False
                            )
                        else:
                            patients_dict[patient_id].has_appointment = True
                except Exception as e:
                    print(f"Error fetching patient {patient_id} from appointment: {e}")
                    continue
        
        # 2. Get patients from Reports/DocumentReferences
        try:
            # Search for DocumentReference resources
            doc_bundles = fhir_repo.list_bundles(resource_type="DocumentReference")
            print(f"[PATIENTS LIST] Found {len(doc_bundles)} document reference bundles")
            for bundle in doc_bundles:
                doc_res = bundle["entry"][0]["resource"] if bundle.get("entry") else None
                if not doc_res:
                    continue
                
                # Get subject (patient) reference
                subject_ref = doc_res.get("subject", {}).get("reference", "")
                if subject_ref.startswith("Patient/"):
                    patient_id = subject_ref.split("/")[-1]
                    
                    # Get patient details if not already in dict
                    if patient_id not in patients_dict:
                        try:
                            patient = fhir_repo.get("Patient", patient_id)
                            if patient:
                                
                                name_obj = patient.get("name", [{}])[0]
                                given = name_obj.get("given", [])
                                family = name_obj.get("family", "")
                                full_name = f"{' '.join(given)} {family}".strip() or "Unknown"
                                
                                telecom = patient.get("telecom", [])
                                phone = next(
                                    (t["value"] for t in telecom 
                                     if t["system"] == "phone" and t.get("use") != "emergency"),
                                    None
                                )
                                email = next(
                                    (t["value"] for t in telecom if t["system"] == "email"),
                                    None
                                )
                                
                                patients_dict[patient_id] = PatientListItem(
                                    id=patient_id,
                                    full_name=full_name,
                                    date_of_birth=patient.get("birthDate"),
                                    phone_number=phone,
                                    email=email,
                                    has_appointment=False,
                                    has_report=True,
                                    registered_by_reception=False
                                )
                            else:
                                # Patient not found, create minimal entry
                                patients_dict[patient_id] = PatientListItem(
                                    id=patient_id,
                                    full_name="Unknown Patient",
                                    has_appointment=False,
                                    has_report=True,
                                    registered_by_reception=False
                                )
                        except Exception as e:
                            print(f"Error fetching patient {patient_id} from document: {e}")
                            continue
                    else:
                        patients_dict[patient_id].has_report = True
        except Exception as e:
            print(f"Error fetching documents: {e}")
        
        # 3. Get patients from DiagnosticReports
        try:
            diag_bundles = fhir_repo.list_bundles(resource_type="DiagnosticReport")
            print(f"[PATIENTS LIST] Found {len(diag_bundles)} diagnostic report bundles")
            for bundle in diag_bundles:
                diag_res = bundle["entry"][0]["resource"] if bundle.get("entry") else None
                if not diag_res:
                    continue
                
                subject_ref = diag_res.get("subject", {}).get("reference", "")
                if subject_ref.startswith("Patient/"):
                    patient_id = subject_ref.split("/")[-1]
                    
                    if patient_id not in patients_dict:
                        try:
                            patient = fhir_repo.get("Patient", patient_id)
                            if patient:
                                
                                name_obj = patient.get("name", [{}])[0]
                                given = name_obj.get("given", [])
                                family = name_obj.get("family", "")
                                full_name = f"{' '.join(given)} {family}".strip() or "Unknown"
                                
                                telecom = patient.get("telecom", [])
                                phone = next(
                                    (t["value"] for t in telecom 
                                     if t["system"] == "phone" and t.get("use") != "emergency"),
                                    None
                                )
                                email = next(
                                    (t["value"] for t in telecom if t["system"] == "email"),
                                    None
                                )
                                
                                patients_dict[patient_id] = PatientListItem(
                                    id=patient_id,
                                    full_name=full_name,
                                    date_of_birth=patient.get("birthDate"),
                                    phone_number=phone,
                                    email=email,
                                    has_appointment=False,
                                    has_report=True,
                                    registered_by_reception=False
                                )
                        except Exception as e:
                            print(f"Error fetching patient {patient_id} from diagnostic report: {e}")
                            continue
                    else:
                        patients_dict[patient_id].has_report = True
        except Exception as e:
            print(f"Error fetching diagnostic reports: {e}")
        
        # 4. Get all FHIR Patients (those registered by receptionist)
        try:
            patient_bundles = fhir_repo.list_bundles(resource_type="Patient")
            print(f"[PATIENTS LIST] Found {len(patient_bundles)} patient bundles")
            for bundle in patient_bundles:
                # Bundles contain resources in entry array
                if bundle.get("entry") and len(bundle["entry"]) > 0:
                    patient = bundle["entry"][0].get("resource")
                else:
                    # If it's a direct Patient resource (not in a bundle)
                    patient = bundle if bundle.get("resourceType") == "Patient" else None
                
                if not patient:
                    continue
                
                patient_id = patient.get("id")
                if not patient_id:
                    continue
                
                name_obj = patient.get("name", [{}])[0]
                given = name_obj.get("given", [])
                family = name_obj.get("family", "")
                full_name = f"{' '.join(given)} {family}".strip() or "Unknown"
                
                telecom = patient.get("telecom", [])
                phone = next(
                    (t["value"] for t in telecom 
                     if t["system"] == "phone" and t.get("use") != "emergency"),
                    None
                )
                email = next(
                    (t["value"] for t in telecom if t["system"] == "email"),
                    None
                )
                
                if patient_id not in patients_dict:
                    patients_dict[patient_id] = PatientListItem(
                        id=patient_id,
                        full_name=full_name,
                        date_of_birth=patient.get("birthDate"),
                        phone_number=phone,
                        email=email,
                        has_appointment=False,
                        has_report=False,
                        registered_by_reception=True
                    )
                else:
                    patients_dict[patient_id].registered_by_reception = True
        except Exception as e:
            print(f"Error fetching all patients: {e}")
        
        # Convert to list
        patients_list = list(patients_dict.values())
        print(f"[PATIENTS LIST] Total unique patients found: {len(patients_list)}")
        
        # Apply search filter if provided (only if not already filtered by database)
        if search and not db_patients:  # Only filter if we didn't already filter in DB query
            search_lower = search.lower()
            patients_list = [
                p for p in patients_list
                if (search_lower in (p.full_name or "").lower() or
                    search_lower in (p.phone_number or "").lower() or
                    search_lower in (p.email or "").lower())
            ]
        
        # Sort by name
        patients_list.sort(key=lambda x: x.full_name.lower())
        
        print(f"[PATIENTS LIST] Returning {len(patients_list)} patients")
        return patients_list
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_patients_list: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve patients: {str(e)}"
        )

