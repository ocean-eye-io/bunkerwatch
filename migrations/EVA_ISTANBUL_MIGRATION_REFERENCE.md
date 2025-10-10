# 🚢 Eva Istanbul - Database Migration Reference

**Migration Date:** October 9, 2025  
**Purpose:** Link existing Eva Istanbul calibration data to vessel_id system  
**Status:** ✅ Ready to Execute

---

## 📋 Overview

This migration adds `vessel_id` columns to your existing tables and links all Eva Istanbul data:
- **compartments** table
- **main_sounding_trim_data** table  
- **heel_correction_data** table

---

## 🎯 What This Migration Does

### Step 1: Ensure Eva Istanbul Exists
- Checks if "Eva Istanbul" is in `vessels` table
- Inserts if missing (case-insensitive check)
- Retrieves the vessel_id (UUID)

### Step 2: Update compartments Table
- Adds `vessel_id` column (UUID type)
- Links all compartments to Eva Istanbul
- Creates performance index

### Step 3: Update main_sounding_trim_data Table
- Adds `vessel_id` column (UUID type)
- Links all calibration data via compartment_id
- Creates performance indexes

### Step 4: Update heel_correction_data Table
- Adds `vessel_id` column (UUID type)
- Links all heel correction data via compartment_id
- Creates performance indexes

### Step 5: Verification
- Displays summary of records updated
- Counts all linked records
- Reports success

---

## 🚀 How to Run

### Method 1: Using psql

```bash
psql -h your-rds-endpoint.region.rds.amazonaws.com \
     -U your-username \
     -d your-database \
     -f migrations/004_link_eva_istanbul_to_vessel_id.sql
```

### Method 2: Using pgAdmin / DBeaver

1. Connect to your database
2. Open SQL Editor
3. Copy content from `004_link_eva_istanbul_to_vessel_id.sql`
4. Execute

---

## ✅ Expected Results

After running the migration, you should see output like:

```
NOTICE:  Found Eva Istanbul with vessel_id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NOTICE:  Added vessel_id column to compartments table
NOTICE:  Updated 15 compartment records with Eva Istanbul vessel_id
NOTICE:  Added vessel_id column to main_sounding_trim_data table
NOTICE:  Updated 2458 main_sounding_trim_data records with Eva Istanbul vessel_id
NOTICE:  Added vessel_id column to heel_correction_data table
NOTICE:  Updated 1847 heel_correction_data records with Eva Istanbul vessel_id
NOTICE:  ========================================
NOTICE:  MIGRATION SUMMARY
NOTICE:  ========================================
NOTICE:  Vessel Name: Eva Istanbul
NOTICE:  Vessel ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NOTICE:  ----------------------------------------
NOTICE:  Compartments linked: 15
NOTICE:  Main sounding records linked: 2458
NOTICE:  Heel correction records linked: 1847
NOTICE:  ========================================
```

*(Your counts will vary based on actual data)*

---

## 🔍 Verification Queries

After migration, run these to verify success:

### 1. Check Eva Istanbul Vessel

```sql
SELECT * FROM vessels 
WHERE LOWER(vessel_name) = LOWER('Eva Istanbul');
```

**Expected:** 1 row with vessel details

### 2. Count Linked Records

```sql
SELECT 
    (SELECT COUNT(*) FROM compartments 
     WHERE vessel_id = (SELECT vessel_id FROM vessels 
                        WHERE LOWER(vessel_name) = LOWER('Eva Istanbul'))) 
    as compartments_count,
    
    (SELECT COUNT(*) FROM main_sounding_trim_data 
     WHERE vessel_id = (SELECT vessel_id FROM vessels 
                        WHERE LOWER(vessel_name) = LOWER('Eva Istanbul'))) 
    as main_sounding_count,
    
    (SELECT COUNT(*) FROM heel_correction_data 
     WHERE vessel_id = (SELECT vessel_id FROM vessels 
                        WHERE LOWER(vessel_name) = LOWER('Eva Istanbul'))) 
    as heel_correction_count;
```

**Expected:** All counts > 0

### 3. Check for NULL vessel_id

