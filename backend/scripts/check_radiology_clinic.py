"""Check which clinic the radiology user is connected to."""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal
from app.common.models.user import User, UserRole

db = SessionLocal()

try:
    # Find radiology user
    rad_user = db.query(User).filter(User.role == UserRole.RADIOLOGIST).first()
    
    if not rad_user:
        print("❌ No radiology user found in database")
    else:
        print(f"✅ Found radiology user: {rad_user.email}")
        print(f"   User ID: {rad_user.id}")
        print(f"   Name: {rad_user.first_name} {rad_user.last_name}")
        print(f"   Organization ID: {rad_user.organization_id}")
        
        if rad_user.organization_id:
            print(f"   ✅ Connected to clinic/organization: {rad_user.organization_id}")
            print(f"   📝 Note: Patient search will filter by this organization_id")
        else:
            print("   ⚠️  No organization_id set - radiology user is not connected to any clinic")
            print("   This means patient search will return empty results")
            
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()

