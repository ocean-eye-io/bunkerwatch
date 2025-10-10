# RDS PostgreSQL Access Best Practices for Lambda

## What You're Already Doing Right ✅

Your current Lambda implementation is already following many best practices:

1. **Connection Pooling** - Using `pg.Pool` instead of creating new connections
2. **Parameterized Queries** - Using `$1, $2` placeholders to prevent SQL injection
3. **Environment Variables** - Database credentials stored securely
4. **Connection Timeouts** - Proper timeout configuration
5. **Error Handling** - Try-catch blocks and proper error responses

## Areas for Optimization

### 1. **Connection Pooling Optimization**

Your current pool configuration is good, but you can optimize further:

```javascript
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    
    // Connection limits
    max: 10,                        // Max connections in pool
    min: 2,                         // Keep 2 connections warm
    
    // Timeouts
    connectionTimeoutMillis: 10000, // 10s to acquire connection
    idleTimeoutMillis: 30000,       // Close idle connections after 30s
    
    // Health checks
    allowExitOnIdle: true,          // Allow Lambda to exit when idle
});
```

### 2. **Prepared Statements** (For Frequent Queries)

For queries executed frequently, use prepared statements:

```javascript
// Instead of:
const result = await pool.query('SELECT * FROM compartments WHERE vessel_id = $1', [vesselId]);

// Use named prepared statements:
const result = await pool.query({
    name: 'get-vessel-compartments',
    text: 'SELECT * FROM compartments WHERE vessel_id = $1',
    values: [vesselId]
});
```

**Benefits:**
- PostgreSQL caches the query plan
- Faster execution for repeated queries
- Reduced parsing overhead

### 3. **Transaction Management**

Your sync functions are correctly using transactions. Best practices:

```javascript
const syncData = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Multiple operations...
        
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release(); // ALWAYS release the client
    }
};
```

### 4. **Indexing Strategy**

Ensure these indexes exist on your RDS tables:

```sql
-- Vessel lookups
CREATE INDEX IF NOT EXISTS idx_vessels_name ON vessels(vessel_name);
CREATE INDEX IF NOT EXISTS idx_vessels_active ON vessels(active) WHERE active = true;

-- Compartment lookups
CREATE INDEX IF NOT EXISTS idx_compartments_vessel ON compartments(vessel_id);
CREATE INDEX IF NOT EXISTS idx_compartments_vessel_name ON compartments(vessel_id, compartment_name);

-- Calibration data lookups (most important!)
CREATE INDEX IF NOT EXISTS idx_main_sounding_lookup 
    ON main_sounding_trim_data(compartment_id, vessel_id, ullage);
    
CREATE INDEX IF NOT EXISTS idx_heel_correction_lookup 
    ON heel_correction_data(compartment_id, vessel_id, ullage);

-- Sync operations
CREATE INDEX IF NOT EXISTS idx_sounding_logs_client_id ON sounding_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_bunkering_ops_client_id ON bunkering_operations(client_id);
```

### 5. **Query Optimization**

#### a) Use SELECT specific columns instead of *
```javascript
// Good ✅
SELECT vessel_id, vessel_name, imo_number FROM vessels

// Avoid ❌
SELECT * FROM vessels
```

#### b) LIMIT queries when appropriate
```javascript
// When you only need existence check:
SELECT 1 FROM sounding_logs WHERE client_id = $1 LIMIT 1

// Instead of:
SELECT * FROM sounding_logs WHERE client_id = $1
```

#### c) Use EXPLAIN ANALYZE for slow queries
```sql
EXPLAIN ANALYZE 
SELECT * FROM main_sounding_trim_data 
WHERE compartment_id = 1 AND ullage BETWEEN 1.0 AND 2.0;
```

### 6. **Batch Operations**

For bulk inserts, use batch queries:

```javascript
// Instead of N queries:
for (const item of items) {
    await pool.query('INSERT INTO table VALUES ($1)', [item]);
}

// Use single batch query:
const values = items.map((item, i) => `($${i + 1})`).join(',');
const flatValues = items.flat();
await pool.query(`INSERT INTO table VALUES ${values}`, flatValues);

// Or use pg-format library:
const format = require('pg-format');
const insertQuery = format(
    'INSERT INTO table (col1, col2) VALUES %L',
    items.map(item => [item.col1, item.col2])
);
await pool.query(insertQuery);
```

### 7. **Lambda-Specific Optimizations**

