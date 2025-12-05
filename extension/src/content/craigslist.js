// Content script for Craigslist posting automation
console.log('Marketplace Lister: Craigslist content script loaded on', window.location.href);

// ============================================================================
// WORKFLOW STEPS - State machine for the Craigslist posting process
// Based on URL parameters: ?s=subarea, ?s=hood, ?s=type, ?s=cat, ?s=edit
// ============================================================================
const WORKFLOW_STEPS = {
  IDLE: 'idle',
  INITIAL_PAGE: 'initial_page',
  SUBAREA_SELECTION: 'subarea_selection',  // ?s=subarea - Region selection 
  HOOD_SELECTION: 'hood_selection',        // ?s=hood - Neighborhood selection
  TYPE_SELECTION: 'type_selection',        // ?s=type - Posting type (for sale by owner, etc.)
  CATEGORY_SELECTION: 'category_selection', // ?s=cat - Category selection
  FORM_FILL: 'form_fill',                  // ?s=edit - Main edit form
  IMAGE_UPLOAD: 'image_upload',            // Image upload page
  MAP_LOCATION: 'map_location',            // Map/geolocation step
  PREVIEW: 'preview',                      // Preview before publishing
  PUBLISHING: 'publishing',                // Final submission
  COMPLETED: 'completed',
  ERROR: 'error'
};

// State flags to prevent duplicate operations
let formFillAttempted = false;
let imagesUploaded = false;
let currentWorkflowStep = WORKFLOW_STEPS.IDLE;
let stepCompletionFlags = {};
let listingData = null;
let workflowAttempts = 0;
const MAX_WORKFLOW_ATTEMPTS = 3;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Enhanced waitForElement with retry logic
 */
const waitForElement = (selector, timeout = 10000, retries = 3) => {
  return new Promise((resolve, reject) => {
    const attemptFind = (attempt) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const found = document.querySelector(selector);
        if (found) {
          observer.disconnect();
          resolve(found);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        if (attempt < retries) {
          console.log(`Retry ${attempt + 1}/${retries} for selector: ${selector}`);
          attemptFind(attempt + 1);
        } else {
          reject(new Error(`Element ${selector} not found after ${retries} attempts`));
        }
      }, timeout / retries);
    };
    
    attemptFind(1);
  });
};

/**
 * Wait for any of multiple selectors
 */
const waitForAnyElement = async (selectors, timeout = 10000) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el && el.offsetParent !== null) {
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

/**
 * Update workflow step in storage and notify service worker
 */
const updateWorkflowStep = async (step, additionalData = {}) => {
  currentWorkflowStep = step;
  console.log(`Craigslist: Workflow step changed to: ${step}`);
  
  try {
    await chrome.storage.local.set({
      craigslistWorkflowStep: step,
      ...additionalData
    });
    
    chrome.runtime.sendMessage({
      action: 'workflow_step_changed',
      step,
      platform: 'craigslist',
      ...additionalData
    });
  } catch (e) {
    console.warn('Could not update workflow step:', e);
  }
};

/**
 * Send progress update to popup
 */
const updateProgress = (current, total = 100, statusMessage = '') => {
  chrome.runtime.sendMessage({
    action: 'update_progress',
    progress: { current, total },
    status: 'posting',
    message: statusMessage
  });
};

/**
 * Retry wrapper for step execution - with reasonable limits
 */
const withRetry = async (stepName, fn, maxRetries = 2, delayMs = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Craigslist: Attempting ${stepName} (attempt ${attempt}/${maxRetries})`);
      const result = await fn();
      console.log(`Craigslist: ${stepName} succeeded on attempt ${attempt}`);
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`Craigslist: ${stepName} failed on attempt ${attempt}:`, error.message);
      
      if (attempt < maxRetries) {
        console.log(`Craigslist: Retrying ${stepName} in ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs));
        delayMs = Math.min(delayMs * 1.2, 3000);
      }
    }
  }
  
  console.error(`Craigslist: ${stepName} failed after ${maxRetries} attempts. Stopping automation.`);
  // Show user notification about the failure
  showNotification(`❌ ${stepName} failed. Please complete manually.`);
  throw lastError;
};

/**
 * Soft step execution - continues even if step fails (only 1 retry)
 */
const withSoftRetry = async (stepName, fn, maxRetries = 1, delayMs = 800) => {
  try {
    return await withRetry(stepName, fn, maxRetries, delayMs);
  } catch (error) {
    console.warn(`Craigslist: ${stepName} failed but continuing workflow:`, error.message);
    showNotification(`⚠️ ${stepName} may need manual attention`);
    return null;
  }
};

/**
 * Sleep/delay utility
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Safe field setter that dispatches proper events
 */
function setField(selector, value) {
  const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (element && value !== undefined && value !== null) {
    element.focus();
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    console.log(`Filled field:`, typeof selector === 'string' ? selector : element.name || element.id);
    return true;
  }
  return false;
}

/**
 * Click a radio button option by value or label text
 */
function clickRadioByValue(value) {
  const radio = document.querySelector(`input[type="radio"][value="${value}"]`);
  if (radio) {
    radio.click();
    return true;
  }
  return false;
}

/**
 * Click a radio button by matching label text (case-insensitive partial match)
 */
function clickRadioByLabelText(labelText) {
  const labels = document.querySelectorAll('label');
  const searchText = labelText.toLowerCase();
  
  for (const label of labels) {
    if (label.textContent.toLowerCase().includes(searchText)) {
      const radioInput = label.querySelector('input[type="radio"]');
      if (radioInput) {
        radioInput.click();
        console.log('Clicked radio for label:', label.textContent.trim());
        return true;
      }
      // Try clicking the label itself
      label.click();
      return true;
    }
  }
  return false;
}

/**
 * Click the Continue/Submit button on the current page
 */
async function clickContinueButton() {
  const buttonSelectors = [
    'button[type="submit"]',
    'button.go',
    'button:contains("continue")',
    'input[type="submit"]',
    'button[name="go"]'
  ];
  
  let button = null;
  
  for (const selector of buttonSelectors) {
    try {
      button = document.querySelector(selector);
      if (button && button.offsetParent !== null) break;
    } catch (e) {
      continue;
    }
  }
  
  // Fallback: find by text content
  if (!button) {
    const allButtons = document.querySelectorAll('button, input[type="submit"]');
    for (const btn of allButtons) {
      const text = (btn.value || btn.textContent || '').toLowerCase();
      if (text.includes('continue') || text === 'go' || text.includes('next')) {
        if (btn.offsetParent !== null) {
          button = btn;
          break;
        }
      }
    }
  }
  
  if (button) {
    console.log('Clicking continue button:', button.textContent || button.value);
    button.click();
    await sleep(1500);
    return true;
  }
  
  console.warn('Continue button not found');
  return false;
}

