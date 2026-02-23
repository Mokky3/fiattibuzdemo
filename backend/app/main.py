from fastapi import FastAPI, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
from typing import Dict
import time
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment from repo root .env and backend/.env as early as possible
_repo_root = Path(__file__).resolve().parents[2]
_backend_dir = Path(__file__).resolve().parents[1]
_env_paths = [
    _repo_root / ".env",
    _backend_dir / ".env",
]
for _env_path in _env_paths:
    try:
        if _env_path.exists():
            load_dotenv(dotenv_path=str(_env_path), encoding="utf-8")
    except Exception:
        # Ignore missing/invalid env files to keep startup resilient
        pass

# Import database session
from app.db.session import SessionLocal, engine

# Import models to ensure they're registered with SQLAlchemy
from app.db.base_class import Base
# Import all models to ensure they're registered
# from app.common.models import *  # Temporarily disabled due to relationship issues
# Safe model imports - only import what we need for basic functionality
from app.common.models.user import User
from app.common.models.admin import AuditTrail
from app.common.models.hospital import Hospital
from app.common.models.appointment import Appointment
from app.common.models.doctor import GeneralReport
from app.common.models.system_metrics import SystemMetrics
# Import medication models for API
from app.common.models.medication_ref import MedicationProduct, MNN, DosageForm, Route, Unit, Manufacturer, CategoryTag


# Import routers from admin portal
from app.portals.admin.routes.dashboard import router as dashboard_router
from app.portals.admin.routes.profile import router as profile_router
from app.portals.admin.routes.settings import router as settings_router
from app.portals.admin.routes.users import router as users_router
from app.portals.admin.routes.user_management import router as user_management_router
from app.portals.admin.routes.user_stats import router as user_stats_router
from app.portals.admin.routes.clinics import router as clinics_router
from app.portals.admin.routes.clinics_management import router as clinics_management_router
from app.portals.admin.routes.logs import router as logs_router
from app.portals.admin.routes.auth_secure import router as admin_auth_secure_router
from app.portals.admin.routes.user_invitations import router as user_invitations_router
# Import missing admin routes
from app.portals.admin.routes.rbac_enhanced import router as admin_rbac_router
from app.portals.admin.routes.audit_logs_enhanced import router as admin_audit_router
from app.portals.admin.routes.global_settings_enhanced import router as admin_global_settings_router
from app.portals.admin.routes.fhir_registry_enhanced import router as admin_fhir_registry_router

# Import routers from doctor portal
from app.portals.doctor.routes.appointments_enhanced import router as doctor_appointments_router
from app.portals.doctor.routes.dashboard import router as doctor_dashboard_router
from app.portals.doctor.routes.health import router as health_router
from app.portals.doctor.routes.messages_enhanced import router as doctor_messages_router
from app.portals.doctor.routes.patients import router as doctor_patients_router
from app.portals.doctor.routes.prescriptions import router as doctor_prescriptions_router
from app.portals.doctor.routes.profile import router as doctor_profile_router
from app.portals.doctor.routes.reports_enhanced import router as doctor_reports_router, medical_reports_router
from app.portals.doctor.routes.general_reports import router as doctor_general_reports_router
from app.portals.doctor.routes.test_orders_referrals import router as doctor_test_orders_referrals_router
from app.portals.doctor.routes.settings import router as doctor_settings_router
from app.portals.doctor.routes.stats import router as doctor_stats_router
from app.portals.doctor.routes.auth_secure import router as doctor_auth_secure_router
from app.portals.doctor.routes.imaging import router as doctor_imaging_router

