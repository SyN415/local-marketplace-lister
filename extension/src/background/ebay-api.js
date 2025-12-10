// eBay API Integration Module
// Called from service worker to fetch price comparisons

// Note: In a real production extension, we would use the backend proxy for everything
// to keep credentials safe. For this implementation, we'll try to use the backend
// if available, but for now we'll simulate the backend call or assume the backend 
// handles the actual eBay API request.

// As per plan, we are using a Backend Proxy pattern.
// The Extension Service Worker sends a message to the Backend API.

const BACKEND_URL = 'http://localhost:3000'; // Or production URL

export async function getPriceIntelligence(query, userToken) {
  // Check local cache first (handled in service-worker or here)
  const cacheKey = `price_intel_${query.toLowerCase().trim()}`;
  const cached = await chrome.storage.local.get([cacheKey]);
  
  if (cached[cacheKey] && cached[cacheKey].expiresAt > Date.now()) {
    console.log('Using cached price intelligence');
    return cached[cacheKey].data;
  }

  try {
    // If we have a user token, we can use the backend
    if (!userToken) {
        // Try to get token from storage if not provided
        const { authToken } = await chrome.storage.local.get(['authToken']);
        userToken = authToken;
    }

    if (!userToken) {
        console.warn('No auth token available for price intelligence');
        return { found: false, error: 'Authentication required' };
    }

    const response = await fetch(`${BACKEND_URL}/api/scout/price-intelligence?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
        throw new Error(`Backend request failed: ${response.status}`);
    }

    const json = await response.json();
    
    if (json.success && json.data) {
       // Cache for 24 hours
       await chrome.storage.local.set({
        [cacheKey]: {
          data: json.data,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000
        }
      });
      return json.data;
    }
    
    return { found: false };

  } catch (error) {
    console.error('Error fetching price intelligence:', error);
    return { found: false, error: error.message };
  }
}