/**
 * Show an on-page notification to the user
 */
function showNotification(message) {
  const existing = document.querySelector('#craigslist-lister-notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.id = 'craigslist-lister-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    max-width: 350px;
    animation: slideIn 0.3s ease-out;
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 18px;">📋</span>
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
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 6000);
}

// ============================================================================
// URL & PAGE STATE DETECTION
// ============================================================================

/**
 * Detect current step from URL parameters
 */
function detectCurrentStep() {
  const url = window.location.href;
  const params = new URLSearchParams(window.location.search);
  const stepParam = params.get('s');
  
  // Check URL patterns
  if (url.includes('post.craigslist.org') && !stepParam) {
    // Initial posting page - need to detect what's shown
    if (document.querySelector('.picker') || document.querySelector('input[name="id"][value="sss"]')) {
      return WORKFLOW_STEPS.INITIAL_PAGE;
    }
  }
  
  switch (stepParam) {
    case 'subarea':
      return WORKFLOW_STEPS.SUBAREA_SELECTION;
    case 'hood':
      return WORKFLOW_STEPS.HOOD_SELECTION;
    case 'type':
      return WORKFLOW_STEPS.TYPE_SELECTION;
    case 'cat':
      return WORKFLOW_STEPS.CATEGORY_SELECTION;
    case 'edit':
      return WORKFLOW_STEPS.FORM_FILL;
    case 'geotag':
    case 'map':
      return WORKFLOW_STEPS.MAP_LOCATION;
    case 'editimage':
    case 'images':
      return WORKFLOW_STEPS.IMAGE_UPLOAD;
    case 'preview':
      return WORKFLOW_STEPS.PREVIEW;
    default:
      // Try to detect by page content
      if (document.querySelector('#PostingTitle')) {
        return WORKFLOW_STEPS.FORM_FILL;
      }
      if (document.querySelector('.cat')) {
        return WORKFLOW_STEPS.CATEGORY_SELECTION;
      }
      if (document.querySelector('form.picker')) {
        return WORKFLOW_STEPS.TYPE_SELECTION;
      }
      return WORKFLOW_STEPS.IDLE;
  }
}

// ============================================================================
// STEP HANDLERS
// ============================================================================

/**
 * Handle the initial Craigslist posting page
 * This is typically shown when navigating to post.craigslist.org
 */
async function handleInitialPage(data) {
  console.log('Handling initial Craigslist page...');
  await updateWorkflowStep(WORKFLOW_STEPS.INITIAL_PAGE);
  updateProgress(5, 100, 'Starting Craigslist posting...');
  
  // Look for the area/city selection
  // Often shows a list of city links on the first page
  const cityLinks = document.querySelectorAll('a.s');
  if (cityLinks.length > 0) {
    // Try to find a matching city based on location data
    const targetLocation = (data.city || data.location || '').toLowerCase();
    
    for (const link of cityLinks) {
      const linkText = link.textContent.toLowerCase();
      if (targetLocation && linkText.includes(targetLocation.split(',')[0].trim())) {
        console.log('Clicking city link:', link.textContent);
        link.click();
        return true;
      }
    }
    
    // Default to first/main city (usually San Francisco for sfbay)
    // Or let user select manually
    console.log('Could not find matching city, waiting for user selection...');
    showNotification('Please select your city/region to continue');
    return false;
  }
  
  // If no city selection, look for "for sale" section
  const forSaleLink = document.querySelector('a[data-id="sss"], a[href*="sss"]');
  if (forSaleLink) {
    console.log('Clicking "for sale" section');
    forSaleLink.click();
    return true;
  }
  
  // The page might already have a form to select the section
  // Try clicking "for sale by owner" directly
  const fsoRadio = document.querySelector('input[value="fso"]') || 
                   document.querySelector('input[data-id="fso"]');
  if (fsoRadio) {
    fsoRadio.click();
    await sleep(500);
    await clickContinueButton();
    return true;
  }
  
  return false;
}

/**
 * Handle subarea selection (e.g., "city of san francisco", "south bay area")
 * URL: ?s=subarea
 */
async function handleSubareaSelection(data) {
  console.log('Handling subarea selection...');
  await updateWorkflowStep(WORKFLOW_STEPS.SUBAREA_SELECTION);
  updateProgress(10, 100, 'Selecting region...');
  
  await sleep(500);
  
  // Get the target city/location from data
  const targetCity = (data.city || data.location || '').toLowerCase();
  const targetZip = data.zipCode || data.zip || '';
  
  // Map common cities to subarea identifiers
  const subareaMap = {
    'san francisco': 'city of san francisco',
    'sf': 'city of san francisco',
    'oakland': 'east bay area',
    'berkeley': 'east bay area',
    'san jose': 'south bay area',
    'palo alto': 'peninsula',
    'mountain view': 'peninsula',
    'daly city': 'peninsula',
    'marin': 'north bay / marin',
    'santa cruz': 'santa cruz co'
  };
  
  // Find the best matching subarea
  let targetSubarea = 'city of san francisco'; // Default
  
  for (const [city, subarea] of Object.entries(subareaMap)) {
    if (targetCity.includes(city)) {
      targetSubarea = subarea;
      break;
    }
  }
  
  console.log('Target subarea:', targetSubarea);
  
  // Look for radio buttons with subarea options
  const radioInputs = document.querySelectorAll('input[type="radio"]');
  let found = false;
  
  for (const radio of radioInputs) {
    const label = radio.closest('label') || radio.parentElement;
    const labelText = (label?.textContent || '').toLowerCase();
    
    if (labelText.includes(targetSubarea) || 
        (targetSubarea === 'city of san francisco' && labelText.includes('san francisco'))) {
      console.log('Selecting subarea:', label?.textContent?.trim());
      radio.click();
      found = true;
      break;
    }
  }
  
  // Fallback: click first option if no match
  if (!found && radioInputs.length > 0) {
    console.log('No match found, selecting first subarea option');
    radioInputs[0].click();
    found = true;
  }
  
  if (found) {
    await sleep(500);
    await clickContinueButton();
    stepCompletionFlags.subareaSelected = true;
    return true;
  }
  
  throw new Error('Could not find subarea selection options');
}

