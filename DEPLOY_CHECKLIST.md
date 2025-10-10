# Deployment Checklist - Enhanced Submit Feature

## 📋 Quick Deployment Steps

### ✅ Step 1: Database Migration (5 min)
```bash
# Connect to your RDS database
psql -h your-rds-endpoint.rds.amazonaws.com -U postgres -d bunkerwatch

# Run the migration
\i migrations/006_add_sounding_reports_and_session_id.sql

# Verify it worked
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'sounding_logs' AND column_name = 'session_id';

SELECT table_name FROM information_schema.tables 
WHERE table_name = 'sounding_reports';

# You should see both results
```

**Expected Output:**
```
 column_name 
-------------
 session_id
(1 row)

 table_name        
-------------------
 sounding_reports
(1 row)
```

---

### ✅ Step 2: Deploy Lambda (3 min)

**Option A: Via AWS Console**
1. Go to AWS Lambda Console
2. Select your function
3. Copy entire content of `lambda/bunkerwatch-enhanced-handler.js`
4. Paste into code editor
5. Click **Deploy**
6. Wait for "Successfully updated" message

**Option B: Via AWS CLI**
```bash
cd lambda
zip -r function.zip bunkerwatch-enhanced-handler.js
aws lambda update-function-code \
  --function-name YourFunctionName \
  --zip-file fileb://function.zip
```

---

### ✅ Step 3: Test Frontend (2 min)

Your frontend code is already updated - just test it!

```bash
# If not already running
npm start
```

1. **Open** http://localhost:3000
2. **Select** "Eva Istanbul" vessel
3. **Download** vessel data
4. **Fill** in 2-3 tanks with ullage, fuel grade, density
5. **Set** global trim (e.g., 0.5)
6. **Click** "Calc" for each row
7. **Review** summary showing totals by fuel grade
8. **Click** "💾 Submit to Cloud"
9. **Verify**:
   - ✅ Success message appears
   - ✅ Shows timestamp
   - ✅ Form data stays on page (no refresh!)
   - ✅ Can click Submit again if needed

---

### ✅ Step 4: Verify Database (2 min)

```sql
-- Check latest report
SELECT 
    report_id,
    session_id,
    recorded_at,
    report_date,
    total_tanks,
    grand_total_mt,
    summary_data
FROM sounding_reports
ORDER BY recorded_at DESC
LIMIT 1;
```

**Expected:** 1 row with your data

```sql
-- Check soundings for that session
SELECT 
    sl.log_id,
    sl.session_id,
    c.compartment_name,
    sl.fuel_grade,
    sl.ullage,
    sl.final_volume,
    sl.calculated_mt
FROM sounding_logs sl
JOIN compartments c ON sl.compartment_id = c.compartment_id
WHERE sl.session_id = 'YOUR_SESSION_ID_FROM_ABOVE'
ORDER BY c.compartment_name;
```

**Expected:** Multiple rows (one per tank you submitted)

```sql
-- Verify totals match
SELECT 
  sr.session_id,
  sr.grand_total_mt as report_total,
  ROUND(SUM(sl.calculated_mt)::NUMERIC, 2) as soundings_total,
  sr.total_tanks as report_tank_count,
  COUNT(sl.log_id) as actual_tank_count
FROM sounding_reports sr
JOIN sounding_logs sl ON sr.session_id = sl.session_id
GROUP BY sr.session_id, sr.grand_total_mt, sr.total_tanks
ORDER BY sr.session_id DESC
LIMIT 5;
```

**Expected:** `report_total` ≈ `soundings_total` and `report_tank_count` = `actual_tank_count`

---

## 🎯 Success Criteria

### ✅ Database
- [ ] `session_id` column exists in `sounding_logs` table
- [ ] `sounding_reports` table exists
- [ ] Indexes created successfully
- [ ] View `v_sounding_reports_with_details` works

### ✅ Lambda
- [ ] Code deployed successfully
- [ ] No errors in CloudWatch Logs
- [ ] Returns `summary_id` and `session_id` in response

### ✅ Frontend
- [ ] Submit button appears after calculations
- [ ] Success message shows with timestamp
- [ ] Form data remains after submit (no refresh)
- [ ] Can submit multiple times

### ✅ Data Integrity
- [ ] Summary saved in `sounding_reports`
- [ ] Soundings saved in `sounding_logs`
- [ ] All soundings have same `session_id`
- [ ] `grand_total_mt` matches sum of `calculated_mt`
- [ ] `total_tanks` matches count of soundings

---

## 🐛 Troubleshooting

### Issue: Database migration fails
**Solution:**
```sql
-- Check if tables already exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('sounding_logs', 'sounding_reports');

-- If session_id already exists, skip that part
ALTER TABLE sounding_logs DROP COLUMN IF EXISTS session_id;
-- Then re-run migration
```

### Issue: Lambda error "column does not exist"
**Check:**
1. Did database migration run successfully?
2. Are you connected to correct database?
3. Check CloudWatch logs for exact error

**Fix:**
```bash
# Re-run migration
psql -h your-rds-endpoint -U postgres -d bunkerwatch \
  -f migrations/006_add_sounding_reports_and_session_id.sql
```

### Issue: Frontend shows "Failed to submit"
**Check:**
1. Open browser DevTools (F12) → Console
2. Look for red error messages
3. Check Network tab for failed API calls

**Common fixes:**
- Lambda not deployed → Deploy Lambda
- Database migration not run → Run migration
- Lambda URL wrong → Check Settings (⚙️)

### Issue: Summary not saved but soundings are
**Check:**
```sql
-- Check if summary exists
SELECT COUNT(*) FROM sounding_reports;

-- Check if soundings exist
SELECT COUNT(*) FROM sounding_logs WHERE session_id IS NOT NULL;
```

**If soundings exist but no summary:**
- Lambda might be catching error silently
- Check CloudWatch logs
- Ensure JSONB is valid: `summary_data JSONB`

---

## 🎉 You're Done!

If all checkboxes are ✅, your enhanced submit feature is live!

**What users can do now:**
- ✅ Submit tank soundings with one click
- ✅ See system timestamp of submission
- ✅ Review data after submit (no refresh)
- ✅ Resubmit if needed
- ✅ All data grouped by session ID

**What you can do now:**
- ✅ Query reports by session
- ✅ Analyze fuel consumption
- ✅ Export to Excel/PDF (future)
- ✅ Build dashboards
- ✅ Generate compliance reports

---

## 📞 Need Help?

### Check These Files:
1. **Frontend Logic**: `src/App.js` (line 147-262)
2. **Lambda Logic**: `lambda/bunkerwatch-enhanced-handler.js` (line 238-355)
3. **Database Schema**: `migrations/006_add_sounding_reports_and_session_id.sql`
4. **Full Documentation**: `SUBMIT_ENHANCED_FEATURE.md`

### Common Commands:
```bash
# Check Lambda logs
aws logs tail /aws/lambda/YourFunctionName --follow

# Test Lambda locally
sam local invoke YourFunctionName

# Verify database schema
psql -h your-rds -U postgres -d bunkerwatch -c "\d sounding_reports"
psql -h your-rds -U postgres -d bunkerwatch -c "\d sounding_logs"

# Check recent submissions
psql -h your-rds -U postgres -d bunkerwatch -c "SELECT * FROM v_sounding_reports_with_details LIMIT 5"
```

---

**Happy Deploying!** 🚀

