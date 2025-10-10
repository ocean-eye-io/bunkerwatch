# 🗄️ BunkerWatch Database Migrations

These SQL scripts set up the PostgreSQL database tables for BunkerWatch's vessel management and offline sync features.

---

## 📋 Migration Files

### 1. `001_create_vessel_tables.sql`
**Purpose:** Creates core vessel management and sync tables

**Creates:**
- `vessels` - Master vessel list
- `vessel_data_packages` - Track data package versions
- `sounding_logs` - Store synced sounding operations
- `bunkering_operations` - Store bunkering operations
- `bunkering_readings` - Individual bunkering readings
- `sync_history` - Track sync events

**Sample Data:** Includes 2 sample vessels (modify as needed)

### 2. `002_update_existing_tables.sql`
**Purpose:** Adds `vessel_id` to existing tables

**Modifies:**
- `compartments` - Adds vessel_id column
- `main_sounding_trim_data` - Adds vessel_id column
- `heel_correction_data` - Adds vessel_id column

**Note:** Assigns existing data to first vessel

### 3. `003_create_views.sql`
**Purpose:** Creates useful database views for querying

**Creates:**
- `v_latest_vessel_packages` - Latest package per vessel
- `v_vessel_sync_pending` - Pending sync counts
- `v_vessel_dashboard` - Complete vessel summary
- `v_recent_soundings` - Recent sounding logs
- `v_bunkering_summary` - Bunkering operations summary

---

## 🚀 How to Run Migrations

### Option 1: Using psql Command Line

```bash
# Connect to your database
psql -h your-rds-endpoint.region.rds.amazonaws.com \
     -U your-username \
     -d your-database \
     -f migrations/001_create_vessel_tables.sql

# Then run the other migrations
psql -h your-rds-endpoint.region.rds.amazonaws.com \
     -U your-username \
     -d your-database \
     -f migrations/002_update_existing_tables.sql

psql -h your-rds-endpoint.region.rds.amazonaws.com \
     -U your-username \
     -d your-database \
     -f migrations/003_create_views.sql
```

### Option 2: Using pgAdmin / DBeaver

1. Connect to your database
2. Open SQL Query Editor
3. Copy content from `001_create_vessel_tables.sql`
4. Execute
5. Repeat for other migration files

### Option 3: All at Once

```bash
cat migrations/001_create_vessel_tables.sql \
    migrations/002_update_existing_tables.sql \
    migrations/003_create_views.sql | \
psql -h your-rds-endpoint \
     -U your-username \
     -d your-database
```

---

## ✅ Verification Steps

After running migrations, verify everything worked:

```sql
-- 1. Check all new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'vessels', 
    'vessel_data_packages', 
    'sounding_logs', 
    'bunkering_operations', 
    'bunkering_readings', 
    'sync_history'
  );
-- Should return 6 rows

-- 2. Check sample vessels were created
SELECT * FROM vessels;
-- Should show 2 vessels (or however many you added)

-- 3. Check views were created
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name LIKE 'v_%';
-- Should return 5 views

-- 4. Check vessel_id was added to existing tables
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'compartments' 
  AND column_name = 'vessel_id';
-- Should return 1 row

-- 5. Check dashboard view works
SELECT * FROM v_vessel_dashboard;
-- Should show vessel summary
```

---

## 🔄 Rollback (If Needed)

If something goes wrong, you can rollback:

```sql
BEGIN;

-- Drop views
DROP VIEW IF EXISTS v_bunkering_summary CASCADE;
DROP VIEW IF EXISTS v_recent_soundings CASCADE;
DROP VIEW IF EXISTS v_vessel_dashboard CASCADE;
DROP VIEW IF EXISTS v_vessel_sync_pending CASCADE;
DROP VIEW IF EXISTS v_latest_vessel_packages CASCADE;

-- Drop tables (in reverse order due to foreign keys)
DROP TABLE IF EXISTS sync_history CASCADE;
DROP TABLE IF EXISTS bunkering_readings CASCADE;
DROP TABLE IF EXISTS bunkering_operations CASCADE;
DROP TABLE IF EXISTS sounding_logs CASCADE;
DROP TABLE IF EXISTS vessel_data_packages CASCADE;
DROP TABLE IF EXISTS vessels CASCADE;

-- Remove vessel_id from existing tables (optional)
-- ALTER TABLE compartments DROP COLUMN IF EXISTS vessel_id;
-- ALTER TABLE main_sounding_trim_data DROP COLUMN IF EXISTS vessel_id;
-- ALTER TABLE heel_correction_data DROP COLUMN IF EXISTS vessel_id;

COMMIT;
```

---

## 📝 Customization

### Adjust Existing Table Names

If your tables are named differently, edit `002_update_existing_tables.sql`:

```sql
-- Replace 'compartments' with your actual table name
ALTER TABLE your_compartments_table 
ADD COLUMN vessel_id INT REFERENCES vessels(vessel_id);
```

### Add More Sample Vessels

Edit `001_create_vessel_tables.sql`:

```sql
INSERT INTO vessels (vessel_name, imo_number, vessel_type, flag_state) 
VALUES
    ('Your Vessel Name', 'IMO9999999', 'Tanker', 'Singapore'),
    ('Another Vessel', 'IMO8888888', 'Bulk Carrier', 'Marshall Islands');
```

### Modify Column Sizes

If you need larger fields, adjust the VARCHAR sizes:

```sql
-- Example: Make vessel_name longer
ALTER TABLE vessels 
ALTER COLUMN vessel_name TYPE VARCHAR(500);
```

---

## 🎯 What These Tables Enable

### Vessel Selection
- Store multiple vessels
- Each vessel has its own compartments
- Download vessel-specific data packages

### Offline Sync
- Store soundings logged offline
- Store bunkering operations offline
- Sync to cloud when connection available
- Track sync history

### Data Packages
- Version control for calibration data
- Track package generation
- Enable update checks

### Reporting
- Views for easy querying
- Dashboard summaries
- Audit trail

---

## 🔐 Security Notes

### Sensitive Data
These tables may contain:
- Vessel operational data
- Fuel quantities
- Time-stamped operations

### Recommendations
- Use SSL/TLS for database connections
- Implement row-level security if needed
- Regular backups
- Monitor access logs

---

## 📊 Expected Data Volumes

### Per Vessel
- **Compartments:** 10-50 rows
- **Calibration data:** 1,000-10,000 rows per compartment
- **Soundings:** ~365 per year (daily)
- **Bunkering ops:** ~50 per year
- **Readings:** ~500 per year

### Total Database Size
- Initial: ~10-50 MB per vessel
- Growth: ~5-10 MB per year per vessel
- 10 vessels: ~100-500 MB initially

---

## 🆘 Troubleshooting

### Error: Relation Already Exists
```sql
-- Check what exists:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Drop specific table if needed:
DROP TABLE IF EXISTS vessels CASCADE;
```

### Error: Foreign Key Violation
```sql
-- Check which vessel IDs exist:
SELECT vessel_id FROM vessels;

-- Assign orphaned records:
UPDATE compartments SET vessel_id = 1 
WHERE vessel_id IS NULL;
```

### Error: Permission Denied
```sql
-- Grant permissions (run as admin):
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_username;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_username;
```

---

## ✅ Post-Migration Checklist

After running migrations:

- [ ] All 6 tables created
- [ ] All 5 views created
- [ ] Sample vessels exist
- [ ] Existing data linked to vessels
- [ ] Indexes created
- [ ] No errors in logs
- [ ] Test queries work
- [ ] Backup created

---

**Your database is now ready for BunkerWatch!** 🚀