/**
 * Handle hood/neighborhood selection
 * URL: ?s=hood
 */
async function handleHoodSelection(data) {
  console.log('Handling neighborhood selection...');
  await updateWorkflowStep(WORKFLOW_STEPS.HOOD_SELECTION);
  updateProgress(20, 100, 'Selecting neighborhood...');
  
  await sleep(500);
  
  // Get target neighborhood/location
  const targetLocation = (data.location || data.neighborhood || data.city || '').toLowerCase();
  const targetZip = data.zipCode || data.zip || '';
  
  // Common neighborhood mappings
  const neighborhoodMap = {
    '94118': 'inner richmond',
    '94121': 'outer richmond',
    '94117': 'haight ashbury',
    '94102': 'hayes valley',
    '94103': 'SOMA',
    '94107': 'south beach',
    '94110': 'mission district',
    '94114': 'castro',
    '94122': 'sunset'
  };
  
  // Determine target neighborhood
  let targetHood = neighborhoodMap[targetZip] || '';
  
  if (!targetHood && targetLocation) {
    // Try to extract neighborhood from location
    const neighborhoods = [
      'inner richmond', 'outer richmond', 'richmond', 'sunset', 'haight', 
      'castro', 'mission', 'soma', 'financial', 'marina', 'north beach',
      'nob hill', 'russian hill', 'pacific heights', 'tenderloin',
      'bayview', 'glen park', 'noe valley', 'potrero', 'bernal heights'
    ];
    
    for (const hood of neighborhoods) {
      if (targetLocation.includes(hood)) {
        targetHood = hood;
        break;
      }
    }
  }
  
  console.log('Target neighborhood:', targetHood || 'none specified');
  
  // Look for radio buttons
  const radioInputs = document.querySelectorAll('input[type="radio"]');
  let found = false;
  
  // First, check for "bypass this step" option if no specific hood needed
  if (!targetHood) {
    for (const radio of radioInputs) {
      const label = radio.closest('label') || radio.parentElement;
      const labelText = (label?.textContent || '').toLowerCase();
      
      if (labelText.includes('bypass') || labelText.includes('skip')) {
        console.log('Selecting bypass option');
        radio.click();
        found = true;
        break;
      }
    }
  }
  
  // Try to find matching neighborhood
  if (!found && targetHood) {
    for (const radio of radioInputs) {
      const label = radio.closest('label') || radio.parentElement;
      const labelText = (label?.textContent || '').toLowerCase();
      
      if (labelText.includes(targetHood)) {
        console.log('Selecting neighborhood:', label?.textContent?.trim());
        radio.click();
        found = true;
        break;
      }
    }
  }
  
  // Fallback: select first non-bypass option
  if (!found && radioInputs.length > 0) {
    // Skip bypass option, select first actual neighborhood
    for (const radio of radioInputs) {
      const label = radio.closest('label') || radio.parentElement;
      const labelText = (label?.textContent || '').toLowerCase();
      
      if (!labelText.includes('bypass')) {
        console.log('Fallback: selecting:', label?.textContent?.trim());
        radio.click();
        found = true;
        break;
      }
    }
  }
  
  if (found) {
    await sleep(500);
    await clickContinueButton();
    stepCompletionFlags.hoodSelected = true;
    return true;
  }
  
  // If no radio buttons, might just need to click continue
  const continueClicked = await clickContinueButton();
  if (continueClicked) {
    stepCompletionFlags.hoodSelected = true;
    return true;
  }
  
  throw new Error('Could not complete neighborhood selection');
}

/**
 * Handle posting type selection (for sale by owner, etc.)
 * URL: ?s=type
 */
async function handleTypeSelection(data) {
  console.log('Handling posting type selection...');
  await updateWorkflowStep(WORKFLOW_STEPS.TYPE_SELECTION);
  updateProgress(30, 100, 'Selecting posting type...');
  
  await sleep(500);
  
  // Default to "for sale by owner"
  const preferredTypes = ['for sale by owner', 'sale by owner', 'fso'];
  
  // Check if user is a dealer
  if (data.isDealer) {
    preferredTypes.unshift('for sale by dealer');
  }
  
  // Find and click the appropriate radio button
  const radioInputs = document.querySelectorAll('input[type="radio"]');
  let found = false;
  
  for (const type of preferredTypes) {
    for (const radio of radioInputs) {
      const label = radio.closest('label') || radio.parentElement;
      const labelText = (label?.textContent || '').toLowerCase();
      const radioValue = (radio.value || '').toLowerCase();
      
      if (labelText.includes(type) || radioValue === 'fso') {
        console.log('Selecting posting type:', label?.textContent?.trim());
        radio.click();
        found = true;
        break;
      }
    }
    if (found) break;
  }
  
  if (!found) {
    // Try by value attribute
    const fsoRadio = document.querySelector('input[value="fso"]');
    if (fsoRadio) {
      fsoRadio.click();
      found = true;
    }
  }
  
  if (found) {
    await sleep(500);
    await clickContinueButton();
    stepCompletionFlags.typeSelected = true;
    return true;
  }
  
  throw new Error('Could not find posting type options');
}

/**
 * Handle category selection
 * URL: ?s=cat
 */
