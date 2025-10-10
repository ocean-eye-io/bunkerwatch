# Phase 1 Implementation Plan: Offline-First Vessel Sounding System

**Date:** October 9, 2025  
**Architecture:** Progressive Web App (PWA) + Lambda + RDS PostgreSQL  
**Objective:** Enable vessels to work offline with periodic cloud sync

---

## Executive Summary

### Current State
- ✅ React app with Lambda + RDS PostgreSQL backend
- ✅ Real-time sounding calculations with bilinear interpolation
- ✅ Bunkering monitoring functionality
- ❌ Requires constant internet connectivity
- ❌ No vessel-specific data isolation
- ❌ No offline capability

### Target State
- ✅ Offline-first PWA that works without internet
- ✅ Vessel-specific data packages (2-5MB each)
- ✅ Local storage with IndexedDB (via Dexie.js)
- ✅ Client-side interpolation (same logic as Lambda)
- ✅ Smart sync when connectivity restored
- ✅ Historical data preservation
- ✅ Multi-vessel support

### Estimated Timeline
- **Phase 1A:** Database Schema Updates (3-5 days)
- **Phase 1B:** Lambda API Enhancements (5-7 days)
- **Phase 1C:** Frontend Offline Layer (10-14 days)
- **Phase 1D:** Sync Mechanism (5-7 days)
- **Phase 1E:** Testing & Refinement (7-10 days)
- **Total:** 6-8 weeks

### Estimated Cost Impact
- Lambda: +$0.10-0.50/month (minimal increase)
- RDS Storage: +100MB-500MB (negligible cost)
- S3 (data packages): +$1-2/month
- **Total Additional Cost:** ~$2-5/month for 20 vessels

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    VESSEL (Offline 90%)                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              React PWA Application                    │  │
│  │  - Vessel Selection Screen                            │  │
│  │  - Sounding Tab (offline calculations)                │  │
│  │  - Bunkering Tab (offline calculations)               │  │
│  │  - Sync Status Dashboard                              │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         IndexedDB (via Dexie.js)                      │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ Vessel Data (downloaded once)                   │  │  │
│  │  │  - vessel_info                                  │  │  │
│  │  │  - compartments (10-20 tanks)                   │  │  │
│  │  │  - main_sounding_data (1000s rows per tank)     │  │  │
│  │  │  - heel_correction_data (1000s rows per tank)   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ Operational Data (pending sync)                 │  │  │
│  │  │  - sounding_logs (pending/synced)               │  │  │
│  │  │  - bunkering_operations (pending/synced)        │  │  │
│  │  │  - bunkering_readings (pending/synced)          │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │    Interpolation Engine (JavaScript)                  │  │
│  │  - Same bilinear interpolation as Lambda             │  │
│  │  - Trim/Heel interpolation                            │  │
│  │  - Ullage interpolation                               │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │    Sync Manager                                       │  │
│  │  - Connectivity detection                             │  │
│  │  - Queue management                                   │  │
│  │  - Batch upload                                       │  │
│  │  - Conflict resolution                                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↕ HTTPS (when online)
┌─────────────────────────────────────────────────────────────┐
│                    AWS CLOUD INFRASTRUCTURE                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              API Gateway + Lambda                     │  │
│  │                                                        │  │
│  │  Existing Endpoints:                                  │  │
│  │  • GET  /compartments                                 │  │
│  │  • POST /sounding                                     │  │
│  │                                                        │  │
│  │  New Endpoints (Phase 1):                             │  │
│  │  • GET  /vessels                                      │  │
│  │  • GET  /vessel/{id}/info                             │  │
│  │  • GET  /vessel/{id}/data-package                     │  │
│  │  • GET  /vessel/{id}/check-update                     │  │
│  │  • POST /vessel/{id}/sync-soundings                   │  │
│  │  • POST /vessel/{id}/sync-bunkering                   │  │
│  │  • GET  /vessel/{id}/sync-status                      │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         RDS PostgreSQL Database                       │  │
│  │                                                        │  │
│  │  Existing Tables:                                     │  │
│  │  • compartments                                       │  │
│  │  • main_sounding_trim_data                            │  │
│  │  • heel_correction_data                               │  │
│  │                                                        │  │
│  │  New Tables (Phase 1):                                │  │
│  │  • vessels                                            │  │
│  │  • vessel_data_packages                               │  │
│  │  • sounding_logs                                      │  │
│  │  • bunkering_operations                               │  │
│  │  • bunkering_readings                                 │  │
│  │  • sync_history                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         S3 Bucket (Optional)                          │  │
│  │  • Pre-generated vessel data packages                 │  │
│  │  • Compressed JSON files                              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1A: Database Schema Updates

### Timeline: 3-5 days

### 1.1 New Tables to Create

#### Table 1: `vessels`
Master table for vessel information.

```sql
CREATE TABLE vessels (
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

-- Index for faster lookups
CREATE INDEX idx_vessels_active ON vessels(active);
CREATE INDEX idx_vessels_name ON vessels(vessel_name);

-- Sample data
INSERT INTO vessels (vessel_name, imo_number, vessel_type, flag_state) VALUES
('MV Atlantic Voyager', 'IMO1234567', 'Bulk Carrier', 'Panama'),
('MV Pacific Explorer', 'IMO7654321', 'Container Ship', 'Liberia');
```

#### Table 2: `vessel_data_packages`
Track data package versions for each vessel.

```sql
CREATE TABLE vessel_data_packages (
    package_id SERIAL PRIMARY KEY,
    vessel_id INT NOT NULL REFERENCES vessels(vessel_id) ON DELETE CASCADE,
    package_version INT NOT NULL DEFAULT 1,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    package_size_kb INT,
    total_compartments INT,
    total_calibration_rows INT,
    checksum VARCHAR(64), -- MD5 or SHA256
    s3_key VARCHAR(500), -- If storing in S3
    metadata JSONB, -- Additional info
    UNIQUE(vessel_id, package_version)
);

-- Index
CREATE INDEX idx_vessel_packages ON vessel_data_packages(vessel_id, package_version DESC);
```

#### Table 3: `sounding_logs`
Store all sounding operations from vessels.

```sql
CREATE TABLE sounding_logs (
    log_id SERIAL PRIMARY KEY,
    vessel_id INT NOT NULL REFERENCES vessels(vessel_id),
    compartment_id INT NOT NULL,
    
    -- Timing
    recorded_at TIMESTAMP NOT NULL, -- When sounding was taken on vessel (vessel's local time)
    synced_at TIMESTAMP, -- When it was uploaded to cloud
    report_date DATE, -- From the sounding report date field
    
    -- Input parameters
    ullage DECIMAL(10,2) NOT NULL,
    trim DECIMAL(5,2) NOT NULL,
    heel DECIMAL(5,2),
    
    -- Optional user inputs
    fuel_grade VARCHAR(50),
    density DECIMAL(6,4),
    temperature DECIMAL(6,2),
    
    -- Calculated results (stored for historical reference)
    base_volume DECIMAL(12,3),
    heel_correction DECIMAL(12,3),
    final_volume DECIMAL(12,3),
    calculated_mt DECIMAL(12,3),
    
    -- Metadata
    user_name VARCHAR(100),
    device_info VARCHAR(255),
    app_version VARCHAR(20),
    
    -- Sync status
    sync_status VARCHAR(20) DEFAULT 'synced', -- 'pending', 'synced', 'failed'
    client_id VARCHAR(100), -- UUID generated on client for deduplication
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_sounding_vessel_date ON sounding_logs(vessel_id, report_date DESC);
CREATE INDEX idx_sounding_sync_status ON sounding_logs(sync_status);
CREATE INDEX idx_sounding_client_id ON sounding_logs(client_id);
CREATE INDEX idx_sounding_recorded_at ON sounding_logs(recorded_at DESC);

-- Unique constraint to prevent duplicate syncs
CREATE UNIQUE INDEX idx_sounding_unique_client ON sounding_logs(client_id) WHERE client_id IS NOT NULL;
```

