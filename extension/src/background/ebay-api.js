// eBay API Integration Module
// Called from service worker to fetch price comparisons
// Uses Backend Proxy pattern to keep credentials safe

import { getBackendUrl, config } from '../config.js';

/**
 * Get price intelligence data for a product query
 * @param {string} query - The product search query
 * @param {string} [userToken] - Optional user authentication token
 * @returns {Promise<Object>} Price intelligence data
 */
export async function getPriceIntelligence(query, userToken, item) {
  // Validate query
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    console.warn('Invalid query for price intelligence');
    return { found: false, error: 'Invalid query' };
  }

  // Cache key should incorporate the item metadata used by backend precision filters.
  // Otherwise, different items with the same title can return incorrect cached comps.
  const normalizedQuery = query.toLowerCase().trim();
  const metaParts = [];
  try {
    if (item && typeof item === 'object') {
      if (item.condition) metaParts.push(`c=${String(item.condition).toLowerCase()}`);
      if (item.brand) metaParts.push(`b=${String(item.brand).toLowerCase()}`);
      if (item.model) metaParts.push(`m=${String(item.model).toLowerCase()}`);
      if (typeof item.price === 'number' && !Number.isNaN(item.price)) metaParts.push(`p=${Number(item.price).toFixed(2)}`);
      if (item.attributes && typeof item.attributes === 'object') {
        // Keep stable ordering for consistent cache key.
        const keys = Object.keys(item.attributes).sort();
        const subset = keys.slice(0, 12).map((k) => `${k}:${String(item.attributes[k]).slice(0, 32)}`);
        if (subset.length) metaParts.push(`s=${subset.join('|').toLowerCase()}`);
      }
    }
  } catch {
    // ignore
  }
  const metaKey = metaParts.length ? `::${metaParts.join('::')}` : '';
  const cacheKey = `price_intel_${normalizedQuery}${metaKey}`;
  
  // Check local cache first
  try {
    const cached = await chrome.storage.local.get([cacheKey]);
    
    if (cached[cacheKey] && cached[cacheKey].expiresAt > Date.now()) {
      console.log('Using cached price intelligence for:', query);
      return cached[cacheKey].data;
    }
  } catch (cacheError) {
    console.warn('Cache read error:', cacheError);
  }

  // Get or retrieve auth token
  let token = userToken;
  if (!token) {
    try {
      const { authToken } = await chrome.storage.local.get(['authToken']);
      token = authToken;
    } catch (storageError) {
      console.warn('Failed to get auth token from storage:', storageError);
    }
  }

  // If no token, prompt user to login but don't completely fail
  // We can still try to show the overlay with limited data
  if (!token) {
    console.warn('No auth token available for price intelligence');
    return { 
      found: false, 
      error: 'Authentication required',
      requiresAuth: true,
      message: 'Please log in to view price comparisons'
    };
  }

  try {
    // Get the backend URL dynamically
    const backendUrl = await getBackendUrl();
    // Optional precision fields (best effort)
    const params = new URLSearchParams({ q: query });
    if (item && typeof item === 'object') {
      if (item.condition) params.set('condition', String(item.condition));
      if (item.brand) params.set('brand', String(item.brand));
      if (item.model) params.set('model', String(item.model));
      if (typeof item.price === 'number' && !Number.isNaN(item.price)) params.set('currentPrice', String(item.price));
      if (item.attributes && typeof item.attributes === 'object') {
        try {
          params.set('specs', JSON.stringify(item.attributes));
        } catch {
          // ignore
        }
      }
    }
    const url = `${backendUrl}/api/scout/price-intelligence?${params.toString()}`;
    
    console.log('Fetching price intelligence from:', url);
    
    // Hard timeout so a hung network request doesn't keep the SW alive and block UI.
    const controller = new AbortController();
    const timeoutMs = 12_000;
    const t = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(t);

    if (response.status === 401) {
      // Token expired or invalid - clear it and prompt re-login
      await chrome.storage.local.remove(['authToken']);
      console.warn('Auth token expired, cleared from storage');
      return { 
        found: false, 
        error: 'Session expired',
        requiresAuth: true,
        message: 'Your session has expired. Please log in again.'
      };
    }

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    
    if (json.success && json.data) {
      // Respect the found flag from backend
      if (json.data.found === false) {
        return {
          found: false,
          error: json.data.error,
          message: json.data.message || 'No price data available'
        };
      }

      const priceData = {
        found: true,
        avgPrice: json.data.avgPrice,
        lowPrice: json.data.lowPrice,
        highPrice: json.data.highPrice,
        count: json.data.count,
        samples: json.data.samples || [],
        cached: json.data.cached || false
      };

      // Cache for 24 hours
      try {
        await chrome.storage.local.set({
          [cacheKey]: {
            data: priceData,
            expiresAt: Date.now() + config.priceIntelligenceCacheDuration
          }
        });
        console.log('Cached price intelligence for:', query);
      } catch (cacheError) {
        console.warn('Failed to cache price intelligence:', cacheError);
      }

      return priceData;
    }
    
    return { found: false, message: 'No price data available' };

  } catch (error) {
    console.error('Error fetching price intelligence:', error);
    
    // Return cached data if available, even if expired
    try {
      const cached = await chrome.storage.local.get([cacheKey]);
      if (cached[cacheKey]) {
        console.log('Returning stale cache due to fetch error');
        return { ...cached[cacheKey].data, stale: true };
      }
    } catch {
      // Ignore cache error
    }
    
    const isAbort = String(error?.name || '').toLowerCase().includes('abort');
    return { 
      found: false, 
      error: isAbort ? 'Request timed out' : (error.message || 'Failed to fetch price data'),
      offline: !navigator.onLine
    };
  }
}

/**
 * Clear price intelligence cache for a specific query or all
 * @param {string} [query] - Optional specific query to clear
 */
export async function clearPriceCache(query) {
  try {
    if (query) {
      const cacheKey = `price_intel_${query.toLowerCase().trim()}`;
      await chrome.storage.local.remove([cacheKey]);
      console.log('Cleared cache for:', query);
    } else {
      // Clear all price intelligence cache entries
      const allStorage = await chrome.storage.local.get(null);
      const keysToRemove = Object.keys(allStorage).filter(key => 
        key.startsWith('price_intel_')
      );
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log('Cleared all price cache entries:', keysToRemove.length);
      }
    }
  } catch (error) {
    console.error('Failed to clear price cache:', error);
  }
}

/**
 * Check if user is authenticated for Scout features
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  try {
    const { authToken } = await chrome.storage.local.get(['authToken']);
    return !!authToken;
  } catch {
    return false;
  }
}
