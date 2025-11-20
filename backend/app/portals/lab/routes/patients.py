"""Lab patients routes supporting the LabPatientsModule front-end."""
from __future__ import annotations

from datetime import datetime, timedelta, date
from typing import Dict, List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import String

from app.common.auth.auth_service import AuthenticatedUser, require_lab_technician_access
from app.common.schemas.responses_enhanced import SuccessResponse
from app.db.session import get_db
from app.crud.patient import patient as patient_crud
from app.common.models.patient import Patient
from app.common.models.user import User
from app.portals.lab.schemas.patients import (
    LabTestResult,
    LabTestRecord,
    LabPatientSummary,
    LabPatientDetail,
    LabPatientsCollection,
)

router = APIRouter(prefix="/patients", tags=["Lab Patients"])


def _convert_patient_to_lab_format(patient, db: Session = None, organization_id: Optional[str] = None) -> LabPatientDetail:
    """Convert database patient record to lab format."""
    from app.common.models.lab_insurance import LabResult
    from sqlalchemy.orm import joinedload
    
    # Get patient name from User relationship
    user = patient.user if hasattr(patient, 'user') and patient.user else None
    first_name = user.first_name if user else ''
    last_name = user.last_name if user else ''
    name = f"{first_name} {last_name}".strip() if (first_name or last_name) else "Unknown Patient"
    
    # Create avatar from initials
    if first_name and last_name:
        avatar = f"{first_name[0]}{last_name[0]}".upper()
    elif name:
        avatar = name[0].upper()
    else:
        avatar = "P"
    
    # Calculate age from date of birth
    age = 0
    date_of_birth_str = "N/A"
    if patient.date_of_birth:
        try:
            from datetime import date as date_type
            if isinstance(patient.date_of_birth, str):
                # Try different date formats
                try:
                    birth_date = datetime.strptime(patient.date_of_birth, '%Y-%m-%d').date()
                except:
                    try:
                        birth_date = datetime.strptime(patient.date_of_birth, '%Y-%m-%d %H:%M:%S').date()
                    except:
                        birth_date = None
            elif isinstance(patient.date_of_birth, datetime):
                birth_date = patient.date_of_birth.date()
            elif isinstance(patient.date_of_birth, date_type):
                birth_date = patient.date_of_birth
            else:
                birth_date = None
            
            if birth_date:
                today = date.today()
                # More accurate age calculation
                age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
                date_of_birth_str = birth_date.strftime('%d.%m.%Y')
            else:
                date_of_birth_str = str(patient.date_of_birth)
        except Exception as e:
            date_of_birth_str = str(patient.date_of_birth)
    
    # Get gender
    gender = patient.sex or "Unknown"
    
    # Get physical measurements from most recent vital signs
    height_str = "N/A"
    weight_str = "N/A"
    bmi_str = "N/A"
    last_measured = None
    
    if db:
        from app.common.models.medical import VitalSign
        from sqlalchemy.dialects.postgresql import UUID as PG_UUID
        from sqlalchemy import cast, desc
        
        # Get most recent vital signs for this patient
        patient_uuid = patient.patient_id if hasattr(patient, 'patient_id') else (patient.id if hasattr(patient, 'id') else None)
        if patient_uuid:
            try:
                # Query only the fields we need to avoid column mismatch errors
                # Use created_at since measured_at may not exist in the database
                vital_sign = db.query(
                    VitalSign.id,
                    VitalSign.height,
                    VitalSign.weight,
                    VitalSign.bmi,
                    VitalSign.created_at
                ).filter(
                    cast(VitalSign.patient_id, PG_UUID) == patient_uuid
                ).order_by(desc(VitalSign.created_at)).first()
                
                if vital_sign:
                    # SQLAlchemy Row objects can be accessed by attribute name
                    # Try direct attribute access first (works for Row objects)
                    try:
                        height_val = vital_sign.height
                        weight_val = vital_sign.weight
                        bmi_val = vital_sign.bmi
                        created_at_val = vital_sign.created_at
                    except (AttributeError, IndexError):
                        # Fallback to getattr or index access
                        height_val = getattr(vital_sign, 'height', None) or (vital_sign[1] if len(vital_sign) > 1 else None)
                        weight_val = getattr(vital_sign, 'weight', None) or (vital_sign[2] if len(vital_sign) > 2 else None)
                        bmi_val = getattr(vital_sign, 'bmi', None) or (vital_sign[3] if len(vital_sign) > 3 else None)
                        created_at_val = getattr(vital_sign, 'created_at', None) or (vital_sign[4] if len(vital_sign) > 4 else None)
                    
                    # Debug: Print values to verify they're being retrieved
                    print(f"DEBUG: Retrieved vital signs - height: {height_val}, weight: {weight_val}, bmi: {bmi_val}")
                    
                    if height_val is not None and height_val != 0:
                        height_str = f"{height_val} cm"
                        print(f"DEBUG: Set height_str to: {height_str}")
                    if weight_val is not None and weight_val != 0:
                        weight_str = f"{weight_val} kg"
                        print(f"DEBUG: Set weight_str to: {weight_str}")
                    if bmi_val is not None and bmi_val != 0:
                        bmi_str = f"{bmi_val:.1f}"
                        print(f"DEBUG: Set bmi_str to: {bmi_str}")
                    if created_at_val:
                        if isinstance(created_at_val, datetime):
                            last_measured = created_at_val.strftime('%Y-%m-%d')
                        else:
                            last_measured = str(created_at_val)
                else:
                    print(f"DEBUG: No vital sign found for patient {patient_uuid}")
            except Exception as e:
                # If vital signs query fails, log it but don't break the patient retrieval
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to retrieve vital signs for patient {patient_uuid}: {e}")
                # Print to console for debugging
                print(f"ERROR: Failed to retrieve vital signs for patient {patient_uuid}: {e}")
                import traceback
                traceback.print_exc()
                pass
    
    # Format address
    address = patient.address or "N/A"
    
    # Get patient ID
    patient_id = str(patient.patient_id) if hasattr(patient, 'patient_id') else str(patient.id) if hasattr(patient, 'id') else "N/A"
    
    # Get recent lab tests
    recent_tests = []
    if db:
        # Get recent lab results (last 30 days), filtered by organization
        from datetime import timedelta
        from sqlalchemy.dialects.postgresql import UUID as PG_UUID
        from sqlalchemy import cast
        from uuid import UUID as PyUUID
        from app.common.models.lab_insurance import LabOrder
        from app.common.models.doctor import Doctor, doctor_hospitals
        
        cutoff_date = datetime.now() - timedelta(days=30)
        # Get patient_id as UUID object
        patient_uuid = patient.patient_id if hasattr(patient, 'patient_id') else (patient.id if hasattr(patient, 'id') else None)
        if patient_uuid:
            # Cast the String column to UUID for comparison, or cast UUID to string
            # Since DB column is UUID but model says String(36), we cast the UUID to string
            patient_id_str = str(patient_uuid)
            query = db.query(LabResult).filter(
                cast(LabResult.patient_id, PG_UUID) == patient_uuid
            )
            
            # Filter by organization: only show results from orders by doctors in the same organization
            if organization_id:
                query = query.join(LabOrder, cast(LabResult.lab_order_id, String(36)) == LabOrder.id)\
                             .join(Doctor, cast(LabOrder.ordered_by, PG_UUID) == Doctor.id)\
                             .join(doctor_hospitals, Doctor.id == doctor_hospitals.c.doctor_id)\
                             .filter(cast(doctor_hospitals.c.hospital_id, PG_UUID) == PyUUID(organization_id) if isinstance(organization_id, str) else organization_id)\
                             .distinct()
            
            lab_results = query.order_by(LabResult.created_at.desc()).limit(10).all()
        else:
            lab_results = []
        
        for result in lab_results:
            # Parse results JSON if available
            test_results = []
            if hasattr(result, 'results') and result.results:
                if isinstance(result.results, str):
                    import json
                    try:
                        results_data = json.loads(result.results)
                    except:
                        results_data = []
                else:
                    results_data = result.results
                
                if isinstance(results_data, list):
                    for r in results_data:
                        if isinstance(r, dict):
                            test_results.append(LabTestResult(
                                test=r.get('test', r.get('name', 'Unknown')),
                                value=str(r.get('value', '')),
                                unit=r.get('unit', ''),
                                range=r.get('range', ''),
                                status=r.get('status', 'normal')
                            ))
            
            # Get test type
            test_type = "General Lab Test"
            if hasattr(result, 'test_type') and result.test_type:
                test_type = result.test_type
            elif hasattr(result, 'test_category') and result.test_category:
                test_type = result.test_category
            
            # Format date/time
            result_date = result.created_at if hasattr(result, 'created_at') and result.created_at else datetime.now()
            date_str = result_date.strftime('%d.%m.%Y') if isinstance(result_date, datetime) else "N/A"
            time_str = result_date.strftime('%H:%M') if isinstance(result_date, datetime) else "N/A"
            
            recent_tests.append(LabTestRecord(
                id=str(result.id) if hasattr(result, 'id') else str(uuid.uuid4()),
                date=date_str,
                time=time_str,
                type=test_type,
                description=result.comments or result.interpretation or result.test_name or "Lab test results",
                physician="Lab Technician",  # TODO: Get from result.technician or result.ordered_by
                status=result.status.value if hasattr(result.status, 'value') else str(result.status) if hasattr(result, 'status') else "completed",
                results=test_results
            ))
    
    # Debug: Print final values before creating the response
    print(f"DEBUG: Final values - height_str: {height_str}, weight_str: {weight_str}, bmi_str: {bmi_str}")
    
    result = LabPatientDetail(
        id=patient_id,
        name=name,
        dateOfBirth=date_of_birth_str,
        age=age,
        gender=gender,
        bloodGroup="Unknown",  # Patient model doesn't have blood_group
        rhFactor="Unknown",
        height=height_str,
        weight=weight_str,
        bmi=bmi_str,
        lastMeasured=last_measured or (patient.created_at.strftime('%Y-%m-%d') if hasattr(patient, 'created_at') and patient.created_at else "N/A"),
        address=address,
        temporaryAddress="Same as permanent",
        workPlace="N/A",  # Patient model doesn't have occupation
        occupation="N/A",
        avatar=avatar,
        recentTests=recent_tests,
    )
    
    # Debug: Verify the result object has the values
    print(f"DEBUG: Result object - height: {result.height}, weight: {result.weight}, bmi: {result.bmi}")
    
    return result


