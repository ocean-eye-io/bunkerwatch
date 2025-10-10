# Quick Test Guide: Submit to Cloud

## 🧪 How to Test the Submit Feature

### Step 1: Start the App
```bash
npm start
```

### Step 2: Select Vessel & Download Data
1. Open http://localhost:3000
2. Select "Eva Istanbul" from dropdown
3. Click "📥 Download Vessel Data"
4. Wait for success message

### Step 3: Perform Calculations
1. Go to **Sounding** tab
2. Set **Report Date**: Today's date
3. Set **Global Trim**: `0.5`
4. Set **Global Heel**: `0` (or leave empty)

5. **Add Tank Entry**:
   - **Tank**: Select any tank (e.g., "No. 2 DB Tank")
   - **Fuel Grade**: `MGO`
   - **Ullage (cm)**: `150`
   - **Density**: `0.850`
   - **Temperature**: `15`
   - Click **"Calc"** button

6. **Add More Entries** (optional):
   - Click "+ Add Row"
   - Fill in different tanks
   - Calculate each row

### Step 4: Review Summary
- Scroll down to see **"Total Mass by Fuel Grade"** table
- Should show totals for each fuel type
- **Submit button should appear** below the table

### Step 5: Submit to Cloud

#### If Online:
- Button shows: **"💾 Submit to Cloud"**
- Click the button
- Should see: **"Submitting..."** (blue)
- Then: **"✅ Successfully saved X sounding(s) to cloud"** (green)

#### If Offline:
- Button shows: **"📵 Offline - Cannot Submit"**
- Button is disabled (grayed out)
- Cannot click

### Step 6: Verify in Database

Run this SQL query to check if data was saved:

```sql
SELECT 
    sl.log_id,
    sl.recorded_at,
    sl.report_date,
    c.compartment_name,
    sl.fuel_grade,
    sl.ullage,
    sl.trim,
    sl.heel,
    sl.final_volume,
    sl.calculated_mt,
    sl.sync_status,
    sl.synced_at
FROM sounding_logs sl
JOIN compartments c ON sl.compartment_id = c.compartment_id
WHERE sl.vessel_id = (SELECT vessel_id FROM vessels WHERE vessel_name = 'Eva Istanbul')
ORDER BY sl.recorded_at DESC
LIMIT 10;
```

Expected Result:
- New rows should appear
- `sync_status` = `'synced'`
- `synced_at` should be current timestamp
- All calculation values should match your inputs

---

## 🐛 Troubleshooting

### Button is Disabled
**Check**:
1. Is the status bar showing "Online"? 
2. Did you click "Calc" for at least one row?
3. Did you select a compartment AND fuel grade for calculated rows?

### Error: "Cannot submit: You are offline"
**Fix**:
- Check your internet connection
- Wait for the status indicator to turn green ("Online")
- Try again

### Error: "No completed calculations to submit"
**Fix**:
- Click the "Calc" button for each tank row
- Ensure compartment_id and fuel_grade are filled
- Check that results appear in the "Volume (m³)" column

### Error: "HTTP 500: Internal Server Error"
**Check**:
1. **Lambda deployed?**
   - Go to AWS Lambda Console
   - Check if code is updated
   - Look at CloudWatch logs for errors

2. **Database connection?**
   - Lambda logs should show "Database connection successful"
   - Check RDS security groups allow Lambda access

3. **Table exists?**
   ```sql
   SELECT * FROM sounding_logs LIMIT 1;
   ```

### Success Message Doesn't Appear
**Check**:
- Open browser DevTools (F12)
- Go to Console tab
- Look for errors or "✓ Soundings submitted:" message
- Check Network tab for the API call

---

## 📊 Expected Behavior

### ✅ Success Flow
1. User fills in tank data
2. User clicks "Calc" for each row
3. Summary table shows totals
4. Submit button appears (enabled)
5. User clicks "💾 Submit to Cloud"
6. Button text changes to "Submitting..."
7. Green success message appears
8. Message shows number of records saved
9. Message auto-dismisses after 5 seconds
10. Data is in database

