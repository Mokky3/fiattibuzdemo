#!/usr/bin/env python3
"""
Script to fix missing Doctor profiles for existing doctor users.
Can be run against production database by setting DATABASE_URL environment variable.

Usage:
    # For local database (default)
    python scripts/fix_doctor_profiles.py
    
    # For production database
    DATABASE_URL=postgresql+psycopg://user:pass@host:5432/db python scripts/fix_doctor_profiles.py
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
from app.db.session import SessionLocal
from app.common.models.user import User, UserRole
from app.common.models.doctor import Doctor


def fix_doctor_profiles():
    """Create missing Doctor profiles for existing doctor users."""
    db: Session = SessionLocal()
    
    try:
        print("🔍 Checking for doctor users without Doctor profiles...")
        
        # Find all users with DOCTOR role
        doctor_users = db.query(User).filter(User.role == UserRole.DOCTOR).all()
        
        if not doctor_users:
            print("ℹ️  No doctor users found in the database.")
            return True
        
        print(f"📋 Found {len(doctor_users)} doctor user(s)")
        
        fixed_count = 0
        skipped_count = 0
        
        for user in doctor_users:
            # Check if doctor profile already exists
            existing_doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
            
            if existing_doctor:
                print(f"✅ {user.email} already has a doctor profile (License: {existing_doctor.license_number})")
                skipped_count += 1
                continue
            
            # Generate a unique license number based on user ID
            license_number = f"DOC-{str(user.id)[:8].upper()}"
            
            # Check if license number already exists and generate a new one if needed
            while db.query(Doctor).filter(Doctor.license_number == license_number).first():
                license_number = f"DOC-{str(uuid.uuid4())[:8].upper()}"
            
            # Create doctor profile
            doctor_profile = Doctor(
                user_id=user.id,
                license_number=license_number,
                primary_specialization="General Practice",  # Default specialization
                license_issuer="Ministry of Health",
                is_accepting_patients=True,
            )
            db.add(doctor_profile)
            db.flush()
            
            print(f"✅ Created doctor profile for {user.email} (License: {license_number})")
            fixed_count += 1
        
        db.commit()
        
        print(f"\n🎉 Fix complete!")
        print(f"   Fixed: {fixed_count} doctor profile(s)")
        print(f"   Already had profiles: {skipped_count} user(s)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error fixing doctor profiles: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    print("🔧 Starting doctor profile fix...")
    print("=" * 50)
    
    # Check database connection
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        print("✅ Database connection successful")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("\n💡 Tip: Set DATABASE_URL environment variable to connect to production:")
        print("   DATABASE_URL=postgresql+psycopg://user:pass@host:5432/db python scripts/fix_doctor_profiles.py")
        sys.exit(1)
    
    print("=" * 50)
    success = fix_doctor_profiles()
    
    if success:
        print("\n✅ Doctor profile fix completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Doctor profile fix failed!")
        sys.exit(1)


