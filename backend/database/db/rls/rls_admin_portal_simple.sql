-- Simplified Row Level Security (RLS) Configuration for Admin Portal
-- This file implements basic access control for existing tables only

-- Enable RLS on existing core tables
ALTER TABLE core.users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on existing EHR tables
ALTER TABLE ehr.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr.messages ENABLE ROW LEVEL SECURITY;

-- Enable RLS on existing operations tables
ALTER TABLE ops.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.todos ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CORE USERS TABLE POLICIES
-- ============================================================================

-- Policy: Super admins can access all users
CREATE POLICY admin_super_admin_all_users ON core.users
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

-- Policy: Clinic admins can access users in their clinic
CREATE POLICY admin_clinic_admin_clinic_users ON core.users
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            -- Access users in same clinic (using organization_id as clinic_id)
            organization_id::text = current_setting('app.current_clinic_id', true) OR
            -- Access users with no clinic assignment (global users)
            organization_id IS NULL
        )
    );

-- Policy: Users can always access their own record
CREATE POLICY admin_users_own_record ON core.users
    FOR ALL
    TO fiattib_app_rw
    USING (
        user_id::text = current_setting('app.current_user_id', true)
    );

-- ============================================================================
-- PATIENTS TABLE POLICIES
-- ============================================================================

-- Policy: Super admins can access all patients
CREATE POLICY admin_super_admin_all_patients ON ehr.patients
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

-- Policy: Clinic admins can access patients in their clinic
CREATE POLICY admin_clinic_admin_clinic_patients ON ehr.patients
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            -- Access patients in same clinic
            user_id IN (
                SELECT user_id FROM core.users 
                WHERE organization_id::text = current_setting('app.current_clinic_id', true)
            ) OR
            -- Access patients with no clinic assignment
            user_id IN (
                SELECT user_id FROM core.users 
                WHERE organization_id IS NULL
            )
        )
    );

-- ============================================================================
-- APPOINTMENTS TABLE POLICIES
-- ============================================================================

-- Policy: Super admins can access all appointments
CREATE POLICY admin_super_admin_all_appointments ON ehr.appointments
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

-- Policy: Clinic admins can access appointments in their clinic
CREATE POLICY admin_clinic_admin_clinic_appointments ON ehr.appointments
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            -- Access appointments with patients in same clinic
            patient_id IN (
                SELECT patient_id FROM ehr.patients p
                JOIN core.users u ON p.user_id = u.user_id
                WHERE u.organization_id::text = current_setting('app.current_clinic_id', true)
            ) OR
            -- Access appointments with doctors in same clinic
            doctor_id IN (
                SELECT user_id FROM core.users 
                WHERE organization_id::text = current_setting('app.current_clinic_id', true)
            ) OR
            -- Access appointments with no clinic assignment
            (patient_id IN (
                SELECT patient_id FROM ehr.patients p
                JOIN core.users u ON p.user_id = u.user_id
                WHERE u.organization_id IS NULL
            ) OR doctor_id IN (
                SELECT user_id FROM core.users 
                WHERE organization_id IS NULL
            ))
        )
    );

-- ============================================================================
-- MESSAGES TABLE POLICIES
-- ============================================================================

-- Policy: Super admins can access all messages
CREATE POLICY admin_super_admin_all_messages ON ehr.messages
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

-- Policy: Clinic admins can access messages in their clinic
CREATE POLICY admin_clinic_admin_clinic_messages ON ehr.messages
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            -- Access messages involving users in their clinic
            sender_id IN (
                SELECT user_id FROM core.users 
                WHERE organization_id::text = current_setting('app.current_clinic_id', true)
            ) OR
            recipient_id IN (
                SELECT user_id FROM core.users 
                WHERE organization_id::text = current_setting('app.current_clinic_id', true)
            )
        )
    );

-- ============================================================================
-- AUDIT LOGS TABLE POLICIES
-- ============================================================================

