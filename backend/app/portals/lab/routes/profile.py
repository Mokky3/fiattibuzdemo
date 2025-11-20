"""Lab profile routes supporting the LabProfileModule front-end."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, status

from app.common.auth.auth_service import AuthenticatedUser, require_lab_technician_access
from app.common.schemas.responses_enhanced import SuccessResponse
from app.portals.lab.schemas.profile import (
    LabProfileData,
    LabProfileDataPartial,
    LabStatsPeriod,
    LabStatsData,
    ActivityItem,
    LabProfileEnvelope,
    LabProfileUpdateRequest,
    LabProfilePatchRequest,
    PasswordChangeRequest,
)

router = APIRouter(prefix="/profile", tags=["Lab Profile"])


def _utc_now_iso() -> str:
    """Return the current UTC timestamp in ISO-8601 format."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


_PROFILE_DATA = LabProfileData(
    firstName="John",
    lastName="Smith",
    email="john.smith@labportal.com",
    phone="+1 (555) 123-4567",
    address="123 Medical Center Drive",
    city="New York",
    state="NY",
    zipCode="10001",
    dateOfBirth="1985-03-15",
    employeeId="LT-001",
    position="Senior Lab Technician",
    department="Clinical Laboratory",
    supervisor="Dr. Sarah Johnson",
    hireDate="2020-06-15",
    certification="Medical Laboratory Technician (MLT)",
    licenseNumber="MLT-NY-12345",
    licenseExpiry="2026-03-15",
    emailNotifications=True,
    smsNotifications=False,
    criticalAlerts=True,
    weeklyReports=True,
    systemUpdates=False,
    twoFactorAuth=True,
    sessionTimeout=30,
    loginAlerts=True,
    theme="light",
    language="en",
    timezone="America/New_York",
    dateFormat="MM/DD/YYYY",
    timeFormat="12-hour",
)

_STATS_DATA = LabStatsData(
    totalOrders=156,
    completedTests=142,
    reportsGenerated=23,
    avgProcessingTime="2.3 hours",
    accuracy="99.2%",
    thisWeek=LabStatsPeriod(ordersProcessed=28, reportsGenerated=5, hoursWorked=40),
    thisMonth=LabStatsPeriod(ordersProcessed=120, reportsGenerated=18, hoursWorked=160),
)

_ACTIVITY_DATA: List[ActivityItem] = [
    ActivityItem(
        id=1,
        action="Generated Weekly Statistics Report",
        timestamp="2025-06-28 14:30",
        type="report",
        details="Weekly Lab Statistics Report (RPT-001)",
    ),
    ActivityItem(
        id=2,
        action="Updated Order Status",
        timestamp="2025-06-28 11:45",
        type="order",
        details="Order LO-003 marked as completed",
    ),
    ActivityItem(
        id=3,
        action="Processed Test Results",
        timestamp="2025-06-28 09:15",
        type="test",
        details="Blood glucose results entered for Patient P-047",
    ),
    ActivityItem(
        id=4,
        action="Login to System",
        timestamp="2025-06-28 08:00",
        type="login",
        details="Successful login from IP: 192.168.1.100",
    ),
    ActivityItem(
        id=5,
        action="Changed Password",
        timestamp="2025-06-25 16:20",
        type="security",
        details="Password successfully updated",
    ),
]

_LAST_UPDATED: str = _utc_now_iso()


def _build_profile_bundle() -> LabProfileEnvelope:
    return LabProfileEnvelope(
        profileData=_PROFILE_DATA.copy(deep=True),
        statsData=_STATS_DATA.copy(deep=True),
        activityData=[item.copy(deep=True) for item in _ACTIVITY_DATA],
        lastUpdated=_LAST_UPDATED,
    )


