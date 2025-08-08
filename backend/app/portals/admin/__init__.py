
# ==============================================================================
# FILE: app/portals/admin/__init__.py
# ==============================================================================

from fastapi import APIRouter
from .routes import profile

admin_router = APIRouter()

# Include all admin routes
admin_router.include_router(profile.router)