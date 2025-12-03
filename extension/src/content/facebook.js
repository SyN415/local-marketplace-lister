// Content script for Facebook Marketplace
console.log('Marketplace Lister: Facebook content script loaded on', window.location.href);

let formFillAttempted = false;
let imagesUploaded = false;

const waitForElement = (selector, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
};

const findInputByLabel = (labelText, inputType = 'input') => {
  const allElements = document.querySelectorAll('label, span, div');
  
  for (const el of allElements) {
    const text = el.textContent?.trim();
    if (text === labelText || text?.startsWith(labelText)) {
      const parent = el.closest('div[class]');
      if (parent) {
        const input = parent.querySelector(inputType);
        if (input) return input;
        
        const nextSibling = parent.nextElementSibling;
        if (nextSibling) {
          const siblingInput = nextSibling.querySelector(inputType);
          if (siblingInput) return siblingInput;
        }
      }
    }
  }
  return null;
};

const findInputByPlaceholder = (placeholderText, inputType = 'input') => {
  const inputs = document.querySelectorAll(inputType);
  for (const input of inputs) {
    const placeholder = input.getAttribute('placeholder') || '';
    if (placeholder.toLowerCase().includes(placeholderText.toLowerCase())) {
      return input;
    }
  }
  return null;
};

const findInputByAttributes = (selectors) => {
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      if (el) return el;
    } catch (e) {
      continue;
    }
  }
  return null;
};

const simulateTyping = async (element, value) => {
  if (!element) return false;
  
  element.focus();
  element.click();
  
  element.value = '';
  element.dispatchEvent(new Event('input', { bubbles: true }));
  
  for (const char of value) {
    element.value += char;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 10));
  }
  
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
  
  return element.value === value;
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Facebook content script received message:', request.action);
  
  if (request.action === 'FILL_FORM') {
    console.log('Marketplace Lister: Received FILL_FORM command', request.data);
    
    if (formFillAttempted) {
      console.log('Form fill already attempted, skipping');
      sendResponse({ success: true, message: 'Already attempted' });
      return true;
    }
    
    formFillAttempted = true;
    
    fillForm(request.data)
      .then(() => {
        console.log('Form fill completed');
        sendResponse({ success: true });
      })
      .catch((err) => {
        console.error('Marketplace Lister: Error filling form', err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
  
  if (request.action === 'CHECK_READY') {
    sendResponse({ ready: true, url: window.location.href });
    return true;
  }
});

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
      
      setTimeout(() => {
        fillForm(response.data)
          .then(() => {
            console.log('Automatic form fill completed');
          })
          .catch((err) => {
            console.error('Automatic form fill failed:', err);
            chrome.runtime.sendMessage({ 
              action: 'posting_error', 
              error: err.message,
              platform: 'facebook'
            });
          });
      }, 3000);
    }
  });
}

function detectLoginPage() {
  const url = window.location.href;
  if (url.includes('/login') || url.includes('?next=')) {
    console.log('Login page detected');
    chrome.runtime.sendMessage({ action: 'login_detected', platform: 'facebook' });
    return true;
  }
  return false;
}

function init() {
  console.log('Facebook content script initializing...');
  
  if (detectLoginPage()) {
    console.log('On login page, waiting for user to login...');
    return;
  }
  
  if (window.location.href.includes('marketplace/create')) {
    console.log('On marketplace create page');
    
    if (document.readyState === 'complete') {
      setTimeout(checkForPendingWork, 2500);
    } else {
      window.addEventListener('load', () => {
        setTimeout(checkForPendingWork, 2500);
      });
    }
  }
}

