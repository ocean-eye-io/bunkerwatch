# Fix Lambda 413 Payload Too Large Error

## Problem Found ✅

CloudWatch logs show:
```
[ERROR] LAMBDA_RUNTIME Failed to post handler success response. 
Http response code: 413. 
{"errorMessage":"Exceeded maximum allowed payload size (6291556 bytes)."}
```

**Vessel:** `30853544-9726-4b3e-be1d-c638c2c03812` (Diamond Eternity)
- **Package size:** 15,064 KB (~15 MB)
- **Lambda limit:** ~6 MB
- **Result:** 502 Bad Gateway

**Vessel:** `f0134e61-5c38-4168-91e4-efe4ec942592` (Eva Istanbul)
- **Package size:** 4,276 KB (~4 MB)
- **Lambda limit:** ~6 MB
- **Result:** ✅ Success

## Solution Implemented

Added **gzip compression** to Lambda response:

### Changes Made:

1. **lambda/bunkerwatch-enhanced-handler.js**
   - Added `zlib` import for gzip compression
   - Modified data-package endpoint to compress responses > 5MB
   - Returns compressed data as base64-encoded

2. **src/db/dataPackageService.js**
   - Added logging for Content-Encoding header
   - Fetch API automatically handles decompression

### How It Works:

```javascript
// Lambda checks response size
if (jsonSize > 5 * 1024 * 1024) {
    // Compress with gzip
    const compressed = await gzip(jsonString);
    
    // Return compressed data
    return {
        headers: { 'Content-Encoding': 'gzip' },
        body: compressed.toString('base64'),
        isBase64Encoded: true
    };
}
```

### Expected Results:

- **15 MB package** → **~3-5 MB compressed** ✅ Under Lambda limit
- **4 MB package** → **Uncompressed** (no need to compress)
- Frontend automatically decompresses ✅

## Next Steps

1. **Deploy updated Lambda code** to AWS
2. **Test vessel download** again
3. **Check CloudWatch logs** for compression ratio
4. **Verify** both vessels download successfully

## Deploy Instructions

Copy the updated `lambda/bunkerwatch-enhanced-handler.js` to AWS Lambda Console:
1. Open Lambda function in AWS Console
2. Upload the updated file
3. Save and deploy

The compression should reduce the 15MB package to ~3-5MB, well under the 6MB Lambda limit!

