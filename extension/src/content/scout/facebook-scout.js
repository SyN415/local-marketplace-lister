// Facebook Marketplace Scout - Price Intelligence Overlay
// Injects into FB Marketplace listing pages

(function() {
  'use strict';

  const SCOUT_CONTAINER_ID = 'smart-scout-overlay';
  let currentListingData = null;
  let overlayElement = null;

  // Initialize on page load
  function init() {
    // Check if we're on a marketplace listing page
    if (!isMarketplaceListingPage()) {
      return;
    }

    // Wait for listing content to load
    observeListingContent();
    
    // Inject quick reply chips (separate observer)
    injectQuickReplyChips();
  }

  function isMarketplaceListingPage() {
    return window.location.href.includes('/marketplace/item/');
  }

  function observeListingContent() {
    // Use MutationObserver to detect when listing data is loaded
    const observer = new MutationObserver((mutations, obs) => {
      const listingData = extractListingData();
      
      if (listingData && listingData.title) {
        obs.disconnect();
        currentListingData = listingData;
        requestPriceIntelligence(listingData);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also try immediately
    const listingData = extractListingData();
    if (listingData && listingData.title) {
      currentListingData = listingData;
      requestPriceIntelligence(listingData);
    }
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
    
    if (!titleEl) return null;

    return {
      title: titleEl.textContent.trim(),
      price: priceEl ? parsePrice(priceEl.textContent) : null,
      url: window.location.href,
      platform: 'facebook'
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
    // Send to service worker for eBay API lookup
    chrome.runtime.sendMessage({
      action: 'GET_PRICE_INTELLIGENCE',
      query: listingData.title,
      currentPrice: listingData.price
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('Scout: Error getting price intelligence:', chrome.runtime.lastError);
        return;
      }
      
      if (response && response.found) {
        renderOverlay(listingData, response);
      }
    });
  }

  function renderOverlay(listing, priceData) {
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
    
    // Calculate deal metrics
    const spread = listing.price ? (priceData.avgPrice - listing.price) : null;
    const spreadPct = listing.price ? ((spread / listing.price) * 100) : null;
    const dealRating = calculateDealRating(listing.price, priceData);

    // Render card
    shadow.innerHTML = `
      <style>
        .scout-card {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          padding: 16px 20px;
          min-width: 280px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.1);
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
      </style>
      
      <div class="scout-card" style="position: relative;">
        <button class="close-btn" title="Close">&times;</button>
        
        <div class="scout-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          Smart Scout Price Check
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
      container.remove();
    });

    document.body.appendChild(container);
    overlayElement = container;
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
    const messageModalObserver = new MutationObserver(() => {
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
        messageBox.parentElement.insertBefore(chipContainer, messageBox);
    });

    messageModalObserver.observe(document.body, {
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
      if (overlayElement) {
        overlayElement.remove();
        overlayElement = null;
      }
      init();
    }
  }).observe(document, { subtree: true, childList: true });

})();