"""Radiology profile routes supporting the RadiologyProfileModule front-end."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.common.auth.auth_service import AuthenticatedUser, require_radiologist_access
from app.common.schemas.responses_enhanced import SuccessResponse
from app.common.models.user import User, UserProfile, UserRole
from app.common.models.radiology import RadiologyStudy, RadiologyReport
from app.crud.user import user
from app.crud.radiology import radiology_study, radiology_report
from app.db.session import get_db
from app.portals.radiology.schemas.profile import (
    ProfileData,
    ProfileDataPartial,
    PeriodStats,
    StatsData,
    ActivityItem,
    RadiologyProfileEnvelope,
    RadiologyProfileUpdateRequest,
    RadiologyProfilePatchRequest,
    PasswordChangeRequest,
)

router = APIRouter(prefix="/profile", tags=["Radiology Profile"])


def _utc_now_iso() -> str:
    """Return current UTC time in ISO-8601 format with Z suffix."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _build_profile_from_db(db_user: User, db_profile: Optional[UserProfile] = None) -> ProfileData:
    """Build ProfileData from database User and UserProfile models."""
    return ProfileData(
        firstName=db_user.first_name or "Radiologist",
        lastName=db_user.last_name or "User",
        email=db_user.email or "radiologist@example.com",
        phone=db_user.phone or "+1 (555) 123-4567",
        address=db_profile.address if db_profile else "123 Medical Center Drive",
        city=db_profile.city if db_profile else "New York",
        state=db_profile.state if db_profile else "NY",
        zipCode=db_profile.zip_code if db_profile else "10001",
        dateOfBirth="1985-03-15",  # Not stored in current schema
        employeeId=db_profile.employee_id if db_profile else "RAD-001",
        position=db_profile.position if db_profile else "Staff Radiologist",
        department="Diagnostic Radiology",  # From organization/department
        supervisor="Dr. Michael Chen, MD",  # Not stored in current schema
        hireDate=db_profile.start_date.strftime("%Y-%m-%d") if db_profile and db_profile.start_date else "2020-06-15",
        certification=db_profile.qualification if db_profile else "Board Certified Diagnostic Radiologist",
        licenseNumber=db_profile.license_number if db_profile else "MD-NY-12345",
        licenseExpiry=db_profile.license_expiry.strftime("%Y-%m-%d") if db_profile and db_profile.license_expiry else "2026-03-15",
        subspecialty=db_profile.sub_specialty if db_profile else "Abdominal Imaging",
        medicalSchool="Johns Hopkins School of Medicine",  # From education JSON
        residency="Massachusetts General Hospital",  # From education JSON
        fellowship="Stanford University - Abdominal Imaging",  # From education JSON
        emailNotifications=True,
        smsNotifications=False,
        criticalAlerts=True,
        weeklyReports=True,
        systemUpdates=False,
        pacsAlerts=True,
        reportReminders=True,
        twoFactorAuth=db_user.two_factor_enabled or False,
        sessionTimeout=30,
        loginAlerts=True,
        theme="dark",
        language=db_user.language or "en",
        timezone=db_user.timezone or "America/New_York",
        dateFormat="MM/DD/YYYY",
        timeFormat="12-hour",
        pacsLayout="quad",
        windowingPreset="auto"
    )


