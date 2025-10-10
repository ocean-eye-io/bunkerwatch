# Enhanced Submit to Cloud Feature

## 🎯 Overview
The enhanced submission feature now saves **both individual tank-level data AND total summary data** to the cloud database. All soundings are grouped by a **session ID**, and the page **never refreshes** after submission - allowing users to review or resubmit if needed.

---

## ✨ Key Enhancements

### 1. **Session-Based Grouping**
- All soundings submitted together get a unique `session_id` (UUID)
- Links individual tank readings to their summary report
- Enables querying all tanks from a specific report

### 2. **System Timestamp**
- Uses actual system date/time (`new Date().toISOString()`)
- Captured at moment of submission, not when form was filled
- Both `recorded_at` (system time) and `report_date` (user-selected) are saved

### 3. **Summary Data Storage**
- New `sounding_reports` table stores:
  - Total tanks counted
  - Grand total mass (mT) across all fuels
  - Total mass by fuel grade (JSONB format)
  - Ship trim and heel at time of report
  - Session ID linking to individual soundings

### 4. **No Page Refresh**
- ✅ Form data stays intact after submit
- ✅ Users can review calculations
- ✅ Can submit again if needed (will create new session)
- ✅ Can modify and resubmit

---

## 📊 Data Structure

### Individual Soundings (`sounding_logs`)
```sql
{
  log_id: 123,
  vessel_id: "uuid",
  compartment_id: 45,
  session_id: "uuid",                    -- NEW: Groups with summary
  recorded_at: "2025-10-10T14:30:25Z",  -- System time
  report_date: "2025-10-10",            -- User-selected date
  ullage: 150.5,
  trim: 0.5,
  heel: null,
  fuel_grade: "MGO",
  density: 0.850,
  temperature: 15.0,
  base_volume: 125.45,
  heel_correction: 0,
  final_volume: 125.45,
  calculated_mt: 106.63,
  ...
}
```

### Summary Report (`sounding_reports`)
```sql
{
  report_id: 45,
  vessel_id: "uuid",
  session_id: "uuid",                    -- Same as in soundings
  recorded_at: "2025-10-10T14:30:25Z",  -- System time
  report_date: "2025-10-10",            -- User-selected date
  total_tanks: 3,
  grand_total_mt: 391.15,
  trim: 0.5,
  heel: null,
  summary_data: {                        -- JSONB
    "MGO": 106.63,
    "HSFO": 234.52,
    "VLSFO": 50.00
  },
  sync_status: "synced",
  synced_at: "2025-10-10T14:30:25Z"
}
```

---

## 🔄 Submission Flow

### Frontend (React)
1. User fills in tank data and clicks "Calculate" for each row
2. Summary table shows "Total Mass by Fuel Grade"
3. User clicks **"💾 Submit to Cloud"**
4. Frontend:
   - Generates unique `session_id` (UUID)
   - Captures system timestamp
   - Builds `soundings` array (tank-level data)
   - Builds `summary` object (totals by fuel grade)
   - POSTs to Lambda: `{ soundings: [...], summary: {...} }`
5. Shows success message with timestamp
6. **Form data remains** - no refresh!

### Backend (Lambda)
1. Receives `{ soundings, summary }` payload
2. Starts database transaction
3. **First**: Inserts summary into `sounding_reports` table
4. **Then**: Inserts each sounding into `sounding_logs` table
   - Links via `session_id`
   - Checks for duplicates (via `client_id`)
5. Commits transaction
6. Returns: `{ inserted: 3, summary_id: 45, session_id: "uuid" }`

### Database
- `sounding_reports` gets 1 row (summary)
- `sounding_logs` gets N rows (one per tank)
- All linked by `session_id`

---

## 📁 Files Changed

### 1. Frontend: `src/App.js`
**Enhanced `submitSoundingsToCloud()` function**:
- Generates `session_id` with `uuidv4()`
- Captures system timestamp: `new Date().toISOString()`
- Builds `soundingsPayload` with session_id for each tank
- Builds `summaryData` with totals by fuel grade
- Sends both to Lambda
- Shows timestamp in success message
- **Removed any form clearing logic**

