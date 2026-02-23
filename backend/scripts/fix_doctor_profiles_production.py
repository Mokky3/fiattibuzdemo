#!/usr/bin/env python3
"""
Script to fix missing Doctor profiles in PRODUCTION database.
This script connects to the Supabase production database and creates
missing Doctor profiles for existing doctor users.

⚠️  WARNING: This modifies the production database!
Make sure you have proper backups and authorization before running.
"""

import sys
import os
import urllib.parse

# Supabase production connection details
SUPABASE_HOST = "db.baisgogpswdaapukljwl.supabase.co"
SUPABASE_PORT = "5432"
SUPABASE_DB = "postgres"
SUPABASE_USER = "postgres"
SUPABASE_PASSWORD = "Myfiattib1/"

# URL encode the password
encoded_password = urllib.parse.quote(SUPABASE_PASSWORD, safe='')

# Build connection string - SQLAlchemy format
DATABASE_URL = f"postgresql+psycopg2://{SUPABASE_USER}:{encoded_password}@{SUPABASE_HOST}:{SUPABASE_PORT}/{SUPABASE_DB}?sslmode=require"

# Set the DATABASE_URL environment variable BEFORE any imports
os.environ["DATABASE_URL"] = DATABASE_URL

from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

print("=" * 80)
print("🔧 Doctor Profile Fix - PRODUCTION DATABASE")
print("=" * 80)
print(f"📍 Host: {SUPABASE_HOST}")
print(f"📊 Database: {SUPABASE_DB}")
print(f"👤 User: {SUPABASE_USER}")
print("\n⚠️  WARNING: This will modify the PRODUCTION database!")
print("=" * 80)

# Ask for confirmation
response = input("\nDo you want to continue? (yes/no): ").strip().lower()
if response not in ['yes', 'y']:
    print("❌ Aborted. No changes made.")
    sys.exit(0)

print("\n🚀 Running fix script against production database...")
print("=" * 80)

# Import and run the fix function
from scripts.fix_doctor_profiles import fix_doctor_profiles

success = fix_doctor_profiles()

if success:
    print("\n✅ Production database fix completed successfully!")
    print("\n💡 Next steps:")
    print("   1. Test the doctor portal to verify the fix")
    print("   2. Check that doctor users can now access /doctor/patients")
    sys.exit(0)
else:
    print("\n❌ Production database fix failed!")
    sys.exit(1)

