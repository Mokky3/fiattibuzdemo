"""
Database seeding script for Medical Dashboard
Run this to populate your database with sample data
"""

import sys
import os
from datetime import datetime, date, time, timedelta

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '.'))

from app.db.database import SessionLocal, engine
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.appointment import Appointment
from app.models.user import User
from app.models.medical_history import MedicalHistory

def clear_data(db):
    """Clear existing data (optional)"""
    print("🗑️  Clearing existing data...")
    db.query(MedicalHistory).delete()
    db.query(Appointment).delete()
    db.query(Doctor).delete()
    db.query(Patient).delete()
    db.query(User).delete()
    db.commit()
    print("✅ Data cleared!")

def seed_doctors(db):
    """Create sample doctors"""
    print("👨‍⚕️ Creating doctors...")
    
    doctors = [
        Doctor(
            first_name="Dr. Sarah",
            last_name="Johnson",
            email="sarah.johnson@hospital.com",
            phone="+1-555-0101",
            specialization="Cardiology",
            license_number="MD001",
            department="Cardiology"
        ),
        Doctor(
            first_name="Dr. Michael",
            last_name="Chen",
            email="michael.chen@hospital.com",
            phone="+1-555-0102",
            specialization="Psychiatry",
            license_number="MD002",
            department="Mental Health"
        ),
        Doctor(
            first_name="Dr. Emily",
            last_name="Rodriguez",
            email="emily.rodriguez@hospital.com",
            phone="+1-555-0103",
            specialization="General Practice",
            license_number="MD003",
            department="General Medicine"
        )
    ]
    
    for doctor in doctors:
        db.add(doctor)
    db.commit()
    print(f"✅ Created {len(doctors)} doctors")
    return doctors

def seed_patients(db):
    """Create sample patients"""
    print("👤 Creating patients...")
    
    patients = [
        Patient(
            first_name="Muhammad",
            last_name="Hariton",
            email="muhammad.hariton@email.com",
            phone="+1-555-0201",
            date_of_birth=date(1990, 5, 15),
            address="123 Main St, City, State 12345",
            emergency_contact="Jane Hariton - +1-555-0202"
        ),
        Patient(
            first_name="Ahmed",
            last_name="Ali",
            email="ahmed.ali@email.com",
            phone="+1-555-0203",
            date_of_birth=date(1985, 8, 22),
            address="456 Oak Ave, City, State 12345",
            emergency_contact="Sarah Ali - +1-555-0204"
        ),
        Patient(
            first_name="Fatima",
            last_name="Khan",
            email="fatima.khan@email.com",
            phone="+1-555-0205",
            date_of_birth=date(1992, 12, 3),
            address="789 Pine St, City, State 12345",
            emergency_contact="Omar Khan - +1-555-0206"
        )
    ]
    
    for patient in patients:
        db.add(patient)
    db.commit()
    print(f"✅ Created {len(patients)} patients")
    return patients

def seed_users(db):
    """Create sample users for messages"""
    print("👥 Creating users...")
    
    users = [
        User(
            name="Ava",
            email="ava@hospital.com",
            avatar="A",
            last_message="Patient records updated",
            is_active=True
        ),
        User(
            name="Mir",
            email="mir@hospital.com",
            avatar="M",
            last_message="Appointment scheduled",
            is_active=True
        ),
        User(
            name="Ali",
            email="ali@hospital.com",
            avatar="A",
            last_message="Lab results ready",
            is_active=True
        )
    ]
    
    for user in users:
        db.add(user)
    db.commit()
    print(f"✅ Created {len(users)} users")
    return users

