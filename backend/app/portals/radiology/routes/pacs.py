from __future__ import annotations

from datetime import datetime, date, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.common.auth.auth_service import AuthenticatedUser, require_radiologist_access
from app.common.schemas.responses_enhanced import SuccessResponse
from app.common.schemas.radiology import PACSStudyInfo
from app.common.services.radiology_service import get_pacs_viewer_info
from app.db.session import get_db
from app.crud.radiology import radiology_study
from app.common.models.radiology import RadiologyStudy as RadiologyStudyModel

router = APIRouter(prefix="/pacs", tags=["Radiology PACS"])


def _to_pacs_study_schema(study: RadiologyStudyModel) -> Dict:
    """Convert database study to PACS study schema."""
    return {
        "id": str(study.id),
        "accessionNumber": study.accession_number,
        "patientName": study.patient_name or "",
        "patientId": str(study.patient_id) if study.patient_id else "",
        "mrn": study.mrn or "",
        "age": study.age or 0,
        "gender": study.gender or "O",
        "dob": study.dob,
        "studyDate": study.order_date,
        "modality": study.modality,
        "bodyPart": study.body_part,
        "studyDescription": study.study_description,
        "indication": study.indication or "",
        "status": study.status,
        "series": [
            {
                "id": f"S{str(study.id)[-3:]}",
                "seriesNumber": 1,
                "description": f"{study.modality} {study.body_part}",
                "imageCount": 50,  # Mock data
                "sliceThickness": "1.25mm",
                "images": [
                    {
                        "id": f"IMG-{i+1}",
                        "instanceNumber": i + 1,
                        "position": f"{i * 1.25}mm",
                        "acquisitionTime": "09:15:30"
                    }
                    for i in range(50)
                ]
            }
        ]
    }


@router.get("/viewer/{study_id}", response_model=SuccessResponse[PACSStudyInfo])
async def get_viewer(
    study_id: str,
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
) -> SuccessResponse:
    """Get PACS viewer information for a study."""
    return SuccessResponse(data=get_pacs_viewer_info(study_id))


@router.get("/studies", response_model=SuccessResponse[Dict])
async def get_pacs_studies(
    modality: Optional[str] = Query(None, description="Filter by modality"),
    bodyPart: Optional[str] = Query(None, description="Filter by body part"),
    dateFrom: Optional[date] = Query(None, description="Date from"),
    dateTo: Optional[date] = Query(None, description="Date to"),
    search: Optional[str] = Query(None, description="Search term"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=200, description="Page size"),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Get PACS studies with filtering and pagination."""
    skip = (page - 1) * size
    
    # Get studies from database
    db_studies = radiology_study.list(
        db,
        modality=modality,
        skip=skip,
        limit=size,
    )
    
    # Convert to PACS format
    studies = [_to_pacs_study_schema(study) for study in db_studies]
    
    # Get total count
    total_studies = radiology_study.list(db, skip=0, limit=10000)
    
    return SuccessResponse(data={
        "items": studies,
        "total": len(total_studies),
        "page": page,
        "size": size
    })


@router.get("/studies/{study_id}", response_model=SuccessResponse[Dict])
async def get_pacs_study_details(
    study_id: str,
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Get detailed PACS study information."""
    # Get study from database
    study = radiology_study.get(db, study_id)
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    
    study_data = _to_pacs_study_schema(study)
    return SuccessResponse(data=study_data)


@router.get("/studies/{study_id}/series", response_model=SuccessResponse[List[Dict]])
async def get_pacs_series(
    study_id: str,
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Get series information for a study."""
    # Get study from database
    study = radiology_study.get(db, study_id)
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    
    # Mock series data
    series_data = [
        {
            "id": f"S{str(study.id)[-3:]}",
            "seriesNumber": 1,
            "description": f"{study.modality} {study.body_part}",
            "imageCount": 50,
            "sliceThickness": "1.25mm",
            "images": [
                {
                    "id": f"IMG-{i+1}",
                    "instanceNumber": i + 1,
                    "position": f"{i * 1.25}mm",
                    "acquisitionTime": "09:15:30"
                }
                for i in range(50)
            ]
        }
    ]
    
    return SuccessResponse(data=series_data)


@router.get("/studies/{study_id}/series/{series_id}/images", response_model=SuccessResponse[List[Dict]])
async def get_pacs_images(
    study_id: str,
    series_id: str,
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Get images for a specific series."""
    # Mock image data
    images = [
        {
            "id": f"IMG-{i+1}",
            "instanceNumber": i + 1,
            "position": f"{i * 1.25}mm",
            "acquisitionTime": "09:15:30",
            "imageUrl": f"/api/v1/radiology/pacs/images/{study_id}/{series_id}/IMG-{i+1}.dcm"
        }
        for i in range(50)
    ]
    
    return SuccessResponse(data=images)


@router.get("/studies/{study_id}/series/{series_id}/images/{image_id}", response_model=SuccessResponse[Dict])
async def get_pacs_image(
    study_id: str,
    series_id: str,
    image_id: str,
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Get specific image information."""
    # Mock image data
    image_data = {
        "id": image_id,
        "instanceNumber": 1,
        "position": "0.0mm",
        "acquisitionTime": "09:15:30",
        "imageUrl": f"/api/v1/radiology/pacs/images/{study_id}/{series_id}/{image_id}.dcm",
        "windowWidth": 400,
        "windowCenter": 40,
        "pixelSpacing": [0.5, 0.5],
        "sliceThickness": 1.25
    }
    
    return SuccessResponse(data=image_data)


@router.post("/studies/{study_id}/series/{series_id}/images/{image_id}/annotations", response_model=SuccessResponse[Dict])
async def save_pacs_annotations(
    study_id: str,
    series_id: str,
    image_id: str,
    annotations: Dict,
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Save annotations for an image."""
    # In a real implementation, this would save to database
    return SuccessResponse(data={"saved": True, "annotationId": "ANN-001"})


@router.get("/studies/{study_id}/series/{series_id}/images/{image_id}/annotations", response_model=SuccessResponse[List[Dict]])
async def get_pacs_annotations(
    study_id: str,
    series_id: str,
    image_id: str,
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Get annotations for an image."""
    # Mock annotation data
    annotations = [
        {
            "id": "ANN-001",
            "type": "measurement",
            "coordinates": [100, 100, 200, 200],
            "value": "2.5cm",
            "createdBy": current_user.email,
            "createdAt": datetime.now(timezone.utc)
        }
    ]
    
    return SuccessResponse(data=annotations)


@router.get("/stats", response_model=SuccessResponse[Dict])
async def get_pacs_stats(
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Get PACS statistics."""
    # Get studies from database
    studies = radiology_study.list(db, skip=0, limit=10000)
    
    # Calculate statistics
    by_modality = {}
    by_body_part = {}
    total_studies = len(studies)
    
    for study in studies:
        by_modality[study.modality] = by_modality.get(study.modality, 0) + 1
        by_body_part[study.body_part] = by_body_part.get(study.body_part, 0) + 1
    
    stats = {
        "totalStudies": total_studies,
        "byModality": by_modality,
        "byBodyPart": by_body_part,
        "totalImages": total_studies * 50,  # Mock: 50 images per study
        "totalSeries": total_studies * 3,   # Mock: 3 series per study
    }
    
    return SuccessResponse(data=stats)





