#!/usr/bin/env python
"""Script to check if a doctor is wired to a clinic."""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import SessionLocal
from app.common.models.user import User
from app.common.models.doctor import Doctor

def check_doctor_clinic(email: str = "doctor@example.com"):
    """Check if a doctor is wired to a clinic."""
    db = SessionLocal()
    try:
        # Find user by email
        user = db.query(User).filter(User.email.ilike(email)).first()
        
        if not user:
            print(f"User with email '{email}' not found")
            return
        
        print(f"\n=== User Information ===")
        print(f"User ID: {user.id}")
        print(f"Email: {user.email}")
        print(f"Name: {user.first_name} {user.last_name}")
        print(f"Role: {user.role}")
        print(f"Organization ID: {user.organization_id}")
        
        # Check if user has organization_id
        if user.organization_id:
            # Get organization/hospital name
            org_result = db.execute(text("""
                SELECT name 
                FROM ref.hospitals 
                WHERE id = :org_id
            """), {"org_id": user.organization_id})
            org_row = org_result.fetchone()
            org_name = org_row[0] if org_row else "Unknown"
            print(f"Organization Name: {org_name}")
        else:
            print("Organization ID: None (not wired to any clinic)")
        
        # Check Doctor model
        doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
        if doctor:
            print(f"\n=== Doctor Information ===")
            print(f"Doctor ID: {doctor.id}")
            print(f"User ID: {doctor.user_id}")
            if hasattr(doctor, 'clinic_id'):
                print(f"Clinic ID (from Doctor model): {doctor.clinic_id}")
            if hasattr(doctor, 'organization_id'):
                print(f"Organization ID (from Doctor model): {getattr(doctor, 'organization_id', None)}")
        else:
            print("\n=== Doctor Information ===")
            print("No Doctor record found for this user")
        
        # Summary
        print(f"\n=== Summary ===")
        if user.organization_id:
            print(f"✓ Doctor IS wired to clinic/organization: {user.organization_id}")
            if org_row:
                print(f"  Organization name: {org_name}")
        else:
            print("✗ Doctor is NOT wired to any clinic/organization")
            print("  organization_id is None")
        
    except Exception as e:
        print(f"Error checking doctor: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    email = sys.argv[1] if len(sys.argv) > 1 else "doctor@example.com"
    check_doctor_clinic(email)