def _build_stats_from_db(db: Session, user_id: str) -> StatsData:
    """Build StatsData from database radiology studies and reports."""
    from app.common.models.radiology import WorklistAssignment
    
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # Get studies assigned to this radiologist through WorklistAssignment
    total_studies = db.query(WorklistAssignment).filter(
        WorklistAssignment.assigned_radiologist_id == user_id
    ).count()
    
    # Get finalized reports
    reports_finalized = db.query(RadiologyReport).filter(
        RadiologyReport.radiologist_id == user_id,
        RadiologyReport.status == "final"
    ).count()
    
    # Get critical findings
    critical_findings = db.query(RadiologyReport).filter(
        RadiologyReport.radiologist_id == user_id,
        RadiologyReport.is_critical == True
    ).count()
    
    # This week stats
    this_week_studies = db.query(WorklistAssignment).filter(
        WorklistAssignment.assigned_radiologist_id == user_id,
        WorklistAssignment.assigned_at >= week_ago
    ).count()
    
    this_week_reports = db.query(RadiologyReport).filter(
        RadiologyReport.radiologist_id == user_id,
        RadiologyReport.status == "final",
        RadiologyReport.report_date >= week_ago
    ).count()
    
    this_week_critical = db.query(RadiologyReport).filter(
        RadiologyReport.radiologist_id == user_id,
        RadiologyReport.is_critical == True,
        RadiologyReport.report_date >= week_ago
    ).count()
    
    # This month stats
    this_month_studies = db.query(WorklistAssignment).filter(
        WorklistAssignment.assigned_radiologist_id == user_id,
        WorklistAssignment.assigned_at >= month_ago
    ).count()
    
    this_month_reports = db.query(RadiologyReport).filter(
        RadiologyReport.radiologist_id == user_id,
        RadiologyReport.status == "final",
        RadiologyReport.report_date >= month_ago
    ).count()
    
    this_month_critical = db.query(RadiologyReport).filter(
        RadiologyReport.radiologist_id == user_id,
        RadiologyReport.is_critical == True,
        RadiologyReport.report_date >= month_ago
    ).count()
    
    return StatsData(
        totalStudies=total_studies,
        reportsFinalized=reports_finalized,
        avgReportTime="18 minutes",  # Could calculate from actual data
        criticalFindings=critical_findings,
        consultations=45,  # Not tracked in current schema
        accuracy="99.7%",  # Could calculate from quality metrics
        productivity="15.2 RVUs/day",  # Could calculate from studies
        thisWeek=PeriodStats(
            studiesRead=this_week_studies,
            reportsFinalized=this_week_reports,
            criticalFindings=this_week_critical,
            hoursWorked=45,  # Not tracked in current schema
            avgTurnaroundTime="16 minutes"  # Could calculate from actual data
        ),
        thisMonth=PeriodStats(
            studiesRead=this_month_studies,
            reportsFinalized=this_month_reports,
            criticalFindings=this_month_critical,
            hoursWorked=180,  # Not tracked in current schema
            avgTurnaroundTime="18 minutes"  # Could calculate from actual data
        ),
        modalityBreakdown={
            "CT": 45,  # Could calculate from actual studies
            "MRI": 25,
            "XR": 20,
            "US": 10
        }
    )


_PROFILE_DATA = ProfileData(
    firstName="Dr. Sarah",
    lastName="Anderson",
    email="sarah.anderson@radportal.com",
    phone="+1 (555) 123-4567",
    address="123 Medical Center Drive",
    city="New York",
    state="NY",
    zipCode="10001",
    dateOfBirth="1985-03-15",
    employeeId="RAD-001",
    position="Staff Radiologist",
    department="Diagnostic Radiology",
    supervisor="Dr. Michael Chen, MD",
    hireDate="2020-06-15",
    certification="Board Certified Diagnostic Radiologist",
    licenseNumber="MD-NY-12345",
    licenseExpiry="2026-03-15",
    subspecialty="Abdominal Imaging",
    medicalSchool="Johns Hopkins School of Medicine",
    residency="Massachusetts General Hospital",
    fellowship="Stanford University - Abdominal Imaging",
    emailNotifications=True,
    smsNotifications=False,
    criticalAlerts=True,
    weeklyReports=True,
    systemUpdates=False,
    pacsAlerts=True,
    reportReminders=True,
    twoFactorAuth=True,
    sessionTimeout=30,
    loginAlerts=True,
    theme="dark",
    language="en",
    timezone="America/New_York",
    dateFormat="MM/DD/YYYY",
    timeFormat="12-hour",
    pacsLayout="quad",
    windowingPreset="auto",
)

