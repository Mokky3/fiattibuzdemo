from app.db.session import SessionLocal
from app.models import (
    User, Patient, Doctor, Appointment, MedicalHistory, 
    UserRole, Gender, BloodType, AppointmentStatus
)
from datetime import datetime, date, time
import hashlib

def hash_password(password: str) -> str:
    """Simple password hashing for demo purposes"""
    return hashlib.sha256(password.encode()).hexdigest()

def seed_database():
    """Add sample data to the database"""
    db = SessionLocal()
    
    try:
        # Create sample users (staff)
        print("👥 Creating sample users...")
        
        # Admin user
        admin_user = User(
            username="admin",
            hashed_password=hash_password("admin123"),
            role=UserRole.ADMIN,
            name="System Administrator",
            email="admin@ehr.uz",
            first_name="System",
            last_name="Administrator",
            is_active=True
        )
        db.add(admin_user)
        
        # Doctor user
        doctor_user = User(
            username="dr_smith",
            hashed_password=hash_password("doctor123"),
            role=UserRole.DOCTOR,
            name="Dr. John Smith",
            email="john.smith@ehr.uz",
            first_name="John",
            last_name="Smith",
            license_number="DOC-2024-001",
            specialization="Cardiology",
            is_active=True
        )
        db.add(doctor_user)
        
        # Nurse user
        nurse_user = User(
            username="nurse_jane",
            hashed_password=hash_password("nurse123"),
            role=UserRole.NURSE,
            name="Jane Doe",
            email="jane.doe@ehr.uz",
            first_name="Jane",
            last_name="Doe",
            license_number="NUR-2024-001",
            is_active=True
        )
        db.add(nurse_user)
        
        db.commit()
        print("✅ Users created successfully!")
        
        # Create sample patients
        print("🏥 Creating sample patients...")
        
        patient1 = Patient(
            full_name="Alisher Karimov",
            gender=Gender.MALE,
            birth_date=date(1985, 5, 15),
            phone="+998901234567",
            email="alisher@example.com",
            address="Tashkent, Mirzo Ulugbek district",
            blood_type=BloodType.A_POSITIVE,
            assigned_doctor_id=doctor_user.id,
            pinfl="12345678901234"
        )
        db.add(patient1)
        
        patient2 = Patient(
            full_name="Madina Saidova",
            gender=Gender.FEMALE,
            birth_date=date(1990, 8, 22),
            phone="+998909876543",
            email="madina@example.com",
            address="Tashkent, Shaykhantaur district",
            blood_type=BloodType.B_POSITIVE,
            assigned_doctor_id=doctor_user.id,
            pinfl="98765432109876"
        )
        db.add(patient2)
        
        db.commit()
        print("✅ Patients created successfully!")
        
        # Create sample doctor profile
        print("👨‍⚕️ Creating doctor profile...")
        
        doctor_profile = Doctor(
            user_id=doctor_user.id,
            full_name="Dr. John Smith",
            specialty="Cardiology",
            phone="+998901111111",
            email="john.smith@ehr.uz",
            license_number="DOC-2024-001",
            years_of_experience=15,
            education="MD from Harvard Medical School",
            languages_spoken="English, Russian, Uzbek",
            consultation_fee=500000,  # 500,000 UZS
            is_available=True
        )
        db.add(doctor_profile)
        
        db.commit()
        print("✅ Doctor profile created successfully!")
        
        # Create sample appointments
        print("📅 Creating sample appointments...")
        
        appointment1 = Appointment(
            patient_id=patient1.id,
            doctor_id=doctor_user.id,
            appointment_date=date(2024, 7, 10),
            appointment_time=time(9, 0),
            reason="Regular checkup",
            status=AppointmentStatus.SCHEDULED,
            duration_minutes=30
        )
        db.add(appointment1)
        
        appointment2 = Appointment(
            patient_id=patient2.id,
            doctor_id=doctor_user.id,
            appointment_date=date(2024, 7, 12),
            appointment_time=time(14, 30),
            reason="Consultation",
            status=AppointmentStatus.SCHEDULED,
            duration_minutes=45
        )
        db.add(appointment2)
        
        db.commit()
        print("✅ Appointments created successfully!")
        
        # Create sample medical history
        print("📋 Creating sample medical history...")
        
        medical_record = MedicalHistory(
            patient_id=patient1.id,
            created_by_id=doctor_user.id,
            visit_date=datetime(2024, 6, 15, 10, 0),
            chief_complaint="Chest pain",
            description="Patient reports chest pain during exercise",
            diagnosis="Stable angina",
            treatment_plan="Medication and lifestyle changes",
            vital_signs={"bp": "140/90", "pulse": 78, "temp": 36.5}
        )
        db.add(medical_record)
        
        db.commit()
        print("✅ Medical history created successfully!")
        
        print("\n🎉 Database seeded successfully!")
        print("\n🔑 Login credentials:")
        print("Admin: username=admin, password=admin123")
        print("Doctor: username=dr_smith, password=doctor123")
        print("Nurse: username=nurse_jane, password=nurse123")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()