```sql
SELECT 'compartments' as table_name, 
       COUNT(*) as null_count 
FROM compartments 
WHERE vessel_id IS NULL

UNION ALL

SELECT 'main_sounding_trim_data', 
       COUNT(*) 
FROM main_sounding_trim_data 
WHERE vessel_id IS NULL

UNION ALL

SELECT 'heel_correction_data', 
       COUNT(*) 
FROM heel_correction_data 
WHERE vessel_id IS NULL;
```

**Expected:** All counts = 0 (no nulls)

### 4. Verify Complete Linkage

```sql
SELECT 
    v.vessel_name,
    v.vessel_id,
    COUNT(DISTINCT c.compartment_id) as total_compartments,
    COUNT(DISTINCT m.main_id) as main_sounding_rows,
    COUNT(DISTINCT h.heel_id) as heel_correction_rows
FROM vessels v
LEFT JOIN compartments c ON v.vessel_id = c.vessel_id
LEFT JOIN main_sounding_trim_data m ON c.compartment_id = m.compartment_id
LEFT JOIN heel_correction_data h ON c.compartment_id = h.compartment_id
WHERE LOWER(v.vessel_name) = LOWER('Eva Istanbul')
GROUP BY v.vessel_name, v.vessel_id;
```

**Expected:** Shows complete data hierarchy

---

## 📊 Database Schema Changes

### Before Migration

```
vessels
  └─ vessel_id (uuid)
  └─ vessel_name (text)

compartments
  ├─ compartment_id (serial4)
  ├─ ship_id (int4) ❌ Old reference
  └─ compartment_name

main_sounding_trim_data
  ├─ main_id (serial4)
  ├─ compartment_id (int4)
  └─ [calibration columns]

heel_correction_data
  ├─ heel_id (serial4)
  ├─ compartment_id (int4)
  └─ [correction columns]
```

### After Migration

```
vessels
  └─ vessel_id (uuid) ⭐ Primary identifier
  └─ vessel_name (text)

compartments
  ├─ compartment_id (serial4)
  ├─ ship_id (int4) [legacy]
  ├─ vessel_id (uuid) ✨ NEW - Links to vessels
  └─ compartment_name

main_sounding_trim_data
  ├─ main_id (serial4)
  ├─ compartment_id (int4)
  ├─ vessel_id (uuid) ✨ NEW - Direct vessel link
  └─ [calibration columns]

heel_correction_data
  ├─ heel_id (serial4)
  ├─ compartment_id (int4)
  ├─ vessel_id (uuid) ✨ NEW - Direct vessel link
  └─ [correction columns]
```

---

## 🔗 Relationship Structure

```
Eva Istanbul (vessel_id)
    │
    ├─→ Compartments (15+)
    │   │
    │   ├─→ Main Sounding Data (~2400+ rows per compartment)
    │   │   └─→ Trim columns (trim_plus_4_0 to trim_minus_4_0)
    │   │
    │   └─→ Heel Correction Data (~1800+ rows per compartment)
    │       └─→ Heel columns (heel_plus_3_0 to heel_minus_3_0)
```

---

## 💡 Key Benefits

### 1. Multi-Vessel Support
Now you can add more vessels and keep data separate:
```sql
-- Add another vessel
INSERT INTO vessels (vessel_name, imo_number)
VALUES ('MV Pacific Explorer', 'IMO7654321');

-- Its compartments will have different vessel_id
```

### 2. Faster Queries
Indexes on `vessel_id` make queries much faster:
```sql
-- Get all Eva Istanbul compartments (FAST!)
SELECT * FROM compartments 
WHERE vessel_id = 'eva-vessel-id-here';
```

### 3. Data Package Generation
BunkerWatch can now generate vessel-specific packages:
```sql
-- Get complete data package for Eva Istanbul
SELECT c.*, m.*, h.*
FROM compartments c
LEFT JOIN main_sounding_trim_data m USING(compartment_id)
LEFT JOIN heel_correction_data h USING(compartment_id)
WHERE c.vessel_id = 'eva-vessel-id-here';
```

### 4. Clean Data Model
- Clear vessel ownership
- Proper foreign key relationships
- Referential integrity

---

## 🎯 What Happens in BunkerWatch App

After this migration:

### 1. Vessel Selection Screen
```
Select Vessel:
  ✓ Eva Istanbul
  
Download Data Package → Gets all compartments + calibration data
```

