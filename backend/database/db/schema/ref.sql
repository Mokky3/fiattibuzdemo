-- Reference schema tables

-- Specialties table
CREATE TABLE IF NOT EXISTS ref.specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ICD Codes table
CREATE TABLE IF NOT EXISTS ref.icd_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CPT Codes table
CREATE TABLE IF NOT EXISTS ref.cpt_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Medications table
CREATE TABLE IF NOT EXISTS ref.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  generic_name TEXT,
  brand_name TEXT,
  ndc_code TEXT UNIQUE,
  dosage_form TEXT,
  strength TEXT,
  manufacturer TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lab Tests table
CREATE TABLE IF NOT EXISTS ref.lab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_code TEXT NOT NULL UNIQUE,
  test_name TEXT NOT NULL,
  category TEXT,
  normal_range_low FLOAT,
  normal_range_high FLOAT,
  unit TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hospitals table
CREATE TABLE IF NOT EXISTS ref.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  address TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pharmacies table
CREATE TABLE IF NOT EXISTS ref.pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  address TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_specialties_code ON ref.specialties (code);
CREATE INDEX IF NOT EXISTS idx_specialties_is_active ON ref.specialties (is_active);
CREATE INDEX IF NOT EXISTS idx_icd_codes_code ON ref.icd_codes (code);
CREATE INDEX IF NOT EXISTS idx_icd_codes_category ON ref.icd_codes (category);
CREATE INDEX IF NOT EXISTS idx_cpt_codes_code ON ref.cpt_codes (code);
CREATE INDEX IF NOT EXISTS idx_cpt_codes_category ON ref.cpt_codes (category);
CREATE INDEX IF NOT EXISTS idx_medications_ndc_code ON ref.medications (ndc_code);
CREATE INDEX IF NOT EXISTS idx_medications_name ON ref.medications (name);
CREATE INDEX IF NOT EXISTS idx_lab_tests_test_code ON ref.lab_tests (test_code);
CREATE INDEX IF NOT EXISTS idx_lab_tests_category ON ref.lab_tests (category);
CREATE INDEX IF NOT EXISTS idx_hospitals_code ON ref.hospitals (code);
CREATE INDEX IF NOT EXISTS idx_pharmacies_code ON ref.pharmacies (code);
