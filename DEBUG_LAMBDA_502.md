# Lambda 502 Error - Debugging Steps

## Problem Confirmed
Vessel `30853544-9726-4b3e-be1d-c638c2c03812` causes Lambda to crash with 502 Bad Gateway.

## What's Happening
1. ✅ Frontend requests vessel data
2. ✅ Lambda receives request
3. ❌ Lambda crashes while generating data package
4. ❌ No response sent (hence CORS error)

## Check CloudWatch Logs

Go to AWS Console → Lambda → Your Function → Monitor → CloudWatch Logs

Look for these errors:

### Possible Error 1: Database Query Failure
```
ERROR: Error generating vessel data package
ERROR: No compartments found for this vessel
ERROR: Database query failed
```

### Possible Error 2: Missing vessel_id
```
ERROR: WHERE compartment_id = $1 AND vessel_id = $2
ERROR: column "vessel_id" does not exist
```

### Possible Error 3: NULL values in critical columns
```
ERROR: Ullage cannot be NULL
ERROR: Invalid data in calibration table
```

## Quick Fixes to Try

### Fix 1: Run Migration 008
Update vessel_id in calibration tables:
```sql
UPDATE main_sounding_trim_data mstd
SET vessel_id = c.vessel_id
FROM compartments c
WHERE mstd.compartment_id = c.compartment_id;

UPDATE heel_correction_data hcd
SET vessel_id = c.vessel_id
FROM compartments c
WHERE hcd.compartment_id = c.compartment_id;
```

### Fix 2: Check if vessel has compartments
```sql
SELECT COUNT(*) FROM compartments 
WHERE vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812';
```

### Fix 3: Check if calibration data exists
```sql
SELECT COUNT(*) FROM main_sounding_trim_data mstd
INNER JOIN compartments c ON mstd.compartment_id = c.compartment_id
WHERE c.vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812';
```

## Next Steps

1. **Check CloudWatch logs** for exact error message
2. **Run diagnostic SQL queries** to verify data exists
3. **Run migration 008** to populate vessel_id
4. **Retry download** after fixes

## Most Likely Issue

Based on the pattern:
- ✅ One vessel works (has complete data)
- ❌ Other vessel fails (missing data or vessel_id)

**The failing vessel likely:**
- Missing vessel_id in calibration tables
- Has no compartments
- Has no calibration data

**Run migration 008 and verify with SQL queries!**

