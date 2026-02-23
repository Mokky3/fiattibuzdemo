#!/usr/bin/env python3
"""Apply generated migration to Supabase."""
import os
import sys
from pathlib import Path
import urllib.parse

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Add backend to path
backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
env_path = backend_path / ".env"
if env_path.exists():
    load_dotenv(env_path)

def apply_migration():
    """Apply migration to Supabase."""
    
    # Supabase connection string (password needs URL encoding)
    # Format: postgresql+psycopg2://postgres:[Myfiattib1/]@db.baisgogpswdaapukljwl.supabase.co:5432/postgres?sslmode=require
    password = "Myfiattib1/"
    encoded_password = urllib.parse.quote(password, safe='')
    
    # Use the connection string format you provided
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
        
        # Find latest migration file
        migrations_dir = backend_path / "supabase" / "migrations"
        if not migrations_dir.exists():
            print(f"❌ Migrations directory not found: {migrations_dir}")
            print("   Run generate_supabase_schema.py first")
            return
        
        migration_files = sorted(migrations_dir.glob("*.sql"), reverse=True)
        if not migration_files:
            print(f"❌ No migration files found in {migrations_dir}")
            return
        
        latest_migration = migration_files[0]
        print(f"📄 Found migration: {latest_migration.name}")
        
        # Read migration SQL
        migration_sql = latest_migration.read_text(encoding="utf-8")
        
        print("🚀 Applying migration...")
        
        # Split by semicolon and filter out comments
        statements = [s.strip() for s in migration_sql.split(';') if s.strip() and not s.strip().startswith('--')]
        
        # Separate schema creation from table creation
        schema_statements = []
        table_statements = []
        
        for statement in statements:
            if statement.upper().startswith('CREATE SCHEMA'):
                schema_statements.append(statement)
            else:
                table_statements.append(statement)
        
        print(f"   📋 Found {len(schema_statements)} schema statements")
        print(f"   📋 Found {len(table_statements)} table/other statements")
        
        # Apply migration in stages
        with engine.connect() as conn:
            # Stage 0: Enable required PostgreSQL extensions
            print("\n🔧 Enabling PostgreSQL extensions...")
            extensions = [
                "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";",
                "CREATE EXTENSION IF NOT EXISTS \"citext\";"
            ]
            for ext_sql in extensions:
                try:
                    with conn.begin():
                        conn.execute(text(ext_sql))
                    print(f"   ✓ Extension enabled")
                except Exception as e:
                    error_msg = str(e)
                    if "already exists" in error_msg.lower() or "permission denied" in error_msg.lower():
                        print(f"   ℹ Extension already exists or requires admin (skipped)")
                    else:
                        print(f"   ⚠ Extension warning: {error_msg[:100]}")
            
            # Stage 1: Create schemas (commit immediately, one by one)
            if schema_statements:
                print("\n📦 Creating schemas...")
                for i, statement in enumerate(schema_statements, 1):
                    try:
                        with conn.begin():
                            conn.execute(text(statement))
                        print(f"   ✓ Schema {i}/{len(schema_statements)}")
                    except Exception as e:
                        error_msg = str(e)
                        # Ignore "already exists" errors
                        if "already exists" in error_msg.lower():
                            print(f"   ℹ Schema {i} already exists (skipped)")
                        else:
                            print(f"   ⚠ Schema {i} error: {error_msg[:150]}")
                            raise
                print("✅ Schemas created successfully!")
            
            # Stage 2: Set search_path and create tables
            if table_statements:
                print("\n📊 Creating tables...")
                # Set search_path to include all our schemas
                with conn.begin():
                    conn.execute(text("SET search_path TO public, core, ehr, ref, ops, financial, staging;"))
                
                # Create tables with retry mechanism for dependency issues
                success_count = 0
                error_count = 0
                failed_statements = []
                max_retries = 5
                
                # First pass: Try to create all tables
                for i, statement in enumerate(table_statements, 1):
                    try:
                        with conn.begin():
                            conn.execute(text(statement))
                        success_count += 1
                        if i % 10 == 0:
                            print(f"   ✓ Progress: {i}/{len(table_statements)} ({success_count} successful)")
                    except Exception as e:
                        error_msg = str(e)
                        # Ignore "already exists" errors
                        if "already exists" in error_msg.lower():
                            success_count += 1
                            if i % 10 == 0:
                                print(f"   ℹ Progress: {i}/{len(table_statements)} (table already exists)")
                        else:
                            # Check if it's a dependency error
                            if "does not exist" in error_msg.lower() or "undefined" in error_msg.lower():
                                failed_statements.append((i, statement, error_msg))
                            else:
                                print(f"   ⚠ Table statement {i} error: {error_msg[:100]}")
                                error_count += 1
                
                # Retry failed statements (dependency issues might be resolved now)
                if failed_statements:
                    print(f"\n🔄 Retrying {len(failed_statements)} failed statements...")
                    for retry_round in range(max_retries):
                        if not failed_statements:
                            break
                        
                        remaining = []
                        for i, statement, original_error in failed_statements:
                            try:
                                with conn.begin():
                                    conn.execute(text(statement))
                                success_count += 1
                                if retry_round == 0:
                                    print(f"   ✓ Retry successful: statement {i}")
                            except Exception as e:
                                error_msg = str(e)
                                if "already exists" in error_msg.lower():
                                    success_count += 1
                                elif "does not exist" in error_msg.lower() or "undefined" in error_msg.lower():
                                    # Still a dependency issue, keep for next retry
                                    remaining.append((i, statement, error_msg))
                                else:
                                    # Different error, don't retry
                                    print(f"   ⚠ Statement {i} error (not retrying): {error_msg[:100]}")
                                    error_count += 1
                        
                        failed_statements = remaining
                        if failed_statements and retry_round < max_retries - 1:
                            print(f"   ℹ Retry round {retry_round + 1}: {len(failed_statements)} statements still failing, will retry...")
                
                # Report final status
                if failed_statements:
                    print(f"\n⚠️  {len(failed_statements)} statements still failed after {max_retries} retries:")
                    for i, statement, error_msg in failed_statements[:5]:  # Show first 5
                        print(f"   Statement {i}: {error_msg[:100]}")
                    if len(failed_statements) > 5:
                        print(f"   ... and {len(failed_statements) - 5} more")
                
                print(f"\n✅ Tables creation completed! ({success_count} successful, {error_count + len(failed_statements)} errors)")
        
        print("\n✅ Migration process completed!")
        
        # Verify schemas were created
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name IN ('core', 'ehr', 'ref', 'ops', 'financial', 'staging')
                ORDER BY schema_name;
            """))
            schemas = [row[0] for row in result]
            print(f"\n📊 Created schemas: {', '.join(schemas) if schemas else 'None found'}")
            
            # Count tables
            result = conn.execute(text("""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_schema IN ('core', 'ehr', 'ref', 'ops', 'financial', 'staging');
            """))
            table_count = result.fetchone()[0]
            print(f"📋 Total tables created: {table_count}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    apply_migration()

