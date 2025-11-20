"""Centralized Authentication and Authorization Service
Provides consistent auth across all portals with proper permission enforcement
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Union
from uuid import UUID, uuid4
import jwt
import os
from enum import Enum

from fastapi import HTTPException, status, Depends, Request
import logging
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.db.session import get_db
from app.common.models.user import User, UserRole, UserStatus
from app.common.models.doctor import Doctor
from app.common.models.patient import Patient
from app.common.models.admin import AdminActivity, ActivityType

# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8 hours
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

security = HTTPBearer()
# Support long passwords safely by preferring bcrypt_sha256 (pre-hashes with SHA-256 before bcrypt),
# while still accepting legacy bcrypt hashes for existing users. Also disable truncate_error for bcrypt.
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt_sha256", "bcrypt"],
    deprecated="auto",
    bcrypt__truncate_error=False,
    bcrypt_sha256__truncate_error=False,
)
logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Permission System
# ──────────────────────────────────────────────────────────────────────────────

class Permission(str, Enum):
    """System permissions."""
    # User Management
    USER_READ = "user:read"
    USER_WRITE = "user:write"
    USER_DELETE = "user:delete"
    USER_MANAGE_ROLES = "user:manage_roles"
    
    # Patient Management
    PATIENT_READ = "patient:read"
    PATIENT_WRITE = "patient:write"
    PATIENT_DELETE = "patient:delete"
    PATIENT_MEDICAL_RECORDS = "patient:medical_records"
    
    # Doctor Management
    DOCTOR_READ = "doctor:read"
    DOCTOR_WRITE = "doctor:write"
    DOCTOR_SCHEDULE = "doctor:schedule"
    DOCTOR_PRESCRIPTIONS = "doctor:prescriptions"
    
    # Appointment Management
    APPOINTMENT_READ = "appointment:read"
    APPOINTMENT_WRITE = "appointment:write"
    APPOINTMENT_DELETE = "appointment:delete"
    APPOINTMENT_SCHEDULE = "appointment:schedule"
    
    # Hospital/Clinic Management
    HOSPITAL_READ = "hospital:read"
    HOSPITAL_WRITE = "hospital:write"
    HOSPITAL_DELETE = "hospital:delete"
    HOSPITAL_MANAGE = "hospital:manage"
    
    # Financial Management
    FINANCIAL_READ = "financial:read"
    FINANCIAL_WRITE = "financial:write"
    FINANCIAL_BILLING = "financial:billing"
    
    # System Administration
    ADMIN_READ = "admin:read"
    ADMIN_WRITE = "admin:write"
    ADMIN_SYSTEM_CONFIG = "admin:system_config"
    ADMIN_AUDIT_LOGS = "admin:audit_logs"
    ADMIN_USER_MANAGEMENT = "admin:user_management"
    
    # Messaging
    MESSAGE_READ = "message:read"
    MESSAGE_WRITE = "message:write"
    MESSAGE_DELETE = "message:delete"
    
    # Notifications
    NOTIFICATION_READ = "notification:read"
    NOTIFICATION_WRITE = "notification:write"
    NOTIFICATION_SEND = "notification:send"
    
    # Reports and Analytics
    REPORT_READ = "report:read"
    REPORT_WRITE = "report:write"
    REPORT_EXPORT = "report:export"
    ANALYTICS_READ = "analytics:read"

# Role-Permission Mapping
ROLE_PERMISSIONS = {
    UserRole.SUPER_ADMIN: [
        # All permissions
        *[permission.value for permission in Permission]
    ],
    UserRole.CLINIC_ADMIN: [
        # Clinic-scoped admin permissions
        Permission.USER_READ, Permission.USER_WRITE, Permission.USER_MANAGE_ROLES,
        Permission.PATIENT_READ, Permission.PATIENT_WRITE, Permission.PATIENT_DELETE,
        Permission.DOCTOR_READ, Permission.DOCTOR_WRITE, Permission.DOCTOR_SCHEDULE,
        Permission.APPOINTMENT_READ, Permission.APPOINTMENT_WRITE, Permission.APPOINTMENT_DELETE,
        Permission.HOSPITAL_READ, Permission.HOSPITAL_WRITE,
        Permission.FINANCIAL_READ, Permission.FINANCIAL_WRITE,
        Permission.MESSAGE_READ, Permission.MESSAGE_WRITE,
        Permission.NOTIFICATION_READ, Permission.NOTIFICATION_WRITE,
        Permission.REPORT_READ, Permission.REPORT_WRITE, Permission.ANALYTICS_READ,
        # Admin permissions for clinic settings management
        Permission.ADMIN_READ, Permission.ADMIN_WRITE
    ],
    UserRole.DOCTOR: [
        # Doctor permissions
        Permission.PATIENT_READ, Permission.PATIENT_MEDICAL_RECORDS,
        Permission.APPOINTMENT_READ, Permission.APPOINTMENT_WRITE, Permission.APPOINTMENT_SCHEDULE,
        Permission.DOCTOR_READ, Permission.DOCTOR_WRITE, Permission.DOCTOR_PRESCRIPTIONS,
        Permission.MESSAGE_READ, Permission.MESSAGE_WRITE,
        Permission.NOTIFICATION_READ,
        Permission.REPORT_READ, Permission.REPORT_WRITE
    ],
    UserRole.NURSE: [
        # Nurse permissions
        Permission.PATIENT_READ, Permission.PATIENT_WRITE,
        Permission.APPOINTMENT_READ, Permission.APPOINTMENT_WRITE,
        Permission.MESSAGE_READ, Permission.MESSAGE_WRITE,
        Permission.NOTIFICATION_READ
    ],
    UserRole.RECEPTIONIST: [
        # Receptionist permissions
        Permission.PATIENT_READ, Permission.PATIENT_WRITE,
        Permission.APPOINTMENT_READ, Permission.APPOINTMENT_WRITE, Permission.APPOINTMENT_SCHEDULE,
        Permission.DOCTOR_READ,
        Permission.MESSAGE_READ, Permission.MESSAGE_WRITE,
        Permission.NOTIFICATION_READ
    ],
    UserRole.PATIENT: [
        # Patient permissions
        Permission.PATIENT_READ, Permission.PATIENT_WRITE,  # Own data only
        Permission.APPOINTMENT_READ,  # Own appointments only
        Permission.MESSAGE_READ, Permission.MESSAGE_WRITE,
        Permission.NOTIFICATION_READ
    ],
    UserRole.LAB_TECHNICIAN: [
        # Lab technician permissions
        Permission.PATIENT_READ,  # For lab results
        Permission.REPORT_READ, Permission.REPORT_WRITE,
        Permission.MESSAGE_READ, Permission.MESSAGE_WRITE,
        Permission.NOTIFICATION_READ
    ],
    UserRole.RADIOLOGIST: [
        # Radiologist permissions
        Permission.PATIENT_READ,  # For imaging studies
        Permission.REPORT_READ, Permission.REPORT_WRITE,
        Permission.MESSAGE_READ, Permission.MESSAGE_WRITE,
        Permission.NOTIFICATION_READ
    ],
    UserRole.PHARMACIST: [
        # Pharmacist permissions
        Permission.PATIENT_READ,  # For prescriptions
        Permission.DOCTOR_READ,  # For prescription validation
        Permission.MESSAGE_READ, Permission.MESSAGE_WRITE,
        Permission.NOTIFICATION_READ
    ]
}

# ──────────────────────────────────────────────────────────────────────────────
# Authentication Service
# ──────────────────────────────────────────────────────────────────────────────

class AuthService:
    """Centralized authentication service."""
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash a password."""
        # Use pbkdf2_sha256 to avoid bcrypt 72-byte limits; keep others for backward compatibility
        try:
            return pwd_context.hash(password, scheme="pbkdf2_sha256")
        except Exception as exc:
            logger.error(f"Password hashing failed: {exc}")
            raise
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(data: dict) -> str:
        """Create JWT refresh token."""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str) -> Optional[dict]:
        """Verify JWT token."""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.PyJWTError:
            return None
    
    @staticmethod
    def get_user_permissions(user_role: UserRole) -> List[str]:
        """Get permissions for a user role."""
        raw = ROLE_PERMISSIONS.get(user_role, [])
        return [p.value if isinstance(p, Permission) else p for p in raw]
    
    @staticmethod
    def has_permission(user_role: UserRole, permission: Permission) -> bool:
        """Check if user role has specific permission."""
        user_permissions = AuthService.get_user_permissions(user_role)
        return permission.value in user_permissions
    
    @staticmethod
    def check_clinic_access(user_clinic_id: Optional[str], resource_clinic_id: Optional[str], user_role: UserRole) -> bool:
        """Check if user can access clinic-scoped resource."""
        # Super admin can access all clinics
        if user_role == UserRole.SUPER_ADMIN:
            return True
        
        # Treat "default" or empty as no scoping
        if not resource_clinic_id or resource_clinic_id in {"default", ""}:
            return True
        
        # If user has no clinic ID, deny access
        if not user_clinic_id:
            return False
        
        # Check if user's clinic matches resource's clinic
        return user_clinic_id == resource_clinic_id

