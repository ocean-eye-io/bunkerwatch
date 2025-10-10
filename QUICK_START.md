# 🚀 BunkerWatch Quick Start Guide

Welcome to **BunkerWatch** - Your offshore-first maritime fuel management system!

---

## 📋 Prerequisites

- Node.js 16+ installed
- AWS Lambda Function URL
- Modern web browser (Chrome, Firefox, Edge, Safari)

---

## ⚡ Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm start
```

The app will open at `http://localhost:3000`

### 3. Build for Production

```bash
npm run build
```

---

## 🎯 First-Time User Flow

### Step 1: Connect to Lambda

1. Open BunkerWatch in your browser
2. You'll see the **BunkerWatch** logo with connection screen
3. Enter your **AWS Lambda Function URL**
   - Example: `https://your-lambda-url.lambda-url.region.on.aws`
   - **Important:** No trailing slash!
4. Click **"Connect & Continue"**

### Step 2: Select Vessel

1. You'll see a list of available vessels
2. Select your vessel from the dropdown
3. Click **"Download Vessel Data"**
4. Wait 5-30 seconds for 2-5MB download
5. You'll see:
   - ✓ Vessel name
   - ✓ Number of compartments/tanks
   - ✓ Calibration data rows

### Step 3: Start Working

Now you can work **100% offline**! 🎉

---

## 📊 Using Tank Sounding

### Daily Fuel Inventory Reporting

1. **Set Global Parameters:**
   - **Date:** Today's date (pre-filled)
   - **Global Trim (m):** Ship's forward/aft tilt (e.g., 0.5)
   - **Global Heel (°):** Side-to-side tilt, optional (e.g., 1.0)

2. **Add Tank Entries:**
   - Select **Tank Name** from dropdown
   - Choose **Fuel Grade** (HSFO, VLSFO, ULSFO, LSMGO, MGO, BIOFUEL)
   - Enter **Ullage (cm):** Distance from top of tank to fuel surface
   - Enter **Density:** Fuel density (e.g., 0.950)
   - Enter **Temperature:** Optional

3. **Calculate:**
   - Click **"Calc"** button for each tank
   - See instant results:
     - **Volume (m³):** With trim/heel corrections
     - **mT:** Metric tons (volume × density)

4. **Add More Tanks:**
   - Click **"+ Add Tank Row"**
   - Repeat for all tanks

5. **Review Summary:**
   - See **Total Mass by Fuel Grade** table
   - Shows totals grouped by fuel type

---

## ⛽ Using Bunkering Monitor

### Real-Time Refueling Operations

1. **Select Number of Bunkers:**
   - Choose 1 or 2 simultaneous bunkers

2. **For Each Bunker, Enter:**
   - **Density:** Fuel density
   - **Temp (°C):** Temperature
   - **Total Qty (mT):** Total quantity ordered
   - **Heel (°):** Current heel
   - **Trim (m):** Current trim

3. **Add Time-Stamped Readings:**
   - **Date/Time:** Auto-filled, editable
   - **Tank:** Select compartment
   - **Ullage (cm):** Current ullage measurement
   - Click **"Calc"**

4. **Monitor Progress:**
   - See **Volume (m³)**
   - See **mT** (metric tons)
   - See **% Full** with visual progress bar
   - Track fuel distribution across multiple tanks

5. **Add More Readings:**
   - Click **"+ Add Reading"**
   - Track changes over time

---

## 🔄 Syncing Data

### When You're Back Online

1. Check the **Sync Status Bar** (top of app)
2. See online/offline indicator:
   - 🟢 **Online** - Can sync now
   - 🔴 **Offline** - Working offline

3. See pending records:
   - "📊 Pending: 5 (3 soundings, 2 bunkering)"

4. Click **"🔄 Sync Now"**
5. Wait for confirmation:
   - "✓ Synced 5 record(s) successfully"

---

## 💡 Pro Tips

