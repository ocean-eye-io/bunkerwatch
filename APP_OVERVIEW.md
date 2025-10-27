# Tank Sounding & Bunkering Calculator

## Overview

This is a **React-based Tank Sounding & Bunkering Calculator** for maritime/shipping operations. The application helps calculate fuel volumes in ship tanks during sounding (measurement) and bunkering (refueling) operations.

## Application Structure

**Purpose:** This app helps calculate fuel volumes in ship tanks during sounding (measurement) and bunkering (refueling) operations.

## Key Components & Functionality

### 1. Connection Phase

- User enters an **AWS Lambda Function URL**
- App connects to backend and fetches **compartment/tank data** via `/compartments` endpoint
- Once connected, displays available tanks from the ship

### 2. Two Main Tabs

#### 📊 Tank Sounding Tab

Used for **daily fuel inventory reporting**

**Features:**
- **Global Parameters:** Date, Trim (ship's forward/aft tilt in meters), and Heel (side-to-side tilt in degrees)
- **Multi-row tank entries** where you can:
  - Select tank/compartment
  - Choose fuel grade (HSFO, VLSFO, ULSFO, LSMGO, MGO, BIOFUEL)
  - Enter ullage (distance from top of tank to fuel surface in cm)
  - Enter density and temperature
- **Calculate button** sends ullage + trim + heel to Lambda's `/sounding` endpoint
- Returns **volume in m³** (with heel corrections if applicable)
- Calculates **mass in metric tons (mT)** = volume × density
- **Summary table** shows total mT grouped by fuel grade

#### ⛽ Bunkering Monitor Tab

Used during **active refueling operations**

**Features:**
- Support for **1-2 simultaneous bunkers** (fuel suppliers)
- Each bunker panel tracks:
  - Density, temperature, total quantity ordered
  - Heel and trim values (per bunker)
  - **Time-stamped readings** (multiple entries per bunker)
- For each reading:
  - Records timestamp, tank, ullage
  - Calculates volume, mT, and **% tank capacity**
  - Visual **progress bar** showing tank fill level
- Helps monitor fuel distribution across multiple tanks in real-time

### 3. Technical Features

- **State Management:** Uses React hooks (`useState`, `useMemo`) for managing form data and calculations
- **API Integration:** Fetches sounding calculations from AWS Lambda backend
- **Heel Correction Display:** Shows base volume, heel adjustment, and final volume separately when heel is applied
- **Validation:** Checks required fields before allowing calculations
- **Responsive Design:** Styled with CSS for professional maritime use

### 4. Data Flow

```
User Input → Lambda API (/sounding endpoint) → Volume Calculation → Display Results
                                             (with trim/heel corrections)
```

## Use Cases

1. **Daily Reporting:** Morning sounding reports to track fuel consumption
2. **Bunkering Operations:** Monitor fuel intake across multiple tanks during refueling
3. **Inventory Management:** Track different fuel grades separately
4. **Compliance:** Document fuel quantities with timestamps and measurements

## How It Works

The app essentially transforms raw ullage measurements into accurate volume and mass calculations, accounting for ship's orientation (trim/heel) using calibration data stored on the Lambda backend.

## Technology Stack

- **Frontend:** React 19.0.0
- **Build Tool:** react-scripts (Create React App)
- **Backend:** AWS Lambda (Function URL)
- **API Endpoints:**
  - `GET /compartments` - Fetch tank/compartment list
  - `POST /sounding` - Calculate volume from ullage, trim, and heel

## File Structure

```
bunkeringapp/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── App.js              # Main application component
│   ├── App.css             # Application styles
│   ├── index.js            # React entry point
│   └── styles.css          # Additional styles
├── package.json            # Dependencies and scripts
└── README.md              # Project info
```

## Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## Configuration

1. Enter your AWS Lambda Function URL in the connection screen
2. The URL should be in format: `https://your-lambda-url.lambda-url.region.on.aws`
3. Do not include trailing slash

## Features Breakdown

### Sounding Calculations
- Converts ullage measurements to volumes
- Applies trim corrections (ship's longitudinal tilt)
- Applies heel corrections (ship's lateral tilt)
- Supports multiple fuel grades
- Aggregates totals by fuel type

### Bunkering Monitor
- Real-time monitoring during refueling
- Supports parallel operations (2 bunkers max)
- Time-stamped entries for audit trail
- Visual indicators (progress bars, percentages)
- Tank capacity warnings

## Data Fields

### Required Fields for Sounding
- Compartment/Tank ID
- Ullage (cm)
- Trim (meters)

### Optional Fields
- Heel (degrees)
- Density (for mass calculations)
- Temperature
- Fuel Grade (for reporting)

## API Response Format

The Lambda backend returns:
```json
{
  "success": true,
  "data": {
    "volume": 123.45,
    "base_volume": 120.00,
    "heel_correction": 3.45,
    "final_volume": 123.45
  }
}
```



