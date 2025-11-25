#!/usr/bin/env python3
"""
Script to seed users into the database (PostgreSQL/Supabase).
Uses proper password hashing compatible with AuthService.
"""

import sys
import os
import uuid
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone
from app.db.session import SessionLocal
from app.common.auth.auth_service import AuthService
from app.common.models.user import User, UserRole, UserStatus, UserSettings
from app.common.models.doctor import Doctor

# Default users to seed
DEFAULT_USERS = [
    {
        "username": "admin",
        "email": "admin@fiattib.uz",
        "password": "Admin123!",
        "first_name": "System",
        "last_name": "Administrator",
        "role": UserRole.SUPER_ADMIN,
        "phone": "+998901234567",
    },
    {
        "username": "doctor",
        "email": "doctor@fiattib.uz",
        "password": "Doctor123!",
        "first_name": "John",
        "last_name": "Doe",
        "role": UserRole.DOCTOR,
        "phone": "+998901234568",
    },
    {
        "username": "nurse",
        "email": "nurse@fiattib.uz",
        "password": "Nurse123!",
        "first_name": "Jane",
        "last_name": "Nurse",
        "role": UserRole.NURSE,
        "phone": "+998901234569",
    },
    {
        "username": "receptionist",
        "email": "reception@fiattib.uz",
        "password": "Reception123!",
        "first_name": "Rex",
        "last_name": "Reception",
        "role": UserRole.RECEPTIONIST,
        "phone": "+998901234570",
    },
    {
        "username": "lab_technician",
        "email": "lab@fiattib.uz",
        "password": "Lab123!",
        "first_name": "Lara",
        "last_name": "Lab",
        "role": UserRole.LAB_TECHNICIAN,
        "phone": "+998901234571",
    },
    {
        "username": "radiologist",
        "email": "radiology@fiattib.uz",
        "password": "Radiology123!",
        "first_name": "Ray",
        "last_name": "Radiology",
        "role": UserRole.RADIOLOGIST,
        "phone": "+998901234572",
    },
]


def seed_users(users: list = None):
    """Seed users into the database."""
    if users is None:
        users = DEFAULT_USERS
    
    db: Session = SessionLocal()
    
    try:
        print("👥 Seeding users...")
        created_count = 0
        skipped_count = 0
        
        for user_data in users:
            # Check if user already exists
            existing_user = db.query(User).filter(
                (User.email == user_data["email"]) | 
                (User.username == user_data.get("username"))
            ).first()
            
            if existing_user:
                print(f"⏭️  Skipping {user_data['email']} (already exists)")
                # Check if doctor user needs a doctor profile
                if user_data["role"] == UserRole.DOCTOR:
                    existing_doctor = db.query(Doctor).filter(Doctor.user_id == existing_user.id).first()
                    if not existing_doctor:
                        # Generate a unique license number based on user ID
                        license_number = f"DOC-{str(existing_user.id)[:8].upper()}"
                        
                        # Check if license number already exists and generate a new one if needed
                        while db.query(Doctor).filter(Doctor.license_number == license_number).first():
                            license_number = f"DOC-{str(uuid.uuid4())[:8].upper()}"
                        
                        doctor_profile = Doctor(
                            user_id=existing_user.id,
                            license_number=license_number,
                            primary_specialization="General Practice",  # Default specialization
                            license_issuer="Ministry of Health",
                            is_accepting_patients=True,
                        )
                        db.add(doctor_profile)
                        db.flush()
                        print(f"   ✅ Created missing doctor profile for {user_data['email']} (License: {license_number})")
                        db.commit()
                skipped_count += 1
                continue
            
            # Hash password using AuthService
            password_hash = AuthService.get_password_hash(user_data["password"])
            
            # Create user
            now = datetime.now(timezone.utc)
            user = User(
                username=user_data.get("username"),
                email=user_data["email"],
                password_hash=password_hash,
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                full_name=f"{user_data['first_name']} {user_data['last_name']}",
                phone=user_data.get("phone"),
                role=user_data["role"],
                status=UserStatus.ACTIVE,
                is_active=True,
                email_verified=True,  # Set to True for seeded users
                updated_at=now,  # Set updated_at explicitly for new records
            )
            
            db.add(user)
            db.flush()  # Flush to get the ID
            
            # Create UserSettings for the user (required for proper functionality/logging)
            user_settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
            if not user_settings:
                user_settings = UserSettings(user_id=user.id)
                db.add(user_settings)
                db.flush()
            
            # Create Doctor profile if user is a doctor
            if user_data["role"] == UserRole.DOCTOR:
                existing_doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
                if not existing_doctor:
                    # Generate a unique license number based on user ID
                    license_number = f"DOC-{str(user.id)[:8].upper()}"
                    
                    # Check if license number already exists and generate a new one if needed
                    while db.query(Doctor).filter(Doctor.license_number == license_number).first():
                        license_number = f"DOC-{str(uuid.uuid4())[:8].upper()}"
                    
                    doctor_profile = Doctor(
                        user_id=user.id,
                        license_number=license_number,
                        primary_specialization="General Practice",  # Default specialization
                        license_issuer="Ministry of Health",
                        is_accepting_patients=True,
                    )
                    db.add(doctor_profile)
                    db.flush()
                    print(f"   ✅ Created doctor profile for {user_data['email']} (License: {license_number})")
            
            print(f"✅ Created user: {user_data['email']} (ID: {user.id})")
            created_count += 1
        
        db.commit()
        
        print(f"\n🎉 Seeding complete!")
        print(f"   Created: {created_count} users")
        print(f"   Skipped: {skipped_count} users")
        
        if created_count > 0:
            print(f"\n🔑 Login credentials:")
            for user_data in users:
                if not db.query(User).filter(User.email == user_data["email"]).first():
                    continue
                print(f"   {user_data['role'].value}: {user_data['email']} / {user_data['password']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error seeding users: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    print("🌱 Starting user seeding...")
    print("=" * 50)
    
    # Check database connection
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        print("✅ Database connection successful")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)
    
    print("=" * 50)
    success = seed_users()
    
    if success:
        print("\n✅ User seeding completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ User seeding failed!")
        sys.exit(1)

