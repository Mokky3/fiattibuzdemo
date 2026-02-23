#!/usr/bin/env python3
"""
Script to fix the backend crash by temporarily disabling problematic model imports.
"""
import os
from pathlib import Path

def fix_main_py():
    """Fix main.py to prevent model loading crashes."""
    main_py_path = Path(__file__).parent / "app" / "main.py"
    
    print("🔧 Fixing main.py to prevent model loading crashes...")
    
    try:
        with open(main_py_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Comment out the problematic model import
        old_import = "from app.common.models import *"
        new_import = "# from app.common.models import *  # Temporarily disabled due to relationship issues"
        
        if old_import in content:
            content = content.replace(old_import, new_import)
            print("  ✅ Commented out problematic model import")
        
        # Add a safer model import approach
        safe_imports = '''
# Safe model imports - only import what we need for basic functionality
from app.common.models.user import User
from app.common.models.admin import AuditTrail
from app.common.models.hospital import Hospital
from app.common.models.appointment import Appointment
from app.common.models.system_metrics import SystemMetrics
'''
        
        # Insert safe imports after the commented line
        if new_import in content:
            content = content.replace(new_import, new_import + safe_imports)
            print("  ✅ Added safe model imports")
        
        # Write back the modified content
        with open(main_py_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("  📝 Successfully updated main.py")
        return True
        
    except Exception as e:
        print(f"  ❌ Error fixing main.py: {e}")
        return False

def main():
    """Fix the backend crash."""
    print("🔧 Fixing Backend Crash...")
    print("=" * 50)
    
    success = fix_main_py()
    
    if success:
        print("\n✅ Backend crash fix applied!")
        print("🔄 Please restart the backend server")
    else:
        print("\n❌ Failed to fix backend crash")
    
    return success

if __name__ == "__main__":
    main()