#### Table 4: `bunkering_operations`
Store bunkering operations from vessels.

```sql
CREATE TABLE bunkering_operations (
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
    bdn_number VARCHAR(100), -- Bunker Delivery Note number
    port_name VARCHAR(255),
    user_name VARCHAR(100),
    
    -- Sync
    sync_status VARCHAR(20) DEFAULT 'synced',
    client_id VARCHAR(100) UNIQUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_bunkering_vessel ON bunkering_operations(vessel_id, started_at DESC);
CREATE INDEX idx_bunkering_sync_status ON bunkering_operations(sync_status);
```

#### Table 5: `bunkering_readings`
Individual readings during bunkering operation.

```sql
CREATE TABLE bunkering_readings (
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
CREATE INDEX idx_readings_bunkering ON bunkering_readings(bunkering_id, timestamp);
CREATE INDEX idx_readings_compartment ON bunkering_readings(compartment_id);
```

#### Table 6: `sync_history`
Track sync events for monitoring and debugging.

```sql
CREATE TABLE sync_history (
    sync_id SERIAL PRIMARY KEY,
    vessel_id INT NOT NULL REFERENCES vessels(vessel_id),
    
    -- Sync details
    sync_started_at TIMESTAMP NOT NULL,
    sync_completed_at TIMESTAMP,
    sync_status VARCHAR(20) NOT NULL, -- 'started', 'completed', 'failed'
    
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
CREATE INDEX idx_sync_vessel_date ON sync_history(vessel_id, sync_started_at DESC);
CREATE INDEX idx_sync_status ON sync_history(sync_status);
```

### 1.2 Modify Existing Tables

Add `vessel_id` to existing tables if not present:

```sql
-- Add vessel_id to compartments table
ALTER TABLE compartments 
ADD COLUMN vessel_id INT REFERENCES vessels(vessel_id);

-- Add vessel_id to main_sounding_trim_data
ALTER TABLE main_sounding_trim_data 
ADD COLUMN vessel_id INT REFERENCES vessels(vessel_id);

-- Add vessel_id to heel_correction_data
ALTER TABLE heel_correction_data 
ADD COLUMN vessel_id INT REFERENCES vessels(vessel_id);

-- Create indexes
CREATE INDEX idx_compartments_vessel ON compartments(vessel_id);
CREATE INDEX idx_main_sounding_vessel ON main_sounding_trim_data(vessel_id);
CREATE INDEX idx_heel_correction_vessel ON heel_correction_data(vessel_id);
```

### 1.3 Create Helper Views

```sql
-- View: Latest package version per vessel
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

-- View: Pending sync summary per vessel
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

-- View: Vessel dashboard summary
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
```

### 1.4 Database Migration Script

Create a migration script: `migrations/001_add_vessel_tables.sql`

```sql
-- Migration: Add vessel support and sync tables
-- Version: 1.0
-- Date: 2025-10-09

BEGIN;

-- Create vessels table
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

-- [Include all table creation statements from above]

-- Commit if all successful
COMMIT;

-- Rollback script (save separately as 001_rollback.sql)
-- BEGIN;
-- DROP TABLE IF EXISTS bunkering_readings CASCADE;
-- DROP TABLE IF EXISTS bunkering_operations CASCADE;
-- DROP TABLE IF EXISTS sounding_logs CASCADE;
-- DROP TABLE IF EXISTS sync_history CASCADE;
-- DROP TABLE IF EXISTS vessel_data_packages CASCADE;
-- DROP TABLE IF EXISTS vessels CASCADE;
-- COMMIT;
```

---

## Phase 1B: Lambda API Enhancements

### Timeline: 5-7 days

### 2.1 New Lambda Endpoints

Create a new Lambda function or extend existing one with new routes:

#### Endpoint 1: `GET /vessels`
Get list of all active vessels.

```javascript
// Handler code
async function getVessels() {
    const query = `
        SELECT vessel_id, vessel_name, imo_number, vessel_type, flag_state
        FROM vessels
        WHERE active = true
        ORDER BY vessel_name
    `;
    const result = await pool.query(query);
    
    return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
            success: true,
            data: result.rows,
            count: result.rows.length
        })
    };
}
```

#### Endpoint 2: `GET /vessel/{vessel_id}/info`
Get detailed vessel information.

```javascript
async function getVesselInfo(vesselId) {
    const query = `
        SELECT * FROM v_vessel_dashboard
        WHERE vessel_id = $1
    `;
    const result = await pool.query(query, [vesselId]);
    
    if (result.rows.length === 0) {
        return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: 'Vessel not found'
            })
        };
    }
    
    return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
            success: true,
            data: result.rows[0]
        })
    };
}
```

#### Endpoint 3: `GET /vessel/{vessel_id}/data-package`
**MOST IMPORTANT** - Generate and return vessel-specific calibration data.

