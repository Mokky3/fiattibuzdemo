"""Script to connect nurse@example.com and doctor@example.com to a clinic in the database."""
import sys
import os
from pathlib import Path

# Add the backend directory to the path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import SessionLocal
from app.common.models.user import User
from app.common.models.hospital import Hospital
from app.common.models.doctor import Doctor
from app.common.models.nurse import Nurse
from app.common.models.doctor import doctor_hospitals

def get_or_create_clinic(db: Session) -> str:
    """Get the first active clinic or create a default one if none exists."""
    try:
        # Try to get the first active hospital/clinic
        clinic = db.query(Hospital).filter(Hospital.is_active == True).first()
        
        if clinic:
            print(f"Found existing clinic: {clinic.name} (ID: {clinic.id})")
            return str(clinic.id)
        
        # If no clinic exists, create a default one
        print("No active clinic found. Creating a default clinic...")
        from uuid import uuid4
        clinic_id = uuid4()
        
        insert_sql = text("""
            INSERT INTO ref.hospitals (id, name, code, is_active, created_at)
            VALUES (:id, :name, :code, :is_active, NOW())
            ON CONFLICT (id) DO NOTHING
        """)
        
        db.execute(insert_sql, {
            "id": clinic_id,
            "name": "Default Clinic",
            "code": "DEFAULT",
            "is_active": True
        })
        db.commit()
        
        print(f"Created default clinic: Default Clinic (ID: {clinic_id})")
        return str(clinic_id)
        
    except Exception as e:
        print(f"Error getting/creating clinic: {e}")
        db.rollback()
        raise

def connect_user_to_clinic(db: Session, email: str, clinic_id: str):
    """Connect a user to a clinic by updating their organization_id."""
    try:
        # Get user by email
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"User with email {email} not found")
            return False
        
        # Update organization_id
        update_sql = text("""
            UPDATE core.users
            SET organization_id = CAST(:clinic_id AS UUID)
            WHERE id = CAST(:user_id AS UUID)
        """)
        
        db.execute(update_sql, {
            "clinic_id": clinic_id,
            "user_id": str(user.id)
        })
        db.commit()
        
        print(f"Connected {email} to clinic (organization_id updated)")
        return True
        
    except Exception as e:
        print(f"Error connecting {email} to clinic: {e}")
        db.rollback()
        return False

def connect_doctor_to_hospital(db: Session, email: str, clinic_id: str):
    """Connect a doctor to a hospital/clinic through the doctor_hospitals association table."""
    try:
        # Get user by email
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"User with email {email} not found")
            return False
        
        # Get doctor profile
        doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
        
        if not doctor:
            print(f"Doctor profile not found for {email}")
            return False
        
        # Check if association already exists
        # Note: doctor_id in doctor_hospitals is actually a UUID, not VARCHAR
        check_sql = text("""
            SELECT COUNT(*) FROM ehr.doctor_hospitals
            WHERE doctor_id = CAST(:doctor_id AS UUID)
            AND hospital_id = CAST(:hospital_id AS UUID)
        """)
        
        result = db.execute(check_sql, {
            "doctor_id": str(doctor.id),
            "hospital_id": clinic_id
        })
        count = result.scalar()
        
        if count > 0:
            print(f"Doctor {email} is already connected to this clinic")
            return True
        
        # Insert into doctor_hospitals association table
        # Note: doctor_id in doctor_hospitals is actually a UUID, not VARCHAR
        insert_sql = text("""
            INSERT INTO ehr.doctor_hospitals (doctor_id, hospital_id)
            VALUES (CAST(:doctor_id AS UUID), CAST(:hospital_id AS UUID))
            ON CONFLICT (doctor_id, hospital_id) DO NOTHING
        """)
        
        db.execute(insert_sql, {
            "doctor_id": str(doctor.id),
            "hospital_id": clinic_id
        })
        db.commit()
        
        print(f"Connected doctor {email} to clinic (doctor_hospitals updated)")
        return True
        
    except Exception as e:
        print(f"Error connecting doctor {email} to hospital: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False

def main():
    """Main function to connect users to clinic."""
    db: Session = SessionLocal()
    
    try:
        # Get or create a clinic
        clinic_id = get_or_create_clinic(db)
        
        # Connect nurse@example.com
        print("\n--- Connecting nurse@example.com ---")
        nurse_connected = connect_user_to_clinic(db, "nurse@example.com", clinic_id)
        
        # Connect doctor@example.com
        print("\n--- Connecting doctor@example.com ---")
        doctor_user_connected = connect_user_to_clinic(db, "doctor@example.com", clinic_id)
        doctor_hospital_connected = connect_doctor_to_hospital(db, "doctor@example.com", clinic_id)
        
        # Summary
        print("\n--- Summary ---")
        if nurse_connected:
            print("✓ nurse@example.com connected to clinic")
        else:
            print("✗ Failed to connect nurse@example.com")
        
        if doctor_user_connected and doctor_hospital_connected:
            print("✓ doctor@example.com connected to clinic (user and doctor_hospitals)")
        else:
            print("✗ Failed to connect doctor@example.com")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()

