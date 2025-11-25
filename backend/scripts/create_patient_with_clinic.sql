-- Create a patient and assign them to a clinic
-- Run this script in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- 
-- This script:
-- 1. Creates a User account for the patient (optional, for portal access)
-- 2. Creates a Patient record
-- 3. Associates the patient with a clinic via organization_patients table

DO $$
DECLARE
    clinic_id UUID;
    patient_user_id UUID;
    v_patient_id UUID;  -- Renamed to avoid conflict with column name
    user_pk_col TEXT;
    patient_email TEXT := 'patient@example.com';
    patient_first_name TEXT := 'John';
    patient_last_name TEXT := 'Doe';
    patient_phone TEXT := '+998901234567';
    patient_dob DATE := '1990-01-15';
    patient_gender TEXT := 'M';
    local_mrn TEXT;
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
    
    -- Get or create a clinic (hospital)
    SELECT id INTO clinic_id
    FROM ref.hospitals
    WHERE is_active = TRUE
    LIMIT 1;
    
    IF clinic_id IS NULL THEN
        -- Create a default hospital if none exists
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
        RETURNING id INTO clinic_id;
        
        RAISE NOTICE 'Created default hospital: Central Medical Clinic (ID: %)', clinic_id;
    ELSE
        RAISE NOTICE 'Using existing hospital (ID: %)', clinic_id;
    END IF;
    
    -- Check if user already exists
    EXECUTE format('
        SELECT %I
        FROM core.users
        WHERE email = %L
        LIMIT 1',
        user_pk_col, patient_email
    ) INTO patient_user_id;
    
    IF patient_user_id IS NULL THEN
        -- Create a User account for the patient
        -- Note: Password hash is required, using a placeholder
        -- In production, use proper password hashing (bcrypt)
        patient_user_id := gen_random_uuid();
        
        EXECUTE format('
            INSERT INTO core.users (
                %I,
                email,
                password_hash,
                first_name,
                last_name,
                full_name,
                phone,
                role,
                status,
                is_active,
                email_verified,
                created_at
            ) VALUES (
                %L::UUID,
                %L,
                %L,  -- Placeholder hash: "Patient123!" - should use proper hashing in production
                %L,
                %L,
                %L,
                %L,
                ''PATIENT'',
                ''ACTIVE'',
                TRUE,
                TRUE,
                NOW()
            )',
            user_pk_col,
            patient_user_id::TEXT,
            patient_email,
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqBWVHxkd0',  -- Placeholder password hash
            patient_first_name,
            patient_last_name,
            patient_first_name || ' ' || patient_last_name,
            patient_phone
        );
        
        RAISE NOTICE 'Created user account for patient: %', patient_email;
    ELSE
        RAISE NOTICE 'User account already exists: %', patient_email;
    END IF;
    
    -- Check if patient already exists
    SELECT p.patient_id INTO v_patient_id
    FROM ehr.patients p
    WHERE p.user_id = patient_user_id
    LIMIT 1;
    
    IF v_patient_id IS NULL THEN
        -- Create Patient record
        v_patient_id := gen_random_uuid();
        
        INSERT INTO ehr.patients (
            patient_id,
            user_id,
            date_of_birth,
            sex,
            phone,
            created_at
        ) VALUES (
            v_patient_id,
            patient_user_id,
            patient_dob,
            patient_gender,
            patient_phone,
            NOW()
        );
        
        RAISE NOTICE 'Created patient record (ID: %)', v_patient_id;
    ELSE
        RAISE NOTICE 'Patient record already exists (ID: %)', v_patient_id;
    END IF;
    
    -- Check if patient is already assigned to this clinic
    IF NOT EXISTS (
        SELECT 1 
        FROM ehr.organization_patients op
        WHERE op.organization_id = clinic_id 
        AND op.patient_id = v_patient_id
    ) THEN
        -- Generate a local MRN (Medical Record Number) for this clinic
        local_mrn := 'MRN-' || UPPER(SUBSTRING(clinic_id::TEXT FROM 1 FOR 8)) || '-' || 
                     LPAD((SELECT COUNT(*) + 1 FROM ehr.organization_patients WHERE organization_id = clinic_id)::TEXT, 6, '0');
        
        -- Create organization_patients entry to assign patient to clinic
        INSERT INTO ehr.organization_patients (
            organization_id,
            patient_id,
            local_mrn,
            status,
            consent_share,
            first_seen_at,
            created_at
        ) VALUES (
            clinic_id,
            v_patient_id,
            local_mrn,
            'active',
            FALSE,  -- Default: patient has not consented to data sharing
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Assigned patient to clinic (Local MRN: %)', local_mrn;
    ELSE
        RAISE NOTICE 'Patient already assigned to this clinic';
    END IF;
    
    RAISE NOTICE 'Patient creation complete!';
    RAISE NOTICE '  Patient ID: %', v_patient_id;
    RAISE NOTICE '  User ID: %', patient_user_id;
    RAISE NOTICE '  Clinic ID: %', clinic_id;
    RAISE NOTICE '  Email: %', patient_email;
    
END $$;

-- Verify the patient was created and assigned
-- Run ONE of these queries based on your schema:

-- If your core.users table uses 'id' as primary key (newer schema):
SELECT 
    p.patient_id,
    u.email,
    COALESCE(u.first_name || ' ' || u.last_name, u.full_name, 'N/A') as patient_name,
    u.phone,
    p.date_of_birth,
    p.sex,
    h.name as clinic_name,
    h.code as clinic_code,
    op.local_mrn,
    op.status as clinic_status,
    op.first_seen_at
FROM ehr.patients p
JOIN core.users u ON u.id = p.user_id
LEFT JOIN ehr.organization_patients op ON op.patient_id = p.patient_id
LEFT JOIN ref.hospitals h ON h.id = op.organization_id
WHERE u.email = 'patient@example.com'
ORDER BY op.first_seen_at DESC;

-- OR if your core.users table uses 'user_id' as primary key (older schema):
-- SELECT 
--     p.patient_id,
--     u.email,
--     COALESCE(u.first_name || ' ' || u.last_name, u.full_name, 'N/A') as patient_name,
--     u.phone,
--     p.date_of_birth,
--     p.sex,
--     h.name as clinic_name,
--     h.code as clinic_code,
--     op.local_mrn,
--     op.status as clinic_status,
--     op.first_seen_at
-- FROM ehr.patients p
-- JOIN core.users u ON u.user_id = p.user_id
-- LEFT JOIN ehr.organization_patients op ON op.patient_id = p.patient_id
-- LEFT JOIN ref.hospitals h ON h.id = op.organization_id
-- WHERE u.email = 'patient@example.com'
-- ORDER BY op.first_seen_at DESC;

