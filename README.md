# ⚓ BunkerWatch

**Professional Maritime Fuel Management System**

BunkerWatch is a modern, offline-first Progressive Web App (PWA) for maritime tank sounding and bunkering operations. Designed for vessels to work seamlessly offline with cloud synchronization when connectivity is available.

## 🚢 Features

### Tank Sounding
- **Daily fuel inventory reporting** with precise volume calculations
- **Multi-tank management** with support for various fuel grades (HSFO, VLSFO, ULSFO, LSMGO, MGO, BIOFUEL)
- **Trim and heel corrections** using bilinear interpolation
- **Real-time calculations** with instant feedback
- **Summary reports** grouped by fuel grade

### Bunkering Monitor
- **Real-time refueling operations** monitoring
- **Support for 1-2 simultaneous bunkers** (fuel suppliers)
- **Time-stamped readings** for audit trails
- **Tank capacity tracking** with visual progress bars
- **Live volume and mass calculations**

### Offline-First Architecture
- ✅ **Works 95%+ of the time offline**
- ✅ **Vessel-specific data packages** (2-5MB each)
- ✅ **Local IndexedDB storage** with Dexie.js
- ✅ **Client-side interpolation** (same logic as Lambda backend)
- ✅ **Smart sync** when connectivity restored
- ✅ **Multi-vessel support**

## 🎨 Design

BunkerWatch features a clean, modern maritime-inspired UI:
- Professional color palette with ocean blues and teals
- Modern typography with Inter font family
- Smooth animations and transitions
- Responsive design for all device sizes
- Subtle maritime elements without being heavy

## 🛠️ Technology Stack

**Frontend:**
- React 19.0.0
- Dexie.js (IndexedDB wrapper)
- Progressive Web App (PWA)
- Modern CSS with CSS Variables

**Backend:**
- AWS Lambda (Function URL)
- RDS PostgreSQL
- REST API

**API Endpoints:**
- `GET /vessels` - Get list of vessels
- `GET /vessel/{id}/data-package` - Download vessel-specific calibration data
- `POST /vessel/{id}/sync-soundings` - Sync sounding logs
- `POST /vessel/{id}/sync-bunkering` - Sync bunkering operations
- `POST /sounding` - Calculate volume from ullage/trim/heel
- `GET /compartments` - Fetch compartments (legacy endpoint)

## 📦 Installation

### Prerequisites
- Node.js 16+ and npm
- AWS Lambda Function URL (with proper CORS configuration)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd bunkerwatch

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## 🚀 Quick Start

### First Time Setup
1. Enter your AWS Lambda Function URL
2. Select your vessel from the list
3. Download vessel-specific calibration data (one-time, ~2-5MB)
4. Start working offline!

### Daily Operations
1. **Tank Sounding**: Record daily fuel measurements
2. **Bunkering**: Monitor refueling operations in real-time
3. **Sync**: Upload data when internet is available

## 📖 Usage

### Tank Sounding Workflow
1. Set global parameters (Date, Trim, Heel)
2. Add tank entries with:
   - Tank/compartment selection
   - Fuel grade
   - Ullage measurement (cm)
   - Density and temperature
3. Click "Calc" for each tank
4. Review volume (m³) and mass (mT) results
5. Check summary totals by fuel grade

### Bunkering Monitor Workflow
1. Set number of simultaneous bunkers (1-2)
2. For each bunker, enter:
   - Density, temperature, total quantity
   - Trim and heel values
3. Add time-stamped readings:
   - Select tank
   - Enter ullage
   - Calculate volume and % full
4. Monitor progress bars for each tank
5. Track real-time fuel distribution

## 🗄️ Data Management

### Offline Storage
- **Vessel data**: Stored in IndexedDB
- **Calibration tables**: ~1000s of rows per tank
- **Pending operations**: Queued for sync
- **Historical data**: Available offline

### Sync Behavior
- **Automatic detection**: Online/offline status monitoring
- **Manual sync**: User-triggered data upload
- **Conflict resolution**: Client-side UUID prevents duplicates
- **Batch upload**: Efficient data transmission

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root:

```env
REACT_APP_LAMBDA_URL=https://your-lambda-url.lambda-url.region.on.aws
REACT_APP_VERSION=1.0.0
```

### Lambda Function URL Format
- Must be a valid AWS Lambda Function URL
- No trailing slash
- CORS must be configured for your domain

## 📊 System Architecture

```
┌─────────────────────────────────────────┐
│           VESSEL (Offline)              │
│  ┌───────────────────────────────────┐  │
│  │   React PWA Application           │  │
│  │   - Vessel Selection              │  │
│  │   - Sounding Tab (offline calc)   │  │
│  │   - Bunkering Tab (offline calc)  │  │
│  │   - Sync Status Dashboard         │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │   IndexedDB (Dexie.js)            │  │
│  │   - Vessel data                   │  │
│  │   - Compartments                  │  │
│  │   - Calibration data              │  │
│  │   - Pending sync queue            │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │   Interpolation Engine (JS)       │  │
│  │   - Bilinear interpolation        │  │
│  │   - Trim/Heel corrections         │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              ↕ HTTPS (when online)
┌─────────────────────────────────────────┐
│      AWS CLOUD INFRASTRUCTURE           │
│  ┌───────────────────────────────────┐  │
│  │   Lambda + API Gateway            │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │   RDS PostgreSQL                  │  │
│  │   - Vessels                       │  │
│  │   - Compartments                  │  │
│  │   - Calibration data              │  │
│  │   - Sounding logs                 │  │
│  │   - Bunkering operations          │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## 🎯 Success Metrics

- ✅ **95%+ offline availability**
- ✅ **<5 second offline calculation time**
- ✅ **<30 second data package download**
- ✅ **100% data sync accuracy**
- ✅ **<$5/month additional AWS costs**

## 📱 Progressive Web App

BunkerWatch can be installed on mobile devices and desktops:
- **Add to Home Screen** on mobile devices
- **Install App** on desktop browsers
- **Works offline** after initial setup
- **Fast loading** with service worker caching

## 🤝 Contributing

This is a professional maritime application. For contributions:
1. Follow the existing code style
2. Test thoroughly in offline mode
3. Ensure calculations match Lambda backend
4. Update documentation

## 📝 License

Proprietary - All rights reserved

## 🆘 Support

For technical support or questions:
- Check the implementation plan: `PHASE1_IMPLEMENTATION_PLAN.md`
- Review app overview: `APP_OVERVIEW.md`
- Contact your system administrator

## 🔄 Version History

### v1.0.0 (Current)
- ⚓ Initial release as BunkerWatch
- ✨ Clean, modern maritime-inspired UI
- 🌐 Offline-first architecture
- 📊 Tank sounding calculations
- ⛽ Bunkering operations monitoring
- 🔄 Cloud sync capability
- 📦 Vessel-specific data packages

---

**Built with ❤️ for maritime professionals**
