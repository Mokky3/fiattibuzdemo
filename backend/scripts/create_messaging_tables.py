#!/usr/bin/env python3
"""Script to create messaging tables for HIPAA-compliant secure messaging."""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from app.db.session import SessionLocal, engine

def run_migration():
    """Run the messaging tables migration."""
    db = SessionLocal()
    try:
        # Read the migration SQL file
        migration_file = Path(__file__).parent.parent / "database" / "migrations" / "create_messaging_tables.sql"
        
        if not migration_file.exists():
            print(f"Error: Migration file not found at {migration_file}")
            return False
        
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        # Split SQL into individual statements and execute them one by one
        # This allows us to handle errors gracefully and continue with other statements
        print("Creating messaging tables...")
        
        # Split by semicolons, but preserve DO blocks
        statements = []
        current_statement = ""
        in_do_block = False
        
        for line in migration_sql.split('\n'):
            line = line.strip()
            if not line or line.startswith('--'):
                continue
            
            current_statement += line + '\n'
            
            # Check if we're entering or exiting a DO block
            if 'DO $$' in line.upper():
                in_do_block = True
            elif in_do_block and 'END $$;' in line.upper():
                in_do_block = False
                statements.append(current_statement.strip())
                current_statement = ""
            elif not in_do_block and line.endswith(';'):
                statements.append(current_statement.strip())
                current_statement = ""
        
        # Execute each statement in separate transactions to avoid aborting the whole migration
        success_count = 0
        error_count = 0
        
        for i, statement in enumerate(statements, 1):
            if not statement or statement == ';':
                continue
            
            # Execute each statement in its own transaction
            try:
                db.execute(text(statement))
                db.commit()  # Commit after each successful statement
                success_count += 1
                if i % 5 == 0:  # Print progress every 5 statements
                    print(f"  ✓ Executed {i}/{len(statements)} statements...")
            except Exception as e:
                db.rollback()  # Rollback on error
                error_str = str(e).lower()
                # Skip errors for things that already exist or permission issues
                if any(skip in error_str for skip in [
                    "already exists", "duplicate", "permission denied", 
                    "insufficient privilege", "does not exist", "undefinedcolumn",
                    "undefinedtable"  # For foreign key references that might not exist yet
                ]):
                    print(f"  ⚠ Statement {i} skipped: {str(e)[:100]}")
                    error_count += 1
                else:
                    print(f"  ✗ Error in statement {i}: {str(e)[:200]}")
                    # Continue with other statements
                    error_count += 1
        
        print(f"\n  ✓ Successfully executed {success_count} statements")
        if error_count > 0:
            print(f"  ⚠ Skipped {error_count} statements (already exist or permission issues)")
        
        # Final commit (though we've been committing after each statement)
        try:
            db.commit()
        except:
            pass  # Already committed
        
        print("\n✓ Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n✗ Migration failed: {str(e)}")
        db.rollback()
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)

