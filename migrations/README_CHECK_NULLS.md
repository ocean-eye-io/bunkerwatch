# Check for NULL Columns in Calibration Data

## Problem
Lambda crashes when trying to download vessel data because some columns might have NULL values that the frontend expects.

## Columns Lambda Returns

### Main Sounding Data:
- `ullage` (required)
- `sound` (can be NULL)
- `lcg`, `tcg`, `vcg`, `iy` (can be NULL)
- `trim_minus_4_0`, `trim_minus_3_0`, `trim_minus_2_0`
- `trim_minus_1_5`, `trim_minus_1_0`, `trim_minus_0_5`
- `trim_0_0` (required)
- `trim_plus_0_5`, `trim_plus_1_0`, `trim_plus_1_5`
- `trim_plus_2_0`, `trim_plus_3_0`, `trim_plus_4_0`

### Heel Correction Data:
- `ullage` (required)
- `heel_minus_3_0`, `heel_minus_2_0`, `heel_minus_1_5`
- `heel_minus_1_0`, `heel_minus_0_5`
- `heel_0_0` (required)
- `heel_plus_0_5`, `heel_plus_1_0`, `heel_plus_1_5`
- `heel_plus_2_0`, `heel_plus_3_0`

### Compartments:
- `compartment_id` (required)
- `compartment_name` (required)
- `total_net_volume_m3` (can be NULL)

## Diagnostic Query

Run `migrations/010_check_null_columns.sql` to check for NULLs:

```sql
-- This will show which columns have NULL values
```

## Common Issues

### Issue 1: Missing trim or heel columns
If you see NULLs in trim or heel columns, those columns might not exist in your database.

**Solution:** Check if columns exist:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'main_sounding_trim_data' 
  AND column_name LIKE 'trim%';
```

### Issue 2: Missing vessel_id
If vessel_id is NULL, the Lambda query won't find any rows.

**Solution:** Run migration 008 to populate vessel_id.

### Issue 3: Missing ullage
If ullage is NULL, the frontend can't sort or use the data.

**Solution:** This is critical - ullage must always have a value.

## How to Fix

1. **Run diagnostic query:** `migrations/010_check_null_columns.sql`
2. **Identify which columns have NULLs**
3. **Check if columns exist in database**
4. **Run appropriate migration**

## Expected Results

After fixes, you should see:
- 0 NULLs in `ullage` columns
- 0 NULLs in `trim_0_0` column
- 0 NULLs in `heel_0_0` column
- 0 NULLs in `compartment_id` and `compartment_name`
- Some NULLs are OK in: `sound`, `lcg`, `tcg`, `vcg`, `iy`

The Lambda will handle NULLs in optional columns, but REQUIRED columns must have values.

