-- =====================================================
-- BunkerWatch Database Migration - Part 2
-- Update Existing Tables with vessel_id
-- Version: 1.0
-- Date: October 9, 2025
-- =====================================================

BEGIN;

-- =====================================================
-- ADD vessel_id TO EXISTING TABLES
-- =====================================================

-- Note: Modify these based on your existing table structure
-- Replace 'compartments', 'main_sounding_trim_data', 'heel_correction_data' 
-- with your actual table names if different

-- 1. Add vessel_id to compartments table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'compartments' AND column_name = 'vessel_id'
    ) THEN
        ALTER TABLE compartments 
        ADD COLUMN vessel_id INT REFERENCES vessels(vessel_id);
        
        CREATE INDEX idx_compartments_vessel ON compartments(vessel_id);
    END IF;
END $$;

-- 2. Add vessel_id to main_sounding_trim_data (or your calibration table)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'main_sounding_trim_data' AND column_name = 'vessel_id'
    ) THEN
        ALTER TABLE main_sounding_trim_data 
        ADD COLUMN vessel_id INT REFERENCES vessels(vessel_id);
        
        CREATE INDEX idx_main_sounding_vessel ON main_sounding_trim_data(vessel_id);
    END IF;
END $$;

-- 3. Add vessel_id to heel_correction_data
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'heel_correction_data' AND column_name = 'vessel_id'
    ) THEN
        ALTER TABLE heel_correction_data 
        ADD COLUMN vessel_id INT REFERENCES vessels(vessel_id);
        
        CREATE INDEX idx_heel_correction_vessel ON heel_correction_data(vessel_id);
    END IF;
END $$;

-- =====================================================
-- ASSIGN EXISTING DATA TO DEFAULT VESSEL
-- =====================================================

-- Update existing compartments to belong to first vessel
-- Modify this based on your needs
UPDATE compartments 
SET vessel_id = (SELECT vessel_id FROM vessels ORDER BY vessel_id LIMIT 1)
WHERE vessel_id IS NULL;

-- Update existing calibration data to belong to first vessel
UPDATE main_sounding_trim_data 
SET vessel_id = (SELECT vessel_id FROM vessels ORDER BY vessel_id LIMIT 1)
WHERE vessel_id IS NULL;

UPDATE heel_correction_data 
SET vessel_id = (SELECT vessel_id FROM vessels ORDER BY vessel_id LIMIT 1)
WHERE vessel_id IS NULL;

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check vessel_id was added:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'compartments' AND column_name = 'vessel_id';
-- SELECT COUNT(*) FROM compartments WHERE vessel_id IS NOT NULL;

