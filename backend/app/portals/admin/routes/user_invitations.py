"""
Admin routes for managing user invitations
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, validator
import uuid

from app.db.session import get_db
from app.common.models.user_invitation import UserInvitation, ContactType, InvitationStatus
from app.crud.user_invitation import user_invitation
from app.services.notification_service import notification_service
from app.common.auth.auth import get_current_user
from app.common.models.user import User

router = APIRouter(prefix="/admin/invitations", tags=["admin-invitations"])


class UserInvitationCreate(BaseModel):
    """Schema for creating user invitation"""
    contact: str
    contact_type: ContactType
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str
    organization_id: Optional[str] = None
    expires_in_hours: int = 72
    
    @validator('contact')
    def validate_contact(cls, v, values):
        """Validate contact based on type"""
        if values.get('contact_type') == ContactType.EMAIL:
            # Basic email validation
            if '@' not in v or '.' not in v.split('@')[1]:
                raise ValueError('Invalid email format')
        elif values.get('contact_type') == ContactType.PHONE:
            # Basic phone validation (should contain only digits and +)
            if not v.replace('+', '').replace('-', '').replace(' ', '').replace('(', '').replace(')', '').isdigit():
                raise ValueError('Invalid phone format')
        return v


class UserInvitationResponse(BaseModel):
    """Schema for user invitation response"""
    id: str
    contact: str
    contact_type: ContactType
    first_name: Optional[str]
    last_name: Optional[str]
    role: str
    organization_id: Optional[str]
    organization_name: Optional[str]
    status: InvitationStatus
    invitation_link: Optional[str]
    sent_at: Optional[str]
    accepted_at: Optional[str]
    expires_at: str
    notification_sent: bool
    notification_type: Optional[str]
    created_at: str
    
    class Config:
        from_attributes = True


class UserInvitationStats(BaseModel):
    """Schema for invitation statistics"""
    total: int
    pending: int
    sent: int
    accepted: int
    expired: int


@router.post("/", response_model=UserInvitationResponse)
async def create_user_invitation(
    invitation_data: UserInvitationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new user invitation"""
    try:
        # Check if user has permission to create invitations
        if current_user.role not in ["SUPER_ADMIN", "CLINIC_ADMIN"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to create invitations"
            )
        
        # Create invitation
        invitation = user_invitation.create_invitation(
            db=db,
            contact=invitation_data.contact,
            contact_type=invitation_data.contact_type,
            role=invitation_data.role,
            organization_id=invitation_data.organization_id,
            first_name=invitation_data.first_name,
            last_name=invitation_data.last_name,
            created_by=current_user.id,
            expires_in_hours=invitation_data.expires_in_hours
        )
        
        # Generate invitation link
        base_url = "http://localhost:5173"  # Frontend URL
        invitation_link = invitation.generate_invitation_link(base_url)
        
        # Send notification
        notification_result = await notification_service.send_invitation(
            invitation=invitation,
            invitation_link=invitation_link
        )
        
        # Update invitation with notification details
        if notification_result["success"]:
            user_invitation.mark_as_sent(
                db=db,
                invitation_id=invitation.id,
                notification_type=notification_result["notification_type"],
                notification_provider=notification_result["notification_provider"],
                notification_id=notification_result["notification_id"],
                invitation_link=invitation_link
            )
        
        # Refresh invitation to get updated data
        db.refresh(invitation)
        
        # Convert to response format
        response_data = {
            "id": invitation.id,
            "contact": invitation.contact,
            "contact_type": invitation.contact_type,
            "first_name": invitation.first_name,
            "last_name": invitation.last_name,
            "role": invitation.role,
            "organization_id": invitation.organization_id,
            "organization_name": invitation.organization.name if invitation.organization else None,
            "status": invitation.status,
            "invitation_link": invitation.invitation_link,
            "sent_at": invitation.sent_at.isoformat() if invitation.sent_at else None,
            "accepted_at": invitation.accepted_at.isoformat() if invitation.accepted_at else None,
            "expires_at": invitation.expires_at.isoformat(),
            "notification_sent": invitation.notification_sent,
            "notification_type": invitation.notification_type,
            "created_at": invitation.created_at.isoformat()
        }
        
        return UserInvitationResponse(**response_data)
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create invitation: {str(e)}"
        )


