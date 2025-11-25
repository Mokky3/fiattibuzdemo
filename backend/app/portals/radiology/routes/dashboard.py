from __future__ import annotations

from datetime import datetime, timedelta, timezone, date
from typing import Dict, List, Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.common.auth.auth_service import AuthenticatedUser, require_radiologist_access
from app.common.schemas.responses_enhanced import SuccessResponse
from app.db.session import get_db
from app.crud.radiology import radiology_study
from app.common.models.radiology import RadiologyStudy as RadiologyStudyModel, WorklistAssignment

router = APIRouter(prefix="/dashboard", tags=["Radiology Dashboard"])


def _to_worklist_schema(study: RadiologyStudyModel, assignment: WorklistAssignment = None) -> Dict[str, Any]:
    """Convert database study to worklist schema for dashboard use."""
    # Use study_date if available, otherwise order_date, otherwise scheduled_date
    study_date = study.study_date or study.order_date or study.scheduled_date
    
    # Normalize gender to match schema pattern (M, F, or O)
    normalized_gender = "O"  # Default to "Other"
    if study.gender:
        gender_lower = str(study.gender).lower().strip()
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
    
    return {
        "id": str(study.id),
        "accessionNumber": study.accession_number,
        "patientName": study.patient_name or "",
        "patientId": str(study.patient_id) if study.patient_id else "",
        "mrn": study.mrn or "",
        "age": study.age or 0,
        "gender": normalized_gender,
        "dob": study.dob,
        "studyDate": study_date,
        "studyTime": study_date.strftime("%H:%M") if study_date and isinstance(study_date, datetime) else "",
        "modality": study.modality,
        "bodyPart": study.body_part,
        "studyDescription": study.study_description,
        "indication": study.indication or "",
        "priority": study.priority,
        "orderingPhysician": study.ordering_physician or "",
        "technologist": study.technologist or "",
        "status": study.status,
        "readingStatus": (assignment.reading_status if assignment and hasattr(assignment, 'reading_status') else "unread"),
        "imageCount": (assignment.image_count if assignment and hasattr(assignment, 'image_count') else 0),
        "seriesCount": (assignment.series_count if assignment and hasattr(assignment, 'series_count') else 0),
        "studySize": (assignment.study_size if assignment and hasattr(assignment, 'study_size') else ""),
        "contrast": bool(study.contrast),
        "location": study.location or "",
        "room": study.room or "",
        "protocolName": (assignment.protocol_name if assignment and hasattr(assignment, 'protocol_name') else ""),
        "assignedRadiologist": (str(assignment.assigned_radiologist_id) if assignment and hasattr(assignment, 'assigned_radiologist_id') and assignment.assigned_radiologist_id else None),
        "priorStudies": 0,
        "criticalFlag": (assignment.critical_flag if assignment and hasattr(assignment, 'critical_flag') else False),
        "tags": (assignment.tags or [] if assignment and hasattr(assignment, 'tags') else []),
        "turnaroundTime": (assignment.turnaround_time if assignment and hasattr(assignment, 'turnaround_time') else ""),
        "estimatedReadTime": (assignment.estimated_read_time if assignment and hasattr(assignment, 'estimated_read_time') else ""),
        "preliminaryFindings": (assignment.preliminary_findings if assignment and hasattr(assignment, 'preliminary_findings') else None),
        "finalReport": None,
    }