def seed_appointments(db, patients, doctors):
    """Create sample appointments"""
    print("📅 Creating appointments...")
    
    today = date.today()
    appointments = [
        Appointment(
            patient_id=patients[0].id,  # Muhammad Hariton
            doctor_id=doctors[1].id,   # Dr. Michael Chen (Psychiatry)
            appointment_date=today,
            appointment_time=time(10, 0),
            problem="Anxiety problems",
            description="Description of problems and notes are written here",
            status="scheduled"
        ),
        Appointment(
            patient_id=patients[0].id,  # Muhammad Hariton
            doctor_id=doctors[1].id,   # Dr. Michael Chen
            appointment_date=today,
            appointment_time=time(10, 30),
            problem="Anxiety problems",
            description="Follow-up session for anxiety management",
            status="scheduled"
        ),
        Appointment(
            patient_id=patients[1].id,  # Ahmed Ali
            doctor_id=doctors[0].id,   # Dr. Sarah Johnson (Cardiology)
            appointment_date=today,
            appointment_time=time(11, 0),
            problem="Heart palpitations",
            description="Patient reports irregular heartbeat episodes",
            status="scheduled"
        ),
        Appointment(
            patient_id=patients[2].id,  # Fatima Khan
            doctor_id=doctors[2].id,   # Dr. Emily Rodriguez (General Practice)
            appointment_date=today,
            appointment_time=time(14, 0),
            problem="General checkup",
            description="Annual physical examination",
            status="scheduled"
        ),
        # Tomorrow's appointments
        Appointment(
            patient_id=patients[1].id,
            doctor_id=doctors[1].id,
            appointment_date=today + timedelta(days=1),
            appointment_time=time(9, 0),
            problem="Stress management",
            description="Consultation for work-related stress",
            status="scheduled"
        )
    ]
    
    for appointment in appointments:
        db.add(appointment)
    db.commit()
    print(f"✅ Created {len(appointments)} appointments")
    return appointments

def seed_medical_histories(db, patients, doctors):
    """Create sample medical histories (todos)"""
    print("📋 Creating medical histories...")
    
    histories = [
        MedicalHistory(
            patient_id=patients[0].id,
            doctor_id=doctors[1].id,
            date_from=date(2024, 5, 13),
            date_to=date(2024, 6, 30),
            description="Description of problems and notes are written here",
            diagnosis="Generalized Anxiety Disorder",
            treatment="Cognitive Behavioral Therapy and medication",
            status="pending"
        ),
        MedicalHistory(
            patient_id=patients[1].id,
            doctor_id=doctors[0].id,
            date_from=date(2024, 5, 13),
            date_to=date(2024, 6, 30),
            description="Ongoing cardiac monitoring and lifestyle modifications",
            diagnosis="Mild arrhythmia",
            treatment="Beta-blockers and lifestyle changes",
            status="pending"
        ),
        MedicalHistory(
            patient_id=patients[2].id,
            doctor_id=doctors[2].id,
            date_from=date(2024, 4, 1),
            date_to=date(2024, 5, 15),
            description="Completed treatment for seasonal allergies",
            diagnosis="Seasonal allergic rhinitis",
            treatment="Antihistamines and nasal spray",
            status="completed"
        )
    ]
    
    for history in histories:
        db.add(history)
    db.commit()
    print(f"✅ Created {len(histories)} medical history records")
    return histories

def main():
    """Main seeding function"""
    print("🌱 Starting database seeding...")
    print("=" * 50)
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Optional: Clear existing data
        clear_data(db)
        
        # Seed data in order (due to foreign key constraints)
        doctors = seed_doctors(db)
        patients = seed_patients(db)
        users = seed_users(db)
        appointments = seed_appointments(db, patients, doctors)
        medical_histories = seed_medical_histories(db, patients, doctors)
        
        print("=" * 50)
        print("🎉 Database seeding completed successfully!")
        print(f"📊 Summary:")
        print(f"   - {len(doctors)} doctors")
        print(f"   - {len(patients)} patients")
        print(f"   - {len(users)} users")
        print(f"   - {len(appointments)} appointments")
        print(f"   - {len(medical_histories)} medical history records")
        print("=" * 50)
        
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()