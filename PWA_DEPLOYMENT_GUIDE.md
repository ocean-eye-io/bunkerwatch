# 📱 BunkerWatch PWA Deployment Guide

## Overview

BunkerWatch is configured as a **Progressive Web App (PWA)** with flexible Lambda URL configuration that works across development, production, and offline modes.

---

## 🔧 Environment Configuration Strategy

### Three-Layer Configuration System:

```
1. Environment Variables (.env files)     ← Build-time configuration
2. localStorage (browser)                  ← Runtime user preferences
3. Settings UI (in-app)                    ← User can change anytime
```

**Priority:** `localStorage` > `environment variables` > `not configured`

This means:
- ✅ Users can override the default Lambda URL via Settings
- ✅ Each device/browser can have its own Lambda URL
- ✅ Changes persist across app restarts
- ✅ No need to rebuild app to change Lambda URL

---

## 📁 Environment Files

### `.env` (Committed to Git)
Default configuration for all environments:
```bash
REACT_APP_VERSION=1.0.0
REACT_APP_DEBUG=false
```

### `.env.local` (NOT Committed - Development Only)
Your local development configuration:
```bash
REACT_APP_LAMBDA_URL=https://o4lrsr4fhkcpq3lktyqvk335n40fxmin.lambda-url.ap-south-1.on.aws
REACT_APP_DEBUG=true
```

### `.env.production` (Committed to Git)
Production PWA default configuration:
```bash
REACT_APP_LAMBDA_URL=https://o4lrsr4fhkcpq3lktyqvk335n40fxmin.lambda-url.ap-south-1.on.aws
REACT_APP_ENV=production
REACT_APP_VERSION=1.0.0
REACT_APP_DEBUG=false
```

### Which File is Used When?

| Command | Files Loaded | Use Case |
|---------|--------------|----------|
| `npm start` | `.env` + `.env.local` | Local development |
| `npm run build` | `.env` + `.env.production` | PWA production build |
| `npm test` | `.env` + `.env.test` | Testing |

---

## 🚀 Building the PWA

### Step 1: Configure Production Lambda URL

Edit `.env.production`:
```bash
REACT_APP_LAMBDA_URL=https://your-production-lambda-url.lambda-url.region.on.aws
```

### Step 2: Build the App

```bash
npm run build
```

This creates an optimized production build in the `build/` folder.

### Step 3: Test the Build Locally

```bash
# Install serve (if not already installed)
npm install -g serve

# Serve the production build
serve -s build
```

Open http://localhost:3000 and test:
- ✅ App loads with configured Lambda URL
- ✅ Offline mode works (turn off internet)
- ✅ Settings allows changing Lambda URL

---

## 📦 Deployment Options

### Option 1: AWS S3 + CloudFront (Recommended)

**Best for:** Global distribution, HTTPS, fast loading

```bash
# 1. Build the app
npm run build

# 2. Create S3 bucket
aws s3 mb s3://bunkerwatch-app

# 3. Upload build files
aws s3 sync build/ s3://bunkerwatch-app/ --delete

# 4. Configure bucket for static website hosting
aws s3 website s3://bunkerwatch-app/ \
    --index-document index.html \
    --error-document index.html

# 5. Create CloudFront distribution (optional but recommended)
# - Origin: S3 bucket
# - SSL certificate: Use ACM
# - Cache policy: CachingOptimized
```

**Cost:** ~$1-5/month for small usage

---

### Option 2: Netlify (Easiest)

**Best for:** Quick deployment, automatic HTTPS, CI/CD

1. **Connect Git Repository:**
   - Go to https://netlify.com
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub/GitLab repository

2. **Configure Build Settings:**
   ```
   Build command: npm run build
   Publish directory: build
   ```

3. **Add Environment Variables:**
   - Go to Site settings → Environment variables
   - Add: `REACT_APP_LAMBDA_URL`
   - Value: Your Lambda URL

4. **Deploy:**
   - Push to main branch → automatic deployment

**Cost:** Free for personal projects

---

### Option 3: Vercel

**Best for:** Zero-config deployment, automatic HTTPS

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd bunkeringapp
vercel --prod
```

Follow prompts to configure. Add environment variables in Vercel dashboard.

**Cost:** Free for personal projects

---

### Option 4: GitHub Pages

**Best for:** Free hosting, simple static sites

1. **Add homepage to package.json:**
```json
{
  "homepage": "https://yourusername.github.io/bunkerwatch"
}
```

2. **Install gh-pages:**
```bash
npm install --save-dev gh-pages
```

3. **Add deploy scripts to package.json:**
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  }
}
```

4. **Deploy:**
```bash
npm run deploy
```

**Cost:** Free

---

## 🔐 Security Considerations

### Lambda URL in Production

**Option A: Public Lambda URL (Simple)**
- Lambda URL is public but requires authentication
- Fine if your RDS is secure and Lambda has proper IAM
- ✅ Easier to implement
- ⚠️ Lambda URL is visible in Settings

**Option B: API Gateway + Auth (Secure)**
- Put Lambda behind API Gateway
- Use Cognito/Auth0 for user authentication
- Lambda URL remains private
- ✅ More secure
- ⚠️ More complex setup

**Recommendation:** Start with Option A, move to B if needed.

---

## 📱 PWA Features

### What Makes BunkerWatch a PWA:

1. **Service Worker** (via CRA)
   - Caches app shell for offline use
   - Updates automatically

2. **Manifest File** (`public/manifest.json`)
   - App name, icons, colors
   - Makes app installable

3. **HTTPS** (required for PWA)
   - Provided by deployment platform
   - Required for Service Worker

4. **IndexedDB** (Dexie.js)
   - Offline data storage
   - Vessel calibration packages
   - Pending sync data

---

