// Craigslist Scout - Price Intelligence Overlay
// Injects into Craigslist listing pages

(function() {
    'use strict';
  
    const SCOUT_CONTAINER_ID = 'smart-scout-overlay';
    const APP_URL = 'https://local-marketplace-backend-wr5e.onrender.com';
    
    let currentListingData = null;
    let overlayElement = null;

    // Prevent noisy "Extension context invalidated" errors on reloads
    function isExtensionContextValid() {
      try {
        return !!(chrome && chrome.runtime && chrome.runtime.id);
      } catch {
        return false;
      }
    }

    function safeSendMessage(payload, callback) {
      if (!isExtensionContextValid()) return;
      try {
        chrome.runtime.sendMessage(payload, (response) => {
          if (chrome.runtime.lastError) return;
          callback && callback(response);
        });
      } catch (e) {
        log(`sendMessage failed: ${e?.message || e}`, 'warn');
      }
    }

    // Logging helper with prefix
    function log(message, level = 'info') {
      const prefix = '[SmartScout CL]';
      if (level === 'error') {
        console.error(prefix, message);
      } else if (level === 'warn') {
        console.warn(prefix, message);
      } else {
        console.log(prefix, message);
      }
    }
  
    // Initialize on page load
    function init() {
      log('Initializing...');

      // Listing page: run price intelligence overlay logic
      if (isListingPage()) {
        log('On listing page, extracting data');

        // Extract data immediately as CL is mostly static HTML
        const listingData = extractListingData();
        if (listingData && listingData.title) {
          log('Listing data found:', listingData.title);
          currentListingData = listingData;
          requestPriceIntelligence(listingData);
        } else {
          log('Could not extract listing data', 'warn');
        }

        injectQuickReplyChips();
        return;
      }

      // Non-listing pages: enable active scanning like Facebook Marketplace
      log('Not on a listing page, initializing search scanner');
      initSearchScanner();

      // Listen for watchlist check messages from background script
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'WATCHLIST_CHECK') {
          handleWatchlistCheck(request.watchlist);
        }
      });
    }
  
    function isListingPage() {
      // CL listings are typically /d/title/id.html
      return /\/d\/.*\/(\d+)\.html$/.test(window.location.href);
    }

    function isSearchOrCategoryPage() {
      // Search results: /search/..., category pages: /search/sss, /d/ can appear in links but not the page.
      return window.location.pathname.includes('/search/') || document.querySelector('ol.cl-static-search-results, ul.rows, .cl-search-result, li.result-row');
    }

    // Active Search Scanner (mirrors FB behavior)
    function initSearchScanner() {
      if (!isSearchOrCategoryPage()) {
        log('Not a search/category page; scanner idle');
        return;
      }

      chrome.storage.local.get(['watchlistItems'], (result) => {
        const items = result.watchlistItems || [];
        const activeWatchlists = items.filter(w => w.isActive && (w.platforms || []).includes('craigslist'));

        if (activeWatchlists.length === 0) {
          log('No active Craigslist watchlists found');
          return;
        }

        log(`Found ${activeWatchlists.length} active watchlists, starting scanner`);

        let scanDebounce;
        let lastScanAt = 0;
        const COOLDOWN_MS = 200;

        const scheduleScan = () => {
          clearTimeout(scanDebounce);
          scanDebounce = setTimeout(() => {
            const now = Date.now();
            if (now - lastScanAt < COOLDOWN_MS) {
              // enforce 200ms cooldown between scan cycles
              return;
            }
            lastScanAt = now;
            scanPageForWatchlists(activeWatchlists);
          }, 250);
        };

        // Initial scan
        scheduleScan();

        // Watch for new content (pagination/infinite scroll)
        const observer = new MutationObserver(() => {
          scheduleScan();
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      });
    }

    function scanPageForWatchlists(watchlists) {
      watchlists.forEach((watchlist) => {
        const matches = scanForMatches(watchlist);
        if (matches.length > 0) {
          log(`Found ${matches.length} matches for "${watchlist.keywords}"`);
          matches.forEach((match) => highlightMatch(match.element, watchlist, match));
        }
      });
    }

    function handleWatchlistCheck(watchlist) {
      log('Received watchlist check request for:', watchlist?.keywords);
      const matches = scanForMatches(watchlist);
      if (matches.length > 0) {
        log(`Found ${matches.length} matches for ${watchlist.keywords}`);
        matches.forEach((match) => highlightMatch(match.element, watchlist, match));
      } else {
        log('No matches found on current page');
      }
    }

    const seenListingKeys = new Set();

    function scanForMatches(watchlist) {
      const matches = [];
      if (!watchlist || !watchlist.keywords) return matches;

      const keywords = watchlist.keywords.toLowerCase().split(' ').filter(k => k.length > 0);
      const maxPrice = watchlist.max_price || watchlist.maxPrice || Infinity;
      const minPrice = watchlist.min_price || watchlist.minPrice || 0;

      // Craigslist result rows can appear in multiple layouts.
      // Old: li.result-row
      // New: li.cl-static-search-result
      const resultEls = document.querySelectorAll(
        'li.cl-static-search-result, li.result-row, .cl-search-result'
      );

      resultEls.forEach((el) => {
        // Link
        const linkEl = el.querySelector('a.posting-title, a.result-title, a.cl-app-anchor') || el.querySelector('a[href*="/d/"]');
        const href = linkEl?.href;
        if (!href) return;

        // Dedupe across rescans
        const key = href.split('#')[0];
        if (seenListingKeys.has(key)) return;

        // Title
        const titleText = (linkEl.textContent || el.querySelector('.result-title')?.textContent || '').trim();
        if (!titleText) return;

        // Price
        const priceText = (el.querySelector('.priceinfo .price, .result-price, .price')?.textContent || '').trim();
        const price = priceText ? parsePrice(priceText) : null;

        const searchable = (titleText + ' ' + (el.textContent || '')).toLowerCase();
        const matchesKeywords = keywords.every(k => searchable.includes(k));

        if (!matchesKeywords) return;

        if (price !== null) {
          if (price < minPrice || price > maxPrice) return;
        }

        // Mark seen only when it matches; we want rescans to still consider non-matches after keyword edits.
        seenListingKeys.add(key);

        matches.push({
          element: el,
          title: titleText,
          price,
          link: href
        });
      });

      return matches;
    }

    function shouldSuppressByBudget(watchlist, match) {
      const maxPrice = watchlist?.max_price ?? watchlist?.maxPrice;
      if (maxPrice === undefined || maxPrice === null || maxPrice === Infinity) return false;

      const parsedMax = typeof maxPrice === 'string' ? parsePrice(maxPrice) : Number(maxPrice);
      if (!Number.isFinite(parsedMax)) return false;

      // STRICT budget compliance:
      // - If listing price is missing/unparseable, suppress (avoid false positives)
      // - If listing price exceeds budget, suppress regardless of keyword match
      const p = match?.price;
      if (p === null || p === undefined) return true;
      if (!Number.isFinite(p)) return true;
      return p > parsedMax;
    }

    function highlightMatch(element, watchlist, match) {
      if (!element || element.dataset.scoutHighlighted) return;

      // Secondary strict budget validation layer (pre-processing) to prevent badge rendering false positives
      if (shouldSuppressByBudget(watchlist, match)) {
        return;
      }

      element.dataset.scoutHighlighted = 'true';
      element.style.outline = '3px solid #4ade80';
      element.style.outlineOffset = '2px';
      element.style.position = element.style.position || 'relative';

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

      // Try to place badge inside a visible container
      const target = element.querySelector('.result-info, .cl-static-search-result') || element;
      target.appendChild(badge);

      // If we have a price + title, try to enrich with sold comps for Profit Analyzer
      // but dispatch immediately first to keep the HUD real-time.
      recordMatchAndNotify(match || {
        title: badge.textContent,
        price: null,
        link: window.location.href
      }, watchlist);

      if (match?.title) {
        safeSendMessage({
          action: 'GET_PRICE_INTELLIGENCE',
          query: match.title,
          currentPrice: match.price
        }, (response) => {
          if (!response || !response.found) return;

          recordMatchAndNotify({
            ...match,
            avgPrice: response.avgPrice,
            lowPrice: response.lowPrice,
            highPrice: response.highPrice,
            compsCount: response.count,
            stale: response.stale || response.cached || false
          }, watchlist);
        });
      }
    }

    // Handle SPA-style navigation and back/forward for CL (rare, but safe)
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        // Reset overlay + listing
        if (overlayElement) {
          overlayElement.remove();
          overlayElement = null;
        }
        currentListingData = null;
        init();
      }
    }).observe(document, { subtree: true, childList: true });
  
    function extractListingData() {
      const titleEl = document.getElementById('titletextonly');
      const priceEl = document.querySelector('.price');
      
      if (!titleEl) return null;
  
      const title = titleEl.textContent.trim();
      
      // Skip if title is too generic or short
      if (title.length < 3) {
        return null;
      }
  
      return {
        title: title,
        price: priceEl ? parsePrice(priceEl.textContent) : null,
        url: window.location.href,
        platform: 'craigslist'
      };
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
        currentPrice: listingData.price
      }, (response) => {
        log('Price intelligence response:', response);
        
        if (response && response.requiresAuth) {
          // User needs to authenticate
          renderAuthRequiredOverlay(listingData, response.message);
        } else if (response && response.found) {
          // Success - render the price comparison
          renderOverlay(listingData, response);

          // Notify HUD with enriched analyzer inputs
          recordMatchAndNotify({
            title: listingData.title,
            price: listingData.price,
            link: listingData.url,
            avgPrice: response.avgPrice,
            lowPrice: response.lowPrice,
            highPrice: response.highPrice,
            compsCount: response.count,
            stale: response.stale || response.cached || false
          }, null);
        } else if (response && response.error) {
          // Error occurred
          renderErrorOverlay(listingData, response.error);
        } else {
          // No data found
          renderNoDataOverlay(listingData);
        }
      });
    }

    // Match bookkeeping + HUD event dispatch
    function recordMatchAndNotify(match, watchlist) {
      try {
        const payload = {
          id: match?.id || `${match?.link || window.location.href}::${watchlist?.id || 'na'}`,
          ts: Date.now(),
          title: match?.title || watchlist?.keywords || 'Match',
          price: match?.price ?? '???',
          link: match?.link || window.location.href,
          platform: 'craigslist',
          watchlistId: watchlist?.id,
          watchlistKeywords: watchlist?.keywords,
          avgPrice: match?.avgPrice,
          lowPrice: match?.lowPrice,
          highPrice: match?.highPrice,
          compsCount: match?.compsCount,
          stale: match?.stale
        };

        // Increment total matches in storage for the watchlist (drives HUD stats)
        if (watchlist?.id) {
          chrome.storage.local.get(['watchlistItems'], (result) => {
            const items = result.watchlistItems || [];
            const next = items.map((w) => {
              if (w.id !== watchlist.id) return w;
              const current = typeof w.totalMatches === 'number' ? w.totalMatches : 0;
              return { ...w, totalMatches: current + 1, lastMatchAt: new Date().toISOString() };
            });
            chrome.storage.local.set({ watchlistItems: next });
          });
        }

        // Dispatch event for HUD
      document.dispatchEvent(new CustomEvent('SMART_SCOUT_MATCH_FOUND', {
        detail: payload
      }));

      // Broadcast to background for cross-tab synchronization
      safeSendMessage({ action: 'SCOUT_MATCH_FOUND', match: payload }, () => {});
    } catch (e) {
      log('Failed to record/notify match: ' + e.message, 'warn');
    }
  }

    // Backwards-compatible helper used by listing overlay flow
    function notifyMatch(listing, watchlist) {
      recordMatchAndNotify(
        { title: listing.title, price: listing.price, link: listing.url },
        watchlist
      );
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
          width: 100px;
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
          <div class="scout-message" style="font-size: 11px; margin-top: -8px; opacity: 0.8;">
            (Open the dashboard to sync your login)
          </div>
          <a href="${APP_URL}/login" target="_blank" class="scout-btn">
            Log In / Open Dashboard
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
      
      const ratio = askingPrice / priceData.avgPrice;
      
      if (ratio <= 0.5) return 95;
      if (ratio <= 0.7) return 85;
      if (ratio <= 0.85) return 70;
      if (ratio <= 1.0) return 50;
      if (ratio <= 1.15) return 35;
      if (ratio <= 1.3) return 20;
      return 10;
    }

    // Quick Reply Chip Injection
  function injectQuickReplyChips() {
    const replyButton = document.querySelector('.reply-button');
    if (!replyButton || document.getElementById('scout-quick-replies')) return;

    // In CL, the reply button opens a panel. We can add our chips inside or near that panel.
    // For simplicity, we'll try to add them near the reply button.
    
    const chipContainer = document.createElement('div');
    chipContainer.id = 'scout-quick-replies';
    chipContainer.style.cssText = `
        display: flex;
        gap: 8px;
        margin-top: 10px;
        flex-wrap: wrap;
    `;

    const quickMessages = [
        { label: 'Is it available?', text: 'Hi! Is this still available?' },
        { label: 'Pick up today?', text: 'Hi! I can pick up today if available. What times work for you?' },
        { label: 'Cash ready', text: 'Hi! Interested and have cash ready. Is this still available?' }
    ];

    quickMessages.forEach(({ label, text }) => {
        const chip = document.createElement('button');
        chip.textContent = label;
        chip.style.cssText = `
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 12px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.2s;
        margin-right: 5px;
        `;
        chip.addEventListener('mouseenter', () => chip.style.background = '#2563eb');
        chip.addEventListener('mouseleave', () => chip.style.background = '#3b82f6');
        chip.addEventListener('click', (e) => {
            e.preventDefault();
            // Copy to clipboard for CL
            navigator.clipboard.writeText(text).then(() => {
                const originalText = chip.textContent;
                chip.textContent = 'Copied!';
                setTimeout(() => chip.textContent = originalText, 1500);
            });
        });
        chipContainer.appendChild(chip);
    });

    // Add helper text
    const helper = document.createElement('div');
    helper.textContent = '(Click to copy to clipboard)';
    helper.style.cssText = 'font-size: 10px; color: #666; margin-top: 4px; width: 100%;';
    chipContainer.appendChild(helper);

    if (replyButton.parentElement) {
      replyButton.parentElement.insertBefore(chipContainer, replyButton.nextSibling);
    }
  }
  
    // Initialize
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  
  })();
