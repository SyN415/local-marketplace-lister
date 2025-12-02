// Bridge script to facilitate communication between the Web Dashboard (React) and the Extension

console.log('Marketplace Lister Bridge loaded on', window.location.href);

// Notify the web app that the extension is installed and ready
// We can do this by setting a global variable or dispatching an event
window.postMessage({ type: 'EXTENSION_LOADED', version: chrome.runtime.getManifest().version }, '*');
document.documentElement.dataset.extensionInstalled = true;

// Attempt to grab auth token from localStorage and pass to extension
function syncAuthToken() {
  const token = localStorage.getItem('auth_token');
  if (token) {
    console.log('Bridge: Auth token found, syncing to extension');
    chrome.runtime.sendMessage({ 
      action: 'set_auth_token', 
      token: token 
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Bridge: Failed to sync token:', chrome.runtime.lastError);
      } else {
        console.log('Bridge: Token synced successfully');
      }
    });
  }
}

// Run token sync on load and periodically
syncAuthToken();
setInterval(syncAuthToken, 30000); // Re-sync every 30 seconds

// Listen for messages from the React App
window.addEventListener('message', (event) => {
  // Security check: Ensure message is from the same window
  if (event.source !== window) return;

  const message = event.data;

  // Validate message format
  if (message.type === 'EXTENSION_COMMAND') {
    console.log('Bridge received command:', message);

    if (message.command === 'POST_LISTING') {
      // Forward to Service Worker
      chrome.runtime.sendMessage({
        action: 'QUEUE_LISTING',
        payload: message.payload
      }, (response) => {
        // Send acknowledgement back to React App
        window.postMessage({
          type: 'EXTENSION_RESPONSE',
          command: 'POST_LISTING',
          result: response
        }, '*');
      });
    }
    
    else if (message.command === 'SYNC_TOKEN') {
      // React app explicitly requesting token sync
      syncAuthToken();
      window.postMessage({
        type: 'EXTENSION_RESPONSE',
        command: 'SYNC_TOKEN',
        result: { success: true }
      }, '*');
    }
    
    else if (message.command === 'CHECK_STATUS') {
      // React app checking extension status
      chrome.runtime.sendMessage({ action: 'get_listing_data' }, (response) => {
        window.postMessage({
          type: 'EXTENSION_RESPONSE',
          command: 'CHECK_STATUS',
          result: response
        }, '*');
      });
    }
  }
});

// Optional: Listen for background status updates to forward to the React App
// This allows the dashboard to show real-time progress without polling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'STATUS_UPDATE') {
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'STATUS_UPDATE',
      data: request.data
    }, '*');
  }
  
  if (request.action === 'POSTING_COMPLETE') {
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'POSTING_COMPLETE',
      data: request.data
    }, '*');
  }
  
  if (request.action === 'POSTING_ERROR') {
    window.postMessage({
      type: 'EXTENSION_EVENT',
      event: 'POSTING_ERROR',
      data: request.data
    }, '*');
  }
});

// Observe localStorage changes (for when user logs in/out)
const originalSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key, value) {
  originalSetItem(key, value);
  if (key === 'auth_token') {
    console.log('Bridge: Auth token changed, syncing to extension');
    setTimeout(syncAuthToken, 100);
  }
};

console.log('Marketplace Lister Bridge fully initialized');