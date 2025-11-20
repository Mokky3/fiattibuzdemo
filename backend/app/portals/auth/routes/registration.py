"""
Public registration routes for accepting invitations
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, validator
from datetime import datetime, timezone
import uuid

from app.db.session import get_db
from app.common.models.user_invitation import UserInvitation, InvitationStatus
from app.common.models.user import User, UserRole, UserStatus
from app.crud.user_invitation import user_invitation
from app.crud.user import user
from app.common.auth.auth_service import AuthService

router = APIRouter(prefix="/auth/registration", tags=["registration"])


class RegistrationData(BaseModel):
    """Schema for user registration data"""
    token: str
    password: str
    confirm_password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in v):
            raise ValueError('Password must contain at least one special character')
        return v
    
    @validator('confirm_password')
    def validate_confirm_password(cls, v, values):
        """Validate password confirmation"""
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v


class RegistrationResponse(BaseModel):
    """Schema for registration response"""
    success: bool
    message: str
    user_id: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None


@router.get("/validate-token/{token}")
async def validate_invitation_token(
    token: str,
    db: Session = Depends(get_db)
):
    """Validate invitation token and return invitation details"""
    try:
        # Get invitation by token
        invitation = user_invitation.get_by_token(db=db, token=token)
        
        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid invitation token"
            )
        
        # Check if invitation is valid
        if not invitation.is_valid():
            if invitation.is_expired():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invitation has expired"
                )
            elif invitation.status == InvitationStatus.ACCEPTED:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invitation has already been accepted"
                )
            elif invitation.status == InvitationStatus.CANCELLED:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invitation has been cancelled"
                )
        
        # Return invitation details
        return {
            "valid": True,
            "contact": invitation.contact,
            "contact_type": invitation.contact_type.value,
            "role": invitation.role,
            "organization_name": invitation.organization.name if invitation.organization else None,
            "first_name": invitation.first_name,
            "last_name": invitation.last_name,
            "expires_at": invitation.expires_at.isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate token: {str(e)}"
        )


@router.post("/", response_model=RegistrationResponse)
async def register_user(
    registration_data: RegistrationData,
    db: Session = Depends(get_db)
):
    """Register a new user using invitation token"""
    try:
        # Get invitation by token
        invitation = user_invitation.get_by_token(db=db, token=registration_data.token)
        
        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid invitation token"
            )
        
        # Check if invitation is valid
        if not invitation.is_valid():
            if invitation.is_expired():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invitation has expired"
                )
            elif invitation.status == InvitationStatus.ACCEPTED:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invitation has already been accepted"
                )
            elif invitation.status == InvitationStatus.CANCELLED:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invitation has been cancelled"
                )
        
        # Check if user already exists with this contact
        existing_user = None
        if invitation.contact_type.value == "EMAIL":
            existing_user = db.query(User).filter(User.email == invitation.contact).first()
        else:
            # For phone numbers, we might need to check a phone field
            # This depends on your user model structure
            pass
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this contact already exists"
            )
        
        # Create new user
        user_data = {
            "id": str(uuid.uuid4()),
            "email": invitation.contact if invitation.contact_type.value == "EMAIL" else None,
            "phone": invitation.contact if invitation.contact_type.value == "PHONE" else None,
            "first_name": registration_data.first_name or invitation.first_name or "",
            "last_name": registration_data.last_name or invitation.last_name or "",
            "role": invitation.role,
            "status": UserStatus.ACTIVE,
            "organization_id": invitation.organization_id,
            "password_hash": AuthService.get_password_hash(registration_data.password),
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "last_login": None
        }
        
        # Create user
        new_user = User(**user_data)
        db.add(new_user)
        
        # Mark invitation as accepted
        user_invitation.mark_as_accepted(
            db=db,
            invitation_id=invitation.id
        )
        
        # Commit changes
        db.commit()
        db.refresh(new_user)
        
        return RegistrationResponse(
            success=True,
            message="User registered successfully",
            user_id=new_user.id,
            email=new_user.email,
            role=new_user.role
        )
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register user: {str(e)}"
        )


@router.post("/resend-invitation/{token}")
async def resend_invitation(
    token: str,
    db: Session = Depends(get_db)
):
    """Resend invitation email/SMS"""
    try:
        # Get invitation by token
        invitation = user_invitation.get_by_token(db=db, token=token)
        
        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid invitation token"
            )
        
        # Check if invitation is valid
        if not invitation.is_valid():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation is not valid for resending"
            )
        
        # Generate new invitation link
        base_url = "http://localhost:5173"
        invitation_link = invitation.generate_invitation_link(base_url)
        
        # Send notification (this would need the notification service)
        # For now, just return success
        return {
            "success": True,
            "message": "Invitation resent successfully",
            "invitation_link": invitation_link
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resend invitation: {str(e)}"
        )