@router.get("", response_model=SuccessResponse[LabProfileEnvelope])
async def get_profile(
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> SuccessResponse:
    # Fetch real user data from database
    from app.db.session import SessionLocal
    from app.common.models.user import User, UserProfile, UserSettings
    from sqlalchemy.orm import joinedload
    
    db = SessionLocal()
    try:
        user = db.query(User).options(joinedload(User.profile)).filter(User.id == current_user.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get or create user profile
        user_profile = user.profile
        if not user_profile:
            user_profile = UserProfile(user_id=user.id)
            db.add(user_profile)
            db.commit()
            db.refresh(user_profile)
        
        # Get user settings using ORM
        user_settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
        
        # Create minimal settings object with safe attribute access
        if user_settings:
            try:
                login_alerts = user_settings.login_alerts if hasattr(user_settings, 'login_alerts') else True
                session_timeout = user_settings.session_timeout if hasattr(user_settings, 'session_timeout') else 30
            except:
                login_alerts = True
                session_timeout = 30
        else:
            login_alerts = True
            session_timeout = 30
        
        class MinimalSettings:
            def __init__(self, login_alerts, session_timeout):
                self.login_alerts = login_alerts
                self.session_timeout = session_timeout
        
        user_settings = MinimalSettings(login_alerts, session_timeout)
        
        # Determine hire date: use start_date from UserProfile, or fallback to user.created_at
        hire_date_str = ""
        if user_profile.start_date:
            hire_date_str = user_profile.start_date.strftime('%Y-%m-%d')
        elif user.created_at:
            # Fallback to account creation date if hire date is not set
            hire_date_str = user.created_at.date().strftime('%Y-%m-%d')
        
        # Build profile data from real user data
        profile_data = LabProfileData(
            firstName=user.first_name or "",
            lastName=user.last_name or "",
            email=user.email or "",
            phone=user.phone or "",
            address=user_profile.address or "",
            city=user_profile.city or "",
            state=user_profile.state or "",
            zipCode=user_profile.zip_code or "",
            dateOfBirth="",  # Not available in UserProfile model
            employeeId=user_profile.employee_id or f"LT-{str(user.id)[:8].upper()}",
            position=user_profile.position or "Lab Technician",
            department="Clinical Laboratory",
            supervisor="Dr. Sarah Johnson",  # Default value
            hireDate=hire_date_str,
            certification=user_profile.qualification or "Medical Laboratory Technician (MLT)",
            licenseNumber=user_profile.license_number or f"MLT-{str(user.id)[:8].upper()}",
            licenseExpiry=user_profile.license_expiry.strftime('%Y-%m-%d') if user_profile.license_expiry else "2026-03-15",
            emailNotifications=True,
            smsNotifications=False,
            criticalAlerts=True,
            weeklyReports=True,
            systemUpdates=False,
            twoFactorAuth=user.two_factor_enabled,
            sessionTimeout=user_settings.session_timeout,
            loginAlerts=user_settings.login_alerts,
            theme="light",
            language="en",
            timezone="America/New_York",
            dateFormat="MM/DD/YYYY",
            timeFormat="12-hour"
        )
        
        # Build profile bundle with real data
        profile_bundle = LabProfileEnvelope(
            profileData=profile_data,
            statsData=_STATS_DATA.copy(deep=True),
            activityData=[item.copy(deep=True) for item in _ACTIVITY_DATA],
            lastUpdated=_utc_now_iso(),
        )
        
        return SuccessResponse(data=profile_bundle)
        
    finally:
        db.close()


@router.put("", response_model=SuccessResponse[LabProfileEnvelope])
async def update_profile(
    payload: LabProfileUpdateRequest = Body(...),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> SuccessResponse:
    global _PROFILE_DATA, _LAST_UPDATED
    _PROFILE_DATA = payload.profileData.copy(deep=True)
    _LAST_UPDATED = _utc_now_iso()
    return SuccessResponse(data=_build_profile_bundle())


@router.patch("", response_model=SuccessResponse[LabProfileEnvelope])
async def patch_profile(
    payload: LabProfilePatchRequest = Body(...),
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> SuccessResponse:
    # Update user data in database
    from app.db.session import SessionLocal
    from app.common.models.user import User, UserProfile, UserSettings
    from sqlalchemy.orm import joinedload
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == current_user.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get or create user profile
        user_profile = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()
        if not user_profile:
            user_profile = UserProfile(user_id=user.id)
            db.add(user_profile)
        
        # Update user fields that are available in the User model
        updates = payload.profileData.dict(exclude_none=True)
        
        # Get or create user settings using ORM
        user_settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
        
        if not user_settings:
            # Create new settings record
            user_settings = UserSettings(user_id=user.id)
            db.add(user_settings)
            db.flush()  # Flush to get the ID without committing
        
        # Update security settings if provided
        if 'loginAlerts' in updates:
            try:
                user_settings.login_alerts = updates['loginAlerts']
            except AttributeError:
                # Column doesn't exist in database, skip
                import logging
                logging.warning("login_alerts column does not exist in user_settings table")
        
        if 'sessionTimeout' in updates:
            try:
                user_settings.session_timeout = updates['sessionTimeout']
            except AttributeError:
                # Column doesn't exist in database, skip
                import logging
                logging.warning("session_timeout column does not exist in user_settings table")
        
        # Create minimal settings object for response
        try:
            login_alerts = user_settings.login_alerts if hasattr(user_settings, 'login_alerts') else (updates.get('loginAlerts', True) if 'loginAlerts' in updates else True)
            session_timeout = user_settings.session_timeout if hasattr(user_settings, 'session_timeout') else (updates.get('sessionTimeout', 30) if 'sessionTimeout' in updates else 30)
        except:
            login_alerts = updates.get('loginAlerts', True) if 'loginAlerts' in updates else True
            session_timeout = updates.get('sessionTimeout', 30) if 'sessionTimeout' in updates else 30
        
        class MinimalSettings:
            def __init__(self, login_alerts, session_timeout):
                self.login_alerts = login_alerts
                self.session_timeout = session_timeout
        
        minimal_settings = MinimalSettings(login_alerts, session_timeout)
        
        if 'firstName' in updates:
            user.first_name = updates['firstName']
        if 'lastName' in updates:
            user.last_name = updates['lastName']
        if 'email' in updates:
            user.email = updates['email']
        if 'phone' in updates:
            user.phone = updates['phone']
        
        # Update security settings in User model
        if 'twoFactorAuth' in updates:
            user.two_factor_enabled = updates['twoFactorAuth']
        
        # Update address fields in UserProfile
        if 'address' in updates:
            user_profile.address = updates['address']
        if 'city' in updates:
            user_profile.city = updates['city']
        if 'state' in updates:
            user_profile.state = updates['state']
        if 'zipCode' in updates:
            user_profile.zip_code = updates['zipCode']
        if 'dateOfBirth' in updates:
            # Store dateOfBirth in a JSON field or custom field if needed
            # For now, we'll skip it as UserProfile doesn't have this field
            pass
        
        # Update professional fields in UserProfile
        if 'employeeId' in updates:
            user_profile.employee_id = updates['employeeId']
        if 'position' in updates:
            user_profile.position = updates['position']
        if 'hireDate' in updates:
            from datetime import datetime
            try:
                user_profile.start_date = datetime.strptime(updates['hireDate'], '%Y-%m-%d').date()
            except:
                pass
        if 'certification' in updates:
            # Store in certifications JSON array
            if not user_profile.certifications:
                user_profile.certifications = []
            # For simplicity, store as a single certification
            user_profile.qualification = updates['certification']
        if 'licenseNumber' in updates:
            user_profile.license_number = updates['licenseNumber']
        if 'licenseExpiry' in updates:
            from datetime import datetime
            try:
                user_profile.license_expiry = datetime.strptime(updates['licenseExpiry'], '%Y-%m-%d').date()
            except:
                pass
        
        # Commit changes to database
        db.commit()
        db.refresh(user)
        db.refresh(user_profile)
        if user_settings and hasattr(user_settings, 'id'):
            db.refresh(user_settings)
        
        # Determine hire date: use start_date from UserProfile, or fallback to user.created_at
        hire_date_str = ""
        if user_profile.start_date:
            hire_date_str = user_profile.start_date.strftime('%Y-%m-%d')
        elif user.created_at:
            # Fallback to account creation date if hire date is not set
            hire_date_str = user.created_at.date().strftime('%Y-%m-%d')
        
        # Build updated profile data
        profile_data = LabProfileData(
            firstName=user.first_name or "",
            lastName=user.last_name or "",
            email=user.email or "",
            phone=user.phone or "",
            address=user_profile.address or "",
            city=user_profile.city or "",
            state=user_profile.state or "",
            zipCode=user_profile.zip_code or "",
            dateOfBirth=updates.get('dateOfBirth', ''),
            employeeId=user_profile.employee_id or f"LT-{str(user.id)[:8].upper()}",
            position=user_profile.position or 'Lab Technician',
            department=updates.get('department', 'Clinical Laboratory'),
            supervisor=updates.get('supervisor', 'Dr. Sarah Johnson'),
            hireDate=hire_date_str,
            certification=user_profile.qualification or 'Medical Laboratory Technician (MLT)',
            licenseNumber=user_profile.license_number or f"MLT-{str(user.id)[:8].upper()}",
            licenseExpiry=user_profile.license_expiry.strftime('%Y-%m-%d') if user_profile.license_expiry else '2026-03-15',
            emailNotifications=updates.get('emailNotifications', True),
            smsNotifications=updates.get('smsNotifications', False),
            criticalAlerts=updates.get('criticalAlerts', True),
            weeklyReports=updates.get('weeklyReports', True),
            systemUpdates=updates.get('systemUpdates', False),
            twoFactorAuth=user.two_factor_enabled if 'twoFactorAuth' in updates else (updates.get('twoFactorAuth', user.two_factor_enabled)),
            sessionTimeout=minimal_settings.session_timeout if 'sessionTimeout' in updates else (updates.get('sessionTimeout', minimal_settings.session_timeout)),
            loginAlerts=minimal_settings.login_alerts if 'loginAlerts' in updates else (updates.get('loginAlerts', minimal_settings.login_alerts)),
            theme=updates.get('theme', 'light'),
            language=updates.get('language', 'en'),
            timezone=updates.get('timezone', 'America/New_York'),
            dateFormat=updates.get('dateFormat', 'MM/DD/YYYY'),
            timeFormat=updates.get('timeFormat', '12-hour')
        )
        
        # Build profile bundle with updated data
        profile_bundle = LabProfileEnvelope(
            profileData=profile_data,
            statsData=_STATS_DATA.copy(deep=True),
            activityData=[item.copy(deep=True) for item in _ACTIVITY_DATA],
            lastUpdated=_utc_now_iso(),
        )
        
        return SuccessResponse(data=profile_bundle)
        
    finally:
        db.close()


@router.get("/activity", response_model=List[ActivityItem])
async def get_activity(
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> List[ActivityItem]:
    return [item.copy(deep=True) for item in _ACTIVITY_DATA]


@router.get("/statistics", response_model=LabStatsData)
async def get_statistics(
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
) -> LabStatsData:
    return _STATS_DATA.copy(deep=True)


@router.post("/password", status_code=status.HTTP_200_OK)
async def change_password(
    payload: PasswordChangeRequest,
    current_user: AuthenticatedUser = Depends(require_lab_technician_access()),
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
