#!/usr/bin/env python3
"""Connect radiology user to a clinic/organization."""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal
from app.common.models.user import User, UserRole
from app.common.models.hospital import Hospital

db = SessionLocal()

try:
    # Find radiology user
    rad_user = db.query(User).filter(User.role == UserRole.RADIOLOGIST).first()
    
    if not rad_user:
        print("❌ No radiology user found in database")
        exit(1)
    
    print(f"✅ Found radiology user: {rad_user.email}")
    print(f"   Current Organization ID: {rad_user.organization_id}")
    print()
    
    # Find all active hospitals/clinics
    hospitals = db.query(Hospital).filter(Hospital.is_active == True).all()
    
    if not hospitals:
        print("❌ No active hospitals/clinics found in database")
        exit(1)
    
    print(f"📋 Found {len(hospitals)} active clinic(s)/hospital(s):")
    print()
    for i, hospital in enumerate(hospitals, 1):
        print(f"   {i}. {hospital.name}")
        print(f"      ID: {hospital.id}")
        print(f"      Code: {hospital.code or 'N/A'}")
        print(f"      Address: {hospital.address or 'N/A'}")
        print()
    
    # Connect to the first active hospital
    selected_hospital = hospitals[0]
    
    print(f"🔗 Connecting radiology user to: {selected_hospital.name}")
    print(f"   Hospital ID: {selected_hospital.id}")
    
    # Update the radiology user's organization_id
    rad_user.organization_id = selected_hospital.id
    db.commit()
    db.refresh(rad_user)
    
    print()
    print(f"✅ Successfully connected radiology user to clinic!")
    print(f"   Radiology User: {rad_user.email}")
    print(f"   Connected to: {selected_hospital.name} (ID: {rad_user.organization_id})")
    print()
    print("📝 Patient search will now work for patients in this clinic")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    db.rollback()
finally:
    db.close()

