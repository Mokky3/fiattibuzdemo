"""Script to wire lab technician user to an organization if not already assigned."""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.common.models.user import User, UserRole
from app.common.models.hospital import Hospital

def wire_lab_technician_to_organization():
    """Wire lab technician to an organization."""
    db: Session = SessionLocal()
    
    try:
        # Find lab technician user
        lab_tech = db.query(User).filter(
            User.email == "lab@example.com",
            User.role == UserRole.LAB_TECHNICIAN
        ).first()
        
        if not lab_tech:
            print("❌ Lab technician user (lab@example.com) not found!")
            return
        
        print(f"✅ Found lab technician: {lab_tech.email} (ID: {lab_tech.id})")
        
        # Check if already has organization_id
        if lab_tech.organization_id:
            print(f"✅ Lab technician already has organization_id: {lab_tech.organization_id}")
            org = db.query(Hospital).filter(Hospital.id == lab_tech.organization_id).first()
            if org:
                print(f"   Organization: {org.name} ({org.id})")
            return
        
        # Find an existing organization
        # First, try to find one that has other staff members
        org_with_staff = db.query(Hospital).join(User).filter(
            User.role.in_([
                UserRole.DOCTOR,
                UserRole.NURSE,
                UserRole.CLINIC_ADMIN
            ]),
            User.is_active == True
        ).first()
        
        if org_with_staff:
            print(f"✅ Found organization with staff: {org_with_staff.name} ({org_with_staff.id})")
            lab_tech.organization_id = org_with_staff.id
            db.commit()
            print(f"✅ Successfully assigned lab technician to organization: {org_with_staff.name}")
            return
        
        # If no organization with staff, get the first active organization
        first_org = db.query(Hospital).filter(Hospital.status == "ACTIVE").first()
        
        if first_org:
            print(f"✅ Found organization: {first_org.name} ({first_org.id})")
            lab_tech.organization_id = first_org.id
            db.commit()
            print(f"✅ Successfully assigned lab technician to organization: {first_org.name}")
            return
        
        # If no organizations exist, create a default one
        print("⚠️  No organizations found. Creating a default organization...")
        default_org = Hospital(
            name="Default Clinic",
            code="DEFAULT",
            hospital_type="CLINIC",
            status="ACTIVE"
        )
        db.add(default_org)
        db.commit()
        db.refresh(default_org)
        
        lab_tech.organization_id = default_org.id
        db.commit()
        print(f"✅ Created default organization and assigned lab technician: {default_org.name} ({default_org.id})")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    wire_lab_technician_to_organization()

