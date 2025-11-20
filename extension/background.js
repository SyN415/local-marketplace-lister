// Background script to handle navigation and state

// Store listing data temporarily
let currentListingData = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'start_posting') {
    if (request.platform === 'craigslist') {
      currentListingData = request.data;
      
      // Open Craigslist post page
      chrome.tabs.create({ url: 'https://post.craigslist.org' }, (tab) => {
        // Wait for tab to load is handled by content script requesting data
        console.log('Opened Craigslist tab:', tab.id);
      });
      
      sendResponse({ success: true });
    }
  } else if (request.action === 'get_listing_data') {
    // Content script asking for data
    sendResponse({ data: currentListingData });
    // Optional: Clear data after sending? 
    // currentListingData = null; 
  }
  return true; // Keep message channel open for async response
});