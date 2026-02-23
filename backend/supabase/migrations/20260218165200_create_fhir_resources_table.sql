-- Migration: Create ops.fhir_resources and ehr.source_translations tables for FHIR resource storage
-- Created: 2026-02-18

-- Create the fhir_resources table in ops schema
CREATE TABLE IF NOT EXISTS ops.fhir_resources (
    key TEXT NOT NULL PRIMARY KEY,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    resource JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_fhir_resources_resource_type ON ops.fhir_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_fhir_resources_resource_id ON ops.fhir_resources(resource_id);
CREATE INDEX IF NOT EXISTS idx_fhir_resources_created_at ON ops.fhir_resources(created_at);

-- Add comments
COMMENT ON TABLE ops.fhir_resources IS 'Stores raw FHIR resources as JSONB for hybrid storage approach';
COMMENT ON COLUMN ops.fhir_resources.key IS 'Composite key: {resourceType}/{resourceId}';
COMMENT ON COLUMN ops.fhir_resources.resource_type IS 'FHIR resource type (Patient, Condition, Observation, etc.)';
COMMENT ON COLUMN ops.fhir_resources.resource_id IS 'FHIR resource ID';
COMMENT ON COLUMN ops.fhir_resources.resource IS 'Complete FHIR resource as JSONB';

-- Create the source_translations table in ehr schema
CREATE TABLE IF NOT EXISTS ehr.source_translations (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    fhir_resource_type TEXT NOT NULL,
    fhir_resource_id TEXT NOT NULL,
    original_text TEXT NOT NULL,
    source_language TEXT NOT NULL DEFAULT 'ru',
    extracted_from_div TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_fhir_resource_translation UNIQUE (fhir_resource_type, fhir_resource_id)
);

-- Create indexes for source_translations
CREATE INDEX IF NOT EXISTS idx_source_translations_resource_type ON ehr.source_translations(fhir_resource_type);
CREATE INDEX IF NOT EXISTS idx_source_translations_resource_id ON ehr.source_translations(fhir_resource_id);
CREATE INDEX IF NOT EXISTS idx_source_translations_created_at ON ehr.source_translations(created_at);

-- Add comments
COMMENT ON TABLE ehr.source_translations IS 'Stores original source language text from FHIR resource text.div for clinical audit trail';
COMMENT ON COLUMN ehr.source_translations.fhir_resource_type IS 'FHIR resource type (Patient, Condition, Observation, etc.)';
COMMENT ON COLUMN ehr.source_translations.fhir_resource_id IS 'The FHIR resource ID';
COMMENT ON COLUMN ehr.source_translations.original_text IS 'Original source language text from text.div';
COMMENT ON COLUMN ehr.source_translations.source_language IS 'Language code (ru, uz, etc.)';
COMMENT ON COLUMN ehr.source_translations.extracted_from_div IS 'Full HTML div content if needed';