# ──────────────────────────────────────────────────────────────────────────────
# Authentication Dependencies
# ──────────────────────────────────────────────────────────────────────────────

class AuthenticatedUser:
    """Authenticated user context."""
    def __init__(self, user: User, permissions: List[str], clinic_id: Optional[str] = None):
        self.user = user
        self.permissions = permissions
        self.clinic_id = clinic_id
        self.user_id = str(user.id)
        self.email = user.email
        self.role = user.role
        self.is_active = user.is_active
        # Avoid lazy loading practitioner relationship as it may trigger RBAC checks
        self.practitioner_id = None

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> AuthenticatedUser:
    """Get current authenticated user from JWT token."""
    print(f"🔍 [AUTH] get_current_user called")
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Verify token
    payload = AuthService.verify_token(credentials.credentials)
    print(f"🔍 [AUTH] Token verified, payload: {payload.get('sub') if payload else None}")
    if payload is None:
        raise credentials_exception
    
    # Check token type
    if payload.get("type") != "access":
        raise credentials_exception
    
    # Get user ID
    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    # Convert string user_id to UUID for database query
    try:
        user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id
    except (ValueError, TypeError) as e:
        print(f"🔍 [AUTH] Invalid user_id format: {user_id}, error: {e}")
        raise credentials_exception
    
    # Get user from database
    user = db.query(User).filter(User.id == user_uuid).first()
    if user is None:
        raise credentials_exception
    
    # Check if user is active
    if not user.is_active or user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Get user permissions
    permissions = AuthService.get_user_permissions(user.role)
    
    # Get clinic ID (prefer token, else map from user)
    clinic_id = payload.get("clinic_id")
    # Legacy mapping: use user's organization_id as clinic context if available
    if not clinic_id and hasattr(user, 'organization_id'):
        clinic_id = str(user.organization_id) if user.organization_id else None
    
    print(f"✅ [AUTH] Creating AuthenticatedUser for {user.email}, role: {user.role}")
    print(f"🔍 [DEBUG] role: {user.role}, perms: {permissions}")
    print(f"🔍 [DEBUG] has appointment:read: {'appointment:read' in permissions}")
    return AuthenticatedUser(user, permissions, clinic_id)

