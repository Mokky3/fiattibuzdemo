from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.common.auth.auth_service import AuthenticatedUser, require_radiologist_access
from app.common.schemas.responses_enhanced import SuccessResponse
from app.db.session import get_db
from app.crud.radiology import radiology_study
from app.common.models.radiology import RadiologyStudy as RadiologyStudyModel, WorklistAssignment

router = APIRouter(prefix="/dashboard", tags=["Radiology Dashboard"])


def _to_worklist_schema(study: RadiologyStudyModel, assignment: WorklistAssignment = None) -> Dict[str, Any]:
    """Convert database study to worklist schema for dashboard use."""
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
        "studyTime": study.order_date.strftime("%H:%M") if study.order_date else "",
        "modality": study.modality,
        "bodyPart": study.body_part,
        "studyDescription": study.study_description,
        "indication": study.indication or "",
        "priority": study.priority,
        "orderingPhysician": study.ordering_physician or "",
        "technologist": study.technologist or "",
        "status": study.status,
        "readingStatus": (assignment.reading_status if assignment else "unread"),
        "imageCount": (assignment.image_count if assignment else 0),
        "seriesCount": (assignment.series_count if assignment else 0),
        "studySize": (assignment.study_size if assignment else ""),
        "contrast": bool(study.contrast),
        "location": study.location or "",
        "room": study.room or "",
        "protocolName": (assignment.protocol_name if assignment else ""),
        "assignedRadiologist": (assignment.assigned_radiologist_id if assignment else None),
        "priorStudies": 0,
        "criticalFlag": (assignment.critical_flag if assignment else False),
        "tags": (assignment.tags or [] if assignment else []),
        "turnaroundTime": (assignment.turnaround_time if assignment else ""),
        "estimatedReadTime": (assignment.estimated_read_time if assignment else ""),
        "preliminaryFindings": (assignment.preliminary_findings if assignment else None),
        "finalReport": None,
    }


@router.get("/summary", response_model=SuccessResponse[Dict[str, Any]])
async def dashboard_summary(
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Get comprehensive dashboard summary with real data."""
    
    # Get studies from database
    db_studies: List[RadiologyStudyModel] = radiology_study.list(db, skip=0, limit=1000)
    
    # Get assignments
    study_id_to_assignment: Dict[str, WorklistAssignment] = {}
    assignments = db.query(WorklistAssignment).all()
    for a in assignments:
        study_id_to_assignment[str(a.study_id)] = a
    
    # Convert to worklist format
    studies = [_to_worklist_schema(s, study_id_to_assignment.get(str(s.id))) for s in db_studies]
    
    # Calculate statistics
    by_status = {"unread": 0, "reading": 0, "preliminary": 0, "final": 0}
    by_modality = {}
    by_priority = {"STAT": 0, "Urgent": 0, "Routine": 0}
    critical_count = 0
    
    for study in studies:
        # Status counts
        status = study.get("readingStatus", "unread")
        if status in by_status:
            by_status[status] += 1
        
        # Modality counts
        modality = study.get("modality", "Unknown")
        by_modality[modality] = by_modality.get(modality, 0) + 1
        
        # Priority counts
        priority = study.get("priority", "Routine")
        if priority in by_priority:
            by_priority[priority] += 1
        
        # Critical flag
        if study.get("criticalFlag", False):
            critical_count += 1
    
    # Calculate performance metrics
    total_studies = len(studies)
    completed_today = by_status["final"]
    completion_rate = (completed_today / total_studies * 100) if total_studies > 0 else 0
    
    # Calculate average turnaround time (mock for now)
    avg_tat_hours = 1.2  # This would be calculated from actual data
    
    # Weekly overview (mock for now - would need historical data)
    weekly_total = 247
    daily_average = 35.3
    weekly_critical = 12
    quality_score = 98.5
    
    # Recent activity (mock for now - would need activity log)
    recent_activity = [
        {
            "id": "1",
            "type": "report_finalized",
            "message": "Report finalized",
            "patient": "Wilson, Emma - Ultrasound Abdomen",
            "time": "2 hours ago",
            "icon": "check",
            "color": "green"
        },
        {
            "id": "2", 
            "type": "study_reviewed",
            "message": "Study reviewed",
            "patient": "Johnson, Mike - Chest X-Ray",
            "time": "3 hours ago",
            "icon": "eye",
            "color": "blue"
        },
        {
            "id": "3",
            "type": "critical_finding",
            "message": "Critical finding",
            "patient": "Smith, John - CT Chest", 
            "time": "4 hours ago",
            "icon": "alert",
            "color": "red"
        }
    ]
    
    summary = {
        # Basic counts
        "total": total_studies,
        "unread": by_status["unread"],
        "reading": by_status["reading"],
        "preliminary": by_status["preliminary"],
        "final": by_status["final"],
        "stat": by_priority["STAT"],
        "urgent": by_priority["Urgent"],
        "routine": by_priority["Routine"],
        "critical": critical_count,
        
        # Modality breakdown
        "ct": by_modality.get("CT", 0),
        "mri": by_modality.get("MRI", 0),
        "xr": by_modality.get("XR", 0),
        "us": by_modality.get("US", 0),
        "byModality": by_modality,
        
        # Performance metrics
        "completionRate": round(completion_rate, 1),
        "avgTatHours": avg_tat_hours,
        "pendingReports": by_status["preliminary"],
        
        # Weekly overview
        "weeklyTotal": weekly_total,
        "dailyAverage": daily_average,
        "weeklyCritical": weekly_critical,
        "qualityScore": quality_score,
        
        # Recent activity
        "recentActivity": recent_activity,
        
        # Additional metrics
        "studiesRead": completed_today,
        "studiesTotal": total_studies,
        "criticalFindings": critical_count
    }
    
    return SuccessResponse(data=summary)


@router.get("/activity", response_model=SuccessResponse[List[Dict[str, Any]]])
async def get_recent_activity(
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Get recent radiology activity."""
    # This would typically query an activity log table
    # For now, return mock data
    activity = [
        {
            "id": "1",
            "type": "report_finalized",
            "message": "Report finalized",
            "patient": "Wilson, Emma - Ultrasound Abdomen",
            "time": "2 hours ago",
            "timestamp": datetime.now(timezone.utc) - timedelta(hours=2),
            "icon": "check",
            "color": "green"
        },
        {
            "id": "2",
            "type": "study_reviewed", 
            "message": "Study reviewed",
            "patient": "Johnson, Mike - Chest X-Ray",
            "time": "3 hours ago",
            "timestamp": datetime.now(timezone.utc) - timedelta(hours=3),
            "icon": "eye",
            "color": "blue"
        },
        {
            "id": "3",
            "type": "critical_finding",
            "message": "Critical finding",
            "patient": "Smith, John - CT Chest",
            "time": "4 hours ago", 
            "timestamp": datetime.now(timezone.utc) - timedelta(hours=4),
            "icon": "alert",
            "color": "red"
        }
    ]
    
    return SuccessResponse(data=activity)





