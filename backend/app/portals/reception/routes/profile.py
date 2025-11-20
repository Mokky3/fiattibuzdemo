"""
Reception Profile Management
Simple, clean implementation without complex RBAC dependencies
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.common.auth.auth_service import get_current_user, AuthenticatedUser
from app.common.models.user import User, UserRole, UserProfile
from app.common.models.practitioner import Practitioner
from datetime import datetime

router = APIRouter(tags=["Reception Profile"])

# ──────────────────────────────────────────────────────────────────────────────
# Pydantic Models
# ──────────────────────────────────────────────────────────────────────────────

class ProfileDTO(BaseModel):
    """Profile data transfer object."""
    id: str
    email: str
    firstName: str
    lastName: str
    middleName: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zipCode: Optional[str] = None
    birthDate: Optional[str] = None
    employeeId: Optional[str] = None
    department: Optional[str] = None
    role: str
    status: str
    profileImageUrl: Optional[str] = None
    startDate: Optional[str] = None
    lastLogin: Optional[str] = None
    emergencyContact: Optional[str] = None
    emergencyPhone: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    notifications: Optional[dict] = None
    systemPrefs: Optional[dict] = None

class ProfileUpdateDTO(BaseModel):
    """Profile update data transfer object."""
    firstName: str
    lastName: str
    middleName: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zipCode: Optional[str] = None
    birthDate: Optional[str] = None
    employeeId: Optional[str] = None
    department: Optional[str] = None
    startDate: Optional[str] = None
    emergencyContact: Optional[str] = None
    emergencyPhone: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    # Optional notification preferences (for future use)
    notifications: Optional[dict] = None
    systemPrefs: Optional[dict] = None

class PasswordChangeDTO(BaseModel):
    """Password change data transfer object."""
    currentPassword: str
    newPassword: str
    confirmPassword: str

# ──────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ──────────────────────────────────────────────────────────────────────────────

def check_receptionist_access(current_user: AuthenticatedUser) -> None:
    """Check if user has receptionist access."""
    if current_user.role != UserRole.RECEPTIONIST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Receptionist access required"
        )

def format_profile_data(user: User, practitioner: Optional[Practitioner] = None, user_profile: Optional[UserProfile] = None) -> ProfileDTO:
    """Format user data into ProfileDTO."""
    # Extract notifications and system preferences from user custom_permissions
    notifications = None
    systemPrefs = None
    try:
        if hasattr(user, 'custom_permissions') and user.custom_permissions:
            notifications = user.custom_permissions.get('notifications')
            systemPrefs = user.custom_permissions.get('systemPrefs')
    except Exception as e:
        print(f"⚠️ [PROFILE] Error accessing custom_permissions: {e}")
        notifications = None
        systemPrefs = None
    
    # Get profile data if available
    profile = user_profile or (user.profile if hasattr(user, 'profile') else None)
    
    # Get department from custom_permissions if available
    department = None
    if user.custom_permissions and isinstance(user.custom_permissions, dict):
        department = user.custom_permissions.get('department')
    
    return ProfileDTO(
        id=str(user.id),
        email=user.email,
        firstName=user.first_name or "",
        lastName=user.last_name or "",
        middleName=user.middle_name,
        phone=user.phone,
        address=profile.address if profile else None,
        city=profile.city if profile else None,
        state=profile.state if profile else None,
        zipCode=profile.zip_code if profile else None,
        birthDate=None,  # Not stored in UserProfile, would need to add if needed
        employeeId=profile.employee_id if profile else None,
        department=department,
        role=user.role.value if user.role else "unknown",
        status=user.status.value if user.status else "unknown",
        profileImageUrl=user.profile_image_url,
        startDate=profile.start_date.strftime("%Y-%m-%d") if profile and profile.start_date else (user.created_at.strftime("%Y-%m-%d") if user.created_at else None),
        lastLogin=user.last_login.strftime("%Y-%m-%d %H:%M") if user.last_login else None,
        emergencyContact=profile.emergency_contact_name if profile else None,
        emergencyPhone=profile.emergency_contact_phone if profile else None,
        timezone=user.timezone,
        language=user.language,
        notifications=notifications,
        systemPrefs=systemPrefs
    )

# ──────────────────────────────────────────────────────────────────────────────
# API Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=ProfileDTO)
async def get_profile(
    clinic_id: str = Query(..., description="Clinic ID"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get reception profile information."""
    print(f"🔍 [PROFILE] Endpoint reached! User: {current_user.email}, Role: {current_user.role}")
    
    # Check receptionist access
    check_receptionist_access(current_user)
    
    # Get user from database
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get practitioner if exists
    practitioner = None
    if user.fhir_practitioner_id:
        practitioner = db.query(Practitioner).filter(
            Practitioner.id == user.fhir_practitioner_id
        ).first()
    
    # Get or create user profile
    user_profile = user.profile
    if not user_profile:
        user_profile = UserProfile(user_id=user.id)
        db.add(user_profile)
        db.commit()
        db.refresh(user_profile)
    
    print(f"✅ [PROFILE] Returning profile for {user.email}")
    return format_profile_data(user, practitioner, user_profile)

