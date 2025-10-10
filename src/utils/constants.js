// BunkerWatch Constants

// Fuel Grades
export const FUEL_GRADES = [
  'HSFO',
  'VLSFO',
  'ULSFO',
  'LSMGO',
  'MGO',
  'BIOFUEL'
];

// Trim Ranges (meters)
export const TRIM_RANGES = [
  { value: -4.0, column: 'trim_minus_4_0' },
  { value: -3.0, column: 'trim_minus_3_0' },
  { value: -2.0, column: 'trim_minus_2_0' },
  { value: -1.5, column: 'trim_minus_1_5' },
  { value: -1.0, column: 'trim_minus_1_0' },
  { value: -0.5, column: 'trim_minus_0_5' },
  { value: 0.0, column: 'trim_0_0' },
  { value: 0.5, column: 'trim_plus_0_5' },
  { value: 1.0, column: 'trim_plus_1_0' },
  { value: 1.5, column: 'trim_plus_1_5' },
  { value: 2.0, column: 'trim_plus_2_0' },
  { value: 3.0, column: 'trim_plus_3_0' },
  { value: 4.0, column: 'trim_plus_4_0' }
];

// Heel Ranges (degrees)
export const HEEL_RANGES = [
  { value: -3.0, column: 'heel_minus_3_0' },
  { value: -2.0, column: 'heel_minus_2_0' },
  { value: -1.5, column: 'heel_minus_1_5' },
  { value: -1.0, column: 'heel_minus_1_0' },
  { value: -0.5, column: 'heel_minus_0_5' },
  { value: 0.0, column: 'heel_0_0' },
  { value: 0.5, column: 'heel_plus_0_5' },
  { value: 1.0, column: 'heel_plus_1_0' },
  { value: 1.5, column: 'heel_plus_1_5' },
  { value: 2.0, column: 'heel_plus_2_0' },
  { value: 3.0, column: 'heel_plus_3_0' }
];

// App Configuration
export const APP_CONFIG = {
  version: '1.0.0',
  name: 'BunkerWatch',
  maxBunkers: 2,
  syncBatchSize: 50,
  offlineStorageQuota: 50 * 1024 * 1024, // 50MB
  dataPackageMaxSize: 10 * 1024 * 1024 // 10MB
};

// Sync Statuses
export const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCED: 'synced',
  FAILED: 'failed'
};

// Local Storage Keys
export const STORAGE_KEYS = {
  LAMBDA_URL: 'bunkerwatch_lambda_url',
  LAST_VESSEL_ID: 'bunkerwatch_last_vessel_id',
  APP_SETTINGS: 'bunkerwatch_settings'
};

// API Endpoints
export const API_ENDPOINTS = {
  VESSELS: '/vessels',
  VESSEL_INFO: '/vessel/{id}/info',
  DATA_PACKAGE: '/vessel/{id}/data-package',
  CHECK_UPDATE: '/vessel/{id}/check-update',
  SYNC_SOUNDINGS: '/vessel/{id}/sync-soundings',
  SYNC_BUNKERING: '/vessel/{id}/sync-bunkering',
  SOUNDING: '/sounding',
  COMPARTMENTS: '/compartments'
};

