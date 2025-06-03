from fastapi import FastAPI
from app.db.database import Base, engine

# ✅ Import routers
from app.routes import patient, doctor, appointment, auth, dashboard

# ✅ Import models (for table creation only, not for .router)
from app.models import patient as patient_model
from app.models import doctor as doctor_model
from app.models import appointment as appointment_model
from app.models import user as user_model
from app.routes import medical_history
from app.routes import prescription
from app.models import observation as observation_model  # 👈 Add this line



app = FastAPI()

# Create DB tables
Base.metadata.create_all(bind=engine)

# Register routers
app.include_router(patient.router)
app.include_router(doctor.router)
app.include_router(appointment.router)
app.include_router(auth.router)
app.include_router(medical_history.router)
app.include_router(prescription.router)
app.include_router(dashboard.router)




@app.get("/")
def read_root():
    return {"message": "EHR Backend is running"}
