# Testing BunkerWatch Lambda Endpoints

## Quick Lambda Health Check

Use these curl commands to test if your Lambda is properly deployed with the new vessel endpoints.

### Replace this in all commands:
```bash
LAMBDA_URL="https://o4lrsr4fhkcpq3lktyqvk335n40fxmin.lambda-url.ap-south-1.on.aws"
```

---

## Test 1: Basic Connectivity (Legacy Endpoint)

```bash
curl -X GET "${LAMBDA_URL}/compartments"
```

**Expected:** List of compartments (this is the old endpoint, should still work)

**If this fails:**
- Lambda is not responding at all
- Check Lambda URL is correct
- Verify Lambda function is deployed

---

## Test 2: Vessel List (NEW Endpoint) ⭐

```bash
curl -X GET "${LAMBDA_URL}/vessels"
```

**Expected Response (SUCCESS):**
```json
{
  "success": true,
  "data": [
    {
      "vessel_id": 1,
      "vessel_name": "Eva Istanbul",
      "imo_number": "IMO9876543",
      "vessel_type": "Container Ship",
      "flag_state": "Malta"
    }
  ],
  "count": 1
}
```

**If you get 500 Error:**
```json
{
  "success": false,
  "error": "Database connection failed",
  "message": "..."
}
```

**Common 500 Error Causes:**
1. **Lambda code not updated** - Did you deploy the new `bunkerwatch-enhanced-handler.js`?
2. **Database connection issue** - Check RDS security group allows Lambda
3. **Vessels table empty or no active vessels** - Run SQL verification (below)
4. **Environment variables missing** - Check DB_HOST, DB_USER, DB_PASSWORD

---

## Test 3: Vessel Data Package (NEW Endpoint)

```bash
curl -X GET "${LAMBDA_URL}/vessel/1/data-package"
```

**Expected:** Large JSON with vessel info, compartments, and calibration data

**If this fails:**
- vessel_id might not exist (try with your actual vessel_id)
- Compartments don't have vessel_id set
- Calibration data not linked to vessel

---

## Database Verification Queries

If Lambda returns 500 error, run these SQL queries to check database:

### 1. Check if vessel exists and is active:
```sql
SELECT vessel_id, vessel_name, imo_number, active 
FROM vessels 
ORDER BY vessel_id;
```

**Expected:** At least one row with `active = t`

**Fix if empty:**
```sql
INSERT INTO vessels (vessel_name, imo_number, vessel_type, flag_state, active)
VALUES ('Eva Istanbul', 'IMO9876543', 'Container Ship', 'Malta', true)
ON CONFLICT (vessel_name) DO UPDATE SET active = true;
```

---

### 2. Check if compartments have vessel_id:
```sql
SELECT 
    compartment_id, 
    compartment_name, 
    vessel_id,
    (SELECT vessel_name FROM vessels WHERE vessel_id = c.vessel_id) as vessel
FROM compartments c
LIMIT 5;
```

**Expected:** All rows should have `vessel_id` populated

**Fix if NULL:**
```sql
-- Run migration again
\i migrations/004_link_eva_istanbul_to_vessel_id.sql
```

---

### 3. Check if calibration data has vessel_id:
```sql
-- Main sounding data
SELECT COUNT(*) as total_rows, 
       COUNT(vessel_id) as rows_with_vessel_id,
       COUNT(*) - COUNT(vessel_id) as rows_missing_vessel_id
FROM main_sounding_trim_data;

-- Heel correction data
SELECT COUNT(*) as total_rows, 
       COUNT(vessel_id) as rows_with_vessel_id,
       COUNT(*) - COUNT(vessel_id) as rows_missing_vessel_id
FROM heel_correction_data;
```

**Expected:** `rows_missing_vessel_id` should be 0

---

## Lambda CloudWatch Logs

If tests fail, check Lambda logs in AWS CloudWatch:

1. Go to AWS CloudWatch Console
2. Navigate to: Log groups → `/aws/lambda/YOUR_FUNCTION_NAME`
3. Look for recent log streams
4. Check for error messages

**Common error messages:**

### "Database connection failed"
```
ECONNREFUSED
```
**Fix:** Lambda not in RDS VPC, or security group blocks access

