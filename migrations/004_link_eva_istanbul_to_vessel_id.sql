-- =====================================================
-- BunkerWatch Database Migration - Part 4
-- Link Existing Eva Istanbul Data to vessel_id
-- Version: 1.0
-- Date: October 9, 2025
-- =====================================================

-- Purpose: Add vessel_id to compartments, main_sounding_trim_data, 
-- and heel_correction_data tables, then link to "Eva Istanbul" vessel

BEGIN;

-- =====================================================
-- STEP 1: Ensure Eva Istanbul exists in vessels table
-- =====================================================

-- First, let's make sure Eva Istanbul is in the vessels table
-- If not, insert it
INSERT INTO vessels (vessel_name, imo_number, active)
VALUES ('Eva Istanbul', NULL, true)
ON CONFLICT (vessel_name) DO NOTHING;

-- Get the vessel_id for Eva Istanbul (case-insensitive)
DO $$ 
DECLARE
    eva_vessel_id uuid;
BEGIN
    -- Find Eva Istanbul's vessel_id (case insensitive)
    SELECT vessel_id INTO eva_vessel_id
    FROM vessels 
    WHERE LOWER(vessel_name) = LOWER('Eva Istanbul')
    LIMIT 1;
    
    -- Store it in a temporary variable for use in subsequent steps
    IF eva_vessel_id IS NOT NULL THEN
        RAISE NOTICE 'Found Eva Istanbul with vessel_id: %', eva_vessel_id;
        
        -- Store in a temporary table for reference
        CREATE TEMP TABLE IF NOT EXISTS temp_eva_vessel (vessel_id uuid);
        DELETE FROM temp_eva_vessel;
        INSERT INTO temp_eva_vessel VALUES (eva_vessel_id);
    ELSE
        RAISE EXCEPTION 'Eva Istanbul not found in vessels table!';
    END IF;
END $$;

-- =====================================================
-- STEP 2: Add vessel_id column to compartments table
-- =====================================================

-- Add vessel_id column (uuid type to match vessels table)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compartments' 
        AND column_name = 'vessel_id'
    ) THEN
        ALTER TABLE compartments 
        ADD COLUMN vessel_id uuid REFERENCES vessels(vessel_id);
        
        RAISE NOTICE 'Added vessel_id column to compartments table';
    ELSE
        RAISE NOTICE 'vessel_id column already exists in compartments table';
    END IF;
END $$;

-- Update all compartments with Eva Istanbul's vessel_id
UPDATE compartments 
SET vessel_id = (SELECT vessel_id FROM temp_eva_vessel)
WHERE vessel_id IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_compartments_vessel_id ON compartments(vessel_id);

-- Report results
DO $$ 
DECLARE
    updated_count integer;
BEGIN
    SELECT COUNT(*) INTO updated_count 
    FROM compartments 
    WHERE vessel_id = (SELECT vessel_id FROM temp_eva_vessel);
    
    RAISE NOTICE 'Updated % compartment records with Eva Istanbul vessel_id', updated_count;
END $$;

-- =====================================================
-- STEP 3: Add vessel_id to main_sounding_trim_data
-- =====================================================

-- Add vessel_id column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'main_sounding_trim_data' 
        AND column_name = 'vessel_id'
    ) THEN
        ALTER TABLE main_sounding_trim_data 
        ADD COLUMN vessel_id uuid REFERENCES vessels(vessel_id);
        
        RAISE NOTICE 'Added vessel_id column to main_sounding_trim_data table';
    ELSE
        RAISE NOTICE 'vessel_id column already exists in main_sounding_trim_data table';
    END IF;
END $$;

-- Update all main_sounding_trim_data records
-- Link via compartment_id to get the vessel_id
UPDATE main_sounding_trim_data mstd
SET vessel_id = c.vessel_id
FROM compartments c
WHERE mstd.compartment_id = c.compartment_id
  AND mstd.vessel_id IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_main_sounding_vessel_id ON main_sounding_trim_data(vessel_id);
CREATE INDEX IF NOT EXISTS idx_main_sounding_compartment_vessel ON main_sounding_trim_data(compartment_id, vessel_id);

-- Report results
DO $$ 
DECLARE
    updated_count integer;
BEGIN
    SELECT COUNT(*) INTO updated_count 
    FROM main_sounding_trim_data 
    WHERE vessel_id = (SELECT vessel_id FROM temp_eva_vessel);
    
    RAISE NOTICE 'Updated % main_sounding_trim_data records with Eva Istanbul vessel_id', updated_count;
END $$;

-- =====================================================
-- STEP 4: Add vessel_id to heel_correction_data
-- =====================================================

-- Add vessel_id column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'heel_correction_data' 
        AND column_name = 'vessel_id'
    ) THEN
        ALTER TABLE heel_correction_data 
        ADD COLUMN vessel_id uuid REFERENCES vessels(vessel_id);
        
        RAISE NOTICE 'Added vessel_id column to heel_correction_data table';
    ELSE
        RAISE NOTICE 'vessel_id column already exists in heel_correction_data table';
    END IF;
