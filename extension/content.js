// Content script for Craigslist

console.log('Marketplace Lister: Content script loaded');

// Request listing data from background script
chrome.runtime.sendMessage({ action: 'get_listing_data' }, (response) => {
  if (response && response.data) {
    console.log('Marketplace Lister: Received data', response.data);
    fillForm(response.data);
  }
});

function fillForm(data) {
  // Helper to set value and trigger events
  const setField = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) {
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`Filled ${selector}`);
    } else {
      console.warn(`Element not found: ${selector}`);
    }
  };

  // Detect which page/step we are on
  const url = window.location.href;

  // Main posting form (usually has #PostingTitle)
  if (document.querySelector('#PostingTitle')) {
    console.log('Marketplace Lister: Filling main form');
    
    setField('#PostingTitle', data.title);
    setField('#price', data.price);
    setField('#postal_code', data.zipCode);
    setField('#postingBody', data.description);
    
    // Handle specific fields if they exist
    // e.g., condition, language, etc.
    
  } 
  // Initial category selection (simplification for PoC)
  else if (document.querySelector('form.picker')) {
      console.log('Marketplace Lister: On picker page');
      // In a full version, we would navigate through these steps automatically
      // For PoC, we might just alert the user or try to click "for sale by owner"
      
      // Example: Try to select "for sale by owner" if available
      const fsoLink = document.querySelector('a[data-id="fso"]'); // This selector might vary
      if (fsoLink) {
          // fsoLink.click(); 
      }
  }
}