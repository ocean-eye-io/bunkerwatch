-- Migration: Add Performance Indexes for BunkerWatch
-- Version: 1.0
-- Date: 2025-10-10
-- Purpose: Optimize query performance for vessel data package generation and lookups

BEGIN;

-- =====================================================
-- CRITICAL INDEXES FOR DATA PACKAGE GENERATION
-- =====================================================

-- Main sounding data lookup (most critical!)
-- Used when generating vessel data packages and interpolating values
CREATE INDEX IF NOT EXISTS idx_main_sounding_lookup 
    ON main_sounding_trim_data(compartment_id, vessel_id, ullage);

-- Heel correction data lookup
CREATE INDEX IF NOT EXISTS idx_heel_correction_lookup 
    ON heel_correction_data(compartment_id, vessel_id, ullage);

-- =====================================================
-- VESSEL AND COMPARTMENT LOOKUPS
-- =====================================================

-- Fast vessel name lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_vessels_name_lower 
    ON vessels(LOWER(vessel_name));

-- Filter active vessels only
CREATE INDEX IF NOT EXISTS idx_vessels_active 
    ON vessels(active) WHERE active = true;

-- IMO number lookup (for search/validation)
CREATE INDEX IF NOT EXISTS idx_vessels_imo 
    ON vessels(imo_number);

-- Vessel to compartments lookup
CREATE INDEX IF NOT EXISTS idx_compartments_vessel 
    ON compartments(vessel_id);

-- Composite index for vessel + compartment name queries
CREATE INDEX IF NOT EXISTS idx_compartments_vessel_name 
    ON compartments(vessel_id, compartment_name);

-- =====================================================
-- SYNC OPERATIONS INDEXES
-- =====================================================

-- Duplicate detection during sync (critical!)
CREATE INDEX IF NOT EXISTS idx_sounding_logs_client_id 
    ON sounding_logs(client_id);

CREATE INDEX IF NOT EXISTS idx_bunkering_ops_client_id 
    ON bunkering_operations(client_id);

-- Pending items query optimization
CREATE INDEX IF NOT EXISTS idx_sounding_logs_vessel_date 
    ON sounding_logs(vessel_id, report_date DESC);

CREATE INDEX IF NOT EXISTS idx_bunkering_ops_vessel_date 
    ON bunkering_operations(vessel_id, started_at DESC);

-- Sync status filtering
CREATE INDEX IF NOT EXISTS idx_sounding_logs_sync_status 
    ON sounding_logs(sync_status) 
    WHERE sync_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_bunkering_ops_sync_status 
    ON bunkering_operations(sync_status) 
    WHERE sync_status = 'pending';

-- =====================================================
-- REPORTING AND ANALYTICS INDEXES
-- =====================================================

-- Vessel dashboard queries
CREATE INDEX IF NOT EXISTS idx_vessel_packages_vessel 
    ON vessel_data_packages(vessel_id, generated_at DESC);

-- Audit and sync history
CREATE INDEX IF NOT EXISTS idx_sync_history_vessel 
    ON sync_history(vessel_id, synced_at DESC);

-- Bunkering readings lookup
CREATE INDEX IF NOT EXISTS idx_bunkering_readings_operation 
    ON bunkering_readings(bunkering_id, timestamp);

-- =====================================================
-- QUERY ANALYSIS RECOMMENDATIONS
-- =====================================================

-- After running this migration, analyze tables for query planner:
ANALYZE vessels;
ANALYZE compartments;
ANALYZE main_sounding_trim_data;
ANALYZE heel_correction_data;
ANALYZE sounding_logs;
ANALYZE bunkering_operations;
ANALYZE bunkering_readings;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these queries to verify indexes were created:

-- Check all indexes on main_sounding_trim_data
-- SELECT indexname, indexdef FROM pg_indexes 
-- WHERE tablename = 'main_sounding_trim_data';

