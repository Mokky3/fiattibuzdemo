"""Security middleware for rate limiting, audit logging, and clinic scoping."""
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable
from collections import defaultdict
import asyncio
from fastapi import Request, Response, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import redis.asyncio as redis
from pydantic import BaseModel

from app.db.session import get_db
from app.common.schemas.responses_enhanced import ProblemDetail, ErrorType, AuditLogEntry, RateLimitInfo
from app.common.schemas.responses_enhanced import create_problem_detail
from app.common.utils.tracing import get_trace_id

# Rate limiting configuration
RATE_LIMITS = {
    "auth": {"requests": 5, "window": 300},  # 5 requests per 5 minutes
    "reset": {"requests": 3, "window": 3600},  # 3 requests per hour
    "default": {"requests": 100, "window": 60},  # 100 requests per minute
}

# PII resource types that require audit logging
PII_RESOURCES = {
    "patient", "practitioner", "appointment", "medication_request", 
    "document_reference", "observation", "coverage"
}

class RateLimiter:
    """Rate limiter using Redis."""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self.redis_client = None
    
    async def get_redis_client(self):
        """Get Redis client."""
        if self.redis_client is None:
            self.redis_client = redis.from_url(self.redis_url)
        return self.redis_client
    
    async def check_rate_limit(self, key: str, limit: int, window: int) -> tuple[bool, RateLimitInfo]:
        """Check rate limit for a key."""
        redis_client = await self.get_redis_client()
        
        current_time = int(time.time())
        window_start = current_time - window
        
        # Use Redis pipeline for atomic operations
        pipe = redis_client.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zadd(key, {str(current_time): current_time})
        pipe.zcard(key)
        pipe.expire(key, window)
        results = await pipe.execute()
        
        request_count = results[2]
        is_allowed = request_count <= limit
        remaining = max(0, limit - request_count)
        
        # Calculate reset time
        reset_time = datetime.fromtimestamp(current_time + window)
        
        return is_allowed, RateLimitInfo(
            limit=limit,
            remaining=remaining,
            reset_time=reset_time,
            retry_after=window if not is_allowed else None
        )

class AuditLogger:
    """Audit logger for PII operations."""
    
    def __init__(self, db: Session):
        self.db = db
        self.audit_entries: List[AuditLogEntry] = []
    
    def log_pii_access(
        self,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        clinic_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict] = None
    ):
        """Log PII access."""
        if resource_type.lower() in PII_RESOURCES:
            entry = AuditLogEntry(
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                clinic_id=clinic_id,
                ip_address=ip_address,
                user_agent=user_agent,
                details=details
            )
            self.audit_entries.append(entry)
    
    async def flush_audit_logs(self):
        """Flush audit logs to database."""
        if not self.audit_entries:
            return
        
        # Here you would insert into your audit_logs table
        # For now, we'll just print them
        for entry in self.audit_entries:
            print(f"AUDIT: {entry.action} on {entry.resource_type}:{entry.resource_id} by {entry.user_id}")
        
        self.audit_entries.clear()

class ClinicScoper:
    """Clinic scoping middleware."""
    
    @staticmethod
    def get_clinic_id_from_request(request: Request) -> Optional[str]:
        """Extract clinic ID from request."""
        # Check headers first
        clinic_id = request.headers.get("X-Clinic-ID")
        if clinic_id:
            return clinic_id
        
        # Check query parameters
        clinic_id = request.query_params.get("clinic_id")
        if clinic_id:
            return clinic_id
        
        # Check user context (would need to be set by auth middleware)
        user = getattr(request.state, "user", None)
        if user and hasattr(user, "clinic_id"):
            return user.clinic_id
        
        return None
    
    @staticmethod
    def enforce_clinic_scope(
        request: Request,
        resource_clinic_id: Optional[str],
        user_clinic_id: Optional[str]
    ) -> bool:
        """Enforce clinic scoping."""
        # Admin users can access all clinics
        user = getattr(request.state, "user", None)
        if user and hasattr(user, "role") and user.role == "admin":
            return True
        
        # If no clinic ID is required, allow access
        if not resource_clinic_id:
            return True
        
        # If user has no clinic ID, deny access
        if not user_clinic_id:
            return False
        
        # Check if user's clinic matches resource's clinic
        return resource_clinic_id == user_clinic_id

