// Background script to handle navigation, state, and cross-posting logic
import { getPriceIntelligence, isAuthenticated, clearPriceCache } from './ebay-api.js';
import { initWatchlistAlarms, handleWatchlistAlarm } from './watchlist-manager.js';
import { getBackendUrl, getFrontendUrl, config } from '../config.js';
import { multimodalIdentifier } from './multimodal-identifier.js';

// Bright Data enrichment (decoupled consumer)
import { BrightDataClient } from './brightdata-client.js';
import { EnrichmentWorker } from './enrichment-worker.js';
import { getEnrichmentFlags, setEnrichmentFlags } from './feature-flags.js';
import { addBrightDataRetries, getMetrics, resetMetrics } from './enrichment-metrics.js';
import { clearCachedEnrichmentByPrefix } from './enrichment-cache.js';

// State constants
const STATE = {
  IDLE: 'idle',
  POSTING: 'posting',
  AWAITING_LOGIN: 'awaiting_login',
  COMPLETED: 'completed',
  ERROR: 'error'
};

// Facebook workflow steps (mirrored from content script)
const FB_WORKFLOW_STEPS = {
  IDLE: 'idle',
  UPLOADING_IMAGES: 'uploading_images',
  FORM_FILL: 'form_fill',
  SELECTING_CATEGORY: 'selecting_category',
  SELECTING_CONDITION: 'selecting_condition',
  CLICKING_NEXT_1: 'clicking_next_1',
  LOCATION_DELIVERY: 'location_delivery',
  CLICKING_NEXT_2: 'clicking_next_2',
  VISIBILITY_OPTIONS: 'visibility_options',
  PUBLISHING: 'publishing',
  COMPLETED: 'completed',
  ERROR: 'error'
};

// Craigslist workflow steps (mirrored from content script)
const CL_WORKFLOW_STEPS = {
  IDLE: 'idle',
  INITIAL_PAGE: 'initial_page',
  SUBAREA_SELECTION: 'subarea_selection',
  HOOD_SELECTION: 'hood_selection',
  TYPE_SELECTION: 'type_selection',
  CATEGORY_SELECTION: 'category_selection',
  FORM_FILL: 'form_fill',
  IMAGE_UPLOAD: 'image_upload',
  MAP_LOCATION: 'map_location',
  PREVIEW: 'preview',
  PUBLISHING: 'publishing',
  COMPLETED: 'completed',
  ERROR: 'error'
};


// ==============================
// Bright Data Enrichment bootstrap
// ==============================

let enrichmentWorker = null;
let brightDataClient = null;

async function initEnrichmentWorker() {
  if (enrichmentWorker) return enrichmentWorker;

  try {
    // Secrets/credentials are stored in chrome.storage.local to avoid bundling.
    // NOTE: apiToken is sensitive; user must configure it via dashboard/console or dev tooling.
    const creds = await storageGet([
      'brightDataApiToken',
      'brightDataWebUnlockerZone',
      'brightDataBrowserZone',
      'brightDataResidentialZone',
      'brightDataCustomerId',
      'brightDataBrowserPassword',
      'brightDataProxyPassword'
    ]);

    const apiToken = creds.brightDataApiToken;
    const webUnlockerZone = creds.brightDataWebUnlockerZone;
    const browserZone = creds.brightDataBrowserZone;

    if (!apiToken || !webUnlockerZone || !browserZone) {
      console.warn('[Enrichment] Bright Data credentials not configured; enrichment disabled');
      enrichmentWorker = null;
      brightDataClient = null;
      return null;
    }

    brightDataClient = new BrightDataClient({
      apiToken,
      webUnlockerZone,
      browserZone,
      residentialProxyZone: creds.brightDataResidentialZone,
      customerId: creds.brightDataCustomerId,
      browserPassword: creds.brightDataBrowserPassword,
      proxyPassword: creds.brightDataProxyPassword
    });

    // Observability: count retries in metrics (do not include secrets)
    brightDataClient.onEvent = (ev) => {
      if (ev?.type === 'retry') {
        addBrightDataRetries(1).catch(() => {});
      }
    };

    enrichmentWorker = new EnrichmentWorker(brightDataClient, {
      maxConcurrentRequests: 5,
      deduplicationWindowMs: 60_000,
      circuitBreakerThreshold: 10,
      circuitBreakerResetMs: 60_000
    });

    // Forward enrichment events to tabs (graceful degradation: if this fails, core scanning still works)
    enrichmentWorker.onEnriched = (payload) => broadcastToMarketplaceTabs({ action: 'ENRICHMENT_UPDATE', payload });
    enrichmentWorker.onFailed = (payload) => broadcastToMarketplaceTabs({ action: 'ENRICHMENT_UPDATE', payload });
    enrichmentWorker.onThrottled = (payload) => broadcastToMarketplaceTabs({ action: 'ENRICHMENT_UPDATE', payload });

    console.log('[Enrichment] EnrichmentWorker initialized');
    return enrichmentWorker;
  } catch (e) {
    console.warn('[Enrichment] init failed; continuing without enrichment', e);
    enrichmentWorker = null;
    brightDataClient = null;
    return null;
  }
}

