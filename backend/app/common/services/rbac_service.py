# backend/app/services/rbac.py
"""Role-Based Access Control service"""
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.admin import User, UserPermission, UserRole, Permission

def check_clinic_access(user: User, clinic_id: int) -> bool:
    """Check if user has access to a specific clinic"""
    # Superadmin has access to all clinics
    if user.role == UserRole.SUPERADMIN:
        return True
    
    # Other users only have access to their assigned clinic
    return user.clinic_id == clinic_id

def check_permission(user: User, permission_id: str, db: Session) -> bool:
    """Check if user has a specific permission"""
    # Superadmin has all permissions
    if user.role == UserRole.SUPERADMIN:
        return True
    
    # Check user's permissions
    permission = db.query(UserPermission).filter(
        UserPermission.user_id == user.id,
        UserPermission.permission_id == permission_id
    ).first()
    
    return permission is not None

def get_user_permissions(user: User, db: Session) -> List[str]:
    """Get all permissions for a user"""
    if user.role == UserRole.SUPERADMIN:
        # Return all permission IDs
        permissions = db.query(Permission).all()
        return [p.id for p in permissions]
    
    # Get user's specific permissions
    user_permissions = db.query(UserPermission).filter(
        UserPermission.user_id == user.id
    ).all()
    
    return [up.permission_id for up in user_permissions]

def init_permissions(db: Session):
    """Initialize default permissions in the database"""
    default_permissions = [
        {"id": "viewHistory", "name": "View Full Patient History", "category": "medical"},
        {"id": "prescribe", "name": "Prescribe Medication", "category": "medical"},
        {"id": "editMedical", "name": "Edit Medical Information", "category": "medical"},
        {"id": "accessAnalytics", "name": "Access Analytics & Reports", "category": "analytics"},
        {"id": "manage_users", "name": "Manage Users", "category": "admin"},
        {"id": "manage_clinic", "name": "Manage Clinic", "category": "admin"},
        {"id": "view_reports", "name": "View Reports", "category": "analytics"},
        {"id": "financial_access", "name": "Financial Access", "category": "financial"},
        {"id": "admin_access", "name": "Admin Access", "category": "admin"}
    ]
    
    for perm_data in default_permissions:
        perm = db.query(Permission).filter(Permission.id == perm_data["id"]).first()
        if not perm:
            perm = Permission(**perm_data)
            db.add(perm)
    
    db.commit()
