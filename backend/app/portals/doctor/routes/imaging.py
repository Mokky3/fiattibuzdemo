"""Doctor portal - Medical Imaging (OHIF/DICOM) router
Provides access to OHIF viewer for viewing DICOM images
"""
from datetime import datetime, timezone
from typing import Dict, List, Optional
import httpx
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .auth import get_current_doctor, DoctorUser
from app.common.schemas.responses_enhanced import SuccessResponse
from app.db.session import get_db
from app.common.models.patient import Patient as PatientORM
from app.common.models.user import User as UserORM

router = APIRouter(prefix="/imaging", tags=["Doctor · Medical Imaging"])
logger = logging.getLogger(__name__)

# Orthanc and OHIF configuration
ORTHANC_BASE_URL = "http://localhost:8042"
OHIF_BASE_URL = "http://localhost:3000"

# ──────────────────────────────────────────────────────────────────────────────
# Response Models
# ──────────────────────────────────────────────────────────────────────────────

class StudyInfo(BaseModel):
    """DICOM study information"""
    study_id: str = Field(..., description="Orthanc study ID")
    study_instance_uid: Optional[str] = Field(None, description="DICOM StudyInstanceUID")
    accession_number: Optional[str] = Field(None, description="Accession number")
    patient_name: Optional[str] = Field(None, description="Patient name")
    patient_id: Optional[str] = Field(None, description="Patient ID")
    study_date: Optional[str] = Field(None, description="Study date")
    study_description: Optional[str] = Field(None, description="Study description")
    modality: Optional[str] = Field(None, description="Modality")
    series_count: int = Field(0, description="Number of series")
    instance_count: int = Field(0, description="Number of instances")

class OHIFViewerResponse(BaseModel):
    """OHIF viewer URL and study information"""
    viewer_url: str = Field(..., description="OHIF viewer URL to open the study")
    study_instance_uid: Optional[str] = Field(None, description="DICOM StudyInstanceUID")
    study_info: Optional[StudyInfo] = Field(None, description="Study information")

class StudiesListResponse(BaseModel):
    """List of available studies"""
    studies: List[StudyInfo] = Field(..., description="List of studies")
    total: int = Field(..., description="Total number of studies")

# ──────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ──────────────────────────────────────────────────────────────────────────────

async def fetch_orthanc_studies(patient_id: Optional[str] = None) -> List[Dict]:
    """Fetch studies from Orthanc"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Get list of studies
            response = await client.get(f"{ORTHANC_BASE_URL}/studies")
            if response.status_code != 200:
                logger.error(f"Failed to fetch studies from Orthanc: {response.status_code}")
                return []
            
            study_ids = response.json()
            if not study_ids:
                return []
            
            # Fetch details for each study
            studies = []
            for study_id in study_ids:
                try:
                    study_response = await client.get(f"{ORTHANC_BASE_URL}/studies/{study_id}")
                    if study_response.status_code == 200:
                        study_data = study_response.json()
                        
                        # Filter by patient ID if provided
                        if patient_id:
                            study_patient_id = study_data.get("MainDicomTags", {}).get("PatientID", "")
                            if study_patient_id != patient_id:
                                continue
                        
                        studies.append({
                            "study_id": study_id,
                            "data": study_data
                        })
                except Exception as e:
                    logger.warning(f"Error fetching study {study_id}: {e}")
                    continue
            
            return studies
    except Exception as e:
        logger.error(f"Error fetching studies from Orthanc: {e}")
        return []

def parse_study_info(study_id: str, study_data: Dict) -> StudyInfo:
    """Parse Orthanc study data into StudyInfo"""
    main_tags = study_data.get("MainDicomTags", {})
    
    return StudyInfo(
        study_id=study_id,
        study_instance_uid=main_tags.get("StudyInstanceUID"),
        accession_number=main_tags.get("AccessionNumber"),
        patient_name=main_tags.get("PatientName", "").replace("^", ", "),
        patient_id=main_tags.get("PatientID"),
        study_date=main_tags.get("StudyDate"),
        study_description=main_tags.get("StudyDescription"),
        modality=main_tags.get("ModalitiesInStudy", "").split("\\")[0] if main_tags.get("ModalitiesInStudy") else None,
        series_count=study_data.get("Series", []).__len__() if isinstance(study_data.get("Series"), list) else 0,
        instance_count=study_data.get("Instances", []).__len__() if isinstance(study_data.get("Instances"), list) else 0,
    )

# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/studies", response_model=SuccessResponse[StudiesListResponse])
async def list_studies(
    patient_id: Optional[str] = Query(None, description="Filter by patient ID"),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """List available DICOM studies from Orthanc"""
    try:
        studies_data = await fetch_orthanc_studies(patient_id=patient_id)
        
        studies = []
        for item in studies_data:
            study_info = parse_study_info(item["study_id"], item["data"])
            studies.append(study_info)
        
        return SuccessResponse(data=StudiesListResponse(
            studies=studies,
            total=len(studies)
        ))
    except Exception as e:
        logger.error(f"Error listing studies: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch studies: {str(e)}"
        )

@router.get("/viewer", response_model=SuccessResponse[OHIFViewerResponse])
async def get_viewer_url(
    study_id: Optional[str] = Query(None, description="Orthanc study ID to open"),
    study_instance_uid: Optional[str] = Query(None, description="DICOM StudyInstanceUID to open"),
    patient_id: Optional[str] = Query(None, description="Filter by patient ID"),
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Get OHIF viewer URL for a specific study or show study list"""
    try:
        # If study_instance_uid is provided, use it directly
        if study_instance_uid:
            viewer_url = f"{OHIF_BASE_URL}/viewer?StudyInstanceUIDs={study_instance_uid}"
            return SuccessResponse(data=OHIFViewerResponse(
                viewer_url=viewer_url,
                study_instance_uid=study_instance_uid
            ))
        
        # If study_id is provided, fetch StudyInstanceUID from Orthanc
        if study_id:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{ORTHANC_BASE_URL}/studies/{study_id}")
                if response.status_code == 200:
                    study_data = response.json()
                    study_instance_uid = study_data.get("MainDicomTags", {}).get("StudyInstanceUID")
                    
                    if study_instance_uid:
                        viewer_url = f"{OHIF_BASE_URL}/viewer?StudyInstanceUIDs={study_instance_uid}"
                        study_info = parse_study_info(study_id, study_data)
                        return SuccessResponse(data=OHIFViewerResponse(
                            viewer_url=viewer_url,
                            study_instance_uid=study_instance_uid,
                            study_info=study_info
                        ))
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail="StudyInstanceUID not found for the given study"
                        )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Study not found in Orthanc"
                    )
        
        # If no study specified, return viewer URL for study list
        viewer_url = f"{OHIF_BASE_URL}"
        return SuccessResponse(data=OHIFViewerResponse(
            viewer_url=viewer_url
        ))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting viewer URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get viewer URL: {str(e)}"
        )

@router.get("/studies/{study_id}", response_model=SuccessResponse[StudyInfo])
async def get_study_details(
    study_id: str,
    current: DoctorUser = Depends(get_current_doctor),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Get detailed information about a specific study"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{ORTHANC_BASE_URL}/studies/{study_id}")
            if response.status_code == 200:
                study_data = response.json()
                study_info = parse_study_info(study_id, study_data)
                return SuccessResponse(data=study_info)
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Study not found"
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching study details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch study details: {str(e)}"
        )