-- Check index usage statistics (after some queries)
-- SELECT 
--     schemaname, tablename, indexname, 
--     idx_scan as index_scans,
--     idx_tup_read as tuples_read,
--     idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes 
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- Check table and index sizes
-- SELECT 
--     tablename,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
--     pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- PERFORMANCE TESTING
-- =====================================================

-- Test query performance with EXPLAIN ANALYZE:

-- Test 1: Data package generation - main sounding lookup
-- EXPLAIN ANALYZE
-- SELECT ullage, trim_0_0, lcg, tcg, vcg, iy, sound
-- FROM main_sounding_trim_data
-- WHERE compartment_id = 1 AND vessel_id = 1
-- ORDER BY ullage;
-- 
-- Expected: Index Scan using idx_main_sounding_lookup

-- Test 2: Heel correction lookup
-- EXPLAIN ANALYZE
-- SELECT ullage, heel_0_0, heel_plus_1_0
-- FROM heel_correction_data
-- WHERE compartment_id = 1 AND vessel_id = 1
-- ORDER BY ullage;
-- 
-- Expected: Index Scan using idx_heel_correction_lookup

-- Test 3: Vessel list query
-- EXPLAIN ANALYZE
-- SELECT vessel_id, vessel_name, imo_number
-- FROM vessels
-- WHERE active = true
-- ORDER BY vessel_name;
-- 
-- Expected: Index Scan using idx_vessels_active

-- Test 4: Duplicate check during sync
-- EXPLAIN ANALYZE
-- SELECT log_id FROM sounding_logs 
-- WHERE client_id = 'test-client-id-123'
-- LIMIT 1;
-- 
-- Expected: Index Scan using idx_sounding_logs_client_id

-- =====================================================
-- MAINTENANCE RECOMMENDATIONS
-- =====================================================

-- Schedule regular VACUUM and ANALYZE for optimal performance:
-- 
-- Daily (for high-traffic tables):
-- VACUUM ANALYZE sounding_logs;
-- VACUUM ANALYZE bunkering_operations;
-- 
-- Weekly (for calibration data):
-- VACUUM ANALYZE main_sounding_trim_data;
-- VACUUM ANALYZE heel_correction_data;
-- 
-- Or enable auto-vacuum (recommended):
-- ALTER TABLE sounding_logs SET (autovacuum_enabled = true);
-- ALTER TABLE bunkering_operations SET (autovacuum_enabled = true);

-- =====================================================
-- EXPECTED PERFORMANCE IMPROVEMENTS
-- =====================================================

-- Before indexes:
-- - Data package generation: 5-10 seconds
-- - Vessel list query: 500-1000ms
-- - Sounding calculation: 200-500ms
-- - Duplicate check during sync: 100-300ms
--
-- After indexes:
-- - Data package generation: 1-2 seconds (5x faster)
-- - Vessel list query: 10-50ms (20x faster)
-- - Sounding calculation: 50-100ms (4x faster)
-- - Duplicate check during sync: 5-10ms (30x faster)

-- =====================================================
-- NOTES
-- =====================================================

-- 1. Index Size Impact:
--    - Indexes will add approximately 20-30% to table storage size
--    - For a typical vessel with 1000 calibration rows: ~500KB of indexes
--    - Trade-off is worth it for query performance
--
-- 2. Write Performance:
--    - Indexes slightly slow down INSERT/UPDATE operations
--    - Not a concern for calibration data (rarely updated)
--    - Minimal impact on sounding logs (async sync)
--
-- 3. Monitoring:
--    - Monitor index usage with pg_stat_user_indexes
--    - Remove unused indexes if found
--    - Check for index bloat periodically (REINDEX if needed)
--
-- 4. Multi-Vessel Scale:
--    - These indexes are designed for 1-100 vessels
--    - For > 100 vessels, consider table partitioning
--    - For > 1000 vessels, consider separate data warehouse