async function broadcastToMarketplaceTabs(message) {
  const tabs = await chrome.tabs.query({ url: ['*://*.facebook.com/*', '*://*.craigslist.org/*'] });
  await Promise.all(
    tabs.map((t) => new Promise((resolve) => {
      chrome.tabs.sendMessage(t.id, message, () => resolve());
    }))
  );
}

// Initialize state on installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Local Marketplace Lister extension installed');
  resetState();

  // Ensure flags exist in storage (defaults)
  getEnrichmentFlags().catch(() => {});
});

// Listen for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('watchlist_check_')) {
    handleWatchlistAlarm(alarm.name);
  }
});

// Background SW "activation": MV3 service worker has no persistent activate event.
// Best-effort initialize enrichment in the background at startup (non-fatal).
setTimeout(() => {
  initEnrichmentWorker().catch(() => {});
}, 0);

// Helper to reset application state
function resetState() {
  const initialState = {
    postingStatus: STATE.IDLE,
    currentPlatform: null,
    progress: { current: 0, total: 0 },
    lastError: null,
    currentListingData: null,
    pendingTabId: null,
    queue: [],
    logs: [],
    // Auth and listings cache
    authToken: null,
    userListings: [],
    listingsLastFetched: null,
    // Workflow steps
    facebookWorkflowStep: FB_WORKFLOW_STEPS.IDLE,
    craigslistWorkflowStep: CL_WORKFLOW_STEPS.IDLE
  };
  chrome.storage.local.set(initialState);
}

// Promisified storage helpers
function storageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result));
  });
}

function storageSet(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, () => resolve());
  });
}

// Update status helper
async function updateStatus(updates) {
  const current = await storageGet(null);
  const newState = { ...current, ...updates };
  await storageSet(newState);
}

// Add log entry helper
async function addLog(message, level = 'info') {
  const result = await storageGet(['logs']);
  const logs = result.logs || [];
  logs.push({
    timestamp: new Date().toISOString(),
    level,
    message
  });
  // Keep last 50 logs
  if (logs.length > 50) logs.shift();
  await storageSet({ logs });
}

// Message handler - MUST return true for async responses
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Avoid logging full request payloads because some actions may carry secrets
  // (e.g., ENRICHMENT_SET_CREDENTIALS).
  console.log('Background received message:', request?.action);
  
  // Handle the message asynchronously
  handleMessage(request, sender)
    .then((response) => {
      console.log('Sending response for', request?.action);
      sendResponse(response);
    })
    .catch((error) => {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    });
  
  return true; // Required for async response
});

