// BunkerWatch Interpolation Engine
// JavaScript port of Lambda bilinear interpolation logic

import { db } from '../db/database';
import { TRIM_RANGES, HEEL_RANGES } from './constants';

/**
 * Linear interpolation between two points
 */
function linearInterpolate(x1, y1, x2, y2, x) {
  const nx1 = parseFloat(x1);
  const ny1 = parseFloat(y1);
  const nx2 = parseFloat(x2);
  const ny2 = parseFloat(y2);
  const nx = parseFloat(x);
  
  if (nx1 === nx2) return ny1;
  return ny1 + (ny2 - ny1) * ((nx - nx1) / (nx2 - nx1));
}

/**
 * Get trim bounds for interpolation
 */
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
    throw new Error(`Trim ${target}m is below minimum ${TRIM_RANGES[0].value}m`);
  } else {
    throw new Error(`Trim ${target}m is above maximum ${TRIM_RANGES[TRIM_RANGES.length - 1].value}m`);
  }
}

/**
 * Get heel bounds for interpolation
 */
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
    throw new Error(`Heel ${target}° is below minimum ${HEEL_RANGES[0].value}°`);
  } else {
    throw new Error(`Heel ${target}° is above maximum ${HEEL_RANGES[HEEL_RANGES.length - 1].value}°`);
  }
}

/**
 * Find bounding ullages
 */
function findUllageBounds(ullages, targetUllage) {
  for (let i = 0; i < ullages.length - 1; i++) {
    if (targetUllage >= ullages[i] && targetUllage <= ullages[i + 1]) {
      return {
        lowerUllage: ullages[i],
        upperUllage: ullages[i + 1]
      };
    }
  }
  
  if (targetUllage < ullages[0]) {
    throw new Error(`Ullage ${targetUllage}cm is below minimum ${ullages[0]}cm`);
  } else {
    throw new Error(`Ullage ${targetUllage}cm is above maximum ${ullages[ullages.length - 1]}cm`);
  }
}

/**
 * Calculate base volume with trim interpolation
 */
async function calculateBaseVolume(compartmentId, targetUllage, targetTrim) {
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

/**
 * Calculate heel correction
 */
async function calculateHeelCorrection(compartmentId, targetUllage, targetHeel) {
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

/**
 * Calculate sounding with interpolation (main entry point)
 * @param {number} compartmentId - Compartment ID
 * @param {number} ullage - Ullage in cm
 * @param {number} trim - Trim in meters
 * @param {number|null} heel - Heel in degrees (optional)
 * @returns {Promise<object>} Calculation results
 */
export async function calculateSounding(compartmentId, ullage, trim, heel = null) {
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
      success: true,
      base_volume: baseData.volume,
      heel_correction: heelCorrection,
      final_volume: baseData.volume + heelCorrection,
      volume: baseData.volume + heelCorrection, // For compatibility
      sound: baseData.sound,
      ullage: parseFloat(ullage),
      lcg: baseData.lcg,
      tcg: baseData.tcg,
      vcg: baseData.vcg,
      iy: baseData.iy
    };
    
  } catch (error) {
    console.error('Calculation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default calculateSounding;

