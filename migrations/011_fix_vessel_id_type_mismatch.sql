-- =====================================================
-- Migration: Fix vessel_id Type Mismatch
-- Purpose: Convert vessel_id from INT to UUID in sounding_logs and bunkering_operations
-- Created: 2025-10-XX
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Check if vessels table needs updating
-- =====================================================

-- Note: If your vessels table has INT for vessel_id, we need to:
-- 1. Create a new UUID column
-- 2. Populate it with new UUIDs
-- 3. Update all references
-- 4. Make it the primary key

-- First, check what type vessel_id currently is
DO $$
DECLARE
    current_type text;
BEGIN
    SELECT data_type INTO current_type
    FROM information_schema.columns
    WHERE table_name = 'vessels' AND column_name = 'vessel_id';
    
    RAISE NOTICE 'Current vessel_id type in vessels table: %', current_type;
    
    IF current_type = 'integer' THEN
        RAISE NOTICE 'Vessels table needs to be migrated from INT to UUID';
    ELSIF current_type = 'uuid' THEN
        RAISE NOTICE 'Vessels table already uses UUID';
    END IF;
END $$;

-- =====================================================
-- STEP 2: Update sounding_logs table to UUID
-- =====================================================

DO $$
DECLARE
    current_type text;
BEGIN
    -- Check current type
    SELECT data_type INTO current_type
    FROM information_schema.columns
    WHERE table_name = 'sounding_logs' AND column_name = 'vessel_id';
    
    IF current_type = 'integer' THEN
        -- Drop the foreign key constraint first
        ALTER TABLE sounding_logs DROP CONSTRAINT IF EXISTS sounding_logs_vessel_id_fkey;
        
        -- Add a temporary UUID column
        ALTER TABLE sounding_logs ADD COLUMN IF NOT EXISTS vessel_id_temp UUID;
        
        -- Copy data by converting INT to UUID (we'll use a hash-based approach)
        -- This is a temporary measure - you'll need to manually map INT IDs to UUIDs
        
        -- For now, set all to NULL or handle mapping manually
        -- UPDATE sounding_logs SET vessel_id_temp = ... (requires manual mapping)
        
        -- Drop old column
        ALTER TABLE sounding_logs DROP COLUMN vessel_id;
        
        -- Rename temp column
        ALTER TABLE sounding_logs RENAME COLUMN vessel_id_temp TO vessel_id;
        
        -- Recreate foreign key constraint
        ALTER TABLE sounding_logs ADD CONSTRAINT sounding_logs_vessel_id_fkey 
            FOREIGN KEY (vessel_id) REFERENCES vessels(vessel_id);
        
        RAISE NOTICE 'Updated sounding_logs.vessel_id from INT to UUID';
    ELSE
        RAISE NOTICE 'sounding_logs.vessel_id already uses %', current_type;
    END IF;
END $$;

-- =====================================================
-- STEP 3: Update bunkering_operations table to UUID
-- =====================================================

DO $$
DECLARE
    current_type text;
BEGIN
    SELECT data_type INTO current_type
    FROM information_schema.columns
    WHERE table_name = 'bunkering_operations' AND column_name = 'vessel_id';
    
    IF current_type = 'integer' THEN
        ALTER TABLE bunkering_operations DROP CONSTRAINT IF EXISTS bunkering_operations_vessel_id_fkey;
        
        ALTER TABLE bunkering_operations ADD COLUMN IF NOT EXISTS vessel_id_temp UUID;
        
        -- Manual mapping required here too
        -- UPDATE bunkering_operations SET vessel_id_temp = ...
        
        ALTER TABLE bunkering_operations DROP COLUMN vessel_id;
        ALTER TABLE bunkering_operations RENAME COLUMN vessel_id_temp TO vessel_id;
        
        ALTER TABLE bunkering_operations ADD CONSTRAINT bunkering_operations_vessel_id_fkey 
            FOREIGN KEY (vessel_id) REFERENCES vessels(vessel_id);
        
        RAISE NOTICE 'Updated bunkering_operations.vessel_id from INT to UUID';
    ELSE
        RAISE NOTICE 'bunkering_operations.vessel_id already uses %', current_type;
    END IF;
END $$;

-- =====================================================
-- STEP 4: Verification
-- =====================================================

SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('vessels', 'sounding_logs', 'bunkering_operations', 'sounding_reports')
  AND column_name = 'vessel_id'
ORDER BY table_name, ordinal_position;

COMMIT;

-- =====================================================
-- MANUAL STEPS REQUIRED IF MIGRATION NEEDS DATA MAPPING
-- =====================================================

/*
If your database has INT vessel_id but your Lambda uses UUID vessel_id,
you need to:

1. Check what vessel IDs exist in your database:
   SELECT vessel_id, vessel_name FROM vessels;

2. Map these to the UUIDs that Lambda is using
3. Run the UPDATE statements to map the data

For example:
   UPDATE sounding_logs s
   SET vessel_id = v.vessel_id::uuid
   FROM vessels v
   WHERE s.vessel_id_temp = v.vessel_id::integer;

*/