async def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[AuthenticatedUser]:
    """Get current user if authenticated, otherwise return None."""
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ")[1]
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        return await get_current_user(credentials, db)
    except:
        return None

# ──────────────────────────────────────────────────────────────────────────────
# Authorization Dependencies
# ──────────────────────────────────────────────────────────────────────────────

def require_permission(permission: Permission):
    """Dependency to require specific permission."""
    async def _require_permission(current_user: AuthenticatedUser = Depends(get_current_user)):
        if permission.value not in current_user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {permission.value}"
            )
        return current_user
    return _require_permission

def require_role(role: UserRole):
    """Dependency to require specific role."""
    async def _require_role(current_user: AuthenticatedUser = Depends(get_current_user)):
        if current_user.role != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {role.value}"
            )
        return current_user
    return _require_role

def require_roles(*roles: UserRole):
    """Dependency to require one of multiple roles."""
    async def _require_roles(current_user: AuthenticatedUser = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {[role.value for role in roles]}"
            )
        return current_user
    return _require_roles

def require_clinic_access():
    """Dependency to require clinic access."""
    async def _require_clinic_access(current_user: AuthenticatedUser = Depends(get_current_user)):
        if not current_user.clinic_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Clinic access required"
            )
        return current_user
    return _require_clinic_access

