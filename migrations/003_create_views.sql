-- =====================================================
-- BunkerWatch Database Migration - Part 3
-- Create Useful Views
-- Version: 1.0
-- Date: October 9, 2025
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Latest Package Version Per Vessel
-- =====================================================

CREATE OR REPLACE VIEW v_latest_vessel_packages AS
SELECT DISTINCT ON (vessel_id) 
    package_id,
    vessel_id,
    package_version,
    generated_at,
    package_size_kb,
    total_compartments,
    checksum
FROM vessel_data_packages
ORDER BY vessel_id, package_version DESC;

-- =====================================================
-- 2. Pending Sync Summary Per Vessel
-- =====================================================

CREATE OR REPLACE VIEW v_vessel_sync_pending AS
SELECT 
    v.vessel_id,
    v.vessel_name,
    COUNT(DISTINCT s.log_id) as pending_soundings,
    COUNT(DISTINCT b.bunkering_id) as pending_bunkering,
    MIN(s.recorded_at) as oldest_pending_date
FROM vessels v
LEFT JOIN sounding_logs s ON v.vessel_id = s.vessel_id AND s.sync_status = 'pending'
LEFT JOIN bunkering_operations b ON v.vessel_id = b.vessel_id AND b.sync_status = 'pending'
GROUP BY v.vessel_id, v.vessel_name;

-- =====================================================
-- 3. Vessel Dashboard Summary
-- =====================================================

CREATE OR REPLACE VIEW v_vessel_dashboard AS
SELECT 
    v.vessel_id,
    v.vessel_name,
    v.imo_number,
    COUNT(DISTINCT c.compartment_id) as total_compartments,
    p.package_version as current_package_version,
    p.generated_at as package_generated_at,
    sh.sync_completed_at as last_sync_at,
    COALESCE(pending.pending_soundings, 0) as pending_soundings,
    COALESCE(pending.pending_bunkering, 0) as pending_bunkering
FROM vessels v
LEFT JOIN compartments c ON v.vessel_id = c.vessel_id
LEFT JOIN v_latest_vessel_packages p ON v.vessel_id = p.vessel_id
LEFT JOIN LATERAL (
    SELECT sync_completed_at 
    FROM sync_history 
    WHERE vessel_id = v.vessel_id AND sync_status = 'completed'
    ORDER BY sync_completed_at DESC 
    LIMIT 1
) sh ON true
LEFT JOIN v_vessel_sync_pending pending ON v.vessel_id = pending.vessel_id
WHERE v.active = true
GROUP BY v.vessel_id, v.vessel_name, v.imo_number, p.package_version, 
         p.generated_at, sh.sync_completed_at, pending.pending_soundings, 
         pending.pending_bunkering;

-- =====================================================
-- 4. Recent Soundings Per Vessel
-- =====================================================

CREATE OR REPLACE VIEW v_recent_soundings AS
SELECT 
    v.vessel_name,
    s.log_id,
    s.report_date,
    s.compartment_id,
    s.fuel_grade,
    s.final_volume,
    s.calculated_mt,
    s.sync_status,
    s.recorded_at
FROM sounding_logs s
JOIN vessels v ON s.vessel_id = v.vessel_id
ORDER BY s.recorded_at DESC
LIMIT 100;

-- =====================================================
-- 5. Bunkering Operations Summary
-- =====================================================

CREATE OR REPLACE VIEW v_bunkering_summary AS
SELECT 
    v.vessel_name,
    b.bunkering_id,
    b.bunker_name,
    b.fuel_grade,
    b.total_quantity_mt,
    b.started_at,
    b.completed_at,
    COUNT(r.reading_id) as total_readings,
    SUM(r.calculated_mt) as total_mt_measured,
    b.sync_status
FROM bunkering_operations b
JOIN vessels v ON b.vessel_id = v.vessel_id
LEFT JOIN bunkering_readings r ON b.bunkering_id = r.bunkering_id
GROUP BY v.vessel_name, b.bunkering_id, b.bunker_name, b.fuel_grade, 
         b.total_quantity_mt, b.started_at, b.completed_at, b.sync_status
ORDER BY b.started_at DESC;

COMMIT;

-- =====================================================
-- TEST VIEWS
-- =====================================================

-- Test the views:
-- SELECT * FROM v_vessel_dashboard;
-- SELECT * FROM v_latest_vessel_packages;
-- SELECT * FROM v_vessel_sync_pending;
-- SELECT * FROM v_recent_soundings LIMIT 10;
-- SELECT * FROM v_bunkering_summary LIMIT 10;

