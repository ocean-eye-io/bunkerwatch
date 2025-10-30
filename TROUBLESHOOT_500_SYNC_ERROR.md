# Troubleshooting 500 Error When Submitting to Cloud

## Problem
When submitting soundings to the cloud, you get a 500 Internal Server Error from the Lambda function.

```
POST /vessel/30853544-9726-4b3e-be1d-c638c2c03812/sync-soundings
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

## Root Cause
**Database Schema Mismatch**: Your database has inconsistent data types for `vessel_id`:
- `sounding_logs.vessel_id` is defined as `INT` (SERIAL)
- `sounding_reports.vessel_id` is defined as `UUID`
- Lambda is trying to insert UUID values into INT columns

## How to Check Your Database

### Step 1: Check What Tables You Have

First, see what tables exist in your database:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### Step 2: Check vessel_id Types

If the tables exist, check what types they use:

```sql
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('vessels', 'sounding_logs', 'bunkering_operations', 'sounding_reports')
  AND column_name = 'vessel_id'
ORDER BY table_name;
```

### Step 3: Check for Missing Tables

If you don't see `sounding_logs` or `sounding_reports`, you need to run the migrations!

### Expected Output
If everything is correct, you should see:
```
table_name               | column_name | data_type
--------------------------|-------------|----------
vessels                  | vessel_id   | uuid
sounding_logs            | vessel_id   | uuid
bunkering_operations     | vessel_id   | uuid
sounding_reports        | vessel_id   | uuid
```

### If You See INT/SERIAL
If you see `integer` or `serial` for any of these tables, that's the problem!

## Solution Options

### Option 1: Update Your Database to Use UUID (Recommended)

Run these ALTER statements to convert your tables to UUID:

```sql
BEGIN;

-- 1. Update vessels table (if needed)
ALTER TABLE vessels 
    ALTER COLUMN vessel_id TYPE UUID USING vessel_id::text::uuid;

-- 2. Update sounding_logs
ALTER TABLE sounding_logs 
    ALTER COLUMN vessel_id TYPE UUID USING vessel_id::text::uuid;

-- 3. Update bunkering_operations  
ALTER TABLE bunkering_operations 
    ALTER COLUMN vessel_id TYPE UUID USING vessel_id::text::uuid;

COMMIT;
```

**⚠️ WARNING**: This conversion assumes your INT vessel_ids are safe to convert. If you have complex relationships or existing data, you may need to:
1. Backup your database first
2. Manually map old INT IDs to new UUIDs
3. Update all foreign key references

### Option 2: Quick Fix - Update Lambda to Handle INT

If you can't change the database schema, update the Lambda handler to convert UUID strings to integers. However, this requires you to maintain a mapping between UUIDs and integer IDs.

## Check CloudWatch Logs

With the updated Lambda handler (bunkerwatch-enhanced-handler.js), check CloudWatch logs for:
- `[SYNC] Starting sync for vessel_id: ...` - Shows what vessel_id is being used
- `[SYNC] Error syncing soundings:` - Shows the exact error
- `[LAMBDA] Error:` - Shows full error details

## Testing After Fix

1. Check the Lambda logs in CloudWatch to see detailed error messages
2. Test submitting a single sounding to verify the fix
3. Check that data appears in your `sounding_logs` table

## Verification Query

After fixing, verify your data:

```sql
SELECT 
    log_id,
    vessel_id,
    compartment_id,
    recorded_at,
    final_volume,
    calculated_mt,
    sync_status
FROM sounding_logs
ORDER BY recorded_at DESC
LIMIT 10;
```

## Quick Diagnostic Commands

### Check if tables exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('sounding_logs', 'sounding_reports')
ORDER BY table_name;
```

### Check data type of vessel_id
```sql
SELECT 
    table_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('vessels', 'sounding_logs', 'sounding_reports')
  AND column_name = 'vessel_id';
```

### Check for recent sync errors
```sql
SELECT * FROM sync_history 
WHERE sync_status = 'failed'
ORDER BY sync_started_at DESC
LIMIT 10;
```

## Still Getting 500 Error?

1. Check CloudWatch logs for the specific error message
2. Verify database connections and credentials are correct
3. Check that all required tables exist
4. Verify that the database user has INSERT permissions on `sounding_logs` and `sounding_reports`

---

**Need Help?** Share your CloudWatch log output and we can diagnose further.

