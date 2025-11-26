// Background script to handle navigation, state, and cross-posting logic

// State constants
const STATE = {
  IDLE: 'idle',
  POSTING: 'posting',
  COMPLETED: 'completed',
  ERROR: 'error'
};

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
    queue: [],
    logs: [] // Add simple logging for debugging
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

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 1. Handle commands from Popup or Content Scripts
  if (request.action === 'start_posting') {
    handleStartPosting(request, sendResponse);
    return true; // Async response
  } 
  
  else if (request.action === 'stop_posting') {
    updateStatus({ postingStatus: STATE.IDLE, lastError: 'Stopped by user' });
    sendResponse({ success: true });
  }

  else if (request.action === 'get_listing_data') {
    // Content script asking for data
    chrome.storage.local.get(['currentListingData'], (result) => {
      sendResponse({ data: result.currentListingData });
    });
    return true;
  }
  
  else if (request.action === 'trigger_fill') {
    // Manual trigger from popup
    handleManualFill(sendResponse);
    return true;
  }
  
  else if (request.action === 'update_progress') {
      // Content scripts updating their progress
      updateStatus({
          progress: request.progress,
          postingStatus: request.status || STATE.POSTING
      });
  }

  else if (request.action === 'QUEUE_LISTING') {
      // Received from Frontend Bridge
      handleQueueListing(request.payload, sendResponse);
      return true;
  }
});

// Implementation of handlers

function handleStartPosting(request, sendResponse) {
  const { platform, data } = request;
  
  // Set initial state
  updateStatus({
    postingStatus: STATE.POSTING,
    currentPlatform: platform,
    progress: { current: 1, total: 100 }, // Start at 1%
    lastError: null,
    currentListingData: data
  });

  const url = platform === 'craigslist' 
    ? 'https://post.craigslist.org' 
    : 'https://www.facebook.com/marketplace/create/item';

  chrome.tabs.create({ url }, (tab) => {
    console.log(`Opened ${platform} tab:`, tab.id);
    
    // We rely on the content script to wake up and ask for data ('get_listing_data')
    // or we can optimistically send a message if we wait for load.
    // For now, let's just confirm to the caller.
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
             // Handle if content script isn't ready
             if (chrome.runtime.lastError) {
                 console.warn("Could not send message to tab:", chrome.runtime.lastError);
             }
          });
          sendResponse({ success: true });
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
    
    // For now, we just set it as the "current" listing ready to be posted
    // In the future, this could append to a 'queue' array
    chrome.storage.local.set({ 
        currentListingData: payload,
        postingStatus: STATE.IDLE, // Ready state
        lastError: null 
    }, () => {
        sendResponse({ success: true, message: "Listing queued successfully" });
    });
}