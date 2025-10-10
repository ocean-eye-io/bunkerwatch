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
    console.log(`Downloading data package for vessel ${vesselId}...`);
    
    const normalizedUrl = normalizeLambdaUrl(lambdaUrl);
    
    // 1. Fetch data package from Lambda
    const response = await fetch(`${normalizedUrl}/vessel/${vesselId}/data-package`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Download failed');
    }
    
    const dataPackage = result.data;
    
    // 2. Clear existing vessel data
    await clearVesselData();
    
    // 3. Store vessel info
    await setVesselInfo({
      vessel_id: dataPackage.vessel_id,
      vessel_name: dataPackage.vessel_name,
      imo_number: dataPackage.imo_number,
      package_version: dataPackage.package_version,
      downloaded_at: new Date().toISOString()
    });
    
    // 4. Store compartments
    if (dataPackage.compartments && dataPackage.compartments.length > 0) {
      await db.compartments.bulkAdd(dataPackage.compartments);
    }
    
    // 5. Store calibration data
    let totalMainRows = 0;
    let totalHeelRows = 0;
    
    for (const [compartmentId, data] of Object.entries(dataPackage.calibration_data)) {
      const compId = parseInt(compartmentId);
      
      // Main sounding data
      if (data.main_sounding && data.main_sounding.length > 0) {
        const mainSoundingRecords = data.main_sounding.map(row => ({
          compartment_id: compId,
          ...row
        }));
        await db.main_sounding_data.bulkAdd(mainSoundingRecords);
        totalMainRows += mainSoundingRecords.length;
      }
      
      // Heel correction data
      if (data.heel_correction && data.heel_correction.length > 0) {
        const heelCorrectionRecords = data.heel_correction.map(row => ({
          compartment_id: compId,
          ...row
        }));
        await db.heel_correction_data.bulkAdd(heelCorrectionRecords);
        totalHeelRows += heelCorrectionRecords.length;
      }
    }
    
    // 6. Store metadata
    await setSyncMetadata('last_download', new Date().toISOString());
    await setSyncMetadata('package_version', dataPackage.package_version);
    await setSyncMetadata('vessel_id', dataPackage.vessel_id);
    
    console.log(`✓ Data package downloaded successfully`);
    console.log(`  Compartments: ${dataPackage.compartments.length}`);
    console.log(`  Main sounding rows: ${totalMainRows}`);
    console.log(`  Heel correction rows: ${totalHeelRows}`);
    
    return {
      success: true,
      vessel_name: dataPackage.vessel_name,
      compartments: dataPackage.compartments.length,
      calibration_rows: totalMainRows + totalHeelRows
    };
    
  } catch (error) {
    console.error('Error downloading vessel data:', error);
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