## 🔄 Update Strategy

### How Users Get Updates:

1. **Automatic (Default):**
   - Service Worker checks for updates periodically
   - New version loads on next app start
   - No user action needed

2. **Manual:**
   - User can refresh page to force update
   - Settings shows app version

### Deploying Updates:

```bash
# 1. Update version in .env.production
REACT_APP_VERSION=1.1.0

# 2. Build new version
npm run build

# 3. Deploy to hosting platform
# (S3/Netlify/Vercel - same as initial deployment)

# 4. Users automatically get update on next visit
```

---

## ⚙️ User Settings UI

Users can change Lambda URL without rebuilding:

1. **Open Settings:**
   - Click ⚙️ icon in header

2. **Change Lambda URL:**
   - Enter new URL
   - Click "Save Configuration"

3. **Reset to Default:**
   - Click "Reset to Default"
   - Clears localStorage
   - Uses build-time configured URL

**This means:**
- ✅ Different vessels can use different Lambda URLs
- ✅ Testing new Lambda without rebuild
- ✅ Each device can have different configuration

---

## 🧪 Testing the PWA

### Test Checklist:

- [ ] **Install PWA:**
  - Open in Chrome/Edge
  - Click install icon in address bar
  - App should install as standalone app

- [ ] **Offline Mode:**
  - Open app
  - Turn off internet
  - App still loads and works
  - Calculations work offline

- [ ] **Settings:**
  - Open Settings (⚙️)
  - Change Lambda URL
  - Verify new URL is saved
  - Close and reopen - URL persists

- [ ] **Sync:**
  - Work offline (record soundings)
  - Turn internet back on
  - Click "Sync Now"
  - Verify data syncs to cloud

- [ ] **Updates:**
  - Deploy new version
  - Revisit app
  - Should update automatically

---

## 📊 Monitoring

### Track PWA Usage:

1. **Google Analytics:**
   - Add GA4 tracking code
   - Track install events
   - Monitor offline usage

2. **CloudWatch (Lambda):**
   - Monitor API calls
   - Track errors
   - Alert on failures

3. **Sentry (Optional):**
   - Frontend error tracking
   - Performance monitoring
   - User session replay

---

## 🔥 Common Issues

### Issue 1: Lambda URL Not Loading

**Symptom:** App starts but shows "Configure Lambda URL"

**Check:**
```bash
# Verify build has the URL
grep -r "REACT_APP_LAMBDA_URL" build/static/js/*.js
```

**Fix:**
1. Ensure `.env.production` has correct URL
2. Rebuild: `npm run build`
3. Redeploy

---

### Issue 2: Settings Not Saving

**Symptom:** Lambda URL resets after page refresh

**Cause:** localStorage not accessible (private browsing, security settings)

**Fix:**
- Check browser console for localStorage errors
- Try different browser
- Ensure HTTPS (localStorage requires secure context)

---

### Issue 3: Service Worker Not Updating

**Symptom:** Old version loads even after deployment

**Fix:**
```javascript
// In browser console:
navigator.serviceWorker.getRegistrations().then(registrations => {
  for(let registration of registrations) {
    registration.unregister();
  }
  location.reload();
});
```

---

### Issue 4: CORS Errors

**Symptom:** Can't reach Lambda from deployed PWA

**Fix:** Ensure Lambda has CORS headers:
```javascript
const headers = {
  'Access-Control-Allow-Origin': '*',  // Or specific domain
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};
```

---

## 📝 Quick Reference

### Environment Variables:

| Variable | Purpose | Required |
|----------|---------|----------|
| `REACT_APP_LAMBDA_URL` | Lambda endpoint | No (user can set) |
| `REACT_APP_VERSION` | App version | No |
| `REACT_APP_DEBUG` | Enable debug logs | No |
| `REACT_APP_ENV` | Environment name | No |

### Build Commands:

```bash
npm start          # Development server
npm run build      # Production build
npm test           # Run tests
serve -s build     # Test production build locally
```

### File Locations:

```
build/                    ← Production build output
public/manifest.json      ← PWA manifest
public/index.html         ← HTML template
src/config.js             ← Configuration logic
src/components/Settings.js ← Settings UI
.env                      ← Base configuration
.env.local                ← Local dev (gitignored)
.env.production           ← Production defaults
```

---

## 🎯 Production Checklist

Before deploying to production:

- [ ] Update `REACT_APP_VERSION` in `.env.production`
- [ ] Set correct `REACT_APP_LAMBDA_URL`
- [ ] Set `REACT_APP_DEBUG=false`
- [ ] Run `npm run build`
- [ ] Test build locally (`serve -s build`)
- [ ] Verify offline mode works
- [ ] Test on mobile device
- [ ] Deploy to hosting platform
- [ ] Test deployed URL
- [ ] Install PWA from deployed URL
- [ ] Verify HTTPS is working
- [ ] Check Service Worker is active
- [ ] Test Settings UI
- [ ] Monitor CloudWatch for errors

---

## 🚢 Next Steps

After successful deployment:

1. **Distribute to Users:**
   - Share deployed URL
   - Provide installation instructions
   - Offer training/documentation

2. **Monitor:**
   - Check Lambda CloudWatch logs
   - Monitor PWA install rate
   - Track offline usage

3. **Iterate:**
   - Collect user feedback
   - Add features
   - Improve performance
   - Regular updates

---

**Need Help?**

- Check browser console for errors
- Review Lambda CloudWatch logs
- Test with `curl` commands
- Verify environment variables in build output

**Resources:**

- [React PWA Documentation](https://create-react-app.dev/docs/making-a-progressive-web-app/)
- [Service Workers](https://developers.google.com/web/fundamentals/primers/service-workers)
- [Web App Manifest](https://web.dev/add-manifest/)

