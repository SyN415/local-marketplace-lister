// Content script for Craigslist

console.log('Marketplace Lister: Craigslist content script loaded');

// Helper to wait for elements
const waitForElement = (selector, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver((mutations) => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
};

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'FILL_FORM') {
    console.log('Marketplace Lister: Received FILL_FORM command', request.data);
    
    // We can also trigger this logic automatically on page load if we want auto-navigation
    // For now, we listen for the explicit command or check storage on load
    processPage(request.data);
    sendResponse({ success: true });
  } else if (request.action === 'get_listing_data') {
     // Legacy check (kept for compatibility during transition)
      chrome.storage.local.get(['currentListingData'], (result) => {
        if (result.currentListingData) {
            processPage(result.currentListingData);
        }
    });
  }
});

// Also check on load if there's pending work
chrome.storage.local.get(['currentListingData'], (result) => {
  if (result.currentListingData) {
    console.log('Marketplace Lister: Found pending data in storage');
    processPage(result.currentListingData);
  }
});

async function processPage(data) {
  const url = window.location.href;
  console.log('Processing page:', url);

  // 1. Initial Type Selection (e.g. "for sale by owner")
  if (document.querySelector('form.picker') && !url.includes('section')) {
    console.log('Step 1: Type Selection');
    // Try to click "for sale by owner"
    const fsoLink = document.querySelector('label.fso input');
    if (fsoLink) {
        fsoLink.click();
        document.querySelector('button[type="submit"]').click();
    } else {
        // Fallback for different layouts or if already past this
        const fsoAnchor = document.querySelector('a[data-id="fso"]');
        if(fsoAnchor) fsoAnchor.click();
    }
    return;
  }

  // 2. Category Selection
  if (document.querySelector('.cat')) {
      console.log('Step 2: Category Selection');
      // This is hard to map perfectly. 
      // We might need a map of our internal categories to CL categories.
      // For now, let's try to match by text or default to "general for sale"
      
      const categoryMap = {
          'electronics': 'ele',
          'furniture': 'fuo',
          'household': 'hsh',
          'clothing': 'clo',
          'default': 'for' // general for sale
      };

      const targetCat = categoryMap[data.category] || categoryMap['default'];
      const catInput = document.querySelector(`input[value="${targetCat}"]`);
      
      if (catInput) {
          catInput.click();
          document.querySelector('button[type="submit"]').click();
      } else {
           // Try text matching
           const labels = document.querySelectorAll('label');
           for(let l of labels) {
               if(l.textContent.toLowerCase().includes(data.category?.toLowerCase())) {
                   l.querySelector('input')?.click();
                   document.querySelector('button[type="submit"]').click();
                   return;
               }
           }
      }
      return;
  }

  // 3. Main Posting Form
  if (document.querySelector('#PostingTitle')) {
    console.log('Step 3: Main Form');
    
    setField('#PostingTitle', data.title);
    setField('#price', data.price);
    setField('#postal_code', data.zipCode);
    setField('#postingBody', data.description);
    
    // Email is often required on this page or the next
    // We assume the user is logged in, but if there's an email field:
    // setField('#FromEMail', 'user@example.com'); 

    // Handle condition if present
    // ...

    // Scroll to bottom to encourage user review
    window.scrollTo(0, document.body.scrollHeight);
    
    return;
  }

  // 4. Image Upload Page
  if (document.querySelector('#plupload') || document.querySelector('.posting-gallery')) {
      console.log('Step 4: Image Upload');
      if (data.images && data.images.length > 0) {
          await handleImages(data.images);
      }
      return;
  }
}

function setField(selector, value) {
  const element = document.querySelector(selector);
  if (element && value) {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`Filled ${selector}`);
  }
}

async function handleImages(imageUrls) {
    const fileInput = document.querySelector('input[type="file"]');
    if (!fileInput) return;

    console.log('Attempting to upload images...');
    
    // CL uses a specific uploader, but often a standard file input is hidden behind it.
    // We can try the DataTransfer approach.
    
    const dataTransfer = new DataTransfer();
    for (const url of imageUrls) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const filename = url.split('/').pop() || 'image.jpg';
            const file = new File([blob], filename, { type: blob.type });
            dataTransfer.items.add(file);
        } catch (e) {
            console.error('Failed to fetch image', url, e);
        }
    }

    if (dataTransfer.files.length > 0) {
        fileInput.files = dataTransfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('Images added to file input');
        
        // Sometimes need to trigger the visible button
        // const addBtn = document.querySelector('button.new-image');
        // if(addBtn) addBtn.click();
    }
}