-- Migration: Create messaging tables for HIPAA-compliant secure messaging
-- This migration creates message_threads, message_thread_participants, and message_receipts tables
-- Note: Assumes core and ehr schemas already exist

-- Step 1: Create message_threads table
CREATE TABLE IF NOT EXISTS ehr.message_threads (
    id VARCHAR(255) PRIMARY KEY,
    thread_type VARCHAR(50) NOT NULL CHECK (thread_type IN ('patient_chat', 'case_room', 'staff_channel', 'staff_chat')),
    patient_id UUID REFERENCES ehr.patients(patient_id) ON DELETE SET NULL,
    encounter_id UUID REFERENCES ehr.encounters(id) ON DELETE SET NULL,
    clinic_id VARCHAR(255),
    title VARCHAR(500),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    retention_days INTEGER,
    expires_at TIMESTAMPTZ,
    fhir_communication_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

-- Step 2: Create message_thread_participants table
-- Note: user_id references core.users(id) which is the primary key
CREATE TABLE IF NOT EXISTS ehr.message_thread_participants (
    id VARCHAR(255) PRIMARY KEY,
    thread_id VARCHAR(255) NOT NULL REFERENCES ehr.message_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    role VARCHAR(50), -- doctor, nurse, patient, staff
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at TIMESTAMPTZ,
    notify_on_message BOOLEAN DEFAULT TRUE,
    notify_on_mention BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 3: Create message_receipts table for HIPAA-compliant read receipt tracking
CREATE TABLE IF NOT EXISTS ehr.message_receipts (
    id VARCHAR(255) PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES ehr.messages(id) ON DELETE CASCADE,
    thread_id VARCHAR(255) REFERENCES ehr.message_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    delivered BOOLEAN DEFAULT FALSE,
    delivered_at TIMESTAMPTZ,
    device_info VARCHAR(500), -- User agent, device type
    ip_address VARCHAR(45), -- For HIPAA audit trail (supports IPv6)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ
);

-- Step 3.5: Create message_attachments table for file/document attachments
CREATE TABLE IF NOT EXISTS ehr.message_attachments (
    id VARCHAR(255) PRIMARY KEY,
    message_id VARCHAR(255) NOT NULL, -- References ehr.messages.id (UUID stored as string)
    file_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    file_url TEXT NOT NULL,
    description TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    fhir_binary_id VARCHAR(255)
);

-- Step 4: Update messages table to add thread_id and other new columns if they don't exist
DO $$ 
BEGIN
    -- Add thread_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'ehr' 
                   AND table_name = 'messages' 
                   AND column_name = 'thread_id') THEN
        ALTER TABLE ehr.messages ADD COLUMN thread_id VARCHAR(255) REFERENCES ehr.message_threads(id) ON DELETE SET NULL;
    END IF;
    
    -- Add conversation_id column if it doesn't exist (for backward compatibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'ehr' 
                   AND table_name = 'messages' 
                   AND column_name = 'conversation_id') THEN
        ALTER TABLE ehr.messages ADD COLUMN conversation_id VARCHAR(255);
    END IF;
    
    -- Add patient_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'ehr' 
                   AND table_name = 'messages' 
                   AND column_name = 'patient_id') THEN
        ALTER TABLE ehr.messages ADD COLUMN patient_id UUID REFERENCES ehr.patients(patient_id) ON DELETE SET NULL;
    END IF;
    
    -- Add clinic_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'ehr' 
                   AND table_name = 'messages' 
                   AND column_name = 'clinic_id') THEN
        ALTER TABLE ehr.messages ADD COLUMN clinic_id VARCHAR(255);
    END IF;
    
    -- Add message_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'ehr' 
                   AND table_name = 'messages' 
                   AND column_name = 'message_type') THEN
        ALTER TABLE ehr.messages ADD COLUMN message_type VARCHAR(50) DEFAULT 'text';
    END IF;
    
    -- Add priority column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'ehr' 
                   AND table_name = 'messages' 
                   AND column_name = 'priority') THEN
        ALTER TABLE ehr.messages ADD COLUMN priority VARCHAR(50) DEFAULT 'normal';
    END IF;
    
    -- Add read column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'ehr' 
                   AND table_name = 'messages' 
                   AND column_name = 'read') THEN
        ALTER TABLE ehr.messages ADD COLUMN read BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add read_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'ehr' 
                   AND table_name = 'messages' 
                   AND column_name = 'read_at') THEN
        ALTER TABLE ehr.messages ADD COLUMN read_at TIMESTAMPTZ;
    END IF;
    
    -- Add delivered column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'ehr' 
                   AND table_name = 'messages' 
                   AND column_name = 'delivered') THEN
        ALTER TABLE ehr.messages ADD COLUMN delivered BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add delivered_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'ehr' 
                   AND table_name = 'messages' 
                   AND column_name = 'delivered_at') THEN
        ALTER TABLE ehr.messages ADD COLUMN delivered_at TIMESTAMPTZ;
    END IF;
    
    -- Add timestamp column if it doesn't exist (use created_at as fallback)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'ehr' 
                   AND table_name = 'messages' 
                   AND column_name = 'timestamp') THEN
        ALTER TABLE ehr.messages ADD COLUMN timestamp TIMESTAMPTZ DEFAULT now();
    END IF;
    
    -- Add deleted_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'ehr' 
                   AND table_name = 'messages' 
                   AND column_name = 'deleted_at') THEN
        ALTER TABLE ehr.messages ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
    
    -- Add content column if it doesn't exist (rename from message_content if needed)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'ehr' 
                   AND table_name = 'messages' 
                   AND column_name = 'content') THEN
        -- Check if message_content exists and rename it
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'ehr' 
                   AND table_name = 'messages' 
                   AND column_name = 'message_content') THEN
            ALTER TABLE ehr.messages RENAME COLUMN message_content TO content;
        ELSE
            ALTER TABLE ehr.messages ADD COLUMN content TEXT;
        END IF;
    END IF;
    
    -- Add parent_message_id column if it doesn't exist
    -- Note: Using UUID to match existing messages.id type (model expects String but DB has UUID)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'ehr' 
                   AND table_name = 'messages' 
                   AND column_name = 'parent_message_id') THEN
        ALTER TABLE ehr.messages ADD COLUMN parent_message_id UUID;
        -- Add foreign key constraint separately if possible
        -- ALTER TABLE ehr.messages ADD CONSTRAINT fk_parent_message FOREIGN KEY (parent_message_id) REFERENCES ehr.messages(id) ON DELETE SET NULL;
    END IF;
    
    -- Add is_system_message column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'ehr' 
                   AND table_name = 'messages' 
                   AND column_name = 'is_system_message') THEN
        ALTER TABLE ehr.messages ADD COLUMN is_system_message BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add template_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'ehr' 
                   AND table_name = 'messages' 
                   AND column_name = 'template_id') THEN
        ALTER TABLE ehr.messages ADD COLUMN template_id VARCHAR(255);
    END IF;
    
    -- Add template_variables column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'ehr' 
                   AND table_name = 'messages' 
                   AND column_name = 'template_variables') THEN
        ALTER TABLE ehr.messages ADD COLUMN template_variables TEXT;
    END IF;
    
    -- Add fhir_communication_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'ehr' 
                   AND table_name = 'messages' 
                   AND column_name = 'fhir_communication_id') THEN
        ALTER TABLE ehr.messages ADD COLUMN fhir_communication_id VARCHAR(255);
    END IF;
    
    -- Add edited_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'ehr' 
                   AND table_name = 'messages' 
                   AND column_name = 'edited_at') THEN
        ALTER TABLE ehr.messages ADD COLUMN edited_at TIMESTAMPTZ;
    END IF;
    
    -- Change id column type to VARCHAR if it's UUID (for compatibility)
    -- Note: We'll keep UUID for now but ensure it works with string IDs
    -- The model uses String, but the database might have UUID