```javascript
async function generateVesselDataPackage(vesselId) {
    try {
        // 1. Get vessel info
        const vesselQuery = `
            SELECT vessel_id, vessel_name, imo_number
            FROM vessels
            WHERE vessel_id = $1 AND active = true
        `;
        const vesselResult = await pool.query(vesselQuery, [vesselId]);
        
        if (vesselResult.rows.length === 0) {
            throw new Error('Vessel not found');
        }
        
        const vessel = vesselResult.rows[0];
        
        // 2. Get compartments for this vessel
        const compartmentsQuery = `
            SELECT compartment_id, compartment_name, capacity
            FROM compartments
            WHERE vessel_id = $1
            ORDER BY compartment_name
        `;
        const compartments = await pool.query(compartmentsQuery, [vesselId]);
        
        // 3. Get calibration data for each compartment
        const calibrationData = {};
        
        for (const comp of compartments.rows) {
            const compartmentId = comp.compartment_id;
            
            // Get main sounding data
            const mainSoundingQuery = `
                SELECT 
                    ullage, sound, lcg, tcg, vcg, iy,
                    trim_minus_4_0, trim_minus_3_0, trim_minus_2_0, 
                    trim_minus_1_5, trim_minus_1_0, trim_minus_0_5,
                    trim_0_0,
                    trim_plus_0_5, trim_plus_1_0, trim_plus_1_5,
                    trim_plus_2_0, trim_plus_3_0, trim_plus_4_0
                FROM main_sounding_trim_data
                WHERE compartment_id = $1
                ORDER BY ullage
            `;
            const mainSounding = await pool.query(mainSoundingQuery, [compartmentId]);
            
            // Get heel correction data
            const heelCorrectionQuery = `
                SELECT 
                    ullage,
                    heel_minus_3_0, heel_minus_2_0, heel_minus_1_5,
                    heel_minus_1_0, heel_minus_0_5, heel_0_0,
                    heel_plus_0_5, heel_plus_1_0, heel_plus_1_5,
                    heel_plus_2_0, heel_plus_3_0
                FROM heel_correction_data
                WHERE compartment_id = $1
                ORDER BY ullage
            `;
            const heelCorrection = await pool.query(heelCorrectionQuery, [compartmentId]);
            
            calibrationData[compartmentId] = {
                compartment_info: comp,
                main_sounding: mainSounding.rows,
                heel_correction: heelCorrection.rows
            };
        }
        
        // 4. Build complete package
        const dataPackage = {
            vessel_id: vessel.vessel_id,
            vessel_name: vessel.vessel_name,
            imo_number: vessel.imo_number,
            package_version: 1, // Will increment with updates
            generated_at: new Date().toISOString(),
            compartments: compartments.rows,
            calibration_data: calibrationData,
            metadata: {
                total_compartments: compartments.rows.length,
                total_calibration_rows: Object.values(calibrationData).reduce(
                    (sum, comp) => sum + comp.main_sounding.length + comp.heel_correction.length, 
                    0
                )
            }
        };
        
        // 5. Calculate package size
        const packageJson = JSON.stringify(dataPackage);
        const packageSizeKB = Math.round(Buffer.byteLength(packageJson, 'utf8') / 1024);
        
        // 6. Log package generation
        const logQuery = `
            INSERT INTO vessel_data_packages 
            (vessel_id, package_version, package_size_kb, total_compartments, total_calibration_rows)
            VALUES ($1, 1, $2, $3, $4)
            ON CONFLICT (vessel_id, package_version) 
            DO UPDATE SET generated_at = CURRENT_TIMESTAMP
        `;
        await pool.query(logQuery, [
            vesselId,
            packageSizeKB,
            dataPackage.metadata.total_compartments,
            dataPackage.metadata.total_calibration_rows
        ]);
        
        // 7. Return package (optionally compress with gzip)
        return {
            statusCode: 200,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'Content-Encoding': 'gzip' // If using compression
            },
            body: JSON.stringify({
                success: true,
                data: dataPackage
            })
        };
        
    } catch (error) {
        console.error('Error generating vessel data package:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
}
```

#### Endpoint 4: `POST /vessel/{vessel_id}/sync-soundings`
Batch upload sounding logs from vessel.

```javascript
async function syncSoundings(vesselId, soundings) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const insertedIds = [];
        const skippedDuplicates = [];
        
        for (const sounding of soundings) {
            // Check for duplicate using client_id
            const checkQuery = `
                SELECT log_id FROM sounding_logs WHERE client_id = $1
            `;
            const existing = await client.query(checkQuery, [sounding.client_id]);
            
            if (existing.rows.length > 0) {
                skippedDuplicates.push(sounding.client_id);
                continue;
            }
            
            // Insert new sounding
            const insertQuery = `
                INSERT INTO sounding_logs (
                    vessel_id, compartment_id, recorded_at, report_date,
                    ullage, trim, heel, fuel_grade, density, temperature,
                    base_volume, heel_correction, final_volume, calculated_mt,
                    user_name, device_info, app_version, client_id,
                    sync_status, synced_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18, 'synced', CURRENT_TIMESTAMP
                )
                RETURNING log_id
            `;
            
            const result = await client.query(insertQuery, [
                vesselId,
                sounding.compartment_id,
                sounding.recorded_at,
                sounding.report_date,
                sounding.ullage,
                sounding.trim,
                sounding.heel || null,
                sounding.fuel_grade || null,
                sounding.density || null,
                sounding.temperature || null,
                sounding.base_volume,
                sounding.heel_correction || 0,
                sounding.final_volume,
                sounding.calculated_mt || null,
                sounding.user_name || null,
                sounding.device_info || null,
                sounding.app_version || null,
                sounding.client_id
            ]);
            
            insertedIds.push(result.rows[0].log_id);
        }
        
        await client.query('COMMIT');
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                inserted: insertedIds.length,
                skipped: skippedDuplicates.length,
                inserted_ids: insertedIds
            })
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error syncing soundings:', error);
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    } finally {
        client.release();
    }
}
```

#### Endpoint 5: `POST /vessel/{vessel_id}/sync-bunkering`
Batch upload bunkering operations.

