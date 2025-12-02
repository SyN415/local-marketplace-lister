// Background script to handle navigation, state, and cross-posting logic

// State constants
const STATE = {
  IDLE: 'idle',
  POSTING: 'posting',
  AWAITING_LOGIN: 'awaiting_login',
  COMPLETED: 'completed',
  ERROR: 'error'
};

// API Configuration - matches frontend API URL
const API_BASE_URL = 'https://local-marketplace-backend-wr5e.onrender.com';

// Initialize state on installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Local Marketplace Lister extension installed');
  resetState();
});

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
    listingsLastFetched: null
  };
  chrome.storage.local.set(initialState);
}

// Update status helper
function updateStatus(updates) {
  chrome.storage.local.get(null, (current) => {
    const newState = { ...current, ...updates };
    chrome.storage.local.set(newState);
  });
}

// Add log entry helper
function addLog(message, level = 'info') {
  chrome.storage.local.get(['logs'], (result) => {
    const logs = result.logs || [];
    logs.push({
      timestamp: new Date().toISOString(),
      level,
      message
    });
    // Keep last 50 logs
    if (logs.length > 50) logs.shift();
    chrome.storage.local.set({ logs });
  });
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action, request);

  // Handle all actions - always return true to indicate async response
  handleMessage(request, sender, sendResponse);
  return true; // Always return true for async
});

// Async message handler
async function handleMessage(request, sender, sendResponse) {
  try {
    switch (request.action) {
      case 'start_posting':
        handleStartPosting(request, sendResponse);
        break;
        
      case 'stop_posting':
        updateStatus({ postingStatus: STATE.IDLE, lastError: 'Stopped by user', pendingTabId: null });
        sendResponse({ success: true });
        break;

      case 'get_listing_data':
        chrome.storage.local.get(['currentListingData', 'postingStatus', 'currentPlatform'], (result) => {
          sendResponse({
            data: result.currentListingData,
            status: result.postingStatus,
            platform: result.currentPlatform
          });
        });
        break;

      case 'check_pending_work':
        chrome.storage.local.get(['postingStatus', 'currentPlatform', 'currentListingData', 'pendingTabId'], (result) => {
          const shouldAutomate = (
            result.postingStatus === STATE.POSTING ||
            result.postingStatus === STATE.AWAITING_LOGIN
          ) && result.currentListingData;
          
          sendResponse({
            shouldAutomate,
            data: result.currentListingData,
            platform: result.currentPlatform,
            status: result.postingStatus
          });
        });
        break;
        
      case 'trigger_fill':
        handleManualFill(sendResponse);
        break;
        
      case 'update_progress':
        updateStatus({
          progress: request.progress,
          postingStatus: request.status || STATE.POSTING
        });
        sendResponse({ success: true });
        break;

      case 'posting_complete':
        addLog(`Posting to ${request.platform} completed successfully`);
        updateStatus({
          postingStatus: STATE.COMPLETED,
          progress: { current: 100, total: 100 },
          pendingTabId: null
        });
        sendResponse({ success: true });
        break;

      case 'posting_error':
        addLog(`Posting error: ${request.error}`, 'error');
        updateStatus({
          postingStatus: STATE.ERROR,
          lastError: request.error,
          pendingTabId: null
        });
        sendResponse({ success: true });
        break;

      case 'login_detected':
        addLog('Facebook login page detected, awaiting user login');
        updateStatus({ postingStatus: STATE.AWAITING_LOGIN });
        sendResponse({ success: true });
        break;

      case 'QUEUE_LISTING':
        handleQueueListing(request.payload, sendResponse);
        break;

      case 'set_auth_token':
        chrome.storage.local.set({ authToken: request.token }, () => {
          addLog('Auth token saved');
          sendResponse({ success: true });
        });
        break;

      case 'fetch_listings':
        await handleFetchListingsAsync(sendResponse);
        break;

      case 'select_listing':
        chrome.storage.local.set({
          currentListingData: request.listing,
          postingStatus: STATE.IDLE
        }, () => {
          sendResponse({ success: true });
        });
        break;

      case 'get_logs':
        chrome.storage.local.get(['logs'], (result) => {
          sendResponse({ logs: result.logs || [] });
        });
        break;
        
      default:
        console.warn('Unknown action:', request.action);
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Listen for tab updates to detect when Facebook loads after login
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.storage.local.get(['postingStatus', 'currentPlatform', 'pendingTabId'], (state) => {
      // Check if this is a pending Facebook tab
      if (state.currentPlatform === 'facebook' && 
          (state.postingStatus === STATE.POSTING || state.postingStatus === STATE.AWAITING_LOGIN)) {
        
        const url = tab.url || '';
        
        // If we're on the marketplace create item page, trigger form fill
        if (url.includes('facebook.com/marketplace/create')) {
          console.log('Facebook marketplace create page detected, sending fill command');
          addLog('Marketplace create page loaded, triggering form fill');
          
          // Small delay to let the page fully render
          setTimeout(() => {
            chrome.storage.local.get(['currentListingData'], (result) => {
              if (result.currentListingData) {
                chrome.tabs.sendMessage(tabId, {
                  action: 'FILL_FORM',
                  data: result.currentListingData
                }, (response) => {
                  if (chrome.runtime.lastError) {
                    console.warn('Could not send fill command:', chrome.runtime.lastError);
                    addLog('Failed to send fill command to content script', 'warn');
                  } else {
                    console.log('Fill command sent successfully');
                  }
                });
              }
            });
          }, 2000);
        }
        
        // If user is on login page, update status
        if (url.includes('facebook.com/login') || url.includes('facebook.com/?next=')) {
          updateStatus({ postingStatus: STATE.AWAITING_LOGIN });
        }
      }
    });
  }
});