### 2. Data Package Contains
- Eva Istanbul compartments (15+)
- Main sounding tables (~2400+ rows)
- Heel correction tables (~1800+ rows)
- Total: ~2-5 MB

### 3. Offline Calculations
```javascript
// User selects compartment
// App looks up calibration data filtered by vessel_id
// Performs bilinear interpolation
// Returns results instantly
```

---

## 🔧 Troubleshooting

### Issue: Eva Istanbul Not Found

```sql
-- Check vessel name (case-sensitive view)
SELECT vessel_name FROM vessels;

-- If missing, insert manually:
INSERT INTO vessels (vessel_name, active)
VALUES ('Eva Istanbul', true);
```

### Issue: Some Records Not Updated

```sql
-- Find records without vessel_id
SELECT COUNT(*) FROM compartments WHERE vessel_id IS NULL;

-- Manually update if needed:
UPDATE compartments 
SET vessel_id = (SELECT vessel_id FROM vessels 
                 WHERE vessel_name = 'Eva Istanbul')
WHERE vessel_id IS NULL;
```

### Issue: Compartment_id Mismatch

```sql
-- Check compartment linkage
SELECT 
    c.compartment_id,
    c.compartment_name,
    COUNT(m.main_id) as main_rows,
    COUNT(h.heel_id) as heel_rows
FROM compartments c
LEFT JOIN main_sounding_trim_data m USING(compartment_id)
LEFT JOIN heel_correction_data h USING(compartment_id)
WHERE c.vessel_id = (SELECT vessel_id FROM vessels 
                      WHERE vessel_name = 'Eva Istanbul')
GROUP BY c.compartment_id, c.compartment_name;
```

---

## 📝 Migration Log Template

Document your migration:

```
Migration Executed: [Date/Time]
Executed By: [Your Name]
Database: [Database Name]
Server: [RDS Endpoint]

Results:
✓ Eva Istanbul vessel_id: [UUID]
✓ Compartments updated: [Count]
✓ Main sounding records: [Count]
✓ Heel correction records: [Count]

Verification:
✓ All verification queries passed
✓ No NULL vessel_id values found
✓ App tested successfully

Notes:
[Any special observations]
```

---

## 🔄 Rollback (If Needed)

If you need to rollback this migration:

```sql
BEGIN;

-- Remove vessel_id columns
ALTER TABLE heel_correction_data DROP COLUMN IF EXISTS vessel_id;
ALTER TABLE main_sounding_trim_data DROP COLUMN IF EXISTS vessel_id;
ALTER TABLE compartments DROP COLUMN IF EXISTS vessel_id;

-- Drop indexes
DROP INDEX IF EXISTS idx_heel_correction_vessel_id;
DROP INDEX IF EXISTS idx_heel_correction_compartment_vessel;
DROP INDEX IF EXISTS idx_main_sounding_vessel_id;
DROP INDEX IF EXISTS idx_main_sounding_compartment_vessel;
DROP INDEX IF EXISTS idx_compartments_vessel_id;

COMMIT;
```

**⚠️ Warning:** Only rollback if absolutely necessary. BunkerWatch app requires vessel_id.

---

## 📚 Related Files

- **Migration SQL:** `migrations/004_link_eva_istanbul_to_vessel_id.sql`
- **Main Migrations README:** `migrations/README_MIGRATIONS.md`
- **App Implementation:** `IMPLEMENTATION_SUMMARY.md`
- **Lambda API:** Update Lambda to filter by vessel_id

---

## ✅ Success Criteria

Migration is successful when:

- [x] `vessel_id` column added to all 3 tables
- [x] All Eva Istanbul records have vessel_id populated
- [x] No NULL vessel_id values remain
- [x] Indexes created successfully
- [x] Verification queries return expected results
- [x] BunkerWatch app can download vessel data
- [x] Offline calculations work correctly

---

## 🎉 Next Steps

After this migration is complete:

1. **Update Lambda API** to filter by vessel_id
2. **Test Data Download** in BunkerWatch app
3. **Verify Calculations** work offline
4. **Add More Vessels** as needed
5. **Run Other Migrations** (001, 002, 003) for sync features

---

**Your Eva Istanbul data is now ready for BunkerWatch! 🚢⚓**