@router.get("/summary", response_model=SuccessResponse[Dict[str, Any]])
async def dashboard_summary(
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Get comprehensive dashboard summary with real data."""
    
    today = date.today()
    week_ago = today - timedelta(days=7)
    
    # Get all studies from database
    db_studies: List[RadiologyStudyModel] = radiology_study.list(db, skip=0, limit=10000)
    
    # Get assignments
    study_id_to_assignment: Dict[str, WorklistAssignment] = {}
    try:
        assignments = db.query(WorklistAssignment).all()
        for a in assignments:
            study_id_to_assignment[str(a.study_id)] = a
    except Exception as e:
        # If query fails, continue without assignments
        print(f"Warning: Could not fetch worklist assignments: {e}")
        assignments = []
    
    # Convert to worklist format
    studies = [_to_worklist_schema(s, study_id_to_assignment.get(str(s.id))) for s in db_studies]
    
    # Helper function to extract date from study
    def get_study_date(study):
        study_date = study.get("studyDate")
        if not study_date:
            return None
        if isinstance(study_date, datetime):
            return study_date.date()
        if isinstance(study_date, date):
            return study_date
        return None
    
    # Filter today's studies
    today_studies = [
        s for s in studies 
        if get_study_date(s) == today
    ]
    
    # Filter weekly studies (last 7 days including today)
    weekly_studies = [
        s for s in studies
        if get_study_date(s) and get_study_date(s) >= week_ago
    ]
    
    # Calculate statistics for all studies
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
        if modality:
            by_modality[modality] = by_modality.get(modality, 0) + 1
        
        # Priority counts
        priority = study.get("priority", "Routine")
        if priority in by_priority:
            by_priority[priority] += 1
        
        # Critical flag
        if study.get("criticalFlag", False):
            critical_count += 1
    
    # Calculate today's statistics
    today_by_status = {"unread": 0, "reading": 0, "preliminary": 0, "final": 0}
    today_by_priority = {"STAT": 0, "Urgent": 0, "Routine": 0}
    for study in today_studies:
        status = study.get("readingStatus", "unread")
        if status in today_by_status:
            today_by_status[status] += 1
        priority = study.get("priority", "Routine")
        if priority in today_by_priority:
            today_by_priority[priority] += 1
    
    # Calculate weekly statistics from real data
    weekly_critical = sum(1 for s in weekly_studies if s.get("criticalFlag", False) or s.get("priority") == "STAT")
    weekly_total = len(weekly_studies)
    # Calculate daily average over the last 7 days
    days_in_period = max(1, (today - week_ago).days + 1)  # Include both start and end days
    daily_average = round(weekly_total / days_in_period, 1) if weekly_total > 0 else 0
    
    # Calculate weekly completion rate
    weekly_completed = sum(1 for s in weekly_studies if s.get("readingStatus") == "final")
    weekly_completion_rate = round((weekly_completed / weekly_total * 100) if weekly_total > 0 else 0, 1)
    
    # Calculate performance metrics
    total_studies = len(studies)
    completed_today = today_by_status["final"]
    total_today = len(today_studies)
    completion_rate = (completed_today / total_today * 100) if total_today > 0 else 0
    
    # Calculate average turnaround time (simplified - would need report timestamps)
    avg_tat_hours = 1.2  # Placeholder - would calculate from report creation times
    
    # Generate recent activity from recent studies
    recent_activity = []
    recent_studies = sorted(
        [s for s in studies if s.get("studyDate")],
        key=lambda x: x.get("studyDate") if isinstance(x.get("studyDate"), datetime) else datetime.combine(x.get("studyDate"), datetime.min.time()) if isinstance(x.get("studyDate"), date) else datetime.min,
        reverse=True
    )[:5]
    
    for idx, study in enumerate(recent_studies):
        study_date = study.get("studyDate")
        if isinstance(study_date, datetime):
            time_diff = datetime.now(timezone.utc) - study_date.replace(tzinfo=timezone.utc) if study_date.tzinfo else datetime.now() - study_date
        elif isinstance(study_date, date):
            time_diff = datetime.now() - datetime.combine(study_date, datetime.min.time())
        else:
            time_diff = timedelta(hours=idx + 1)
        
        hours_ago = int(time_diff.total_seconds() / 3600)
        time_str = f"{hours_ago} hour{'s' if hours_ago != 1 else ''} ago" if hours_ago > 0 else "Just now"
        
        status = study.get("readingStatus", "unread")
        if status == "final":
            icon = "check"
            color = "green"
            message = "Report finalized"
        elif status == "reading":
            icon = "eye"
            color = "blue"
            message = "Study in progress"
        elif study.get("criticalFlag") or study.get("priority") == "STAT":
            icon = "alert"
            color = "red"
            message = "Critical study"
        else:
            icon = "eye"
            color = "blue"
            message = "Study added"
        
        patient_name = study.get("patientName", "Unknown")
        study_desc = study.get("studyDescription", "")
        activity = {
            "id": str(study.get("id", idx)),
            "type": "study_update",
            "message": message,
            "patient": f"{patient_name} - {study_desc}" if study_desc else patient_name,
            "time": time_str,
            "icon": icon,
            "color": color
        }
        recent_activity.append(activity)
    
    summary = {
        # Basic counts (all studies)
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
        
        # Weekly overview (last 7 days) - calculated from real data
        "weeklyTotal": weekly_total,
        "dailyAverage": daily_average,
        "weeklyCritical": weekly_critical,
        "qualityScore": weekly_completion_rate,  # Weekly completion rate as quality indicator
        
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
    """Get recent radiology activity from studies."""
    # Get recent studies
    db_studies: List[RadiologyStudyModel] = radiology_study.list(db, skip=0, limit=100)
    
    # Get assignments
    study_id_to_assignment: Dict[str, WorklistAssignment] = {}
    try:
        assignments = db.query(WorklistAssignment).all()
        for a in assignments:
            study_id_to_assignment[str(a.study_id)] = a
    except Exception:
        pass
    
    # Convert to worklist format
    studies = [_to_worklist_schema(s, study_id_to_assignment.get(str(s.id))) for s in db_studies]
    
    # Sort by date (most recent first)
    recent_studies = sorted(
        [s for s in studies if s.get("studyDate")],
        key=lambda x: (
            x.get("studyDate") if isinstance(x.get("studyDate"), datetime)
            else datetime.combine(x.get("studyDate"), datetime.min.time()) if isinstance(x.get("studyDate"), date)
            else datetime.min
        ),
        reverse=True
    )[:10]
    
    activity = []
    now = datetime.now(timezone.utc)
    
    for idx, study in enumerate(recent_studies):
        study_date = study.get("studyDate")
        if isinstance(study_date, datetime):
            if study_date.tzinfo:
                time_diff = now - study_date
            else:
                time_diff = datetime.now() - study_date
        elif isinstance(study_date, date):
            time_diff = datetime.now() - datetime.combine(study_date, datetime.min.time())
        else:
            time_diff = timedelta(hours=idx + 1)
        
        hours_ago = int(time_diff.total_seconds() / 3600)
        if hours_ago < 1:
            time_str = "Just now"
        elif hours_ago == 1:
            time_str = "1 hour ago"
        else:
            time_str = f"{hours_ago} hours ago"
        
        status = study.get("readingStatus", "unread")
        if status == "final":
            icon = "check"
            color = "green"
            message = "Report finalized"
        elif status == "reading":
            icon = "eye"
            color = "blue"
            message = "Study in progress"
        elif study.get("criticalFlag") or study.get("priority") == "STAT":
            icon = "alert"
            color = "red"
            message = "Critical study"
        else:
            icon = "eye"
            color = "blue"
            message = "Study added"
        
        patient_name = study.get("patientName", "Unknown")
        study_desc = study.get("studyDescription", "")
        activity_item = {
            "id": str(study.get("id", idx)),
            "type": "study_update",
            "message": message,
            "patient": f"{patient_name} - {study_desc}" if study_desc else patient_name,
            "time": time_str,
            "timestamp": study_date if isinstance(study_date, datetime) else datetime.combine(study_date, datetime.min.time()) if isinstance(study_date, date) else now,
            "icon": icon,
            "color": color
        }
        activity.append(activity_item)
    
    return SuccessResponse(data=activity)





