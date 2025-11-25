-- Assign doctors to a clinic (hospital)
-- Run this script in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- 
-- This script:
-- 1. Creates a default hospital/clinic if none exists
-- 2. Assigns all doctor users to that clinic by setting their organization_id

DO $$
DECLARE
    default_hospital_id UUID;
    doctor_user RECORD;
    user_pk_col TEXT;
    assigned_count INT := 0;
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
    
    -- Check if any hospital exists, if not create a default one
    SELECT id INTO default_hospital_id
    FROM ref.hospitals
    WHERE is_active = TRUE
    LIMIT 1;
    
    IF default_hospital_id IS NULL THEN
        -- Create a default hospital
        INSERT INTO ref.hospitals (
            id,
            name,
            code,
            address,
            phone,
            email,
            is_active,
            created_at
        ) VALUES (
            gen_random_uuid(),
            'Central Medical Clinic',
            'CMC-001',
            'Tashkent, Uzbekistan',
            '+998901234567',
            'info@centralmedical.uz',
            TRUE,
            NOW()
        )
        RETURNING id INTO default_hospital_id;
        
        RAISE NOTICE 'Created default hospital: % (ID: %)', 'Central Medical Clinic', default_hospital_id;
    ELSE
        RAISE NOTICE 'Using existing hospital (ID: %)', default_hospital_id;
    END IF;
    
    -- Assign all doctor users to the hospital
    -- Use dynamic SQL to handle both 'id' and 'user_id' column names
    EXECUTE format('
        UPDATE core.users
        SET organization_id = %L::UUID
        WHERE role = ''DOCTOR''
        AND (organization_id IS NULL OR organization_id != %L::UUID)',
        default_hospital_id::TEXT,
        default_hospital_id::TEXT
    );
    
    -- Get count of assigned doctors
    EXECUTE format('
        SELECT COUNT(*) 
        FROM core.users
        WHERE role = ''DOCTOR''
        AND organization_id = %L::UUID',
        default_hospital_id::TEXT
    ) INTO assigned_count;
    
    RAISE NOTICE 'Fix complete! Assigned % doctor(s) to clinic', assigned_count;
END $$;

-- Verify the fix
-- Run ONE of these queries based on your schema:

-- If your core.users table uses 'id' as primary key (newer schema):
SELECT 
    u.email,
    u.role,
    CASE 
        WHEN u.organization_id IS NOT NULL THEN '✅ Has clinic'
        ELSE '❌ No clinic'
    END as clinic_status,
    h.name as clinic_name,
    h.code as clinic_code
FROM core.users u
LEFT JOIN ref.hospitals h ON h.id = u.organization_id
WHERE u.role = 'DOCTOR'
ORDER BY u.email;

-- OR if your core.users table uses 'user_id' as primary key (older schema):
-- SELECT 
--     u.email,
--     u.role,
--     CASE 
--         WHEN u.organization_id IS NOT NULL THEN '✅ Has clinic'
--         ELSE '❌ No clinic'
--     END as clinic_status,
--     h.name as clinic_name,
--     h.code as clinic_code
-- FROM core.users u
-- LEFT JOIN ref.hospitals h ON h.id = u.organization_id
-- WHERE u.role = 'DOCTOR'
-- ORDER BY u.email;

