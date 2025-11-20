"""Role-Based Access Control Service
Provides centralized RBAC functionality across all portals
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Set
from uuid import UUID, uuid4
from enum import Enum

from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Depends

from app.db.session import get_db
from app.common.models.user import User, UserRole, UserStatus
from app.common.models.admin import AdminActivity, ActivityType
from app.common.auth.auth_service import Permission, AuthService, AuthenticatedUser

# ──────────────────────────────────────────────────────────────────────────────
# RBAC Models
# ──────────────────────────────────────────────────────────────────────────────

class ResourceType(str, Enum):
    """Resource types for access control."""
    USER = "user"
    PATIENT = "patient"
    DOCTOR = "doctor"
    APPOINTMENT = "appointment"
    PRESCRIPTION = "prescription"
    REPORT = "report"
    HOSPITAL = "hospital"
    DEPARTMENT = "department"
    MESSAGE = "message"
    NOTIFICATION = "notification"
    TODO = "todo"
    FINANCIAL = "financial"
    AUDIT_LOG = "audit_log"
    SYSTEM_CONFIG = "system_config"
    ADMIN = "admin"

class ActionType(str, Enum):
    """Action types for access control."""
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    CREATE = "create"
    UPDATE = "update"
    MANAGE = "manage"
    EXPORT = "export"
    IMPORT = "import"
    APPROVE = "approve"
    REJECT = "reject"

class AccessScope(str, Enum):
    """Access scope levels."""
    GLOBAL = "global"      # Super admin - access to everything
    CLINIC = "clinic"      # Clinic admin - access to clinic resources
    DEPARTMENT = "department"  # Department head - access to department resources
    OWN = "own"           # User - access to own resources only
    ASSIGNED = "assigned"  # User - access to assigned resources

# ──────────────────────────────────────────────────────────────────────────────
# RBAC Service
# ──────────────────────────────────────────────────────────────────────────────

class RBACService:
    """Role-Based Access Control service."""
    
    def __init__(self):
        self.resource_permissions = self._build_resource_permissions()
        self.scope_mappings = self._build_scope_mappings()
    
    def _build_resource_permissions(self) -> Dict[ResourceType, Dict[ActionType, List[Permission]]]:
        """Build resource-action-permission mappings."""
        return {
            ResourceType.USER: {
                ActionType.READ: [Permission.USER_READ],
                ActionType.WRITE: [Permission.USER_WRITE],
                ActionType.DELETE: [Permission.USER_DELETE],
                ActionType.MANAGE: [Permission.USER_MANAGE_ROLES]
            },
            ResourceType.PATIENT: {
                ActionType.READ: [Permission.PATIENT_READ],
                ActionType.WRITE: [Permission.PATIENT_WRITE],
                ActionType.DELETE: [Permission.PATIENT_DELETE],
                ActionType.MANAGE: [Permission.PATIENT_MEDICAL_RECORDS]
            },
            ResourceType.DOCTOR: {
                ActionType.READ: [Permission.DOCTOR_READ],
                ActionType.WRITE: [Permission.DOCTOR_WRITE],
                ActionType.MANAGE: [Permission.DOCTOR_SCHEDULE, Permission.DOCTOR_PRESCRIPTIONS]
            },
            ResourceType.APPOINTMENT: {
                ActionType.READ: [Permission.APPOINTMENT_READ],
                ActionType.WRITE: [Permission.APPOINTMENT_WRITE],
                ActionType.DELETE: [Permission.APPOINTMENT_DELETE],
                ActionType.MANAGE: [Permission.APPOINTMENT_SCHEDULE]
            },
            ResourceType.HOSPITAL: {
                ActionType.READ: [Permission.HOSPITAL_READ],
                ActionType.WRITE: [Permission.HOSPITAL_WRITE],
                ActionType.DELETE: [Permission.HOSPITAL_DELETE],
                ActionType.MANAGE: [Permission.HOSPITAL_MANAGE]
            },
            ResourceType.MESSAGE: {
                ActionType.READ: [Permission.MESSAGE_READ],
                ActionType.WRITE: [Permission.MESSAGE_WRITE],
                ActionType.DELETE: [Permission.MESSAGE_DELETE]
            },
            ResourceType.NOTIFICATION: {
                ActionType.READ: [Permission.NOTIFICATION_READ],
                ActionType.WRITE: [Permission.NOTIFICATION_WRITE],
                ActionType.MANAGE: [Permission.NOTIFICATION_SEND]
            },
            ResourceType.REPORT: {
                ActionType.READ: [Permission.REPORT_READ],
                ActionType.WRITE: [Permission.REPORT_WRITE],
                ActionType.MANAGE: [Permission.REPORT_EXPORT]
            },
            ResourceType.FINANCIAL: {
                ActionType.READ: [Permission.FINANCIAL_READ],
                ActionType.WRITE: [Permission.FINANCIAL_WRITE],
                ActionType.MANAGE: [Permission.FINANCIAL_BILLING]
            },
            ResourceType.AUDIT_LOG: {
                ActionType.READ: [Permission.ADMIN_AUDIT_LOGS]
            },
            ResourceType.SYSTEM_CONFIG: {
                ActionType.READ: [Permission.ADMIN_READ],
                ActionType.WRITE: [Permission.ADMIN_WRITE],
                ActionType.MANAGE: [Permission.ADMIN_SYSTEM_CONFIG]
            },
            ResourceType.ADMIN: {
                ActionType.READ: [Permission.ADMIN_READ],
                ActionType.WRITE: [Permission.ADMIN_WRITE],
                ActionType.MANAGE: [Permission.ADMIN_SYSTEM_CONFIG]
            }
        }
    
    def _build_scope_mappings(self) -> Dict[UserRole, AccessScope]:
        """Build role-scope mappings."""
        return {
            UserRole.SUPER_ADMIN: AccessScope.GLOBAL,
            UserRole.CLINIC_ADMIN: AccessScope.CLINIC,
            UserRole.DOCTOR: AccessScope.DEPARTMENT,
            UserRole.NURSE: AccessScope.DEPARTMENT,
            UserRole.RECEPTIONIST: AccessScope.CLINIC,
            UserRole.PATIENT: AccessScope.OWN,
            UserRole.LAB_TECHNICIAN: AccessScope.DEPARTMENT,
            UserRole.PHARMACIST: AccessScope.CLINIC
        }
    
    def check_permission(
        self,
        user: AuthenticatedUser,
        resource_type: ResourceType,
        action: ActionType,
        resource_clinic_id: Optional[str] = None,
        resource_user_id: Optional[str] = None,
        resource_department_id: Optional[str] = None
    ) -> bool:
        """Check if user has permission to perform action on resource."""
        
        # Get required permissions for this resource-action combination
        required_permissions = self.resource_permissions.get(resource_type, {}).get(action, [])
        if not required_permissions:
            return False
        
        # Check if user has any of the required permissions
        user_permissions = set(user.permissions)
        required_permission_values = {perm.value for perm in required_permissions}
        
        if not user_permissions.intersection(required_permission_values):
            return False
        
        # Check scope-based access
        user_scope = self.scope_mappings.get(user.role, AccessScope.OWN)
        
        if user_scope == AccessScope.GLOBAL:
            return True
        
        elif user_scope == AccessScope.CLINIC:
            # Must have clinic access
            if not user.clinic_id:
                return False
            if resource_clinic_id and user.clinic_id != resource_clinic_id:
                return False
            return True
        
        elif user_scope == AccessScope.DEPARTMENT:
            # Must have department access (would need department_id in user context)
            if not user.clinic_id:
                return False
            if resource_clinic_id and user.clinic_id != resource_clinic_id:
                return False
            # Additional department-level checks would go here
            return True
        
        elif user_scope == AccessScope.OWN:
            # Can only access own resources
            if resource_user_id and user.user_id != resource_user_id:
                return False
            return True
        
        elif user_scope == AccessScope.ASSIGNED:
            # Can access assigned resources (would need assignment tracking)
            return True
        
        return False
    
    def enforce_permission(
        self,
        user: AuthenticatedUser,
        resource_type: ResourceType,
        action: ActionType,
        resource_clinic_id: Optional[str] = None,
        resource_user_id: Optional[str] = None,
        resource_department_id: Optional[str] = None
    ):
        """Enforce permission check, raise exception if denied."""
        if not self.check_permission(
            user, resource_type, action, resource_clinic_id, resource_user_id, resource_department_id
        ):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: {action.value} on {resource_type.value}"
            )
    
    def get_accessible_resources(
        self,
        user: AuthenticatedUser,
        resource_type: ResourceType,
        action: ActionType,
        all_resources: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Filter resources based on user's access permissions."""
        accessible_resources = []
        
        for resource in all_resources:
            resource_clinic_id = resource.get("clinic_id")
            resource_user_id = resource.get("user_id")
            resource_department_id = resource.get("department_id")
            
            if self.check_permission(
                user, resource_type, action, resource_clinic_id, resource_user_id, resource_department_id
            ):
                accessible_resources.append(resource)
        
        return accessible_resources
    
    def get_user_accessible_clinics(self, user: AuthenticatedUser) -> List[str]:
        """Get list of clinic IDs user can access."""
        print(f"DEBUG: get_user_accessible_clinics - user.role = {user.role} (type: {type(user.role)})")
        print(f"DEBUG: get_user_accessible_clinics - scope_mappings keys = {list(self.scope_mappings.keys())}")
        user_scope = self.scope_mappings.get(user.role, AccessScope.OWN)
        print(f"DEBUG: get_user_accessible_clinics - user_scope = {user_scope}")
        
        if user_scope == AccessScope.GLOBAL:
            # Super admin can access all clinics
            return []  # Empty list means all clinics
        
        elif user_scope in [AccessScope.CLINIC, AccessScope.DEPARTMENT]:
            # Return user's clinic
            print(f"DEBUG: get_user_accessible_clinics - user.clinic_id = {user.clinic_id} (type: {type(user.clinic_id)})")
            return [user.clinic_id] if user.clinic_id else []
        
        else:
            # Own scope users don't have clinic access
            return []
    
    def can_access_clinic(self, user: AuthenticatedUser, clinic_id: str) -> bool:
        """Check if user can access specific clinic."""
        print(f"DEBUG: can_access_clinic - user.role = {user.role} (type: {type(user.role)})")
        print(f"DEBUG: can_access_clinic - clinic_id = {clinic_id} (type: {type(clinic_id)})")
        accessible_clinics = self.get_user_accessible_clinics(user)
        print(f"DEBUG: can_access_clinic - accessible_clinics = {accessible_clinics}")
        
        # Empty list means all clinics (super admin)
        if not accessible_clinics:
            return True
        
        return clinic_id in accessible_clinics
    
    def can_access_patient(self, user: AuthenticatedUser, patient_id: str, clinic_id: str) -> bool:
        """Check if user can access specific patient."""
        # First check clinic access
        if not self.can_access_clinic(user, clinic_id):
            return False
        
        # For doctors, if they can access the clinic, they can access patients in that clinic
        # Additional patient-level permissions could be added here
        return True
    
    def log_access_attempt(
        self,
        db: Session,
        user: AuthenticatedUser,
        resource_type: ResourceType,
        action: ActionType,
        resource_id: str,
        success: bool,
        resource_clinic_id: Optional[str] = None
    ):
        """Log access attempt for audit purposes."""
        activity_type = ActivityType.ACCESS_GRANTED if success else ActivityType.ACCESS_DENIED
        
        from app.crud.admin import admin as admin_crud
        admin_crud.log_admin_activity(
            db=db,
            admin_id=user.user_id,
            activity_type=activity_type,
            description=f"{'Granted' if success else 'Denied'} {action.value} access to {resource_type.value}:{resource_id}",
            affected_resource_id=resource_id,
            affected_resource_type=resource_type.value,
            metadata={
                "clinic_id": resource_clinic_id,
                "success": success,
                "user_role": user.role.value
            }
        )