```javascript
const sessionId = uuidv4();
const systemTimestamp = new Date().toISOString();

const payload = {
  soundings: completedSoundings.map(entry => ({
    session_id: sessionId,
    recorded_at: systemTimestamp,
    // ... other fields
  })),
  summary: {
    session_id: sessionId,
    recorded_at: systemTimestamp,
    total_mass_by_fuel_grade: totalMtByFuelGrade,
    grand_total_mt: Object.values(totalMtByFuelGrade).reduce((sum, mt) => sum + mt, 0),
    // ... other fields
  }
};
```

### 2. Backend: `lambda/bunkerwatch-enhanced-handler.js`
**Updated `syncSoundings()` function**:
- Now accepts full `payload` (not just soundings array)
- Extracts `soundings` and `summary` from payload
- Inserts summary first into `sounding_reports`
- Then inserts individual soundings with `session_id`
- Returns `summary_id` and `session_id` in response

```javascript
const syncSoundings = async (vesselId, payload) => {
  const soundings = payload.soundings || [];
  const summary = payload.summary || null;
  
  // 1. Insert summary
  if (summary) {
    const summaryResult = await client.query(`
      INSERT INTO sounding_reports (
        vessel_id, session_id, recorded_at, report_date,
        total_tanks, grand_total_mt, trim, heel, summary_data, ...
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ...)
      RETURNING report_id
    `, [...]);
    
    summaryId = summaryResult.rows[0].report_id;
  }
  
  // 2. Insert soundings with session_id
  for (const sounding of soundings) {
    await client.query(`
      INSERT INTO sounding_logs (
        vessel_id, compartment_id, session_id, recorded_at, ...
      ) VALUES ($1, $2, $3, $4, ...)
    `, [...]);
  }
  
  return { inserted: X, summary_id: Y, session_id: Z };
};
```

### 3. Database: `migrations/006_add_sounding_reports_and_session_id.sql`
**Schema Changes**:
- Added `session_id` column to `sounding_logs` table (UUID)
- Created new `sounding_reports` table:
  - `report_id` (SERIAL, PK)
  - `vessel_id`, `session_id` (UUID)
  - `recorded_at`, `report_date` (TIMESTAMP, DATE)
  - `total_tanks`, `grand_total_mt` (INTEGER, NUMERIC)
  - `trim`, `heel` (NUMERIC)
  - `summary_data` (JSONB) - stores fuel grade totals
- Added indexes for performance
- Created view `v_sounding_reports_with_details`

---

## 🚀 How to Deploy

### Step 1: Run Database Migration
```bash
psql -h your-rds-endpoint -U postgres -d bunkerwatch -f migrations/006_add_sounding_reports_and_session_id.sql
```

Verify:
```sql
-- Check session_id column added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'sounding_logs' AND column_name = 'session_id';

-- Check sounding_reports table created
SELECT * FROM information_schema.tables 
WHERE table_name = 'sounding_reports';

-- View structure
\d sounding_reports
\d sounding_logs
```

### Step 2: Deploy Lambda
1. Copy updated `lambda/bunkerwatch-enhanced-handler.js` to AWS Lambda
2. Or zip and upload:
   ```bash
   cd lambda
   zip -r function.zip bunkerwatch-enhanced-handler.js
   aws lambda update-function-code --function-name YourFunctionName --zip-file fileb://function.zip
   ```

### Step 3: Test Frontend
```bash
npm start
```

1. Open http://localhost:3000
2. Select vessel and download data
3. Fill in soundings and calculate
4. Click "💾 Submit to Cloud"
5. Verify:
   - Success message shows timestamp
   - Form data stays on page
   - No refresh

### Step 4: Verify in Database
```sql
-- Check latest report
SELECT * FROM sounding_reports 
ORDER BY recorded_at DESC LIMIT 1;

-- Check soundings for that report
SELECT sl.*, c.compartment_name 
FROM sounding_logs sl
JOIN compartments c ON sl.compartment_id = c.compartment_id
WHERE sl.session_id = 'your-session-uuid'
ORDER BY c.compartment_name;

-- Verify totals match
SELECT 
  sr.session_id,
  sr.grand_total_mt as report_total,
  SUM(sl.calculated_mt) as soundings_total,
  sr.total_tanks as report_tank_count,
  COUNT(sl.log_id) as actual_tank_count
FROM sounding_reports sr
JOIN sounding_logs sl ON sr.session_id = sl.session_id
GROUP BY sr.session_id, sr.grand_total_mt, sr.total_tanks;
```

