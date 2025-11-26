// Content script for Facebook Marketplace
console.log('Marketplace Lister: Facebook content script loaded');

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

// Helper to find element by text content (useful for labels)
const findElementByText = (tag, text) => {
  const elements = document.querySelectorAll(tag);
  for (let element of elements) {
    if (element.textContent.trim() === text) {
      return element;
    }
  }
  return null;
};

// Helper to simulate React input events
const simulateInput = (element, value) => {
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;

  if (valueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else {
    valueSetter.call(element, value);
  }

  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
};

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'FILL_FORM') {
    console.log('Marketplace Lister: Received FILL_FORM command', request.data);
    fillForm(request.data)
      .then(() => sendResponse({ success: true }))
      .catch((err) => {
        console.error('Marketplace Lister: Error filling form', err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Async response
  }
});

async function fillForm(data) {
  console.log('Marketplace Lister: Starting form fill sequence');

  // 1. Title
  try {
    // Facebook often uses aria-labels or labeledby. 
    // We try robust selectors first.
    const titleInput = await waitForElement('label[aria-label="Title"] input, input[aria-label="Title"]');
    if (titleInput) {
      simulateInput(titleInput, data.title);
      console.log('Filled Title');
    }
  } catch (e) {
    console.warn('Could not find Title input', e);
  }

  // 2. Price
  try {
    const priceInput = await waitForElement('label[aria-label="Price"] input, input[aria-label="Price"]');
    if (priceInput) {
      simulateInput(priceInput, data.price);
      console.log('Filled Price');
    }
  } catch (e) {
    console.warn('Could not find Price input', e);
  }

  // 3. Description
  try {
    const descInput = await waitForElement('label[aria-label="Description"] textarea, textarea[aria-label="Description"]');
    if (descInput) {
      simulateInput(descInput, data.description);
      console.log('Filled Description');
    }
  } catch (e) {
    console.warn('Could not find Description input', e);
  }

  // 4. Category (Complex - leaving placeholder for interaction)
  // Categories are usually a div that opens a modal.
  // We might just highlight it or alert the user to select it.
  console.log('Category selection requires user interaction in this version.');

  // 5. Images
  if (data.images && data.images.length > 0) {
    await handleImages(data.images);
  }
}

async function handleImages(imageUrls) {
  console.log('Marketplace Lister: Handling images', imageUrls);
  
  // Find file input
  // Often hidden, but we might be able to find the file input
  const fileInput = document.querySelector('input[type="file"]');
  
  if (!fileInput) {
    console.warn('Could not find file input for images. Please upload manually.');
    alert('Could not auto-upload images. Please drag and drop them manually.');
    return;
  }

  try {
    // Fetch blobs
    const dataTransfer = new DataTransfer();
    
    for (const url of imageUrls) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const filename = url.split('/').pop() || 'image.jpg';
        const file = new File([blob], filename, { type: blob.type });
        dataTransfer.items.add(file);
      } catch (err) {
        console.error(`Failed to fetch image: ${url}`, err);
      }
    }

    if (dataTransfer.files.length > 0) {
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('Images uploaded to file input');
    }
  } catch (e) {
    console.error('Error simulating image upload', e);
  }
}