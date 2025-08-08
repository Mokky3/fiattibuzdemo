"""API Health Check Router
General health check endpoints for frontend connectivity testing
"""
from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["Health"])

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    message: str

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint for frontend to verify backend connectivity.
    This is called by your frontend's checkBackendHealth() function.
    """
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc).isoformat(),
        message="Backend server is running and accessible"
    )

@router.get("/status")
async def status_check():
    """
    Additional status endpoint with more detailed information
    """
    return {
        "status": "online",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "server": "EHR Backend API",
        "version": "1.0.0",
        "endpoints": {
            "patients": "/api/doctor/patients",
            "reports": "/api/doctor/reports", 
            "prescriptions": "/api/doctor/prescriptions",
            "profile": "/api/doctor/profile"
        }
    }