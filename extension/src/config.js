// Extension Configuration
// Centralizes configuration for dev/production environments

// Detect if running in development based on extension ID or storage flag
const isDevelopment = async () => {
  // In development, the extension ID is typically different
  // We can also check for a dev flag in storage
  try {
    const { devMode } = await chrome.storage.local.get(['devMode']);
    return devMode === true;
  } catch {
    return false;
  }
};

// Backend URLs
const BACKEND_URLS = {
  production: 'https://local-marketplace-backend-wr5e.onrender.com',
  development: 'http://localhost:3000'
};

// Frontend URLs
const FRONTEND_URLS = {
  production: 'https://local-marketplace-backend-wr5e.onrender.com',
  development: 'http://localhost:5173'
};

/**
 * Get the backend API URL
 * @returns {Promise<string>} The backend URL
 */
export async function getBackendUrl() {
  const dev = await isDevelopment();
  return dev ? BACKEND_URLS.development : BACKEND_URLS.production;
}

/**
 * Get the frontend URL
 * @returns {Promise<string>} The frontend URL
 */
export async function getFrontendUrl() {
  const dev = await isDevelopment();
  return dev ? FRONTEND_URLS.development : FRONTEND_URLS.production;
}

/**
 * Synchronous version for immediate use (defaults to production)
 * Use the async version when possible
 */
export const config = {
  backendUrl: BACKEND_URLS.production,
  frontendUrl: FRONTEND_URLS.production,
  
  // Cache durations (in milliseconds)
  priceIntelligenceCacheDuration: 24 * 60 * 60 * 1000, // 24 hours
  listingsCacheDuration: 5 * 60 * 1000, // 5 minutes
  
  // Watchlist settings
  minWatchlistCheckInterval: 15, // minutes
  defaultWatchlistCheckInterval: 30, // minutes
};

export default config;