### "Vessel not found"
```
Error: Vessel not found
```
**Fix:** No active vessels in database, or migration not run

### "relation does not exist"
```
ERROR: relation "vessels" does not exist
```
**Fix:** Migration `001_create_vessel_tables.sql` not run

---

## Lambda Configuration Checklist

Verify these Lambda settings:

- [ ] **VPC:** Same VPC as your RDS instance
- [ ] **Subnets:** Private subnets with RDS access
- [ ] **Security Group:** Allows outbound to RDS port 5432
- [ ] **Timeout:** 30 seconds or more
- [ ] **Memory:** 512 MB recommended
- [ ] **Environment Variables:**
  - `DB_HOST`: Your RDS endpoint
  - `DB_PORT`: 5432
  - `DB_NAME`: Your database name
  - `DB_USER`: Database username
  - `DB_PASSWORD`: Database password
  - `DB_SSL`: true (or false if not using SSL)

---

## Frontend Fix Applied

The frontend now properly handles Lambda URLs with or without trailing slashes:

**Before (Broken):**
```
User enters: https://...on.aws/
App fetches:  https://...on.aws//vessels  ❌ (double slash)
```

**After (Fixed):**
```
User enters: https://...on.aws/
App fetches:  https://...on.aws/vessels   ✅ (normalized)
```

Files updated:
- `src/db/dataPackageService.js` - Added `normalizeLambdaUrl()` function
- `src/db/syncService.js` - Added URL normalization

---

## Step-by-Step Troubleshooting

### Step 1: Test basic connectivity
```bash
curl "${LAMBDA_URL}/compartments"
```
If this fails → Lambda URL is wrong or Lambda not deployed

### Step 2: Test new vessels endpoint
```bash
curl "${LAMBDA_URL}/vessels"
```
If this fails with 404 → Lambda code not updated  
If this fails with 500 → Check CloudWatch logs and database

### Step 3: Check browser console
1. Open browser (F12)
2. Go to Console tab
3. Look for the log: `Fetching vessels from: https://...`
4. Check if URL looks correct (no double slashes)

### Step 4: Verify database
Run SQL queries above to check:
- Vessels table has active vessels
- Compartments have vessel_id
- Calibration data has vessel_id

### Step 5: Check Lambda logs
Look for specific error messages in CloudWatch

---

## Quick Test Script

Save this as `test-lambda.sh`:

```bash
#!/bin/bash

LAMBDA_URL="https://o4lrsr4fhkcpq3lktyqvk335n40fxmin.lambda-url.ap-south-1.on.aws"

echo "Testing BunkerWatch Lambda Endpoints"
echo "====================================="
echo

echo "Test 1: Legacy compartments endpoint..."
curl -s "${LAMBDA_URL}/compartments" | jq -r '.success'
echo

echo "Test 2: New vessels endpoint..."
curl -s "${LAMBDA_URL}/vessels" | jq -r '.success, .count'
echo

echo "Test 3: Vessel data package..."
curl -s "${LAMBDA_URL}/vessel/1/data-package" | jq -r '.success, .data.metadata.total_compartments'
echo

echo "Done!"
```

Run with: `bash test-lambda.sh`

(Requires `jq` for JSON parsing: `sudo apt install jq` or `brew install jq`)

---

## Success Indicators

✅ **Everything Working:**
```
Test 1: Legacy compartments → success: true
Test 2: New vessels → success: true, count: 1
Test 3: Data package → success: true, compartments: 10
```

✅ **Frontend Working:**
- No errors in browser console
- Vessel dropdown shows "Eva Istanbul"
- Download button enabled

❌ **Still Broken:**
- 500 errors → Check CloudWatch logs + database
- 404 errors → Lambda code not deployed
- Double slash in URL → Refresh page (cache issue)

---

## Need More Help?

1. **Export CloudWatch logs** and check for errors
2. **Run all SQL verification queries** and share results
3. **Check Lambda IAM role** has VPC and CloudWatch permissions
4. **Verify RDS security group** allows inbound from Lambda's security group
5. **Test database connection** from Lambda using psql or test query

If everything above checks out but still failing, the issue is likely:
- Lambda cold start timeout (increase to 60s)
- RDS connection pool exhaustion (increase max connections)
- Missing indexes (run `005_add_performance_indexes.sql`)

