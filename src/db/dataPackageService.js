// BunkerWatch Data Package Service
// Handles downloading and storing vessel-specific calibration data

import { db, setVesselInfo, setSyncMetadata, clearVesselData } from './database';

/**
 * Normalize Lambda URL by removing trailing slashes
 */
function normalizeLambdaUrl(url) {
  return url.replace(/\/+$/, ''); // Remove trailing slashes
}

/**
 * Download vessel data package from Lambda
 */
export async function downloadVesselDataPackage(lambdaUrl, vesselId) {
  try {
    console.log(`🚢 [DOWNLOAD] Starting download for vessel: ${vesselId}`);
    
    const normalizedUrl = normalizeLambdaUrl(lambdaUrl);
    const fullUrl = `${normalizedUrl}/vessel/${vesselId}/data-package`;
    console.log(`📡 [DOWNLOAD] Fetching from: ${fullUrl}`);
    
    // 1. Fetch data package from Lambda
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`📥 [DOWNLOAD] Response status: ${response.status} ${response.statusText}`);
    console.log(`📥 [DOWNLOAD] Content-Encoding: ${response.headers.get('Content-Encoding')}`);
    
    if (!response.ok) {
      // Try to get more details from response body
      let errorBody = '';
      try {
        errorBody = await response.text();
        console.error(`❌ [DOWNLOAD] Error response body:`, errorBody);
      } catch (e) {
        console.error(`❌ [DOWNLOAD] Could not read error body`);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`📦 [DOWNLOAD] Response received:`, {
      success: result.success,
      hasData: !!result.data,
      vesselName: result.data?.vessel_name
    });
    
    if (!result.success) {
      console.error(`❌ [DOWNLOAD] Lambda returned success=false:`, result.error);
      throw new Error(result.error || 'Download failed');
    }
    
    const dataPackage = result.data;
    console.log(`📊 [DOWNLOAD] Data package structure:`, {
      vessel_id: dataPackage.vessel_id,
      vessel_name: dataPackage.vessel_name,
      compartments: dataPackage.compartments?.length || 0,
      calibrationDataKeys: Object.keys(dataPackage.calibration_data || {}).length
    });
    
    // 2. Clear existing vessel data
    console.log(`🗑️ [DOWNLOAD] Clearing existing vessel data...`);
    await clearVesselData();
    
    // 3. Store vessel info
    console.log(`💾 [DOWNLOAD] Storing vessel info...`);
    await setVesselInfo({
      vessel_id: dataPackage.vessel_id,
      vessel_name: dataPackage.vessel_name,
      imo_number: dataPackage.imo_number,
      package_version: dataPackage.package_version,
      downloaded_at: new Date().toISOString()
    });
    
    // 4. Store compartments
    console.log(`📦 [DOWNLOAD] Storing ${dataPackage.compartments?.length || 0} compartments...`);
    if (dataPackage.compartments && dataPackage.compartments.length > 0) {
      await db.compartments.bulkAdd(dataPackage.compartments);
      console.log(`✅ [DOWNLOAD] Stored ${dataPackage.compartments.length} compartments`);
    } else {
      console.warn(`⚠️ [DOWNLOAD] No compartments found in data package!`);
    }
    
    // 5. Store calibration data
    let totalMainRows = 0;
    let totalHeelRows = 0;
    
    console.log(`📊 [DOWNLOAD] Processing calibration data for ${Object.keys(dataPackage.calibration_data || {}).length} compartments...`);
    
    for (const [compartmentId, data] of Object.entries(dataPackage.calibration_data)) {
      const compId = parseInt(compartmentId);
      console.log(`  🔧 [DOWNLOAD] Processing compartment ${compId}...`);
      
      // Main sounding data
      if (data.main_sounding && data.main_sounding.length > 0) {
        // Log first record to see structure
        console.log(`    📋 [DOWNLOAD] Sample main sounding record:`, data.main_sounding[0]);
        
        const mainSoundingRecords = data.main_sounding.map(row => ({
          compartment_id: compId,
          ...row,
          ullage: row.ullage ? parseFloat(row.ullage) : null // Convert string to number, keep null as null (must be last to override spread)
        }));
        
        // Log first converted record to debug
        console.log(`    🔍 [DOWNLOAD] First converted record:`, mainSoundingRecords[0]);
        
        // Validate records have required fields - skip only null ullage
        const invalidRecords = mainSoundingRecords.filter(r => 
          r.ullage === null || r.ullage === undefined || typeof r.ullage !== 'number'
        );
        
        if (invalidRecords.length > 0) {
          console.error(`    ❌ [DOWNLOAD] Found ${invalidRecords.length} invalid records (null ullage):`, 
            invalidRecords.slice(0, 3));
          // Skip invalid records
          const validRecords = mainSoundingRecords.filter(r => 
            r.ullage !== null && r.ullage !== undefined && typeof r.ullage === 'number'
          );
          if (validRecords.length > 0) {
            await db.main_sounding_data.bulkPut(validRecords);
            totalMainRows += validRecords.length;
            console.log(`    ✅ [DOWNLOAD] Added ${validRecords.length} valid main sounding rows (skipped ${invalidRecords.length} invalid)`);
          }
        } else {
          await db.main_sounding_data.bulkPut(mainSoundingRecords);
          totalMainRows += mainSoundingRecords.length;
          console.log(`    ✅ [DOWNLOAD] Added ${mainSoundingRecords.length} main sounding rows`);
        }
      } else {
        console.warn(`    ⚠️ [DOWNLOAD] No main sounding data for compartment ${compId}`);
      }
      
      // Heel correction data
      if (data.heel_correction && data.heel_correction.length > 0) {
        // Log first record to see structure
        console.log(`    📋 [DOWNLOAD] Sample heel correction record:`, data.heel_correction[0]);
        
        const heelCorrectionRecords = data.heel_correction.map(row => ({
          compartment_id: compId,
          ...row,
          ullage: row.ullage ? parseFloat(row.ullage) : null // Convert string to number, keep null as null (must be last to override spread)
        }));
        
        // Validate records have required fields - skip only null ullage
        const invalidRecords = heelCorrectionRecords.filter(r => 
          r.ullage === null || r.ullage === undefined || typeof r.ullage !== 'number'
        );
        
        if (invalidRecords.length > 0) {
          console.error(`    ❌ [DOWNLOAD] Found ${invalidRecords.length} invalid records (null ullage):`, 
            invalidRecords.slice(0, 3));
          // Skip invalid records
          const validRecords = heelCorrectionRecords.filter(r => 
            r.ullage !== null && r.ullage !== undefined && typeof r.ullage === 'number'
          );
          if (validRecords.length > 0) {
            await db.heel_correction_data.bulkPut(validRecords);
            totalHeelRows += validRecords.length;
            console.log(`    ✅ [DOWNLOAD] Added ${validRecords.length} valid heel correction rows (skipped ${invalidRecords.length} invalid)`);
          }
        } else {
          await db.heel_correction_data.bulkPut(heelCorrectionRecords);
          totalHeelRows += heelCorrectionRecords.length;
          console.log(`    ✅ [DOWNLOAD] Added ${heelCorrectionRecords.length} heel correction rows`);
        }
      } else {
        console.warn(`    ⚠️ [DOWNLOAD] No heel correction data for compartment ${compId}`);
      }
    }
    
    // 6. Store metadata
    await setSyncMetadata('last_download', new Date().toISOString());
    await setSyncMetadata('package_version', dataPackage.package_version);
    await setSyncMetadata('vessel_id', dataPackage.vessel_id);
    
    console.log(`✅ [DOWNLOAD] Data package downloaded successfully`);
    console.log(`📊 [DOWNLOAD] Summary:`, {
      vessel: dataPackage.vessel_name,
      compartments: dataPackage.compartments.length,
      main_sounding_rows: totalMainRows,
      heel_correction_rows: totalHeelRows,
      total_calibration_rows: totalMainRows + totalHeelRows
    });
    
    return {
      success: true,
      vessel_name: dataPackage.vessel_name,
      compartments: dataPackage.compartments.length,
      calibration_rows: totalMainRows + totalHeelRows
    };
    
  } catch (error) {
    console.error(`❌ [DOWNLOAD] Error downloading vessel data:`, error);
    console.error(`❌ [DOWNLOAD] Error details:`, {
      message: error.message,
      stack: error.stack,
      vesselId: vesselId
    });
    throw new Error(`Download failed: ${error.message}`);
  }
}

