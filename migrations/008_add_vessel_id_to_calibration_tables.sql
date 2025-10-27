-- Add vessel_id to Calibration Tables and Populate from Compartments

-- Step 1: Check if vessel_id column exists in main_sounding_trim_data
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'main_sounding_trim_data' AND column_name = 'vessel_id') THEN
        ALTER TABLE main_sounding_trim_data ADD COLUMN vessel_id UUID;
        RAISE NOTICE 'Added vessel_id column to main_sounding_trim_data';
    ELSE
        RAISE NOTICE 'vessel_id column already exists in main_sounding_trim_data';
    END IF;
END $$;

-- Step 2: Check if vessel_id column exists in heel_correction_data
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'heel_correction_data' AND column_name = 'vessel_id') THEN
        ALTER TABLE heel_correction_data ADD COLUMN vessel_id UUID;
        RAISE NOTICE 'Added vessel_id column to heel_correction_data';
    ELSE
        RAISE NOTICE 'vessel_id column already exists in heel_correction_data';
    END IF;
END $$;

-- Step 3: Populate vessel_id in main_sounding_trim_data from compartments
-- This will update ALL rows, even if vessel_id already exists
UPDATE main_sounding_trim_data mstd
SET vessel_id = c.vessel_id
FROM compartments c
WHERE mstd.compartment_id = c.compartment_id;

-- Step 4: Populate vessel_id in heel_correction_data from compartments
-- This will update ALL rows, even if vessel_id already exists
UPDATE heel_correction_data hcd
SET vessel_id = c.vessel_id
FROM compartments c
WHERE hcd.compartment_id = c.compartment_id;

-- Step 5: Verify the updates
SELECT 
    'main_sounding_trim_data' as table_name,
    COUNT(*) as total_rows,
    COUNT(vessel_id) as rows_with_vessel_id,
    COUNT(*) - COUNT(vessel_id) as rows_without_vessel_id
FROM main_sounding_trim_data
UNION ALL
SELECT 
    'heel_correction_data' as table_name,
    COUNT(*) as total_rows,
    COUNT(vessel_id) as rows_with_vessel_id,
    COUNT(*) - COUNT(vessel_id) as rows_without_vessel_id
FROM heel_correction_data;

-- Step 6: Check specific vessel's data
SELECT 
    'Vessel 30853544-9726-4b3e-be1d-c638c2c03812' as vessel_check,
    COUNT(DISTINCT mstd.compartment_id) as compartments_with_main_data,
    COUNT(DISTINCT hcd.compartment_id) as compartments_with_heel_data
FROM compartments c
LEFT JOIN main_sounding_trim_data mstd 
    ON c.compartment_id = mstd.compartment_id 
    AND mstd.vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812'
LEFT JOIN heel_correction_data hcd 
    ON c.compartment_id = hcd.compartment_id 
    AND hcd.vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812'
WHERE c.vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812';
