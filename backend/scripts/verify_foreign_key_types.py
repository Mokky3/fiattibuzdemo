#!/usr/bin/env python3
"""Verify all foreign key types match their referenced primary keys."""
import re
from pathlib import Path
from collections import defaultdict

backend_path = Path(__file__).resolve().parent.parent
migration_file = backend_path / "supabase" / "migrations" / "20251121071748_initial_schema_safe.sql"

def verify_foreign_key_types():
    """Check all foreign key types match their referenced primary keys."""
    print("Reading migration file...")
    content = migration_file.read_text(encoding="utf-8")
    
    # Step 1: Extract all table definitions with their primary key types
    print("\n📊 Step 1: Extracting table primary key types...")
    table_pk_types = {}
    # Pattern to match CREATE TABLE with id column (standard primary key)
    table_pattern = r'CREATE TABLE IF NOT EXISTS (\w+\.\w+)\s*\([^)]*?\n\s+id\s+(UUID|VARCHAR\(36\))\s+NOT NULL'
    
    for match in re.finditer(table_pattern, content, re.MULTILINE | re.DOTALL):
        table_name = match.group(1)
        pk_type = match.group(2)
        table_pk_types[table_name] = pk_type
    
    # Also check for tables with patient_id as primary key
    # Pattern: table with patient_id UUID/VARCHAR(36) NOT NULL and PRIMARY KEY (patient_id)
    # This handles cases where PRIMARY KEY might be on a different line
    patient_id_pattern = r'CREATE TABLE IF NOT EXISTS (\w+\.\w+)\s*\([^)]*?\n\s+patient_id\s+(UUID|VARCHAR\(36\))\s+NOT NULL[^)]*?PRIMARY KEY\s*\(patient_id\)'
    
    for match in re.finditer(patient_id_pattern, content, re.MULTILINE | re.DOTALL):
        table_name = match.group(1)
        pk_type = match.group(2)
        if table_name not in table_pk_types:  # Don't overwrite if already found
            table_pk_types[table_name] = pk_type
    
    # Manual addition for known tables with patient_id as primary key
    # ehr.patients uses patient_id UUID as primary key
    if 'ehr.patients' not in table_pk_types:
        table_pk_types['ehr.patients'] = 'UUID'
    
    print(f"   Found {len(table_pk_types)} tables with primary keys")
    
    # Step 2: Extract all foreign key constraints
    print("\n🔗 Step 2: Extracting foreign key constraints...")
    fk_constraints = []
    # Pattern: ALTER TABLE table_name ADD CONSTRAINT constraint_name FOREIGN KEY (column) REFERENCES ref_table (ref_column)
    fk_pattern = r'ALTER TABLE (\w+\.\w+)\s+ADD CONSTRAINT (\w+)\s+FOREIGN KEY \((\w+)\)\s+REFERENCES (\w+\.\w+)\s+\((\w+)\)'
    
    for match in re.finditer(fk_pattern, content, re.IGNORECASE):
        table_name = match.group(1)
        constraint_name = match.group(2)
        fk_column = match.group(3)
        ref_table = match.group(4)
        ref_column = match.group(5)
        
        fk_constraints.append({
            'table': table_name,
            'constraint': constraint_name,
            'column': fk_column,
            'ref_table': ref_table,
            'ref_column': ref_column
        })
    
    print(f"   Found {len(fk_constraints)} foreign key constraints")
    
    # Step 3: For each foreign key, find the column definition and check type
    print("\n🔍 Step 3: Checking foreign key column types...")
    mismatches = []
    
    for fk in fk_constraints:
        table_name = fk['table']
        fk_column = fk['column']
        ref_table = fk['ref_table']
        ref_column = fk['ref_column']
        
        # Get the referenced table's primary key type
        if ref_table not in table_pk_types:
            print(f"   ⚠️  Warning: Referenced table {ref_table} not found in table definitions")
            continue
        
        ref_pk_type = table_pk_types[ref_table]
        
        # Find the table definition for the foreign key table
        table_def_pattern = rf'CREATE TABLE IF NOT EXISTS {re.escape(table_name)}\s*\((.*?)\)\s*;'
        table_match = re.search(table_def_pattern, content, re.MULTILINE | re.DOTALL | re.IGNORECASE)
        
        if not table_match:
            print(f"   ⚠️  Warning: Table {table_name} definition not found")
            continue
        
        table_body = table_match.group(1)
        
        # Find the column definition in the table body
        # Pattern: column_name TYPE [NOT NULL], or column_name TYPE [NOT NULL]
        # Need to handle both nullable and non-nullable columns
        # Also match plain VARCHAR (without size) which should be treated as VARCHAR
        col_pattern = rf'\s+{re.escape(fk_column)}\s+(UUID|VARCHAR\(36\)|VARCHAR\(255\)|VARCHAR\(\d+\)|VARCHAR)\s*(?:NOT NULL|NULL)?'
        col_match = re.search(col_pattern, table_body, re.IGNORECASE)
        
        if not col_match:
            # Try to find it with more flexible pattern
            col_pattern2 = rf'\s+{re.escape(fk_column)}\s+(UUID|VARCHAR\(36\)|VARCHAR\(255\)|VARCHAR\(\d+\)|VARCHAR)'
            col_match = re.search(col_pattern2, table_body, re.IGNORECASE)
        
        if not col_match:
            print(f"   ⚠️  Warning: Column {table_name}.{fk_column} not found in table definition")
            continue
        
        fk_type = col_match.group(1)
        
        # Normalize types for comparison
        # UUID stays as UUID
        # VARCHAR, VARCHAR(36), VARCHAR(255), and other VARCHAR variants become VARCHAR
        fk_type_norm = 'UUID' if fk_type.upper() == 'UUID' else 'VARCHAR'
        pk_type_norm = 'UUID' if ref_pk_type == 'UUID' else 'VARCHAR'
        
        if fk_type_norm != pk_type_norm:
            mismatches.append({
                'table': table_name,
                'column': fk_column,
                'fk_type': fk_type,
                'ref_table': ref_table,
                'ref_column': ref_column,
                'pk_type': ref_pk_type,
                'constraint': fk['constraint']
            })
    
    # Step 4: Report results
    print("\n" + "="*80)
    if mismatches:
        print(f"❌ Found {len(mismatches)} type mismatches:\n")
        for i, m in enumerate(mismatches, 1):
            print(f"  {i}. {m['table']}.{m['column']}")
            print(f"     Current type: {m['fk_type']}")
            print(f"     References: {m['ref_table']}.{m['ref_column']} ({m['pk_type']})")
            print(f"     Constraint: {m['constraint']}")
            print(f"     ❌ Should be: {m['pk_type']}")
            print()
        
        print("="*80)
        print("\n💡 Fix suggestions:")
        print("   Run the following search/replace operations:")
        print()
        for m in mismatches:
            if m['pk_type'] == 'UUID':
                print(f"   {m['table']}.{m['column']}: {m['fk_type']} → UUID")
            else:
                print(f"   {m['table']}.{m['column']}: {m['fk_type']} → VARCHAR(36)")
        
        return mismatches
    else:
        print("✅ All foreign key types match their referenced primary keys!")
        print("="*80)
        return []

if __name__ == "__main__":
    mismatches = verify_foreign_key_types()
    if mismatches:
        exit(1)
    else:
        exit(0)
