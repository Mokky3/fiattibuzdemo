-- Migration: Add ICD-11 support to ref.icd_codes table
-- This migration adds multilingual support and versioning to ICD codes

-- Step 1: Add new columns for ICD-11
ALTER TABLE ref.icd_codes 
ADD COLUMN IF NOT EXISTS version TEXT DEFAULT 'ICD-11' NOT NULL,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS description_ru TEXT,
ADD COLUMN IF NOT EXISTS description_uz TEXT,
ADD COLUMN IF NOT EXISTS chapter TEXT,
ADD COLUMN IF NOT EXISTS parent_code TEXT,
ADD COLUMN IF NOT EXISTS level INTEGER;

-- Step 2: Migrate existing description to description_en (if exists)
-- Keep description column for backward compatibility
UPDATE ref.icd_codes 
SET description_en = description 
WHERE description_en IS NULL AND description IS NOT NULL;

-- Step 3: Drop old unique constraint on code (if exists)
ALTER TABLE ref.icd_codes DROP CONSTRAINT IF EXISTS icd_codes_code_key;
ALTER TABLE ref.icd_codes DROP CONSTRAINT IF EXISTS icd_codes_code_unique;

-- Step 4: Create new unique constraint on (code, version)
CREATE UNIQUE INDEX IF NOT EXISTS icd_codes_code_version_unique 
ON ref.icd_codes(code, version);

-- Step 5: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_icd_codes_version ON ref.icd_codes(version);
CREATE INDEX IF NOT EXISTS idx_icd_codes_parent_code ON ref.icd_codes(parent_code) WHERE parent_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_icd_codes_code ON ref.icd_codes(code);

-- Step 6: Set default version for existing records (if they don't have one)
UPDATE ref.icd_codes 
SET version = 'ICD-10' 
WHERE version IS NULL OR version = '';

-- Step 7: Ensure at least one description exists (en, ru, or uz)
-- This constraint is handled at application level, not database level
-- since we need to allow partial multilingual data during migration

