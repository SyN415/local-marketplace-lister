document.addEventListener('DOMContentLoaded', () => {
  const postBtn = document.getElementById('postBtn');
  const statusDiv = document.getElementById('status');
  const listingDataInput = document.getElementById('listingData');

  // Load saved data if available
  chrome.storage.local.get(['lastListing'], (result) => {
    if (result.lastListing) {
      listingDataInput.value = result.lastListing;
    }
  });

  postBtn.addEventListener('click', async () => {
    const dataStr = listingDataInput.value;
    
    try {
      const listingData = JSON.parse(dataStr);
      
      // Save for next time
      chrome.storage.local.set({ lastListing: dataStr });

      statusDiv.textContent = 'Opening Craigslist...';
      
      // Send message to background script to initiate posting
      chrome.runtime.sendMessage({
        action: 'start_posting',
        platform: 'craigslist',
        data: listingData
      }, (response) => {
        if (chrome.runtime.lastError) {
          statusDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
        } else {
          statusDiv.textContent = 'Posting started! Check the new tab.';
        }
      });

    } catch (e) {
      statusDiv.textContent = 'Invalid JSON data. Please check format.';
      console.error(e);
    }
  });
});