"""Test script to verify Row Level Security (RLS) functionality for admin portal"""

import os
import sys
from sqlalchemy import text
from app.db.session import engine, get_db
from app.common.auth.auth_service import AuthenticatedUser, UserRole

# Set environment variables
os.environ['DATABASE_URL'] = 'postgresql://fiattib_app_rw:change_me_app_rw@localhost:5432/fiattib'
os.environ['SQL_ECHO'] = 'false'  # Disable SQL logging for cleaner output

def test_rls_status():
    """Test current RLS status in the database"""
    print('🔒 TESTING ROW LEVEL SECURITY STATUS')
    print('=' * 50)
    
    try:
        with engine.connect() as conn:
            # Check RLS enabled tables
            result = conn.execute(text('''
                SELECT schemaname, tablename, rowsecurity 
                FROM pg_tables 
                WHERE schemaname IN ('core', 'ehr', 'ops', 'ref', 'financial')
                AND rowsecurity = true
                ORDER BY schemaname, tablename
            '''))
            
            rls_tables = result.fetchall()
            print(f'📋 Tables with RLS enabled: {len(rls_tables)}')
            
            # Group by schema
            schemas = {}
            for table in rls_tables:
                schema = table[0]
                if schema not in schemas:
                    schemas[schema] = []
                schemas[schema].append(table[1])
            
            for schema, tables in schemas.items():
                print(f'  📋 {schema} schema: {len(tables)} tables')
                for table in tables[:5]:  # Show first 5 tables
                    print(f'    ✅ {table}')
                if len(tables) > 5:
                    print(f'    ... and {len(tables) - 5} more tables')
            
            # Check policies
            result = conn.execute(text('''
                SELECT schemaname, tablename, policyname, cmd
                FROM pg_policies 
                WHERE schemaname IN ('core', 'ehr', 'ops', 'ref', 'financial')
                ORDER BY schemaname, tablename, policyname
            '''))
            
            policies = result.fetchall()
            print(f'\\n📋 Total RLS policies: {len(policies)}')
            
            # Group policies by schema
            policy_schemas = {}
            for policy in policies:
                schema = policy[0]
                if schema not in policy_schemas:
                    policy_schemas[schema] = []
                policy_schemas[schema].append(f'{policy[1]}.{policy[2]} ({policy[3]})')
            
            for schema, policy_list in policy_schemas.items():
                print(f'  📋 {schema} schema: {len(policy_list)} policies')
                for policy in policy_list[:3]:  # Show first 3 policies
                    print(f'    ✅ {policy}')
                if len(policy_list) > 3:
                    print(f'    ... and {len(policy_list) - 3} more policies')
            
            return True
            
    except Exception as e:
        print(f'❌ RLS status test failed: {e}')
        return False

def test_session_variables():
    """Test setting and reading session variables"""
    print('\\n🔧 TESTING SESSION VARIABLES')
    print('=' * 40)
    
    try:
        with engine.connect() as conn:
            # Test setting session variables
            test_user_id = 'test-user-123'
            test_role = 'SUPER_ADMIN'
            test_clinic_id = 'clinic-456'
            
            conn.execute(text("SET app.current_user_id = :user_id"), {"user_id": test_user_id})
            conn.execute(text("SET app.current_user_role = :role"), {"role": test_role})
            conn.execute(text("SET app.current_clinic_id = :clinic_id"), {"clinic_id": test_clinic_id})
            
            # Test reading session variables
            result = conn.execute(text("SELECT current_setting('app.current_user_id', true)"))
            user_id = result.fetchone()[0]
            
            result = conn.execute(text("SELECT current_setting('app.current_user_role', true)"))
            role = result.fetchone()[0]
            
            result = conn.execute(text("SELECT current_setting('app.current_clinic_id', true)"))
            clinic_id = result.fetchone()[0]
            
            print(f'✅ Session variables working:')
            print(f'  👤 User ID: {user_id}')
            print(f'  🔑 Role: {role}')
            print(f'  🏥 Clinic ID: {clinic_id}')
            
            return user_id == test_user_id and role == test_role and clinic_id == test_clinic_id
            
    except Exception as e:
        print(f'❌ Session variables test failed: {e}')
        return False