async function handleCategorySelection(data) {
  console.log('Handling category selection...');
  await updateWorkflowStep(WORKFLOW_STEPS.CATEGORY_SELECTION);
  updateProgress(40, 100, 'Selecting category...');
  
  await sleep(500);
  
  // Category mapping from our internal categories to Craigslist categories
  const categoryMap = {
    // Electronics
    'electronics': 'electronics',
    'cell phones': 'cell phones',
    'computers': 'computers',
    'video gaming': 'video gaming',
    
    // Furniture
    'furniture': 'furniture',
    'home': 'furniture',
    'household': 'household items',
    
    // Clothing
    'clothing': 'clothing & accessories',
    'clothes': 'clothing & accessories',
    'shoes': 'clothing & accessories',
    
    // Vehicles & Parts
    'auto parts': 'auto parts',
    'cars': 'cars & trucks',
    'car': 'cars & trucks',
    'bicycle': 'bicycles',
    'bike': 'bicycles',
    
    // Home & Garden
    'appliances': 'appliances',
    'garden': 'farm & garden',
    'tools': 'tools',
    
    // Sports & Outdoors
    'sporting goods': 'sporting goods',
    'sports': 'sporting goods',
    
    // Baby & Kids
    'baby': 'baby & kid stuff',
    'kids': 'baby & kid stuff',
    'toys': 'toys & games',
    
    // Other
    'books': 'books & magazines',
    'jewelry': 'jewelry',
    'musical instruments': 'musical instruments',
    'collectibles': 'collectibles',
    'antiques': 'antiques',
    'art': 'arts & crafts',
    
    // Default
    'default': 'general for sale',
    'other': 'general for sale',
    'miscellaneous': 'general for sale'
  };
  
  // Get target category
  let targetCategory = 'general for sale';
  
  if (data.category) {
    const normalizedCategory = data.category.toLowerCase();
    targetCategory = categoryMap[normalizedCategory] || 
                     inferCategoryFromTitle(data.title, data.description);
  } else {
    targetCategory = inferCategoryFromTitle(data.title, data.description);
  }
  
  console.log('Target category:', targetCategory);
  
  // Find and click the matching radio button
  const radioInputs = document.querySelectorAll('input[type="radio"]');
  let found = false;
  let bestMatch = null;
  let bestScore = 0;
  
  const targetWords = targetCategory.toLowerCase().split(/[\s&]+/).filter(w => w.length > 2);
  
  for (const radio of radioInputs) {
    const label = radio.closest('label') || radio.parentElement;
    const labelText = (label?.textContent || '').toLowerCase();
    
    // Score based on word matches
    let score = 0;
    for (const word of targetWords) {
      if (labelText.includes(word)) {
        score++;
      }
    }
    
    // Exact match gets highest score
    if (labelText.includes(targetCategory)) {
      score += 10;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = radio;
    }
  }
  
  if (bestMatch && bestScore > 0) {
    const label = bestMatch.closest('label') || bestMatch.parentElement;
    console.log('Selecting category:', label?.textContent?.trim(), '(score:', bestScore, ')');
    bestMatch.click();
    found = true;
  }
  
  // Fallback to "general for sale"
  if (!found) {
    for (const radio of radioInputs) {
      const label = radio.closest('label') || radio.parentElement;
      const labelText = (label?.textContent || '').toLowerCase();
      
      if (labelText.includes('general') && labelText.includes('sale')) {
        console.log('Fallback: selecting general for sale');
        radio.click();
        found = true;
        break;
      }
    }
  }
  
  if (found) {
    await sleep(500);
    await clickContinueButton();
    stepCompletionFlags.categorySelected = true;
    return true;
  }
  
  throw new Error('Could not find category options');
}

/**
 * Infer category from title and description
 */
