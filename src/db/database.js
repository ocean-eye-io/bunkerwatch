// BunkerWatch Database Layer - IndexedDB with Dexie
import Dexie from 'dexie';

export const db = new Dexie('BunkerWatchDB');

// Database Schema
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

// ===== Database Helper Functions =====

/**
 * Clear all vessel data (but keep logs for sync)
 */
export async function clearVesselData() {
  await db.vessel_info.clear();
  await db.compartments.clear();
  await db.main_sounding_data.clear();
  await db.heel_correction_data.clear();
}

/**
 * Get current vessel info
 */
export async function getVesselInfo() {
  const vessels = await db.vessel_info.toArray();
  return vessels[0] || null;
}

/**
 * Set vessel info
 */
export async function setVesselInfo(vesselData) {
  await db.vessel_info.clear();
  await db.vessel_info.add(vesselData);
}

/**
 * Get all compartments for current vessel
 */
export async function getCompartments() {
  return await db.compartments.toArray();
}

/**
 * Get compartment by ID
 */
export async function getCompartmentById(compartmentId) {
  return await db.compartments.get(parseInt(compartmentId));
}

/**
 * Get sync metadata value
 */
export async function getSyncMetadata(key, defaultValue = null) {
  const record = await db.sync_metadata.get(key);
  return record ? record.value : defaultValue;
}

/**
 * Set sync metadata value
 */
export async function setSyncMetadata(key, value) {
  await db.sync_metadata.put({ key, value });
}

/**
 * Check if vessel data is downloaded
 */
export async function hasVesselData() {
  const vessel = await getVesselInfo();
  if (!vessel) return false;
  
  const compartmentCount = await db.compartments.count();
  const soundingDataCount = await db.main_sounding_data.count();
  
  return compartmentCount > 0 && soundingDataCount > 0;
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  return {
    vessel: await getVesselInfo(),
    compartmentCount: await db.compartments.count(),
    soundingDataRows: await db.main_sounding_data.count(),
    heelDataRows: await db.heel_correction_data.count(),
    pendingSoundings: await db.sounding_logs.where('sync_status').equals('pending').count(),
    pendingBunkering: await db.bunkering_operations.where('sync_status').equals('pending').count(),
    totalSoundings: await db.sounding_logs.count(),
    totalBunkering: await db.bunkering_operations.count()
  };
}

/**
 * Export database for debugging
 */
export async function exportDatabase() {
  const stats = await getDatabaseStats();
  const vessel = await getVesselInfo();
  const compartments = await getCompartments();
  
  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    vessel,
    stats,
    compartments
  };
}

export default db;

