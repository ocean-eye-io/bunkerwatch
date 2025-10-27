# Are sounding_id and heel_correction_id Used?

## Answer: NO ❌

Neither `sounding_id` nor `heel_correction_id` are used in the Lambda or frontend.

## What IS Used

### Lambda Query (main_sounding_trim_data):
```sql
SELECT 
    ullage, sound, lcg, tcg, vcg, iy,
    trim_minus_4_0, trim_minus_3_0, trim_minus_2_0, 
    trim_minus_1_5, trim_minus_1_0, trim_minus_0_5,
    trim_0_0,
    trim_plus_0_5, trim_plus_1_0, trim_plus_1_5,
    trim_plus_2_0, trim_plus_3_0, trim_plus_4_0
FROM main_sounding_trim_data
WHERE compartment_id = $1 AND vessel_id = $2
```

### Lambda Query (heel_correction_data):
```sql
SELECT 
    ullage,
    heel_minus_3_0, heel_minus_2_0, heel_minus_1_5,
    heel_minus_1_0, heel_minus_0_5, heel_0_0,
    heel_plus_0_5, heel_plus_1_0, heel_plus_1_5,
    heel_plus_2_0, heel_plus_3_0
FROM heel_correction_data
WHERE compartment_id = $1 AND vessel_id = $2
```

### Frontend IndexedDB Keys:
```javascript
main_sounding_data: '[compartment_id+ullage], compartment_id, ullage'
heel_correction_data: '[compartment_id+ullage], compartment_id, ullage'
```

## Primary Keys Used

- **Backend:** `compartment_id` + `vessel_id` (for filtering)
- **Frontend:** `[compartment_id+ullage]` (composite key)

## What Columns Are Critical

### Must Have Values:
- `compartment_id` - Links to compartment
- `vessel_id` - Links to vessel  
- `ullage` - Primary lookup key
- `trim_0_0` - Base trim value
- `heel_0_0` - Base heel value

### Can Be NULL:
- `sound`, `lcg`, `tcg`, `vcg`, `iy`

## Conclusion

Your database tables might have `sounding_id` or `heel_correction_id` columns, but they are **NOT used** by the application.

**If you have these columns:** They're safe to ignore or remove.

**Focus on:** Making sure `compartment_id`, `vessel_id`, `ullage`, and trim/heel columns are populated correctly.