@router.put("", response_model=ProfileDTO, status_code=status.HTTP_200_OK)
async def update_profile(
    payload: ProfileUpdateDTO,
    clinic_id: str = Query(..., description="Clinic ID"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update reception profile information."""
    print(f"🔍 [PROFILE] Update endpoint reached! User: {current_user.email}")
    
    # Check receptionist access
    check_receptionist_access(current_user)
    
    # Get user from database
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get or create user profile
    user_profile = user.profile
    if not user_profile:
        user_profile = UserProfile(user_id=user.id)
        db.add(user_profile)
    
    # Update user fields
    user.first_name = payload.firstName
    user.last_name = payload.lastName
    user.middle_name = payload.middleName
    user.phone = payload.phone
    if payload.timezone:
        user.timezone = payload.timezone
    if payload.language:
        user.language = payload.language
    
    # Update user profile fields
    if payload.address is not None:
        user_profile.address = payload.address
    if payload.city is not None:
        user_profile.city = payload.city
    if payload.state is not None:
        user_profile.state = payload.state
    if payload.zipCode is not None:
        user_profile.zip_code = payload.zipCode
    if payload.employeeId is not None:
        user_profile.employee_id = payload.employeeId
    if payload.startDate is not None:
        try:
            user_profile.start_date = datetime.strptime(payload.startDate, "%Y-%m-%d").date()
        except ValueError:
            print(f"⚠️ [PROFILE] Invalid startDate format: {payload.startDate}")
    if payload.emergencyContact is not None:
        user_profile.emergency_contact_name = payload.emergencyContact
    if payload.emergencyPhone is not None:
        user_profile.emergency_contact_phone = payload.emergencyPhone
    
    # Update department if provided (store in custom_permissions for now)
    if payload.department is not None:
        if user.custom_permissions is None:
            user.custom_permissions = {}
        user.custom_permissions['department'] = payload.department
    
    # Update user custom_permissions with notifications and system preferences
    try:
        if user.custom_permissions is None:
            user.custom_permissions = {}
        
        # Use MutableDict methods to ensure SQLAlchemy detects changes
        if payload.notifications:
            user.custom_permissions.setdefault('notifications', {}).update(payload.notifications)
        if payload.systemPrefs:
            user.custom_permissions.setdefault('systemPrefs', {}).update(payload.systemPrefs)
    except Exception as e:
        print(f"⚠️ [PROFILE] Error updating user custom_permissions: {e}")
        # Continue without metadata update if there's an error
    
    try:
        db.commit()
        db.refresh(user)
        db.refresh(user_profile)
        print(f"✅ [PROFILE] Updated profile for {user.email}")
        return format_profile_data(user, None, user_profile)
    except Exception as e:
        db.rollback()
        print(f"❌ [PROFILE] Error updating profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    data: PasswordChangeDTO,
    clinic_id: str = Query(..., description="Clinic ID"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password."""
    print(f"🔍 [PROFILE] Password change endpoint reached! User: {current_user.email}")
    
    # Check receptionist access
    check_receptionist_access(current_user)
    
    # Validate password confirmation
    if data.newPassword != data.confirmPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirmation do not match"
        )
    
    # Get user from database
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify current password and update with proper hashing
    from app.common.auth.auth_service import AuthService
    auth_service = AuthService()
    
    # Verify current password
    if not auth_service.verify_password(data.currentPassword, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password with proper hashing
    user.password_hash = auth_service.get_password_hash(data.newPassword)
    
    try:
        db.commit()
        print(f"✅ [PROFILE] Changed password for {user.email}")
    except Exception as e:
        db.rollback()
        print(f"❌ [PROFILE] Error changing password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )