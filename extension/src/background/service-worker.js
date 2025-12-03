// Background script to handle navigation, state, and cross-posting logic

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
  FORM_FILL: 'form_fill',
  SELECTING_CATEGORY: 'selecting_category',
  SELECTING_CONDITION: 'selecting_condition',
  UPLOADING_IMAGES: 'uploading_images',
  CLICKING_NEXT_1: 'clicking_next_1',
  LOCATION_DELIVERY: 'location_delivery',
  CLICKING_NEXT_2: 'clicking_next_2',
  VISIBILITY_OPTIONS: 'visibility_options',
  PUBLISHING: 'publishing',
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
  console.log('Background received message:', request.action, request);
  
  // Handle the message asynchronously
  handleMessage(request, sender)
    .then((response) => {
      console.log('Sending response for', request.action, response);
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
          postingStatus: STATE.IDLE,
          lastError: null
        });
        await addLog('Workflow reset');
        return { success: true };
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
  
  // Check if this is a pending Facebook tab
  if (state.currentPlatform === 'facebook' &&
      (state.postingStatus === STATE.POSTING || state.postingStatus === STATE.AWAITING_LOGIN)) {
    
    const url = tab.url || '';
    
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
    
    const response = await fetch(`${API_BASE_URL}/api/listings`, {
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
  
  // Update storage with current workflow step
  await updateStatus({
    facebookWorkflowStep: step,
    ...(error && { lastError: error })
  });
  
  // Calculate progress percentage based on step
  const stepProgressMap = {
    [FB_WORKFLOW_STEPS.IDLE]: 0,
    [FB_WORKFLOW_STEPS.FORM_FILL]: 15,
    [FB_WORKFLOW_STEPS.SELECTING_CATEGORY]: 25,
    [FB_WORKFLOW_STEPS.SELECTING_CONDITION]: 35,
    [FB_WORKFLOW_STEPS.UPLOADING_IMAGES]: 45,
    [FB_WORKFLOW_STEPS.CLICKING_NEXT_1]: 50,
    [FB_WORKFLOW_STEPS.LOCATION_DELIVERY]: 60,
    [FB_WORKFLOW_STEPS.CLICKING_NEXT_2]: 70,
    [FB_WORKFLOW_STEPS.VISIBILITY_OPTIONS]: 80,
    [FB_WORKFLOW_STEPS.PUBLISHING]: 90,
    [FB_WORKFLOW_STEPS.COMPLETED]: 100,
    [FB_WORKFLOW_STEPS.ERROR]: -1
  };
  
  const progress = stepProgressMap[step] ?? 0;
  
  if (step === FB_WORKFLOW_STEPS.COMPLETED) {
    await updateStatus({
      postingStatus: STATE.COMPLETED,
      progress: { current: 100, total: 100 }
    });
    await addLog(`${platform} listing posted successfully!`);
  } else if (step === FB_WORKFLOW_STEPS.ERROR) {
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
    'progress',
    'lastError'
  ]);
  
  return {
    postingStatus: state.postingStatus,
    platform: state.currentPlatform,
    workflowStep: state.facebookWorkflowStep,
    progress: state.progress,
    lastError: state.lastError,
    hasListingData: !!state.currentListingData
  };
}