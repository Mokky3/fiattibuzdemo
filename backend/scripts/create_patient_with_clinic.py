#!/usr/bin/env python3
"""
Script to create a patient and assign them to a clinic.
Can be run against production database by setting DATABASE_URL environment variable.

Usage:
    # For local database (default)
    python scripts/create_patient_with_clinic.py
    
    # For production database
    DATABASE_URL=postgresql+psycopg://user:pass@host:5432/db python scripts/create_patient_with_clinic.py
    
    # With custom patient data
    python scripts/create_patient_with_clinic.py \
        --email "john.doe@example.com" \
        --first-name "John" \
        --last-name "Doe" \
        --phone "+998901234567" \
        --dob "1990-01-15" \
        --gender "M"
"""

import sys
import os
import argparse
from pathlib import Path
from datetime import datetime, date
from uuid import uuid4

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import SessionLocal
from app.common.models.user import User, UserRole, UserStatus
from app.common.models.patient import Patient, OrganizationPatient
from app.common.models.hospital import Hospital
from app.common.auth.auth_service import AuthService


def create_patient_with_clinic(
    email: str,
    first_name: str,
    last_name: str,
    phone: str,
    date_of_birth: date,
    gender: str,
    clinic_id: str = None
):
    """Create a patient and assign them to a clinic."""
    db: Session = SessionLocal()
    
    try:
        print("🏥 Creating patient with clinic assignment...")
        
        # Get or create a clinic
        if clinic_id:
            try:
                clinic_uuid = uuid4() if isinstance(clinic_id, str) and len(clinic_id) == 36 else None
                if clinic_uuid:
                    clinic = db.query(Hospital).filter(Hospital.id == clinic_uuid).first()
                else:
                    clinic = db.query(Hospital).filter(Hospital.code == clinic_id).first()
            except:
                clinic = None
        else:
            clinic = None
        
        if not clinic:
            # Get first active hospital or create one
            clinic = db.query(Hospital).filter(Hospital.is_active == True).first()
            
            if not clinic:
                print("   Creating default hospital...")
                clinic = Hospital(
                    id=uuid4(),
                    name="Central Medical Clinic",
                    code="CMC-001",
                    address="Tashkent, Uzbekistan",
                    phone="+998901234567",
                    email="info@centralmedical.uz",
                    is_active=True
                )
                db.add(clinic)
                db.flush()
                print(f"   ✅ Created hospital: {clinic.name} (ID: {clinic.id})")
            else:
                print(f"   ✅ Using existing hospital: {clinic.name} (ID: {clinic.id})")
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        
        if existing_user:
            print(f"   ⚠️  User already exists: {email}")
            user = existing_user
        else:
            # Create User account for the patient
            print(f"   Creating user account: {email}")
            password_hash = AuthService.get_password_hash("Patient123!")  # Default password
            
            user = User(
                id=uuid4(),
                email=email,
                password_hash=password_hash,
                first_name=first_name,
                last_name=last_name,
                full_name=f"{first_name} {last_name}",
                phone=phone,
                role=UserRole.PATIENT,
                status=UserStatus.ACTIVE,
                is_active=True,
                email_verified=True
            )
            db.add(user)
            db.flush()
            print(f"   ✅ Created user: {email} (ID: {user.id})")
        
        # Check if patient already exists
        existing_patient = db.query(Patient).filter(Patient.user_id == user.id).first()
        
        if existing_patient:
            print(f"   ⚠️  Patient record already exists (ID: {existing_patient.patient_id})")
            patient = existing_patient
        else:
            # Create Patient record
            print("   Creating patient record...")
            patient = Patient(
                patient_id=uuid4(),
                user_id=user.id,
                date_of_birth=date_of_birth,
                sex=gender,
                phone=phone
            )
            db.add(patient)
            db.flush()
            print(f"   ✅ Created patient (ID: {patient.patient_id})")
        
        # Check if patient is already assigned to this clinic
        existing_assignment = db.query(OrganizationPatient).filter(
            OrganizationPatient.organization_id == clinic.id,
            OrganizationPatient.patient_id == patient.patient_id
        ).first()
        
        if existing_assignment:
            print(f"   ⚠️  Patient already assigned to clinic: {clinic.name}")
        else:
            # Generate local MRN
            existing_count = db.query(OrganizationPatient).filter(
                OrganizationPatient.organization_id == clinic.id
            ).count()
            local_mrn = f"MRN-{str(clinic.id)[:8].upper()}-{str(existing_count + 1).zfill(6)}"
            
            # Create organization_patients entry
            org_patient = OrganizationPatient(
                organization_id=clinic.id,
                patient_id=patient.patient_id,
                local_mrn=local_mrn,
                status="active"
            )
            db.add(org_patient)
            db.flush()
            print(f"   ✅ Assigned patient to clinic: {clinic.name} (Local MRN: {local_mrn})")
        
        db.commit()
        
        print(f"\n🎉 Patient creation complete!")
        print(f"   Patient ID: {patient.patient_id}")
        print(f"   User ID: {user.id}")
        print(f"   Email: {email}")
        print(f"   Clinic: {clinic.name} ({clinic.code})")
        print(f"   Local MRN: {org_patient.local_mrn if not existing_assignment else existing_assignment.local_mrn}")
        print(f"\n💡 Default password: Patient123!")
        
        return {
            "patient_id": str(patient.patient_id),
            "user_id": str(user.id),
            "email": email,
            "clinic_id": str(clinic.id),
            "clinic_name": clinic.name,
            "local_mrn": org_patient.local_mrn if not existing_assignment else existing_assignment.local_mrn
        }
        
    except Exception as e:
        print(f"❌ Error creating patient: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return None
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a patient and assign them to a clinic")
    parser.add_argument("--email", default="patient@example.com", help="Patient email address")
    parser.add_argument("--first-name", default="John", help="Patient first name")
    parser.add_argument("--last-name", default="Doe", help="Patient last name")
    parser.add_argument("--phone", default="+998901234567", help="Patient phone number")
    parser.add_argument("--dob", default="1990-01-15", help="Date of birth (YYYY-MM-DD)")
    parser.add_argument("--gender", default="M", choices=["M", "F", "O"], help="Gender (M/F/O)")
    parser.add_argument("--clinic-id", help="Clinic ID or code (optional, will use first available)")
    
    args = parser.parse_args()
    
    # Parse date
    try:
        dob = datetime.strptime(args.dob, "%Y-%m-%d").date()
    except ValueError:
        print(f"❌ Invalid date format: {args.dob}. Use YYYY-MM-DD")
        sys.exit(1)
    
    print("=" * 60)
    print("🏥 Create Patient with Clinic Assignment")
    print("=" * 60)
    
    # Check database connection
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        print("✅ Database connection successful")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("\n💡 Tip: Set DATABASE_URL environment variable to connect to production:")
        print("   DATABASE_URL=postgresql+psycopg://user:pass@host:5432/db python scripts/create_patient_with_clinic.py")
        sys.exit(1)
    
    print("=" * 60)
    
    result = create_patient_with_clinic(
        email=args.email,
        first_name=args.first_name,
        last_name=args.last_name,
        phone=args.phone,
        date_of_birth=dob,
        gender=args.gender,
        clinic_id=args.clinic_id
    )
    
    if result:
        print("\n✅ Patient created successfully!")
        sys.exit(0)
    else:
        print("\n❌ Patient creation failed!")
        sys.exit(1)