function inferCategoryFromTitle(title, description) {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  
  const categoryKeywords = {
    'electronics': ['phone', 'laptop', 'computer', 'tablet', 'ipad', 'macbook', 'tv', 'television', 'monitor', 'camera', 'drone', 'speaker', 'headphone'],
    'furniture': ['sofa', 'couch', 'chair', 'table', 'desk', 'bed', 'mattress', 'dresser', 'cabinet', 'shelf', 'bookcase', 'sectional'],
    'clothing & accessories': ['shirt', 'pants', 'dress', 'jacket', 'coat', 'shoes', 'boots', 'bag', 'purse'],
    'bicycles': ['bike', 'bicycle', 'cycling'],
    'cars & trucks': ['car', 'truck', 'vehicle', 'honda', 'toyota', 'ford', 'chevy'],
    'auto parts': ['tire', 'wheel', 'engine', 'brake', 'bumper', 'headlight'],
    'sporting goods': ['golf', 'tennis', 'basketball', 'football', 'fitness', 'gym', 'weight', 'treadmill'],
    'toys & games': ['toy', 'game', 'lego', 'doll', 'puzzle'],
    'baby & kid stuff': ['baby', 'stroller', 'crib', 'car seat', 'high chair'],
    'tools': ['tool', 'drill', 'saw', 'hammer', 'wrench'],
    'appliances': ['refrigerator', 'washer', 'dryer', 'dishwasher', 'microwave', 'oven'],
    'musical instruments': ['guitar', 'piano', 'keyboard', 'drum', 'violin', 'amp', 'amplifier']
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'general for sale';
}

/**
 * Handle the main edit/posting form
 * URL: ?s=edit
 */
async function handleFormFill(data) {
  console.log('Handling main posting form...');
  console.log('Form data received:', JSON.stringify(data, null, 2));
  await updateWorkflowStep(WORKFLOW_STEPS.FORM_FILL);
  updateProgress(50, 100, 'Filling listing details...');
  
  await sleep(1000);
  
  // Debug: Log all form fields found on page
  const allFields = document.querySelectorAll('input, textarea, select');
  console.log('Form fields found on page:', allFields.length);
  allFields.forEach((el, i) => {
    if (el.name || el.id) {
      console.log(`  [${i}] ${el.tagName} name="${el.name}" id="${el.id}" type="${el.type}"`);
    }
  });
  
  // Fill posting title - try multiple selectors
  const titleSelectors = ['#PostingTitle', 'input[name="PostingTitle"]', 'input[name="title"]'];
  let titleFilled = false;
  for (const selector of titleSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      titleFilled = setField(el, data.title);
      if (titleFilled) {
        stepCompletionFlags.titleFilled = true;
        console.log('✓ Title filled with selector:', selector);
        break;
      }
    }
  }
  if (!titleFilled) {
    console.warn('✗ Could not find title field');
  }
  
  updateProgress(55, 100, 'Filling price...');
  await sleep(300);
  
  // Fill price - IMPORTANT: clean the value first
  const rawPrice = data.price || '';
  const priceValue = String(rawPrice).replace(/[$,\s]/g, '').trim();
  console.log('Attempting to fill price. Raw:', rawPrice, 'Cleaned:', priceValue);
  
  const priceSelectors = ['#price', 'input[name="price"]', 'input.price'];
  let priceFilled = false;
  for (const selector of priceSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      console.log('Found price field:', selector, 'current value:', el.value);
      priceFilled = setField(el, priceValue);
      if (priceFilled) {
        stepCompletionFlags.priceFilled = true;
        console.log('✓ Price filled:', priceValue);
        break;
      }
    }
  }
  if (!priceFilled) {
    console.warn('✗ Could not fill price field - trying to find any price input');
    // Last resort - find any input that might be price
    const inputs = document.querySelectorAll('input[type="text"], input[type="number"]');
    for (const input of inputs) {
      // Look for price-related attributes
      if (input.name?.includes('price') || input.id?.includes('price') ||
          input.placeholder?.toLowerCase().includes('price')) {
        priceFilled = setField(input, priceValue);
        if (priceFilled) {
          console.log('✓ Price filled via fallback');
          stepCompletionFlags.priceFilled = true;
          break;
        }
      }
    }
  }
  
  updateProgress(60, 100, 'Filling location...');
  await sleep(300);
  
  // Fill postal/ZIP code
  const zipCode = data.zipCode || data.zip || extractZipFromLocation(data.location);
  console.log('Attempting to fill ZIP code:', zipCode);
  
  if (zipCode) {
    const zipSelectors = ['#postal_code', 'input[name="postal"]', 'input[name="postal_code"]', 'input.postal'];
    let zipFilled = false;
    for (const selector of zipSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        zipFilled = setField(el, zipCode);
        if (zipFilled) {
          stepCompletionFlags.zipFilled = true;
          console.log('✓ ZIP code filled with selector:', selector);
          break;
        }
      }
    }
    if (!zipFilled) {
      console.warn('✗ Could not fill ZIP field');
    }
  }
  
  updateProgress(65, 100, 'Filling description...');
  await sleep(300);
  
  // Fill description - try multiple selectors
  const descSelectors = ['#PostingBody', 'textarea[name="PostingBody"]', '#postingBody', 'textarea.posting-body', 'textarea'];
  let descFilled = false;
  for (const selector of descSelectors) {
    const el = document.querySelector(selector);
    if (el && el.tagName === 'TEXTAREA') {
      descFilled = setField(el, data.description);
      if (descFilled) {
        stepCompletionFlags.descriptionFilled = true;
        console.log('✓ Description filled');
        break;
      }
    }
  }
  if (!descFilled) {
    console.warn('✗ Could not fill description');
  }
  
  updateProgress(70, 100, 'Filling additional details...');
  await sleep(300);
  
  // Fill optional fields if present
  
  // Make/Manufacturer
  if (data.make || data.brand) {
    const makeSelectors = ['input[name="FromManufacturer"]', 'input[name="make"]', '#make'];
    for (const selector of makeSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        setField(el, data.make || data.brand);
        console.log('✓ Make/Manufacturer filled');
        break;
      }
    }
  }
  
  // Model
  if (data.model) {
    const modelSelectors = ['input[name="ModelName"]', 'input[name="model"]', '#model'];
    for (const selector of modelSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        setField(el, data.model);
        console.log('✓ Model filled');
        break;
      }
    }
  }
  
  // Size/Dimensions
  if (data.size || data.dimensions) {
    const sizeSelectors = ['input[name="FromSize"]', 'input[name="size"]', '#size'];
    for (const selector of sizeSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        setField(el, data.size || data.dimensions);
        console.log('✓ Size filled');
        break;
      }
    }
  }
  
  // Condition dropdown - IMPORTANT
  await handleConditionDropdown(data);
  
  // Language dropdown - CRITICAL (required field!)
  await handleLanguageDropdown();
  
  // Handle checkboxes
  if (data.deliveryAvailable) {
    const deliveryCheckbox = document.querySelector('input[name="sale_conditions[]"][value="delivery"]') ||
                             document.querySelector('input[id*="delivery"]');
    if (deliveryCheckbox && !deliveryCheckbox.checked) {
      deliveryCheckbox.click();
      console.log('✓ Delivery checkbox checked');
    }
  }
  
  updateProgress(75, 100, 'Form filled, reviewing...');
  await sleep(500);
  
  // Scroll to top first to check for errors
  window.scrollTo(0, 0);
  await sleep(300);
  
  // Check for validation errors on the page
  const errorMessages = document.querySelectorAll('.err, .error, [class*="error"]');
  const visibleErrors = Array.from(errorMessages).filter(el => {
    const text = el.textContent?.trim();
    return text && text.length > 0 && el.offsetParent !== null;
  });
  
  if (visibleErrors.length > 0) {
    const errorText = visibleErrors.map(el => el.textContent.trim()).join('; ');
    console.warn('⚠ Form has validation errors:', errorText);
    showNotification(`⚠️ Form errors: ${errorText.substring(0, 80)}`);
  }
  
  // Scroll to bottom to show completion
  window.scrollTo(0, document.body.scrollHeight);
  await sleep(300);
  
  // Try to click continue - but don't fail if button not found
  const continueClicked = await clickContinueButton();
  
  if (!continueClicked) {
    showNotification('ℹ️ Please review the form and click Continue when ready');
  }
  
  stepCompletionFlags.formFilled = true;
  console.log('Form fill completed. Flags:', stepCompletionFlags);
  return true;
}

/**
 * Handle language dropdown - CRITICAL REQUIRED FIELD
 */
async function handleLanguageDropdown() {
  console.log('Setting language dropdown...');
  
  // Try multiple selectors for language dropdown
  const languageSelectors = [
    'select[name="language"]',
    'select#language',
    'select.language',
    'select[id*="language"]',
    'select[name*="language"]'
  ];
  
  let languageSelect = null;
  for (const selector of languageSelectors) {
    languageSelect = document.querySelector(selector);
    if (languageSelect) {
      console.log('Found language dropdown with selector:', selector);
      break;
    }
  }
  
  if (!languageSelect) {
    // Try to find by looking at all selects
    const allSelects = document.querySelectorAll('select');
    for (const select of allSelects) {
      const options = select.querySelectorAll('option');
      const optionTexts = Array.from(options).map(o => o.textContent.toLowerCase());
      if (optionTexts.some(t => t.includes('english') || t.includes('español') || t.includes('français'))) {
        languageSelect = select;
        console.log('Found language select by option content');
        break;
      }
    }
  }
  
  if (!languageSelect) {
    console.warn('✗ Language dropdown not found - this may cause form validation error');
    return false;
  }
  
  // Log current state and options
  const options = languageSelect.querySelectorAll('option');
  console.log('Language current value:', languageSelect.value);
  console.log('Language options:', Array.from(options).map(o => `"${o.value}": "${o.textContent}"`).join(', '));
  
  // Check if already set to a valid value
  if (languageSelect.value && languageSelect.value !== '' && languageSelect.value !== '-') {
    console.log('✓ Language already set to:', languageSelect.value);
    stepCompletionFlags.languageSet = true;
    return true;
  }
  
  // Try to select English
  const englishPatterns = ['en', 'english', 'eng', '5', '1'];
  let found = false;
  
  // First try to find by value
  for (const val of englishPatterns) {
    const option = languageSelect.querySelector(`option[value="${val}"]`);
    if (option) {
      languageSelect.value = val;
      languageSelect.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('✓ Language set to value:', val);
      found = true;
      stepCompletionFlags.languageSet = true;
      break;
    }
  }
  
  // If not found by value, try by text content
  if (!found) {
    for (const option of options) {
      const text = option.textContent.toLowerCase();
      if (text.includes('english')) {
        languageSelect.value = option.value;
        languageSelect.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('✓ Language set by text to:', option.value, option.textContent);
        found = true;
        stepCompletionFlags.languageSet = true;
        break;
      }
    }
  }
  
  // If still not found, select first non-empty option
  if (!found) {
    for (const option of options) {
      if (option.value && option.value !== '' && option.value !== '-') {
        languageSelect.value = option.value;
        languageSelect.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('✓ Language set to first valid option:', option.value, option.textContent);
        found = true;
        stepCompletionFlags.languageSet = true;
        break;
      }
    }
  }
  
  if (!found) {
    console.warn('✗ Could not set language - form may fail validation');
    showNotification('⚠️ Please select a language manually');
  }
  
  return found;
}

