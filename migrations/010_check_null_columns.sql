-- Check for NULL values in calibration data columns

-- Check main_sounding_trim_data for NULLs
SELECT 
    'main_sounding_trim_data' as table_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN ullage IS NULL THEN 1 END) as ullage_null,
    COUNT(CASE WHEN sound IS NULL THEN 1 END) as sound_null,
    COUNT(CASE WHEN trim_0_0 IS NULL THEN 1 END) as trim_0_0_null,
    COUNT(CASE WHEN trim_plus_0_5 IS NULL THEN 1 END) as trim_plus_0_5_null,
    COUNT(CASE WHEN trim_minus_0_5 IS NULL THEN 1 END) as trim_minus_0_5_null,
    COUNT(CASE WHEN lcg IS NULL THEN 1 END) as lcg_null,
    COUNT(CASE WHEN tcg IS NULL THEN 1 END) as tcg_null,
    COUNT(CASE WHEN vcg IS NULL THEN 1 END) as vcg_null,
    COUNT(CASE WHEN iy IS NULL THEN 1 END) as iy_null
FROM main_sounding_trim_data
WHERE vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812';

-- Check heel_correction_data for NULLs
SELECT 
    'heel_correction_data' as table_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN ullage IS NULL THEN 1 END) as ullage_null,
    COUNT(CASE WHEN heel_0_0 IS NULL THEN 1 END) as heel_0_0_null,
    COUNT(CASE WHEN heel_plus_0_5 IS NULL THEN 1 END) as heel_plus_0_5_null,
    COUNT(CASE WHEN heel_minus_0_5 IS NULL THEN 1 END) as heel_minus_0_5_null
FROM heel_correction_data
WHERE vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812';

-- Check compartments for NULLs
SELECT 
    'compartments' as table_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN compartment_id IS NULL THEN 1 END) as compartment_id_null,
    COUNT(CASE WHEN compartment_name IS NULL THEN 1 END) as compartment_name_null,
    COUNT(CASE WHEN total_net_volume_m3 IS NULL THEN 1 END) as total_net_volume_m3_null,
    COUNT(CASE WHEN vessel_id IS NULL THEN 1 END) as vessel_id_null
FROM compartments
WHERE vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812';

