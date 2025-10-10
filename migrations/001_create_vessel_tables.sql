-- =====================================================
-- BunkerWatch Database Migration - Part 1
-- Vessel Management & Sync Tables
-- Version: 1.0
-- Date: October 9, 2025
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE VESSELS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS vessels (
    vessel_id SERIAL PRIMARY KEY,
    vessel_name VARCHAR(255) NOT NULL UNIQUE,
    imo_number VARCHAR(20) UNIQUE,
    vessel_type VARCHAR(100),
    flag_state VARCHAR(100),
    built_year INT,
    gross_tonnage DECIMAL(10,2),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vessels_active ON vessels(active);
CREATE INDEX IF NOT EXISTS idx_vessels_name ON vessels(vessel_name);

-- Sample vessels (modify as needed)
INSERT INTO vessels (vessel_name, imo_number, vessel_type, flag_state, active) 
VALUES
    ('MV Atlantic Voyager', 'IMO1234567', 'Bulk Carrier', 'Panama', true),
    ('MV Pacific Explorer', 'IMO7654321', 'Container Ship', 'Liberia', true)
ON CONFLICT (vessel_name) DO NOTHING;

-- =====================================================
-- 2. CREATE VESSEL DATA PACKAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS vessel_data_packages (
    package_id SERIAL PRIMARY KEY,
    vessel_id INT NOT NULL REFERENCES vessels(vessel_id) ON DELETE CASCADE,
    package_version INT NOT NULL DEFAULT 1,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    package_size_kb INT,
    total_compartments INT,
    total_calibration_rows INT,
    checksum VARCHAR(64),
    s3_key VARCHAR(500),
    metadata JSONB,
    UNIQUE(vessel_id, package_version)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_vessel_packages ON vessel_data_packages(vessel_id, package_version DESC);

-- =====================================================
-- 3. CREATE SOUNDING LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS sounding_logs (
    log_id SERIAL PRIMARY KEY,
    vessel_id INT NOT NULL REFERENCES vessels(vessel_id),
    compartment_id INT NOT NULL,
    
    -- Timing
    recorded_at TIMESTAMP NOT NULL,
    synced_at TIMESTAMP,
    report_date DATE,
    
    -- Input parameters
    ullage DECIMAL(10,2) NOT NULL,
    trim DECIMAL(5,2) NOT NULL,
    heel DECIMAL(5,2),
    
    -- Optional user inputs
    fuel_grade VARCHAR(50),
    density DECIMAL(6,4),
    temperature DECIMAL(6,2),
    
    -- Calculated results
    base_volume DECIMAL(12,3),
    heel_correction DECIMAL(12,3),
    final_volume DECIMAL(12,3),
    calculated_mt DECIMAL(12,3),
    
    -- Metadata
    user_name VARCHAR(100),
    device_info VARCHAR(255),
    app_version VARCHAR(20),
    
    -- Sync status
    sync_status VARCHAR(20) DEFAULT 'synced',
    client_id VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sounding_vessel_date ON sounding_logs(vessel_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_sounding_sync_status ON sounding_logs(sync_status);
CREATE INDEX IF NOT EXISTS idx_sounding_client_id ON sounding_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_sounding_recorded_at ON sounding_logs(recorded_at DESC);

-- Unique constraint to prevent duplicate syncs
CREATE UNIQUE INDEX IF NOT EXISTS idx_sounding_unique_client ON sounding_logs(client_id) WHERE client_id IS NOT NULL;

-- =====================================================
-- 4. CREATE BUNKERING OPERATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS bunkering_operations (
    bunkering_id SERIAL PRIMARY KEY,
    vessel_id INT NOT NULL REFERENCES vessels(vessel_id),
    
    -- Bunker details
    bunker_name VARCHAR(100) NOT NULL,
    fuel_grade VARCHAR(50),
    density DECIMAL(6,4),
    temperature DECIMAL(6,2),
    total_quantity_mt DECIMAL(12,3),
    
    -- Trim/Heel for this operation
    trim DECIMAL(5,2),
    heel DECIMAL(5,2),
    
    -- Timing
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    synced_at TIMESTAMP,
    
    -- Metadata
    supplier_name VARCHAR(255),
    bdn_number VARCHAR(100),
    port_name VARCHAR(255),
    user_name VARCHAR(100),
    
    -- Sync
    sync_status VARCHAR(20) DEFAULT 'synced',
    client_id VARCHAR(100) UNIQUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bunkering_vessel ON bunkering_operations(vessel_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_bunkering_sync_status ON bunkering_operations(sync_status);

-- =====================================================
-- 5. CREATE BUNKERING READINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS bunkering_readings (
    reading_id SERIAL PRIMARY KEY,
    bunkering_id INT NOT NULL REFERENCES bunkering_operations(bunkering_id) ON DELETE CASCADE,
    compartment_id INT NOT NULL,
    
    -- Reading details
    timestamp TIMESTAMP NOT NULL,
    ullage DECIMAL(10,2) NOT NULL,
    
    -- Calculated values
    calculated_volume DECIMAL(12,3),
    calculated_mt DECIMAL(12,3),
    percent_full DECIMAL(5,2),
    
    -- Sync
    client_id VARCHAR(100) UNIQUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_readings_bunkering ON bunkering_readings(bunkering_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_readings_compartment ON bunkering_readings(compartment_id);

-- =====================================================
-- 6. CREATE SYNC HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS sync_history (
    sync_id SERIAL PRIMARY KEY,
    vessel_id INT NOT NULL REFERENCES vessels(vessel_id),
    
    -- Sync details
    sync_started_at TIMESTAMP NOT NULL,
    sync_completed_at TIMESTAMP,
    sync_status VARCHAR(20) NOT NULL,
    
    -- Statistics
    soundings_uploaded INT DEFAULT 0,
    bunkering_ops_uploaded INT DEFAULT 0,
    bunkering_readings_uploaded INT DEFAULT 0,
    
    -- Error tracking
    error_message TEXT,
    error_details JSONB,
    
    -- Client info
    app_version VARCHAR(20),
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sync_vessel_date ON sync_history(vessel_id, sync_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_history(sync_status);

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these to verify tables were created:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%vessel%' OR table_name LIKE '%bunker%' OR table_name LIKE '%sound%';
-- SELECT * FROM vessels;

