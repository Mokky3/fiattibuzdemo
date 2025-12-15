-- Migration: Add organization column to user_profiles table
-- Date: 2025-01-XX
-- Description: Adds organization field to store organization/hospital name for doctors

-- Add organization column to core.user_profiles table
ALTER TABLE core.user_profiles 
ADD COLUMN IF NOT EXISTS organization VARCHAR(200);

-- Add comment to the column
COMMENT ON COLUMN core.user_profiles.organization IS 'Organization/hospital name for medical staff';