### Working Offline
- ✅ All calculations work without internet
- ✅ Data is stored locally in your browser
- ✅ Sync whenever you have connectivity
- ✅ No data loss if browser closes

### Performance
- ⚡ Calculations complete in <1 second
- ⚡ No waiting for server responses
- ⚡ Smooth, responsive interface

### Data Management
- 📦 Download vessel data once
- 🔄 Optionally check for updates
- 🚢 Switch between vessels easily
- 💾 ~5-10MB storage per vessel

### Best Practices
1. **Download data when you have good internet**
2. **Work offline during operations**
3. **Sync when convenient**
4. **Check sync status bar regularly**
5. **Keep vessel data updated monthly**

---

## 🎨 User Interface Guide

### Color Indicators

- **Ocean Blue** - Primary actions and headers
- **Teal** - Success, active states
- **Green** - Online status, completed
- **Red** - Offline status, errors
- **Gray** - Inactive, disabled

### Progress Bars

In bunkering monitor:
- **Green** - 0-50% full (safe)
- **Teal** - 50-80% full (good)
- **Yellow** - 80-95% full (caution)
- **Red** - 95-100% full (nearly full)

---

## 🔧 Troubleshooting

### App Won't Connect
- ✅ Check Lambda URL format
- ✅ Ensure no trailing slash
- ✅ Verify URL is accessible

### Can't Download Vessel Data
- ✅ Check internet connection
- ✅ Verify Lambda is responding
- ✅ Try refreshing the page

### Calculations Not Working
- ✅ Ensure vessel data is downloaded
- ✅ Check that compartment is selected
- ✅ Verify ullage and trim are entered
- ✅ Check trim/heel are in valid range

### Sync Failing
- ✅ Check online status indicator
- ✅ Verify Lambda URL is still valid
- ✅ Try syncing again later
- ✅ Check browser console for errors

### Browser Issues
- ✅ Use Chrome, Firefox, Edge, or Safari
- ✅ Enable JavaScript
- ✅ Allow IndexedDB storage
- ✅ Clear browser cache if needed

---

## 📱 Mobile Usage

### Install as App (PWA)

**On Android/Chrome:**
1. Open BunkerWatch in Chrome
2. Tap menu (⋮)
3. Tap "Add to Home screen"
4. Tap "Add"

**On iOS/Safari:**
1. Open BunkerWatch in Safari
2. Tap Share button
3. Tap "Add to Home Screen"
4. Tap "Add"

### Mobile Tips
- ✅ Works just like desktop
- ✅ Optimized touch interface
- ✅ Responsive design
- ✅ Full offline capability

---

## 🔐 Security Notes

- 🔒 Data stored locally in browser
- 🔒 HTTPS required for Lambda
- 🔒 No passwords stored
- 🔒 UUID prevents data duplication
- 🔒 Sync only when online

---

## 📞 Need Help?

### Debug Mode
Open browser console (F12) to see:
- Database operations
- Calculation logs
- Sync status
- Error messages

### Common Questions

**Q: Do I need internet for calculations?**  
A: No! After downloading vessel data, everything works offline.

**Q: How much data does it use?**  
A: Initial download: 2-5MB per vessel. After that, minimal data for sync.

**Q: Can multiple people use the same vessel?**  
A: Yes, but syncing is per-device. Each device works independently.

**Q: What happens if I lose connection during sync?**  
A: Data stays in the queue and will retry when online again.

**Q: Can I work on multiple vessels?**  
A: Yes, you can switch vessels and download data for each.

---

## 🎉 You're Ready!

Start using BunkerWatch for:
- ✅ Daily tank soundings
- ✅ Bunkering operations
- ✅ Fuel inventory management
- ✅ Compliance reporting

**Happy sailing! ⚓**

---

*For technical documentation, see:*
- `README.md` - Project overview
- `APP_OVERVIEW.md` - Detailed features
- `PHASE1_IMPLEMENTATION_PLAN.md` - Architecture
- `IMPLEMENTATION_SUMMARY.md` - What was built

