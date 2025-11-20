"""Notification CRUD operations
Connected to notification models and database operations
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Union
from uuid import UUID, uuid4

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc

from app.common.models.notification import (
    Notification, NotificationChannel
)
from app.common.schemas.base_enhanced import NotificationType
from app.common.models.user import User, UserRole
from app.crud.base import CRUDBase
from pydantic import BaseModel

# ──────────────────────────────────────────────────────────────────────────────
# Notification CRUD
# ──────────────────────────────────────────────────────────────────────────────

class CRUDNotification(CRUDBase[Notification, BaseModel, BaseModel]):
    def get_user_notifications(
        self,
        db: Session,
        user_id: str,
        clinic_id: Optional[str] = None,
        unread_only: bool = False,
        notification_type: Optional[NotificationType] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Notification]:
        """Get notifications for a specific user."""
        query = db.query(Notification).filter(Notification.recipient_id == user_id)
        
        if clinic_id:
            query = query.filter(Notification.clinic_id == clinic_id)
        if unread_only:
            query = query.filter(Notification.read == False)
        if notification_type:
            query = query.filter(Notification.notification_type == notification_type)
        
        return query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()
    
    def create_notification(
        self,
        db: Session,
        recipient_id: str,
        clinic_id: str,
        title: str,
        message: str,
        notification_type: NotificationType = NotificationType.INFO,
        channel: NotificationChannel = NotificationChannel.IN_APP,
        sender_id: Optional[str] = None,
        action_url: Optional[str] = None,
        priority: str = "normal",
        category: str = "general",
        requires_acknowledgment: bool = False,
        expires_at: Optional[datetime] = None,
        scheduled_for: Optional[datetime] = None
    ) -> Notification:
        """Create a new notification."""
        notification_data = {
            "recipient_id": recipient_id,
            "clinic_id": clinic_id,
            "title": title,
            "message": message,
            "notification_type": notification_type,
            "channel": channel,
            "sender_id": sender_id,
            "action_url": action_url,
            "priority": priority,
            "category": category,
            "requires_acknowledgment": requires_acknowledgment,
            "expires_at": expires_at,
            "scheduled_for": scheduled_for,
            "read": False,
            "sent": False
        }
        
        return self.create(db=db, obj_in=notification_data)
    
    def mark_as_read(
        self,
        db: Session,
        notification_id: str,
        user_id: str
    ) -> Optional[Notification]:
        """Mark a notification as read."""
        notification = db.query(Notification).filter(
            and_(
                Notification.id == notification_id,
                Notification.recipient_id == user_id
            )
        ).first()
        
        if not notification:
            return None
        
        return self.update(db=db, db_obj=notification, obj_in={
            "read": True,
            "read_at": datetime.now(timezone.utc)
        })
    
    def mark_all_as_read(
        self,
        db: Session,
        user_id: str,
        clinic_id: Optional[str] = None
    ) -> int:
        """Mark all notifications as read for a user."""
        query = db.query(Notification).filter(
            and_(
                Notification.recipient_id == user_id,
                Notification.read == False
            )
        )
        
        if clinic_id:
            query = query.filter(Notification.clinic_id == clinic_id)
        
        notifications = query.all()
        updated_count = 0
        
        for notification in notifications:
            self.update(db=db, db_obj=notification, obj_in={
                "read": True,
                "read_at": datetime.now(timezone.utc)
            })
            updated_count += 1
        
        return updated_count
    
    def acknowledge_notification(
        self,
        db: Session,
        notification_id: str,
        user_id: str
    ) -> Optional[Notification]:
        """Acknowledge a notification that requires acknowledgment."""
        notification = db.query(Notification).filter(
            and_(
                Notification.id == notification_id,
                Notification.recipient_id == user_id,
                Notification.requires_acknowledgment == True
            )
        ).first()
        
        if not notification:
            return None
        
        return self.update(db=db, db_obj=notification, obj_in={
            "acknowledged": True,
            "acknowledged_at": datetime.now(timezone.utc)
        })
    
    def get_unread_count(
        self,
        db: Session,
        user_id: str,
        clinic_id: Optional[str] = None
    ) -> int:
        """Get unread notification count for a user."""
        query = db.query(Notification).filter(
            and_(
                Notification.recipient_id == user_id,
                Notification.read == False
            )
        )
        
        if clinic_id:
            query = query.filter(Notification.clinic_id == clinic_id)
        
        return query.count()
    
    def get_pending_acknowledgments(
        self,
        db: Session,
        user_id: str,
        clinic_id: Optional[str] = None
    ) -> int:
        """Get pending acknowledgment count for a user."""
        query = db.query(Notification).filter(
            and_(
                Notification.recipient_id == user_id,
                Notification.requires_acknowledgment == True,
                Notification.acknowledged == False
            )
        )
        
        if clinic_id:
            query = query.filter(Notification.clinic_id == clinic_id)
        
        return query.count()
    
    def get_notification_statistics(
        self,
        db: Session,
        user_id: str,
        clinic_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get notification statistics for a user."""
        query = db.query(Notification).filter(Notification.recipient_id == user_id)
        
        if clinic_id:
            query = query.filter(Notification.clinic_id == clinic_id)
        if start_date:
            query = query.filter(Notification.created_at >= start_date)
        if end_date:
            query = query.filter(Notification.created_at <= end_date)
        
        total_notifications = query.count()
        read_notifications = query.filter(Notification.read == True).count()
        unread_notifications = query.filter(Notification.read == False).count()
        acknowledged_notifications = query.filter(Notification.acknowledged == True).count()
        pending_acknowledgments = query.filter(
            and_(
                Notification.requires_acknowledgment == True,
                Notification.acknowledged == False
            )
        ).count()
        
        # Count by type
        type_counts = {}
        for notification_type in NotificationType:
            count = query.filter(Notification.notification_type == notification_type).count()
            type_counts[notification_type.value] = count
        
        # Count by channel
        channel_counts = {}
        for channel in NotificationChannel:
            count = query.filter(Notification.channel == channel).count()
            channel_counts[channel.value] = count
        
        return {
            "total_notifications": total_notifications,
            "read_notifications": read_notifications,
            "unread_notifications": unread_notifications,
            "acknowledged_notifications": acknowledged_notifications,
            "pending_acknowledgments": pending_acknowledgments,
            "type_counts": type_counts,
            "channel_counts": channel_counts,
            "period": {
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None
            }
        }
    
    def get_expired_notifications(
        self,
        db: Session,
        clinic_id: Optional[str] = None
    ) -> List[Notification]:
        """Get expired notifications."""
        now = datetime.now(timezone.utc)
        query = db.query(Notification).filter(
            and_(
                Notification.expires_at.isnot(None),
                Notification.expires_at <= now,
                Notification.read == False
            )
        )
        
        if clinic_id:
            query = query.filter(Notification.clinic_id == clinic_id)
        
        return query.all()
    
    def cleanup_expired_notifications(
        self,
        db: Session,
        clinic_id: Optional[str] = None
    ) -> int:
        """Clean up expired notifications."""
        expired_notifications = self.get_expired_notifications(db=db, clinic_id=clinic_id)
        
        deleted_count = 0
        for notification in expired_notifications:
            self.remove(db=db, id=notification.id)
            deleted_count += 1
        
        return deleted_count
    
    def get_scheduled_notifications(
        self,
        db: Session,
        clinic_id: Optional[str] = None
    ) -> List[Notification]:
        """Get notifications scheduled for future delivery."""
        now = datetime.now(timezone.utc)
        query = db.query(Notification).filter(
            and_(
                Notification.scheduled_for.isnot(None),
                Notification.scheduled_for > now,
                Notification.sent == False
            )
        )
        
        if clinic_id:
            query = query.filter(Notification.clinic_id == clinic_id)
        
        return query.order_by(asc(Notification.scheduled_for)).all()
    
    def get_ready_to_send_notifications(
        self,
        db: Session,
        clinic_id: Optional[str] = None
    ) -> List[Notification]:
        """Get notifications ready to be sent."""
        now = datetime.now(timezone.utc)
        query = db.query(Notification).filter(
            and_(
                or_(
                    Notification.scheduled_for.is_(None),
                    Notification.scheduled_for <= now
                ),
                Notification.sent == False
            )
        )
        
        if clinic_id:
            query = query.filter(Notification.clinic_id == clinic_id)
        
        return query.order_by(asc(Notification.created_at)).all()
    
    def mark_as_sent(
        self,
        db: Session,
        notification_id: str,
        delivery_status: Optional[str] = None
    ) -> Optional[Notification]:
        """Mark a notification as sent."""
        notification = db.query(Notification).filter(Notification.id == notification_id).first()
        
        if not notification:
            return None
        
        update_data = {
            "sent": True,
            "sent_at": datetime.now(timezone.utc)
        }
        
        if delivery_status:
            update_data["delivery_status"] = delivery_status
        
        return self.update(db=db, db_obj=notification, obj_in=update_data)
    
    def create_bulk_notification(
        self,
        db: Session,
        recipient_ids: List[str],
        clinic_id: str,
        title: str,
        message: str,
        notification_type: NotificationType = NotificationType.INFO,
        channel: NotificationChannel = NotificationChannel.IN_APP,
        sender_id: Optional[str] = None,
        action_url: Optional[str] = None,
        priority: str = "normal",
        category: str = "general",
        requires_acknowledgment: bool = False,
        expires_at: Optional[datetime] = None,
        scheduled_for: Optional[datetime] = None
    ) -> List[Notification]:
        """Create notifications for multiple recipients."""
        notifications = []
        
        for recipient_id in recipient_ids:
            notification = self.create_notification(
                db=db,
                recipient_id=recipient_id,
                clinic_id=clinic_id,
                title=title,
                message=message,
                notification_type=notification_type,
                channel=channel,
                sender_id=sender_id,
                action_url=action_url,
                priority=priority,
                category=category,
                requires_acknowledgment=requires_acknowledgment,
                expires_at=expires_at,
                scheduled_for=scheduled_for
            )
            notifications.append(notification)
        
        return notifications
    
    def search_notifications(
        self,
        db: Session,
        user_id: str,
        search_term: str,
        clinic_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Notification]:
        """Search notifications by title or message content."""
        query = db.query(Notification).filter(
            and_(
                Notification.recipient_id == user_id,
                or_(
                    Notification.title.ilike(f"%{search_term}%"),
                    Notification.message.ilike(f"%{search_term}%")
                )
            )
        )
        
        if clinic_id:
            query = query.filter(Notification.clinic_id == clinic_id)
        
        return query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()

# ──────────────────────────────────────────────────────────────────────────────
# Create CRUD instance
# ──────────────────────────────────────────────────────────────────────────────

notification = CRUDNotification(Notification)
