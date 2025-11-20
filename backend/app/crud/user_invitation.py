"""
CRUD operations for user invitations
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import uuid

from app.common.models.user_invitation import UserInvitation, InvitationStatus, ContactType
from app.crud.base import CRUDBase


class CRUDUserInvitation(CRUDBase[UserInvitation, None, None]):
    """CRUD operations for UserInvitation"""
    
    def create_invitation(
        self,
        db: Session,
        *,
        contact: str,
        contact_type: ContactType,
        role: str,
        organization_id: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        created_by: Optional[str] = None,
        expires_in_hours: int = 72
    ) -> UserInvitation:
        """Create a new user invitation"""
        # Generate invitation token and link
        invitation_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_in_hours)
        
        invitation_data = {
            "contact": contact,
            "contact_type": contact_type,
            "invitation_token": invitation_token,
            "role": role,
            "organization_id": organization_id,
            "first_name": first_name,
            "last_name": last_name,
            "status": InvitationStatus.PENDING,
            "expires_at": expires_at,
            "created_by": created_by
        }
        
        invitation = UserInvitation(**invitation_data)
        db.add(invitation)
        db.commit()
        db.refresh(invitation)
        return invitation
    
    def get_by_token(self, db: Session, *, token: str) -> Optional[UserInvitation]:
        """Get invitation by token"""
        return db.query(UserInvitation).filter(
            UserInvitation.invitation_token == token
        ).first()
    
    def get_by_contact(self, db: Session, *, contact: str) -> List[UserInvitation]:
        """Get all invitations for a contact"""
        return db.query(UserInvitation).filter(
            UserInvitation.contact == contact
        ).order_by(UserInvitation.created_at.desc()).all()
    
    def get_pending_invitations(self, db: Session) -> List[UserInvitation]:
        """Get all pending invitations"""
        return db.query(UserInvitation).filter(
            UserInvitation.status == InvitationStatus.PENDING
        ).order_by(UserInvitation.created_at.desc()).all()
    
    def get_expired_invitations(self, db: Session) -> List[UserInvitation]:
        """Get all expired invitations"""
        now = datetime.now(timezone.utc)
        return db.query(UserInvitation).filter(
            and_(
                UserInvitation.status.in_([InvitationStatus.PENDING, InvitationStatus.SENT]),
                UserInvitation.expires_at < now
            )
        ).all()
    
    def mark_as_sent(
        self,
        db: Session,
        *,
        invitation_id: str,
        notification_type: str,
        notification_provider: str,
        notification_id: str,
        invitation_link: str
    ) -> Optional[UserInvitation]:
        """Mark invitation as sent"""
        invitation = db.query(UserInvitation).filter(
            UserInvitation.id == invitation_id
        ).first()
        
        if invitation:
            invitation.status = InvitationStatus.SENT
            invitation.sent_at = datetime.now(timezone.utc)
            invitation.notification_sent = True
            invitation.notification_type = notification_type
            invitation.notification_provider = notification_provider
            invitation.notification_id = notification_id
            invitation.invitation_link = invitation_link
            
            db.commit()
            db.refresh(invitation)
        
        return invitation
    
    def mark_as_accepted(
        self,
        db: Session,
        *,
        invitation_id: str
    ) -> Optional[UserInvitation]:
        """Mark invitation as accepted"""
        invitation = db.query(UserInvitation).filter(
            UserInvitation.id == invitation_id
        ).first()
        
        if invitation:
            invitation.status = InvitationStatus.ACCEPTED
            invitation.accepted_at = datetime.now(timezone.utc)
            
            db.commit()
            db.refresh(invitation)
        
        return invitation
    
    def mark_as_expired(
        self,
        db: Session,
        *,
        invitation_id: str
    ) -> Optional[UserInvitation]:
        """Mark invitation as expired"""
        invitation = db.query(UserInvitation).filter(
            UserInvitation.id == invitation_id
        ).first()
        
        if invitation:
            invitation.status = InvitationStatus.EXPIRED
            db.commit()
            db.refresh(invitation)
        
        return invitation
    
    def cancel_invitation(
        self,
        db: Session,
        *,
        invitation_id: str
    ) -> Optional[UserInvitation]:
        """Cancel an invitation"""
        invitation = db.query(UserInvitation).filter(
            UserInvitation.id == invitation_id
        ).first()
        
        if invitation:
            invitation.status = InvitationStatus.CANCELLED
            db.commit()
            db.refresh(invitation)
        
        return invitation
    
    def cleanup_expired_invitations(self, db: Session) -> int:
        """Clean up expired invitations"""
        expired_invitations = self.get_expired_invitations(db)
        
        for invitation in expired_invitations:
            invitation.status = InvitationStatus.EXPIRED
        
        db.commit()
        return len(expired_invitations)
    
    def get_invitations_by_organization(
        self,
        db: Session,
        *,
        organization_id: str,
        status: Optional[InvitationStatus] = None
    ) -> List[UserInvitation]:
        """Get invitations by organization"""
        query = db.query(UserInvitation).filter(
            UserInvitation.organization_id == organization_id
        )
        
        if status:
            query = query.filter(UserInvitation.status == status)
        
        return query.order_by(UserInvitation.created_at.desc()).all()
    
    def get_invitation_stats(self, db: Session) -> Dict[str, Any]:
        """Get invitation statistics"""
        total = db.query(UserInvitation).count()
        pending = db.query(UserInvitation).filter(
            UserInvitation.status == InvitationStatus.PENDING
        ).count()
        sent = db.query(UserInvitation).filter(
            UserInvitation.status == InvitationStatus.SENT
        ).count()
        accepted = db.query(UserInvitation).filter(
            UserInvitation.status == InvitationStatus.ACCEPTED
        ).count()
        expired = db.query(UserInvitation).filter(
            UserInvitation.status == InvitationStatus.EXPIRED
        ).count()
        
        return {
            "total": total,
            "pending": pending,
            "sent": sent,
            "accepted": accepted,
            "expired": expired
        }


# Create instance
user_invitation = CRUDUserInvitation(UserInvitation)