/**
 * Handle condition dropdown selection
 */
async function handleConditionDropdown(data) {
  const conditionSelect = document.querySelector('select[name="condition"]') ||
                          document.querySelector('#condition');
  
  if (!conditionSelect) {
    console.log('Condition dropdown not found');
    return;
  }
  
  // Map our condition values to Craigslist options
  const conditionMap = {
    'new': 'new',
    'like_new': 'like new',
    'excellent': 'excellent',
    'good': 'good',
    'fair': 'fair',
    'salvage': 'salvage'
  };
  
  const targetCondition = conditionMap[data.condition?.toLowerCase()] || 
                          conditionMap[data.condition?.replace(/[\s-]+/g, '_').toLowerCase()] ||
                          'good';
  
  // Find the matching option
  const options = conditionSelect.querySelectorAll('option');
  for (const option of options) {
    const optionText = option.textContent.toLowerCase();
    if (optionText.includes(targetCondition) || option.value.toLowerCase() === targetCondition) {
      conditionSelect.value = option.value;
      conditionSelect.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('Condition set to:', option.textContent);
      stepCompletionFlags.conditionSet = true;
      return;
    }
  }
  
  console.log('Could not match condition, leaving default');
}

/**
 * Extract ZIP code from location string
 */
function extractZipFromLocation(location) {
  if (!location) return '';
  const match = location.match(/\b\d{5}\b/);
  return match ? match[0] : '';
}

/**
 * Handle image upload page
 */
async function handleImageUpload(data) {
  console.log('Handling image upload...');
  await updateWorkflowStep(WORKFLOW_STEPS.IMAGE_UPLOAD);
  updateProgress(80, 100, 'Uploading images...');
  
  if (!data.images || data.images.length === 0) {
    console.log('No images to upload');
    await clickContinueButton();
    return true;
  }
  
  await sleep(1000);
  
  // Find the file input
  const fileInput = document.querySelector('input[type="file"]') ||
                    document.querySelector('#file') ||
                    document.querySelector('input[name="file"]');
  
  if (!fileInput) {
    console.warn('File input not found, skipping image upload');
    showNotification('⚠️ Could not upload images automatically. Please add images manually.');
    await clickContinueButton();
    return true;
  }
  
  try {
    const dataTransfer = new DataTransfer();
    const uniqueUrls = [...new Set(data.images)];
    
    console.log('Fetching', uniqueUrls.length, 'images...');
    
    for (let i = 0; i < Math.min(uniqueUrls.length, 24); i++) { // Craigslist allows up to 24 images
      const url = uniqueUrls[i];
      try {
        console.log(`Fetching image ${i + 1}/${uniqueUrls.length}:`, url.substring(0, 50));
        
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
        console.error(`Failed to fetch image:`, err.message);
      }
    }
    
    if (dataTransfer.files.length > 0) {
      console.log('Uploading', dataTransfer.files.length, 'images...');
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Wait for upload to process
      await sleep(3000);
      
      stepCompletionFlags.imagesUploaded = true;
      imagesUploaded = true;
      console.log('Images uploaded successfully');
    }
  } catch (e) {
    console.error('Error uploading images:', e);
    showNotification('⚠️ Some images could not be uploaded. Please add them manually.');
  }
  
  updateProgress(85, 100, 'Images uploaded, continuing...');
  
  // Look for done/continue button
  const doneButton = document.querySelector('button.done') ||
                     document.querySelector('button[value="done"]') ||
                     document.querySelector('#done');
  
  if (doneButton) {
    doneButton.click();
    await sleep(1500);
  } else {
    await clickContinueButton();
  }
  
  return true;
}

/**
 * Handle map/geolocation page
 */
async function handleMapLocation(data) {
  console.log('Handling map location...');
  await updateWorkflowStep(WORKFLOW_STEPS.MAP_LOCATION);
  updateProgress(88, 100, 'Setting location on map...');
  
  await sleep(1000);
  
  // Usually the map is pre-populated based on ZIP code
  // Just need to click continue
  
  // Check if there's an address field to fill
  const addressInput = document.querySelector('input[name="xstreet0"]') ||
                       document.querySelector('#xstreet0');
  
  if (addressInput && data.address) {
    setField(addressInput, data.address);
  }
  
  // Cross street (optional)
  const crossStreetInput = document.querySelector('input[name="xstreet1"]');
  if (crossStreetInput && data.crossStreet) {
    setField(crossStreetInput, data.crossStreet);
  }
  
  await sleep(500);
  await clickContinueButton();
  
  stepCompletionFlags.mapLocationSet = true;
  return true;
}

/**
 * Handle preview/confirmation page
 */
