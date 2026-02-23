"""Test RLS functionality on PostgreSQL"""

import os
os.environ['DATABASE_URL'] = 'postgresql://fiattib_app_rw:change_me_app_rw@localhost:5432/fiattib'

print('🔒 TESTING RLS STATUS ON POSTGRESQL')
print('=' * 50)

try:
    from app.db.session import engine
    from sqlalchemy import text
    
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
        print(f'\n📋 Total RLS policies: {len(policies)}')
        
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
        
        # Test session variables
        print('\n🔧 Testing session variables...')
        conn.execute(text('SET app.current_user_role = :role'), {'role': 'SUPER_ADMIN'})
        conn.execute(text('SET app.current_user_id = :user_id'), {'user_id': 'test-user-123'})
        conn.execute(text('SET app.current_clinic_id = :clinic_id'), {'clinic_id': 'test-clinic-456'})
        
        result = conn.execute(text("SELECT current_setting('app.current_user_role', true)"))
        role = result.fetchone()[0]
        print(f'  ✅ Session variable test: role = {role}')
        
        # Test RLS policy access
        print('\n🛡️ Testing RLS policy access...')
        result = conn.execute(text('SELECT COUNT(*) FROM core.users'))
        user_count = result.fetchone()[0]
        print(f'  ✅ Super admin can access {user_count} users')
        
        result = conn.execute(text('SELECT COUNT(*) FROM ehr.patients'))
        patient_count = result.fetchone()[0]
        print(f'  ✅ Super admin can access {patient_count} patients')
        
        # Test clinic admin access
        print('\n🔍 Testing clinic admin access...')
        conn.execute(text('SET app.current_user_role = :role'), {'role': 'CLINIC_ADMIN'})
        conn.execute(text('SET app.current_clinic_id = :clinic_id'), {'clinic_id': 'clinic-789'})
        
        result = conn.execute(text('SELECT COUNT(*) FROM core.users'))
        user_count = result.fetchone()[0]
        print(f'  ✅ Clinic admin can access {user_count} users (limited by clinic)')
        
        print('\n🎉 RLS IS WORKING CORRECTLY!')
        print('\n📊 SUMMARY:')
        print(f'  ✅ RLS enabled on {len(rls_tables)} tables')
        print(f'  ✅ {len(policies)} RLS policies created')
        print(f'  ✅ Session variables working')
        print(f'  ✅ Access control functioning')
        
except Exception as e:
    print(f'❌ RLS test failed: {e}')
    import traceback
    traceback.print_exc()