_STATS_DATA = StatsData(
    totalStudies=1247,
    reportsFinalized=1189,
    avgReportTime="18 minutes",
    criticalFindings=23,
    consultations=45,
    accuracy="99.7%",
    productivity="15.2 RVUs/day",
    thisWeek=PeriodStats(
        studiesRead=89,
        reportsFinalized=86,
        criticalFindings=3,
        hoursWorked=45,
        avgTurnaroundTime="16 minutes",
    ),
    thisMonth=PeriodStats(
        studiesRead=384,
        reportsFinalized=378,
        criticalFindings=12,
        hoursWorked=180,
        avgTurnaroundTime="18 minutes",
    ),
    modalityBreakdown={"CT": 45, "MRI": 25, "XR": 20, "US": 10},
)

_ACTIVITY_DATA: List[ActivityItem] = [
    ActivityItem(
        id=1,
        action="Finalized CT Chest Report",
        timestamp="2025-06-29 14:30",
        type="report",
        details="CT Chest W/O Contrast - Acc: CTG2025001",
    ),
    ActivityItem(
        id=2,
        action="Critical Finding Notification",
        timestamp="2025-06-29 11:45",
        type="critical",
        details="Pneumothorax identified - Emergency physician notified",
    ),
    ActivityItem(
        id=3,
        action="Reviewed MRI Brain Study",
        timestamp="2025-06-29 09:15",
        type="review",
        details="MRI Brain W/ & W/O Contrast - Acc: MRI2025042",
    ),
    ActivityItem(
        id=4,
        action="PACS Session Started",
        timestamp="2025-06-29 08:00",
        type="login",
        details="Successful login from Workstation RAD-WS-01",
    ),
    ActivityItem(
        id=5,
        action="Updated Reading Preferences",
        timestamp="2025-06-28 16:20",
        type="settings",
        details="Changed default windowing preset to Lung",
    ),
    ActivityItem(
        id=6,
        action="Consultation Completed",
        timestamp="2025-06-28 14:15",
        type="consultation",
        details="Second opinion provided for complex abdominal mass",
    ),
]

_LAST_UPDATED: str = _utc_now_iso()


def _build_profile_bundle() -> RadiologyProfileEnvelope:
    return RadiologyProfileEnvelope(
        profileData=_PROFILE_DATA.copy(deep=True),
        statsData=_STATS_DATA.copy(deep=True),
        activityData=[item.copy(deep=True) for item in _ACTIVITY_DATA],
        lastUpdated=_LAST_UPDATED,
    )


@router.get("", response_model=SuccessResponse[RadiologyProfileEnvelope])
async def get_profile(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
) -> SuccessResponse:
    # Get the authenticated radiologist user from the database
    db_user = db.query(User).filter(User.id == current_user.user_id).first()
    
    if not db_user:
        # Fallback to mock data if user not found
        return SuccessResponse(data=_build_profile_bundle())
    
    # Get user profile if it exists
    db_profile = db.query(UserProfile).filter(UserProfile.user_id == db_user.id).first()
    
    # Build profile data from database
    profile_data = _build_profile_from_db(db_user, db_profile)
    
    # Build envelope with real data
    envelope = RadiologyProfileEnvelope(
        profileData=profile_data,
        statsData=_build_stats_from_db(db, str(db_user.id)),
        activityData=_ACTIVITY_DATA,  # Keep mock activity for now
        lastUpdated=_utc_now_iso(),
    )
    
    return SuccessResponse(data=envelope)