async function handlePreview(data) {
  console.log('Handling preview page...');
  await updateWorkflowStep(WORKFLOW_STEPS.PREVIEW);
  updateProgress(92, 100, 'Reviewing listing...');
  
  await sleep(1500);
  
  // Check if this is the final confirmation step
  // Look for publish/post button
  const publishButton = document.querySelector('button.bigbutton') ||
                        document.querySelector('button[name="go"]') ||
                        document.querySelector('input[type="submit"][value*="publish"]');
  
  if (publishButton) {
    const buttonText = (publishButton.value || publishButton.textContent || '').toLowerCase();
    
    if (buttonText.includes('publish') || buttonText.includes('continue')) {
      console.log('Clicking publish button:', buttonText);
      publishButton.click();
      
      await sleep(2000);
      
      // Check for success
      await checkForSuccess();
      return true;
    }
  }
  
  // Try generic continue
  await clickContinueButton();
  return true;
}

/**
 * Handle the final publish step
 */
async function handlePublish() {
  console.log('Handling publish...');
  await updateWorkflowStep(WORKFLOW_STEPS.PUBLISHING);
  updateProgress(95, 100, 'Publishing listing...');
  
  // Look for the final publish button
  const publishSelectors = [
    'button.bigbutton',
    'button[value="publish"]',
    'input[type="submit"]',
    '#publish_top',
    '#publish_bottom'
  ];
  
  for (const selector of publishSelectors) {
    const button = document.querySelector(selector);
    if (button && button.offsetParent !== null) {
      const text = (button.value || button.textContent || '').toLowerCase();
      if (text.includes('publish') || text.includes('continue') || text.includes('post')) {
        console.log('Clicking publish:', text);
        button.click();
        break;
      }
    }
  }
  
  await sleep(3000);
  await checkForSuccess();
  
  return true;
}

/**
 * Check for posting success
 */
async function checkForSuccess() {
  const pageText = document.body.textContent || '';
  
  const successIndicators = [
    'your posting can be seen at',
    'thanks for posting',
    'posting has been published',
    'manage posting',
    'edit this posting',
    'your email has been sent'
  ];
  
  for (const indicator of successIndicators) {
    if (pageText.toLowerCase().includes(indicator)) {
      console.log('SUCCESS! Listing posted successfully!');
      
      await updateWorkflowStep(WORKFLOW_STEPS.COMPLETED);
      updateProgress(100, 100, 'Listing posted successfully!');
      
      chrome.runtime.sendMessage({
        action: 'posting_complete',
        platform: 'craigslist'
      });
      
      showNotification('🎉 Your listing has been posted successfully on Craigslist!');
      
      stepCompletionFlags.posted = true;
      return true;
    }
  }
  
  // Check for confirmation email message
  if (pageText.toLowerCase().includes('email') && 
      (pageText.toLowerCase().includes('confirm') || pageText.toLowerCase().includes('verify'))) {
    console.log('Listing pending email confirmation');
    
    await updateWorkflowStep(WORKFLOW_STEPS.COMPLETED);
    updateProgress(100, 100, 'Check your email to confirm the listing');
    
    chrome.runtime.sendMessage({
      action: 'posting_complete',
      platform: 'craigslist',
      requiresConfirmation: true
    });
    
    showNotification('📧 Please check your email to confirm and publish your listing!');
    
    stepCompletionFlags.posted = true;
    return true;
  }
  
  return false;
}

// ============================================================================
// MAIN WORKFLOW ORCHESTRATOR
// ============================================================================

/**
 * Run the full Craigslist posting workflow
 */
async function runFullPostingWorkflow(data) {
  console.log('Starting full Craigslist posting workflow');
  console.log('Data:', JSON.stringify(data, null, 2));
  console.log('Workflow attempt:', workflowAttempts, 'of', MAX_WORKFLOW_ATTEMPTS);
  
  // Check attempt limit
  if (workflowAttempts > MAX_WORKFLOW_ATTEMPTS) {
    console.error('Exceeded maximum workflow attempts');
    showNotification('❌ Maximum attempts exceeded. Please complete manually.');
    await updateWorkflowStep(WORKFLOW_STEPS.ERROR, { error: 'Maximum attempts exceeded' });
    return;
  }
  
  listingData = data;
  
  try {
    // Detect current step and continue from there
    let currentStep = detectCurrentStep();
    console.log('Detected current step:', currentStep);
    
    // Execute based on current step - NO recursive retry for unknown steps
    switch (currentStep) {
      case WORKFLOW_STEPS.INITIAL_PAGE:
        await withRetry('Initial Page', () => handleInitialPage(data), 2, 1000);
        break;
        
      case WORKFLOW_STEPS.SUBAREA_SELECTION:
        await withRetry('Subarea Selection', () => handleSubareaSelection(data), 2, 1000);
        break;
        
      case WORKFLOW_STEPS.HOOD_SELECTION:
        await withSoftRetry('Hood Selection', () => handleHoodSelection(data), 1, 800);
        break;
        
      case WORKFLOW_STEPS.TYPE_SELECTION:
        await withRetry('Type Selection', () => handleTypeSelection(data), 2, 1000);
        break;
        
      case WORKFLOW_STEPS.CATEGORY_SELECTION:
        await withRetry('Category Selection', () => handleCategorySelection(data), 2, 1000);
        break;
        
      case WORKFLOW_STEPS.FORM_FILL:
        // Form fill is critical - but only try once per page load
        await handleFormFill(data);
        break;
        
      case WORKFLOW_STEPS.IMAGE_UPLOAD:
        if (!imagesUploaded) {
          await withSoftRetry('Image Upload', () => handleImageUpload(data), 1, 1000);
        }
        break;
        
      case WORKFLOW_STEPS.MAP_LOCATION:
        await withSoftRetry('Map Location', () => handleMapLocation(data), 1, 800);
        break;
        
      case WORKFLOW_STEPS.PREVIEW:
        await withSoftRetry('Preview', () => handlePreview(data), 1, 1000);
        break;
        
      default:
        console.log('Unknown step or idle, showing notification to user');
        showNotification('ℹ️ Please continue with the form manually if needed');
        // Do NOT recurse - this was causing infinite loops
    }
    
  } catch (error) {
    console.error('Workflow error:', error);
    await updateWorkflowStep(WORKFLOW_STEPS.ERROR, { error: error.message });
    
    chrome.runtime.sendMessage({
      action: 'posting_error',
      error: error.message,
      platform: 'craigslist'
    });
    
    showNotification(`❌ ${error.message}. Please complete manually.`);
    // Don't re-throw - let user complete manually
  }
}

// ============================================================================
// MESSAGE HANDLERS & INITIALIZATION
// ============================================================================

