// BunkerWatch Configuration
// Handles Lambda URL configuration for different environments

/**
 * Get Lambda URL from environment variables or localStorage
 * Priority:
 * 1. Environment variable (build-time)
 * 2. localStorage (runtime user preference)
 * 3. null (user must configure)
 */
export function getLambdaUrl() {
  // 1. Check environment variable (set at build time)
  const envUrl = process.env.REACT_APP_LAMBDA_URL;
  
  // 2. Check localStorage (user preference/override)
  const savedUrl = localStorage.getItem('bunkerwatch_lambda_url');
  
  // Priority: localStorage > env variable
  return savedUrl || envUrl || null;
}

/**
 * Save Lambda URL to localStorage
 */
export function saveLambdaUrl(url) {
  if (url && url.trim()) {
    localStorage.setItem('bunkerwatch_lambda_url', url.trim());
  }
}

/**
 * Clear saved Lambda URL
 */
export function clearLambdaUrl() {
  localStorage.removeItem('bunkerwatch_lambda_url');
}

/**
 * Check if Lambda URL is configured
 */
export function hasLambdaUrl() {
  return getLambdaUrl() !== null;
}

/**
 * Get app configuration
 */
export function getAppConfig() {
  return {
    lambdaUrl: getLambdaUrl(),
    version: process.env.REACT_APP_VERSION || '1.0.0',
    debug: process.env.REACT_APP_DEBUG === 'true',
    buildTime: process.env.REACT_APP_BUILD_TIME || 'development',
  };
}

/**
 * Get environment name
 */
export function getEnvironment() {
  if (process.env.NODE_ENV === 'development') {
    return 'development';
  }
  if (process.env.REACT_APP_ENV) {
    return process.env.REACT_APP_ENV;
  }
  return 'production';
}

/**
 * Check if running in production mode
 */
export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/**
 * Log configuration (for debugging)
 */
export function logConfig() {
  const config = getAppConfig();
  console.log('🔧 BunkerWatch Configuration:', {
    environment: getEnvironment(),
    lambdaUrl: config.lambdaUrl ? '✅ Configured' : '❌ Not set',
    version: config.version,
    debug: config.debug,
    buildTime: config.buildTime
  });
}

