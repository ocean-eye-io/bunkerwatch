// BunkerWatch Sync Service
// Handles syncing offline data to cloud

import { db } from './database';

/**
 * Normalize Lambda URL by removing trailing slashes
 */
function normalizeLambdaUrl(url) {
  return url.replace(/\/+$/, ''); // Remove trailing slashes
}

/**
 * Get pending sync counts
 */
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

/**
 * Sync all pending data
 */
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
      console.log(`Syncing ${pendingSoundings.length} soundings...`);
      const soundingResult = await syncSoundings(lambdaUrl, vesselId, pendingSoundings);
      syncResults.soundings = soundingResult;
    }
    
    // 2. Sync bunkering operations
    const pendingBunkering = await db.bunkering_operations
      .where('sync_status')
      .equals('pending')
      .toArray();
    
    if (pendingBunkering.length > 0) {
      console.log(`Syncing ${pendingBunkering.length} bunkering operations...`);
      const bunkeringResult = await syncBunkering(lambdaUrl, vesselId, pendingBunkering);
      syncResults.bunkering = bunkeringResult;
    }
    
    console.log('✓ Sync completed', syncResults);
    return syncResults;
    
  } catch (error) {
    console.error('Sync error:', error);
    syncResults.errors.push(error.message);
    return syncResults;
  }
}

/**
 * Sync soundings to cloud
 */
async function syncSoundings(lambdaUrl, vesselId, soundings) {
  try {
    const normalizedUrl = normalizeLambdaUrl(lambdaUrl);
    
    const response = await fetch(`${normalizedUrl}/vessel/${vesselId}/sync-soundings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ soundings })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Mark as synced
      for (const sounding of soundings) {
        await db.sounding_logs.update(sounding.id, { 
          sync_status: 'synced',
          synced_at: new Date().toISOString()
        });
      }
      return { success: result.inserted || soundings.length, failed: 0 };
    } else {
      // Mark as failed
      for (const sounding of soundings) {
        await db.sounding_logs.update(sounding.id, { sync_status: 'failed' });
      }
      return { success: 0, failed: soundings.length };
    }
    
  } catch (error) {
    console.error('Sounding sync error:', error);
    // Mark as failed
    for (const sounding of soundings) {
      await db.sounding_logs.update(sounding.id, { sync_status: 'failed' });
    }
    return { success: 0, failed: soundings.length };
  }
}

/**
 * Sync bunkering operations to cloud
 */
async function syncBunkering(lambdaUrl, vesselId, operations) {
  try {
    const normalizedUrl = normalizeLambdaUrl(lambdaUrl);
    
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
    
    const response = await fetch(`${normalizedUrl}/vessel/${vesselId}/sync-bunkering`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bunkering_operations: bunkeringWithReadings })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Mark as synced
      for (const op of operations) {
        await db.bunkering_operations.update(op.id, { 
          sync_status: 'synced',
          synced_at: new Date().toISOString()
        });
      }
      return { success: result.inserted || operations.length, failed: 0 };
    } else {
      // Mark as failed
      for (const op of operations) {
        await db.bunkering_operations.update(op.id, { sync_status: 'failed' });
      }
      return { success: 0, failed: operations.length };
    }
    
  } catch (error) {
    console.error('Bunkering sync error:', error);
    // Mark as failed
    for (const op of operations) {
      await db.bunkering_operations.update(op.id, { sync_status: 'failed' });
    }
    return { success: 0, failed: operations.length };
  }
}