```javascript
async function syncBunkering(vesselId, bunkeringOps) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const insertedOps = [];
        
        for (const bunker of bunkeringOps) {
            // Check for duplicate
            const checkQuery = `
                SELECT bunkering_id FROM bunkering_operations WHERE client_id = $1
            `;
            const existing = await client.query(checkQuery, [bunker.client_id]);
            
            if (existing.rows.length > 0) {
                continue;
            }
            
            // Insert bunkering operation
            const opQuery = `
                INSERT INTO bunkering_operations (
                    vessel_id, bunker_name, fuel_grade, density, temperature,
                    total_quantity_mt, trim, heel, started_at, completed_at,
                    supplier_name, port_name, user_name, client_id,
                    sync_status, synced_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, 'synced', CURRENT_TIMESTAMP
                )
                RETURNING bunkering_id
            `;
            
            const opResult = await client.query(opQuery, [
                vesselId, bunker.bunker_name, bunker.fuel_grade,
                bunker.density, bunker.temperature, bunker.total_quantity_mt,
                bunker.trim, bunker.heel, bunker.started_at, bunker.completed_at,
                bunker.supplier_name, bunker.port_name, bunker.user_name,
                bunker.client_id
            ]);
            
            const bunkeringId = opResult.rows[0].bunkering_id;
            
            // Insert readings
            for (const reading of bunker.readings || []) {
                const readingQuery = `
                    INSERT INTO bunkering_readings (
                        bunkering_id, compartment_id, timestamp, ullage,
                        calculated_volume, calculated_mt, percent_full, client_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `;
                
                await client.query(readingQuery, [
                    bunkeringId, reading.compartment_id, reading.timestamp,
                    reading.ullage, reading.calculated_volume, reading.calculated_mt,
                    reading.percent_full, reading.client_id
                ]);
            }
            
            insertedOps.push(bunkeringId);
        }
        
        await client.query('COMMIT');
        
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                inserted: insertedOps.length,
                inserted_ids: insertedOps
            })
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error syncing bunkering:', error);
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    } finally {
        client.release();
    }
}
```

#### Endpoint 6: `GET /vessel/{vessel_id}/check-update`
Check if vessel needs to update its data package.

```javascript
async function checkForUpdates(vesselId, currentVersion) {
    const query = `
        SELECT package_version, generated_at, package_size_kb
        FROM v_latest_vessel_packages
        WHERE vessel_id = $1
    `;
    const result = await pool.query(query, [vesselId]);
    
    if (result.rows.length === 0) {
        return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: 'No package found for vessel'
            })
        };
    }
    
    const latestPackage = result.rows[0];
    const hasUpdate = latestPackage.package_version > (currentVersion || 0);
    
    return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
            success: true,
            has_update: hasUpdate,
            latest_version: latestPackage.package_version,
            current_version: currentVersion || 0,
            package_size_kb: latestPackage.package_size_kb,
            generated_at: latestPackage.generated_at
        })
    };
}
```

### 2.2 Update Main Lambda Handler

```javascript
exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };
    
    // Handle preflight
    if (event.requestContext.http.method === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    try {
        const method = event.requestContext.http.method;
        const path = event.requestContext.http.path;
        const pathParams = event.pathParameters || {};
        
        // Route handling
        if (method === 'GET' && path === '/vessels') {
            return await getVessels();
        }
        
        if (method === 'GET' && path.match(/^\/vessel\/\d+\/info$/)) {
            const vesselId = parseInt(pathParams.vessel_id);
            return await getVesselInfo(vesselId);
        }
        
        if (method === 'GET' && path.match(/^\/vessel\/\d+\/data-package$/)) {
            const vesselId = parseInt(pathParams.vessel_id);
            return await generateVesselDataPackage(vesselId);
        }
        
        if (method === 'GET' && path.match(/^\/vessel\/\d+\/check-update$/)) {
            const vesselId = parseInt(pathParams.vessel_id);
            const body = JSON.parse(event.body || '{}');
            return await checkForUpdates(vesselId, body.current_version);
        }
        
        if (method === 'POST' && path.match(/^\/vessel\/\d+\/sync-soundings$/)) {
            const vesselId = parseInt(pathParams.vessel_id);
            const body = JSON.parse(event.body || '{}');
            return await syncSoundings(vesselId, body.soundings || []);
        }
        
        if (method === 'POST' && path.match(/^\/vessel\/\d+\/sync-bunkering$/)) {
            const vesselId = parseInt(pathParams.vessel_id);
            const body = JSON.parse(event.body || '{}');
            return await syncBunkering(vesselId, body.bunkering_operations || []);
        }
        
        // Existing endpoints (keep as-is)
        if (method === 'GET' && path.includes('compartments')) {
            return await getCompartments();
        }
        
        if (method === 'POST' && path.includes('sounding')) {
            const body = JSON.parse(event.body || '{}');
            return await getSounding(body);
        }
        
        // 404
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Route not found'
            })
        };
        
    } catch (error) {
        console.error('Lambda error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};
```

### 2.3 API Gateway Configuration

Update API Gateway to support new routes:

```
GET  /vessels
GET  /vessel/{vessel_id}/info
GET  /vessel/{vessel_id}/data-package
GET  /vessel/{vessel_id}/check-update
POST /vessel/{vessel_id}/sync-soundings
POST /vessel/{vessel_id}/sync-bunkering
```

---

## Phase 1C: Frontend Offline Layer

### Timeline: 10-14 days

### 3.1 Install Dependencies

```bash
npm install dexie
npm install dexie-react-hooks
npm install uuid
```

### 3.2 Project Structure

```
src/
├── App.js                          # Main app (updated)
├── index.js                        # Entry point
├── db/
│   ├── database.js                 # Dexie database schema
│   ├── dataPackageService.js       # Download & store vessel data
│   ├── soundingService.js          # Local sounding operations
│   ├── bunkeringService.js         # Local bunkering operations
│   └── syncService.js              # Sync manager
├── utils/
│   ├── interpolation.js            # Port of Lambda interpolation logic
│   ├── connectivity.js             # Online/offline detection
│   └── constants.js                # Trim/heel ranges, fuel grades
├── components/
│   ├── VesselSelection.js          # New: Select vessel screen
│   ├── DataDownload.js             # New: Download vessel data
│   ├── SyncStatus.js               # New: Sync dashboard
│   ├── SoundingTab.js              # Refactored from App.js
│   └── BunkeringTab.js             # Refactored from App.js
├── hooks/
│   ├── useOnlineStatus.js          # Connectivity hook
│   ├── useVesselData.js            # Access vessel data
│   └── useSyncQueue.js             # Sync queue management
└── App.css                         # Styles
```

### 3.3 Dexie Database Schema

Create `src/db/database.js`:

```javascript
import Dexie from 'dexie';

export const db = new Dexie('VesselSoundingDB');

db.version(1).stores({
    // Vessel info
    vessel_info: 'vessel_id, vessel_name',
    
    // Compartments for selected vessel
    compartments: 'compartment_id, vessel_id, compartment_name',
    
    // Calibration data - main sounding
    main_sounding_data: '[compartment_id+ullage], compartment_id, ullage',
    
    // Calibration data - heel correction
    heel_correction_data: '[compartment_id+ullage], compartment_id, ullage',
    
    // Operational data - soundings
    sounding_logs: '++id, client_id, vessel_id, recorded_at, sync_status, report_date',
    
    // Operational data - bunkering operations
    bunkering_operations: '++id, client_id, vessel_id, started_at, sync_status',
    
    // Operational data - bunkering readings
    bunkering_readings: '++id, client_id, bunkering_client_id, timestamp',
    
    // Sync metadata
    sync_metadata: 'key'
});

// Database helper functions
export async function clearAllData() {
    await db.vessel_info.clear();
    await db.compartments.clear();
    await db.main_sounding_data.clear();
    await db.heel_correction_data.clear();
    // Keep logs for sync
}

export async function getVesselInfo() {
    const vessels = await db.vessel_info.toArray();
    return vessels[0] || null;
}

export async function setVesselInfo(vesselData) {
    await db.vessel_info.clear();
    await db.vessel_info.add(vesselData);
}

export async function getCompartments() {
    return await db.compartments.toArray();
}

export async function getSyncMetadata(key, defaultValue = null) {
    const record = await db.sync_metadata.get(key);
    return record ? record.value : defaultValue;
}

export async function setSyncMetadata(key, value) {
    await db.sync_metadata.put({ key, value });
}
```

### 3.4 Interpolation Logic (JavaScript Port)

Create `src/utils/interpolation.js`:

```javascript
// Port of Lambda interpolation logic to JavaScript

const TRIM_RANGES = [
    { value: -4.0, column: 'trim_minus_4_0' },
    { value: -3.0, column: 'trim_minus_3_0' },
    { value: -2.0, column: 'trim_minus_2_0' },
    { value: -1.5, column: 'trim_minus_1_5' },
    { value: -1.0, column: 'trim_minus_1_0' },
    { value: -0.5, column: 'trim_minus_0_5' },
    { value: 0.0, column: 'trim_0_0' },
    { value: 0.5, column: 'trim_plus_0_5' },
    { value: 1.0, column: 'trim_plus_1_0' },
    { value: 1.5, column: 'trim_plus_1_5' },
    { value: 2.0, column: 'trim_plus_2_0' },
    { value: 3.0, column: 'trim_plus_3_0' },
    { value: 4.0, column: 'trim_plus_4_0' }
];

const HEEL_RANGES = [
    { value: -3.0, column: 'heel_minus_3_0' },
    { value: -2.0, column: 'heel_minus_2_0' },
    { value: -1.5, column: 'heel_minus_1_5' },
    { value: -1.0, column: 'heel_minus_1_0' },
    { value: -0.5, column: 'heel_minus_0_5' },
    { value: 0.0, column: 'heel_0_0' },
    { value: 0.5, column: 'heel_plus_0_5' },
    { value: 1.0, column: 'heel_plus_1_0' },
    { value: 1.5, column: 'heel_plus_1_5' },
    { value: 2.0, column: 'heel_plus_2_0' },
    { value: 3.0, column: 'heel_plus_3_0' }
];

// Linear interpolation
function linearInterpolate(x1, y1, x2, y2, x) {
    const nx1 = parseFloat(x1);
    const ny1 = parseFloat(y1);
    const nx2 = parseFloat(x2);
    const ny2 = parseFloat(y2);
    const nx = parseFloat(x);
    
    if (nx1 === nx2) return ny1;
    return ny1 + (ny2 - ny1) * ((nx - nx1) / (nx2 - nx1));
}

// Get trim bounds
function getTrimBounds(targetTrim) {
    const target = parseFloat(targetTrim);
    
    // Check for exact match
    const exactMatch = TRIM_RANGES.find(t => t.value === target);
    if (exactMatch) {
        return { exact: true, column: exactMatch.column };
    }
    
    // Find bounding trims
    for (let i = 0; i < TRIM_RANGES.length - 1; i++) {
        if (target > TRIM_RANGES[i].value && target < TRIM_RANGES[i + 1].value) {
            return {
                exact: false,
                lowerTrim: TRIM_RANGES[i],
                upperTrim: TRIM_RANGES[i + 1]
            };
        }
    }
    
    // Out of range
    if (target < TRIM_RANGES[0].value) {
        throw new Error(`Trim ${target} is below minimum ${TRIM_RANGES[0].value}`);
    } else {
        throw new Error(`Trim ${target} is above maximum ${TRIM_RANGES[TRIM_RANGES.length - 1].value}`);
    }
}

// Get heel bounds
function getHeelBounds(targetHeel) {
    const target = parseFloat(targetHeel);
    
    const exactMatch = HEEL_RANGES.find(h => h.value === target);
    if (exactMatch) {
        return { exact: true, column: exactMatch.column };
    }
    
    for (let i = 0; i < HEEL_RANGES.length - 1; i++) {
        if (target > HEEL_RANGES[i].value && target < HEEL_RANGES[i + 1].value) {
            return {
                exact: false,
                lowerHeel: HEEL_RANGES[i],
                upperHeel: HEEL_RANGES[i + 1]
            };
        }
    }
    
    if (target < HEEL_RANGES[0].value) {
        throw new Error(`Heel ${target} is below minimum ${HEEL_RANGES[0].value}`);
    } else {
        throw new Error(`Heel ${target} is above maximum ${HEEL_RANGES[HEEL_RANGES.length - 1].value}`);
    }
}

// Calculate sounding with interpolation
export async function calculateSounding(compartmentId, ullage, trim, heel = null) {
    const { db } = await import('../db/database');
    
    try {
        // Get base volume from main sounding data
        const baseData = await calculateBaseVolume(compartmentId, ullage, trim);
        
        // Get heel correction if provided
        let heelCorrection = 0;
        if (heel !== null && heel !== undefined && heel !== 0) {
            try {
                heelCorrection = await calculateHeelCorrection(compartmentId, ullage, heel);
            } catch (heelError) {
                console.warn('Heel correction failed:', heelError.message);
                heelCorrection = 0;
            }
        }
        
        return {
            base_volume: baseData.volume,
            heel_correction: heelCorrection,
            final_volume: baseData.volume + heelCorrection,
            sound: baseData.sound,
            ullage: parseFloat(ullage),
            lcg: baseData.lcg,
            tcg: baseData.tcg,
            vcg: baseData.vcg,
            iy: baseData.iy
        };
        
    } catch (error) {
        throw new Error(`Calculation failed: ${error.message}`);
    }
}

// Calculate base volume with trim interpolation
async function calculateBaseVolume(compartmentId, targetUllage, targetTrim) {
    const { db } = await import('../db/database');
    
    const trimBounds = getTrimBounds(targetTrim);
    const targetUllageNum = parseFloat(targetUllage);
    
    // Get all ullages for this compartment
    const allData = await db.main_sounding_data
        .where('compartment_id')
        .equals(compartmentId)
        .sortBy('ullage');
    
    if (allData.length === 0) {
        throw new Error('No calibration data found for this compartment');
    }
    
    const ullages = allData.map(d => parseFloat(d.ullage));
    
    // Check for exact ullage match
    const exactUllageData = allData.find(d => parseFloat(d.ullage) === targetUllageNum);
    
    if (trimBounds.exact) {
        // Exact trim, need ullage interpolation (or exact)
        const column = trimBounds.column;
        
        if (exactUllageData) {
            // Exact match on both
            return {
                volume: parseFloat(exactUllageData[column]) || 0,
                sound: parseFloat(exactUllageData.sound) || null,
                lcg: parseFloat(exactUllageData.lcg) || 0,
                tcg: parseFloat(exactUllageData.tcg) || 0,
                vcg: parseFloat(exactUllageData.vcg) || 0,
                iy: parseFloat(exactUllageData.iy) || 0
            };
        }
        
        // Interpolate ullage
        const { lowerUllage, upperUllage } = findUllageBounds(ullages, targetUllageNum);
        const lowerData = allData.find(d => parseFloat(d.ullage) === lowerUllage);
        const upperData = allData.find(d => parseFloat(d.ullage) === upperUllage);
        
        return {
            volume: linearInterpolate(
                lowerUllage, parseFloat(lowerData[column]) || 0,
                upperUllage, parseFloat(upperData[column]) || 0,
                targetUllageNum
            ),
            sound: Math.round(linearInterpolate(
                lowerUllage, parseFloat(lowerData.sound) || 0,
                upperUllage, parseFloat(upperData.sound) || 0,
                targetUllageNum
            )),
            lcg: linearInterpolate(
                lowerUllage, parseFloat(lowerData.lcg) || 0,
                upperUllage, parseFloat(upperData.lcg) || 0,
                targetUllageNum
            ),
            tcg: linearInterpolate(
                lowerUllage, parseFloat(lowerData.tcg) || 0,
                upperUllage, parseFloat(upperData.tcg) || 0,
                targetUllageNum
            ),
            vcg: linearInterpolate(
                lowerUllage, parseFloat(lowerData.vcg) || 0,
                upperUllage, parseFloat(upperData.vcg) || 0,
                targetUllageNum
            ),
            iy: linearInterpolate(
                lowerUllage, parseFloat(lowerData.iy) || 0,
                upperUllage, parseFloat(upperData.iy) || 0,
                targetUllageNum
            )
        };
    }
    
    // Need bilinear interpolation (both trim and ullage)
    const { lowerTrim, upperTrim } = trimBounds;
    
    if (exactUllageData) {
        // Exact ullage, interpolate trim only
        const volume = linearInterpolate(
            lowerTrim.value, parseFloat(exactUllageData[lowerTrim.column]) || 0,
            upperTrim.value, parseFloat(exactUllageData[upperTrim.column]) || 0,
            parseFloat(targetTrim)
        );
        
        return {
            volume,
            sound: parseFloat(exactUllageData.sound) || null,
            lcg: parseFloat(exactUllageData.lcg) || 0,
            tcg: parseFloat(exactUllageData.tcg) || 0,
            vcg: parseFloat(exactUllageData.vcg) || 0,
            iy: parseFloat(exactUllageData.iy) || 0
        };
    }
    
    // Full bilinear interpolation
    const { lowerUllage, upperUllage } = findUllageBounds(ullages, targetUllageNum);
    const lowerData = allData.find(d => parseFloat(d.ullage) === lowerUllage);
    const upperData = allData.find(d => parseFloat(d.ullage) === upperUllage);
    
    // Interpolate trim at lower ullage
    const volumeAtLowerUllage = linearInterpolate(
        lowerTrim.value, parseFloat(lowerData[lowerTrim.column]) || 0,
        upperTrim.value, parseFloat(lowerData[upperTrim.column]) || 0,
        parseFloat(targetTrim)
    );
    
    // Interpolate trim at upper ullage
    const volumeAtUpperUllage = linearInterpolate(
        lowerTrim.value, parseFloat(upperData[lowerTrim.column]) || 0,
        upperTrim.value, parseFloat(upperData[upperTrim.column]) || 0,
        parseFloat(targetTrim)
    );
    
    // Final interpolation along ullage
    const finalVolume = linearInterpolate(
        lowerUllage, volumeAtLowerUllage,
        upperUllage, volumeAtUpperUllage,
        targetUllageNum
    );
    
    return {
        volume: finalVolume,
        sound: Math.round(linearInterpolate(
            lowerUllage, parseFloat(lowerData.sound) || 0,
            upperUllage, parseFloat(upperData.sound) || 0,
            targetUllageNum
        )),
        lcg: linearInterpolate(
            lowerUllage, parseFloat(lowerData.lcg) || 0,
            upperUllage, parseFloat(upperData.lcg) || 0,
            targetUllageNum
        ),
        tcg: linearInterpolate(
            lowerUllage, parseFloat(lowerData.tcg) || 0,
            upperUllage, parseFloat(upperData.tcg) || 0,
            targetUllageNum
        ),
        vcg: linearInterpolate(
            lowerUllage, parseFloat(lowerData.vcg) || 0,
            upperUllage, parseFloat(upperData.vcg) || 0,
            targetUllageNum
        ),
        iy: linearInterpolate(
            lowerUllage, parseFloat(lowerData.iy) || 0,
            upperUllage, parseFloat(upperData.iy) || 0,
            targetUllageNum
        )
    };
}

// Calculate heel correction
async function calculateHeelCorrection(compartmentId, targetUllage, targetHeel) {
    const { db } = await import('../db/database');
    
    const heelBounds = getHeelBounds(targetHeel);
    const targetUllageNum = parseFloat(targetUllage);
    
    // Get all heel correction data for this compartment
    const allData = await db.heel_correction_data
        .where('compartment_id')
        .equals(compartmentId)
        .sortBy('ullage');
    
    if (allData.length === 0) {
        throw new Error('No heel correction data found');
    }
    
    const ullages = allData.map(d => parseFloat(d.ullage));
    const exactUllageData = allData.find(d => parseFloat(d.ullage) === targetUllageNum);
    
    if (heelBounds.exact) {
        const column = heelBounds.column;
        
        if (exactUllageData) {
            return parseFloat(exactUllageData[column]) || 0;
        }
        
        // Interpolate ullage
        const { lowerUllage, upperUllage } = findUllageBounds(ullages, targetUllageNum);
        const lowerData = allData.find(d => parseFloat(d.ullage) === lowerUllage);
        const upperData = allData.find(d => parseFloat(d.ullage) === upperUllage);
        
        return linearInterpolate(
            lowerUllage, parseFloat(lowerData[column]) || 0,
            upperUllage, parseFloat(upperData[column]) || 0,
            targetUllageNum
        );
    }
    
    // Bilinear interpolation for heel
    const { lowerHeel, upperHeel } = heelBounds;
    
    if (exactUllageData) {
        return linearInterpolate(
            lowerHeel.value, parseFloat(exactUllageData[lowerHeel.column]) || 0,
            upperHeel.value, parseFloat(exactUllageData[upperHeel.column]) || 0,
            parseFloat(targetHeel)
        );
    }
    
    // Full bilinear
    const { lowerUllage, upperUllage } = findUllageBounds(ullages, targetUllageNum);
    const lowerData = allData.find(d => parseFloat(d.ullage) === lowerUllage);
    const upperData = allData.find(d => parseFloat(d.ullage) === upperUllage);
    
    const correctionAtLowerUllage = linearInterpolate(
        lowerHeel.value, parseFloat(lowerData[lowerHeel.column]) || 0,
        upperHeel.value, parseFloat(lowerData[upperHeel.column]) || 0,
        parseFloat(targetHeel)
    );
    
    const correctionAtUpperUllage = linearInterpolate(
        lowerHeel.value, parseFloat(upperData[lowerHeel.column]) || 0,
        upperHeel.value, parseFloat(upperData[upperHeel.column]) || 0,
        parseFloat(targetHeel)
    );
    
    return linearInterpolate(
        lowerUllage, correctionAtLowerUllage,
        upperUllage, correctionAtUpperUllage,
        targetUllageNum
    );
}

// Find bounding ullages
function findUllageBounds(ullages, targetUllage) {
    for (let i = 0; i < ullages.length - 1; i++) {
        if (targetUllage > ullages[i] && targetUllage < ullages[i + 1]) {
            return {
                lowerUllage: ullages[i],
                upperUllage: ullages[i + 1]
            };
        }
    }
    
    if (targetUllage < ullages[0]) {
        throw new Error(`Ullage ${targetUllage} is below minimum ${ullages[0]}`);
    } else {
        throw new Error(`Ullage ${targetUllage} is above maximum ${ullages[ullages.length - 1]}`);
    }
}
```

### 3.5 Data Package Service

Create `src/db/dataPackageService.js`:

```javascript
import { db, setVesselInfo, setSyncMetadata } from './database';

export async function downloadVesselDataPackage(lambdaUrl, vesselId) {
    try {
        // 1. Fetch data package from Lambda
        const response = await fetch(`${lambdaUrl}/vessel/${vesselId}/data-package`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to download package: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Download failed');
        }
        
        const dataPackage = result.data;
        
        // 2. Clear existing data
        await db.vessel_info.clear();
        await db.compartments.clear();
        await db.main_sounding_data.clear();
        await db.heel_correction_data.clear();
        
        // 3. Store vessel info
        await setVesselInfo({
            vessel_id: dataPackage.vessel_id,
            vessel_name: dataPackage.vessel_name,
            imo_number: dataPackage.imo_number,
            package_version: dataPackage.package_version,
            downloaded_at: new Date().toISOString()
        });
        
        // 4. Store compartments
        await db.compartments.bulkAdd(dataPackage.compartments);
        
        // 5. Store calibration data
        for (const [compartmentId, data] of Object.entries(dataPackage.calibration_data)) {
            const compId = parseInt(compartmentId);
            
            // Main sounding data
            const mainSoundingRecords = data.main_sounding.map(row => ({
                compartment_id: compId,
                ...row
            }));
            await db.main_sounding_data.bulkAdd(mainSoundingRecords);
            
            // Heel correction data
            const heelCorrectionRecords = data.heel_correction.map(row => ({
                compartment_id: compId,
                ...row
            }));
            await db.heel_correction_data.bulkAdd(heelCorrectionRecords);
        }
        
        // 6. Store metadata
        await setSyncMetadata('last_download', new Date().toISOString());
        await setSyncMetadata('package_version', dataPackage.package_version);
        
        return {
            success: true,
            vessel_name: dataPackage.vessel_name,
            compartments: dataPackage.compartments.length,
            calibration_rows: dataPackage.metadata.total_calibration_rows
        };
        
    } catch (error) {
        console.error('Error downloading vessel data:', error);
        throw error;
    }
}

export async function checkForDataUpdates(lambdaUrl, vesselId, currentVersion) {
    try {
        const response = await fetch(
            `${lambdaUrl}/vessel/${vesselId}/check-update`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ current_version: currentVersion })
            }
        );
        
        const result = await response.json();
        return result.success ? result : null;
        
    } catch (error) {
        console.error('Error checking for updates:', error);
        return null;
    }
}
```

### 3.6 Vessel Selection Component

Create `src/components/VesselSelection.js`:

```javascript
import React, { useState, useEffect } from 'react';
import { getVesselInfo } from '../db/database';
import { downloadVesselDataPackage } from '../db/dataPackageService';

function VesselSelection({ lambdaUrl, onVesselSelected }) {
    const [vessels, setVessels] = useState([]);
    const [selectedVesselId, setSelectedVesselId] = useState('');
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState('');
    const [currentVessel, setCurrentVessel] = useState(null);
    
    useEffect(() => {
        loadCurrentVessel();
        fetchVessels();
    }, []);
    
    async function loadCurrentVessel() {
        const vessel = await getVesselInfo();
        setCurrentVessel(vessel);
        if (vessel) {
            onVesselSelected(vessel);
        }
    }
    
    async function fetchVessels() {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${lambdaUrl}/vessels`);
            const result = await response.json();
            if (result.success) {
                setVessels(result.data);
            } else {
                setError(result.error || 'Failed to fetch vessels');
            }
        } catch (err) {
            setError('Network error: ' + err.message);
        } finally {
            setLoading(false);
        }
    }
    
    async function handleDownloadData() {
        if (!selectedVesselId) {
            setError('Please select a vessel');
            return;
        }
        
        setDownloading(true);
        setError('');
        
        try {
            const result = await downloadVesselDataPackage(lambdaUrl, selectedVesselId);
            alert(`Success! Downloaded data for ${result.vessel_name}\n` +
                  `Compartments: ${result.compartments}\n` +
                  `Calibration rows: ${result.calibration_rows}`);
            await loadCurrentVessel();
        } catch (err) {
            setError('Download failed: ' + err.message);
        } finally {
            setDownloading(false);
        }
    }
    
    if (currentVessel) {
        return (
            <div className="vessel-info-banner">
                <div className="vessel-current">
                    <h3>📍 Current Vessel: {currentVessel.vessel_name}</h3>
                    <p>IMO: {currentVessel.imo_number} | Package v{currentVessel.package_version}</p>
                    <button 
                        onClick={() => setCurrentVessel(null)}
                        className="change-vessel-btn"
                    >
                        Change Vessel
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="vessel-selection-container">
            <h2>Select Vessel</h2>
            <div className="form-group">
                <label>Vessel:</label>
                <select 
                    value={selectedVesselId}
                    onChange={(e) => setSelectedVesselId(e.target.value)}
                    disabled={loading || downloading}
                >
                    <option value="">-- Select Vessel --</option>
                    {vessels.map(v => (
                        <option key={v.vessel_id} value={v.vessel_id}>
                            {v.vessel_name} ({v.imo_number})
                        </option>
                    ))}
                </select>
            </div>
            
            <button 
                onClick={handleDownloadData}
                disabled={!selectedVesselId || downloading}
                className="download-btn"
            >
                {downloading ? 'Downloading...' : 'Download Vessel Data'}
            </button>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="info-box">
                <p>⚓ First time setup: Download vessel-specific tank calibration data</p>
                <p>📦 Package size: ~2-5 MB</p>
                <p>📶 Requires internet connection (one-time)</p>
                <p>💾 Data stored locally for offline use</p>
            </div>
        </div>
    );
}

