"""Radiology studies routes backing the RadiologyStudies component."""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.common.auth.auth_service import AuthenticatedUser, require_radiologist_access, require_roles, UserRole
from app.common.schemas.responses_enhanced import SuccessResponse
from app.db.session import get_db
from app.crud.radiology import radiology_study as radiology_study_crud
from app.common.models.radiology import RadiologyStudy as RadiologyStudyModel
from app.common.services.orthanc_service import extract_files_from_upload, upload_dicom_files_to_orthanc
from app.common.models.patient import Patient as PatientORM
from app.common.models.user import User as UserORM
from app.common.models.patient import OrganizationPatient
from sqlalchemy.orm import joinedload
from sqlalchemy import or_, func, String
from app.portals.radiology.schemas.studies import (
    RadiologyStudy,
    RadiologyStudyCreate,
    RadiologyStudyUpdate,
    RadiologyStudySummary,
    RadiologyStudyCollection,
)

router = APIRouter(prefix="/studies", tags=["Radiology Studies"])


def _utc_now() -> datetime:
    """Return the current UTC timestamp."""
    return datetime.now(timezone.utc)


def _to_schema(db_obj: RadiologyStudyModel) -> RadiologyStudy:
    # Normalize gender to match schema pattern (M, F, or O)
    normalized_gender = None
    if db_obj.gender:
        gender_lower = str(db_obj.gender).lower().strip()
        if gender_lower in ['male', 'm', 'man']:
            normalized_gender = "M"
        elif gender_lower in ['female', 'f', 'woman']:
            normalized_gender = "F"
        elif gender_lower in ['other', 'o', 'unknown']:
            normalized_gender = "O"
        elif gender_lower in ['m', 'f', 'o']:
            normalized_gender = gender_lower.upper()
        else:
            normalized_gender = "O"  # Default to "Other" if unknown
    
    return RadiologyStudy(
        id=str(db_obj.id),
        patientId=str(db_obj.patient_id) if db_obj.patient_id else None,
        accessionNumber=db_obj.accession_number,
        patientName=db_obj.patient_name,
        mrn=db_obj.mrn,
        age=db_obj.age,
        gender=normalized_gender,
        dob=db_obj.dob,
        phone="",  # not stored on study model
        email="",
        address="",
        orderDate=db_obj.order_date,
        scheduledDate=db_obj.scheduled_date,
        modality=db_obj.modality,
        bodyPart=db_obj.body_part,
        studyDescription=db_obj.study_description,
        indication=db_obj.indication,
        priority=db_obj.priority,
        status=db_obj.status or "IMPORTED_NO_REPORT",
        orderingPhysician=db_obj.ordering_physician,
        technologist=db_obj.technologist,
        location=db_obj.location,
        room=db_obj.room,
        contrast=bool(db_obj.contrast) if db_obj.contrast is not None else False,
        preparation=db_obj.preparation,
        duration=db_obj.duration_minutes or 0,
        notes=db_obj.notes,
        insurance=db_obj.insurance,
        authorization=db_obj.authorization,
        cptCode=db_obj.cpt_code,
        studyInstanceUid=getattr(db_obj, 'study_instance_uid', None),
        orthancStudyId=getattr(db_obj, 'orthanc_study_id', None),
        createdAt=db_obj.created_at,
        updatedAt=db_obj.updated_at,
    )


def _calculate_summary(studies: List[RadiologyStudy]) -> RadiologyStudySummary:
    today = _utc_now().date()
    status_counts: Dict[str, int] = {}
    priority_counts: Dict[str, int] = {}
    modality_counts: Dict[str, int] = {}
    scheduled_today = 0

    for study in studies:
        status_counts[study.status] = status_counts.get(study.status, 0) + 1
        if study.priority:
            priority_counts[study.priority] = priority_counts.get(study.priority, 0) + 1
        if study.modality:
            modality_counts[study.modality] = modality_counts.get(study.modality, 0) + 1
        if study.scheduledDate:
            try:
                if isinstance(study.scheduledDate, datetime):
                    study_date = study.scheduledDate.astimezone(timezone.utc).date()
                else:
                    study_date = study.scheduledDate
                if study_date == today:
                    scheduled_today += 1
            except (AttributeError, TypeError):
                pass

    return RadiologyStudySummary(
        total=len(studies),
        statusCounts=status_counts,
        priorityCounts=priority_counts,
        modalityCounts=modality_counts,
        scheduledToday=scheduled_today,
        statPriority=priority_counts.get("STAT", 0),
    )


