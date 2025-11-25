#!/usr/bin/env python3
"""Generate SQL schema from SQLAlchemy models for Supabase migration."""
import os
import sys
from pathlib import Path
from datetime import datetime

# Add backend to path
backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

# Set up environment
os.environ.setdefault("DATABASE_URL", "postgresql://postgres:password@localhost/postgres")

from sqlalchemy import create_engine, MetaData
from sqlalchemy.schema import CreateSchema, CreateTable

# Import Base first
from app.db.base_class import Base

# Import all models to register them with SQLAlchemy
# Import from individual modules to ensure all models are registered
import app.common.models.user
import app.common.models.patient
import app.common.models.hospital
import app.common.models.appointment
import app.common.models.doctor
import app.common.models.clinical
import app.common.models.medical
import app.common.models.prescription
import app.common.models.lab_insurance
import app.common.models.lab_settings
import app.common.models.radiology
import app.common.models.messaging
import app.common.models.notification
import app.common.models.financial
import app.common.models.medication_ref
import app.common.models.nurse
import app.common.models.practitioner
import app.common.models.admin
import app.common.models.user_invitation
import app.common.models.log_ses
import app.common.models.system_metrics
# Skip legacy lab models - they have foreign key reference issues
# import app.common.models.lab

def generate_schema_sql():
    """Generate SQL schema from SQLAlchemy models."""
    
    # Get metadata from Base
    metadata = Base.metadata
    
    # Remove problematic legacy tables from metadata
    tables_to_remove = []
    for table_name, table in list(metadata.tables.items()):
        if 'legacy' in table_name.lower():
            tables_to_remove.append(table_name)
            metadata.remove(table)
    
    if tables_to_remove:
        print(f"⚠️  Removed {len(tables_to_remove)} legacy tables: {', '.join(tables_to_remove)}")
    
    # Create schemas first
    schemas = set()
    for table in metadata.tables.values():
        if hasattr(table, 'schema') and table.schema:
            schemas.add(table.schema)
    
    sql_statements = []
    
    # Header comment
    sql_statements.append("-- Supabase Migration: Initial Schema")
    sql_statements.append(f"-- Generated: {datetime.now().isoformat()}")
    sql_statements.append("-- From SQLAlchemy models")
    sql_statements.append("")
    
    # Create schemas
    sql_statements.append("-- Create schemas")
    for schema in sorted(schemas):
        sql_statements.append(f"CREATE SCHEMA IF NOT EXISTS {schema};")
    
    sql_statements.append("")
    sql_statements.append("-- Create tables")
    sql_statements.append("")
    
    # Create a dummy engine just for SQL generation (doesn't need to connect)
    from sqlalchemy import create_engine
    dummy_engine = create_engine("postgresql://dummy:dummy@localhost/dummy")
    
    # Generate CREATE TABLE statements
    # Try to sort tables, but handle errors gracefully
    try:
        sorted_tables = metadata.sorted_tables
    except Exception as e:
        print(f"⚠️  Warning: Could not sort tables automatically: {e}")
        print("   Generating tables in registration order...")
        # Use a simple approach - just iterate through tables
        sorted_tables = list(metadata.tables.values())
    
    tables_generated = 0
    for table in sorted_tables:
        try:
            # Skip if table was removed
            if table.name in tables_to_remove:
                continue
                
            create_table_sql = str(CreateTable(table).compile(dummy_engine))
            sql_statements.append(create_table_sql + ";")
            sql_statements.append("")
            tables_generated += 1
        except Exception as e:
            print(f"⚠️  Warning: Could not generate SQL for table {table.name}: {e}")
    
    # Generate indexes
    sql_statements.append("-- Create indexes")
    sql_statements.append("")
    indexes_generated = 0
    for table in sorted_tables:
        if table.name in tables_to_remove:
            continue
        for index in table.indexes:
            try:
                # Skip indexes that are automatically created (primary keys, unique constraints)
                if index.name and not index.name.startswith('ix_'):
                    continue
                index_sql = str(index.compile(dummy_engine))
                sql_statements.append(f"{index_sql};")
                indexes_generated += 1
            except Exception as e:
                print(f"⚠️  Warning: Could not generate SQL for index on {table.name}: {e}")
    
    if tables_to_remove:
        sql_statements.append("")
        sql_statements.append("-- Note: Legacy lab tables were skipped due to foreign key issues")
        sql_statements.append("-- If needed, create them manually with corrected foreign key references")
    
    return "\n".join(sql_statements), tables_generated, indexes_generated

if __name__ == "__main__":
    try:
        sql, table_count, index_count = generate_schema_sql()
        
        # Create supabase directory
        supabase_dir = backend_path / "supabase" / "migrations"
        supabase_dir.mkdir(parents=True, exist_ok=True)
        
        # Create migration file with timestamp
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        output_file = supabase_dir / f"{timestamp}_initial_schema.sql"
        
        output_file.write_text(sql, encoding="utf-8")
        
        print(f"\n✅ Schema generated successfully!")
        print(f"📁 File: {output_file}")
        print(f"📊 Tables: {table_count}")
        print(f"📋 Indexes: {index_count}")
        print(f"📝 Total lines: {len(sql.split(chr(10)))}")
        print("")
        print("Next steps:")
        print("1. Review the generated SQL file")
        print("2. Apply it to Supabase using:")
        print("   - Supabase Dashboard SQL Editor, or")
        print("   - Run: python backend/scripts/apply_supabase_migration.py")
        
    except Exception as e:
        print(f"❌ Error generating schema: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
