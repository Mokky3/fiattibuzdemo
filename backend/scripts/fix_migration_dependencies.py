#!/usr/bin/env python3
"""Fix migration file by reordering tables based on dependencies."""
import re
from pathlib import Path

backend_path = Path(__file__).resolve().parent.parent
migration_file = backend_path / "supabase" / "migrations" / "20251121071748_initial_schema.sql"

def extract_table_dependencies():
    """Extract table creation statements and their dependencies."""
    content = migration_file.read_text(encoding="utf-8")
    
    # Find all CREATE TABLE statements
    table_pattern = r'CREATE TABLE IF NOT EXISTS\s+([^\s(]+)\s*\('
    tables = {}
    
    # Split by CREATE TABLE statements
    parts = re.split(r'(CREATE TABLE IF NOT EXISTS\s+[^\s(]+\s*\()', content)
    
    current_table = None
    current_statement = []
    statements = []
    
    for part in parts:
        if part.strip().startswith('CREATE TABLE IF NOT EXISTS'):
            # Save previous statement
            if current_table and current_statement:
                statements.append((current_table, '\n'.join(current_statement)))
            
            # Start new statement
            match = re.search(r'CREATE TABLE IF NOT EXISTS\s+([^\s(]+)', part)
            if match:
                current_table = match.group(1)
                current_statement = [part]
        elif current_table:
            current_statement.append(part)
            # Check if this is the end of the statement (semicolon)
            if part.strip().endswith(';'):
                statements.append((current_table, '\n'.join(current_statement)))
                current_table = None
                current_statement = []
    
    # Get the last one
    if current_table and current_statement:
        statements.append((current_table, '\n'.join(current_statement)))
    
    return statements

def extract_foreign_keys(statement):
    """Extract foreign key references from a CREATE TABLE statement."""
    fk_pattern = r'FOREIGN KEY[^)]+REFERENCES\s+([^\s(]+)'
    matches = re.findall(fk_pattern, statement, re.IGNORECASE)
    return [ref.strip() for ref in matches]

def reorder_by_dependencies(statements):
    """Reorder statements based on foreign key dependencies."""
    # Build dependency graph
    dependencies = {}
    table_statements = {}
    
    for table, statement in statements:
        table_statements[table] = statement
        deps = extract_foreign_keys(statement)
        dependencies[table] = deps
    
    # Topological sort
    ordered = []
    remaining = set(table_statements.keys())
    added = set()
    
    max_iterations = len(remaining) * 2  # Safety limit
    iteration = 0
    
    while remaining and iteration < max_iterations:
        iteration += 1
        # Find tables with no unmet dependencies
        ready = []
        for table in remaining:
            deps = dependencies.get(table, [])
            # Check if all dependencies are satisfied
            if all(dep in added or dep not in table_statements for dep in deps):
                ready.append(table)
        
        if not ready:
            # Circular dependency or missing table - add remaining in any order
            ready = list(remaining)
        
        for table in ready:
            ordered.append((table, table_statements[table]))
            added.add(table)
            remaining.remove(table)
    
    return ordered

def fix_migration_file():
    """Fix the migration file by reordering tables."""
    print("Reading migration file...")
    content = migration_file.read_text(encoding="utf-8")
    
    # Split into header, tables, and footer
    header_end = content.find("-- Create tables")
    if header_end == -1:
        print("Could not find '-- Create tables' section")
        return
    
    header = content[:header_end]
    
    # Extract table statements
    print("Extracting table statements...")
    statements = extract_table_dependencies()
    print(f"Found {len(statements)} tables")
    
    # Reorder by dependencies
    print("Reordering by dependencies...")
    ordered_statements = reorder_by_dependencies(statements)
    
    # Rebuild content
    print("Rebuilding migration file...")
    new_content = header + "\n-- Create tables\n\n"
    
    for table, statement in ordered_statements:
        new_content += statement + "\n\n"
    
    # Write backup first
    backup_file = migration_file.with_suffix('.sql.backup')
    migration_file.rename(backup_file)
    print(f"Backup created: {backup_file.name}")
    
    # Write new file
    migration_file.write_text(new_content, encoding="utf-8")
    print(f"✅ Migration file reordered! ({len(ordered_statements)} tables)")
    print(f"📁 File: {migration_file}")

if __name__ == "__main__":
    fix_migration_file()


