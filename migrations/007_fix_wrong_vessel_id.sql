-- Fix Wrong Vessel ID - Step 1: Insert Missing Vessel Record

-- Step 1: Insert the vessel record if it doesn't exist
INSERT INTO vessels (vessel_id, vessel_name, imo_number)
VALUES ('30853544-9726-4b3e-be1d-c638c2c03812', 'Eva Istanbul', '9972440')
ON CONFLICT (vessel_id) DO NOTHING;

-- Step 2: Now update compartments table
UPDATE compartments 
SET vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812'
WHERE vessel_id = 'bf4b78bc-06d9-43e3-87ed-c88087c4d979';

-- Step 3: Update main_sounding_trim_data table
UPDATE main_sounding_trim_data
SET vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812'
WHERE vessel_id = 'bf4b78bc-06d9-43e3-87ed-c88087c4d979';

-- Step 4: Update heel_correction_data table
UPDATE heel_correction_data
SET vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812'
WHERE vessel_id = 'bf4b78bc-06d9-43e3-87ed-c88087c4d979';

-- Step 5: Verify the changes
SELECT 
    'compartments' as table_name,
    COUNT(*) as updated_rows
FROM compartments 
WHERE vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812'
UNION ALL
SELECT 
    'main_sounding_trim_data' as table_name,
    COUNT(*) as updated_rows
FROM main_sounding_trim_data
WHERE vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812'
UNION ALL
SELECT 
    'heel_correction_data' as table_name,
    COUNT(*) as updated_rows
FROM heel_correction_data
WHERE vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812';

-- Step 6: Check if old vessel_id still exists (should be 0 rows)
SELECT 
    'compartments' as table_name,
    COUNT(*) as remaining_rows
FROM compartments 
WHERE vessel_id = 'bf4b78bc-06d9-43e3-87ed-c88087c4d979'
UNION ALL
SELECT 
    'main_sounding_trim_data' as table_name,
    COUNT(*) as remaining_rows
FROM main_sounding_trim_data
WHERE vessel_id = 'bf4b78bc-06d9-43e3-87ed-c88087c4d979'
UNION ALL
SELECT 
    'heel_correction_data' as table_name,
    COUNT(*) as remaining_rows
FROM heel_correction_data
WHERE vessel_id = 'bf4b78bc-06d9-43e3-87ed-c88087c4d979';

-- Step 7: Verify vessel details
SELECT 
    v.vessel_id,
    v.vessel_name,
    v.imo_number,
    COUNT(DISTINCT c.compartment_id) as compartment_count,
    COUNT(DISTINCT mstd.compartment_id) as main_sounding_rows,
    COUNT(DISTINCT hcd.compartment_id) as heel_rows
FROM vessels v
LEFT JOIN compartments c ON v.vessel_id = c.vessel_id
LEFT JOIN main_sounding_trim_data mstd ON c.compartment_id = mstd.compartment_id
LEFT JOIN heel_correction_data hcd ON c.compartment_id = hcd.compartment_id
WHERE v.vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812'
GROUP BY v.vessel_id, v.vessel_name, v.imo_number;
