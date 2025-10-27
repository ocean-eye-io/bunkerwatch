# Fix Wrong Vessel ID - Updated Script

## Problem
Foreign key constraint violation: Vessel ID `30853544-9726-4b3e-be1d-c638c2c03812` doesn't exist in vessels table.

## Solution
Updated migration script now:
1. ✅ **First inserts the vessel record** (if it doesn't exist)
2. ✅ Then updates compartments
3. ✅ Then updates main_sounding_trim_data  
4. ✅ Then updates heel_correction_data

## Updated SQL Script

**File:** `migrations/007_fix_wrong_vessel_id.sql`

### Key Addition:
```sql
-- Insert vessel record first
INSERT INTO vessels (vessel_id, vessel_name, imo_number)
VALUES ('30853544-9726-4b3e-be1d-c638c2c03812', 'Eva Istanbul', '9972440')
ON CONFLICT (vessel_id) DO NOTHING;
```

This prevents the foreign key constraint error.

## How to Run

Run the updated script in your database. It will:
1. Create the vessel record if missing
2. Link all compartments to this vessel
3. Link all calibration data to this vessel
4. Verify everything is correct

## Expected Result

After running, you should see:
- Vessel record created: `30853544-9726-4b3e-be1d-c638c2c03812`
- Compartments linked: 45 rows
- Main sounding data: 6540 rows
- Heel correction data: 6540 rows

Then both vessels should download successfully in the app!