END $$;

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_threads_patient_id ON ehr.message_threads(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_threads_encounter_id ON ehr.message_threads(encounter_id) WHERE encounter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_threads_clinic_id ON ehr.message_threads(clinic_id) WHERE clinic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_threads_thread_type ON ehr.message_threads(thread_type);
CREATE INDEX IF NOT EXISTS idx_message_threads_is_active ON ehr.message_threads(is_active);
CREATE INDEX IF NOT EXISTS idx_message_threads_is_archived ON ehr.message_threads(is_archived);

CREATE INDEX IF NOT EXISTS idx_message_thread_participants_thread_id ON ehr.message_thread_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_message_thread_participants_user_id ON ehr.message_thread_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_message_thread_participants_is_active ON ehr.message_thread_participants(is_active);

CREATE INDEX IF NOT EXISTS idx_message_receipts_message_id ON ehr.message_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_receipts_thread_id ON ehr.message_receipts(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_receipts_user_id ON ehr.message_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_message_receipts_read ON ehr.message_receipts(read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_message_receipts_delivered ON ehr.message_receipts(delivered) WHERE delivered = FALSE;

CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON ehr.messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON ehr.messages(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_patient_id ON ehr.messages(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_clinic_id ON ehr.messages(clinic_id) WHERE clinic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON ehr.messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON ehr.messages(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON ehr.message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_uploaded_at ON ehr.message_attachments(uploaded_at);