export default VesselSelection;
```

---

## Phase 1D: Sync Mechanism

### Timeline: 5-7 days

### 4.1 Sync Service

Create `src/db/syncService.js`:

```javascript
import { db } from './database';
import { v4 as uuidv4 } from 'uuid';

export async function syncAllPendingData(lambdaUrl, vesselId) {
    const syncResults = {
        soundings: { success: 0, failed: 0 },
        bunkering: { success: 0, failed: 0 },
        errors: []
    };
    
    try {
        // 1. Sync soundings
        const pendingSoundings = await db.sounding_logs
            .where('sync_status')
            .equals('pending')
            .toArray();
        
        if (pendingSoundings.length > 0) {
            const soundingResult = await syncSoundings(lambdaUrl, vesselId, pendingSoundings);
            syncResults.soundings = soundingResult;
        }
        
        // 2. Sync bunkering operations
        const pendingBunkering = await db.bunkering_operations
            .where('sync_status')
            .equals('pending')
            .toArray();
        
        if (pendingBunkering.length > 0) {
            const bunkeringResult = await syncBunkering(lambdaUrl, vesselId, pendingBunkering);
            syncResults.bunkering = bunkeringResult;
        }
        
        return syncResults;
        
    } catch (error) {
        console.error('Sync error:', error);
        syncResults.errors.push(error.message);
        return syncResults;
    }
}