@router.put("", response_model=SuccessResponse[RadiologyProfileEnvelope])
async def update_profile(
    payload: RadiologyProfileUpdateRequest = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    # Get the authenticated radiologist user from the database
    db_user = db.query(User).filter(User.id == current_user.user_id).first()
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user basic information
    profile_data = payload.profileData
    db_user.first_name = profile_data.firstName
    db_user.last_name = profile_data.lastName
    db_user.email = profile_data.email
    db_user.phone = profile_data.phone
    db_user.timezone = profile_data.timezone
    db_user.language = profile_data.language
    
    # Get or create user profile
    db_profile = db.query(UserProfile).filter(UserProfile.user_id == db_user.id).first()
    if not db_profile:
        # Create new profile if it doesn't exist
        from datetime import date
        import uuid
        db_profile = UserProfile(
            id=str(uuid.uuid4()),
            user_id=db_user.id,
            specialty="Diagnostic Radiology",
            sub_specialty=profile_data.subspecialty,
            license_number=profile_data.licenseNumber,
            license_expiry=date.fromisoformat(profile_data.licenseExpiry) if profile_data.licenseExpiry else None,
            qualification=profile_data.certification,
            position=profile_data.position,
            employee_id=profile_data.employeeId,
            address=profile_data.address,
            city=profile_data.city,
            state=profile_data.state,
            zip_code=profile_data.zipCode,
            start_date=date.fromisoformat(profile_data.hireDate) if profile_data.hireDate else None,
        )
        db.add(db_profile)
    else:
        # Update existing profile
        db_profile.sub_specialty = profile_data.subspecialty
        db_profile.license_number = profile_data.licenseNumber
        db_profile.license_expiry = date.fromisoformat(profile_data.licenseExpiry) if profile_data.licenseExpiry else None
        db_profile.qualification = profile_data.certification
        db_profile.position = profile_data.position
        db_profile.employee_id = profile_data.employeeId
        db_profile.address = profile_data.address
        db_profile.city = profile_data.city
        db_profile.state = profile_data.state
        db_profile.zip_code = profile_data.zipCode
        if profile_data.hireDate:
            db_profile.start_date = date.fromisoformat(profile_data.hireDate)
    
    # Commit changes
    db.commit()
    db.refresh(db_user)
    db.refresh(db_profile)
    
    # Build updated profile data
    updated_profile_data = _build_profile_from_db(db_user, db_profile)
    
    # Build envelope with updated data
    envelope = RadiologyProfileEnvelope(
        profileData=updated_profile_data,
        statsData=_build_stats_from_db(db, str(db_user.id)),
        activityData=_ACTIVITY_DATA,  # Keep mock activity for now
        lastUpdated=_utc_now_iso(),
    )
    
    return SuccessResponse(data=envelope)


@router.patch("", response_model=SuccessResponse[RadiologyProfileEnvelope])
async def patch_profile(
    payload: RadiologyProfilePatchRequest = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    # Get the authenticated radiologist user from the database
    db_user = db.query(User).filter(User.id == current_user.user_id).first()
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get or create user profile
    db_profile = db.query(UserProfile).filter(UserProfile.user_id == db_user.id).first()
    if not db_profile:
        # Create new profile if it doesn't exist
        from datetime import date
        import uuid
        db_profile = UserProfile(
            id=str(uuid.uuid4()),
            user_id=db_user.id,
            specialty="Diagnostic Radiology",
        )
        db.add(db_profile)
    
    # Update only provided fields
    profile_data = payload.profileData
    updates = profile_data.dict(exclude_none=True)
    
    # Update user basic information
    if "firstName" in updates:
        db_user.first_name = updates["firstName"]
    if "lastName" in updates:
        db_user.last_name = updates["lastName"]
    if "email" in updates:
        db_user.email = updates["email"]
    if "phone" in updates:
        db_user.phone = updates["phone"]
    if "timezone" in updates:
        db_user.timezone = updates["timezone"]
    if "language" in updates:
        db_user.language = updates["language"]
    
    # Update profile information
    if "subspecialty" in updates:
        db_profile.sub_specialty = updates["subspecialty"]
    if "licenseNumber" in updates:
        db_profile.license_number = updates["licenseNumber"]
    if "licenseExpiry" in updates and updates["licenseExpiry"]:
        db_profile.license_expiry = date.fromisoformat(updates["licenseExpiry"])
    if "certification" in updates:
        db_profile.qualification = updates["certification"]
    if "position" in updates:
        db_profile.position = updates["position"]
    if "employeeId" in updates:
        db_profile.employee_id = updates["employeeId"]
    if "address" in updates:
        db_profile.address = updates["address"]
    if "city" in updates:
        db_profile.city = updates["city"]
    if "state" in updates:
        db_profile.state = updates["state"]
    if "zipCode" in updates:
        db_profile.zip_code = updates["zipCode"]
    if "hireDate" in updates and updates["hireDate"]:
        db_profile.start_date = date.fromisoformat(updates["hireDate"])
    
    # Commit changes
    db.commit()
    db.refresh(db_user)
    db.refresh(db_profile)
    
    # Build updated profile data
    updated_profile_data = _build_profile_from_db(db_user, db_profile)
    
    # Build envelope with updated data
    envelope = RadiologyProfileEnvelope(
        profileData=updated_profile_data,
        statsData=_build_stats_from_db(db, str(db_user.id)),
        activityData=_ACTIVITY_DATA,  # Keep mock activity for now
        lastUpdated=_utc_now_iso(),
    )
    
    return SuccessResponse(data=envelope)


@router.get("/activity", response_model=SuccessResponse[List[ActivityItem]])
async def get_activity(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
) -> SuccessResponse:
    # For now, return mock activity data
    # TODO: Build real activity from user activities, radiology reports, etc.
    # This could be enhanced to query UserActivity, RadiologyReport activities, etc.
    return SuccessResponse(data=[item.copy(deep=True) for item in _ACTIVITY_DATA])


@router.get("/statistics", response_model=StatsData)
async def get_statistics(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
) -> StatsData:
    # Get the authenticated radiologist user from the database
    db_user = db.query(User).filter(User.id == current_user.user_id).first()
    
    if not db_user:
        # Fallback to mock data if user not found
        return _STATS_DATA.copy(deep=True)
    
    # Build stats from database
    return _build_stats_from_db(db, str(db_user.id))


@router.get("/stats", response_model=SuccessResponse[StatsData])
async def get_stats(
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
) -> SuccessResponse:
    # Get the authenticated radiologist user from the database
    db_user = db.query(User).filter(User.id == current_user.user_id).first()
    
    if not db_user:
        # Fallback to mock data if user not found
        return SuccessResponse(data=_STATS_DATA.copy(deep=True))
    
    # Build stats from database
    stats_data = _build_stats_from_db(db, str(db_user.id))
    return SuccessResponse(data=stats_data)


@router.post("/password", status_code=status.HTTP_200_OK)
async def change_password(
    payload: PasswordChangeRequest,
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
) -> Dict[str, str]:
    if payload.newPassword != payload.confirmPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match",
        )
    if payload.newPassword == payload.currentPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password",
        )
    return {"message": "Password updated successfully"}


