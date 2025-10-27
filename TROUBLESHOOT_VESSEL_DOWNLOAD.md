# Troubleshooting: One Vessel Fails to Download

## Problem
- Frontend fetches 2 vessels successfully
- One vessel downloads successfully
- Other vessel fails with:
  - `502 Bad Gateway`
  - `CORS error (due to Lambda crash)`

## Root Cause Analysis

### Vessel ID 1: `30853544-9726-4b3e-be1d-c638c2c03812` ❌ FAILS
- Error: `502 Bad Gateway`
- Likely cause: Missing compartments or calibration data

### Vessel ID 2: `f0134e61-5c38-4168-91e4-efe4ec942592` ✅ SUCCESS
- Downloads successfully
- Has: 45 compartments, 6540 main sounding rows, 6540 heel correction rows

## Investigation Steps

### 1. Check Lambda CloudWatch Logs
Go to AWS Console → Lambda → Monitor → CloudWatch Logs

Look for:
```
ERROR: Error generating vessel data package
ERROR: Vessel not found
ERROR: No compartments found for this vessel
ERROR: Database query failed
```

### 2. Check Database Data

Run these queries in your PostgreSQL database:

```sql
-- Check if vessel exists
SELECT vessel_id, vessel_name, imo_number 
FROM vessels 
WHERE vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812';

-- Check compartments for this vessel
SELECT COUNT(*) as compartment_count
FROM compartments 
WHERE vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812';

-- Check if calibration data exists
SELECT COUNT(*) as main_sounding_count
FROM main_sounding_trim_data
WHERE vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812';

SELECT COUNT(*) as heel_correction_count
FROM heel_correction_data
WHERE vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812';
```

### 3. Common Causes

#### A. Missing vessel_id Link
**Problem:** Compartments exist but don't have `vessel_id` linked

**Check:**
```sql
SELECT c.*, v.vessel_name
FROM compartments c
LEFT JOIN vessels v ON c.vessel_id = v.vessel_id
WHERE c.vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812';
```

**Fix:** Run migration to link compartments to vessel_id

#### B. Missing Calibration Data
**Problem:** Vessel has compartments but no `main_sounding_trim_data` or `heel_correction_data`

**Check:**
```sql
SELECT c.compartment_id, c.compartment_name,
       COUNT(mstd.compartment_id) as main_rows,
       COUNT(hcd.compartment_id) as heel_rows
FROM compartments c
LEFT JOIN main_sounding_trim_data mstd ON c.compartment_id = mstd.compartment_id
LEFT JOIN heel_correction_data hcd ON c.compartment_id = hcd.compartment_id
WHERE c.vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812'
GROUP BY c.compartment_id, c.compartment_name;
```

**Fix:** Import calibration data for this vessel

#### C. Lambda Timeout
**Problem:** Too much data causing Lambda to timeout

**Check CloudWatch:**
- Duration: Should be < 30 seconds
- Memory: Check if hitting memory limit

**Fix:** Increase Lambda timeout to 60 seconds in AWS Console

#### D. Lambda Memory Limit
**Problem:** Large data package exceeding memory

**Check:**
- Current memory: 512 MB
- Data package size: Check Lambda logs for "Generated data package"

**Fix:** Increase Lambda memory to 1024 MB

### 4. Test Lambda Endpoint Directly

```bash
curl -X GET \
  "https://o4lrsr4fhkcpq3lktyqvk335n40fxmin.lambda-url.ap-south-1.on.aws/vessel/30853544-9726-4b3e-be1d-c638c2c03812/data-package" \
  -H "Content-Type: application/json"
```

## Solutions

### Solution 1: Remove Incomplete Vessel from List
If vessel doesn't have complete data, remove it from database:

```sql
DELETE FROM vessels 
WHERE vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812';
```

### Solution 2: Add Missing Data
Import compartments and calibration data for this vessel

### Solution 3: Update Lambda Error Handling
Make Lambda return proper error response instead of crashing:

```javascript
// In generateVesselDataPackage function
if (compartments.rows.length === 0) {
    return {
        success: false,
        error: 'No compartments found for this vessel',
        vessel_id: vesselId
    };
}
```

### Solution 4: Increase Lambda Resources
- **Timeout:** 60 seconds
- **Memory:** 1024 MB

## Quick Fix

**Most likely issue:** The failing vessel has no compartments or calibration data linked properly.

**Quick test:** Check the `/vessels` endpoint - it should only return vessels with complete data due to the INNER JOIN filter.

```bash
curl "https://o4lrsr4fhkcpq3lktyqvk335n40fxmin.lambda-url.ap-south-1.on.aws/vessels"
```

If it returns 2 vessels but one fails, the issue is with the data-package query for that specific vessel.

## Next Steps

1. ✅ Check CloudWatch logs for exact error
2. ✅ Run database queries to verify data exists
3. ✅ Test Lambda endpoint directly with curl
4. ✅ Fix missing data or remove incomplete vessel
5. ✅ Redeploy Lambda if code changes needed