/**
 * Handle messages from background script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Craigslist content script received message:', request.action);
  
  if (request.action === 'FILL_FORM') {
    console.log('Received FILL_FORM command', request.data);
    
    if (formFillAttempted) {
      console.log('Form fill already attempted on this page');
      sendResponse({ success: true, message: 'Already attempted' });
      return true;
    }
    
    formFillAttempted = true;
    
    runFullPostingWorkflow(request.data)
      .then(() => {
        console.log('Workflow step completed successfully');
        sendResponse({ success: true });
      })
      .catch((err) => {
        console.error('Error in posting workflow:', err);
        sendResponse({ success: false, error: err.message });
      });
    
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'CHECK_READY') {
    sendResponse({ 
      ready: true, 
      url: window.location.href, 
      step: currentWorkflowStep,
      detectedStep: detectCurrentStep()
    });
    return true;
  }
  
  if (request.action === 'GET_WORKFLOW_STATUS') {
    sendResponse({
      step: currentWorkflowStep,
      detectedStep: detectCurrentStep(),
      formFillAttempted,
      imagesUploaded,
      stepCompletionFlags
    });
    return true;
  }
  
  if (request.action === 'get_listing_data') {
    // Legacy check (kept for compatibility)
    chrome.storage.local.get(['currentListingData'], (result) => {
      if (result.currentListingData) {
        runFullPostingWorkflow(result.currentListingData).catch(console.error);
      }
    });
    sendResponse({ success: true });
    return true;
  }
});

/**
 * Check for pending work on page load
 */
function checkForPendingWork() {
  console.log('Checking for pending Craigslist work...');
  console.log('formFillAttempted:', formFillAttempted, 'workflowAttempts:', workflowAttempts);
  
  // First check if we've exceeded max attempts
  if (workflowAttempts >= MAX_WORKFLOW_ATTEMPTS) {
    console.log('Max workflow attempts reached, stopping automation');
    showNotification('⚠️ Maximum attempts reached. Please complete the form manually.');
    return;
  }
  
  // Check storage directly first - this is more reliable
  chrome.storage.local.get(['currentListingData', 'currentPlatform', 'postingStatus'], (stored) => {
    console.log('Storage check:', {
      hasData: !!stored.currentListingData,
      platform: stored.currentPlatform,
      status: stored.postingStatus,
      formFillAttempted
    });
    
    // If we have listing data for Craigslist and haven't tried yet, go!
    if (stored.currentListingData && stored.currentPlatform === 'craigslist' && !formFillAttempted) {
      console.log('✓ Found listing data in storage, starting workflow...');
      formFillAttempted = true;
      workflowAttempts++;
      
      setTimeout(() => {
        runFullPostingWorkflow(stored.currentListingData)
          .then(() => {
            console.log('Workflow step completed');
          })
          .catch((err) => {
            console.error('Workflow failed:', err);
            updateWorkflowStep(WORKFLOW_STEPS.ERROR, { error: err.message });
            showNotification(`❌ ${err.message}. Please complete manually.`);
          });
      }, 1000);
      return;
    }
    
    // Fallback: check via message (in case storage wasn't populated yet)
    chrome.runtime.sendMessage({ action: 'check_pending_work' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Could not check pending work:', chrome.runtime.lastError);
        return;
      }
      
      console.log('Pending work response:', response);
      
      const hasData = response && response.data;
      const isCraigslist = response && response.platform === 'craigslist';
      
      if (hasData && isCraigslist && !formFillAttempted) {
        console.log('✓ Found pending work via message, starting workflow...');
        formFillAttempted = true;
        workflowAttempts++;
        
        setTimeout(() => {
          runFullPostingWorkflow(response.data)
            .then(() => console.log('Workflow completed'))
            .catch((err) => {
              console.error('Workflow failed:', err);
              showNotification(`❌ ${err.message}. Please complete manually.`);
            });
        }, 1000);
      } else if (!formFillAttempted) {
        console.log('No pending work found or not for Craigslist. hasData:', hasData, 'isCraigslist:', isCraigslist);
      }
    });
  });
}

/**
 * Initialize the content script
 */
function init() {
  console.log('Craigslist content script initializing...');
  
  const url = window.location.href;
  
  // Only run on Craigslist posting pages
  if (!url.includes('craigslist.org')) {
    return;
  }
  
  // Detect current step
  const detectedStep = detectCurrentStep();
  console.log('Detected step on init:', detectedStep);
  
  // Restore workflow step from storage
  chrome.storage.local.get(['craigslistWorkflowStep'], (result) => {
    if (result.craigslistWorkflowStep) {
      currentWorkflowStep = result.craigslistWorkflowStep;
      console.log('Restored workflow step:', currentWorkflowStep);
    }
  });
  
  // Check for pending work after page loads
  if (document.readyState === 'complete') {
    setTimeout(checkForPendingWork, 1500);
  } else {
    window.addEventListener('load', () => {
      setTimeout(checkForPendingWork, 1500);
    });
  }
}

// ============================================================================
// DEBUG HELPERS
// ============================================================================

// Export for debugging
window.__craigslistWorkflowSteps = WORKFLOW_STEPS;
window.__craigslistGetStatus = () => ({
  currentWorkflowStep,
  detectedStep: detectCurrentStep(),
  stepCompletionFlags,
  formFillAttempted,
  imagesUploaded,
  listingData
});

window.__craigslistGetDebugInfo = () => {
  const inputs = Array.from(document.querySelectorAll('input, textarea, select'))
    .map(i => ({
      tag: i.tagName,
      type: i.type,
      name: i.name,
      id: i.id,
      value: i.value?.substring(0, 30)
    }));
  
  const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'))
    .map(b => ({
      text: (b.value || b.textContent || '').substring(0, 30),
      type: b.type,
      visible: b.offsetParent !== null
    }));
  
  const radios = Array.from(document.querySelectorAll('input[type="radio"]'))
    .map(r => {
      const label = r.closest('label') || r.parentElement;
      return {
        value: r.value,
        checked: r.checked,
        label: label?.textContent?.substring(0, 40)
      };
    });
  
  console.log('Craigslist Debug Info:', {
    url: window.location.href,
    params: Object.fromEntries(new URLSearchParams(window.location.search)),
    workflowState: currentWorkflowStep,
    detectedStep: detectCurrentStep(),
    flags: stepCompletionFlags,
    inputs,
    buttons,
    radios
  });
  
  return { inputs, buttons, radios };
};

// Initialize
init();