class SecurityMiddleware:
    """Main security middleware."""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.rate_limiter = RateLimiter(redis_url)
        self.audit_logger = None
    
    async def __call__(self, request: Request, call_next):
        """Process request through security middleware."""
        # Initialize audit logger
        db = next(get_db())
        self.audit_logger = AuditLogger(db)
        
        # Rate limiting
        await self._apply_rate_limiting(request)
        
        # Add trace ID
        trace_id = get_trace_id()
        request.state.trace_id = trace_id
        
        # Process request
        response = await call_next(request)
        
        # Audit logging
        await self._audit_request(request, response)
        
        # Flush audit logs
        await self.audit_logger.flush_audit_logs()
        
        return response
    
    async def _apply_rate_limiting(self, request: Request):
        """Apply rate limiting to the request."""
        # Determine rate limit based on endpoint
        endpoint = request.url.path
        if "/auth/" in endpoint:
            limit_config = RATE_LIMITS["auth"]
        elif "/reset" in endpoint:
            limit_config = RATE_LIMITS["reset"]
        else:
            limit_config = RATE_LIMITS["default"]
        
        # Create rate limit key
        user_id = getattr(request.state, "user_id", "anonymous")
        key = f"rate_limit:{endpoint}:{user_id}"
        
        # Check rate limit
        is_allowed, rate_info = await self.rate_limiter.check_rate_limit(
            key, limit_config["requests"], limit_config["window"]
        )
        
        if not is_allowed:
            problem = create_problem_detail(
                error_type=ErrorType.RATE_LIMIT_ERROR,
                title="Rate Limit Exceeded",
                status=429,
                detail=f"Too many requests. Limit: {rate_info.limit}, Window: {limit_config['window']}s",
                trace_id=getattr(request.state, "trace_id", None)
            )
            
            response = JSONResponse(
                content=problem.dict(),
                status_code=429,
                headers={
                    "X-RateLimit-Limit": str(rate_info.limit),
                    "X-RateLimit-Remaining": str(rate_info.remaining),
                    "X-RateLimit-Reset": rate_info.reset_time.isoformat(),
                    "Retry-After": str(rate_info.retry_after) if rate_info.retry_after else None
                }
            )
            return response
    
    async def _audit_request(self, request: Request, response: Response):
        """Audit the request for PII access."""
        if not self.audit_logger:
            return
        
        # Extract user information
        user = getattr(request.state, "user", None)
        user_id = user.id if user else "anonymous"
        
        # Extract clinic information
        clinic_id = ClinicScoper.get_clinic_id_from_request(request)
        
        # Determine action based on HTTP method
        action_map = {
            "GET": "read",
            "POST": "create",
            "PUT": "update",
            "PATCH": "update",
            "DELETE": "delete"
        }
        action = action_map.get(request.method, "access")
        
        # Extract resource information from URL
        path_parts = request.url.path.split("/")
        if len(path_parts) >= 3:
            resource_type = path_parts[2]  # e.g., "patients", "appointments"
            if len(path_parts) >= 4 and path_parts[3].isdigit():
                resource_id = path_parts[3]
            else:
                resource_id = "list"
        else:
            resource_type = "unknown"
            resource_id = "unknown"
        
        # Log PII access
        self.audit_logger.log_pii_access(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            clinic_id=clinic_id,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            details={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code
            }
        )

# Dependency for clinic scoping
def require_clinic_scope():
    """Dependency to enforce clinic scoping."""
    async def _require_clinic_scope(request: Request):
        clinic_id = ClinicScoper.get_clinic_id_from_request(request)
        if not clinic_id:
            problem = create_problem_detail(
                error_type=ErrorType.AUTHORIZATION_ERROR,
                title="Clinic Scope Required",
                status=403,
                detail="Clinic ID is required for this operation",
                trace_id=getattr(request.state, "trace_id", None)
            )
            raise HTTPException(status_code=403, detail=problem.dict())
        return clinic_id
    return _require_clinic_scope

# Dependency for audit logging
def audit_pii_access(action: str, resource_type: str, resource_id: str):
    """Decorator for auditing PII access."""
    def decorator(func: Callable):
        from functools import wraps
        
        @wraps(func)
        async def wrapper(request: Request, **kwargs):
            # Get audit logger from middleware
            audit_logger = getattr(request.state, "audit_logger", None)
            if audit_logger:
                user = getattr(request.state, "user", None)
                user_id = user.id if user else "anonymous"
                clinic_id = ClinicScoper.get_clinic_id_from_request(request)
                
                audit_logger.log_pii_access(
                    user_id=user_id,
                    action=action,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    clinic_id=clinic_id,
                    ip_address=request.client.host if request.client else None,
                    user_agent=request.headers.get("user-agent")
                )
            
            return await func(request, **kwargs)
        return wrapper
    return decorator