// Implementation of handlers

function handleStartPosting(request, sendResponse) {
  const { platform, data } = request;
  
  addLog(`Starting posting to ${platform}`);
  
  // Set initial state
  updateStatus({
    postingStatus: STATE.POSTING,
    currentPlatform: platform,
    progress: { current: 1, total: 100 },
    lastError: null,
    currentListingData: data
  });

  const url = platform === 'craigslist' 
    ? 'https://post.craigslist.org' 
    : 'https://www.facebook.com/marketplace/create/item';

  chrome.tabs.create({ url }, (tab) => {
    console.log(`Opened ${platform} tab:`, tab.id);
    addLog(`Opened ${platform} tab: ${tab.id}`);
    
    // Track which tab we're waiting on
    updateStatus({ pendingTabId: tab.id });
    
    sendResponse({ success: true, tabId: tab.id });
  });
}

function handleManualFill(sendResponse) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.storage.local.get(['currentListingData'], (result) => {
        if (result.currentListingData) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'FILL_FORM',
            data: result.currentListingData
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn("Could not send message to tab:", chrome.runtime.lastError);
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
              sendResponse({ success: true });
            }
          });
        } else {
          sendResponse({ success: false, error: 'No data loaded' });
        }
      });
    } else {
      sendResponse({ success: false, error: 'No active tab' });
    }
  });
}

function handleQueueListing(payload, sendResponse) {
  // Payload from React App: { title, price, ... }
  console.log("Queueing listing from bridge:", payload);
  addLog(`Listing queued from dashboard: ${payload.data?.title || payload.title}`);
  
  // Extract the listing data from the nested structure if present
  const listingData = payload.data || payload;
  
  chrome.storage.local.set({ 
    currentListingData: listingData,
    postingStatus: STATE.IDLE,
    lastError: null 
  }, () => {
    sendResponse({ success: true, message: "Listing queued successfully" });
  });
}

// Fetch listings from the backend API - Promise-based version for async handler
function handleFetchListingsAsync(sendResponse) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authToken'], async (result) => {
      const token = result.authToken;
      
      if (!token) {
        addLog('No auth token found, cannot fetch listings', 'warn');
        sendResponse({ success: false, error: 'Not authenticated. Please login on the dashboard first.' });
        resolve();
        return;
      }

      try {
        addLog('Fetching listings from backend...');
        
        const response = await fetch(`${API_BASE_URL}/api/listings`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            addLog('Auth token expired or invalid', 'error');
            chrome.storage.local.set({ authToken: null });
            sendResponse({ success: false, error: 'Session expired. Please login again on the dashboard.' });
            resolve();
            return;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.data) {
          const listings = data.data.listings || [];
          addLog(`Fetched ${listings.length} listings`);
          
          chrome.storage.local.set({
            userListings: listings,
            listingsLastFetched: Date.now()
          }, () => {
            sendResponse({ success: true, listings });
            resolve();
          });
        } else {
          throw new Error(data.error || 'Failed to fetch listings');
        }
      } catch (error) {
        addLog(`Error fetching listings: ${error.message}`, 'error');
        sendResponse({ success: false, error: error.message });
        resolve();
      }
    });
  });
}