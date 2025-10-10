# 📝 Setup Environment Files

## Quick Setup

Since `.env` files may not show in file explorer, here's how to create them manually:

---

## Step 1: Create `.env` File

In the project root (`bunkeringapp/`), create a file named `.env`:

```bash
# BunkerWatch Default Configuration
REACT_APP_VERSION=1.0.0
REACT_APP_DEBUG=false
```

**Windows:**
```powershell
@"
REACT_APP_VERSION=1.0.0
REACT_APP_DEBUG=false
"@ | Out-File -FilePath .env -Encoding utf8
```

---

## Step 2: Create `.env.production` File

Create a file named `.env.production`:

```bash
# BunkerWatch Production Configuration
# This file is committed to git and used for production PWA builds

# Lambda Function URL - Set this to your production Lambda endpoint
# Users can override this via Settings UI
REACT_APP_LAMBDA_URL=https://o4lrsr4fhkcpq3lktyqvk335n40fxmin.lambda-url.ap-south-1.on.aws

REACT_APP_ENV=production
REACT_APP_VERSION=1.0.0
REACT_APP_DEBUG=false
```

**Windows:**
```powershell
@"
REACT_APP_LAMBDA_URL=https://o4lrsr4fhkcpq3lktyqvk335n40fxmin.lambda-url.ap-south-1.on.aws
REACT_APP_ENV=production
REACT_APP_VERSION=1.0.0
REACT_APP_DEBUG=false
"@ | Out-File -FilePath .env.production -Encoding utf8
```

---

## Step 3: Create `.env.local` File (Optional - For Development)

Create a file named `.env.local`:

```bash
# BunkerWatch Development Configuration
# This file is NOT committed to git (in .gitignore)

# Your Lambda URL for local development
REACT_APP_LAMBDA_URL=https://o4lrsr4fhkcpq3lktyqvk335n40fxmin.lambda-url.ap-south-1.on.aws

# Enable debug logging
REACT_APP_DEBUG=true
```

**Windows:**
```powershell
@"
REACT_APP_LAMBDA_URL=https://o4lrsr4fhkcpq3lktyqvk335n40fxmin.lambda-url.ap-south-1.on.aws
REACT_APP_DEBUG=true
"@ | Out-File -FilePath .env.local -Encoding utf8
```

---

## Verify Files Were Created

**Windows:**
```powershell
dir .env*
```

**Expected Output:**
```
.env
.env.local
.env.production
```

---

## Test Configuration

### Restart Dev Server:

```bash
# Stop current server (Ctrl+C)

# Start again
npm start
```

### Check Console Output:

Open browser console (F12) and look for:
```
🔧 BunkerWatch Configuration: {
  environment: 'development',
  lambdaUrl: '✅ Configured',
  version: '1.0.0',
  debug: true,
  buildTime: 'development'
}
```

If you see `lambdaUrl: '✅ Configured'`, you're good to go!

---

## File Locations

```
bunkeringapp/
├── .env                 ← Base configuration (create this)
├── .env.local           ← Local dev only (create this)
├── .env.production      ← Production PWA (create this)
├── .gitignore           ← Updated to ignore .env.local
├── src/
│   ├── config.js        ← Configuration logic (already created)
│   └── components/
│       └── Settings.js  ← Settings UI (already created)
└── package.json
```

---

## What Each File Does

### `.env` (Committed)
- Base configuration for all environments
- No sensitive data
- Provides defaults like version number

### `.env.local` (NOT Committed)
- Your personal development settings
- Overrides `.env` during development
- Never shared or committed

### `.env.production` (Committed)
- Default configuration for production PWA
- Used when you run `npm run build`
- Users can override via Settings UI

---

## Important Notes

1. **React requires `REACT_APP_` prefix** for environment variables
2. **Must restart dev server** after changing .env files
3. **`.env.local` is gitignored** - safe for your personal config
4. **Users can override** any URL via Settings UI (⚙️ icon)

---

## Quick Commands

### Create All Files at Once (Windows PowerShell):

```powershell
# .env
@"
REACT_APP_VERSION=1.0.0
REACT_APP_DEBUG=false
"@ | Out-File -FilePath .env -Encoding utf8

# .env.production
@"
REACT_APP_LAMBDA_URL=https://o4lrsr4fhkcpq3lktyqvk335n40fxmin.lambda-url.ap-south-1.on.aws
REACT_APP_ENV=production
REACT_APP_VERSION=1.0.0
REACT_APP_DEBUG=false
"@ | Out-File -FilePath .env.production -Encoding utf8

# .env.local
@"
REACT_APP_LAMBDA_URL=https://o4lrsr4fhkcpq3lktyqvk335n40fxmin.lambda-url.ap-south-1.on.aws
REACT_APP_DEBUG=true
"@ | Out-File -FilePath .env.local -Encoding utf8

Write-Host "✓ Environment files created!"
```

### Verify Configuration (After Restart):

```bash
npm start
# Check console for: "🔧 BunkerWatch Configuration"
```

---

## Troubleshooting

### Files Not Working?

1. **Check file names** - must be exactly `.env`, `.env.local`, etc.
2. **No file extension** - should NOT be `.env.txt`
3. **Encoding** - use UTF-8 encoding
4. **Restart required** - stop and restart `npm start`

### Still Asking for URL?

The app has **three ways** to get Lambda URL:

1. **localStorage** (user saved in Settings) ← Highest priority
2. **Environment variables** (.env files)
3. **Manual entry** (connection screen) ← Fallback

If files exist but app still asks, check browser console (F12) for errors.

---

## Next Steps

After creating the files:

1. **Restart dev server:**
   ```bash
   npm start
   ```

2. **Open app:**
   ```
   http://localhost:3000
   ```

3. **Should auto-connect!** No more manual URL entry needed

4. **Click ⚙️** to open Settings and verify configuration

---

Need help? Check `ENVIRONMENT_SETUP_COMPLETE.md` for full documentation!

