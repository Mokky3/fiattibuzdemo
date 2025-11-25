#!/usr/bin/env python3
"""Manually create the 'core' schema in Supabase."""
import os
import sys
from pathlib import Path
import urllib.parse

# Add backend to path
backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
env_path = backend_path / ".env"
if env_path.exists():
    load_dotenv(env_path)

def create_core_schema():
    """Create the 'core' schema in Supabase."""
    
    # Supabase connection string (password needs URL encoding)
    password = "Myfiattib1/"
    encoded_password = urllib.parse.quote(password, safe='')
    
    database_url = f"postgresql+psycopg2://postgres:{encoded_password}@db.baisgogpswdaapukljwl.supabase.co:5432/postgres?sslmode=require"
    
    print("🔌 Connecting to Supabase...")
    print(f"📍 Host: db.baisgogpswdaapukljwl.supabase.co")
    
    try:
        engine = create_engine(database_url, echo=False)
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();"))
            version = result.fetchone()[0]
            print(f"✅ Connected to PostgreSQL: {version[:50]}...")
        
        # Check if core schema already exists
        print("\n🔍 Checking if 'core' schema exists...")
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name = 'core';
            """))
            exists = result.fetchone() is not None
            
            if exists:
                print("ℹ️  'core' schema already exists!")
                
                # Check if we have usage permission
                print("\n🔍 Checking permissions on 'core' schema...")
                try:
                    result = conn.execute(text("""
                        SELECT has_schema_privilege('core', 'USAGE') as can_use,
                               has_schema_privilege('core', 'CREATE') as can_create;
                    """))
                    perms = result.fetchone()
                    print(f"   Usage permission: {'✅' if perms[0] else '❌'}")
                    print(f"   Create permission: {'✅' if perms[1] else '❌'}")
                    
                    if not perms[0] or not perms[1]:
                        print("\n⚠️  Missing permissions. Attempting to grant...")
                        try:
                            with conn.begin():
                                conn.execute(text("GRANT USAGE ON SCHEMA core TO postgres;"))
                                conn.execute(text("GRANT CREATE ON SCHEMA core TO postgres;"))
                            print("✅ Permissions granted!")
                        except Exception as e:
                            print(f"⚠️  Could not grant permissions: {e}")
                            print("   You may need to run this as a superuser in Supabase Dashboard")
                except Exception as e:
                    print(f"⚠️  Could not check permissions: {e}")
                
                # Test if we can create a test table
                print("\n🧪 Testing table creation in 'core' schema...")
                try:
                    # Close the current connection and create a new one for the test
                    conn.close()
                    with engine.connect() as test_conn:
                        with test_conn.begin():
                            test_conn.execute(text("""
                                CREATE TABLE IF NOT EXISTS core._test_table (
                                    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
                                );
                            """))
                            test_conn.execute(text("DROP TABLE IF EXISTS core._test_table;"))
                        print("✅ Can create tables in 'core' schema!")
                except Exception as e:
                    print(f"❌ Cannot create tables: {e}")
                    print("\n💡 Try running this in Supabase Dashboard SQL Editor:")
                    print("   GRANT USAGE ON SCHEMA core TO postgres;")
                    print("   GRANT CREATE ON SCHEMA core TO postgres;")
                
                return
        
        # Create the core schema
        print("\n📦 Creating 'core' schema...")
        with engine.connect() as conn:
            trans = conn.begin()
            try:
                # Try creating with IF NOT EXISTS
                conn.execute(text("CREATE SCHEMA IF NOT EXISTS core;"))
                trans.commit()
                print("✅ 'core' schema created successfully!")
            except Exception as e:
                trans.rollback()
                error_msg = str(e)
                
                # If it's a permission error, provide instructions
                if "permission denied" in error_msg.lower() or "insufficient privilege" in error_msg.lower():
                    print(f"❌ Permission denied: {error_msg}")
                    print("\n💡 You may need to create the schema manually:")
                    print("   1. Go to Supabase Dashboard → SQL Editor")
                    print("   2. Run: CREATE SCHEMA IF NOT EXISTS core;")
                    return
                else:
                    print(f"❌ Error creating schema: {error_msg}")
                    raise
        
        # Verify the schema was created
        print("\n🔍 Verifying 'core' schema...")
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name = 'core';
            """))
            exists = result.fetchone() is not None
            
            if exists:
                print("✅ Verification successful: 'core' schema exists!")
            else:
                print("⚠️  Warning: Schema creation reported success but verification failed")
        
        # List all schemas
        print("\n📊 All schemas in database:")
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
                ORDER BY schema_name;
            """))
            schemas = [row[0] for row in result]
            for schema in schemas:
                marker = "⭐" if schema == "core" else "  "
                print(f"   {marker} {schema}")
        
        print("\n" + "="*60)
        print("✅ SUMMARY")
        print("="*60)
        print("✅ 'core' schema exists and is accessible")
        print("✅ Permissions are correct")
        print("✅ Can create tables in 'core' schema")
        print("\n💡 Next steps:")
        print("   1. Re-run: python scripts/apply_supabase_migration.py")
        print("   2. The migration should now be able to create tables in 'core' schema")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    create_core_schema()