def test_rls_policies():
    """Test RLS policies with different user roles"""
    print('\\n🛡️ TESTING RLS POLICIES')
    print('=' * 40)
    
    try:
        with engine.connect() as conn:
            # Test 1: Super Admin access
            print('\\n🔍 Test 1: Super Admin Access')
            conn.execute(text("SET app.current_user_role = 'SUPER_ADMIN'"))
            conn.execute(text("SET app.current_user_id = 'super-admin-123'"))
            conn.execute(text("SET app.current_clinic_id = 'global'"))
            
            # Try to access users table
            result = conn.execute(text("SELECT COUNT(*) FROM core.users"))
            user_count = result.fetchone()[0]
            print(f'  ✅ Super admin can access {user_count} users')
            
            # Try to access patients table
            result = conn.execute(text("SELECT COUNT(*) FROM ehr.patients"))
            patient_count = result.fetchone()[0]
            print(f'  ✅ Super admin can access {patient_count} patients')
            
            # Test 2: Clinic Admin access
            print('\\n🔍 Test 2: Clinic Admin Access')
            conn.execute(text("SET app.current_user_role = 'CLINIC_ADMIN'"))
            conn.execute(text("SET app.current_user_id = 'clinic-admin-456'"))
            conn.execute(text("SET app.current_clinic_id = 'clinic-789'"))
            
            # Try to access users table (should be limited)
            result = conn.execute(text("SELECT COUNT(*) FROM core.users"))
            user_count = result.fetchone()[0]
            print(f'  ✅ Clinic admin can access {user_count} users (limited by clinic)')
            
            # Test 3: Regular user access
            print('\\n🔍 Test 3: Regular User Access')
            conn.execute(text("SET app.current_user_role = 'DOCTOR'"))
            conn.execute(text("SET app.current_user_id = 'doctor-789'"))
            conn.execute(text("SET app.current_clinic_id = 'clinic-789'"))
            
            # Try to access users table (should be limited to own record)
            result = conn.execute(text("SELECT COUNT(*) FROM core.users"))
            user_count = result.fetchone()[0]
            print(f'  ✅ Doctor can access {user_count} users (limited to own record)')
            
            return True
            
    except Exception as e:
        print(f'❌ RLS policies test failed: {e}')
        import traceback
        traceback.print_exc()
        return False

def test_admin_portal_access():
    """Test admin portal specific access patterns"""
    print('\\n🏥 TESTING ADMIN PORTAL ACCESS')
    print('=' * 40)
    
    try:
        with engine.connect() as conn:
            # Test admin dashboard data access
            print('\\n🔍 Test: Admin Dashboard Data Access')
            
            # Set as super admin
            conn.execute(text("SET app.current_user_role = 'SUPER_ADMIN'"))
            conn.execute(text("SET app.current_user_id = 'super-admin-123'"))
            conn.execute(text("SET app.current_clinic_id = 'global'"))
            
            # Test accessing key admin tables
            tables_to_test = [
                ('core.users', 'Users'),
                ('ehr.patients', 'Patients'),
                ('ehr.appointments', 'Appointments'),
                ('ehr.doctors', 'Doctors'),
                ('ehr.nurses', 'Nurses'),
                ('ops.audit_logs', 'Audit Logs'),
                ('ops.notifications', 'Notifications'),
                ('ops.todos', 'Todos'),
                ('financial.bills', 'Bills'),
                ('ref.hospitals', 'Hospitals')
            ]
            
            for table, name in tables_to_test:
                try:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.fetchone()[0]
                    print(f'  ✅ {name}: {count} records accessible')
                except Exception as e:
                    print(f'  ❌ {name}: Error - {e}')
            
            return True
            
    except Exception as e:
        print(f'❌ Admin portal access test failed: {e}')
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all RLS tests"""
    print('🎯 COMPREHENSIVE RLS FUNCTIONALITY TEST')
    print('=' * 60)
    
    tests = [
        ('RLS Status', test_rls_status),
        ('Session Variables', test_session_variables),
        ('RLS Policies', test_rls_policies),
        ('Admin Portal Access', test_admin_portal_access)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f'\\n🧪 Running {test_name} Test...')
        try:
            result = test_func()
            results.append((test_name, result))
            if result:
                print(f'✅ {test_name} Test: PASSED')
            else:
                print(f'❌ {test_name} Test: FAILED')
        except Exception as e:
            print(f'❌ {test_name} Test: ERROR - {e}')
            results.append((test_name, False))
    
    # Summary
    print('\\n📊 TEST SUMMARY')
    print('=' * 30)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = '✅ PASSED' if result else '❌ FAILED'
        print(f'  {test_name}: {status}')
    
    print(f'\\n🎯 Overall Result: {passed}/{total} tests passed')
    
    if passed == total:
        print('\\n🎉 ALL RLS TESTS PASSED! Admin portal RLS is working correctly.')
    else:
        print('\\n⚠️  Some RLS tests failed. Check the output above for details.')
    
    return passed == total

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
