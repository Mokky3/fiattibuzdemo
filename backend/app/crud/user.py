# app/crud/user.py
"""CRUD operations for User model."""
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime, timedelta
import uuid
from passlib.context import CryptContext

from app.crud.base import CRUDBase
from app.common.models.admin import User, UserRole, UserStatus
from app.common.schemas.user import (
    UserCreate, UserUpdate, UserInDB, PasswordChange,
    SecuritySettings, NotificationSettings, AvailabilitySettings
)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    """CRUD operations for User model with authentication support."""
    
    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        """Get user by email."""
        return db.query(User).filter(
            func.lower(User.email) == func.lower(email)
        ).first()
    
    def get_by_username(self, db: Session, *, username: str) -> Optional[User]:
        """Get user by username."""
        return db.query(User).filter(
            func.lower(User.username) == func.lower(username)
        ).first()
    
    def get_by_username_or_email(
        self, db: Session, *, username_or_email: str
    ) -> Optional[User]:
        """Get user by username or email."""
        return db.query(User).filter(
            or_(
                func.lower(User.username) == func.lower(username_or_email),
                func.lower(User.email) == func.lower(username_or_email)
            )
        ).first()
    
    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        """Create new user with hashed password."""
        # Hash the password
        hashed_password = pwd_context.hash(obj_in.password)
        
        # Prepare user data
        db_obj = User(
            id=uuid.uuid4(),
            email=obj_in.email,
            username=obj_in.username or obj_in.email.split('@')[0],
            password_hash=hashed_password,
            first_name=obj_in.first_name,
            last_name=obj_in.last_name,
            role=obj_in.role,
            phone=obj_in.phone,
            department_id=obj_in.department,
            status=UserStatus.ACTIVE,
            created_at=datetime.utcnow(),
            password_changed_at=datetime.utcnow()
        )
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def authenticate(
        self, db: Session, *, username_or_email: str, password: str
    ) -> Optional[User]:
        """Authenticate user with username/email and password."""
        user = self.get_by_username_or_email(db, username_or_email=username_or_email)
        
        if not user:
            return None
        
        if not pwd_context.verify(password, user.password_hash):
            # Increment failed login attempts
            user.failed_login_attempts += 1
            
            # Lock account after 5 failed attempts
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.utcnow() + timedelta(minutes=15)
                user.status = UserStatus.SUSPENDED
            
            db.commit()
            return None
        
        # Check if account is locked
        if user.locked_until and user.locked_until > datetime.utcnow():
            return None
        
        # Reset failed login attempts on successful login
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login = datetime.utcnow()
        
        if user.status == UserStatus.SUSPENDED and user.failed_login_attempts == 0:
            user.status = UserStatus.ACTIVE
        
        db.commit()
        return user
    
    def change_password(
        self,
        db: Session,
        *,
        user: User,
        current_password: str,
        new_password: str
    ) -> Optional[User]:
        """Change user password."""
        # Verify current password
        if not pwd_context.verify(current_password, user.password_hash):
            return None
        
        # Update password
        user.password_hash = pwd_context.hash(new_password)
        user.password_changed_at = datetime.utcnow()
        
        db.commit()
        db.refresh(user)
        return user
    
    def reset_password(
        self, db: Session, *, user: User, new_password: str
    ) -> User:
        """Reset user password (admin action)."""
        user.password_hash = pwd_context.hash(new_password)
        user.password_changed_at = datetime.utcnow()
        user.failed_login_attempts = 0
        user.locked_until = None
        
        if user.status == UserStatus.SUSPENDED:
            user.status = UserStatus.ACTIVE
        
        db.commit()
        db.refresh(user)
        return user
    
    def update_status(
        self, db: Session, *, user: User, status: UserStatus
    ) -> User:
        """Update user status."""
        user.status = status
        user.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(user)
        return user
    
    def get_active_users(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        role: Optional[UserRole] = None,
        organization_id: Optional[uuid.UUID] = None
    ) -> List[User]:
        """Get active users with optional filtering."""
        query = db.query(User).filter(User.status == UserStatus.ACTIVE)
        
        if role:
            query = query.filter(User.role == role)
        
        if organization_id:
            query = query.filter(User.organization_id == organization_id)
        
        return query.offset(skip).limit(limit).all()
    
    def search_users(
        self,
        db: Session,
        *,
        search_term: str,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[User]:
        """Search users by name, email, or phone."""
        query = db.query(User)
        
        # Apply search term
        if search_term:
            search_conditions = or_(
                func.lower(User.first_name).contains(search_term.lower()),
                func.lower(User.last_name).contains(search_term.lower()),
                func.lower(User.email).contains(search_term.lower()),
                func.lower(User.username).contains(search_term.lower()),
                User.phone.contains(search_term)
            )
            query = query.filter(search_conditions)
        
        # Apply additional filters
        if filters:
            if 'role' in filters and filters['role']:
                query = query.filter(User.role == filters['role'])
            
            if 'status' in filters and filters['status']:
                query = query.filter(User.status == filters['status'])
            
            if 'organization_id' in filters and filters['organization_id']:
                query = query.filter(User.organization_id == filters['organization_id'])
            
            if 'department_id' in filters and filters['department_id']:
                query = query.filter(User.department_id == filters['department_id'])
        
        return query.offset(skip).limit(limit).all()
    
    def get_user_stats(
        self, db: Session, *, user_id: uuid.UUID
    ) -> Dict[str, Any]:
        """Get user activity statistics."""
        user = self.get(db, id=user_id)
        if not user:
            return {}
        
        # Calculate basic stats
        days_since_creation = (datetime.utcnow() - user.created_at).days
        
        stats = {
            "user_id": str(user.id),
            "role": user.role.value,
            "status": user.status.value,
            "days_active": days_since_creation,
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "email_verified": user.email_verified,
            "phone_verified": user.phone_verified,
            "two_factor_enabled": user.two_factor_enabled,
            "failed_login_attempts": user.failed_login_attempts,
            "account_locked": bool(user.locked_until and user.locked_until > datetime.utcnow())
        }
        
        # Add role-specific stats
        if user.role == UserRole.DOCTOR:
            # These would be calculated from related tables in a real implementation
            stats.update({
                "total_patients": 0,
                "appointments_today": 0,
                "prescriptions_written": 0,
                "reports_generated": 0
            })
        elif user.role == UserRole.NURSE:
            stats.update({
                "patients_assisted": 0,
                "procedures_completed": 0,
                "shifts_completed": 0
            })
        elif user.role == UserRole.PATIENT:
            stats.update({
                "total_appointments": 0,
                "upcoming_appointments": 0,
                "active_prescriptions": 0,
                "lab_results": 0
            })
        
        return stats
    
    def update_last_login(self, db: Session, *, user: User) -> User:
        """Update user's last login timestamp."""
        user.last_login = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return user
    
    def verify_email(self, db: Session, *, user: User) -> User:
        """Mark user's email as verified."""
        user.email_verified = True
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return user
    
    def verify_phone(self, db: Session, *, user: User) -> User:
        """Mark user's phone as verified."""
        user.phone_verified = True
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return user
    
    def toggle_two_factor(self, db: Session, *, user: User, enabled: bool) -> User:
        """Enable or disable two-factor authentication."""
        user.two_factor_enabled = enabled
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return user
    
    def get_by_organization(
        self,
        db: Session,
        *,
        organization_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """Get all users in an organization."""
        return db.query(User).filter(
            User.organization_id == organization_id
        ).offset(skip).limit(limit).all()
    
    def get_by_department(
        self,
        db: Session,
        *,
        department_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """Get all users in a department."""
        return db.query(User).filter(
            User.department_id == department_id
        ).offset(skip).limit(limit).all()


# Create instance
user = CRUDUser(User)