@router.get("/", response_model=List[UserInvitationResponse])
async def get_user_invitations(
    organization_id: Optional[str] = None,
    status: Optional[InvitationStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user invitations with optional filtering"""
    try:
        # Check permissions
        if current_user.role not in ["SUPER_ADMIN", "CLINIC_ADMIN"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view invitations"
            )
        
        # Get invitations
        if organization_id:
            invitations = user_invitation.get_invitations_by_organization(
                db=db,
                organization_id=organization_id,
                status=status
            )
        else:
            # Get all invitations for super admin
            if current_user.role == "SUPER_ADMIN":
                invitations = db.query(UserInvitation).filter(
                    UserInvitation.status == status if status else True
                ).offset(skip).limit(limit).all()
            else:
                # For clinic admin, only show invitations for their organization
                invitations = user_invitation.get_invitations_by_organization(
                    db=db,
                    organization_id=current_user.organization_id,
                    status=status
                )
        
        # Convert to response format
        response_data = []
        for invitation in invitations:
            response_data.append({
                "id": invitation.id,
                "contact": invitation.contact,
                "contact_type": invitation.contact_type,
                "first_name": invitation.first_name,
                "last_name": invitation.last_name,
                "role": invitation.role,
                "organization_id": invitation.organization_id,
                "organization_name": invitation.organization.name if invitation.organization else None,
                "status": invitation.status,
                "invitation_link": invitation.invitation_link,
                "sent_at": invitation.sent_at.isoformat() if invitation.sent_at else None,
                "accepted_at": invitation.accepted_at.isoformat() if invitation.accepted_at else None,
                "expires_at": invitation.expires_at.isoformat(),
                "notification_sent": invitation.notification_sent,
                "notification_type": invitation.notification_type,
                "created_at": invitation.created_at.isoformat()
            })
        
        return [UserInvitationResponse(**data) for data in response_data]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get invitations: {str(e)}"
        )


@router.get("/stats", response_model=UserInvitationStats)
async def get_invitation_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get invitation statistics"""
    try:
        # Check permissions
        if current_user.role not in ["SUPER_ADMIN", "CLINIC_ADMIN"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view stats"
            )
        
        stats = user_invitation.get_invitation_stats(db)
        return UserInvitationStats(**stats)
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get stats: {str(e)}"
        )


@router.post("/{invitation_id}/resend")
async def resend_invitation(
    invitation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Resend an invitation"""
    try:
        # Check permissions
        if current_user.role not in ["SUPER_ADMIN", "CLINIC_ADMIN"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to resend invitations"
            )
        
        # Get invitation
        invitation = db.query(UserInvitation).filter(
            UserInvitation.id == invitation_id
        ).first()
        
        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invitation not found"
            )
        
        # Check if invitation is valid
        if not invitation.is_valid():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation is expired or already processed"
            )
        
        # Generate new invitation link
        base_url = "http://localhost:5173"
        invitation_link = invitation.generate_invitation_link(base_url)
        
        # Send notification
        notification_result = await notification_service.send_invitation(
            invitation=invitation,
            invitation_link=invitation_link
        )
        
        # Update invitation
        if notification_result["success"]:
            user_invitation.mark_as_sent(
                db=db,
                invitation_id=invitation.id,
                notification_type=notification_result["notification_type"],
                notification_provider=notification_result["notification_provider"],
                notification_id=notification_result["notification_id"],
                invitation_link=invitation_link
            )
        
        return {"message": "Invitation resent successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resend invitation: {str(e)}"
        )


@router.delete("/{invitation_id}")
async def cancel_invitation(
    invitation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel an invitation"""
    try:
        # Check permissions
        if current_user.role not in ["SUPER_ADMIN", "CLINIC_ADMIN"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to cancel invitations"
            )
        
        # Cancel invitation
        invitation = user_invitation.cancel_invitation(
            db=db,
            invitation_id=invitation_id
        )
        
        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invitation not found"
            )
        
        return {"message": "Invitation cancelled successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel invitation: {str(e)}"
        )


@router.post("/cleanup-expired")
async def cleanup_expired_invitations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clean up expired invitations"""
    try:
        # Check permissions
        if current_user.role != "SUPER_ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only super admin can cleanup expired invitations"
            )
        
        # Cleanup expired invitations
        cleaned_count = user_invitation.cleanup_expired_invitations(db)
        
        return {"message": f"Cleaned up {cleaned_count} expired invitations"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cleanup expired invitations: {str(e)}"
        )