-- Policy: Super admins can access all audit logs
CREATE POLICY admin_super_admin_all_audit_logs ON ops.audit_logs
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

-- Policy: Clinic admins can access audit logs for their clinic
CREATE POLICY admin_clinic_admin_clinic_audit_logs ON ops.audit_logs
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            -- Access audit logs for their clinic
            clinic_id = current_setting('app.current_clinic_id', true) OR
            -- Access global audit logs (no clinic specified)
            clinic_id IS NULL
        )
    );

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

-- Policy: Super admins can access all notifications
CREATE POLICY admin_super_admin_all_notifications ON ops.notifications
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

-- Policy: Clinic admins can access notifications for their clinic
CREATE POLICY admin_clinic_admin_clinic_notifications ON ops.notifications
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        (
            -- Access notifications for their clinic
            clinic_id = current_setting('app.current_clinic_id', true) OR
            -- Access global notifications
            clinic_id IS NULL OR
            -- Access notifications for users in their clinic
            user_id IN (
                SELECT user_id FROM core.users 
                WHERE organization_id::text = current_setting('app.current_clinic_id', true)
            )
        )
    );

-- ============================================================================
-- TODOS TABLE POLICIES
-- ============================================================================

-- Policy: Super admins can access all todos
CREATE POLICY admin_super_admin_all_todos ON ops.todos
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );

-- Policy: Clinic admins can access todos for their clinic
CREATE POLICY admin_clinic_admin_clinic_todos ON ops.todos
    FOR ALL
    TO fiattib_app_rw
    USING (
        current_setting('app.current_user_role', true) = 'CLINIC_ADMIN' AND
        user_id IN (
            SELECT user_id FROM core.users 
            WHERE organization_id::text = current_setting('app.current_clinic_id', true)
        )
    );

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY admin_super_admin_all_users ON core.users IS 'Super admins can access all users across all clinics';
COMMENT ON POLICY admin_clinic_admin_clinic_users ON core.users IS 'Clinic admins can only access users in their assigned clinic';
COMMENT ON POLICY admin_users_own_record ON core.users IS 'Users can always access their own user record';

COMMENT ON POLICY admin_super_admin_all_patients ON ehr.patients IS 'Super admins can access all patients across all clinics';
COMMENT ON POLICY admin_clinic_admin_clinic_patients ON ehr.patients IS 'Clinic admins can only access patients in their assigned clinic';

COMMENT ON POLICY admin_super_admin_all_appointments ON ehr.appointments IS 'Super admins can access all appointments across all clinics';
COMMENT ON POLICY admin_clinic_admin_clinic_appointments ON ehr.appointments IS 'Clinic admins can only access appointments in their assigned clinic';

COMMENT ON POLICY admin_super_admin_all_messages ON ehr.messages IS 'Super admins can access all messages across all clinics';
COMMENT ON POLICY admin_clinic_admin_clinic_messages ON ehr.messages IS 'Clinic admins can only access messages in their assigned clinic';

COMMENT ON POLICY admin_super_admin_all_audit_logs ON ops.audit_logs IS 'Super admins can access all audit logs across all clinics';
COMMENT ON POLICY admin_clinic_admin_clinic_audit_logs ON ops.audit_logs IS 'Clinic admins can only access audit logs for their assigned clinic';

COMMENT ON POLICY admin_super_admin_all_notifications ON ops.notifications IS 'Super admins can access all notifications across all clinics';
COMMENT ON POLICY admin_clinic_admin_clinic_notifications ON ops.notifications IS 'Clinic admins can only access notifications for their assigned clinic';

COMMENT ON POLICY admin_super_admin_all_todos ON ops.todos IS 'Super admins can access all todos across all clinics';
COMMENT ON POLICY admin_clinic_admin_clinic_todos ON ops.todos IS 'Clinic admins can only access todos for users in their assigned clinic';
