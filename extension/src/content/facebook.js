// Content script for Facebook Marketplace
console.log('Jiggly: Facebook content script loaded on', window.location.href);

// Workflow steps for the posting state machine
const WORKFLOW_STEPS = {
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

// State flags to prevent duplicate operations
let formFillAttempted = false;
let imagesUploaded = false;
let currentWorkflowStep = WORKFLOW_STEPS.IDLE;
let stepCompletionFlags = {};

// Enhanced waitForElement with retry logic
const waitForElement = (selector, timeout = 10000, retries = 3) => {
  return new Promise((resolve, reject) => {
    const attemptFind = (attempt) => {
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
        if (attempt < retries) {
          console.log(`Retry ${attempt + 1}/${retries} for selector: ${selector}`);
          attemptFind(attempt + 1);
        } else {
          reject(new Error(`Element ${selector} not found after ${retries} attempts (${timeout}ms each)`));
        }
      }, timeout / retries);
    };
    
    attemptFind(1);
  });
};

// Wait for any of multiple selectors
const waitForAnyElement = async (selectors, timeout = 10000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el && el.offsetParent !== null) { // Check if visible
          return el;
        }
      } catch (e) {
        continue;
      }
    }
    await new Promise(r => setTimeout(r, 500));
  }
  
  throw new Error(`None of the selectors found: ${selectors.join(', ')}`);
};

// Update workflow step in storage and notify service worker
const updateWorkflowStep = async (step, additionalData = {}) => {
  currentWorkflowStep = step;
  console.log(`Jiggly: Workflow step changed to: ${step}`);
  
  try {
    await chrome.storage.local.set({
      facebookWorkflowStep: step,
      ...additionalData
    });
    
    chrome.runtime.sendMessage({
      action: 'workflow_step_changed',
      step,
      platform: 'facebook',
      ...additionalData
    });
  } catch (e) {
    console.warn('Could not update workflow step:', e);
  }
};

// Retry wrapper for step execution
const withRetry = async (stepName, fn, maxRetries = 3, delayMs = 1500) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Jiggly: Attempting ${stepName} (attempt ${attempt}/${maxRetries})`);
      const result = await fn();
      console.log(`Jiggly: ${stepName} succeeded on attempt ${attempt}`);
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`Jiggly: ${stepName} failed on attempt ${attempt}:`, error.message);
      
      if (attempt < maxRetries) {
        console.log(`Jiggly: Retrying ${stepName} in ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs));
        // Increase delay for subsequent retries
        delayMs = Math.min(delayMs * 1.5, 5000);
      }
    }
  }
  
  // All retries exhausted
  console.error(`Jiggly: ${stepName} failed after ${maxRetries} attempts`);
  throw lastError;
};

// Soft step execution - continues even if step fails
const withSoftRetry = async (stepName, fn, maxRetries = 2, delayMs = 1000) => {
  try {
    return await withRetry(stepName, fn, maxRetries, delayMs);
  } catch (error) {
    console.warn(`Jiggly: ${stepName} failed but continuing workflow:`, error.message);
    showNotification(`⚠️ ${stepName} may need manual attention`);
    return null;
  }
};