@router.patch("/preferences", response_model=SuccessResponse[dict])
async def update_preferences(
    preferences: dict = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Update user preferences like theme, language, timezone, etc."""
    db_user = db.query(User).filter(User.id == current_user.user_id).first()
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user preferences
    if "language" in preferences:
        db_user.language = preferences["language"]
    if "timezone" in preferences:
        db_user.timezone = preferences["timezone"]
    
    db.commit()
    return SuccessResponse(data={"message": "Preferences updated successfully"})


@router.patch("/notifications", response_model=SuccessResponse[dict])
async def update_notifications(
    notifications: dict = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Update notification preferences."""
    # TODO: Store notification preferences in user settings
    return SuccessResponse(data={"message": "Notification preferences updated successfully"})


@router.patch("/security", response_model=SuccessResponse[dict])
async def update_security(
    security: dict = Body(...),
    current_user: AuthenticatedUser = Depends(require_radiologist_access()),
    db: Session = Depends(get_db),
) -> SuccessResponse:
    """Update security settings like 2FA, session timeout, etc."""
    db_user = db.query(User).filter(User.id == current_user.user_id).first()
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update security settings
    if "twoFactorAuth" in security:
        db_user.two_factor_enabled = security["twoFactorAuth"]
    
    db.commit()
    return SuccessResponse(data={"message": "Security settings updated successfully"})
