#!/usr/bin/env python3
"""
Generate SQL INSERT statements for seeding users in Supabase.
Run this script and paste the output into Supabase SQL Editor.
"""

import sys
import os
from pathlib import Path
from datetime import datetime, timezone
import uuid

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.common.auth.auth_service import AuthService
from app.common.models.user import UserRole

# Default users to seed
DEFAULT_USERS = [
    {
        "username": "admin",
        "email": "admin@fiattib.uz",
        "password": "Admin123!",
        "first_name": "System",
        "last_name": "Administrator",
        "role": "SUPER_ADMIN",
        "phone": "+998901234567",
    },
    {
        "username": "doctor",
        "email": "doctor@fiattib.uz",
        "password": "Doctor123!",
        "first_name": "John",
        "last_name": "Doe",
        "role": "DOCTOR",
        "phone": "+998901234568",
    },
    {
        "username": "nurse",
        "email": "nurse@fiattib.uz",
        "password": "Nurse123!",
        "first_name": "Jane",
        "last_name": "Nurse",
        "role": "NURSE",
        "phone": "+998901234569",
    },
    {
        "username": "receptionist",
        "email": "reception@fiattib.uz",
        "password": "Reception123!",
        "first_name": "Rex",
        "last_name": "Reception",
        "role": "RECEPTIONIST",
        "phone": "+998901234570",
    },
    {
        "username": "lab_technician",
        "email": "lab@fiattib.uz",
        "password": "Lab123!",
        "first_name": "Lara",
        "last_name": "Lab",
        "role": "LAB_TECHNICIAN",
        "phone": "+998901234571",
    },
]


def generate_sql():
    """Generate SQL INSERT statements for users."""
    now = datetime.now(timezone.utc).isoformat()
    
    print("-- SQL to seed users in Supabase")
    print("-- Paste this into Supabase SQL Editor and run it")
    print("-- Generated at:", now)
    print()
    print("BEGIN;")
    print()
    print("-- Ensure unique constraints exist (safe to run multiple times)")
    print("DO $$")
    print("BEGIN")
    print("    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key') THEN")
    print("        ALTER TABLE core.users ADD CONSTRAINT users_email_key UNIQUE (email);")
    print("    END IF;")
    print("    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_username_key') THEN")
    print("        ALTER TABLE core.users ADD CONSTRAINT users_username_key UNIQUE (username);")
    print("    END IF;")
    print("END $$;")
    print()
    
    for user_data in DEFAULT_USERS:
        # Hash password using AuthService
        password_hash = AuthService.get_password_hash(user_data["password"])
        user_id = str(uuid.uuid4())
        full_name = f"{user_data['first_name']} {user_data['last_name']}"
        
        # Generate INSERT for user
        print(f"-- User: {user_data['email']}")
        print(f"INSERT INTO core.users (")
        print(f"    id,")
        print(f"    username,")
        print(f"    email,")
        print(f"    password_hash,")
        print(f"    first_name,")
        print(f"    last_name,")
        print(f"    full_name,")
        print(f"    phone,")
        print(f"    role,")
        print(f"    status,")
        print(f"    is_active,")
        print(f"    email_verified,")
        print(f"    created_at,")
        print(f"    updated_at")
        print(f") VALUES (")
        print(f"    '{user_id}'::UUID,")
        print(f"    '{user_data['username']}',")
        print(f"    '{user_data['email']}',")
        print(f"    '{password_hash}',")
        print(f"    '{user_data['first_name']}',")
        print(f"    '{user_data['last_name']}',")
        print(f"    '{full_name}',")
        print(f"    '{user_data['phone']}',")
        print(f"    '{user_data['role']}',")
        print(f"    'ACTIVE',")
        print(f"    true,")
        print(f"    true,")
        print(f"    NOW(),")
        print(f"    NOW()")
        print(f") ON CONFLICT (email) DO NOTHING;")
        print()
        
        # Generate INSERT for user_settings
        print(f"-- UserSettings for: {user_data['email']}")
        print(f"INSERT INTO core.user_settings (")
        print(f"    id,")
        print(f"    user_id,")
        print(f"    created_at,")
        print(f"    updated_at")
        print(f") VALUES (")
        print(f"    gen_random_uuid(),")
        print(f"    '{user_id}'::UUID,")
        print(f"    NOW(),")
        print(f"    NOW()")
        print(f") ON CONFLICT (user_id) DO NOTHING;")
        print()
    
    print("COMMIT;")
    print()
    print("-- Login credentials:")
    for user_data in DEFAULT_USERS:
        print(f"-- {user_data['role']}: {user_data['email']} / {user_data['password']}")


if __name__ == "__main__":
    generate_sql()