### ❌ Error Flows

**No Calculations**:
1. User tries to submit without calculating
2. Red error message: "No completed calculations to submit"
3. Message disappears after 3 seconds

**Offline**:
1. User goes offline
2. Submit button shows "📵 Offline - Cannot Submit"
3. Button is disabled

**API Error**:
1. Lambda or database error occurs
2. Red error message: "❌ Failed to submit: [error details]"
3. Message stays for 5 seconds
4. User can try again

---

## 🎯 Test Scenarios

### Scenario 1: Single Tank Submission
- [x] Fill in one tank
- [x] Calculate
- [x] Submit
- [x] Verify 1 record in database

### Scenario 2: Multiple Tanks
- [x] Fill in 3 tanks with different fuel grades
- [x] Calculate all
- [x] Submit
- [x] Verify 3 records in database
- [x] Check summary shows correct totals per fuel grade

### Scenario 3: Offline Mode
- [x] Disconnect internet
- [x] Status bar shows "Offline" (red)
- [x] Submit button is disabled
- [x] Button text shows "📵 Offline"

### Scenario 4: Empty Submission
- [x] Don't calculate any rows
- [x] Click Submit (should be disabled)
- [x] Or if enabled, shows "No completed calculations"

### Scenario 5: Duplicate Submission
- [x] Submit once successfully
- [x] Click Submit again without changing data
- [x] Lambda should skip duplicates (checks client_id)
- [x] Response: `"inserted": 0, "skipped": X`

### Scenario 6: Mixed Calculations
- [x] Calculate 2 tanks successfully
- [x] Leave 1 tank uncalculated
- [x] Submit should only send the 2 calculated ones
- [x] Verify 2 records in database

### Scenario 7: With Heel Correction
- [x] Set Global Heel to `1.0`
- [x] Calculate tank
- [x] Submit
- [x] Verify `heel_correction` is saved in database

### Scenario 8: Mobile View
- [x] Open in mobile viewport (or resize browser)
- [x] Submit button should be full width
- [x] Status message should be full width
- [x] UI should be responsive

---

## 🔍 Validation Checks

After each submission, verify:

1. **Data Accuracy**:
   ```sql
   SELECT ullage, trim, heel, final_volume, calculated_mt 
   FROM sounding_logs 
   WHERE log_id = [latest_id];
   ```
   Compare with UI values

2. **Timestamps**:
   ```sql
   SELECT recorded_at, report_date, synced_at 
   FROM sounding_logs 
   WHERE log_id = [latest_id];
   ```
   - `recorded_at` should be current UTC time
   - `report_date` should match selected date
   - `synced_at` should be current time

3. **Duplicate Prevention**:
   ```sql
   SELECT client_id, COUNT(*) 
   FROM sounding_logs 
   GROUP BY client_id 
   HAVING COUNT(*) > 1;
   ```
   Should return 0 rows (no duplicates)

4. **Sync Status**:
   ```sql
   SELECT sync_status, synced_at 
   FROM sounding_logs 
   WHERE sync_status != 'synced';
   ```
   Should return 0 rows (all synced)

---

## 📝 Test Checklist

- [ ] App starts without errors
- [ ] Vessel selection works
- [ ] Data download successful
- [ ] Can perform calculations
- [ ] Submit button appears after calculations
- [ ] Submit button disabled when offline
- [ ] Submit button disabled when no data
- [ ] Submitting shows "Submitting..." message
- [ ] Success message shows correct count
- [ ] Error messages display properly
- [ ] Messages auto-dismiss
- [ ] Data appears in database
- [ ] Duplicate submissions are prevented
- [ ] Mobile view works correctly
- [ ] Browser console has no errors

---

## 🎉 Ready to Test!

Everything is set up. Just:
1. Deploy the Lambda (if not already done)
2. Run `npm start`
3. Follow the test steps above
4. Check the database

If you encounter any issues, check the browser console and Lambda CloudWatch logs for details.

**Happy Testing!** 🚀