#### a) Reuse connections across invocations
```javascript
// Pool is created outside handler - reused across warm Lambda invocations
const pool = new Pool({ ... });

exports.handler = async (event) => {
    // Handler code uses the same pool
};
```

#### b) Keep Lambda warm
```javascript
// Set reserved concurrency: 1-2 instances always warm
// Or use EventBridge scheduled rule to ping Lambda every 5 minutes
```

#### c) Monitor connection usage
```javascript
console.log('Pool stats:', {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
});
```

### 8. **RDS Proxy (Recommended for Production)**

For production, use **AWS RDS Proxy**:

**Benefits:**
- Connection pooling at infrastructure level
- Automatic failover handling
- IAM authentication support
- Better handling of Lambda spikes

**Setup:**
```javascript
const pool = new Pool({
    host: 'your-rds-proxy-endpoint.proxy-xxx.region.rds.amazonaws.com',
    // ... other config
});
```

### 9. **Monitoring & Alerting**

#### a) CloudWatch Metrics
Monitor these RDS metrics:
- `DatabaseConnections` - active connections
- `ReadLatency` / `WriteLatency` - query performance
- `CPUUtilization` - database load
- `FreeableMemory` - available memory

#### b) Lambda logging
```javascript
const logQueryPerformance = async (queryName, queryFn) => {
    const start = Date.now();
    try {
        const result = await queryFn();
        console.log(`Query ${queryName}: ${Date.now() - start}ms`);
        return result;
    } catch (error) {
        console.error(`Query ${queryName} failed:`, error);
        throw error;
    }
};

// Usage:
const vessels = await logQueryPerformance('get-vessels', () => 
    pool.query('SELECT * FROM vessels')
);
```

### 10. **Security Best Practices**

#### a) Use IAM Database Authentication (Best)
```javascript
const { Signer } = require('@aws-sdk/rds-signer');

const signer = new Signer({
    region: 'us-east-1',
    hostname: process.env.DB_HOST,
    port: 5432,
    username: process.env.DB_USER
});

const token = await signer.getAuthToken();

const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: token,  // Use generated token
    ssl: true
});
```

#### b) Rotate credentials using AWS Secrets Manager
```javascript
const { SecretsManager } = require('@aws-sdk/client-secrets-manager');

const getDbCredentials = async () => {
    const client = new SecretsManager();
    const response = await client.getSecretValue({
        SecretId: 'prod/bunkerwatch/db'
    });
    return JSON.parse(response.SecretString);
};

// Use in Lambda:
const credentials = await getDbCredentials();
const pool = new Pool({
    host: credentials.host,
    user: credentials.username,
    password: credentials.password,
    // ...
});
```

## Quick Wins for Your Current Setup

### 1. Add these indexes immediately:
```sql
CREATE INDEX idx_main_sounding_lookup 
    ON main_sounding_trim_data(compartment_id, vessel_id, ullage);
    
CREATE INDEX idx_heel_correction_lookup 
    ON heel_correction_data(compartment_id, vessel_id, ullage);
```

### 2. Add query performance logging:
```javascript
pool.on('connect', () => {
    console.log('New DB connection established');
});

pool.on('error', (err) => {
    console.error('Unexpected pool error:', err);
});
```

### 3. Optimize your most frequent query:
Your data package generation is heavy. Consider:
- Caching vessel packages in S3
- Only regenerate when calibration data changes
- Use Lambda layers for pg library (faster cold starts)

## Performance Targets

- **Connection acquisition**: < 10ms (warm pool)
- **Simple SELECT**: < 50ms
- **Complex interpolation query**: < 200ms
- **Data package generation**: < 2s
- **Batch sync (100 records)**: < 1s

## When to Move Beyond This

Consider more advanced solutions if:
- You have > 1000 requests/minute
- You need < 100ms response times
- You have > 50 concurrent vessels
- Database becomes a bottleneck

**Advanced options:**
1. **Read replicas** - Separate read/write traffic
2. **ElastiCache** - Cache vessel data packages
3. **Aurora Serverless v2** - Auto-scaling database
4. **DynamoDB** - For high-velocity operational data

---

## Summary

Your current approach is solid. Key improvements:
1. ✅ Keep using parameterized queries
2. ✅ Keep using connection pooling
3. ➕ Add specific indexes for your query patterns
4. ➕ Consider RDS Proxy for production
5. ➕ Monitor query performance
6. ➕ Cache vessel data packages when possible

Your Lambda's interpolation logic is the computational heavy part, not the database access. The DB queries are simple lookups that will be fast with proper indexes.