# Import routers from patient portal
from app.portals.patient.routes.appointments import router as patient_appointments_router
from app.portals.patient.routes.doctorsearch_enhanced import router as patient_doctorsearch_router
from app.portals.patient.routes.prescription_enhanced import router as patient_prescriptions_router
from app.portals.patient.routes.profile_enhanced import router as patient_profile_router
from app.portals.patient.routes.records_enhanced import router as patient_records_router
from app.portals.patient.routes.hospitals_public import router as patient_hospitals_router
from app.portals.patient.routes.settings import router as patient_settings_router
from app.portals.patient.routes.notifications import router as patient_notifications_router
from app.portals.patient.routes.messages_enhanced import router as patient_messages_router
from app.portals.patient.routes.privacy import router as patient_privacy_router
from app.portals.patient.routes.security import router as patient_security_router
from app.portals.patient.routes.auth_secure import router as patient_auth_secure_router
from app.portals.patient.routes.fhir_export_erase_enhanced import router as patient_fhir_router
from app.portals.patient.routes.auth_public import router as patient_auth_public_router
from app.portals.patient.routes.medical_history import router as patient_medical_history_router
from app.portals.patient.routes.imaging import router as patient_imaging_router

# Unified auth
from app.portals.auth.routes.public import router as unified_auth_public_router
from app.portals.auth.routes.password_reset import router as password_reset_router
from app.portals.auth.routes.registration import router as registration_router

# Import routers from reception portal
from app.portals.reception.routes.auth import router as reception_auth_router
from app.portals.reception.routes.dashboard import router as reception_dashboard_router
from app.portals.reception.routes.appointments_enhanced import router as reception_appointments_router
from app.portals.reception.routes.register_enhanced import router as reception_register_router
from app.portals.reception.routes.simple_register import router as reception_simple_register_router
from app.portals.reception.routes.messages_enhanced import router as reception_messages_router
from app.portals.reception.routes.profile import router as reception_profile_router
from app.portals.reception.routes.settings import router as reception_settings_router
from app.portals.reception.routes.patients import router as reception_patients_router

# Import secure nurse portal router
from app.portals.nurse.routes.auth_secure import router as nurse_auth_secure_router
from app.portals.nurse.routes.profile import router as nurse_profile_router
from app.portals.nurse.routes.settings import router as nurse_settings_router
from app.portals.nurse.routes.patients import router as nurse_patients_router
from app.portals.nurse.routes.vitals import router as nurse_vitals_router
from app.portals.nurse.routes.medications import router as nurse_medications_router
from app.portals.nurse.routes.dashboard import router as nurse_dashboard_router
from app.portals.nurse.routes.tasks import router as nurse_tasks_router
from app.portals.nurse.routes.messages_enhanced import router as nurse_messages_router

# TODO: Import routers from nurse portal when implemented
# from app.portals.nurse.routes.dashboard import router as nurse_dashboard_router
# from app.portals.nurse.routes.patients import router as nurse_patients_router
 

# from app.portals.nurse.routes.vitals import router as nurse_vitals_router

# Import routers from lab portal
from app.portals.lab.routes.auth_secure import router as lab_auth_secure_router
from app.portals.lab.routes.dashboard import router as lab_dashboard_router
from app.portals.lab.routes.messages_enhanced import router as lab_messages_router
from app.portals.lab.routes.orders import router as lab_orders_router
from app.portals.lab.routes.patients import router as lab_patients_router
from app.portals.lab.routes.profile import router as lab_profile_router
from app.portals.lab.routes.reports import router as lab_reports_router
from app.portals.lab.routes.results import router as lab_results_router
from app.portals.lab.routes.settings import router as lab_settings_router

# Import routers from radiology portal
from app.portals.radiology.routes.profile import router as radiology_profile_router
from app.portals.radiology.routes.settings import router as radiology_settings_router
from app.portals.radiology.routes.auth_secure import router as radiology_auth_secure_router
from app.portals.radiology.routes.dashboard import router as radiology_dashboard_router
from app.portals.radiology.routes.messages import router as radiology_messages_router
# TODO: Import additional radiology routers when implemented
# from app.portals.radiology.routes.dashboard import router as radiology_dashboard_router
from app.portals.radiology.routes.studies import router as radiology_studies_router
from app.portals.radiology.routes.templates import router as radiology_templates_router
from app.portals.radiology.routes.worklist import router as radiology_worklist_router
from app.portals.radiology.routes.pacs import router as radiology_pacs_router
from app.portals.radiology.routes.reports import router as radiology_reports_router

