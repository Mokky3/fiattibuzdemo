from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from typing import Dict
import time

# Import database session
from app.db.session import SessionLocal, engine

# Import models to ensure they're registered with SQLAlchemy
from app.db.base_class import Base
# Import all models to ensure they're registered
from app.common.models import *

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

# Import routers from doctor portal
from app.portals.doctor.routes.appointments import router as doctor_appointments_router
from app.portals.doctor.routes.dashboard import router as doctor_dashboard_router
from app.portals.doctor.routes.health import router as health_router
from app.portals.doctor.routes.messages import router as doctor_messages_router
from app.portals.doctor.routes.patients import router as doctor_patients_router
from app.portals.doctor.routes.prescriptions import router as doctor_prescriptions_router
from app.portals.doctor.routes.profile import router as doctor_profile_router
from app.portals.doctor.routes.reports import router as doctor_reports_router
from app.portals.doctor.routes.settings import router as doctor_settings_router
from app.portals.doctor.routes.stats import router as doctor_stats_router

# Import routers from patient portal
from app.portals.patient.routes.appointments import router as patient_appointments_router
from app.portals.patient.routes.doctorsearch import router as patient_doctorsearch_router
from app.portals.patient.routes.prescription import router as patient_prescriptions_router
from app.portals.patient.routes.profile import router as patient_profile_router
from app.portals.patient.routes.records import router as patient_records_router
from app.portals.patient.routes.settings import router as patient_settings_router

# Import routers from reception portal
from app.portals.reception.routes.auth import router as reception_auth_router
from app.portals.reception.routes.dashboard import router as reception_dashboard_router
from app.portals.reception.routes.appointments import router as reception_appointments_router
from app.portals.reception.routes.register import router as reception_register_router
from app.portals.reception.routes.messages import router as reception_messages_router
from app.portals.reception.routes.profile import router as reception_profile_router
from app.portals.reception.routes.settings import router as reception_settings_router

# TODO: Import routers from nurse portal when implemented
# from app.portals.nurse.routes.dashboard import router as nurse_dashboard_router
# from app.portals.nurse.routes.patients import router as nurse_patients_router
# from app.portals.nurse.routes.vitals import router as nurse_vitals_router

# TODO: Import routers from lab portal when implemented
# from app.portals.lab.routes.dashboard import router as lab_dashboard_router
# from app.portals.lab.routes.orders import router as lab_orders_router
# from app.portals.lab.routes.results import router as lab_results_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up EHR Backend Application...")
    
    # Initialize database connection
    try:
        # Test database connection and create tables
        Base.metadata.create_all(bind=engine)
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
        # Add production URLs here
        # "https://your-frontend-domain.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
            "lab": "/api/v1/lab"
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
    prefix="/api/v1/admin",
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

# ================================
# Doctor Portal Routes
# ================================
app.include_router(
    doctor_appointments_router,
    prefix="/api/v1/doctor",
    tags=["Doctor Appointments"]
)

app.include_router(
    doctor_dashboard_router,
    prefix="/api/v1/doctor",
    tags=["Doctor Dashboard"]
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
    doctor_settings_router,
    prefix="/api/v1/doctor",
    tags=["Doctor Settings"]
)

app.include_router(
    doctor_stats_router,
    prefix="/api/v1/doctor",
    tags=["Doctor Statistics"]
)

# ================================
# Patient Portal Routes
# ================================
app.include_router(
    patient_appointments_router,
    prefix="/api/v1/patient",
    tags=["Patient Appointments"]
)

app.include_router(
    patient_doctorsearch_router,
    prefix="/api/v1/patient",
    tags=["Patient Doctor Search"]
)

app.include_router(
    patient_prescriptions_router,
    prefix="/api/v1/patient",
    tags=["Patient Prescriptions"]
)

app.include_router(
    patient_profile_router,
    prefix="/api/v1/patient",
    tags=["Patient Profile"]
)

app.include_router(
    patient_records_router,
    prefix="/api/v1/patient",
    tags=["Patient Records"]
)

app.include_router(
    patient_settings_router,
    prefix="/api/v1/patient",
    tags=["Patient Settings"]
)

# ================================
# Reception Portal Routes
# ================================
app.include_router(
    reception_auth_router,
    prefix="/api/v1/reception",
    tags=["Reception Authentication"]
)

app.include_router(
    reception_dashboard_router,
    prefix="/api/v1/reception",
    tags=["Reception Dashboard"]
)

app.include_router(
    reception_appointments_router,
    prefix="/api/v1/reception",
    tags=["Reception Appointments"]
)

app.include_router(
    reception_register_router,
    prefix="/api/v1/reception",
    tags=["Reception Patient Registration"]
)

app.include_router(
    reception_messages_router,
    prefix="/api/v1/reception",
    tags=["Reception Messages"]
)

app.include_router(
    reception_profile_router,
    prefix="/api/v1/reception",
    tags=["Reception Profile"]
)

app.include_router(
    reception_settings_router,
    prefix="/api/v1/reception",
    tags=["Reception Settings"]
)

# TODO: Include Nurse Portal routes when implemented
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

# ================================
# Exception Handlers
# ================================
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions"""
    logger.error(f"HTTP Exception: {exc.detail}")
    return {
        "error": exc.detail,
        "status_code": exc.status_code
    }

@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """Handle validation errors"""
    logger.error(f"Validation error: {str(exc)}")
    return {
        "error": str(exc),
        "status_code": 422
    }

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return {
        "error": "Internal server error",
        "status_code": 500
    }

# ================================
# Middleware
# ================================
@app.middleware("http")
async def log_requests(request, call_next):
    """Log all incoming requests"""
    logger.info(f"Request: {request.method} {request.url.path}")
    
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