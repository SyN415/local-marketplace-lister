// Bridge script to facilitate communication between the Web Dashboard (React) and the Extension

console.log('Marketplace Lister Bridge loaded');

// Notify the web app that the extension is installed and ready
// We can do this by setting a global variable or dispatching an event
window.postMessage({ type: 'EXTENSION_LOADED', version: chrome.runtime.getManifest().version }, '*');
document.documentElement.dataset.extensionInstalled = true;

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
    
    // Can handle other commands like CHECK_STATUS, etc.
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
});