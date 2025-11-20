"""Row Level Security (RLS) Middleware for Admin Portal
This middleware sets PostgreSQL session variables to enable RLS policies
based on the authenticated user's role and clinic assignment.
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging
from typing import Optional

from app.db.session import get_db
from app.common.auth.auth_service import AuthenticatedUser, UserRole

logger = logging.getLogger(__name__)


class RLSMiddleware(BaseHTTPMiddleware):
    """Middleware to set PostgreSQL session variables for Row Level Security."""
    
    async def dispatch(self, request: Request, call_next):
        """Set RLS session variables based on authenticated user."""
        
        # Get the database session
        db = next(get_db())
        
        try:
            # Extract user information from request (if available)
            user_info = getattr(request.state, 'current_user', None)
            
            if user_info and isinstance(user_info, AuthenticatedUser):
                # Set session variables for RLS
                await self._set_rls_session_variables(db, user_info)
                logger.debug(f"RLS session variables set for user: {user_info.email}, role: {user_info.role}")
            else:
                # Set default session variables for unauthenticated requests
                await self._set_default_rls_session_variables(db)
                logger.debug("RLS default session variables set for unauthenticated request")
            
            # Process the request
            response = await call_next(request)
            
        except Exception as e:
            logger.error(f"Error in RLS middleware: {e}")
            # Set default session variables on error
            try:
                await self._set_default_rls_session_variables(db)
            except Exception as default_error:
                logger.error(f"Error setting default RLS variables: {default_error}")
            
            response = await call_next(request)
        
        finally:
            db.close()
        
        return response
    
    async def _set_rls_session_variables(self, db: Session, user: AuthenticatedUser):
        """Set PostgreSQL session variables for authenticated user."""
        try:
            # Set user ID
            db.execute(text("SET app.current_user_id = :user_id"), 
                      {"user_id": str(user.user_id)})
            
            # Set user role
            db.execute(text("SET app.current_user_role = :role"), 
                      {"role": user.role.value if hasattr(user.role, 'value') else str(user.role)})
            
            # Set clinic ID (if available)
            clinic_id = user.clinic_id or "default"
            db.execute(text("SET app.current_clinic_id = :clinic_id"), 
                      {"clinic_id": str(clinic_id)})
            
            # Set user permissions (comma-separated list)
            permissions = ",".join(user.permissions) if user.permissions else ""
            db.execute(text("SET app.current_user_permissions = :permissions"), 
                      {"permissions": permissions})
            
            # Set user email for logging
            db.execute(text("SET app.current_user_email = :email"), 
                      {"email": user.email or ""})
            
            # Commit the session variable changes
            db.commit()
            
        except Exception as e:
            logger.error(f"Error setting RLS session variables: {e}")
            db.rollback()
            raise
    
    async def _set_default_rls_session_variables(self, db: Session):
        """Set default PostgreSQL session variables for unauthenticated requests."""
        try:
            # Set default values that will deny access through RLS policies
            db.execute(text("SET app.current_user_id = ''"))
            db.execute(text("SET app.current_user_role = 'GUEST'"))
            db.execute(text("SET app.current_clinic_id = ''"))
            db.execute(text("SET app.current_user_permissions = ''"))
            db.execute(text("SET app.current_user_email = ''"))
            
            # Commit the session variable changes
            db.commit()
            
        except Exception as e:
            logger.error(f"Error setting default RLS session variables: {e}")
            db.rollback()
            raise


class RLSContextManager:
    """Context manager for setting RLS session variables in database operations."""
    
    def __init__(self, db: Session, user: Optional[AuthenticatedUser] = None):
        self.db = db
        self.user = user
        self._original_variables = {}
    
    def __enter__(self):
        """Set RLS session variables."""
        if self.user:
            self._set_user_variables()
        else:
            self._set_default_variables()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Restore original session variables."""
        try:
            # Restore original variables if they were set
            for var_name, var_value in self._original_variables.items():
                if var_value is not None:
                    self.db.execute(text(f"SET {var_name} = :value"), {"value": var_value})
                else:
                    self.db.execute(text(f"RESET {var_name}"))
        except Exception as e:
            logger.error(f"Error restoring RLS session variables: {e}")
    
    def _set_user_variables(self):
        """Set session variables for authenticated user."""
        # Store original values
        self._store_original_variable("app.current_user_id")
        self._store_original_variable("app.current_user_role")
        self._store_original_variable("app.current_clinic_id")
        self._store_original_variable("app.current_user_permissions")
        self._store_original_variable("app.current_user_email")
        
        # Set new values
        self.db.execute(text("SET app.current_user_id = :user_id"), 
                       {"user_id": str(self.user.user_id)})
        self.db.execute(text("SET app.current_user_role = :role"), 
                       {"role": self.user.role.value if hasattr(self.user.role, 'value') else str(self.user.role)})
        
        clinic_id = self.user.clinic_id or "default"
        self.db.execute(text("SET app.current_clinic_id = :clinic_id"), 
                       {"clinic_id": str(clinic_id)})
        
        permissions = ",".join(self.user.permissions) if self.user.permissions else ""
        self.db.execute(text("SET app.current_user_permissions = :permissions"), 
                       {"permissions": permissions})
        
        self.db.execute(text("SET app.current_user_email = :email"), 
                       {"email": self.user.email or ""})
    
    def _set_default_variables(self):
        """Set default session variables."""
        # Store original values
        self._store_original_variable("app.current_user_id")
        self._store_original_variable("app.current_user_role")
        self._store_original_variable("app.current_clinic_id")
        self._store_original_variable("app.current_user_permissions")
        self._store_original_variable("app.current_user_email")
        
        # Set default values
        self.db.execute(text("SET app.current_user_id = ''"))
        self.db.execute(text("SET app.current_user_role = 'GUEST'"))
        self.db.execute(text("SET app.current_clinic_id = ''"))
        self.db.execute(text("SET app.current_user_permissions = ''"))
        self.db.execute(text("SET app.current_user_email = ''"))
    
    def _store_original_variable(self, var_name: str):
        """Store the original value of a session variable."""
        try:
            result = self.db.execute(text(f"SELECT current_setting(:var_name, true)"), 
                                   {"var_name": var_name})
            value = result.fetchone()[0]
            self._original_variables[var_name] = value if value != "" else None
        except Exception:
            # Variable doesn't exist, store None
            self._original_variables[var_name] = None


def get_rls_context(db: Session, user: Optional[AuthenticatedUser] = None) -> RLSContextManager:
    """Get RLS context manager for database operations."""
    return RLSContextManager(db, user)


# Utility functions for RLS
def set_rls_for_user(db: Session, user: AuthenticatedUser):
    """Set RLS session variables for a specific user."""
    with RLSContextManager(db, user):
        pass


def set_rls_for_admin(db: Session, user: AuthenticatedUser):
    """Set RLS session variables specifically for admin operations."""
    if user.role not in [UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN]:
        raise ValueError("User must be an admin to use admin RLS context")
    
    with RLSContextManager(db, user):
        pass


def check_rls_access(db: Session, user: AuthenticatedUser, resource_clinic_id: Optional[str] = None) -> bool:
    """Check if user has RLS access to a resource."""
    # Super admin has access to everything
    if user.role == UserRole.SUPER_ADMIN:
        return True
    
    # Clinic admin can access resources in their clinic
    if user.role == UserRole.CLINIC_ADMIN:
        if not resource_clinic_id or resource_clinic_id == "default":
            return True
        return user.clinic_id == resource_clinic_id
    
    # Other roles have limited access
    return False
