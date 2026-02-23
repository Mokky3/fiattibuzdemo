-- Fix missing Doctor profiles for existing doctor users
-- Run this script in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- 
-- This script:
-- 1. Finds all users with role='DOCTOR' that don't have Doctor profiles
-- 2. Creates Doctor profiles for them with default values
--
-- Note: This script handles both 'id' and 'user_id' column names in core.users table

DO $$
DECLARE
    doctor_user RECORD;
    license_num TEXT;
    doctor_count INT;
    user_id_col UUID;
    user_pk_col TEXT;
BEGIN
    -- Detect which primary key column exists in core.users
    SELECT column_name INTO user_pk_col
    FROM information_schema.columns
    WHERE table_schema = 'core'
    AND table_name = 'users'
    AND column_name IN ('id', 'user_id')
    ORDER BY CASE column_name WHEN 'id' THEN 1 ELSE 2 END
    LIMIT 1;
    
    IF user_pk_col IS NULL THEN
        RAISE EXCEPTION 'Could not find primary key column (id or user_id) in core.users table';
    END IF;
    
    RAISE NOTICE 'Using column: %', user_pk_col;
    
    -- Find all doctor users without Doctor profiles
    -- Use dynamic SQL to handle both column names
    FOR doctor_user IN 
        EXECUTE format('
            SELECT 
                %I as user_id,
                email,
                COALESCE(first_name, split_part(full_name, '' '', 1), '''') as first_name,
                COALESCE(last_name, split_part(full_name, '' '', 2), '''') as last_name
            FROM core.users u
            WHERE u.role = ''DOCTOR''
            AND NOT EXISTS (
                SELECT 1 
                FROM ehr.doctors d 
                WHERE d.user_id = u.%I
            )',
            user_pk_col, user_pk_col
        )
    LOOP
        user_id_col := doctor_user.user_id;
        
        -- Generate a unique license number based on user ID
        license_num := 'DOC-' || UPPER(SUBSTRING(user_id_col::TEXT FROM 1 FOR 8));
        
        -- Check if license number already exists and generate a new one if needed
        WHILE EXISTS (SELECT 1 FROM ehr.doctors WHERE license_number = license_num) LOOP
            license_num := 'DOC-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));
        END LOOP;
        
        -- Insert Doctor profile
        INSERT INTO ehr.doctors (
            id,
            user_id,
            license_number,
            primary_specialization,
            license_issuer,
            is_accepting_patients,
            created_at
        ) VALUES (
            gen_random_uuid(),
            user_id_col,
            license_num,
            'General Practice',
            'Ministry of Health',
            TRUE,
            NOW()
        );
        
        RAISE NOTICE 'Created doctor profile for % (License: %)', doctor_user.email, license_num;
    END LOOP;
    
    -- Count how many were fixed
    EXECUTE format('
        SELECT COUNT(*)
        FROM core.users u
        WHERE u.role = ''DOCTOR''
        AND EXISTS (
            SELECT 1 
            FROM ehr.doctors d 
            WHERE d.user_id = u.%I
        )',
        user_pk_col
    ) INTO doctor_count;
    
    RAISE NOTICE 'Fix complete! Total doctor users with profiles: %', doctor_count;
END $$;

-- Verify the fix
-- Run ONE of these queries based on your schema:

-- If your core.users table uses 'id' as primary key (newer schema):
SELECT 
    u.email,
    u.role,
    CASE 
        WHEN d.id IS NOT NULL THEN '✅ Has profile'
        ELSE '❌ Missing profile'
    END as profile_status,
    d.license_number,
    d.primary_specialization
FROM core.users u
LEFT JOIN ehr.doctors d ON d.user_id = u.id
WHERE u.role = 'DOCTOR'
ORDER BY u.email;

-- OR if your core.users table uses 'user_id' as primary key (older schema):
-- SELECT 
--     u.email,
--     u.role,
--     CASE 
--         WHEN d.id IS NOT NULL THEN '✅ Has profile'
--         ELSE '❌ Missing profile'
--     END as profile_status,
--     d.license_number,
--     d.primary_specialization
-- FROM core.users u
-- LEFT JOIN ehr.doctors d ON d.user_id = u.user_id
-- WHERE u.role = 'DOCTOR'
-- ORDER BY u.email;

