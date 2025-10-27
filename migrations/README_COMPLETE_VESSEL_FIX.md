# Fix Vessel Download Issue - Complete Solution

## Problem Summary
- Vessel `f0134e61-5c38-4168-91e4-efe4ec942592` downloads successfully ✅
- Vessel `30853544-9726-4b3e-be1d-c638c2c03812` fails with CORS/502 error ❌

## Root Cause
The Lambda function queries calibration data with BOTH `compartment_id` AND `vessel_id`:
```sql
WHERE compartment_id = $1 AND vessel_id = $2
```

If `main_sounding_trim_data` or `heel_correction_data` tables don't have `vessel_id` populated, the Lambda returns empty results and crashes.

## Solution

### Step 1: Run Migration 007 (Fix vessel_id in compartments)
```sql
-- File: migrations/007_fix_wrong_vessel_id.sql
-- Ensures compartments have correct vessel_id
```

### Step 2: Run Migration 008 (Add vessel_id to calibration tables)
```sql
-- File: migrations/008_add_vessel_id_to_calibration_tables.sql
-- Adds vessel_id columns if missing
-- Populates vessel_id from compartments table
```

## How to Run

### Option 1: Run both migrations together
```bash
psql -h your-rds-endpoint -U your_user -d bunkerwatch -f migrations/007_fix_wrong_vessel_id.sql
psql -h your-rds-endpoint -U your_user -d bunkerwatch -f migrations/008_add_vessel_id_to_calibration_tables.sql
```

### Option 2: Run in database client
1. Open `migrations/007_fix_wrong_vessel_id.sql`
2. Execute all SQL statements
3. Open `migrations/008_add_vessel_id_to_calibration_tables.sql`
4. Execute all SQL statements

## What Migration 008 Does

1. ✅ Adds `vessel_id` column to `main_sounding_trim_data` (if missing)
2. ✅ Adds `vessel_id` column to `heel_correction_data` (if missing)
3. ✅ Populates `vessel_id` from `compartments` table
4. ✅ Verifies all rows have `vessel_id` populated
5. ✅ Checks specific vessel's data completeness

## Expected Results

After running both migrations:

### Verification Query Results:
```
table_name                  | total_rows | rows_with_vessel_id | rows_without_vessel_id
----------------------------+------------+---------------------+------------------------
main_sounding_trim_data     | 13080      | 13080               | 0
heel_correction_data        | 13080      | 13080               | 0
```

### Vessel Check:
```
vessel_check                                    | compartments_with_main_data | compartments_with_heel_data
------------------------------------------------+-----------------------------+---------------------------
Vessel 30853544-9726-4b3e-be1d-c638c2c03812    | 45                         | 45
```

## After Running

1. ✅ Refresh the app
2. ✅ Both vessels should download successfully
3. ✅ No more CORS/502 errors
4. ✅ Lambda will find calibration data for both vessels

## Why This Fixes It

The Lambda function requires BOTH conditions to be true:
- Compartment exists in `compartments` table with `vessel_id`
- Calibration data exists with matching `compartment_id` AND `vessel_id`

If calibration data is missing `vessel_id`, the Lambda query returns empty results and crashes.

## Troubleshooting

If still not working after migrations:

1. Check CloudWatch logs for Lambda errors
2. Verify vessel_id exists in ALL tables:
   ```sql
   SELECT 'vessels' as table_name, COUNT(*) FROM vessels WHERE vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812'
   UNION ALL
   SELECT 'compartments', COUNT(*) FROM compartments WHERE vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812'
   UNION ALL
   SELECT 'main_sounding_trim_data', COUNT(*) FROM main_sounding_trim_data WHERE vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812'
   UNION ALL
   SELECT 'heel_correction_data', COUNT(*) FROM heel_correction_data WHERE vessel_id = '30853544-9726-4b3e-be1d-c638c2c03812';
   ```

3. Should return 1, 45, 6540, 6540 respectively