async function syncSoundings(lambdaUrl, vesselId, soundings) {
    try {
        const response = await fetch(`${lambdaUrl}/vessel/${vesselId}/sync-soundings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ soundings })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Mark as synced
            for (const sounding of soundings) {
                await db.sounding_logs.update(sounding.id, { sync_status: 'synced' });
            }
            return { success: result.inserted, failed: 0 };
        } else {
            return { success: 0, failed: soundings.length };
        }
        
    } catch (error) {
        console.error('Sounding sync error:', error);
        return { success: 0, failed: soundings.length };
    }
}

async function syncBunkering(lambdaUrl, vesselId, operations) {
    try {
        // For each bunkering operation, include its readings
        const bunkeringWithReadings = await Promise.all(
            operations.map(async (op) => {
                const readings = await db.bunkering_readings
                    .where('bunkering_client_id')
                    .equals(op.client_id)
                    .toArray();
                return { ...op, readings };
            })
        );
        
        const response = await fetch(`${lambdaUrl}/vessel/${vesselId}/sync-bunkering`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bunkering_operations: bunkeringWithReadings })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Mark as synced
            for (const op of operations) {
                await db.bunkering_operations.update(op.id, { sync_status: 'synced' });
            }
            return { success: result.inserted, failed: 0 };
        } else {
            return { success: 0, failed: operations.length };
        }
        
    } catch (error) {
        console.error('Bunkering sync error:', error);
        return { success: 0, failed: operations.length };
    }
}

export async function getPendingCounts() {
    const pendingSoundings = await db.sounding_logs
        .where('sync_status')
        .equals('pending')
        .count();
    
    const pendingBunkering = await db.bunkering_operations
        .where('sync_status')
        .equals('pending')
        .count();
    
    return {
        soundings: pendingSoundings,
        bunkering: pendingBunkering,
        total: pendingSoundings + pendingBunkering
    };
}
```

### 4.2 Sync Status Component

Create `src/components/SyncStatus.js`:

```javascript
import React, { useState, useEffect } from 'react';
import { getPendingCounts, syncAllPendingData } from '../db/syncService';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

function SyncStatus({ lambdaUrl, vesselId }) {
    const isOnline = useOnlineStatus();
    const [pending, setPending] = useState({ soundings: 0, bunkering: 0, total: 0 });
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(null);
    
    useEffect(() => {
        loadPendingCounts();
        const interval = setInterval(loadPendingCounts, 5000); // Update every 5s
        return () => clearInterval(interval);
    }, []);
    
    async function loadPendingCounts() {
        const counts = await getPendingCounts();
        setPending(counts);
    }
    
    async function handleSync() {
        if (!isOnline) {
            alert('No internet connection');
            return;
        }
        
        setSyncing(true);
        try {
            const results = await syncAllPendingData(lambdaUrl, vesselId);
            setLastSync(new Date());
            await loadPendingCounts();
            
            alert(`Sync completed!\n` +
                  `Soundings: ${results.soundings.success} synced\n` +
                  `Bunkering: ${results.bunkering.success} synced`);
        } catch (error) {
            alert('Sync failed: ' + error.message);
        } finally {
            setSyncing(false);
        }
    }
    
    return (
        <div className="sync-status-bar">
            <div className="connectivity">
                {isOnline ? '🟢 Online' : '🔴 Offline'}
            </div>
            
            <div className="pending-count">
                📊 Pending: {pending.total} 
                {pending.total > 0 && (
                    <span className="pending-details">
                        ({pending.soundings} soundings, {pending.bunkering} bunkering)
                    </span>
                )}
            </div>
            
            {pending.total > 0 && (
                <button 
                    onClick={handleSync}
                    disabled={!isOnline || syncing}
                    className="sync-btn"
                >
                    {syncing ? '⏳ Syncing...' : '🔄 Sync Now'}
                </button>
            )}
            
            {lastSync && (
                <div className="last-sync">
                    Last synced: {lastSync.toLocaleTimeString()}
                </div>
            )}
        </div>
    );
}

export default SyncStatus;
```

### 4.3 Online Status Hook

Create `src/hooks/useOnlineStatus.js`:

```javascript
import { useState, useEffect } from 'react';

export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    
    useEffect(() => {
        function handleOnline() {
            setIsOnline(true);
        }
        
        function handleOffline() {
            setIsOnline(false);
        }
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Also ping server periodically
        const interval = setInterval(async () => {
            try {
                const response = await fetch('/ping', { 
                    method: 'HEAD',
                    cache: 'no-cache'
                });
                setIsOnline(response.ok);
            } catch {
                setIsOnline(false);
            }
        }, 30000); // Every 30 seconds
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);
    
    return isOnline;
}
```

---

## Phase 1E: Testing & Deployment

### Timeline: 7-10 days

### 5.1 Testing Checklist

#### Unit Tests
- [ ] Interpolation functions match Lambda output
- [ ] Database CRUD operations
- [ ] Sync queue management
- [ ] Offline detection

#### Integration Tests
- [ ] Download vessel data package
- [ ] Calculate soundings offline
- [ ] Create bunkering operations offline
- [ ] Sync to cloud when online
- [ ] Handle duplicate prevention

#### End-to-End Tests
- [ ] Complete workflow: Download → Offline Work → Sync
- [ ] Multiple vessels switching
- [ ] Large dataset handling (1000+ rows)
- [ ] Network interruption during sync
- [ ] Data consistency verification

#### Performance Tests
- [ ] Initial data download speed
- [ ] Offline calculation speed
- [ ] Sync batch upload speed
- [ ] IndexedDB query performance

### 5.2 Deployment Steps

1. **Database Migration**
   ```bash
   psql -h your-rds-endpoint -U username -d database -f migrations/001_add_vessel_tables.sql
   ```

2. **Lambda Deployment**
   - Update Lambda function code
   - Test new endpoints
   - Update API Gateway routes
   - Deploy to production

3. **Frontend Deployment**
   ```bash
   npm run build
   # Deploy to S3, Netlify, Vercel, etc.
   ```

4. **Progressive Rollout**
   - Week 1: Test with 1 vessel
   - Week 2: Expand to 5 vessels
   - Week 3: Full fleet deployment

### 5.3 Monitoring

- CloudWatch metrics for Lambda invocations
- RDS query performance monitoring
- Track sync success/failure rates
- Monitor data package download times

---

## Success Metrics

- ✅ 95%+ offline availability
- ✅ <5 second offline calculation time
- ✅ <30 second data package download
- ✅ 100% data sync accuracy
- ✅ <$5/month additional AWS costs

---

## Rollback Plan

If issues arise:
1. Keep old app version accessible
2. Database changes are additive (no data loss)
3. Can revert Lambda to previous version
4. Vessels can continue using online-only mode

---

## Future Enhancements (Phase 2+)

- Automatic background sync
- Multi-user support per vessel
- Historical reports and analytics
- Push notifications for sync reminders
- Data export (Excel, PDF)
- Vessel-to-vessel data comparison
- Admin dashboard for fleet management

---

## Appendix

### A. File Structure Summary
```
bunkeringapp/
├── public/
├── src/
│   ├── components/
│   │   ├── VesselSelection.js
│   │   ├── SyncStatus.js
│   │   ├── SoundingTab.js
│   │   └── BunkeringTab.js
│   ├── db/
│   │   ├── database.js
│   │   ├── dataPackageService.js
│   │   └── syncService.js
│   ├── hooks/
│   │   └── useOnlineStatus.js
│   ├── utils/
│   │   ├── interpolation.js
│   │   └── constants.js
│   ├── App.js
│   ├── index.js
│   └── App.css
├── migrations/
│   └── 001_add_vessel_tables.sql
└── package.json
```

### B. Environment Variables
```
# .env.production
REACT_APP_LAMBDA_URL=https://your-lambda-url.lambda-url.region.on.aws
REACT_APP_VERSION=1.0.0
```

### C. Package Dependencies
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-scripts": "^5.0.0",
    "dexie": "^3.2.4",
    "dexie-react-hooks": "^1.1.6",
    "uuid": "^9.0.0"
  }
}
```

---

**Document Version:** 1.0  
**Last Updated:** October 9, 2025  
**Next Review:** After Phase 1A completion