# Import medication API routes
from app.api.v1.medications import router as medications_router
from app.api.v1.telegram_bot import router as telegram_bot_router
from app.api.v1.telegram_gateway import router as telegram_gateway_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
# Reduce SQLAlchemy engine logging to WARNING (must be after basicConfig)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.dialects").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up EHR Backend Application...")
    
    # Initialize database connection
    try:
        # Test database connection - tables already exist, no need to create them
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("SELECT 1"))  # Simple test query
        logger.info("Database connection established successfully")
    except Exception as e:
        logger.error(f"Failed to connect to database: {str(e)}")
        # Don't raise the exception to allow server to start
        # raise
    
    # TODO: Run migrations (when using Alembic)
    # TODO: Initialize cache (Redis/Memcached)
    # TODO: Initialize background tasks (Celery/BackgroundTasks)
    # TODO: Initialize message queue (RabbitMQ/Kafka)
    
    yield
    
    # Shutdown
    logger.info("Shutting down EHR Backend Application...")
    
    # Close database connections
    try:
        engine.dispose()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error closing database connections: {str(e)}")
    
    # TODO: Clean up cache connections
    # TODO: Cancel background tasks
    # TODO: Close message queue connections

# Create FastAPI application
app = FastAPI(
    title="EHR Backend API",
    description="Electronic Health Records System Backend API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://zamez.netlify.app",  # Your production site
        # Add your Firebase hosting URL if you're using it too
        "https://fiattib.web.app",
        "https://fiattib.firebaseapp.com",
        "https://fiattib.uz",  # Production domain
        "https://www.fiattib.uz",  # Production domain with www
    ],
    allow_origin_regex=r"https://.*\.netlify\.app",  # All Netlify previews
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ================================
# CORS Helper Function
# ================================
def get_cors_headers(origin: str) -> dict:
    """Get CORS headers for the given origin."""
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://zamez.netlify.app",
        "https://fiattib.web.app",
        "https://fiattib.firebaseapp.com",
        "https://fiattib.uz",  # Production domain
        "https://www.fiattib.uz",  # Production domain with www
    ]
    
    if origin and (origin in allowed_origins or origin.endswith(".netlify.app")):
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    return {}

# Add OPTIONS handler for CORS preflight
@app.options("/{rest_of_path:path}")
async def options_handler(request: Request, rest_of_path: str):
    """Handle CORS preflight requests"""
    origin = request.headers.get("origin")
    headers = {}
    
    # Check if origin is allowed
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://zamez.netlify.app",
        "https://fiattib.web.app",
        "https://fiattib.firebaseapp.com",
        "https://fiattib.uz",
        "https://www.fiattib.uz",
    ]
    
    if origin:
        if origin in allowed_origins or origin.endswith(".netlify.app"):
            headers = {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Max-Age": "3600",
            }
    
    from fastapi.responses import Response
    return Response(status_code=204, headers=headers)

# Add simple health check
@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok", "message": "Backend is running"}

