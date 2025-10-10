-- =====================================================
-- Migration: Add Sounding Reports and Session ID
-- Purpose: Store summary data and group soundings by session
-- Created: 2025-10-10
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Add session_id column to sounding_logs table
-- =====================================================

-- Add session_id column (UUID to group related soundings)
ALTER TABLE sounding_logs 
ADD COLUMN IF NOT EXISTS session_id UUID;

-- Add index for faster session-based queries
CREATE INDEX IF NOT EXISTS idx_sounding_logs_session_id 
ON sounding_logs(session_id);

-- Add comment
COMMENT ON COLUMN sounding_logs.session_id IS 'Groups multiple soundings submitted together in one session/report';

-- =====================================================
-- 2. Create sounding_reports table (summary data)
-- =====================================================

CREATE TABLE IF NOT EXISTS sounding_reports (
    -- Primary Key
    report_id SERIAL PRIMARY KEY,
    
    -- Foreign Keys
    vessel_id UUID NOT NULL REFERENCES vessels(vessel_id) ON DELETE CASCADE,
    
    -- Session Tracking
    session_id UUID NOT NULL UNIQUE,  -- Same as session_id in sounding_logs
    
    -- Timestamps
    recorded_at TIMESTAMP NOT NULL,   -- System date/time when submitted
    report_date DATE NOT NULL,        -- User-selected report date
    
    -- Summary Metrics
    total_tanks INTEGER NOT NULL,     -- Number of tanks in this report
    grand_total_mt NUMERIC(10, 2),    -- Total mass across all tanks
    
    -- Ship Condition
    trim NUMERIC(5, 2),                -- Ship trim at time of report
    heel NUMERIC(5, 2),                -- Ship heel at time of report
    
    -- Fuel Grade Totals (stored as JSONB)
    summary_data JSONB,                -- e.g., {"MGO": 156.50, "HSFO": 234.78}
    
    -- Sync Metadata
    sync_status VARCHAR(20) DEFAULT 'synced',
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. Add indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_sounding_reports_vessel_id 
ON sounding_reports(vessel_id);

CREATE INDEX IF NOT EXISTS idx_sounding_reports_session_id 
ON sounding_reports(session_id);

CREATE INDEX IF NOT EXISTS idx_sounding_reports_recorded_at 
ON sounding_reports(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_sounding_reports_report_date 
ON sounding_reports(report_date DESC);

CREATE INDEX IF NOT EXISTS idx_sounding_reports_vessel_date 
ON sounding_reports(vessel_id, report_date DESC);

-- GIN index for JSONB summary_data queries
CREATE INDEX IF NOT EXISTS idx_sounding_reports_summary_data 
ON sounding_reports USING GIN (summary_data);

-- =====================================================
-- 4. Add comments for documentation
-- =====================================================

COMMENT ON TABLE sounding_reports IS 'Summary reports grouping multiple sounding logs together with totals by fuel grade';
COMMENT ON COLUMN sounding_reports.report_id IS 'Primary key, auto-incrementing';
COMMENT ON COLUMN sounding_reports.vessel_id IS 'Reference to vessel this report belongs to';
COMMENT ON COLUMN sounding_reports.session_id IS 'Unique session ID grouping related soundings';
COMMENT ON COLUMN sounding_reports.recorded_at IS 'System timestamp when report was submitted';
COMMENT ON COLUMN sounding_reports.report_date IS 'User-selected date for the report';
COMMENT ON COLUMN sounding_reports.total_tanks IS 'Number of tanks included in this report';
COMMENT ON COLUMN sounding_reports.grand_total_mt IS 'Total mass (mT) across all tanks in report';
COMMENT ON COLUMN sounding_reports.trim IS 'Ship trim (meters) at time of report';
COMMENT ON COLUMN sounding_reports.heel IS 'Ship heel (degrees) at time of report';
COMMENT ON COLUMN sounding_reports.summary_data IS 'JSONB object with total mass by fuel grade, e.g., {"MGO": 156.50, "HSFO": 234.78}';

-- =====================================================
-- 5. Create view for easy report querying
-- =====================================================

CREATE OR REPLACE VIEW v_sounding_reports_with_details AS
SELECT 
    sr.report_id,
    sr.session_id,
    sr.vessel_id,
    v.vessel_name,
    v.imo_number,
    sr.recorded_at,
    sr.report_date,
    sr.total_tanks,
    sr.grand_total_mt,
    sr.trim,
    sr.heel,
    sr.summary_data,
    COUNT(sl.log_id) as actual_tank_count,
    SUM(sl.calculated_mt) as calculated_total_mt,
    sr.synced_at,
    sr.created_at
FROM sounding_reports sr
JOIN vessels v ON sr.vessel_id = v.vessel_id
LEFT JOIN sounding_logs sl ON sr.session_id = sl.session_id
GROUP BY 
    sr.report_id, sr.session_id, sr.vessel_id, v.vessel_name, v.imo_number,
    sr.recorded_at, sr.report_date, sr.total_tanks, sr.grand_total_mt,
    sr.trim, sr.heel, sr.summary_data, sr.synced_at, sr.created_at
ORDER BY sr.recorded_at DESC;

COMMENT ON VIEW v_sounding_reports_with_details IS 'Sounding reports with vessel details and verification counts';

-- =====================================================
-- 6. Add trigger to update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_sounding_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sounding_reports_updated_at ON sounding_reports;

CREATE TRIGGER trigger_update_sounding_reports_updated_at
BEFORE UPDATE ON sounding_reports
FOR EACH ROW
EXECUTE FUNCTION update_sounding_reports_updated_at();

-- =====================================================
-- 7. Grant permissions (adjust as needed)
-- =====================================================

-- Grant access to your application role
-- GRANT SELECT, INSERT, UPDATE ON sounding_reports TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE sounding_reports_report_id_seq TO your_app_user;
-- GRANT SELECT ON v_sounding_reports_with_details TO your_app_user;

COMMIT;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check if session_id column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sounding_logs' AND column_name = 'session_id';

-- Check if sounding_reports table was created
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sounding_reports'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('sounding_reports', 'sounding_logs')
  AND indexname LIKE '%session%'
ORDER BY tablename, indexname;

-- Check view
SELECT COUNT(*) as view_exists 
FROM information_schema.views 
WHERE table_name = 'v_sounding_reports_with_details';

-- =====================================================
-- Example: Query reports with their soundings
-- =====================================================

/*
-- Get all reports for a vessel
SELECT * FROM v_sounding_reports_with_details 
WHERE vessel_name = 'Eva Istanbul'
ORDER BY recorded_at DESC
LIMIT 10;

-- Get report with individual soundings
SELECT 
    sr.report_id,
    sr.session_id,
    sr.recorded_at,
    sr.report_date,
    sr.grand_total_mt,
    sr.summary_data,
    sl.log_id,
    c.compartment_name,
    sl.fuel_grade,
    sl.ullage,
    sl.final_volume,
    sl.calculated_mt
FROM sounding_reports sr
JOIN sounding_logs sl ON sr.session_id = sl.session_id
JOIN compartments c ON sl.compartment_id = c.compartment_id
WHERE sr.vessel_id = '12345678-1234-1234-1234-123456789012'
ORDER BY sr.recorded_at DESC, c.compartment_name;

-- Get fuel grade totals from a specific report
SELECT 
    session_id,
    recorded_at,
    summary_data->>'MGO' as mgo_total,
    summary_data->>'HSFO' as hsfo_total,
    summary_data->>'VLSFO' as vlsfo_total,
    grand_total_mt
FROM sounding_reports
WHERE vessel_id = '12345678-1234-1234-1234-123456789012'
ORDER BY recorded_at DESC
LIMIT 10;
*/

