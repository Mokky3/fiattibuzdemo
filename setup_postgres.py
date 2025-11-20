#!/usr/bin/env python3
"""
PostgreSQL setup script for Fiattib EHR system.
This script will:
1. Start PostgreSQL container
2. Create database and schemas
3. Set up roles and permissions
4. Run initial migrations
"""

import subprocess
import time
import psycopg2
import os
from pathlib import Path

def run_command(command: str, cwd: str = None) -> tuple[bool, str]:
    """Run a shell command and return success status and output."""
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=True
        )
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, f"Error: {e.stderr}"

def check_docker():
    """Check if Docker is running."""
    success, output = run_command("docker --version")
    if not success:
        print("❌ Docker is not installed or not running")
        return False
    
    print("✅ Docker is available")
    return True

def start_postgres_container():
    """Start PostgreSQL container using docker-compose."""
    print("🐳 Starting PostgreSQL container...")
    
    # Change to database directory
    db_dir = Path(__file__).parent / "backend" / "database" / "db"
    
    # Start the container
    success, output = run_command(
        "docker compose -f docker-compose.db.yml up -d",
        cwd=str(db_dir)
    )
    
    if not success:
        print(f"❌ Failed to start PostgreSQL container: {output}")
        return False
    
    print("✅ PostgreSQL container started")
    
    # Wait for container to be ready
    print("⏳ Waiting for PostgreSQL to be ready...")
    max_attempts = 30
    for attempt in range(max_attempts):
        try:
            conn = psycopg2.connect(
                host='localhost',
                port=5432,
                database='postgres',  # Connect to default database first
                user='postgres',
                password='NoGletcherGang52'
            )
            conn.close()
            print("✅ PostgreSQL is ready")
            return True
        except psycopg2.Error:
            time.sleep(2)
            print(f"  Attempt {attempt + 1}/{max_attempts}...")
    
    print("❌ PostgreSQL failed to start within timeout")
    return False

def create_database_and_schemas():
    """Create the fiattib database and schemas."""
    print("🗄️  Creating database and schemas...")
    
    try:
        # Connect to PostgreSQL as superuser
        conn = psycopg2.connect(
            host='localhost',
            port=5432,
            database='postgres',
            user='postgres',
            password='NoGletcherGang52'
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Create database if it doesn't exist
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = 'fiattib'")
        if not cursor.fetchone():
            cursor.execute("CREATE DATABASE fiattib")
            print("✅ Created fiattib database")
        else:
            print("✅ fiattib database already exists")
        
        conn.close()
        
        # Connect to the fiattib database
        conn = psycopg2.connect(
            host='localhost',
            port=5432,
            database='fiattib',
            user='postgres',
            password='NoGletcherGang52'
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Create schemas
        schemas = ['core', 'ehr', 'ops', 'ref', 'financial']
        for schema in schemas:
            cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {schema}")
            print(f"✅ Created schema: {schema}")
        
        # Create roles
        roles = [
            ("fiattib_app_rw", "change_me_app_rw"),
            ("fiattib_app_ro", "change_me_app_ro")
        ]
        
        for role, password in roles:
            cursor.execute(f"""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='{role}') THEN
                        CREATE ROLE {role} LOGIN PASSWORD '{password}';
                    END IF;
                END $$;
            """)
            print(f"✅ Created role: {role}")
        
        # Grant permissions
        cursor.execute("GRANT USAGE ON SCHEMA core, ehr, ops, ref, financial TO fiattib_app_rw, fiattib_app_ro")
        cursor.execute("GRANT CREATE ON SCHEMA core, ehr, ops, ref, financial TO fiattib_app_rw")
        print("✅ Granted schema permissions")
        
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Database setup failed: {e}")
        return False

def run_schema_scripts():
    """Run the schema creation scripts."""
    print("📋 Running schema creation scripts...")
    
    try:
        conn = psycopg2.connect(
            host='localhost',
            port=5432,
            database='fiattib',
            user='fiattib_app_rw',
            password='change_me_app_rw'
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Get schema files
        schema_dir = Path(__file__).parent / "backend" / "database" / "db" / "schema"
        schema_files = [
            "core.sql",
            "ehr.sql", 
            "ops.sql",
            "ref.sql",
            "financial.sql"
        ]
        
        for schema_file in schema_files:
            schema_path = schema_dir / schema_file
            if schema_path.exists():
                print(f"  📄 Running {schema_file}...")
                with open(schema_path, 'r') as f:
                    schema_sql = f.read()
                    cursor.execute(schema_sql)
                print(f"  ✅ Completed {schema_file}")
            else:
                print(f"  ⚠️  Schema file not found: {schema_file}")
        
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Schema creation failed: {e}")
        return False

def test_connection():
    """Test the database connection."""
    print("🔍 Testing database connection...")
    
    try:
        conn = psycopg2.connect(
            host='localhost',
            port=5432,
            database='fiattib',
            user='fiattib_app_rw',
            password='change_me_app_rw'
        )
        cursor = conn.cursor()
        
        # Test basic query
        cursor.execute("SELECT version()")
        version = cursor.fetchone()[0]
        print(f"✅ Connected to PostgreSQL: {version}")
        
        # Test schema access
        cursor.execute("""
            SELECT schema_name 
            FROM information_schema.schemata 
            WHERE schema_name IN ('core', 'ehr', 'ops', 'ref', 'financial')
            ORDER BY schema_name
        """)
        schemas = [row[0] for row in cursor.fetchall()]
        print(f"✅ Available schemas: {', '.join(schemas)}")
        
        # Test table creation
        cursor.execute("""
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema IN ('core', 'ehr', 'ops', 'ref', 'financial')
        """)
        table_count = cursor.fetchone()[0]
        print(f"✅ Total tables created: {table_count}")
        
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Connection test failed: {e}")
        return False

def main():
    """Main setup function."""
    print("🚀 Setting up PostgreSQL for Fiattib EHR System")
    print("=" * 60)
    
    # Check prerequisites
    if not check_docker():
        return False
    
    # Start PostgreSQL container
    if not start_postgres_container():
        return False
    
    # Create database and schemas
    if not create_database_and_schemas():
        return False
    
    # Run schema scripts
    if not run_schema_scripts():
        return False
    
    # Test connection
    if not test_connection():
        return False
    
    print("\n" + "=" * 60)
    print("🎉 PostgreSQL setup completed successfully!")
    print("=" * 60)
    print("📋 Next steps:")
    print("  1. Run the data migration: python migrate_to_postgres.py")
    print("  2. Update your application to use PostgreSQL")
    print("  3. Test your application with the new database")
    print("\n🔗 Connection details:")
    print("  Host: localhost")
    print("  Port: 5432")
    print("  Database: fiattib")
    print("  User: fiattib_app_rw")
    print("  Password: change_me_app_rw")
    print("  pgAdmin: http://localhost:8081 (admin@fiattib.local / admin123)")
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
