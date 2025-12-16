// Facebook Marketplace Scout - Price Intelligence Overlay
// Injects into FB Marketplace listing pages

(function() {
  'use strict';

  const SCOUT_CONTAINER_ID = 'smart-scout-overlay';
  const APP_URL = 'https://local-marketplace-backend-wr5e.onrender.com';
  
  let currentListingData = null;
  let overlayElement = null;
  let observerActive = false;

  // Keep references so we can disconnect on SPA navigation
  let listingObserver = null;
  let listingObserverTimeout = null;
  let scannerObserver = null;
  let quickReplyObserver = null;
  let messageListenerRegistered = false;

  // Avoid duplicate work + reduce DOM churn
  const processedMarketplaceCardKeys = new Set();
  let activeWatchlists = [];
  let storageListenerRegistered = false;

  // Logging helper with prefix
  function log(message, level = 'info') {
    const prefix = '[SmartScout FB]';
    if (level === 'error') {
      console.error(prefix, message);
    } else if (level === 'warn') {
      console.warn(prefix, message);
    } else {
      console.log(prefix, message);
    }
  }

  function isExtensionContextValid() {
    try {
      // When an extension reloads, content script context can be invalidated and
      // *any* access to chrome.runtime APIs may throw.
      return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch {
      return false;
    }
  }

  function safeSendMessage(payload, callback) {
    if (!isExtensionContextValid()) {
      // Avoid throwing errors that show up in chrome://extensions/?errors
      return;
    }
    try {
      chrome.runtime.sendMessage(payload, (response) => {
        // Accessing chrome.runtime.lastError is safe only inside callback.
        if (chrome.runtime.lastError) {
          // Swallow; caller will handle missing response.
          return;
        }
        callback && callback(response);
      });
    } catch (e) {
      // Most common: "Extension context invalidated."
      // Swallow to prevent persistent settings/errors page noise.
      log(`sendMessage failed: ${e?.message || e}`, 'warn');
    }
  }

  // Initialize on page load
  function init() {
    log('Initializing...');

    // Prevent duplicate listeners/observers when Facebook SPA navigates.
    if (!messageListenerRegistered && isExtensionContextValid()) {
      try {
        chrome.runtime.onMessage.addListener((request) => {
          if (request.action === 'WATCHLIST_CHECK') {
            handleWatchlistCheck(request.watchlist);
          }
        });
        messageListenerRegistered = true;
      } catch {
        // ignore
      }
    }
    
    // Check if we're on a marketplace listing page
    if (isMarketplaceListingPage()) {
      log('On marketplace listing page, starting observation');
      // Wait for listing content to load
      observeListingContent();
      // Inject quick reply chips (separate observer)
      injectQuickReplyChips();
    } else {
      log('Not on a listing page, initializing search scanner');
      initSearchScanner();
    }
  }

  function isMarketplaceListingPage() {
    return window.location.href.includes('/marketplace/item/');
  }

  // Active Search Scanner
  function initSearchScanner() {
    if (!isExtensionContextValid()) return;

    const hydrateWatchlists = () => {
      chrome.storage.local.get(['watchlistItems'], (result) => {
        const items = result.watchlistItems || [];
        activeWatchlists = items.filter(w => w.isActive && (w.platforms || []).includes('facebook'));
        processedMarketplaceCardKeys.clear();
        log(`Scanner watchlists hydrated: ${activeWatchlists.length}`);
        // Process whatever is already on the page
        processMarketplaceLinks(document);
      });
    };

    hydrateWatchlists();

    if (!storageListenerRegistered) {
      try {
        chrome.storage.onChanged.addListener((changes, namespace) => {
          if (namespace !== 'local') return;
          if (changes.watchlistItems) {
            hydrateWatchlists();
          }
        });
        storageListenerRegistered = true;
      } catch {
        // ignore
      }
    }

    // Disconnect any prior observer (SPA navigation)
    if (scannerObserver) {
      try { scannerObserver.disconnect(); } catch {}
      scannerObserver = null;
    }

    if (!activeWatchlists.length) {
      log('No active watchlists found');
      return;
    }

    log(`Found ${activeWatchlists.length} active watchlists, starting incremental scanner`);

    // Observe a smaller subtree when possible
    const scanRoot = document.querySelector('[role="main"]') || document.body;
    let debounce;
    const pendingRoots = new Set();

    const schedule = (root) => {
      pendingRoots.add(root);
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        // Process only newly added subtrees
        pendingRoots.forEach((r) => processMarketplaceLinks(r));
        pendingRoots.clear();
      }, 500);
    };

    // Initial scan
    schedule(document);

    scannerObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const n of m.addedNodes || []) {
          if (n && n.nodeType === Node.ELEMENT_NODE) {
            schedule(n);
          }
        }
      }
    });

    scannerObserver.observe(scanRoot, { childList: true, subtree: true });
  }

  function processMarketplaceLinks(root) {
    if (!activeWatchlists.length) return;
    const anchors = root.querySelectorAll
      ? root.querySelectorAll('a[href*="/marketplace/item/"]')
      : [];

    anchors.forEach((link) => {
      const href = link?.href;
      if (!href) return;
      const key = href.split('?')[0];
      if (processedMarketplaceCardKeys.has(key)) return;
      processedMarketplaceCardKeys.add(key);
      evaluateAndHighlightLink(link);
    });
  }

  function evaluateAndHighlightLink(link) {
    if (!activeWatchlists.length) return;

    // Navigate up to find the container card
    let container = link;
    for (let i = 0; i < 5; i++) {
      if (container.parentElement && container.parentElement.innerText && container.parentElement.innerText.length > 50) {
        container = container.parentElement;
      } else {
        break;
      }
    }

    const text = (container.innerText || '').toLowerCase();
    const titleElement = container.querySelector('span[style*="-webkit-line-clamp"]');
    const title = (titleElement ? titleElement.innerText : text).toLowerCase();
    const priceMatch = text.match(/\$[\d,]+/);
    const price = priceMatch ? parsePrice(priceMatch[0]) : null;

    activeWatchlists.forEach((watchlist) => {
      const keywords = watchlist.keywords.toLowerCase().split(' ').filter(k => k.length > 0);
      const matchesKeywords = keywords.every(k => title.includes(k) || text.includes(k));
      if (!matchesKeywords) return;

      const maxPrice = watchlist.max_price || watchlist.maxPrice || Infinity;
      const minPrice = watchlist.min_price || watchlist.minPrice || 0;
      if (price !== null && (price < minPrice || price > maxPrice)) return;

      highlightMatch(container, watchlist);
    });
  }

  function scanPageForWatchlists(watchlists) {
    watchlists.forEach(watchlist => {
      const matches = scanForMatches(watchlist);
      if (matches.length > 0) {
        log(`Found ${matches.length} matches for "${watchlist.keywords}"`);
        matches.forEach(match => highlightMatch(match.element, watchlist));
      }
    });
  }

  function handleWatchlistCheck(watchlist) {
    log('Received watchlist check request for:', watchlist.keywords);
    
    // Scan the current page for matches
    const matches = scanForMatches(watchlist);
    
    if (matches.length > 0) {
      log(`Found ${matches.length} matches for ${watchlist.keywords}`);
      // Highlight matches or notify background
      matches.forEach(match => {
        highlightMatch(match.element, watchlist);
      });
      
      // We could also report back to background here if needed
    } else {
      log('No matches found on current page');
    }
  }

  function scanForMatches(watchlist) {
    const matches = [];
    const keywords = watchlist.keywords.toLowerCase().split(' ').filter(k => k.length > 0);
    const maxPrice = watchlist.max_price || watchlist.maxPrice || Infinity;
    const minPrice = watchlist.min_price || watchlist.minPrice || 0;
    
    // Find all listing items on the page (grid items)
    // Facebook marketplace grid items usually have specific structure
    // We look for links containing '/marketplace/item/'
    const listingLinks = document.querySelectorAll('a[href*="/marketplace/item/"]');
    
    listingLinks.forEach(link => {
      // Navigate up to find the container card
      // Usually the link is inside the card or wraps the image
      // We want the text content of the card
      
      // Get title and price from the card
      // Title is usually bold text or inside span/div
      // Price is usually starts with $ or currency symbol
      
      // Simple heuristic: extract all text from the link's container
      let container = link;
      // Go up a few levels to find the card container
      for (let i = 0; i < 5; i++) {
        if (container.parentElement && container.parentElement.innerText.length > 50) {
          container = container.parentElement;
        } else {
          break;
        }
      }
      
      const text = container.innerText.toLowerCase();
      
      // Try to find the title more specifically
      // FB often uses span with style "-webkit-line-clamp" for titles
      const titleElement = container.querySelector('span[style*="-webkit-line-clamp"]');
      const title = titleElement ? titleElement.innerText.toLowerCase() : text;
      
      // Check keywords
      // All keywords must be present in the title or text
      const matchesKeywords = keywords.every(k => title.includes(k) || text.includes(k));
      
      if (matchesKeywords) {
        // Check price
        // Extract price from text (look for $1,234)
        const priceMatch = text.match(/\$[\d,]+/);
        if (priceMatch) {
          const price = parsePrice(priceMatch[0]);
          if (price !== null && price >= minPrice && price <= maxPrice) {
            matches.push({
              element: container,
              title: title,
              price: price,
              link: link.href
            });
          }
        }
      }
    });
    
    return matches;
  }

  function highlightMatch(element, watchlist) {
    if (element.dataset.scoutHighlighted) return;
    
    element.dataset.scoutHighlighted = 'true';
    element.style.border = '3px solid #4ade80';
    element.style.boxSizing = 'border-box';
    element.style.position = 'relative';
    
    const badge = document.createElement('div');
    badge.textContent = `🎯 Match: ${watchlist.keywords}`;
    badge.style.cssText = `
      position: absolute;
      top: 8px;
      left: 8px;
      background: #4ade80;
      color: #064e3b;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      z-index: 100;
      pointer-events: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    element.appendChild(badge);

    // Notify HUD
    const priceText = element.innerText.match(/\$[\d,]+/);
    const titleElement = element.querySelector('span[style*="-webkit-line-clamp"]');
    const title = titleElement ? titleElement.innerText : 'Unknown Item';

    // Best-effort enrich for Profit Analyzer (async)
    const baseMatch = {
      title: title,
      price: priceText ? priceText[0] : '???',
      link: element.querySelector('a')?.href || '#',
      platform: 'facebook',
      watchlistId: watchlist?.id,
      watchlistKeywords: watchlist?.keywords
    };

    // Fire immediate event so HUD stays responsive
    const initialPayload = {
      ...baseMatch,
      id: `${baseMatch.link}::${watchlist?.id || 'na'}`,
      ts: Date.now()
    };

    document.dispatchEvent(new CustomEvent('SMART_SCOUT_MATCH_FOUND', {
      detail: initialPayload
    }));

    safeSendMessage({ action: 'SCOUT_MATCH_FOUND', match: initialPayload }, () => {});

    // Try to fetch sold comps in background and re-emit enriched event
    safeSendMessage({
      action: 'GET_PRICE_INTELLIGENCE',
      query: title,
      currentPrice: parsePrice(priceText ? priceText[0] : null)
    }, (response) => {
      if (!response || !response.found) return;

      const enriched = {
        ...initialPayload,
        avgPrice: response.avgPrice,
        lowPrice: response.lowPrice,
        highPrice: response.highPrice,
        compsCount: response.count,
        stale: response.stale || response.cached || false
      };

      document.dispatchEvent(new CustomEvent('SMART_SCOUT_MATCH_FOUND', {
        detail: enriched
      }));

      safeSendMessage({ action: 'SCOUT_MATCH_FOUND', match: enriched }, () => {});
    });
  }

  function observeListingContent() {
    if (observerActive) {
      log('Observer already active');
      return;
    }
    
    observerActive = true;
    
    // Use MutationObserver to detect when listing data is loaded
    if (listingObserver) {
      try { listingObserver.disconnect(); } catch {}
      listingObserver = null;
    }
    if (listingObserverTimeout) {
      clearTimeout(listingObserverTimeout);
      listingObserverTimeout = null;
    }

    listingObserver = new MutationObserver((mutations, obs) => {
      const listingData = extractListingData();
      
      if (listingData && listingData.title) {
        log('Listing data found:', listingData.title);
        obs.disconnect();
        observerActive = false;
        currentListingData = listingData;
        requestPriceIntelligence(listingData);
      }
    });

    listingObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also try immediately
    const listingData = extractListingData();
    if (listingData && listingData.title) {
      log('Listing data found immediately:', listingData.title);
      listingObserver.disconnect();
      observerActive = false;
      currentListingData = listingData;
      requestPriceIntelligence(listingData);
    }
    
    // Timeout after 10 seconds
    listingObserverTimeout = setTimeout(() => {
      if (observerActive) {
        try { listingObserver && listingObserver.disconnect(); } catch {}
        observerActive = false;
        log('Timed out waiting for listing data', 'warn');
      }
    }, 10000);
  }

  function extractMarketplaceDetails() {
    const details = {};
    const keys = new Set([
      'Condition',
      'Brand',
      'Model',
      'Type',
      'Color',
      'Material',
      'Size',
      'Style',
      'Storage Capacity',
      'Screen Size'
    ]);

    try {
      // Best-effort heuristic: find rows that contain a known key and a value
      const candidates = Array.from(document.querySelectorAll('span, div'))
        .filter((el) => {
          const t = (el.textContent || '').trim();
          return t && keys.has(t);
        })
        .slice(0, 50);

      candidates.forEach((labelEl) => {
        const label = (labelEl.textContent || '').trim();
        if (!label || details[label]) return;
        const row = labelEl.closest('div');
        if (!row) return;
        const texts = Array.from(row.querySelectorAll('span, div'))
          .map((e) => (e.textContent || '').trim())
          .filter(Boolean);
        if (texts.length < 2) return;
        const idx = texts.indexOf(label);
        const value = idx >= 0 ? (texts[idx + 1] || texts[texts.length - 1]) : texts[texts.length - 1];
        if (value && value !== label && value.length < 120) {
          details[label] = value;
        }
      });
    } catch {
      // ignore
    }

    return details;
  }

  function extractListingData() {
    // Facebook uses dynamic classes, so we rely on semantic structure
    // Title is usually in the first h1 or specific span with role
    const titleEl = document.querySelector('h1') || 
                    document.querySelector('[data-testid="marketplace_pdp_title"]') ||
                    document.querySelector('span[dir="auto"]');
    
    // Price - look for currency patterns
    // This is tricky on FB, often just text like "$123"
    // We look for a span containing $ nearby the title or in main column
    const priceEl = document.querySelector('[data-testid="marketplace_pdp_price"]') ||
                    findElementByContent(/^\$[\d,]+/, titleEl ? titleEl.parentElement.parentElement : document.body);
    
    if (!titleEl) {
      return null;
    }

    const title = titleEl.textContent.trim();
    
    // Skip if title is too generic or short
    if (title.length < 3) {
      return null;
    }

    const details = extractMarketplaceDetails();
    const condition = details.Condition || null;
    const brand = details.Brand || null;
    const model = details.Model || null;

    return {
      title,
      price: priceEl ? parsePrice(priceEl.textContent) : null,
      url: window.location.href,
      platform: 'facebook',
      condition,
      brand,
      model,
      attributes: details
    };
  }

  function findElementByContent(regex, root = document.body) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    while (walker.nextNode()) {
      if (regex.test(walker.currentNode.textContent.trim())) {
        return walker.currentNode.parentElement;
      }
    }
    return null;
  }

  function parsePrice(priceStr) {
    if (!priceStr) return null;
    const match = priceStr.match(/[\d,]+\.?\d*/);
    return match ? parseFloat(match[0].replace(',', '')) : null;
  }

  function requestPriceIntelligence(listingData) {
    log('Requesting price intelligence for:', listingData.title);
    
    // Show loading state
    renderLoadingOverlay(listingData);
    
    // Send to service worker for eBay API lookup
    safeSendMessage({
      action: 'GET_PRICE_INTELLIGENCE',
      query: listingData.title,
      currentPrice: listingData.price,
      item: listingData
    }, (response) => {
      log('Price intelligence response:', response);
      
      if (response && response.requiresAuth) {
        // User needs to authenticate
        renderAuthRequiredOverlay(listingData, response.message);
      } else if (response && response.found) {
        // Success - render the price comparison
        renderOverlay(listingData, response);
      } else if (response && response.error) {
        // Error occurred
        renderErrorOverlay(listingData, response.error);
      } else {
        // No data found
        renderNoDataOverlay(listingData);
      }
    });
  }

  function createOverlayContainer() {
    // Remove existing overlay if any
    if (overlayElement) {
      overlayElement.remove();
    }

    // Create Shadow DOM container for style isolation
    const container = document.createElement('div');
    container.id = SCOUT_CONTAINER_ID;
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
    `;

    const shadow = container.attachShadow({ mode: 'open' });
    document.body.appendChild(container);
    overlayElement = container;
    
    return shadow;
  }

  function getBaseStyles() {
    return `
      .scout-card {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 16px;
        padding: 16px 20px;
        min-width: 280px;
        max-width: 320px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.1);
        position: relative;
      }
      .scout-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        font-size: 12px;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .scout-header svg {
        width: 16px;
        height: 16px;
      }
      .price-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .price-label {
        color: #94a3b8;
        font-size: 13px;
      }
      .price-value {
        font-size: 18px;
        font-weight: 600;
      }
      .ebay-price {
        color: #60a5fa;
      }
      .spread-positive {
        color: #4ade80;
      }
      .spread-negative {
        color: #f87171;
      }
      .deal-meter {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      .meter-bar {
        height: 6px;
        background: #374151;
        border-radius: 3px;
        overflow: hidden;
        position: relative;
      }
      .meter-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.3s ease;
      }
      .meter-fill.good { background: linear-gradient(90deg, #4ade80, #22c55e); }
      .meter-fill.okay { background: linear-gradient(90deg, #facc15, #eab308); }
      .meter-fill.poor { background: linear-gradient(90deg, #f87171, #ef4444); }
      .deal-label {
        font-size: 12px;
        color: #94a3b8;
        margin-top: 6px;
        text-align: center;
      }
      .scout-link {
        display: block;
        text-align: center;
        margin-top: 12px;
        color: #60a5fa;
        font-size: 12px;
        text-decoration: none;
        opacity: 0.8;
        transition: opacity 0.2s;
      }
      .scout-link:hover {
        opacity: 1;
        text-decoration: underline;
      }
      .close-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        color: #64748b;
        cursor: pointer;
        padding: 4px;
        font-size: 18px;
        line-height: 1;
      }
      .close-btn:hover {
        color: #94a3b8;
      }
      .scout-message {
        text-align: center;
        padding: 8px 0;
        color: #94a3b8;
        font-size: 13px;
      }
      .scout-btn {
        display: block;
        width: 100%;
        padding: 10px 16px;
        margin-top: 12px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        text-align: center;
        text-decoration: none;
        transition: background 0.2s;
      }
      .scout-btn:hover {
        background: #2563eb;
      }
      .scout-btn-secondary {
        background: transparent;
        border: 1px solid #64748b;
        color: #94a3b8;
      }
      .scout-btn-secondary:hover {
        background: rgba(100, 116, 139, 0.2);
      }
      .loading-spinner {
        display: flex;
        justify-content: center;
        padding: 20px;
      }
      .spinner {
        width: 24px;
        height: 24px;
        border: 2px solid #374151;
        border-top-color: #60a5fa;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
  }

  function renderLoadingOverlay(listing) {
    const shadow = createOverlayContainer();
    
    shadow.innerHTML = `
      <style>${getBaseStyles()}</style>
      <div class="scout-card">
        <button class="close-btn" title="Close">&times;</button>
        <div class="scout-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          Smart Scout
        </div>
        <div class="loading-spinner">
          <div class="spinner"></div>
        </div>
        <div class="scout-message">Checking eBay prices...</div>
      </div>
    `;

    shadow.querySelector('.close-btn').addEventListener('click', () => {
      overlayElement.remove();
      overlayElement = null;
    });
  }

  function renderAuthRequiredOverlay(listing, message) {
    const shadow = createOverlayContainer();
    
    shadow.innerHTML = `
      <style>${getBaseStyles()}</style>
      <div class="scout-card">
        <button class="close-btn" title="Close">&times;</button>
        <div class="scout-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          Smart Scout
        </div>
        <div class="scout-message">
          🔐 ${message || 'Please log in to view price comparisons'}
        </div>
        <a href="${APP_URL}/login" target="_blank" class="scout-btn">
          Log In to Smart Scout
        </a>
        <a class="scout-link" 
           href="https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(listing.title)}&LH_Sold=1&LH_Complete=1" 
           target="_blank">
          Search eBay manually →
        </a>
      </div>
    `;

    shadow.querySelector('.close-btn').addEventListener('click', () => {
      overlayElement.remove();
      overlayElement = null;
    });
  }

  function renderErrorOverlay(listing, errorMessage) {
    const shadow = createOverlayContainer();
    
    shadow.innerHTML = `
      <style>${getBaseStyles()}</style>
      <div class="scout-card">
        <button class="close-btn" title="Close">&times;</button>
        <div class="scout-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          Smart Scout
        </div>
        <div class="scout-message">
          ⚠️ ${errorMessage || 'Unable to fetch price data'}
        </div>
        <button class="scout-btn scout-btn-secondary" id="retry-btn">
          Try Again
        </button>
        <a class="scout-link" 
           href="https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(listing.title)}&LH_Sold=1&LH_Complete=1" 
           target="_blank">
          Search eBay manually →
        </a>
      </div>
    `;

    shadow.querySelector('.close-btn').addEventListener('click', () => {
      overlayElement.remove();
      overlayElement = null;
    });
    
    shadow.querySelector('#retry-btn').addEventListener('click', () => {
      requestPriceIntelligence(listing);
    });
  }

  function renderNoDataOverlay(listing) {
    const shadow = createOverlayContainer();
    
    shadow.innerHTML = `
      <style>${getBaseStyles()}</style>
      <div class="scout-card">
        <button class="close-btn" title="Close">&times;</button>
        <div class="scout-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          Smart Scout
        </div>
        <div class="scout-message">
          No comparable eBay listings found
        </div>
        <a class="scout-link" 
           href="https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(listing.title)}&LH_Sold=1&LH_Complete=1" 
           target="_blank">
          Try searching eBay directly →
        </a>
      </div>
    `;

    shadow.querySelector('.close-btn').addEventListener('click', () => {
      overlayElement.remove();
      overlayElement = null;
    });
  }

  function renderOverlay(listing, priceData) {
    const shadow = createOverlayContainer();
    
    // Calculate deal metrics
    const spread = listing.price ? (priceData.avgPrice - listing.price) : null;
    const spreadPct = listing.price ? ((spread / listing.price) * 100) : null;
    const dealRating = calculateDealRating(listing.price, priceData);

    // Render card
    shadow.innerHTML = `
      <style>${getBaseStyles()}</style>
      
      <div class="scout-card">
        <button class="close-btn" title="Close">&times;</button>
        
        <div class="scout-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          Smart Scout Price Check
          ${priceData.stale ? '<span style="color: #facc15; font-size: 10px;">(cached)</span>' : ''}
        </div>
        
        <div class="price-row">
          <span class="price-label">eBay Avg:</span>
          <span class="price-value ebay-price">$${priceData.avgPrice.toFixed(0)}</span>
        </div>
        
        <div class="price-row">
          <span class="price-label">eBay Range:</span>
          <span class="price-value" style="font-size: 14px; color: #94a3b8;">
            $${priceData.lowPrice.toFixed(0)} - $${priceData.highPrice.toFixed(0)}
          </span>
        </div>
        
        ${listing.price ? `
          <div class="price-row">
            <span class="price-label">Spread:</span>
            <span class="price-value ${spread >= 0 ? 'spread-positive' : 'spread-negative'}">
              ${spread >= 0 ? '+' : ''}$${Math.abs(spread).toFixed(0)} 
              (${spreadPct >= 0 ? '+' : ''}${spreadPct.toFixed(0)}%)
            </span>
          </div>
          
          <div class="deal-meter">
            <div class="meter-bar">
              <div class="meter-fill ${dealRating >= 70 ? 'good' : dealRating >= 40 ? 'okay' : 'poor'}" 
                   style="width: ${dealRating}%"></div>
            </div>
            <div class="deal-label">
              ${dealRating >= 70 ? '🔥 Great Deal!' : dealRating >= 40 ? '👍 Fair Price' : '⚠️ Above Market'}
            </div>
          </div>
        ` : ''}
        
        <a class="scout-link" 
           href="https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(listing.title)}&LH_Sold=1&LH_Complete=1" 
           target="_blank">
          View sold comps on eBay →
        </a>
      </div>
    `;

    // Add close button handler
    shadow.querySelector('.close-btn').addEventListener('click', () => {
      overlayElement.remove();
      overlayElement = null;
    });
  }

  function calculateDealRating(askingPrice, priceData) {
    if (!askingPrice) return 50;
    
    // Rating based on how asking compares to market
    // Below avg = good, at avg = okay, above avg = poor
    const ratio = askingPrice / priceData.avgPrice;
    
    if (ratio <= 0.5) return 95;      // 50% or less of market: amazing
    if (ratio <= 0.7) return 85;      // 70%: great
    if (ratio <= 0.85) return 70;     // 85%: good
    if (ratio <= 1.0) return 50;      // at market: fair
    if (ratio <= 1.15) return 35;     // 15% above: meh
    if (ratio <= 1.3) return 20;      // 30% above: overpriced
    return 10;                        // 30%+ above: avoid
  }

  // Quick Reply Chip Injection
  function injectQuickReplyChips() {
    // Watch for message dialogs appearing
    if (quickReplyObserver) {
      try { quickReplyObserver.disconnect(); } catch {}
      quickReplyObserver = null;
    }

    quickReplyObserver = new MutationObserver(() => {
        // Find the message input area
        const messageBox = document.querySelector('[aria-label="Message"]') ||
                           document.querySelector('textarea[placeholder*="Message"]');
        
        if (!messageBox || document.getElementById('scout-quick-replies')) {
            return;
        }

        const chipContainer = document.createElement('div');
        chipContainer.id = 'scout-quick-replies';
        chipContainer.style.cssText = `
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
            flex-wrap: wrap;
            padding: 8px;
        `;

        const quickMessages = [
            { label: 'Is it available?', text: 'Hi! Is this still available?' },
            { label: 'Pick up today?', text: 'Hi! I can pick up today if available. What times work for you?' },
            { label: 'Cash ready', text: 'Hi! Interested and have cash ready. Is this still available?' },
            { label: 'Bundle deal?', text: 'Hi! Would you consider a discount if I buy multiple items?' }
        ];

        quickMessages.forEach(({ label, text }) => {
            const chip = document.createElement('button');
            chip.textContent = label;
            chip.style.cssText = `
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 16px;
            padding: 6px 12px;
            font-size: 12px;
            cursor: pointer;
            transition: background 0.2s;
            `;
            chip.addEventListener('mouseenter', () => chip.style.background = '#2563eb');
            chip.addEventListener('mouseleave', () => chip.style.background = '#3b82f6');
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                fillMessageBox(messageBox, text);
            });
            chipContainer.appendChild(chip);
        });

        // Insert before the message box
        if (messageBox.parentElement) {
          messageBox.parentElement.insertBefore(chipContainer, messageBox);
        }
    });

    quickReplyObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
  }

  function fillMessageBox(input, text) {
    // React state hack: dispatch proper events so React registers the change
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 
        'value'
    ).set;
    
    nativeInputValueSetter.call(input, text);
    
    // Dispatch input event to trigger React's onChange
    input.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Focus the input
    input.focus();
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Handle SPA navigation (Facebook is React-based)
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;

      // Cleanup to avoid leaks and duplicate observers
      try { listingObserver && listingObserver.disconnect(); } catch {}
      listingObserver = null;
      if (listingObserverTimeout) {
        clearTimeout(listingObserverTimeout);
        listingObserverTimeout = null;
      }
      try { scannerObserver && scannerObserver.disconnect(); } catch {}
      scannerObserver = null;
      try { quickReplyObserver && quickReplyObserver.disconnect(); } catch {}
      quickReplyObserver = null;

      if (overlayElement) {
        overlayElement.remove();
        overlayElement = null;
      }
      currentListingData = null;
      observerActive = false;
      init();
    }
  }).observe(document, { subtree: true, childList: true });

})();