---

## 📊 Useful Queries

### Get Latest Reports with Details
```sql
SELECT * FROM v_sounding_reports_with_details
WHERE vessel_name = 'Eva Istanbul'
ORDER BY recorded_at DESC
LIMIT 10;
```

### Get Full Report with Individual Tanks
```sql
SELECT 
    sr.report_id,
    sr.session_id,
    sr.recorded_at,
    sr.report_date,
    sr.grand_total_mt,
    sr.summary_data,
    c.compartment_name,
    sl.fuel_grade,
    sl.ullage,
    sl.final_volume,
    sl.calculated_mt
FROM sounding_reports sr
JOIN sounding_logs sl ON sr.session_id = sl.session_id
JOIN compartments c ON sl.compartment_id = c.compartment_id
WHERE sr.session_id = 'your-session-uuid'
ORDER BY c.compartment_name;
```

### Get Fuel Grade Totals from JSON
```sql
SELECT 
    session_id,
    recorded_at,
    summary_data->>'MGO' as mgo_mt,
    summary_data->>'HSFO' as hsfo_mt,
    summary_data->>'VLSFO' as vlsfo_mt,
    grand_total_mt
FROM sounding_reports
WHERE vessel_id = 'your-vessel-uuid'
ORDER BY recorded_at DESC;
```

### Compare Reports Over Time
```sql
SELECT 
    report_date,
    recorded_at,
    total_tanks,
    grand_total_mt,
    summary_data->>'MGO' as mgo_mt,
    summary_data->>'HSFO' as hsfo_mt
FROM sounding_reports
WHERE vessel_id = 'your-vessel-uuid'
  AND report_date BETWEEN '2025-10-01' AND '2025-10-31'
ORDER BY report_date DESC;
```

---

## ✅ Testing Checklist

- [ ] Database migration runs successfully
- [ ] `session_id` column added to `sounding_logs`
- [ ] `sounding_reports` table created
- [ ] Lambda deployed with updated code
- [ ] Frontend submits with session_id
- [ ] Summary data is saved
- [ ] Individual soundings are saved with session_id
- [ ] All soundings have same session_id
- [ ] System timestamp is captured correctly
- [ ] Form data remains after submit
- [ ] Can submit multiple times (creates new sessions)
- [ ] Totals in summary match sum of soundings
- [ ] View `v_sounding_reports_with_details` works
- [ ] JSONB queries on `summary_data` work

---

## 🎉 Benefits

### For Users:
✅ Can review data after submit  
✅ No accidental data loss from refresh  
✅ Can resubmit if needed  
✅ See exact timestamp of submission  

### For Developers:
✅ All related soundings grouped by session  
✅ Summary data in one place  
✅ Easy to query reports  
✅ JSONB allows flexible fuel grade queries  
✅ Referential integrity maintained  

### For Business:
✅ Historical reports easily accessible  
✅ Compare reports over time  
✅ Analyze fuel consumption patterns  
✅ Export to Excel/PDF (future feature)  
✅ Audit trail with timestamps  

---

## 🔮 Future Enhancements

1. **Report History View**
   - Show list of past submissions
   - Click to view details
   - Export to PDF/Excel

2. **Edit Submitted Reports**
   - Allow corrections
   - Track revisions
   - Show edit history

3. **Report Comparison**
   - Compare two reports side-by-side
   - Show changes over time
   - Visualize trends

4. **Automated Alerts**
   - Low fuel warnings
   - Unusual consumption patterns
   - Missing reports

5. **Mobile App**
   - Native iOS/Android
   - Offline-first
   - Sync when online

---

## 🎯 Summary

The enhanced submit feature now provides:
- **Session-based grouping** of related soundings
- **Summary data storage** with fuel grade totals
- **System timestamp** capturing
- **No page refresh** - data stays on screen
- **Complete audit trail** for reporting and compliance

All changes are backward compatible and the database schema supports future enhancements! 🚀