@router.get("", response_model=SuccessResponse[RadiologyStudyCollection])
async def list_studies(
    status: Optional[str] = Query(None, description="Filter by status"),
    modality: Optional[str] = Query(None, description="Filter by modality"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    search: Optional[str] = Query(None, description="Search by patient, MRN, or accession"),
    patient_id: Optional[str] = Query(None, description="Filter by patient ID (UUID)"),
    scheduled_from: Optional[date] = Query(None, description="Scheduled date from (inclusive)"),
    scheduled_to: Optional[date] = Query(None, description="Scheduled date to (inclusive)"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=200, description="Page size"),
    current_user: AuthenticatedUser = Depends(require_roles(UserRole.DOCTOR, UserRole.RADIOLOGIST, UserRole.SUPER_ADMIN)),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    skip = (page - 1) * size
    rows = radiology_study_crud.list(
        db,
        status=status,
        modality=modality,
        priority=priority,
        search=search,
        patient_id=patient_id,
        scheduled_from=scheduled_from,
        scheduled_to=scheduled_to,
        skip=skip,
        limit=size,
    )

    # For total and summary, do a count by listing without pagination (bounded)
    all_rows = radiology_study_crud.list(
        db,
        status=status,
        modality=modality,
        priority=priority,
        search=search,
        patient_id=patient_id,
        scheduled_from=scheduled_from,
        scheduled_to=scheduled_to,
        skip=0,
        limit=10_000,
    )

    items = [_to_schema(r) for r in rows]
    all_items = [_to_schema(r) for r in all_rows]

    collection = RadiologyStudyCollection(
        items=items,
        total=len(all_items),
        page=page,
        size=size,
        summary=_calculate_summary(all_items),
    )
    return SuccessResponse(data=collection, message="Studies retrieved")


@router.get("/stats", response_model=SuccessResponse[RadiologyStudySummary])
async def get_study_stats(
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    rows = radiology_study_crud.list(db, skip=0, limit=10_000)
    return SuccessResponse(data=_calculate_summary([_to_schema(r) for r in rows]))


@router.get("/{study_id}", response_model=SuccessResponse[RadiologyStudy])
async def get_study(
    study_id: str,
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    study = radiology_study_crud.get(db, id=study_id)
    if not study:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study not found")
    return SuccessResponse(data=_to_schema(study))


@router.post("", response_model=SuccessResponse[RadiologyStudy], status_code=status.HTTP_201_CREATED)
async def create_study(
    payload: RadiologyStudyCreate = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    # Enforce unique accession_number
    data = {
        "accession_number": payload.accessionNumber,
        "patient_id": None,  # unknown linkage at creation from UI; may be set via other flows
        "mrn": payload.mrn,
        "patient_name": payload.patientName,
        "age": payload.age,
        "gender": payload.gender,
        "dob": payload.dob,
        "order_date": payload.orderDate,
        "scheduled_date": payload.scheduledDate,
        "modality": payload.modality,
        "body_part": payload.bodyPart,
        "study_description": payload.studyDescription,
        "indication": payload.indication,
        "priority": payload.priority,
        "status": payload.status,
        "ordering_physician": payload.orderingPhysician,
        "technologist": payload.technologist,
        "location": payload.location,
        "room": payload.room,
        "contrast": payload.contrast,
        "preparation": payload.preparation,
        "duration_minutes": payload.duration,
        "notes": payload.notes,
        "insurance": payload.insurance,
        "authorization": payload.authorization,
        "cpt_code": payload.cptCode,
    }
    try:
        study = radiology_study_crud.create_with_accession(db, data=data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return SuccessResponse(data=_to_schema(study), message="Study created")


@router.put("/{study_id}", response_model=SuccessResponse[RadiologyStudy])
async def replace_study(
    study_id: str,
    payload: RadiologyStudyCreate = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    existing = radiology_study_crud.get(db, id=study_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study not found")

    # Ensure unique accession across other studies
    other = radiology_study_crud.get_by_accession(db, accession_number=payload.accessionNumber)
    if other and str(other.id) != str(study_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Study with accession already exists")

    updated = radiology_study_crud.update(
        db,
        db_obj=existing,
        obj_in={
            "accession_number": payload.accessionNumber,
            "mrn": payload.mrn,
            "patient_name": payload.patientName,
            "age": payload.age,
            "gender": payload.gender,
            "dob": payload.dob,
            "order_date": payload.orderDate,
            "scheduled_date": payload.scheduledDate,
            "modality": payload.modality,
            "body_part": payload.bodyPart,
            "study_description": payload.studyDescription,
            "indication": payload.indication,
            "priority": payload.priority,
            "status": payload.status,
            "ordering_physician": payload.orderingPhysician,
            "technologist": payload.technologist,
            "location": payload.location,
            "room": payload.room,
            "contrast": payload.contrast,
            "preparation": payload.preparation,
            "duration_minutes": payload.duration,
            "notes": payload.notes,
            "insurance": payload.insurance,
            "authorization": payload.authorization,
            "cpt_code": payload.cptCode,
        },
    )
    return SuccessResponse(data=_to_schema(updated), message="Study replaced")


@router.patch("/{study_id}", response_model=SuccessResponse[RadiologyStudy])
async def patch_study(
    study_id: str,
    payload: RadiologyStudyUpdate = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    existing = radiology_study_crud.get(db, id=study_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study not found")

    updates = payload.dict(exclude_none=True)
    obj_in: Dict[str, object] = {}

    mapping = {
        "accessionNumber": "accession_number",
        "patientName": "patient_name",
        "mrn": "mrn",
        "age": "age",
        "gender": "gender",
        "dob": "dob",
        "orderDate": "order_date",
        "scheduledDate": "scheduled_date",
        "modality": "modality",
        "bodyPart": "body_part",
        "studyDescription": "study_description",
        "indication": "indication",
        "priority": "priority",
        "status": "status",
        "orderingPhysician": "ordering_physician",
        "technologist": "technologist",
        "location": "location",
        "room": "room",
        "contrast": "contrast",
        "preparation": "preparation",
        "duration": "duration_minutes",
        "notes": "notes",
        "insurance": "insurance",
        "authorization": "authorization",
        "cptCode": "cpt_code",
    }

    for k, v in updates.items():
        if k in mapping:
            obj_in[mapping[k]] = v

    updated = radiology_study_crud.update(db, db_obj=existing, obj_in=obj_in)
    return SuccessResponse(data=_to_schema(updated), message="Study updated")


@router.delete("/{study_id}", response_model=SuccessResponse[Dict[str, str]])
async def delete_study(
    study_id: str,
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    existing = radiology_study_crud.get(db, id=study_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Study not found")
    radiology_study_crud.remove(db, id=study_id)
    return SuccessResponse(data={"status": "deleted"}, message="Study deleted")


@router.post("/upload-dicom", response_model=SuccessResponse[Dict[str, Any]], status_code=status.HTTP_201_CREATED)
async def upload_dicom_study(
    patient_id: str = Form(...),
    modality: Optional[str] = Form(None),
    body_part: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    source: str = Form("external_cd"),
    study_date: Optional[date] = Form(None),
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """
    Upload DICOM files (ZIP or single file) to Orthanc and create study record.
    """
    import traceback
    
    try:
        print(f"📤 DICOM upload started: patient_id={patient_id}, filename={file.filename}, size={file.size}")
        
        # Read file content (with size check)
        MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024  # 2 GB
        raw_bytes = await file.read()
        
        print(f"📦 File read: {len(raw_bytes)} bytes")
        
        if len(raw_bytes) > MAX_FILE_SIZE:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (max 2GB)")

        # Extract DICOM files from upload (handles ZIP or single file)
        try:
            dicom_files = extract_files_from_upload(file.filename or "upload", raw_bytes)
            print(f"✅ Extracted {len(dicom_files)} DICOM file(s)")
        except ValueError as e:
            print(f"❌ Extraction error: {e}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except Exception as e:
            print(f"❌ Unexpected extraction error: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error extracting files: {str(e)}")

        # Upload to Orthanc
        try:
            print(f"📡 Uploading to Orthanc...")
            orthanc_study_id, study_instance_uid = await upload_dicom_files_to_orthanc(dicom_files)
            print(f"✅ Orthanc upload successful: study_id={orthanc_study_id}, uid={study_instance_uid}")
        except ValueError as e:
            print(f"❌ Orthanc upload error: {e}")
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload to Orthanc: {str(e)}"
            )
        except Exception as e:
            print(f"❌ Unexpected Orthanc error: {e}")
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload to Orthanc: {str(e)}"
            )

        # Generate accession number if not provided
        import uuid as uuid_lib
        from uuid import UUID as UUIDType
        import io
        
        accession_number = f"ACC{str(uuid_lib.uuid4())[:8].upper()}"

        # Convert patient_id to UUID if it's a string
        try:
            if isinstance(patient_id, str):
                patient_uuid = UUIDType(patient_id)
            else:
                patient_uuid = patient_id
        except (ValueError, TypeError) as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid patient_id format: {str(e)}"
            )

        # Extract modality and body_part from DICOM files if not provided
        extracted_modality = modality
        extracted_body_part = body_part
        
        if not modality or not body_part:
            try:
                # Try to import pydicom
                try:
                    import pydicom
                    PYDICOM_AVAILABLE = True
                except ImportError:
                    PYDICOM_AVAILABLE = False
                    print("⚠️ pydicom not available, cannot extract DICOM metadata")
                
                if PYDICOM_AVAILABLE and len(dicom_files) > 0:
                    # Read the first DICOM file to extract metadata
                    try:
                        ds = pydicom.dcmread(io.BytesIO(dicom_files[0]), stop_before_pixels=True)
                        
                        # Extract modality if not provided
                        if not extracted_modality:
                            if hasattr(ds, 'Modality'):
                                extracted_modality = str(ds.Modality).strip()
                                print(f"📋 Extracted modality from DICOM: {extracted_modality}")
                        
                        # Extract body part if not provided
                        if not extracted_body_part:
                            if hasattr(ds, 'BodyPartExamined'):
                                extracted_body_part = str(ds.BodyPartExamined).strip()
                                print(f"📋 Extracted body part from DICOM: {extracted_body_part}")
                            elif hasattr(ds, 'AnatomicRegionSequence') and len(ds.AnatomicRegionSequence) > 0:
                                # Try to get from sequence
                                region = ds.AnatomicRegionSequence[0]
                                if hasattr(region, 'CodeMeaning'):
                                    extracted_body_part = str(region.CodeMeaning).strip()
                                    print(f"📋 Extracted body part from DICOM sequence: {extracted_body_part}")
                    except Exception as e:
                        print(f"⚠️ Could not extract DICOM metadata: {e}")
            except Exception as e:
                print(f"⚠️ Error extracting DICOM metadata: {e}")
        
        # Ensure modality is not None (required by database)
        if not extracted_modality:
            extracted_modality = "UNKNOWN"
            print(f"⚠️ Modality not provided or extracted, using default: {extracted_modality}")
        
        # Ensure body_part is not None (required by database)
        if not extracted_body_part:
            extracted_body_part = "UNKNOWN"
            print(f"⚠️ Body part not provided or extracted, using default: {extracted_body_part}")
        
        # Ensure priority is not None (required by database)
        # Priority is not a function parameter, so we always use a default value
        priority_value = "ROUTINE"
        print(f"⚠️ Priority not provided, using default: {priority_value}")

        # Fetch patient information to populate patient_name
        patient_name = None
        patient_mrn = None
        patient_age = None
        patient_gender = None
        patient_dob = None
        
        try:
            patient = db.query(PatientORM).filter(PatientORM.patient_id == patient_uuid).first()
            if patient:
                # Get the associated user data
                user = None
                if hasattr(patient, 'user') and patient.user is not None:
                    user = patient.user
                elif hasattr(patient, 'user_id') and patient.user_id:
                    user = db.query(UserORM).filter(UserORM.id == patient.user_id).first()
                
                # Build full name
                if user:
                    patient_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
                    if not patient_name:
                        patient_name = user.full_name or f"Patient {str(patient.patient_id)[:8]}"
                else:
                    patient_name = f"Patient {str(patient.patient_id)[:8]}"
                
                # Get other patient information
                patient_mrn = patient.mrn if hasattr(patient, 'mrn') else None
                patient_dob = patient.date_of_birth if hasattr(patient, 'date_of_birth') else None
                raw_gender = patient.sex if hasattr(patient, 'sex') else None
                
                # Normalize gender to match schema pattern (M, F, or O)
                if raw_gender:
                    gender_lower = str(raw_gender).lower().strip()
                    if gender_lower in ['male', 'm', 'man']:
                        patient_gender = "M"
                    elif gender_lower in ['female', 'f', 'woman']:
                        patient_gender = "F"
                    elif gender_lower in ['other', 'o', 'unknown']:
                        patient_gender = "O"
                    elif gender_lower in ['m', 'f', 'o']:
                        patient_gender = gender_lower.upper()
                    else:
                        patient_gender = "O"  # Default to "Other" if unknown
                else:
                    patient_gender = None
                
                # Calculate age if DOB is available
                if patient_dob:
                    today = date.today()
                    patient_age = today.year - patient_dob.year - ((today.month, today.day) < (patient_dob.month, patient_dob.day))
                
                print(f"📋 Fetched patient: {patient_name} (ID: {patient_uuid})")
            else:
                print(f"⚠️ Patient not found for ID: {patient_uuid}, using default name")
                patient_name = f"Patient {str(patient_uuid)[:8]}"
        except Exception as e:
            print(f"⚠️ Error fetching patient information: {e}")
            import traceback
            traceback.print_exc()
            # Use a fallback name
            patient_name = f"Patient {str(patient_uuid)[:8]}"

        # Save metadata in database
        # Set order_date to current time if not provided (required by database)
        if study_date:
            # If study_date is provided, convert it to datetime for order_date
            if isinstance(study_date, str):
                # Parse string date and convert to datetime
                try:
                    parsed_date = datetime.strptime(study_date, "%Y-%m-%d").date()
                    order_date_value = datetime.combine(parsed_date, datetime.min.time()).replace(tzinfo=timezone.utc)
                except ValueError:
                    # If parsing fails, use current time
                    order_date_value = datetime.now(timezone.utc)
            elif isinstance(study_date, date):
                # Convert date to datetime
                order_date_value = datetime.combine(study_date, datetime.min.time()).replace(tzinfo=timezone.utc)
            else:
                # Already a datetime
                order_date_value = study_date if study_date.tzinfo else study_date.replace(tzinfo=timezone.utc)
        else:
            # Default to current time
            order_date_value = datetime.now(timezone.utc)
        
        study_data = {
            "patient_id": patient_uuid,
            "patient_name": patient_name,  # Populated from patient/user data
            "mrn": patient_mrn,  # Populated from patient data
            "age": patient_age,  # Calculated from DOB
            "gender": patient_gender,  # From patient data
            "dob": patient_dob,  # From patient data
            "accession_number": accession_number,
            "orthanc_study_id": orthanc_study_id,
            "study_instance_uid": study_instance_uid,
            "modality": extracted_modality,  # Use extracted value (required by database)
            "body_part": extracted_body_part,  # Use extracted value
            "study_description": description or f"DICOM study uploaded from {source}",
            "source": source,
            "study_date": study_date,
            "order_date": order_date_value,  # Required by database
            "scheduled_date": order_date_value,  # Required by database (use same as order_date for uploaded studies)
            "priority": priority_value,  # Required by database (defaults to "ROUTINE")
            "uploaded_by": current_user.user_id,  # UUIDColumn will handle conversion
            "status": "IMPORTED_NO_REPORT",
        }

        try:
            print(f"💾 Saving study metadata to database...")
            study = radiology_study_crud.create(db, obj_in=study_data)
            db.commit()
            db.refresh(study)
            print(f"✅ Study saved: id={study.id}")
        except Exception as e:
            db.rollback()
            print(f"❌ Database save error: {e}")
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save study metadata: {str(e)}"
            )

        # Generate viewer URL (adjust based on your OHIF setup)
        viewer_url = f"/radiology/pacs?StudyInstanceUID={study_instance_uid}"

        print(f"✅ DICOM upload completed successfully")
        return SuccessResponse(
            data={
                "id": str(study.id),
                "patient_id": str(study.patient_id),
                "orthanc_study_id": orthanc_study_id,
                "study_instance_uid": study_instance_uid,
                "modality": study.modality,
                "body_part": study.body_part,
                "description": study.study_description,
                "source": study.source,
                "study_date": str(study.study_date) if study.study_date else None,
                "viewer_url": viewer_url,
                "status": study.status,
            },
            message="DICOM study uploaded successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Unexpected error in DICOM upload: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during DICOM upload: {str(e)}"
        )


@router.get("/patients/search")
async def search_patients(
    q: str = Query(..., min_length=2, description="Search query for name, email, phone, or ID"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
):
    """Search patients by name, email, phone, or ID with proper authentication, filtered by radiologist's clinic."""
    try:
        # Get radiologist's clinic (organization_id) from User model
        from app.common.models.user import User
        from uuid import UUID
        
        radiologist_user = db.query(User).filter(User.id == current_user.user_id).first()
        if not radiologist_user or not radiologist_user.organization_id:
            # If no clinic, return empty results
            return []
        
        clinic_uuid = UUID(str(radiologist_user.organization_id)) if isinstance(radiologist_user.organization_id, str) else radiologist_user.organization_id
        
        # Build search filters
        like = f"%{q}%"
        
        # Base query with User join, organization_patients filter, and relationship loading
        # Use outerjoin for User in case patient doesn't have a user account
        query = db.query(PatientORM).join(
            OrganizationPatient, PatientORM.patient_id == OrganizationPatient.patient_id
        ).outerjoin(
            UserORM, PatientORM.user_id == UserORM.id
        ).filter(
            OrganizationPatient.organization_id == clinic_uuid,
            OrganizationPatient.status == "active"
        )
        
        # Add search filters - search in User table for names, email, phone
        # For patient ID search, try UUID match if query looks like UUID
        # Note: ilike() on NULL columns returns NULL, which is fine in OR clauses
        search_filters = [
            PatientORM.phone.ilike(like),
            UserORM.first_name.ilike(like),
            UserORM.last_name.ilike(like),
            UserORM.full_name.ilike(like),
            UserORM.email.ilike(like),
            UserORM.phone.ilike(like),
        ]
        
        # Try to add patient_id search if query looks like UUID
        if '-' in q and len(q) > 30:  # UUIDs have hyphens and are long
            try:
                search_uuid = UUID(q)
                search_filters.append(PatientORM.patient_id == search_uuid)
            except (ValueError, AttributeError):
                # Not a valid UUID, skip patient_id search
                pass
        
        query = query.filter(or_(*search_filters))
        
        # Order and limit - handle null values in ordering
        # Use nullslast() to put patients without users at the end
        # Note: Removed distinct() because it conflicts with ORDER BY on joined columns
        # The query already returns unique patients via the organization_patients join
        from sqlalchemy import nullslast
        results = query.options(joinedload(PatientORM.user)).order_by(
            nullslast(UserORM.last_name.asc()),
            nullslast(UserORM.first_name.asc()),
            PatientORM.patient_id.asc()
        ).limit(limit).all()
        
        # Remove duplicates manually if needed (shouldn't be necessary, but just in case)
        seen_ids = set()
        unique_results = []
        for patient in results:
            if patient.patient_id not in seen_ids:
                seen_ids.add(patient.patient_id)
                unique_results.append(patient)
        results = unique_results
        
        # Transform to response format
        search_results = []
        for patient in results:
            try:
                # Get the associated user data - handle case where user might be None
                user = None
                if hasattr(patient, 'user') and patient.user is not None:
                    user = patient.user
                elif hasattr(patient, 'user_id') and patient.user_id:
                    # Try to load user if relationship didn't load
                    user = db.query(UserORM).filter(UserORM.id == patient.user_id).first()
                
                # Build full name
                if user:
                    full_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
                    if not full_name:
                        full_name = user.full_name or f"Patient {str(patient.patient_id)[:8]}"
                else:
                    full_name = f"Patient {str(patient.patient_id)[:8]}"
                
                search_results.append({
                    "id": str(patient.patient_id),
                    "fullName": full_name,
                    "email": user.email if user else "",
                    "phone": (user.phone if user else None) or patient.phone or "",
                    "dateOfBirth": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
                    "gender": patient.sex or "",
                })
            except Exception as patient_error:
                import traceback
                print(f"Error processing patient {getattr(patient, 'patient_id', 'unknown')}: {patient_error}")
                traceback.print_exc()
                continue
        
        return search_results
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = str(e)
        error_trace = traceback.format_exc()
        print(f"❌ Error in patient search endpoint:")
        print(f"   Query: {q}")
        print(f"   Error: {error_msg}")
        print(f"   Traceback:\n{error_trace}")
        # Return detailed error in development, generic in production
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching patients: {error_msg}" if "development" in str(e).lower() else "Error searching patients. Please check server logs."
        )
