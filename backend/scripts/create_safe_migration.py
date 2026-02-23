#!/usr/bin/env python3
"""Create a safe migration that creates tables without foreign keys first."""
import re
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent
migration_file = backend_path / "supabase" / "migrations" / "20251121071748_initial_schema.sql"
output_file = backend_path / "supabase" / "migrations" / "20251121071748_initial_schema_safe.sql"

def create_safe_migration():
    """Create migration with tables first, then foreign keys."""
    print("Reading migration file...")
    content = migration_file.read_text(encoding="utf-8")
    
    # Split into sections
    header_end = content.find("-- Create tables")
    header = content[:header_end]
    
    # Extract all CREATE TABLE statements
    table_pattern = r'(CREATE TABLE IF NOT EXISTS\s+[^\s(]+\s*\([^;]+;)'
    tables = re.findall(table_pattern, content, re.DOTALL)
    
    print(f"Found {len(tables)} table statements")
    
    # Separate tables and foreign keys
    tables_without_fk = []
    foreign_keys = []
    
    for table_sql in tables:
        # Extract table name
        table_match = re.search(r'CREATE TABLE IF NOT EXISTS\s+([^\s(]+)', table_sql)
        if not table_match:
            continue
        
        table_name = table_match.group(1)
        
        # Extract foreign keys
        fk_pattern = r',\s*FOREIGN KEY\([^)]+\)\s+REFERENCES\s+([^\s(]+)\s*\([^)]+\)'
        fks = re.findall(fk_pattern, table_sql, re.IGNORECASE)
        
        # Remove foreign keys from CREATE TABLE (including ON DELETE/UPDATE clauses)
        # Match: FOREIGN KEY(...) REFERENCES table(column) [ON DELETE action] [ON UPDATE action]
        fk_pattern = r',\s*FOREIGN KEY\([^)]+\)\s+REFERENCES\s+[^\s(]+\s*\([^)]+\)(?:\s+ON\s+(?:DELETE|UPDATE)\s+\w+)*(?:\s+ON\s+(?:DELETE|UPDATE)\s+\w+)?'
        table_without_fk = re.sub(fk_pattern, '', table_sql, flags=re.IGNORECASE)
        
        tables_without_fk.append((table_name, table_without_fk))
        
        # Store foreign keys to add later (including ON DELETE/UPDATE clauses)
        fk_pattern = r',\s*(FOREIGN KEY\([^)]+\)\s+REFERENCES\s+[^\s(]+\s*\([^)]+\)(?:\s+ON\s+(?:DELETE|UPDATE)\s+\w+)*)'
        fk_statements = re.findall(fk_pattern, table_sql, re.IGNORECASE)
        for fk_stmt in fk_statements:
            foreign_keys.append((table_name, fk_stmt.strip()))
    
    # Build new migration
    new_content = header + "\n-- Create tables (without foreign keys)\n\n"
    
    for table_name, table_sql in tables_without_fk:
        new_content += table_sql + "\n\n"
    
    new_content += "\n-- Add foreign key constraints\n\n"
    
    for table_name, fk_stmt in foreign_keys:
        # Convert FOREIGN KEY(...) REFERENCES to ALTER TABLE format
        # Match: FOREIGN KEY(column) REFERENCES table(column) [ON DELETE action] [ON UPDATE action]
        fk_match = re.match(r'FOREIGN KEY\(([^)]+)\)\s+REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)(?:\s+ON\s+(DELETE|UPDATE)\s+(\w+))*(?:\s+ON\s+(DELETE|UPDATE)\s+(\w+))*', fk_stmt, re.IGNORECASE)
        if fk_match:
            column = fk_match.group(1)
            ref_table = fk_match.group(2)
            ref_column = fk_match.group(3)
            
            # Extract ON DELETE and ON UPDATE clauses
            on_delete = ""
            on_update = ""
            if fk_match.group(4) and fk_match.group(4).upper() == 'DELETE':
                on_delete = f" ON DELETE {fk_match.group(5)}"
            elif fk_match.group(4) and fk_match.group(4).upper() == 'UPDATE':
                on_update = f" ON UPDATE {fk_match.group(5)}"
            
            if fk_match.group(6) and fk_match.group(6).upper() == 'DELETE':
                on_delete = f" ON DELETE {fk_match.group(7)}"
            elif fk_match.group(6) and fk_match.group(6).upper() == 'UPDATE':
                on_update = f" ON UPDATE {fk_match.group(7)}"
            
            constraint_name = f"{table_name.split('.')[-1]}_{column}_fkey"
            new_content += f"DO $$\n"
            new_content += f"BEGIN\n"
            new_content += f"    IF NOT EXISTS (\n"
            new_content += f"        SELECT 1 FROM pg_constraint WHERE conname = '{constraint_name}'\n"
            new_content += f"    ) THEN\n"
            new_content += f"        ALTER TABLE {table_name} ADD CONSTRAINT {constraint_name} FOREIGN KEY ({column}) REFERENCES {ref_table} ({ref_column}){on_delete}{on_update};\n"
            new_content += f"    END IF;\n"
            new_content += f"END $$;\n\n"
    
    # Write output
    output_file.write_text(new_content, encoding="utf-8")
    print(f"✅ Safe migration created!")
    print(f"📁 File: {output_file}")
    print(f"📊 Tables: {len(tables_without_fk)}")
    print(f"📋 Foreign keys: {len(foreign_keys)}")
    print("\nThis version creates all tables first, then adds foreign keys.")

if __name__ == "__main__":
    create_safe_migration()