// Async message handler - returns the response object
async function handleMessage(request, sender) {
  try {
    switch (request.action) {
      case 'start_posting':
        return await handleStartPosting(request);
        
      case 'stop_posting':
        await updateStatus({ postingStatus: STATE.IDLE, lastError: 'Stopped by user', pendingTabId: null });
        return { success: true };

      case 'get_listing_data': {
        const result = await storageGet(['currentListingData', 'postingStatus', 'currentPlatform']);
        return {
          data: result.currentListingData,
          status: result.postingStatus,
          platform: result.currentPlatform
        };
      }

      case 'check_pending_work': {
        const result = await storageGet(['postingStatus', 'currentPlatform', 'currentListingData', 'pendingTabId']);
        const shouldAutomate = (
          result.postingStatus === STATE.POSTING ||
          result.postingStatus === STATE.AWAITING_LOGIN
        ) && result.currentListingData;
        
        return {
          shouldAutomate,
          data: result.currentListingData,
          platform: result.currentPlatform,
          status: result.postingStatus
        };
      }
        
      case 'trigger_fill':
        return await handleManualFill();
        
      case 'update_progress':
        await updateStatus({
          progress: request.progress,
          postingStatus: request.status || STATE.POSTING
        });
        return { success: true };

      case 'posting_complete':
        await addLog(`Posting to ${request.platform} completed successfully`);
        await updateStatus({
          postingStatus: STATE.COMPLETED,
          progress: { current: 100, total: 100 },
          pendingTabId: null
        });
        return { success: true };

      case 'posting_error':
        await addLog(`Posting error: ${request.error}`, 'error');
        await updateStatus({
          postingStatus: STATE.ERROR,
          lastError: request.error,
          pendingTabId: null
        });
        return { success: true };

      case 'login_detected':
        await addLog('Facebook login page detected, awaiting user login');
        await updateStatus({ postingStatus: STATE.AWAITING_LOGIN });
        return { success: true };

      case 'workflow_step_changed':
        return await handleWorkflowStepChanged(request);

      case 'QUEUE_LISTING':
        return await handleQueueListing(request.payload);

      case 'set_auth_token':
        await storageSet({ authToken: request.token });
        await addLog('Auth token saved');
        // Initialize watchlist alarms when authenticated
        await initWatchlistAlarms();
        return { success: true };

      case 'fetch_listings':
        return await handleFetchListings();

      case 'select_listing':
        await storageSet({
          currentListingData: request.listing,
          postingStatus: STATE.IDLE
        });
        return { success: true };

      case 'get_logs': {
        const result = await storageGet(['logs']);
        return { logs: result.logs || [] };
      }
      
      case 'get_workflow_status':
        return await getWorkflowStatus();
      
      case 'reset_workflow': {
        await storageSet({
          facebookWorkflowStep: FB_WORKFLOW_STEPS.IDLE,
          craigslistWorkflowStep: CL_WORKFLOW_STEPS.IDLE,
          postingStatus: STATE.IDLE,
          lastError: null
        });
        await addLog('Workflow reset');
        return { success: true };
      }

      case 'GET_PRICE_INTELLIGENCE': {
        const { authToken: token } = await storageGet(['authToken']);
        const result = await getPriceIntelligence(request.query, token, request.item);
        // Pass back additional context for content scripts
        if (result.requiresAuth) {
          // Try to notify user if not authenticated
          await addLog('Price intelligence requires authentication', 'warn');
        }
        return result;
      }

      // Optional: allow bridge to explicitly request enrichment without relying on SCOUT_MATCH_FOUND
      case 'ENRICH_MATCH': {
        const match = request.match;
        if (!match || !match.title) return { success: false, error: 'Invalid match payload' };

        try {
          const worker = await initEnrichmentWorker();
          if (!worker) return { success: true, skipped: true, reason: 'not_configured' };
          worker.enqueueMatch(match).catch(() => {});
          return { success: true, enqueued: true };
        } catch (e) {
          return { success: true, enqueued: false, error: String(e?.message || e) };
        }
      }
      
      case 'CLEAR_PRICE_CACHE':
        await clearPriceCache(request.query);
        return { success: true };
        
      case 'CHECK_AUTH':
        return { authenticated: await isAuthenticated() };

      case 'MULTIMODAL_ANALYZE_LISTING': {
        // Multi-modal item identification for eBay search optimization
        const listingData = request.listingData;

        console.log('[ServiceWorker] MULTIMODAL_ANALYZE_LISTING received:', {
          url: listingData?.url,
          title: listingData?.title,
          hasImageDataUrls: Array.isArray(listingData?.imageDataUrls),
          imageDataUrlsCount: listingData?.imageDataUrls?.length || 0,
          hasImageUrls: Array.isArray(listingData?.imageUrls),
          imageUrlsCount: listingData?.imageUrls?.length || 0,
          firstDataUrlType: listingData?.imageDataUrls?.[0]?.startsWith('data:') ? 'data-url' : 'http-url',
          firstDataUrlPreview: listingData?.imageDataUrls?.[0]?.substring(0, 60) || 'none',
          firstDataUrlLength: listingData?.imageDataUrls?.[0]?.length || 0
        });

        if (!listingData) {
          console.error('[ServiceWorker] No listing data provided');
          return { success: false, error: 'No listing data provided' };
        }

        try {
          // Initialize the multimodal identifier if needed
          await multimodalIdentifier.initialize();
          
          // Perform multi-modal analysis
          const analysis = await multimodalIdentifier.analyzeListing(listingData);
          
          console.log('[ServiceWorker] Multimodal analysis result:', {
            success: true,
            query: analysis.query,
            confidence: analysis.confidence,
            sources: analysis.sources,
            fallbackUsed: analysis.fallbackUsed,
            mergedData: analysis.mergedData
          });
          
          return {
            success: true,
            query: analysis.query,
            confidence: analysis.confidence,
            sources: analysis.sources,
            fallbackUsed: analysis.fallbackUsed,
            mergedData: analysis.mergedData
          };
        } catch (error) {
          console.error('[ServiceWorker] Multi-modal analysis failed:', error);
          // Return failure so content script falls back to traditional query building
          return {
            success: false,
            error: error.message,
            fallbackRequired: true
          };
        }
      }

      case 'FETCH_IMAGE_AS_DATA_URL': {
        // Fetch an image URL and convert to data URL
        // Background script can fetch cross-origin images that content scripts cannot
        const imageUrl = request.url;

        if (!imageUrl || typeof imageUrl !== 'string') {
          return { success: false, error: 'Invalid image URL' };
        }

        try {
          console.log('[ServiceWorker] Fetching image:', imageUrl.substring(0, 100) + '...');

          // Fetch with credentials to access Facebook CDN images
          const response = await fetch(imageUrl, {
            credentials: 'include',
            headers: {
              'Accept': 'image/*'
            }
          });

          if (!response.ok) {
            console.warn('[ServiceWorker] Image fetch failed:', response.status);
            return { success: false, error: `HTTP ${response.status}` };
          }

          const blob = await response.blob();

          // Check size limit (1MB)
          if (blob.size > 1_000_000) {
            console.warn('[ServiceWorker] Image too large:', blob.size);
            return { success: false, error: 'Image too large' };
          }

          // Convert blob to data URL
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('FileReader failed'));
            reader.readAsDataURL(blob);
          });

          if (typeof dataUrl === 'string' && dataUrl.length > 100) {
            console.log('[ServiceWorker] Image converted to data URL:', Math.round(dataUrl.length / 1024) + 'KB');
            return { success: true, dataUrl };
          } else {
            return { success: false, error: 'Invalid data URL result' };
          }
        } catch (error) {
          console.error('[ServiceWorker] Image fetch error:', error.message);
          return { success: false, error: error.message };
        }
      }

      case 'SYNC_WATCHLIST': {
        // Frontend calls this after adding/removing items to update local storage
        // Guard against circular references (can cause memory leaks / storage failures)
        const safeStringify = (obj) => {
          const seen = new WeakSet();
          return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
              if (seen.has(value)) {
                throw new Error('Circular reference detected in watchlist payload');
              }
              seen.add(value);
            }
            return value;
          });
        };

        try {
          safeStringify(request.items);
        } catch (e) {
          await addLog(`Watchlist sync rejected: ${e.message}`, 'error');
          return { success: false, error: e.message };
        }

        await storageSet({ watchlistItems: request.items });
        await initWatchlistAlarms();
        return { success: true };
      }

      case 'SCOUT_MATCH_FOUND': {
        // Relay match to all marketplace tabs + maintain unified recentMatches store
        const match = request.match;
        if (!match || !match.link) return { success: false, error: 'Invalid match payload' };

        // Update storage list
        const current = await storageGet(['recentMatches']);
        const existing = Array.isArray(current.recentMatches) ? current.recentMatches : [];
        const next = [match, ...existing.filter((m) => (m?.id || m?.link) !== (match.id || match.link))].slice(0, 50);
        await storageSet({ recentMatches: next });

        // Broadcast to all relevant tabs (core behavior)
        await broadcastToMarketplaceTabs({ action: 'SCOUT_MATCH_BROADCAST', match });

        // Enrichment: decoupled consumer (never blocks broadcast)
        try {
          const worker = await initEnrichmentWorker();
          if (worker) {
            // Enqueue non-blocking; worker itself applies flags/dedupe/concurrency/circuit breaker
            worker.enqueueMatch(match).catch(() => {});
          }
        } catch {
          // swallow - core scanning must remain unaffected
        }

        return { success: true };
      }

      // --- Enrichment control plane (feature flags + monitoring) ---
      case 'ENRICHMENT_GET_FLAGS': {
        const flags = await getEnrichmentFlags();
        return { success: true, flags };
      }

      case 'ENRICHMENT_SET_FLAGS': {
        const next = await setEnrichmentFlags(request.flags || {});
        return { success: true, flags: next };
      }

      case 'ENRICHMENT_GET_METRICS': {
        const metrics = await getMetrics();
        return { success: true, metrics };
      }

      case 'ENRICHMENT_RESET_METRICS': {
        const metrics = await resetMetrics();
        return { success: true, metrics };
      }

      case 'ENRICHMENT_CLEAR_CACHE': {
        const n = await clearCachedEnrichmentByPrefix();
        return { success: true, cleared: n };
      }

      case 'ENRICHMENT_SET_CREDENTIALS': {
        // Allows dashboard/dev to set credentials (stored locally)
        const updates = {
          brightDataApiToken: request.apiToken,
          brightDataWebUnlockerZone: request.webUnlockerZone,
          brightDataBrowserZone: request.browserZone,
          brightDataResidentialZone: request.residentialProxyZone,
          brightDataCustomerId: request.customerId,
          brightDataBrowserPassword: request.browserPassword,
          brightDataProxyPassword: request.proxyPassword
        };
        // Remove undefined keys to avoid overwriting existing values unintentionally
        Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);
        await storageSet(updates);

        // Re-init
        enrichmentWorker = null;
        brightDataClient = null;
        await initEnrichmentWorker();

        return { success: true };
      }

      case 'PC_RESALE_ANALYZE': {
        // PC Resale Analysis - calls backend to analyze PC build for part-out profit
        const listingData = request.listingData;

        console.log('[ServiceWorker] PC_RESALE_ANALYZE called with full listing data:', JSON.stringify(listingData, null, 2));

        // Validate required fields before sending to backend
        if (!listingData?.title) {
          console.error('[ServiceWorker] PC resale analysis missing title');
          return { success: false, error: 'Listing title is required' };
        }

        // Ensure price is a valid number - required by backend
        let price = listingData.price;
        if (price === null || price === undefined || isNaN(Number(price))) {
          console.error('[ServiceWorker] PC resale analysis missing or invalid price:', price);
          return { success: false, error: 'Listing price is required. Could not extract price from this listing.' };
        }
        price = Number(price);

        // Get auth token for API call
        const { authToken: pcAuthToken } = await storageGet(['authToken']);
        if (!pcAuthToken) {
          console.warn('[ServiceWorker] PC resale analysis requires authentication');
          return { success: false, error: 'Please login to use PC Resale Analysis' };
        }

        try {
          const backendUrl = await getBackendUrl();

          // Prepare clean request data
          const requestData = {
            platform: listingData.platform || 'facebook',
            platformListingUrl: listingData.platformListingUrl || '',
            title: listingData.title,
            description: listingData.description || '',
            price: price,
            imageUrls: listingData.imageUrls || [],
            sellerLocation: listingData.sellerLocation || ''
          };

          console.log('[ServiceWorker] Sending PC resale analysis request:', JSON.stringify(requestData, null, 2));

          const response = await fetch(`${backendUrl}/api/pc-resale/analyze`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${pcAuthToken}`
            },
            body: JSON.stringify(requestData)
          });

          if (!response.ok) {
            if (response.status === 401) {
              return { success: false, error: 'Session expired. Please login again.' };
            }
            const errorText = await response.text();
            console.error('[ServiceWorker] PC resale analysis failed:', response.status, errorText);
            return { success: false, error: `API error: ${response.status} - ${errorText}` };
          }

          const data = await response.json();
          console.log('[ServiceWorker] PC resale analysis result:', data);
          return { success: true, data: data.data };
        } catch (error) {
          console.error('[ServiceWorker] PC resale analysis error:', error);
          return { success: false, error: error.message };
        }
      }

      default:
        console.warn('Unknown action:', request.action);
        return { success: false, error: 'Unknown action' };
    }
  } catch (error) {
    console.error('Error in handleMessage:', error);
    return { success: false, error: error.message };
  }
}

// Listen for tab updates to detect login redirects
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    handleTabUpdate(tabId, tab).catch(console.error);
  }
});

async function handleTabUpdate(tabId, tab) {
  const state = await storageGet(['postingStatus', 'currentPlatform', 'pendingTabId']);
  
  const url = tab.url || '';
  
  // Check if this is a pending Facebook tab
  if (state.currentPlatform === 'facebook' &&
      (state.postingStatus === STATE.POSTING || state.postingStatus === STATE.AWAITING_LOGIN)) {
    
    // If we're on the marketplace create item page, just log it
    // The content script will handle form filling via check_pending_work
    if (url.includes('facebook.com/marketplace/create')) {
      console.log('Facebook marketplace create page detected');
      await addLog('Marketplace create page loaded - content script will handle form fill');
    }
    
    // If user is on login page, update status
    if (url.includes('facebook.com/login') || url.includes('facebook.com/?next=')) {
      await updateStatus({ postingStatus: STATE.AWAITING_LOGIN });
    }
  }
  
  // Check if this is a pending Craigslist tab
  if (state.currentPlatform === 'craigslist' &&
      (state.postingStatus === STATE.POSTING || state.postingStatus === STATE.AWAITING_LOGIN)) {
    
    if (url.includes('craigslist.org')) {
      console.log('Craigslist page detected:', url);
      await addLog('Craigslist page loaded - content script will handle form fill');
    }
    
    // If user needs to log in to Craigslist
    if (url.includes('accounts.craigslist.org') || url.includes('/login')) {
      await updateStatus({ postingStatus: STATE.AWAITING_LOGIN });
      await addLog('Craigslist login required');
    }
  }
}

// Implementation of handlers

async function handleStartPosting(request) {
  const { platform, data } = request;
  
  await addLog(`Starting posting to ${platform}`);
  
  // Set initial state
  await updateStatus({
    postingStatus: STATE.POSTING,
    currentPlatform: platform,
    progress: { current: 1, total: 100 },
    lastError: null,
    currentListingData: data
  });

  const url = platform === 'craigslist' 
    ? 'https://post.craigslist.org' 
    : 'https://www.facebook.com/marketplace/create/item';

  return new Promise((resolve) => {
    chrome.tabs.create({ url }, async (tab) => {
      console.log(`Opened ${platform} tab:`, tab.id);
      await addLog(`Opened ${platform} tab: ${tab.id}`);
      
      // Track which tab we're waiting on
      await updateStatus({ pendingTabId: tab.id });
      
      resolve({ success: true, tabId: tab.id });
    });
  });
}

async function handleManualFill() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) {
        resolve({ success: false, error: 'No active tab' });
        return;
      }
      
      const result = await storageGet(['currentListingData']);
      if (!result.currentListingData) {
        resolve({ success: false, error: 'No data loaded' });
        return;
      }
      
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'FILL_FORM',
        data: result.currentListingData
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn("Could not send message to tab:", chrome.runtime.lastError);
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  });
}

async function handleQueueListing(payload) {
  // Payload from React App: { title, price, ... }
  console.log("Queueing listing from bridge:", payload);
  await addLog(`Listing queued from dashboard: ${payload.data?.title || payload.title}`);
  
  // Extract the listing data from the nested structure if present
  const listingData = payload.data || payload;
  
  await storageSet({ 
    currentListingData: listingData,
    postingStatus: STATE.IDLE,
    lastError: null 
  });
  
  return { success: true, message: "Listing queued successfully" };
}

// Fetch listings from the backend API
async function handleFetchListings() {
  const { authToken } = await storageGet(['authToken']);
  
  if (!authToken) {
    await addLog('No auth token found, cannot fetch listings', 'warn');
    return { success: false, error: 'Not authenticated. Please login on the dashboard first.' };
  }

  try {
    await addLog('Fetching listings from backend...');
    
    const backendUrl = await getBackendUrl();
    const response = await fetch(`${backendUrl}/api/listings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        await addLog('Auth token expired or invalid', 'error');
        await storageSet({ authToken: null });
        return { success: false, error: 'Session expired. Please login again on the dashboard.' };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.data) {
      const listings = data.data.listings || [];
      await addLog(`Fetched ${listings.length} listings`);
      
      await storageSet({ 
        userListings: listings,
        listingsLastFetched: Date.now()
      });
      
      return { success: true, listings };
    } else {
      throw new Error(data.error || 'Failed to fetch listings');
    }
  } catch (error) {
    await addLog(`Error fetching listings: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

// Handle workflow step changes from content script
async function handleWorkflowStepChanged(request) {
  const { step, platform, error } = request;
  
  await addLog(`${platform} workflow step: ${step}${error ? ` (error: ${error})` : ''}`);
  
  // Progress mapping for each platform
  const fbProgressMap = {
    [FB_WORKFLOW_STEPS.IDLE]: 0,
    [FB_WORKFLOW_STEPS.UPLOADING_IMAGES]: 15,
    [FB_WORKFLOW_STEPS.FORM_FILL]: 30,
    [FB_WORKFLOW_STEPS.SELECTING_CATEGORY]: 40,
    [FB_WORKFLOW_STEPS.SELECTING_CONDITION]: 45,
    [FB_WORKFLOW_STEPS.CLICKING_NEXT_1]: 50,
    [FB_WORKFLOW_STEPS.LOCATION_DELIVERY]: 60,
    [FB_WORKFLOW_STEPS.CLICKING_NEXT_2]: 70,
    [FB_WORKFLOW_STEPS.VISIBILITY_OPTIONS]: 80,
    [FB_WORKFLOW_STEPS.PUBLISHING]: 90,
    [FB_WORKFLOW_STEPS.COMPLETED]: 100,
    [FB_WORKFLOW_STEPS.ERROR]: -1
  };
  
  const clProgressMap = {
    [CL_WORKFLOW_STEPS.IDLE]: 0,
    [CL_WORKFLOW_STEPS.INITIAL_PAGE]: 5,
    [CL_WORKFLOW_STEPS.SUBAREA_SELECTION]: 10,
    [CL_WORKFLOW_STEPS.HOOD_SELECTION]: 20,
    [CL_WORKFLOW_STEPS.TYPE_SELECTION]: 30,
    [CL_WORKFLOW_STEPS.CATEGORY_SELECTION]: 40,
    [CL_WORKFLOW_STEPS.FORM_FILL]: 55,
    [CL_WORKFLOW_STEPS.IMAGE_UPLOAD]: 75,
    [CL_WORKFLOW_STEPS.MAP_LOCATION]: 85,
    [CL_WORKFLOW_STEPS.PREVIEW]: 92,
    [CL_WORKFLOW_STEPS.PUBLISHING]: 95,
    [CL_WORKFLOW_STEPS.COMPLETED]: 100,
    [CL_WORKFLOW_STEPS.ERROR]: -1
  };
  
  // Update storage with current workflow step based on platform
  if (platform === 'facebook') {
    await updateStatus({
      facebookWorkflowStep: step,
      ...(error && { lastError: error })
    });
  } else if (platform === 'craigslist') {
    await updateStatus({
      craigslistWorkflowStep: step,
      ...(error && { lastError: error })
    });
  }
  
  // Calculate progress percentage based on step and platform
  const progressMap = platform === 'craigslist' ? clProgressMap : fbProgressMap;
  const completedStep = platform === 'craigslist' ? CL_WORKFLOW_STEPS.COMPLETED : FB_WORKFLOW_STEPS.COMPLETED;
  const errorStep = platform === 'craigslist' ? CL_WORKFLOW_STEPS.ERROR : FB_WORKFLOW_STEPS.ERROR;
  
  const progress = progressMap[step] ?? 0;
  
  if (step === completedStep) {
    await updateStatus({
      postingStatus: STATE.COMPLETED,
      progress: { current: 100, total: 100 }
    });
    await addLog(`${platform} listing posted successfully!`);
  } else if (step === errorStep) {
    await updateStatus({
      postingStatus: STATE.ERROR,
      lastError: error || 'Unknown error during posting'
    });
  } else if (progress > 0) {
    await updateStatus({
      progress: { current: progress, total: 100 }
    });
  }
  
  return { success: true };
}

// Get current workflow status for debugging/monitoring
async function getWorkflowStatus() {
  const state = await storageGet([
    'postingStatus',
    'currentPlatform',
    'currentListingData',
    'facebookWorkflowStep',
    'craigslistWorkflowStep',
    'progress',
    'lastError'
  ]);
  
  // Return appropriate workflow step based on platform
  const workflowStep = state.currentPlatform === 'craigslist'
    ? state.craigslistWorkflowStep
    : state.facebookWorkflowStep;
  
  return {
    postingStatus: state.postingStatus,
    platform: state.currentPlatform,
    workflowStep,
    facebookWorkflowStep: state.facebookWorkflowStep,
    craigslistWorkflowStep: state.craigslistWorkflowStep,
    progress: state.progress,
    lastError: state.lastError,
    hasListingData: !!state.currentListingData
  };
}
