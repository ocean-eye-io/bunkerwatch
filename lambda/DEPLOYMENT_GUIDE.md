# BunkerWatch Lambda Deployment Guide

## Overview

This guide will help you update your AWS Lambda function to support the new BunkerWatch multi-vessel architecture with offline-first capabilities.

## What's Changed

### New Endpoints Added:
- `GET /vessels` - List all active vessels
- `GET /vessel/{id}/data-package` - Download complete vessel calibration data
- `GET /vessel/{id}/info` - Get vessel details
- `GET /vessel/{id}/compartments` - Get vessel-specific compartments
- `POST /vessel/{id}/sync-soundings` - Sync offline sounding logs
- `POST /vessel/{id}/sync-bunkering` - Sync offline bunkering operations

### Legacy Endpoints (Kept for backward compatibility):
- `GET /compartments` - Still works
- `POST /sounding` - Still works

## Prerequisites

✅ You've completed the database migration (`004_link_eva_istanbul_to_vessel_id.sql`)  
✅ Your `vessels` table contains at least one active vessel  
✅ All compartments, main_sounding_trim_data, and heel_correction_data have `vessel_id` populated  

## Deployment Steps

### Option 1: Direct Code Update (Manual)

1. **Backup current Lambda code:**
   ```bash
   # Download current Lambda code from AWS Console
   # Keep a backup just in case
   ```

2. **Copy the new handler:**
   - Use the code from `lambda/bunkerwatch-enhanced-handler.js`
   - Replace your existing `index.js` or handler file

3. **Verify Lambda configuration:**
   - Runtime: Node.js 18.x or later
   - Timeout: 30 seconds (data package generation can take time)
   - Memory: 512 MB (recommended for large data packages)

4. **Environment variables** (should already exist):
   ```
   DB_HOST=your-rds-endpoint.rds.amazonaws.com
   DB_PORT=5432
   DB_NAME=bunkerwatch
   DB_USER=your-db-user
   DB_PASSWORD=your-db-password
   DB_SSL=true
   ```

5. **Deploy:**
   - AWS Console: Copy-paste code into inline editor → Deploy
   - AWS CLI: 
     ```bash
     zip function.zip index.js
     aws lambda update-function-code \
       --function-name your-lambda-name \
       --zip-file fileb://function.zip
     ```

### Option 2: Infrastructure as Code (Recommended)

If using SAM/CloudFormation/Terraform, update your template:

```yaml
# SAM template.yaml example
Resources:
  BunkerWatchFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: lambda/
      Handler: index.handler
      Runtime: nodejs18.x
      Timeout: 30
      MemorySize: 512
      Environment:
        Variables:
          DB_HOST: !Ref DatabaseHost
          DB_PORT: 5432
          # ... other vars
```

## Testing the New Endpoints

### 1. Test Vessel List
```bash
curl https://your-lambda-url.lambda-url.us-east-1.on.aws/vessels
```

Expected response:
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

### 2. Test Data Package
```bash
curl https://your-lambda-url.lambda-url.us-east-1.on.aws/vessel/1/data-package
```

Expected response: Large JSON with vessel info, compartments, and calibration data.

### 3. Test Frontend Connection
1. Open BunkerWatch app
2. Enter your Lambda URL
3. Click "Connect"
4. You should see vessel(s) in the dropdown
5. Select "Eva Istanbul" and download data
6. Verify download completes successfully

## Troubleshooting

### Issue: "Vessel not found" error

**Cause:** Vessel table is empty or vessel is not active

**Fix:**
```sql
-- Check vessels table
SELECT * FROM vessels WHERE active = true;

-- If empty, insert Eva Istanbul
INSERT INTO vessels (vessel_name, imo_number, vessel_type, flag_state, active)
VALUES ('Eva Istanbul', 'IMO9876543', 'Container Ship', 'Malta', true);
```

### Issue: "No compartments found for this vessel"