# TODO: Add security middleware when Redis is available
# from app.common.security.middleware import SecurityMiddleware
# app.add_middleware(SecurityMiddleware)

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Check if the API is running"""
    return {
        "status": "healthy",
        "service": "EHR Backend API",
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to EHR Backend API",
        "documentation": "/api/docs",
        "health": "/health"
    }

# API version endpoint
@app.get("/api/v1", tags=["API Info"])
async def api_info():
    """Get API information"""
    return {
        "version": "1.0.0",
        "endpoints": {
            "admin": "/api/v1/admin",
            "doctor": "/api/v1/doctor",
            "nurse": "/api/v1/nurse",
            "patient": "/api/v1/patient",
            "receptionist": "/api/v1/receptionist",
            "lab": "/api/v1/lab",
            "radiology": "/api/v1/radiology"
        }
    }

# ================================
# Admin Portal Routes
# ================================
app.include_router(
    dashboard_router,
    prefix="/api/v1/admin",
    tags=["Admin Dashboard"]
)

app.include_router(
    profile_router,
    prefix="/api/v1/admin",
    tags=["Admin Profile"]
)

app.include_router(
    settings_router,
    prefix="/api/v1/admin",
    tags=["Admin Settings"]
)

app.include_router(
    users_router,
    prefix="/api/v1/admin",
    tags=["Admin Users"]
)

app.include_router(
    user_invitations_router,
    prefix="/api/v1",
    tags=["User Invitations"]
)

app.include_router(
    user_management_router,
    prefix="/api/v1/admin",
    tags=["Admin User Management"]
)

app.include_router(
    user_stats_router,
    prefix="/api/v1/admin",
    tags=["Admin User Statistics"]
)

app.include_router(
    clinics_router,
    prefix="/api/v1/admin/clinics",
    tags=["Admin Clinics"]
)

app.include_router(
    clinics_management_router,
    prefix="/api/v1/admin",
    tags=["Admin Clinics Management"]
)

app.include_router(
    logs_router,
    prefix="/api/v1/admin",
    tags=["Admin System Logs"]
)

# Secure Admin Portal Routes
app.include_router(
    admin_auth_secure_router,
    prefix="/api/v1/admin",
    tags=["Admin ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Secure Authentication"]
)

# Enhanced Admin Portal Routes
app.include_router(
    admin_rbac_router,
    prefix="/api/v1/admin",
    tags=["Admin ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· RBAC & Tenancy"]
)

app.include_router(
    admin_audit_router,
    prefix="/api/v1/admin",
    tags=["Admin ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Audit & Logs"]
)

# Temporarily disabled global settings router
# app.include_router(
#     admin_global_settings_router,
#     prefix="/api/v1/admin",
#     tags=["Admin · Global Settings"]
# )

app.include_router(
    admin_fhir_registry_router,
    prefix="/api/v1/admin",
    tags=["Admin ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· FHIR Registry"]
)

# ================================
# Unified Auth Routes
# ================================
app.include_router(
    unified_auth_public_router,
    prefix="/api/v1",
    tags=["Auth"]
)
app.include_router(
    unified_auth_public_router,
    prefix="",
    tags=["Auth"]
)

# Password Reset Routes
# ================================
app.include_router(
    password_reset_router,
    prefix="/api/v1",
    tags=["Password Reset"]
)

# Registration Routes
# ================================
app.include_router(
    registration_router,
    prefix="/api/v1",
    tags=["Registration"]
)

# ================================
# Doctor Portal Routes
# ================================
app.include_router(
    doctor_dashboard_router,
    prefix="/api/v1/doctor/dashboard",
    tags=["Doctor Dashboard"]
)

app.include_router(
    doctor_appointments_router,
    prefix="/api/v1/doctor",
    tags=["Doctor Appointments"]
)

app.include_router(
    health_router,
    prefix="/api/v1/doctor",
    tags=["Doctor Health Check"]
)

app.include_router(
    doctor_messages_router,
    prefix="/api/v1/doctor",
    tags=["Doctor Messages"]
)

app.include_router(
    doctor_patients_router,
    prefix="/api/v1/doctor",
    tags=["Doctor Patients"]
)

app.include_router(
    doctor_prescriptions_router,
    prefix="/api/v1/doctor",
    tags=["Doctor Prescriptions"]
)

app.include_router(
    doctor_profile_router,
    prefix="/api/v1/doctor",
    tags=["Doctor Profile"]
)

app.include_router(
    doctor_reports_router,
    prefix="/api/v1/doctor",
    tags=["Doctor Reports"]
)

app.include_router(
    medical_reports_router,
    prefix="/api/v1",
    tags=["Medical Reports"]
)

app.include_router(
    doctor_general_reports_router,
    prefix="/api/v1/doctor",
    tags=["Doctor General Reports"]
)

app.include_router(
    doctor_test_orders_referrals_router,
    prefix="/api/v1/doctor",
    tags=["Doctor Test Orders & Referrals"]
)

app.include_router(
    doctor_settings_router,
    prefix="/api/v1/doctor",
    tags=["Doctor Settings"]
)

app.include_router(
    doctor_stats_router,
    prefix="/api/v1/doctor",
    tags=["Doctor Statistics"]
)

# Secure Doctor Portal Routes
app.include_router(
    doctor_auth_secure_router,
    prefix="/api/v1/doctor",
    tags=["Doctor ÃƒÆ'Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ'Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Secure Authentication"]
)

app.include_router(
    doctor_imaging_router,
    prefix="/api/v1/doctor",
    tags=["Doctor · Medical Imaging"]
)

# ================================
# Patient Portal Routes
# ================================
app.include_router(
    patient_appointments_router,
    prefix="/api/v1/patient/appointments",
    tags=["Patient Appointments"]
)

app.include_router(
    patient_prescriptions_router,
    prefix="/api/v1/patient/prescriptions",
    tags=["Patient Prescriptions"]
)

app.include_router(
    patient_records_router,
    prefix="/api/v1/patient/records",
    tags=["Patient Records"]
)

# Register specific routes BEFORE generic routes to avoid conflicts
app.include_router(
    patient_settings_router,
    prefix="/api/v1/patient",
    tags=["Patient Settings"]
)

app.include_router(
    patient_hospitals_router,
    prefix="/api/v1/patient",
    tags=["Patient Hospitals"]
)

app.include_router(
    patient_profile_router,
    prefix="/api/v1/patient",
    tags=["Patient Profile"]
)

app.include_router(
    patient_medical_history_router,
    prefix="/api/v1/patient/medical-history",
    tags=["Patient Medical History"]
)

app.include_router(
    patient_notifications_router,
    prefix="/api/v1/patient",
    tags=["Patient Notifications"]
)

app.include_router(
    patient_messages_router,
    prefix="/api/v1/patient",
    tags=["Patient Messages"]
)

app.include_router(
    patient_privacy_router,
    prefix="/api/v1/patient",
    tags=["Patient Privacy"]
)

app.include_router(
    patient_security_router,
    prefix="/api/v1/patient",
    tags=["Patient Security"]
)

# Register generic routes LAST to avoid catching specific paths
app.include_router(
    patient_doctorsearch_router,
    prefix="/api/v1/patient",
    tags=["Patient Doctor Search"]
)

# Public Patient Auth Routes (register/login)
app.include_router(
    patient_auth_public_router,
    prefix="/api/v1/patient",
    tags=["Patient Auth"]
)

# Secure Patient Portal Routes
app.include_router(
    patient_auth_secure_router,
    prefix="/api/v1/patient",
    tags=["Patient ÃƒÆ'Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ'Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ'Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ'Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Secure Authentication"]
)

app.include_router(
    patient_imaging_router,
    prefix="/api/v1/patient",
    tags=["Patient · Medical Imaging"]
)

# ================================
# Reception Portal Routes
# ================================
app.include_router(
    reception_auth_router,
    prefix="/api/v1/reception",
    tags=["Reception ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Secure Authentication"]
)

app.include_router(
    reception_dashboard_router,
    prefix="/api/v1/reception",
    tags=["Reception Dashboard"]
)

app.include_router(
    reception_profile_router,
    prefix="/api/v1/reception/profile",
    tags=["Reception Profile"]
)

app.include_router(
    reception_register_router,
    prefix="/api/v1/reception",
    tags=["Reception Patient Registration"]
)

app.include_router(
    reception_appointments_router,
    prefix="/api/v1/reception",
    tags=["Reception Appointments"]
)

app.include_router(
    reception_simple_register_router,
    prefix="/api/v1/reception",
    tags=["Reception Simple Registration"]
)

app.include_router(
    reception_messages_router,
    prefix="/api/v1/reception",
    tags=["Reception Messages"]
)

app.include_router(
    reception_settings_router,
    prefix="/api/v1/reception",
    tags=["Reception Settings"]
)

app.include_router(
    reception_patients_router,
    prefix="/api/v1/reception/patients",
    tags=["Reception Patients"]
)

# Secure Reception Portal Routes (merged into reception_auth_router)

# Secure Nurse Portal Routes
app.include_router(
    nurse_auth_secure_router,
    prefix="/api/v1/nurse",
    tags=["Nurse Secure Authentication"]
)

app.include_router(
    nurse_settings_router,
    prefix="/api/v1/nurse",
    tags=["Nurse Settings"]
)

app.include_router(
    nurse_patients_router,
    prefix="/api/v1/nurse",
    tags=["Nurse Patients"]
)

app.include_router(
    nurse_vitals_router,
    prefix="/api/v1/nurse",
    tags=["Nurse Vitals"]
)

app.include_router(
    nurse_profile_router,
    prefix="/api/v1/nurse",
    tags=["Nurse Profile"]
)

app.include_router(
    nurse_dashboard_router,
    prefix="/api/v1/nurse",
    tags=["Nurse Dashboard"]
)

app.include_router(
    nurse_tasks_router,
    prefix="/api/v1/nurse",
    tags=["Nurse Tasks"]
)

app.include_router(
    nurse_medications_router,
    prefix="/api/v1/nurse",
    tags=["Nurse Medications"]
)

app.include_router(
    nurse_messages_router,
    prefix="/api/v1/nurse",
    tags=["Nurse Messages"]
)

# TODO: Include additional Nurse Portal routes when implemented
# app.include_router(
#     nurse_dashboard_router,
#     prefix="/api/v1/nurse",
#     tags=["Nurse Dashboard"]
# )
# app.include_router(
#     nurse_patients_router,
#     prefix="/api/v1/nurse",
#     tags=["Nurse Patients"]
# )
# app.include_router(
#     nurse_vitals_router,
#     prefix="/api/v1/nurse",
#     tags=["Nurse Vitals"]
# )

# TODO: Include Lab Portal routes when implemented
# app.include_router(
# Lab Portal Routes
app.include_router(
    lab_auth_secure_router,
    prefix="/api/v1/lab",
    tags=["Lab ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Secure Authentication"]
)
app.include_router(
    lab_settings_router,
    prefix="/api/v1/lab",
    tags=["Lab Settings"]
)

app.include_router(
    lab_orders_router,
    prefix="/api/v1/lab",
    tags=["Lab Orders"]
)

app.include_router(
    lab_reports_router,
    prefix="/api/v1/lab",
    tags=["Lab Reports"]
)

app.include_router(
    lab_results_router,
    prefix="/api/v1/lab",
    tags=["Lab Results"]
)

app.include_router(
    lab_patients_router,
    prefix="/api/v1/lab",
    tags=["Lab Patients"]
)

app.include_router(
    lab_profile_router,
    prefix="/api/v1/lab",
    tags=["Lab Profile"]
)

app.include_router(
    lab_settings_router,
    prefix="/api/v1/lab",
    tags=["Lab Settings"]
)

app.include_router(
    lab_dashboard_router,
    prefix="/api/v1/lab",
    tags=["Lab Dashboard"]
)

app.include_router(
    lab_messages_router,
    prefix="/api/v1/lab",
    tags=["Lab Messages"]
)

# app.include_router(
#     lab_dashboard_router,
#     prefix="/api/v1/lab",
#     tags=["Lab Dashboard"]
# )
# app.include_router(
#     lab_orders_router,
#     prefix="/api/v1/lab",
#     tags=["Lab Orders"]
# )
# app.include_router(
#     lab_results_router,
#     prefix="/api/v1/lab",
#     tags=["Lab Results"]
# )

# Radiology Portal Routes
app.include_router(
    radiology_settings_router,
    prefix="/api/v1/radiology",
    tags=["Radiology Settings"]
)

app.include_router(
    radiology_profile_router,
    prefix="/api/v1/radiology",
    tags=["Radiology Profile"]
)

app.include_router(
    radiology_auth_secure_router,
    prefix="/api/v1/radiology",
    tags=["Radiology ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Secure Authentication"]
)
app.include_router(
    radiology_dashboard_router,
    prefix="/api/v1/radiology",
    tags=["Radiology Dashboard"]
)
app.include_router(
    radiology_studies_router,
    prefix="/api/v1/radiology",
    tags=["Radiology Studies"]
)

app.include_router(
    radiology_templates_router,
    prefix="/api/v1/radiology",
    tags=["Radiology Templates"]
)

app.include_router(
    radiology_worklist_router,
    prefix="/api/v1/radiology",
    tags=["Radiology Worklist"]
)
app.include_router(
    radiology_messages_router,
    prefix="/api/v1/radiology",
    tags=["Radiology Messages"]
)

app.include_router(
    radiology_reports_router,
    prefix="/api/v1/radiology",
    tags=["Radiology Reports"]
)

app.include_router(
    radiology_pacs_router,
    prefix="/api/v1/radiology",
    tags=["Radiology PACS"]
)

# ================================
# Medication API Routes
# ================================
app.include_router(
    medications_router,
    prefix="/api/v1",
    tags=["Medications"]
)

# Telegram Bot Integration
app.include_router(
    telegram_bot_router,
    prefix="/api/v1",
    tags=["Integrations · Telegram Bot"]
)

# Telegram Conversational Gateway
app.include_router(
    telegram_gateway_router,
    prefix="/api/v1",
    tags=["Integrations · Telegram Gateway"]
)

# ================================
# Static Files
# ================================
# Mount static files for uploaded logos
# Create uploads directory if it doesn't exist
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# ================================
# Exception Handlers
# ================================
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions"""
    logger.error(f"HTTP Exception: {exc.detail}")
    # Ensure JSON serializable content
    content = exc.detail
    try:
        from datetime import datetime
        import json
        json.dumps(content)
    except Exception:
        # Fallback: stringified detail
        content = {"error": str(exc.detail)}
    
    # Get origin from request for CORS
    origin = request.headers.get("origin")
    headers = get_cors_headers(origin) if origin else {}
    
    return JSONResponse(
        status_code=exc.status_code,
        content=content,
        headers=headers
    )