END $$;

-- Update all heel_correction_data records
-- Link via compartment_id to get the vessel_id
UPDATE heel_correction_data hcd
SET vessel_id = c.vessel_id
FROM compartments c
WHERE hcd.compartment_id = c.compartment_id
  AND hcd.vessel_id IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_heel_correction_vessel_id ON heel_correction_data(vessel_id);
CREATE INDEX IF NOT EXISTS idx_heel_correction_compartment_vessel ON heel_correction_data(compartment_id, vessel_id);

-- Report results
DO $$ 
DECLARE
    updated_count integer;
BEGIN
    SELECT COUNT(*) INTO updated_count 
    FROM heel_correction_data 
    WHERE vessel_id = (SELECT vessel_id FROM temp_eva_vessel);
    
    RAISE NOTICE 'Updated % heel_correction_data records with Eva Istanbul vessel_id', updated_count;
END $$;

-- =====================================================
-- STEP 5: Verification & Summary
-- =====================================================

-- Create a summary view
DO $$ 
DECLARE
    eva_vessel_id uuid;
    vessel_name_found text;
    compartments_count integer;
    main_sounding_count integer;
    heel_correction_count integer;
BEGIN
    -- Get Eva Istanbul details
    SELECT vessel_id, vessel_name 
    INTO eva_vessel_id, vessel_name_found
    FROM vessels 
    WHERE LOWER(vessel_name) = LOWER('Eva Istanbul')
    LIMIT 1;
    
    -- Count records in each table
    SELECT COUNT(*) INTO compartments_count 
    FROM compartments 
    WHERE vessel_id = eva_vessel_id;
    
    SELECT COUNT(*) INTO main_sounding_count 
    FROM main_sounding_trim_data 
    WHERE vessel_id = eva_vessel_id;
    
    SELECT COUNT(*) INTO heel_correction_count 
    FROM heel_correction_data 
    WHERE vessel_id = eva_vessel_id;
    
    -- Display summary
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Vessel Name: %', vessel_name_found;
    RAISE NOTICE 'Vessel ID: %', eva_vessel_id;
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'Compartments linked: %', compartments_count;
    RAISE NOTICE 'Main sounding records linked: %', main_sounding_count;
    RAISE NOTICE 'Heel correction records linked: %', heel_correction_count;
    RAISE NOTICE '========================================';
END $$;

-- Clean up temporary table
DROP TABLE IF EXISTS temp_eva_vessel;

COMMIT;

-- =====================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- =====================================================

-- Run these queries after migration to verify everything worked:

-- 1. Check Eva Istanbul vessel details
-- SELECT * FROM vessels WHERE LOWER(vessel_name) = LOWER('Eva Istanbul');

-- 2. Count records per table
-- SELECT 
--     (SELECT COUNT(*) FROM compartments WHERE vessel_id = (SELECT vessel_id FROM vessels WHERE LOWER(vessel_name) = LOWER('Eva Istanbul'))) as compartments_count,
--     (SELECT COUNT(*) FROM main_sounding_trim_data WHERE vessel_id = (SELECT vessel_id FROM vessels WHERE LOWER(vessel_name) = LOWER('Eva Istanbul'))) as main_sounding_count,
--     (SELECT COUNT(*) FROM heel_correction_data WHERE vessel_id = (SELECT vessel_id FROM vessels WHERE LOWER(vessel_name) = LOWER('Eva Istanbul'))) as heel_correction_count;

-- 3. Check for any NULL vessel_id values (should be 0)
-- SELECT 'compartments' as table_name, COUNT(*) as null_count FROM compartments WHERE vessel_id IS NULL
-- UNION ALL
-- SELECT 'main_sounding_trim_data', COUNT(*) FROM main_sounding_trim_data WHERE vessel_id IS NULL
-- UNION ALL
-- SELECT 'heel_correction_data', COUNT(*) FROM heel_correction_data WHERE vessel_id IS NULL;

-- 4. Verify compartments are linked correctly
-- SELECT 
--     v.vessel_name,
--     v.vessel_id,
--     COUNT(DISTINCT c.compartment_id) as total_compartments,
--     COUNT(DISTINCT m.main_id) as main_sounding_rows,
--     COUNT(DISTINCT h.heel_id) as heel_correction_rows
-- FROM vessels v
-- LEFT JOIN compartments c ON v.vessel_id = c.vessel_id
-- LEFT JOIN main_sounding_trim_data m ON c.compartment_id = m.compartment_id
-- LEFT JOIN heel_correction_data h ON c.compartment_id = h.compartment_id
-- WHERE LOWER(v.vessel_name) = LOWER('Eva Istanbul')
-- GROUP BY v.vessel_name, v.vessel_id;

