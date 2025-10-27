-- Quick Check: Verify vessel_id is populated correctly

-- Check compartments for vessel 30853544-9726-4b3e-be1d-c638c2c03812
SELECT 
    'compartments' as table_name,
    COUNT(*) as row_count
FROM compartments 
WHERE vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812';

-- Check if calibration data has vessel_id matching compartments
SELECT 
    'main_sounding_trim_data' as table_name,
    COUNT(*) as row_count
FROM main_sounding_trim_data mstd
INNER JOIN compartments c ON mstd.compartment_id = c.compartment_id
WHERE c.vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812'
  AND mstd.vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812';

SELECT 
    'heel_correction_data' as table_name,
    COUNT(*) as row_count
FROM heel_correction_data hcd
INNER JOIN compartments c ON hcd.compartment_id = c.compartment_id
WHERE c.vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812'
  AND hcd.vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812';