**Cause:** Compartments don't have vessel_id set

**Fix:**
```sql
-- Check compartments
SELECT compartment_id, compartment_name, vessel_id FROM compartments LIMIT 5;

-- If vessel_id is NULL, run migration again
-- See: migrations/004_link_eva_istanbul_to_vessel_id.sql
```

### Issue: Data package is too large (> 6MB)

**Cause:** Too many calibration rows or very detailed data

**Solutions:**
1. Increase Lambda timeout to 60 seconds
2. Consider data compression (gzip)
3. Paginate calibration data

### Issue: "Database connection failed"

**Cause:** RDS security group, VPC, or credentials

**Fix:**
1. Ensure Lambda is in same VPC as RDS
2. Check RDS security group allows Lambda's security group
3. Verify environment variables are correct
4. Check RDS is running and accessible

### Issue: Lambda timeout during data package generation

**Cause:** Large vessel with many tanks

**Fix:**
```bash
# Increase Lambda timeout
aws lambda update-function-configuration \
  --function-name your-lambda-name \
  --timeout 60
```

## Performance Optimization

### 1. Add Recommended Indexes
```sql
-- These will significantly speed up data package generation
CREATE INDEX idx_main_sounding_lookup 
    ON main_sounding_trim_data(compartment_id, vessel_id, ullage);
    
CREATE INDEX idx_heel_correction_lookup 
    ON heel_correction_data(compartment_id, vessel_id, ullage);
```

### 2. Monitor Query Performance
Check CloudWatch logs for timing information:
```
Generated data package for Eva Istanbul: 1234KB
Query get-vessels: 25ms
```

### 3. Consider Caching (Future Enhancement)
For production with many vessels:
- Cache data packages in S3
- Use CloudFront for CDN distribution
- Only regenerate when calibration data changes

## Rollback Plan

If you need to rollback:

1. **Restore previous Lambda code** from backup
2. **Endpoints still work:**
   - `/compartments` - returns all compartments (no vessel filter)
   - `/sounding` - works with any compartment_id
3. **Frontend will show error** - just reconnect with old URL

## Next Steps

After successful deployment:

1. ✅ Test each new endpoint
2. ✅ Verify frontend vessel dropdown populates
3. ✅ Download vessel data package successfully
4. ✅ Test offline sounding calculations
5. ✅ Test sync functionality when back online

## Security Checklist

- [ ] Database credentials stored in environment variables (not hardcoded)
- [ ] RDS security group properly configured
- [ ] Lambda has minimum required IAM permissions
- [ ] CORS headers configured for your frontend domain
- [ ] Consider enabling Lambda function URL auth for production

## Production Recommendations

For production deployment:

1. **Use RDS Proxy** - Better connection management
2. **Enable Lambda reserved concurrency** - Keep instances warm
3. **Set up CloudWatch alarms** - Monitor errors and latency
4. **Enable X-Ray tracing** - Debug performance issues
5. **Use AWS Secrets Manager** - Rotate database credentials
6. **Enable VPC endpoints** - Reduce NAT gateway costs

## Cost Estimation

Approximate AWS costs for medium usage:

- Lambda: ~$5-10/month (10K requests, 512MB, 5s avg)
- RDS: ~$30-50/month (db.t3.micro with 20GB storage)
- Data transfer: ~$1-5/month
- **Total: ~$40-70/month**

For production with high traffic, consider:
- Aurora Serverless v2 (auto-scaling)
- ElastiCache for caching
- CloudFront for static assets

---

## Support

If you encounter issues:
1. Check CloudWatch logs for Lambda errors
2. Check RDS slow query log
3. Verify all migrations ran successfully
4. Test database connectivity from Lambda

## References

- AWS Lambda Documentation: https://docs.aws.amazon.com/lambda/
- RDS Best Practices: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/
- node-postgres (pg): https://node-postgres.com/