def require_admin_access():
    """Dependency to require admin access."""
    return require_roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)

def require_doctor_access():
    """Dependency to require doctor access."""
    return require_role(UserRole.DOCTOR)

def require_patient_access():
    """Dependency to require patient access."""
    return require_role(UserRole.PATIENT)

def require_receptionist_access():
    """Dependency to require receptionist access."""
    return require_role(UserRole.RECEPTIONIST)

def require_nurse_access():
    """Dependency to require nurse access."""
    return require_role(UserRole.NURSE)

def require_lab_technician_access():
    """Dependency to require lab technician access."""
    return require_role(UserRole.LAB_TECHNICIAN)

def require_radiologist_access():
    """Dependency to require radiologist access."""
    return require_role(UserRole.RADIOLOGIST)

# ──────────────────────────────────────────────────────────────────────────────
# Resource Access Control
# ──────────────────────────────────────────────────────────────────────────────

def check_resource_access(
    current_user: AuthenticatedUser,
    resource_clinic_id: Optional[str] = None,
    resource_user_id: Optional[str] = None
) -> bool:
    """Check if user can access a specific resource."""
    # Super admin can access everything
    if current_user.role == UserRole.SUPER_ADMIN:
        return True
    
    # Check clinic access
    if resource_clinic_id:
        if not AuthService.check_clinic_access(current_user.clinic_id, resource_clinic_id, current_user.role):
            return False
    
    # Check user-specific access (for patients accessing their own data)
    if resource_user_id:
        if current_user.role == UserRole.PATIENT:
            return current_user.user_id == resource_user_id
    
    return True

def enforce_resource_access(
    current_user: AuthenticatedUser,
    resource_clinic_id: Optional[str] = None,
    resource_user_id: Optional[str] = None
):
    """Enforce resource access control."""
    if not check_resource_access(current_user, resource_clinic_id, resource_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this resource"
        )

# ──────────────────────────────────────────────────────────────────────────────
# Portal-Specific Dependencies
# ──────────────────────────────────────────────────────────────────────────────

# Admin Portal
get_current_admin = require_admin_access()

# Doctor Portal
get_current_doctor = require_doctor_access()

# Patient Portal
get_current_patient = require_patient_access()

# Reception Portal
get_current_receptionist = require_receptionist_access()

# ──────────────────────────────────────────────────────────────────────────────
# Activity Logging
# ──────────────────────────────────────────────────────────────────────────────

async def log_user_activity(
    db: Session,
    user_id: str,
    activity_type: ActivityType,
    description: str,
    resource_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    clinic_id: Optional[str] = None
):
    """Log user activity."""
    from app.crud.admin import admin as admin_crud
    
    admin_crud.log_admin_activity(
        db=db,
        admin_id=user_id,
        activity_type=activity_type,
        description=description,
        affected_resource_id=resource_id,
        affected_resource_type=resource_type,
        ip_address=None,  # Would be extracted from request
        user_agent=None,  # Would be extracted from request
        metadata={"clinic_id": clinic_id} if clinic_id else None
    )
