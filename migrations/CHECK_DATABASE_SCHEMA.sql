-- =====================================================
-- Database Schema Diagnostic Script
-- Purpose: Check what tables exist and their structure
-- =====================================================

-- =====================================================
-- 1. List ALL tables in the database
-- =====================================================
SELECT 
    'All Tables' as section,
    table_name,
    'N/A' as column_name,
    'N/A' as data_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- =====================================================
-- 2. Check if CRITICAL tables exist
-- =====================================================
SELECT 
    'Critical Tables Check' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vessels') 
        THEN '✓ vessels EXISTS' ELSE '✗ vessels MISSING' END as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compartments') 
        THEN '✓ compartments EXISTS' ELSE '✗ compartments MISSING' END as status2,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sounding_logs') 
        THEN '✓ sounding_logs EXISTS' ELSE '✗ sounding_logs MISSING' END as status3
UNION ALL
SELECT 
    'Critical Tables Check' as section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sounding_reports') 
        THEN '✓ sounding_reports EXISTS' ELSE '✗ sounding_reports MISSING' END as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bunkering_operations') 
        THEN '✓ bunkering_operations EXISTS' ELSE '✗ bunkering_operations MISSING' END as status2,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'main_sounding_trim_data') 
        THEN '✓ main_sounding_trim_data EXISTS' ELSE '✗ main_sounding_trim_data MISSING' END as status3;

-- =====================================================
-- 3. Check vessel_id data types
-- =====================================================
SELECT 
    'vessel_id Types' as section,
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('vessels', 'compartments', 'sounding_logs', 'bunkering_operations', 'sounding_reports', 'main_sounding_trim_data', 'heel_correction_data')
  AND column_name = 'vessel_id'
ORDER BY table_name;

-- =====================================================
-- 4. Check for tables that might store soundings
-- =====================================================
SELECT 
    'Possible Sounding Tables' as section,
    table_name,
    string_agg(column_name || ' ' || data_type, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name LIKE '%sound%' OR table_name LIKE '%bunker%' OR table_name LIKE '%log%')
GROUP BY table_name
ORDER BY table_name;

-- =====================================================
-- 5. Count records in each table (if they exist)
-- =====================================================
SELECT 
    'Row Counts' as section,
    'vessels' as table_name,
    (SELECT COUNT(*) FROM vessels) as row_count
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vessels')
UNION ALL
SELECT 
    'Row Counts',
    'compartments',
    (SELECT COUNT(*) FROM compartments)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compartments')
UNION ALL
SELECT 
    'Row Counts',
    'sounding_logs',
    (SELECT COUNT(*) FROM sounding_logs)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sounding_logs')
UNION ALL
SELECT 
    'Row Counts',
    'sounding_reports',
    (SELECT COUNT(*) FROM sounding_reports)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sounding_reports')
UNION ALL
SELECT 
    'Row Counts',
    'main_sounding_trim_data',
    (SELECT COUNT(*) FROM main_sounding_trim_data)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'main_sounding_trim_data');

