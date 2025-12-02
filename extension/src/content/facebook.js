// Content script for Facebook Marketplace
console.log('Marketplace Lister: Facebook content script loaded on', window.location.href);

// Track if we've already started form filling
let formFillAttempted = false;

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

// Helper to wait for multiple possible selectors
const waitForAnyElement = (selectors, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    const findElement = () => {
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) return el;
      }
      return null;
    };

    const found = findElement();
    if (found) return resolve(found);

    const observer = new MutationObserver(() => {
      const el = findElement();
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`None of the elements found within ${timeout}ms`));
    }, timeout);
  });
};

// Helper to simulate React input events
const simulateInput = (element, value) => {
  try {
    // Focus the element first
    element.focus();
    
    // Clear existing value
    element.value = '';
    
    // Get the value setter from the prototype
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    if (valueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else if (prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else {
      element.value = value;
    }

    // Dispatch all relevant events
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    
    return true;
  } catch (e) {
    console.error('simulateInput error:', e);
    return false;
  }
};

// Listen for messages from background/popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Facebook content script received message:', request.action);
  
  if (request.action === 'FILL_FORM') {
    console.log('Marketplace Lister: Received FILL_FORM command', request.data);
    formFillAttempted = true;
    
    fillForm(request.data)
      .then(() => {
        console.log('Form fill completed successfully');
        sendResponse({ success: true });
      })
      .catch((err) => {
        console.error('Marketplace Lister: Error filling form', err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Async response
  }
  
  if (request.action === 'CHECK_READY') {
    // Background script checking if content script is ready
    sendResponse({ ready: true, url: window.location.href });
    return true;
  }
});

// Proactive check on page load
function checkForPendingWork() {
  console.log('Checking for pending work...');
  
  chrome.runtime.sendMessage({ action: 'check_pending_work' }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('Could not check pending work:', chrome.runtime.lastError);
      return;
    }
    
    console.log('Pending work response:', response);
    
    if (response && response.shouldAutomate && response.data && !formFillAttempted) {
      console.log('Found pending work, starting form fill...');
      formFillAttempted = true;
      
      // Wait a bit for the page to fully load
      setTimeout(() => {
        fillForm(response.data)
          .then(() => {
            console.log('Automatic form fill completed');
            chrome.runtime.sendMessage({ 
              action: 'update_progress', 
              progress: { current: 50, total: 100 },
              status: 'posting'
            });
          })
          .catch((err) => {
            console.error('Automatic form fill failed:', err);
            chrome.runtime.sendMessage({ 
              action: 'posting_error', 
              error: err.message,
              platform: 'facebook'
            });
          });
      }, 2000);
    }
  });
}

// Detect if we're on login page and notify background
function detectLoginPage() {
  const url = window.location.href;
  
  if (url.includes('/login') || url.includes('?next=')) {
    console.log('Login page detected, notifying background');
    chrome.runtime.sendMessage({ 
      action: 'login_detected', 
      platform: 'facebook' 
    });
    return true;
  }
  return false;
}

// Initialize on page load
function init() {
  console.log('Facebook content script initializing...');
  
  // Check if this is a login page
  if (detectLoginPage()) {
    console.log('On login page, waiting for user to login...');
    return;
  }
  
  // Check if we're on the marketplace create page
  if (window.location.href.includes('marketplace/create')) {
    console.log('On marketplace create page, checking for pending work');
    
    // Wait for page to be ready, then check for pending work
    if (document.readyState === 'complete') {
      setTimeout(checkForPendingWork, 1500);
    } else {
      window.addEventListener('load', () => {
        setTimeout(checkForPendingWork, 1500);
      });
    }
  }
}

async function fillForm(data) {
  console.log('Marketplace Lister: Starting form fill sequence with data:', data);

  // Update progress
  chrome.runtime.sendMessage({ 
    action: 'update_progress', 
    progress: { current: 10, total: 100 },
    status: 'posting'
  });

  // Wait for the form to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 1. Title - try multiple selectors
  try {
    console.log('Looking for title input...');
    const titleSelectors = [
      'label[aria-label="Title"] input',
      'input[aria-label="Title"]',
      'input[placeholder*="Title"]',
      'input[name="title"]',
      '[data-testid="marketplace-create-title"] input'
    ];
    
    const titleInput = await waitForAnyElement(titleSelectors, 8000);
    if (titleInput) {
      simulateInput(titleInput, data.title);
      console.log('✓ Filled Title:', data.title);
      chrome.runtime.sendMessage({ 
        action: 'update_progress', 
        progress: { current: 25, total: 100 }
      });
    }
  } catch (e) {
    console.warn('Could not find Title input:', e.message);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  // 2. Price
  try {
    console.log('Looking for price input...');
    const priceSelectors = [
      'label[aria-label="Price"] input',
      'input[aria-label="Price"]',
      'input[placeholder*="Price"]',
      'input[name="price"]',
      '[data-testid="marketplace-create-price"] input'
    ];
    
    const priceInput = await waitForAnyElement(priceSelectors, 5000);
    if (priceInput) {
      simulateInput(priceInput, String(data.price).replace('$', ''));
      console.log('✓ Filled Price:', data.price);
      chrome.runtime.sendMessage({ 
        action: 'update_progress', 
        progress: { current: 40, total: 100 }
      });
    }
  } catch (e) {
    console.warn('Could not find Price input:', e.message);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  // 3. Description
  try {
    console.log('Looking for description input...');
    const descSelectors = [
      'label[aria-label="Description"] textarea',
      'textarea[aria-label="Description"]',
      'textarea[placeholder*="Description"]',
      'textarea[placeholder*="description"]',
      'textarea[name="description"]',
      '[data-testid="marketplace-create-description"] textarea'
    ];
    
    const descInput = await waitForAnyElement(descSelectors, 5000);
    if (descInput) {
      simulateInput(descInput, data.description || '');
      console.log('✓ Filled Description');
      chrome.runtime.sendMessage({ 
        action: 'update_progress', 
        progress: { current: 55, total: 100 }
      });
    }
  } catch (e) {
    console.warn('Could not find Description input:', e.message);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  // 4. Category (Complex - usually requires clicking)
  console.log('ℹ Category selection requires user interaction in this version.');

  // 5. Condition dropdown (if available)
  try {
    console.log('Looking for condition selector...');
    const conditionSelectors = [
      'label[aria-label="Condition"]',
      '[aria-label="Condition"]',
      '[data-testid="marketplace-create-condition"]'
    ];
    
    const conditionButton = await waitForAnyElement(conditionSelectors, 3000);
    if (conditionButton) {
      conditionButton.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Try to find the right condition option
      const conditionMap = {
        'new': ['New', 'Brand new'],
        'like_new': ['Like New', 'Used - Like New'],
        'good': ['Good', 'Used - Good'],
        'fair': ['Fair', 'Used - Fair']
      };
      
      const conditionOptions = conditionMap[data.condition?.toLowerCase()] || ['Good'];
      for (const optionText of conditionOptions) {
        const options = document.querySelectorAll('[role="option"], [role="menuitem"]');
        for (const option of options) {
          if (option.textContent?.includes(optionText)) {
            option.click();
            console.log('✓ Selected Condition:', optionText);
            break;
          }
        }
      }
    }
  } catch (e) {
    console.warn('Could not set Condition:', e.message);
  }

  // 6. Images
  if (data.images && data.images.length > 0) {
    chrome.runtime.sendMessage({ 
      action: 'update_progress', 
      progress: { current: 70, total: 100 }
    });
    await handleImages(data.images);
  }

  // Update to near-complete
  chrome.runtime.sendMessage({ 
    action: 'update_progress', 
    progress: { current: 90, total: 100 }
  });

  console.log('✓ Form fill sequence completed. Please review and submit manually.');
  
  // Show a helpful message to user
  showNotification('Form filled! Please review and click "Publish" to complete posting.');
}

async function handleImages(imageUrls) {
  console.log('Marketplace Lister: Handling images', imageUrls);
  
  // Find file input - Facebook often hides it but it should be there
  const fileInputSelectors = [
    'input[type="file"][accept*="image"]',
    'input[type="file"]',
    '[data-testid="photo-input"] input'
  ];
  
  let fileInput = null;
  for (const selector of fileInputSelectors) {
    fileInput = document.querySelector(selector);
    if (fileInput) break;
  }
  
  if (!fileInput) {
    console.warn('Could not find file input for images. Please upload manually.');
    showNotification('Please add images manually - auto-upload not available.');
    return;
  }

  try {
    // Fetch images and create blobs
    const dataTransfer = new DataTransfer();
    
    for (const url of imageUrls) {
      try {
        console.log('Fetching image:', url);
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const blob = await response.blob();
        const filename = url.split('/').pop() || `image_${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
        dataTransfer.items.add(file);
        console.log('✓ Image prepared:', filename);
      } catch (err) {
        console.error(`Failed to fetch image: ${url}`, err);
      }
    }

    if (dataTransfer.files.length > 0) {
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✓ Images uploaded to file input:', dataTransfer.files.length);
    }
  } catch (e) {
    console.error('Error handling images:', e);
  }
}

// Helper to show user notifications
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    max-width: 300px;
    animation: slideIn 0.3s ease;
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 18px;">✨</span>
      <span>${message}</span>
    </div>
  `;
  
  // Add animation style
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(notification);
  
  // Remove after 8 seconds
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 300);
  }, 8000);
}

// Start initialization
init();