async function fillForm(data) {
  console.log('Starting Form Fill');
  console.log('Data:', JSON.stringify(data, null, 2));

  chrome.runtime.sendMessage({ 
    action: 'update_progress', 
    progress: { current: 10, total: 100 },
    status: 'posting'
  });

  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const allInputs = document.querySelectorAll('input, textarea');
  console.log('Found inputs on page:', allInputs.length);
  allInputs.forEach((input, i) => {
    console.log(`Input ${i}:`, {
      tag: input.tagName,
      type: input.type,
      placeholder: input.placeholder,
      ariaLabel: input.getAttribute('aria-label'),
      name: input.name,
      id: input.id
    });
  });

  let titleFilled = false;
  try {
    console.log('Looking for Title field...');
    
    let titleInput = findInputByPlaceholder('Title');
    
    if (!titleInput) {
      titleInput = findInputByLabel('Title', 'input');
    }
    
    if (!titleInput) {
      titleInput = findInputByAttributes([
        'input[aria-label="Title"]',
        'input[name="title"]',
        'input[placeholder="Title"]'
      ]);
    }
    
    if (!titleInput) {
      const requiredSection = Array.from(document.querySelectorAll('span, div'))
        .find(el => el.textContent === 'Required');
      if (requiredSection) {
        const container = requiredSection.closest('div[class]')?.parentElement;
        if (container) {
          titleInput = container.querySelector('input[type="text"], input:not([type])');
        }
      }
    }
    
    if (titleInput) {
      console.log('Found title input:', titleInput);
      await simulateTyping(titleInput, data.title);
      titleFilled = true;
      console.log('Title filled');
    } else {
      console.warn('Could not find Title input');
    }
  } catch (e) {
    console.error('Error filling title:', e);
  }

  chrome.runtime.sendMessage({ 
    action: 'update_progress', 
    progress: { current: 25, total: 100 }
  });
  
  await new Promise(resolve => setTimeout(resolve, 500));

  let priceFilled = false;
  try {
    console.log('Looking for Price field...');
    
    let priceInput = findInputByPlaceholder('Price');
    
    if (!priceInput) {
      priceInput = findInputByLabel('Price', 'input');
    }
    
    if (!priceInput) {
      priceInput = findInputByAttributes([
        'input[aria-label="Price"]',
        'input[name="price"]',
        'input[placeholder="Price"]',
        'input[type="number"]'
      ]);
    }
    
    if (!priceInput && titleFilled) {
      const textInputs = document.querySelectorAll('input[type="text"], input:not([type])');
      if (textInputs.length >= 2) {
        priceInput = textInputs[1];
      }
    }
    
    if (priceInput) {
      console.log('Found price input:', priceInput);
      const priceValue = String(data.price).replace(/[$,]/g, '');
      await simulateTyping(priceInput, priceValue);
      priceFilled = true;
      console.log('Price filled');
    } else {
      console.warn('Could not find Price input');
    }
  } catch (e) {
    console.error('Error filling price:', e);
  }

  chrome.runtime.sendMessage({ 
    action: 'update_progress', 
    progress: { current: 40, total: 100 }
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    console.log('Looking for Description field...');
    
    let descInput = document.querySelector('textarea');
    
    if (!descInput) {
      descInput = findInputByPlaceholder('Description', 'textarea');
    }
    
    if (!descInput) {
      descInput = findInputByLabel('Description', 'textarea');
    }
    
    if (descInput && data.description) {
      console.log('Found description textarea:', descInput);
      await simulateTyping(descInput, data.description);
      console.log('Description filled');
    } else if (!descInput) {
      console.warn('Could not find Description textarea');
    }
  } catch (e) {
    console.error('Error filling description:', e);
  }

  chrome.runtime.sendMessage({ 
    action: 'update_progress', 
    progress: { current: 55, total: 100 }
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    console.log('Looking for Category selector...');
    
    const categoryTrigger = findInputByAttributes([
      '[aria-label="Category"]',
      'div[aria-haspopup="listbox"]',
      '[role="combobox"]'
    ]) || findInputByLabel('Category', 'div');
    
    if (categoryTrigger) {
      console.log('Found category trigger, clicking...');
      categoryTrigger.click();
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const categoryText = data.category || 'Furniture';
      const options = document.querySelectorAll('[role="option"], [role="menuitem"], [role="listitem"]');
      
      for (const option of options) {
        if (option.textContent?.toLowerCase().includes(categoryText.toLowerCase())) {
          option.click();
          console.log('Category selected:', categoryText);
          break;
        }
      }
    } else {
      console.log('Category selector not found - may need manual selection');
    }
  } catch (e) {
    console.error('Error with category:', e);
  }

  chrome.runtime.sendMessage({ 
    action: 'update_progress', 
    progress: { current: 65, total: 100 }
  });

  try {
    console.log('Looking for Condition selector...');
    
    const conditionTrigger = findInputByAttributes([
      '[aria-label="Condition"]'
    ]) || findInputByLabel('Condition', 'div');
    
    if (conditionTrigger) {
      conditionTrigger.click();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const conditionMap = {
        'new': ['New', 'Brand New'],
        'like_new': ['Like New', 'Used - Like New'],
        'good': ['Good', 'Used - Good'],
        'fair': ['Fair', 'Used - Fair']
      };
      
      const targetConditions = conditionMap[data.condition?.toLowerCase()] || ['Good'];
      const options = document.querySelectorAll('[role="option"], [role="menuitem"]');
      
      for (const option of options) {
        const text = option.textContent?.trim();
        if (targetConditions.some(t => text?.includes(t))) {
          option.click();
          console.log('Condition selected:', text);
          break;
        }
      }
    }
  } catch (e) {
    console.error('Error with condition:', e);
  }

  if (data.images && data.images.length > 0 && !imagesUploaded) {
    chrome.runtime.sendMessage({ 
      action: 'update_progress', 
      progress: { current: 75, total: 100 }
    });
    await handleImages(data.images);
    imagesUploaded = true;
  }

  chrome.runtime.sendMessage({ 
    action: 'update_progress', 
    progress: { current: 95, total: 100 }
  });

  console.log('Form Fill Complete');
  showNotification('Form filled! Please review and click "Next" to continue.');
}

async function handleImages(imageUrls) {
  console.log('Handling images:', imageUrls);
  
  const fileInput = document.querySelector('input[type="file"][accept*="image"]') 
    || document.querySelector('input[type="file"]');
  
  if (!fileInput) {
    console.warn('No file input found');
    showNotification('Please upload images manually.');
    return;
  }

  try {
    const dataTransfer = new DataTransfer();
    const uniqueUrls = [...new Set(imageUrls)];
    
    console.log('Fetching', uniqueUrls.length, 'unique images');
    
    for (let i = 0; i < uniqueUrls.length; i++) {
      const url = uniqueUrls[i];
      try {
        console.log(`Fetching image ${i + 1}/${uniqueUrls.length}:`, url);
        
        const response = await fetch(url, { 
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const blob = await response.blob();
        const filename = `image_${i + 1}_${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
        dataTransfer.items.add(file);
        
        console.log('Image prepared:', filename, 'size:', blob.size);
      } catch (err) {
        console.error(`Failed to fetch image ${url}:`, err.message);
      }
    }

    if (dataTransfer.files.length > 0) {
      console.log('Uploading', dataTransfer.files.length, 'images...');
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('Images uploaded');
    }
  } catch (e) {
    console.error('Error handling images:', e);
  }
}

function showNotification(message) {
  const existing = document.querySelector('#marketplace-lister-notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.id = 'marketplace-lister-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    max-width: 320px;
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 18px;">✨</span>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 8000);
}

init();