// Check if we're on the right page for the current step
const verifyPageState = async (expectedIndicators, timeout = 5000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const pageText = document.body.textContent || '';
    
    for (const indicator of expectedIndicators) {
      if (pageText.includes(indicator)) {
        return true;
      }
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  return false;
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
    console.log('Jiggly: Received FILL_FORM command', request.data);
    
    if (formFillAttempted) {
      console.log('Form fill already attempted, skipping');
      sendResponse({ success: true, message: 'Already attempted' });
      return true;
    }
    
    formFillAttempted = true;
    
    runFullPostingWorkflow(request.data)
      .then(() => {
        console.log('Full posting workflow completed');
        sendResponse({ success: true });
      })
      .catch((err) => {
        console.error('Jiggly: Error in posting workflow', err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
  
  if (request.action === 'CHECK_READY') {
    sendResponse({ ready: true, url: window.location.href, step: currentWorkflowStep });
    return true;
  }
  
  if (request.action === 'GET_WORKFLOW_STATUS') {
    sendResponse({
      step: currentWorkflowStep,
      formFillAttempted,
      imagesUploaded,
      stepCompletionFlags
    });
    return true;
  }
  
  if (request.action === 'RESUME_WORKFLOW') {
    console.log('Jiggly: Resuming workflow from step:', request.fromStep);
    resumeWorkflowFromStep(request.fromStep, request.data)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
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
      console.log('Found pending work, starting full posting workflow...');
      formFillAttempted = true;
      
      setTimeout(() => {
        runFullPostingWorkflow(response.data)
          .then(() => {
            console.log('Automatic posting workflow completed');
          })
          .catch((err) => {
            console.error('Automatic posting workflow failed:', err);
            updateWorkflowStep(WORKFLOW_STEPS.ERROR, { error: err.message });
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
    
    // Restore workflow step from storage if available
    chrome.storage.local.get(['facebookWorkflowStep'], (result) => {
      if (result.facebookWorkflowStep) {
        currentWorkflowStep = result.facebookWorkflowStep;
        console.log('Restored workflow step:', currentWorkflowStep);
      }
    });
    
    if (document.readyState === 'complete') {
      setTimeout(checkForPendingWork, 2500);
    } else {
      window.addEventListener('load', () => {
        setTimeout(checkForPendingWork, 2500);
      });
    }
  }
}

// Resume workflow from a specific step (useful after page navigation)
async function resumeWorkflowFromStep(fromStep, data) {
  console.log('Resuming workflow from step:', fromStep);
  
  switch (fromStep) {
    case WORKFLOW_STEPS.CLICKING_NEXT_1:
      await clickNextButton(1);
      await handleLocationAndDelivery(data);
      await clickNextButton(2);
      await handleVisibilityOptions(data);
      await clickPublishButton();
      break;
    case WORKFLOW_STEPS.LOCATION_DELIVERY:
      await handleLocationAndDelivery(data);
      await clickNextButton(2);
      await handleVisibilityOptions(data);
      await clickPublishButton();
      break;
    case WORKFLOW_STEPS.CLICKING_NEXT_2:
      await clickNextButton(2);
      await handleVisibilityOptions(data);
      await clickPublishButton();
      break;
    case WORKFLOW_STEPS.VISIBILITY_OPTIONS:
      await handleVisibilityOptions(data);
      await clickPublishButton();
      break;
    case WORKFLOW_STEPS.PUBLISHING:
      await clickPublishButton();
      break;
    default:
      console.log('Cannot resume from step:', fromStep);
  }
}

// Main orchestrator function that runs the full posting workflow
async function runFullPostingWorkflow(data) {
  console.log('Starting full posting workflow');
  console.log('Data:', JSON.stringify(data, null, 2));
  
  try {
    // Step 1: Fill the form (title, price, description)
    await updateWorkflowStep(WORKFLOW_STEPS.FORM_FILL);
    await withRetry('Fill Form', () => fillForm(data), 2, 1000);
    
    // Step 2: Select category (soft retry - continue if fails)
    await updateWorkflowStep(WORKFLOW_STEPS.SELECTING_CATEGORY);
    await withSoftRetry('Select Category', () => selectCategory(data), 2, 800);
    
    // Step 3: Select condition (soft retry - continue if fails)
    await updateWorkflowStep(WORKFLOW_STEPS.SELECTING_CONDITION);
    await withSoftRetry('Select Condition', () => selectCondition(data), 2, 800);
    
    // Step 4: Upload images
    if (data.images && data.images.length > 0 && !imagesUploaded) {
      await updateWorkflowStep(WORKFLOW_STEPS.UPLOADING_IMAGES);
      await withSoftRetry('Upload Images', () => handleImages(data.images), 2, 1500);
      imagesUploaded = true;
    }
    
    // Wait for any pending uploads to process
    await new Promise(r => setTimeout(r, 2500));
    
    // Step 5: Click first "Next" button (critical step with retry)
    await updateWorkflowStep(WORKFLOW_STEPS.CLICKING_NEXT_1);
    await withRetry('Click Next (Step 1)', () => clickNextButton(1), 3, 2000);
    
    // Verify we moved to the next screen
    await new Promise(r => setTimeout(r, 1500));
    
    // Step 6: Handle Location & Delivery (soft retry)
    await updateWorkflowStep(WORKFLOW_STEPS.LOCATION_DELIVERY);
    await withSoftRetry('Location & Delivery', () => handleLocationAndDelivery(data), 2, 1000);
    
    // Step 7: Click second "Next" button (critical step with retry)
    await updateWorkflowStep(WORKFLOW_STEPS.CLICKING_NEXT_2);
    await withRetry('Click Next (Step 2)', () => clickNextButton(2), 3, 2000);
    
    // Verify we moved to the visibility screen
    await new Promise(r => setTimeout(r, 1500));
    
    // Step 8: Handle Visibility Options (soft retry)
    await updateWorkflowStep(WORKFLOW_STEPS.VISIBILITY_OPTIONS);
    await withSoftRetry('Visibility Options', () => handleVisibilityOptions(data), 2, 1000);
    
    // Step 9: Click Publish button (critical step with retry)
    await updateWorkflowStep(WORKFLOW_STEPS.PUBLISHING);
    await withRetry('Click Publish', () => clickPublishButton(), 3, 2000);
    
    // Complete!
    await updateWorkflowStep(WORKFLOW_STEPS.COMPLETED);
    
    chrome.runtime.sendMessage({
      action: 'posting_complete',
      platform: 'facebook'
    });
    
    showNotification('🎉 Listing published successfully on Facebook Marketplace!');
    
  } catch (error) {
    console.error('Workflow error:', error);
    await updateWorkflowStep(WORKFLOW_STEPS.ERROR, { error: error.message });
    
    // Show helpful notification to user
    showNotification(`⚠️ Workflow paused: ${error.message}. Please complete manually.`);
    
    throw error;
  }
}

async function fillForm(data) {
  console.log('Starting Form Fill (basic fields only)');

  chrome.runtime.sendMessage({
    action: 'update_progress',
    progress: { current: 10, total: 100 },
    status: 'posting'
  });

  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Debug: Log all inputs found on page
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

  // Fill Title
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
      stepCompletionFlags.titleFilled = true;
      console.log('Title filled');
    } else {
      console.warn('Could not find Title input');
    }
  } catch (e) {
    console.error('Error filling title:', e);
  }

  chrome.runtime.sendMessage({
    action: 'update_progress',
    progress: { current: 15, total: 100 }
  });
  
  await new Promise(resolve => setTimeout(resolve, 500));

  // Fill Price
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
      stepCompletionFlags.priceFilled = true;
      console.log('Price filled');
    } else {
      console.warn('Could not find Price input');
    }
  } catch (e) {
    console.error('Error filling price:', e);
  }

  chrome.runtime.sendMessage({
    action: 'update_progress',
    progress: { current: 20, total: 100 }
  });

  await new Promise(resolve => setTimeout(resolve, 500));

  // Fill Description
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
      stepCompletionFlags.descriptionFilled = true;
      console.log('Description filled');
    } else if (!descInput) {
      console.warn('Could not find Description textarea');
    }
  } catch (e) {
    console.error('Error filling description:', e);
  }

  chrome.runtime.sendMessage({
    action: 'update_progress',
    progress: { current: 25, total: 100 }
  });

  console.log('Basic form fields filled');
}

// Select category from dropdown
async function selectCategory(data) {
  console.log('Selecting category...');
  
  await new Promise(resolve => setTimeout(resolve, 800));

  // First, find and click the category dropdown trigger
  // Look for elements that contain "Category" text and have a dropdown indicator
  const categoryContainers = document.querySelectorAll('div');
  let categoryDropdown = null;
  
  for (const div of categoryContainers) {
    const text = div.textContent || '';
    // Look for the Category label section
    if (text.includes('Category') && text.includes('Please select') && div.querySelector('[role="button"], [aria-haspopup]')) {
      categoryDropdown = div.querySelector('[role="button"], [aria-haspopup], [role="combobox"]');
      if (categoryDropdown) break;
    }
  }
  
  // Fallback: look for aria-label
  if (!categoryDropdown) {
    categoryDropdown = document.querySelector('[aria-label="Category"]') ||
                       document.querySelector('[aria-label*="category"]');
  }
  
  // Another fallback: find by the label text
  if (!categoryDropdown) {
    const labels = document.querySelectorAll('label, span');
    for (const label of labels) {
      if (label.textContent?.trim() === 'Category') {
        const parent = label.closest('div');
        if (parent) {
          categoryDropdown = parent.querySelector('[role="button"], [role="combobox"], div[tabindex]');
        }
        break;
      }
    }
  }
  
  if (categoryDropdown) {
    console.log('Found category dropdown, clicking to open...');
    categoryDropdown.click();
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Determine category to select
    let categoryText = data.category;
    if (!categoryText) {
      categoryText = inferCategoryFromTitle(data.title, data.description);
    }
    
    console.log('Looking for category:', categoryText);
    
    // Wait for dropdown menu to appear
    await new Promise(r => setTimeout(r, 500));
    
    // Look for category options - they should be visible now
    // Try searching in a menu/listbox that just appeared
    const menuItems = document.querySelectorAll('[role="option"], [role="menuitem"], [role="listitem"], [role="menuitemradio"]');
    console.log('Found', menuItems.length, 'menu items');
    
    let categoryFound = false;
    const categoryKeywords = categoryText.toLowerCase().split(/[\s&]+/).filter(w => w.length > 2);
    
    // First pass: try exact or close match
    for (const option of menuItems) {
      const optionText = option.textContent?.toLowerCase() || '';
      
      // Check for keyword matches
      const matchScore = categoryKeywords.filter(kw => optionText.includes(kw)).length;
      if (matchScore >= 1) {
        console.log('Found matching category option:', option.textContent);
        option.click();
        stepCompletionFlags.categorySelected = true;
        categoryFound = true;
        await new Promise(r => setTimeout(r, 500));
        break;
      }
    }
    
    // If no match, look for visible category buttons from the page log
    // The screenshot shows buttons like "Sofas, Loveseats & Sectionals", "Furniture", etc.
    if (!categoryFound) {
      const allButtons = document.querySelectorAll('[role="button"]');
      const validCategoryNames = ['furniture', 'electronics', 'home', 'garden', 'clothing', 'toys', 'sports', 'books', 'miscellaneous', 'general', 'household', 'sofas'];
      
      for (const btn of allButtons) {
        const btnText = btn.textContent?.toLowerCase() || '';
        if (validCategoryNames.some(cat => btnText.includes(cat)) && btn.offsetParent !== null) {
          console.log('Clicking category button:', btn.textContent);
          btn.click();
          stepCompletionFlags.categorySelected = true;
          categoryFound = true;
          await new Promise(r => setTimeout(r, 500));
          break;
        }
      }
    }
    
    if (!categoryFound) {
      console.warn('Could not find matching category - listing all visible options:');
      menuItems.forEach((item, i) => console.log(`  Option ${i}: ${item.textContent?.substring(0, 50)}`));
      throw new Error('Category selection failed - no matching option found');
    }
  } else {
    // Check if category is already selected (no warning icon visible)
    const categoryWarning = document.querySelector('[aria-label*="Category"] [aria-invalid="true"]');
    if (!categoryWarning) {
      console.log('Category may already be selected or not required');
    } else {
      console.error('Category dropdown not found');
      throw new Error('Category dropdown not found');
    }
  }

  chrome.runtime.sendMessage({
    action: 'update_progress',
    progress: { current: 30, total: 100 }
  });
}

// Infer category from title/description
function inferCategoryFromTitle(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  const categoryKeywords = {
    'Electronics': ['phone', 'laptop', 'computer', 'tablet', 'tv', 'television', 'camera', 'gaming', 'console', 'headphones', 'speaker'],
    'Furniture': ['chair', 'table', 'desk', 'sofa', 'couch', 'bed', 'dresser', 'cabinet', 'shelf', 'bookcase'],
    'Clothing': ['shirt', 'pants', 'dress', 'shoes', 'jacket', 'coat', 'jeans', 'sweater', 'sneakers'],
    'Home': ['decor', 'lamp', 'rug', 'curtain', 'pillow', 'blanket', 'kitchen', 'appliance'],
    'Toys': ['toy', 'game', 'puzzle', 'lego', 'doll', 'action figure', 'board game'],
    'Sports': ['bike', 'bicycle', 'golf', 'tennis', 'basketball', 'football', 'fitness', 'gym', 'weights'],
    'Books': ['book', 'textbook', 'magazine', 'novel'],
    'Baby': ['baby', 'stroller', 'crib', 'diaper', 'infant', 'toddler'],
    'Vehicles': ['car', 'truck', 'motorcycle', 'scooter', 'boat', 'auto'],
    'Tools': ['tool', 'drill', 'saw', 'hammer', 'wrench', 'screwdriver']
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'Miscellaneous';
}

// Select condition from dropdown
async function selectCondition(data) {
  console.log('Selecting condition...');
  
  await new Promise(resolve => setTimeout(resolve, 800));

  // Find condition dropdown trigger
  let conditionDropdown = null;
  
  // Look for elements containing "Condition" text
  const conditionContainers = document.querySelectorAll('div');
  for (const div of conditionContainers) {
    const text = div.textContent || '';
    if (text.includes('Condition') && text.includes('Please select') && div.querySelector('[role="button"], [aria-haspopup]')) {
      conditionDropdown = div.querySelector('[role="button"], [aria-haspopup], [role="combobox"]');
      if (conditionDropdown) break;
    }
  }
  
  // Fallback: aria-label
  if (!conditionDropdown) {
    conditionDropdown = document.querySelector('[aria-label="Condition"]') ||
                        document.querySelector('[aria-label*="condition"]');
  }
  
  // Another fallback: find by label
  if (!conditionDropdown) {
    const labels = document.querySelectorAll('label, span');
    for (const label of labels) {
      if (label.textContent?.trim() === 'Condition') {
        const parent = label.closest('div');
        if (parent) {
          conditionDropdown = parent.querySelector('[role="button"], [role="combobox"], div[tabindex]');
        }
        break;
      }
    }
  }
  
  if (conditionDropdown) {
    console.log('Found condition dropdown, clicking to open...');
    conditionDropdown.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const conditionMap = {
      'new': ['new', 'brand new'],
      'like_new': ['like new', 'used - like new'],
      'good': ['good', 'used - good'],
      'fair': ['fair', 'used - fair'],
      'used': ['used']
    };
    
    const dataCondition = data.condition?.toLowerCase().replace(/[\s-]+/g, '_') || 'good';
    const targetConditions = conditionMap[dataCondition] || conditionMap['good'];
    
    console.log('Looking for condition options:', targetConditions);
    
    // Wait for dropdown to render
    await new Promise(r => setTimeout(r, 500));
    
    // Look for condition options
    const options = document.querySelectorAll('[role="option"], [role="menuitem"], [role="menuitemradio"], [role="radio"]');
    console.log('Found', options.length, 'condition options');
    
    let conditionFound = false;
    
    for (const option of options) {
      const text = option.textContent?.toLowerCase().trim() || '';
      console.log('  Checking option:', text);
      
      if (targetConditions.some(t => text.includes(t))) {
        console.log('Clicking condition option:', option.textContent);
        option.click();
        stepCompletionFlags.conditionSelected = true;
        conditionFound = true;
        await new Promise(r => setTimeout(r, 500));
        break;
      }
    }
    
    // Fallback: click first available condition if no match
    if (!conditionFound && options.length > 0) {
      const validConditions = ['new', 'like new', 'good', 'fair', 'used'];
      for (const option of options) {
        const text = option.textContent?.toLowerCase() || '';
        if (validConditions.some(c => text.includes(c))) {
          console.log('Fallback - clicking first valid condition:', option.textContent);
          option.click();
          stepCompletionFlags.conditionSelected = true;
          conditionFound = true;
          break;
        }
      }
    }
    
    if (!conditionFound) {
      console.warn('Could not find matching condition option');
      options.forEach((opt, i) => console.log(`  Option ${i}: ${opt.textContent?.substring(0, 30)}`));
      throw new Error('Condition selection failed');
    }
  } else {
    // Check if condition is already selected
    const conditionWarning = document.querySelector('[aria-label*="Condition"] [aria-invalid="true"]');
    if (!conditionWarning) {
      console.log('Condition may already be selected or not required');
    } else {
      console.error('Condition dropdown not found');
      throw new Error('Condition dropdown not found');
    }
  }

  chrome.runtime.sendMessage({
    action: 'update_progress',
    progress: { current: 35, total: 100 }
  });
}

// Click the "Next" button (called twice in the workflow)
async function clickNextButton(buttonNumber = 1) {
  console.log(`Looking for Next button #${buttonNumber}...`);
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Find the Next button
  let nextButton = null;
  
  // Primary: Look for aria-label="Next"
  const nextButtons = document.querySelectorAll('[aria-label="Next"], [aria-label="next"]');
  for (const btn of nextButtons) {
    if (btn.offsetParent !== null) {
      nextButton = btn;
      break;
    }
  }
  
  // Fallback: Find by text content
  if (!nextButton) {
    const allButtons = document.querySelectorAll('[role="button"], button');
    for (const btn of allButtons) {
      if (btn.textContent?.trim() === 'Next' && btn.offsetParent !== null) {
        nextButton = btn;
        break;
      }
    }
  }
  
  if (!nextButton) {
    console.error(`Next button #${buttonNumber} not found`);
    throw new Error(`Next button #${buttonNumber} not found - please click manually`);
  }
  
  // CRITICAL: Check if button is disabled
  const isDisabled = nextButton.getAttribute('aria-disabled') === 'true' ||
                     nextButton.hasAttribute('disabled') ||
                     nextButton.classList.contains('disabled');
  
  if (isDisabled) {
    console.error(`Next button #${buttonNumber} is DISABLED - form validation failed`);
    
    // Check what's missing
    const missingFields = [];
    
    // Check category
    const categorySection = Array.from(document.querySelectorAll('div')).find(d =>
      d.textContent?.includes('Category') && d.textContent?.includes('Please select'));
    if (categorySection) {
      missingFields.push('Category');
    }
    
    // Check condition
    const conditionSection = Array.from(document.querySelectorAll('div')).find(d =>
      d.textContent?.includes('Condition') && d.textContent?.includes('Please select'));
    if (conditionSection) {
      missingFields.push('Condition');
    }
    
    const errorMsg = `Next button is disabled. Missing: ${missingFields.join(', ') || 'unknown fields'}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  console.log(`Found Next button #${buttonNumber} (enabled):`, nextButton);
  
  // Scroll into view
  nextButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await new Promise(r => setTimeout(r, 300));
  
  // Record current URL to detect navigation
  const urlBefore = window.location.href;
  const pageContentBefore = document.body.innerHTML.length;
  
  // Click the button
  nextButton.click();
  
  // Also dispatch events for React
  nextButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  nextButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  nextButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  
  console.log(`Clicked Next button #${buttonNumber}`);
  
  // Wait for page transition
  await new Promise(r => setTimeout(r, 2500));
  
  // Verify something changed (page content should be different)
  const pageContentAfter = document.body.innerHTML.length;
  const contentChanged = Math.abs(pageContentAfter - pageContentBefore) > 500;
  
  if (!contentChanged) {
    console.warn('Page content may not have changed after clicking Next');
    // Additional wait and re-check
    await new Promise(r => setTimeout(r, 1500));
  }
  
  stepCompletionFlags[`nextButton${buttonNumber}Clicked`] = true;
  
  chrome.runtime.sendMessage({
    action: 'update_progress',
    progress: { current: buttonNumber === 1 ? 50 : 70, total: 100 }
  });
  
  return true;
}

// Handle Location and Delivery options (second screen)
async function handleLocationAndDelivery(data) {
  console.log('Handling Location and Delivery options...');
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Handle Location field
  try {
    const locationSelectors = [
      'input[aria-label*="Location"]',
      'input[aria-label*="location"]',
      'input[placeholder*="Location"]',
      'input[placeholder*="location"]',
      'input[placeholder*="city"]',
      'input[placeholder*="City"]',
      '[aria-label*="Meetup location"]'
    ];
    
    let locationInput = null;
    for (const selector of locationSelectors) {
      try {
        locationInput = document.querySelector(selector);
        if (locationInput) break;
      } catch (e) {
        continue;
      }
    }
    
    if (!locationInput) {
      locationInput = findInputByLabel('Location', 'input');
    }
    
    if (locationInput) {
      const locationValue = data.location || data.city || 'Local area';
      console.log('Found location input, filling with:', locationValue);
      
      await simulateTyping(locationInput, locationValue);
      
      // Wait for location suggestions to appear
      await new Promise(r => setTimeout(r, 1500));
      
      // Try to click the first suggestion
      const suggestions = document.querySelectorAll('[role="option"], [role="listitem"], [data-testid*="location"]');
      if (suggestions.length > 0) {
        suggestions[0].click();
        console.log('Selected first location suggestion');
      }
      
      stepCompletionFlags.locationFilled = true;
    } else {
      console.log('Location input not found - may be pre-filled or not required');
    }
  } catch (e) {
    console.error('Error with location:', e);
  }
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Handle Delivery/Meetup options
  try {
    console.log('Looking for delivery options...');
    
    // Default to "Public meetup" if available
    const deliveryPreference = data.deliveryMethod || 'public meetup';
    
    const deliveryKeywords = {
      'public meetup': ['public meetup', 'public meet', 'meetup'],
      'door pickup': ['door pickup', 'pickup at', 'buyer pickup', 'pickup'],
      'door dropoff': ['door dropoff', 'drop off', 'dropoff', 'delivery', 'seller dropoff']
    };
    
    const targetKeywords = deliveryKeywords[deliveryPreference.toLowerCase()] || deliveryKeywords['public meetup'];
    
    // Look for checkboxes or radio buttons for delivery options
    const checkboxes = document.querySelectorAll('input[type="checkbox"], input[type="radio"], [role="checkbox"], [role="radio"]');
    
    for (const checkbox of checkboxes) {
      const label = checkbox.closest('label') || checkbox.parentElement;
      const labelText = label?.textContent?.toLowerCase() || '';
      
      for (const keyword of targetKeywords) {
        if (labelText.includes(keyword)) {
          if (!checkbox.checked) {
            checkbox.click();
            console.log('Selected delivery option:', labelText);
          }
          stepCompletionFlags.deliverySelected = true;
          break;
        }
      }
    }
    
    // Also look for clickable divs/buttons that might be delivery options
    const allButtons = document.querySelectorAll('[role="button"], [role="option"]');
    for (const btn of allButtons) {
      const text = btn.textContent?.toLowerCase() || '';
      for (const keyword of targetKeywords) {
        if (text.includes(keyword) && btn.offsetParent !== null) {
          btn.click();
          console.log('Clicked delivery option button:', text);
          stepCompletionFlags.deliverySelected = true;
          break;
        }
      }
    }
    
  } catch (e) {
    console.error('Error with delivery options:', e);
  }
  
  chrome.runtime.sendMessage({
    action: 'update_progress',
    progress: { current: 60, total: 100 }
  });
  
  console.log('Location and Delivery handling complete');
}

// Handle Visibility options (third screen)
async function handleVisibilityOptions(data) {
  console.log('Handling Visibility options...');
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Check "List publicly on Marketplace" if it's a checkbox
  try {
    console.log('Looking for marketplace visibility checkbox...');
    
    const marketplaceSelectors = [
      'input[type="checkbox"][aria-label*="Marketplace"]',
      'input[type="checkbox"][aria-label*="marketplace"]',
      '[role="checkbox"][aria-label*="Marketplace"]',
      '[role="checkbox"][aria-label*="marketplace"]'
    ];
    
    for (const selector of marketplaceSelectors) {
      try {
        const checkbox = document.querySelector(selector);
        if (checkbox && !checkbox.checked && checkbox.getAttribute('aria-checked') !== 'true') {
          checkbox.click();
          console.log('Checked marketplace visibility option');
          stepCompletionFlags.marketplaceVisibilitySet = true;
          break;
        } else if (checkbox) {
          console.log('Marketplace visibility already checked');
          stepCompletionFlags.marketplaceVisibilitySet = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Fallback: Look for text containing "Marketplace"
    const allCheckboxes = document.querySelectorAll('[role="checkbox"], input[type="checkbox"]');
    for (const cb of allCheckboxes) {
      const parent = cb.closest('div[class]');
      if (parent?.textContent?.includes('Marketplace') && cb.getAttribute('aria-checked') !== 'true') {
        cb.click();
        console.log('Checked marketplace option via fallback');
        stepCompletionFlags.marketplaceVisibilitySet = true;
        break;
      }
    }
  } catch (e) {
    console.error('Error setting marketplace visibility:', e);
  }
  
  await new Promise(r => setTimeout(r, 500));
  
  // Optionally select Facebook groups
  if (data.postToGroups !== false) {
    try {
      console.log('Looking for group checkboxes...');
      
      // Look for group selection area
      const groupCheckboxes = document.querySelectorAll('[role="checkbox"], input[type="checkbox"]');
      let groupsSelected = 0;
      const maxGroups = data.maxGroups || 5; // Limit groups to prevent spam
      
      for (const checkbox of groupCheckboxes) {
        if (groupsSelected >= maxGroups) break;
        
        const parent = checkbox.closest('div');
        const text = parent?.textContent || '';
        
        // Skip if it's the Marketplace checkbox
        if (text.toLowerCase().includes('marketplace') && !text.toLowerCase().includes('group')) {
          continue;
        }
        
        // Check if this looks like a group option
        const isGroupOption = text.includes('Group') ||
                              text.includes('group') ||
                              checkbox.getAttribute('aria-label')?.includes('group');
        
        if (isGroupOption && checkbox.getAttribute('aria-checked') !== 'true') {
          checkbox.click();
          groupsSelected++;
          console.log(`Selected group ${groupsSelected}:`, text.substring(0, 50));
          await new Promise(r => setTimeout(r, 200));
        }
      }
      
      if (groupsSelected > 0) {
        stepCompletionFlags.groupsSelected = groupsSelected;
        console.log(`Selected ${groupsSelected} groups`);
      }
    } catch (e) {
      console.error('Error selecting groups:', e);
    }
  }
  
  chrome.runtime.sendMessage({
    action: 'update_progress',
    progress: { current: 80, total: 100 }
  });
  
  console.log('Visibility options handling complete');
}

// Click the Publish/Create Listing button
async function clickPublishButton() {
  console.log('Looking for Publish button...');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const publishSelectors = [
    'div[aria-label="Publish"]',
    'div[aria-label="publish"]',
    '[aria-label="Create listing"]',
    '[aria-label="Post"]',
    'button:has-text("Publish")',
    'button:has-text("Post")',
    '[role="button"]:has(span:has-text("Publish"))',
    '[role="button"]:has(span:has-text("Post"))',
    '[data-testid="marketplace-create-listing-publish-button"]'
  ];
  
  let publishButton = null;
  
  // Try each selector
  for (const selector of publishSelectors) {
    try {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent?.toLowerCase() || '';
        if ((text.includes('publish') || text.includes('post') || text.includes('create listing')) &&
            el.offsetParent !== null) {
          publishButton = el;
          break;
        }
      }
      if (publishButton) break;
    } catch (e) {
      continue;
    }
  }
  
  // Fallback: Find by text content
  if (!publishButton) {
    const allButtons = document.querySelectorAll('[role="button"], button');
    for (const btn of allButtons) {
      const text = btn.textContent?.trim().toLowerCase();
      if ((text === 'publish' || text === 'post' || text === 'create listing') &&
          btn.offsetParent !== null) {
        publishButton = btn;
        break;
      }
    }
  }
  
  // Final fallback: Search more aggressively
  if (!publishButton) {
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      const text = el.textContent?.trim().toLowerCase();
      const children = el.children.length;
      
      if ((text === 'publish' || text === 'post') && children <= 2 && el.offsetParent !== null) {
        const style = window.getComputedStyle(el);
        if (style.cursor === 'pointer' || el.onclick || el.getAttribute('role') === 'button') {
          publishButton = el;
          break;
        }
        const parent = el.parentElement;
        if (parent && (parent.getAttribute('role') === 'button' || parent.onclick)) {
          publishButton = parent;
          break;
        }
      }
    }
  }
  
  if (publishButton) {
    console.log('Found Publish button:', publishButton);
    
    // Scroll into view
    publishButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(r => setTimeout(r, 300));
    
    // Try multiple click methods
    try {
      publishButton.click();
    } catch (e) {
      console.warn('Direct click failed');
    }
    
    try {
      publishButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      publishButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      publishButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    } catch (e) {
      console.warn('Mouse event dispatch failed');
    }
    
    console.log('Clicked Publish button!');
    
    stepCompletionFlags.publishClicked = true;
    
    chrome.runtime.sendMessage({
      action: 'update_progress',
      progress: { current: 95, total: 100 }
    });
    
    // Wait for publish to complete
    await new Promise(r => setTimeout(r, 3000));
    
    // Check for success indicators
    const successIndicators = [
      'Your listing is live',
      'Posted',
      'Successfully posted',
      'Listing created',
      'Your item is now listed',
      'Congratulations'
    ];
    
    const pageText = document.body.textContent || '';
    for (const indicator of successIndicators) {
      if (pageText.includes(indicator)) {
        console.log('Publish success detected!');
        stepCompletionFlags.publishSuccess = true;
        break;
      }
    }
    
    // Also check if URL changed (redirect after success)
    if (window.location.href.includes('/marketplace/item/') ||
        window.location.href.includes('/marketplace/you/')) {
      console.log('URL changed - likely successful publish');
      stepCompletionFlags.publishSuccess = true;
    }
    
    return true;
  } else {
    console.error('Publish button not found');
    // Log page state for debugging
    console.log('Current page buttons:',
      Array.from(document.querySelectorAll('[role="button"], button'))
        .map(b => ({ text: b.textContent?.trim().substring(0, 30), visible: b.offsetParent !== null }))
        .filter(b => b.visible)
    );
    showNotification('⚠️ Could not find Publish button. Please click it manually.');
    throw new Error('Publish button not found - please click manually');
  }
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

// Export workflow steps for debugging
window.__jigglyWorkflowSteps = WORKFLOW_STEPS;
window.__jigglyGetStatus = () => ({
  currentWorkflowStep,
  stepCompletionFlags,
  formFillAttempted,
  imagesUploaded
});

init();