# main.py
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import Base, engine

# ✅ Import routers with correct app prefix
from app.routes import patient, doctor, appointment, auth, dashboard, medical_history, prescription

# ✅ Import models (for table creation only, not for .router)
try:
    from app.models import patient as patient_model
    from app.models import doctor as doctor_model
    from app.models import appointment as appointment_model
    from app.models import user as user_model
    from app.models import medical_history as medical_history_model
    from app.models import prescription as prescription_model
    from app.models import observation as observation_model
    print("✅ All models imported successfully")
except ImportError as e:
    print(f"⚠️ Some models not available: {e}")

app = FastAPI(
    title="Medical Dashboard API",
    description="Backend API for Medical Dashboard EHR System",
    version="1.0.0"
)

# ✅ Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Create DB tables
try:
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")
except Exception as e:
    print(f"⚠️ Database table creation issue: {e}")

# Register routers
app.include_router(patient.router, prefix="/api/v1", tags=["patients"])
app.include_router(doctor.router, prefix="/api/v1", tags=["doctors"])
app.include_router(appointment.router, prefix="/api/v1", tags=["appointments"])
app.include_router(auth.router, prefix="/api/v1", tags=["authentication"])
app.include_router(medical_history.router, prefix="/api/v1", tags=["medical-history"])
app.include_router(prescription.router, prefix="/api/v1", tags=["prescriptions"])
app.include_router(dashboard.router, prefix="/api/v1", tags=["dashboard"])

@app.get("/")
def read_root():
    return {
        "message": "EHR Backend is running",
        "version": "1.0.0",
        "docs": "/docs",
        "api_prefix": "/api/v1"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ehr-backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)