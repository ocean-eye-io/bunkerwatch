# 🔧 BunkerWatch Troubleshooting Guide

## ⚠️ Current Issue: ajv/dist/compile/codegen Module Not Found

This is a known dependency conflict with `react-scripts` 5.0.x and ajv versions.

---

## 🎯 Quick Fix Options

### Option 1: Manual Dependency Fix (Recommended)

Run these commands **one at a time** in your terminal:

```powershell
# Step 1: Clean everything
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue

# Step 2: Clear npm cache
npm cache clean --force

# Step 3: Install with legacy peer deps
npm install --legacy-peer-deps

# Step 4: Install ajv explicitly
npm install ajv@8.12.0 --save-dev --legacy-peer-deps

# Step 5: Start the app
npm start
```

### Option 2: Use Yarn Instead

If npm continues to have issues, try Yarn:

```powershell
# Install Yarn globally (if not installed)
npm install -g yarn

# Install dependencies
yarn install

# Start the app
yarn start
```

### Option 3: Downgrade react-scripts

Edit `package.json` and change:
```json
"react-scripts": "^5.0.0"
```
to:
```json
"react-scripts": "4.0.3"
```

Then run:
```powershell
npm install --legacy-peer-deps
npm start
```

---

## 🔍 Verify Installation

After trying a fix, verify it worked:

```powershell
# Check if node_modules exists
Test-Path node_modules

# Check if ajv is installed
Test-Path node_modules/ajv

# Check installed packages
npm list ajv
```

---

## 🚀 Alternative: Start Fresh with Working Config

If all else fails, here's a guaranteed working setup:

### Step 1: Update package.json

Replace the entire `package.json` with this working version:

```json
{
  "name": "bunkerwatch",
  "version": "1.0.0",
  "description": "BunkerWatch - Maritime Tank Sounding & Bunkering Management System",
  "keywords": ["maritime", "bunkering", "tank-sounding", "fuel-management"],
  "main": "src/index.js",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "dexie": "^3.2.4",
    "dexie-react-hooks": "^1.1.6",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "ajv": "^8.12.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test --env=jsdom",
    "eject": "react-scripts eject"
  },
  "browserslist": [">0.2%", "not dead", "not ie <= 11", "not op_mini all"],
  "resolutions": {
    "ajv": "^8.12.0"
  }
}
```

### Step 2: Clean Install

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm install --legacy-peer-deps
npm start
```

---

## 💡 Common Issues & Solutions

### Issue: Port 3000 Already in Use

**Solution:**
```powershell
# Find and kill process on port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

Or just type `y` when prompted to use another port.

### Issue: EACCES Permission Errors

**Solution:**
```powershell
# Run as Administrator, or clear npm cache
npm cache clean --force
```

### Issue: Module Not Found Errors

**Solution:**
```powershell
# Reinstall specific package
npm install <package-name> --legacy-peer-deps
```

### Issue: Git Merge Conflicts in package-lock.json

**Solution:**
```powershell
# Just delete it and regenerate
Remove-Item package-lock.json
npm install --legacy-peer-deps
```

---

## 🧪 Test Without Starting Dev Server

If you want to verify the app will work before starting:

```powershell
# Check for syntax errors
npm run build
```

If build succeeds, the app is ready!

---

## 🔄 Complete Reset (Nuclear Option)

If nothing else works:

```powershell
# 1. Stop all Node processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Remove everything
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force build -ErrorAction SilentlyContinue

# 3. Clear all caches
npm cache clean --force
npx clear-npx-cache

# 4. Fresh install
npm install --legacy-peer-deps

# 5. Start
npm start
```

---

## 📱 Test in Browser (Without npm start)

If you can't get the dev server running, you can still build and test:

```powershell
# Build production version
npm run build

# Serve the build folder
npx serve -s build
```

Then open `http://localhost:3000` (or whatever port it says).

---

## 🆘 Still Not Working?

### Check Your Environment

```powershell
# Node version (should be 16+)
node --version

# NPM version (should be 8+)
npm --version

# PowerShell version
$PSVersionTable.PSVersion
```

### Required Versions
- **Node.js:** 16.x or higher
- **NPM:** 8.x or higher
- **PowerShell:** 5.1 or higher

### Update Node if Needed

Download latest LTS from: https://nodejs.org/

---

## 🎯 Expected Successful Output

When `npm start` works correctly, you should see:

```
Compiled successfully!

You can now view bunkerwatch in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000

Note that the development build is not optimized.
To create a production build, use npm run build.

webpack compiled successfully
```

---

## 🔍 Debug Mode

Enable verbose logging:

```powershell
$env:DEBUG="*"
npm start --verbose
```

---

## 📞 Manual Verification Checklist

Before starting the server, verify:

- [ ] `node_modules` folder exists
- [ ] `node_modules/react` folder exists
- [ ] `node_modules/dexie` folder exists
- [ ] `node_modules/uuid` folder exists
- [ ] `node_modules/ajv` folder exists
- [ ] `src/App.js` file exists
- [ ] `src/db/database.js` file exists
- [ ] `src/utils/interpolation.js` file exists
- [ ] `src/components/VesselSelection.js` file exists
- [ ] `public/index.html` file exists
- [ ] `public/manifest.json` file exists

---

## ✅ Success Criteria

You'll know it's working when:

1. ✅ Browser opens automatically
2. ✅ You see the BunkerWatch logo (⚓)
3. ✅ Connection screen displays
4. ✅ No red errors in browser console (F12)
5. ✅ No errors in terminal

---

## 🎉 Once It Works

After successful start:

1. **Test the UI** - Everything should look beautiful!
2. **Check browser console** - Should see BunkerWatch logs
3. **Try entering a URL** - Test the connection flow
4. **Enjoy your app!** ⚓

---

**Need more help? Check the browser console (F12) for detailed error messages.**