# No longer using static mock data


def _parse_date(value: str) -> Optional[datetime]:
    try:
        return datetime.strptime(value, "%d.%m.%Y")
    except ValueError:
        return None


def _has_recent_tests(patient: LabPatientDetail, days: int = 7) -> bool:
    threshold = datetime.now() - timedelta(days=days)
    return any(
        (record_date := _parse_date(record.date)) is not None and record_date >= threshold
        for record in patient.recentTests
    )


def _recent_test_count(patient: LabPatientDetail, days: int = 7) -> int:
    threshold = datetime.now() - timedelta(days=days)
    return sum(
        1
        for record in patient.recentTests
        if (record_date := _parse_date(record.date)) is not None and record_date >= threshold
    )


def _build_summary(patient: LabPatientDetail) -> LabPatientSummary:
    recent_count = _recent_test_count(patient)
    return LabPatientSummary(
        id=patient.id,
        name=patient.name,
        avatar=patient.avatar,
        age=patient.age,
        gender=patient.gender,
        lastMeasured=patient.lastMeasured,
        recentTests=recent_count,
    )


@router.get("", response_model=SuccessResponse[LabPatientsCollection])
async def list_patients(
    search: Optional[str] = Query(None, description="Search by name or patient id"),
    filter: str = Query("all", pattern="^(all|recent)$"),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    # Get the current user's organization_id
    user = db.query(User).filter(User.id == current_user.user_id).first()
    organization_id = str(user.organization_id) if user and user.organization_id else None
    
    # Get patients from database via organization_patients (many-to-many relationship)
    from app.common.models.patient import OrganizationPatient
    from uuid import UUID as PyUUID
    
    if organization_id:
        # Filter by organization_patients to show only patients from this clinic
        organization_uuid = PyUUID(organization_id) if isinstance(organization_id, str) else organization_id
        query = db.query(Patient).join(
            OrganizationPatient, Patient.patient_id == OrganizationPatient.patient_id
        ).filter(
            OrganizationPatient.organization_id == organization_uuid,
            OrganizationPatient.status == "active"
        ).options(joinedload(Patient.user)).distinct()
    else:
        query = db.query(Patient).options(joinedload(Patient.user))
    
    if search:
        # Search by patient ID or user name
        from sqlalchemy import or_, func
        query = query.join(User, Patient.user_id == User.id).filter(
            or_(
                func.lower(User.first_name).like(f"%{search.lower()}%"),
                func.lower(User.last_name).like(f"%{search.lower()}%"),
                func.lower(User.email).like(f"%{search.lower()}%"),
                Patient.phone.ilike(f"%{search}%"),
                func.cast(Patient.patient_id, String).ilike(f"%{search}%")
            )
        )
    
    db_patients = query.limit(100).all()

    # Convert to lab format, passing organization_id for filtering recent tests
    patients = [_convert_patient_to_lab_format(patient, db, organization_id) for patient in db_patients]

    if filter == "recent":
        patients = [patient for patient in patients if patient.recentTests]

    summaries = [_build_summary(patient) for patient in patients]
    recent_count = sum(1 for patient in patients if patient.recentTests)

    return SuccessResponse(data=LabPatientsCollection(items=summaries, total=len(summaries), recentCount=recent_count))


@router.get("/{patient_id}", response_model=SuccessResponse[LabPatientDetail])
async def get_patient(
    patient_id: str,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    # Get the current user's organization_id
    user = db.query(User).filter(User.id == current_user.user_id).first()
    organization_id = str(user.organization_id) if user and user.organization_id else None
    
    # Try to find patient by patient_id or user_id, filtered by organization via organization_patients
    from sqlalchemy import or_, cast, String
    from app.common.models.patient import OrganizationPatient
    from uuid import UUID as PyUUID
    
    query = db.query(Patient).options(joinedload(Patient.user)).filter(
        or_(
            cast(Patient.patient_id, String) == patient_id,
            cast(Patient.user_id, String) == patient_id
        )
    )
    
    # Filter by organization: only show patients from this clinic via organization_patients
    if organization_id:
        organization_uuid = PyUUID(organization_id) if isinstance(organization_id, str) else organization_id
        query = query.join(
            OrganizationPatient, Patient.patient_id == OrganizationPatient.patient_id
        ).filter(
            OrganizationPatient.organization_id == organization_uuid,
            OrganizationPatient.status == "active"
        ).distinct()
    
    patient = query.first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    lab_patient = _convert_patient_to_lab_format(patient, db, organization_id)
    return SuccessResponse(data=lab_patient)


@router.get("/{patient_id}/tests", response_model=SuccessResponse[List[LabTestRecord]])
async def list_patient_tests(
    patient_id: str,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    # Get the current user's organization_id
    user = db.query(User).filter(User.id == current_user.user_id).first()
    organization_id = str(user.organization_id) if user and user.organization_id else None
    
    from sqlalchemy import or_, cast, String
    from app.common.models.lab_insurance import LabResult, LabOrder
    from app.common.models.doctor import Doctor, doctor_hospitals
    from sqlalchemy.dialects.postgresql import UUID as PG_UUID
    from uuid import UUID as PyUUID
    
    query = db.query(Patient).filter(
        or_(
            cast(Patient.patient_id, String) == patient_id,
            cast(Patient.user_id, String) == patient_id
        )
    )
    
    # Filter by organization: only show patients from this clinic via organization_patients
    if organization_id:
        from app.common.models.patient import OrganizationPatient
        organization_uuid = PyUUID(organization_id) if isinstance(organization_id, str) else organization_id
        query = query.join(
            OrganizationPatient, Patient.patient_id == OrganizationPatient.patient_id
        ).filter(
            OrganizationPatient.organization_id == organization_uuid,
            OrganizationPatient.status == "active"
        ).distinct()
    
    patient = query.first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get all lab results for this patient (no organization filter needed - patient is already filtered)
    from sqlalchemy.dialects.postgresql import UUID as PG_UUID
    from sqlalchemy import cast
    
    patient_uuid = patient.patient_id
    # Get all lab results for this patient (patient is already filtered by organization_patients)
    query = db.query(LabResult).filter(
        cast(LabResult.patient_id, PG_UUID) == patient_uuid
    )
    
    lab_results = query.order_by(LabResult.created_at.desc()).limit(50).all()
    
    test_records = []
    for result in lab_results:
        # Parse results JSON if available
        test_results = []
        if hasattr(result, 'results') and result.results:
            import json
            if isinstance(result.results, str):
                try:
                    results_data = json.loads(result.results)
                except:
                    results_data = []
            else:
                results_data = result.results
            
            if isinstance(results_data, list):
                for r in results_data:
                    if isinstance(r, dict):
                        test_results.append(LabTestResult(
                            test=r.get('test', r.get('name', 'Unknown')),
                            value=str(r.get('value', '')),
                            unit=r.get('unit', ''),
                            range=r.get('range', ''),
                            status=r.get('status', 'normal')
                        ))
        
        # Get test type
        test_type = "General Lab Test"
        if hasattr(result, 'test_type') and result.test_type:
            test_type = result.test_type
        elif hasattr(result, 'test_category') and result.test_category:
            test_type = result.test_category
        
        # Format date/time
        result_date = result.created_at if hasattr(result, 'created_at') and result.created_at else datetime.now()
        date_str = result_date.strftime('%d.%m.%Y') if isinstance(result_date, datetime) else "N/A"
        time_str = result_date.strftime('%H:%M') if isinstance(result_date, datetime) else "N/A"
        
        test_records.append(LabTestRecord(
            id=str(result.id) if hasattr(result, 'id') else str(uuid.uuid4()),
            date=date_str,
            time=time_str,
            type=test_type,
            description=result.clinical_notes or result.notes or "Lab test results",
            physician="Lab Technician",
            status=result.status.value if hasattr(result.status, 'value') else str(result.status) if hasattr(result, 'status') else "completed",
            results=test_results
        ))
    
    return SuccessResponse(data=test_records)


@router.get("/{patient_id}/tests/{test_id}", response_model=SuccessResponse[LabTestRecord])
async def get_patient_test(
    patient_id: str,
    test_id: str,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    # Get the current user's organization_id
    user = db.query(User).filter(User.id == current_user.user_id).first()
    organization_id = str(user.organization_id) if user and user.organization_id else None
    
    from sqlalchemy import or_, cast, String
    from app.common.models.lab_insurance import LabResult, LabOrder
    from app.common.models.doctor import Doctor, doctor_hospitals
    from sqlalchemy.dialects.postgresql import UUID as PG_UUID
    from uuid import UUID as PyUUID
    
    query = db.query(Patient).filter(
        or_(
            cast(Patient.patient_id, String) == patient_id,
            cast(Patient.user_id, String) == patient_id
        )
    )
    
    # Filter by organization: only show patients from this clinic via organization_patients
    if organization_id:
        from app.common.models.patient import OrganizationPatient
        organization_uuid = PyUUID(organization_id) if isinstance(organization_id, str) else organization_id
        query = query.join(
            OrganizationPatient, Patient.patient_id == OrganizationPatient.patient_id
        ).filter(
            OrganizationPatient.organization_id == organization_uuid,
            OrganizationPatient.status == "active"
        ).distinct()
    
    patient = query.first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get specific test (patient is already filtered by organization_patients)
    from sqlalchemy.dialects.postgresql import UUID as PG_UUID
    from sqlalchemy import cast
    
    patient_uuid = patient.patient_id
    # Get specific test (patient is already filtered by organization_patients)
    query = db.query(LabResult).filter(
        cast(LabResult.patient_id, PG_UUID) == patient_uuid,
        LabResult.id == test_id
    )
    
    result = query.first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Test not found")
    
    # Parse results JSON
    test_results = []
    if hasattr(result, 'results') and result.results:
        import json
        if isinstance(result.results, str):
            try:
                results_data = json.loads(result.results)
            except:
                results_data = []
        else:
            results_data = result.results
        
        if isinstance(results_data, list):
            for r in results_data:
                if isinstance(r, dict):
                    test_results.append(LabTestResult(
                        test=r.get('test', r.get('name', 'Unknown')),
                        value=str(r.get('value', '')),
                        unit=r.get('unit', ''),
                        range=r.get('range', ''),
                        status=r.get('status', 'normal')
                    ))
    
    # Get test type
    test_type = "General Lab Test"
    if hasattr(result, 'test_type') and result.test_type:
        test_type = result.test_type
    elif hasattr(result, 'test_category') and result.test_category:
        test_type = result.test_category
    
    # Format date/time
    result_date = result.created_at if hasattr(result, 'created_at') and result.created_at else datetime.now()
    date_str = result_date.strftime('%d.%m.%Y') if isinstance(result_date, datetime) else "N/A"
    time_str = result_date.strftime('%H:%M') if isinstance(result_date, datetime) else "N/A"
    
    test_record = LabTestRecord(
        id=str(result.id),
        date=date_str,
        time=time_str,
        type=test_type,
        description=result.clinical_notes or result.notes or "Lab test results",
        physician="Lab Technician",
        status=result.status.value if hasattr(result.status, 'value') else str(result.status) if hasattr(result, 'status') else "completed",
        results=test_results
    )
    
    return SuccessResponse(data=test_record)