@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """Handle validation errors"""
    logger.error(f"Validation error: {str(exc)}")
    
    # Get origin from request for CORS
    origin = request.headers.get("origin")
    headers = get_cors_headers(origin) if origin else {}
    
    return JSONResponse(
        status_code=422,
        content={
            "error": str(exc),
            "status_code": 422
        },
        headers=headers
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    # Get origin from request for CORS
    origin = request.headers.get("origin")
    headers = get_cors_headers(origin) if origin else {}
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500,
            "detail": str(exc) if logger.level <= logging.DEBUG else None
        },
        headers=headers
    )

# ================================
# Middleware
# ================================
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests and ensure CORS headers"""
    logger.info(f"Request: {request.method} {request.url.path}")
    
    # Handle OPTIONS preflight requests explicitly
    if request.method == "OPTIONS":
        origin = request.headers.get("origin")
        allowed_origins = [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            "https://zamez.netlify.app",
            "https://fiattib.web.app",
            "https://fiattib.firebaseapp.com",
            "https://fiattib.uz",
            "https://www.fiattib.uz",
        ]
        
        from fastapi.responses import Response
        headers = {}
        if origin and (origin in allowed_origins or origin.endswith(".netlify.app")):
            headers = {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Max-Age": "3600",
            }
        return Response(status_code=204, headers=headers)
    
    # Time the request
    start_time = time.time()
    
    # Process the request
    response = await call_next(request)
    
    # Calculate process time
    process_time = time.time() - start_time
    
    # Log response details
    logger.info(f"Response: {response.status_code} - Process time: {process_time:.3f}s")
    
    # Add custom headers
    response.headers["X-Process-Time"] = str(process_time)
    
    # Ensure CORS headers are present in response
    origin = request.headers.get("origin")
    if origin:
        allowed_origins = [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            "https://zamez.netlify.app",
            "https://fiattib.web.app",
            "https://fiattib.firebaseapp.com",
            "https://fiattib.uz",
            "https://www.fiattib.uz",
        ]
        if origin in allowed_origins or origin.endswith(".netlify.app"):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
    
    return response

# ================================
# Database dependency
# ================================
def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Development-only endpoints (remove in production)
if __name__ == "__main__":
    import uvicorn
    
    # Run the application
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