# ──────────────────────────────────────────────────────────────────────────────
# RBAC Decorators and Dependencies
# ──────────────────────────────────────────────────────────────────────────────

def require_resource_permission(resource_type: ResourceType, action: ActionType):
    """Decorator to require specific resource permission."""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Extract resource information from kwargs or request
            resource_clinic_id = kwargs.get('resource_clinic_id')
            resource_user_id = kwargs.get('resource_user_id')
            resource_department_id = kwargs.get('resource_department_id')
            
            # Check permission
            rbac_service = RBACService()
            rbac_service.enforce_permission(
                current_user, resource_type, action, resource_clinic_id, resource_user_id, resource_department_id
            )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator
    
def require_clinic_access():
    """Dependency to require clinic access."""
    async def _require_clinic_access(current_user: AuthenticatedUser = Depends(lambda: None)):
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        if not current_user.clinic_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                detail="Clinic access required"
            )
        
        return current_user
    return _require_clinic_access

# ──────────────────────────────────────────────────────────────────────────────
# Portal-Specific RBAC Dependencies
# ──────────────────────────────────────────────────────────────────────────────

class PortalRBAC:
    """Portal-specific RBAC dependencies."""
    
    @staticmethod
    def admin_access():
        """Admin portal access control."""
        async def _admin_access(current_user: AuthenticatedUser = Depends(lambda: None)):
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN]:
                raise HTTPException(status_code=403, detail="Admin access required")
            
            return current_user
        return _admin_access
    
    @staticmethod
    def doctor_access():
        """Doctor portal access control."""
        async def _doctor_access(current_user: AuthenticatedUser = Depends(lambda: None)):
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            if current_user.role != UserRole.DOCTOR:
                raise HTTPException(status_code=403, detail="Doctor access required")
            
            return current_user
        return _doctor_access
    
    @staticmethod
    def patient_access():
        """Patient portal access control."""
        async def _patient_access(current_user: AuthenticatedUser = Depends(lambda: None)):
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            if current_user.role != UserRole.PATIENT:
                raise HTTPException(status_code=403, detail="Patient access required")
            
            return current_user
        return _patient_access
    
    @staticmethod
    def reception_access():
        """Reception portal access control."""
        async def _reception_access(current_user: AuthenticatedUser = Depends(lambda: None)):
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            if current_user.role != UserRole.RECEPTIONIST:
                raise HTTPException(status_code=403, detail="Receptionist access required")
            
            return current_user
        return _reception_access
    
    @staticmethod
    def nurse_access():
        """Nurse portal access control."""
        async def _nurse_access(current_user: AuthenticatedUser = Depends(lambda: None)):
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            if current_user.role != UserRole.NURSE:
                raise HTTPException(status_code=403, detail="Nurse access required")
            
            return current_user
        return _nurse_access

# ──────────────────────────────────────────────────────────────────────────────
# Global RBAC Service Instance
# ──────────────────────────────────────────────────────────────────────────────

rbac_service = RBACService()