/**
 * Check for data package updates
 */
export async function checkForDataUpdates(lambdaUrl, vesselId, currentVersion) {
  try {
    const normalizedUrl = normalizeLambdaUrl(lambdaUrl);
    
    const response = await fetch(
      `${normalizedUrl}/vessel/${vesselId}/check-update`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_version: currentVersion })
      }
    );
    
    if (!response.ok) {
      return null;
    }
    
    const result = await response.json();
    return result.success ? result : null;
    
  } catch (error) {
    console.error('Error checking for updates:', error);
    return null;
  }
}

/**
 * Fetch list of vessels
 */
export async function fetchVessels(lambdaUrl) {
  try {
    const normalizedUrl = normalizeLambdaUrl(lambdaUrl);
    
    console.log('Fetching vessels from:', `${normalizedUrl}/vessels`);
    
    const response = await fetch(`${normalizedUrl}/vessels`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      // Try to get error details from response body
      let errorDetails = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorBody = await response.json();
        if (errorBody.error || errorBody.message) {
          errorDetails += ` - ${errorBody.error || errorBody.message}`;
        }
      } catch (e) {
        // Response body is not JSON
      }
      throw new Error(errorDetails);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch vessels');
    }
    
    console.log('Vessels fetched successfully:', result.data);
    return result.data || [];
    
  } catch (error) {
    console.error('Error fetching vessels:', error);
    throw error;
  }
}

