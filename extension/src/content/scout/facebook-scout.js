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
  let listingPollTimeout = null;
  let scannerObserver = null;
  let quickReplyObserver = null;
  let messageListenerRegistered = false;

  // Throttle expensive extraction on FB's high-frequency DOM mutations
  let listingExtractDebounce = null;
  let lastListingExtractAt = 0;
  const LISTING_EXTRACT_COOLDOWN_MS = 600;

  // Track previous listing to detect stale data on SPA navigation
  let previousListingUrl = null;
  let previousListingTitle = null;

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

  function isMarketplaceContext() {
    // Prevent running expensive scanners on non-marketplace facebook pages.
    return window.location.pathname.includes('/marketplace');
  }

  function getListingRoot() {
    // FB often renders listing details inside a modal/dialog which is NOT inside [role="main"].
    // Prefer the closest container around marketplace_pdp nodes when present.
    try {
      const pdp = document.querySelector('[data-testid="marketplace_pdp_title"], [data-testid="marketplace_pdp_price"]');
      if (pdp) {
        return (
          pdp.closest('[role="dialog"]') ||
          pdp.closest('[role="main"]') ||
          document.querySelector('[role="dialog"]') ||
          document.querySelector('[role="main"]') ||
          document.body
        );
      }

      // Fallback: prefer dialog if we are on an item URL.
      return document.querySelector('[role="dialog"]') || document.querySelector('[role="main"]') || document.body;
    } catch {
      return document.body;
    }
  }

  function sanitizeTitle(raw) {
    if (!raw) return '';
    let t = String(raw).trim();

    // Strip common FB/Chromium prefixes like "(1) " from document.title
    t = t.replace(/^\(\d+\)\s*/i, '');

    // Remove common FB boilerplate
    t = t.replace(/^(?:facebook\s*)?marketplace\s*-\s*/i, '');
    t = t.replace(/^\(\d+\)\s*(?:facebook\s*)?marketplace\s*-\s*/i, '');

    // Remove common suffixes from document.title
    t = t.replace(/\s*\|\s*facebook\s*$/i, '');
    t = t.replace(/\s*-\s*chromium\s*$/i, '');
    t = t.replace(/\s*-\s*google\s*chrome\s*$/i, '');

    // Normalize whitespace and smart quotes
    t = t.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
    t = t.replace(/\s+/g, ' ').trim();

    // De-noise common "call to action" junk
    t = t.replace(/\bread description\b/gi, '').replace(/\s+/g, ' ').trim();
    return t;
  }

  function buildSearchQuery(item) {
    // Goal: Generate a concise, high-signal search query for eBay
    // eBay Browse API works best with short, specific queries (< 80 chars ideal)
    
    const rawTitle = item?.title || '';
    const title = sanitizeTitle(rawTitle);
    const brand = (item?.brand || '').toString().trim();
    const model = (item?.model || '').toString().trim();
    
    // Get extracted specs from description parsing (NEW)
    const specs = (item?.extractedSpecs && typeof item.extractedSpecs === 'object')
      ? item.extractedSpecs : {};
    
    // Prefer marketplace detail fields if present
    const attrs = (item?.attributes && typeof item.attributes === 'object') ? item.attributes : {};
    const type = (attrs.Type || attrs['Product Type'] || '').toString().trim();

    // ENHANCED: Detect product category from title/specs for smarter query building
    const titleLc = title.toLowerCase();
    const isComputer = /(?:pc|gaming|computer|desktop|laptop|build)/i.test(titleLc) ||
                       specs.cpu || specs.gpu || specs.ram;
    const isMonitor = /(?:monitor|display|screen|tv|oled|qled|inch|hz)/i.test(titleLc) ||
                      specs.screenSize;
    const isElectronics = isComputer || isMonitor ||
                          /(?:phone|iphone|samsung|console|playstation|xbox|nintendo)/i.test(titleLc);

    // For electronics with specs, build query from key specs rather than verbose title
    const extractGpuModel = (text) => {
      const s = String(text || '');
      const m = s.match(/\b(?:rtx|gtx|rx)\s*\d{3,4}(?:\s*(?:ti|super|xt))?\b/i);
      return m ? m[0] : '';
    };
    const extractCpuModel = (text) => {
      const s = String(text || '');
      const m = s.match(/\b(?:i[3579]-?\d{4,5}[a-z]*|ryzen\s*\d+\s*\d{4}[a-z]*)\b/i);
      return m ? m[0] : '';
    };

    if (isComputer && (specs.gpu || specs.cpu)) {
      // Gaming PC: prioritize GPU and CPU specs
      const queryParts = [];
      
      // Extract core identifying info from title (e.g., "RTX 4070", "Ryzen 7")
      const gpuFromTitle = titleLc.match(/(?:rtx|gtx|rx)\s*\d{3,4}(?:\s*(?:ti|super|xt))?/i);
      const cpuFromTitle = titleLc.match(/(?:i[3579]-?\d{4,5}[a-z]*|ryzen\s*\d+\s*\d{4}[a-z]*)/i);
      
      // Use extracted model from specs if possible, otherwise title match
      const gpu = extractGpuModel(specs.gpu) || (gpuFromTitle ? gpuFromTitle[0] : '') || '';
      const cpu = extractCpuModel(specs.cpu) || (cpuFromTitle ? cpuFromTitle[0] : '') || '';
      
      if (gpu) queryParts.push(cleanSpecValue(gpu));
      if (cpu) queryParts.push(cleanSpecValue(cpu));
      
      // Add "gaming pc" or "desktop" if we have good specs
      if (queryParts.length > 0) {
        queryParts.push('gaming pc');
      }
      
      // Add RAM if available and concise
      if (specs.ram) {
        const ramMatch = specs.ram.match(/\d+\s*gb/i);
        if (ramMatch) queryParts.push(ramMatch[0]);
      }
      
      const query = queryParts.join(' ').trim();
      if (query.length >= 15 && query.length <= 80) {
        log(`Built spec-based query: "${query}"`);
        return query;
      }
    }
    
    if (isMonitor) {
      // Monitor: prioritize brand, size, resolution, refresh rate
      const queryParts = [];
      
      // Extract key monitor specs from title
      const sizeMatch = titleLc.match(/\d{2,3}[\s"'″]*/);
      const resMatch = titleLc.match(/(?:4k|1080p|1440p|qhd|uhd|fhd)/i);
      const refreshMatch = titleLc.match(/\d{2,3}\s*hz/i);
      const panelMatch = titleLc.match(/(?:oled|qd-oled|ips|va|tn)/i);
      
      // Brand extraction
      const monitorBrands = ['msi', 'asus', 'acer', 'samsung', 'lg', 'dell', 'benq', 'alienware', 'gigabyte', 'aoc'];
      const brandMatch = monitorBrands.find(b => titleLc.includes(b));
      
      if (brandMatch) queryParts.push(brandMatch.toUpperCase());
      if (sizeMatch) queryParts.push(sizeMatch[0].replace(/['"″]/g, '"'));
      if (resMatch) queryParts.push(resMatch[0].toUpperCase());
      if (refreshMatch) queryParts.push(refreshMatch[0]);
      if (panelMatch) queryParts.push(panelMatch[0].toUpperCase());
      
      queryParts.push('monitor');
      
      const query = queryParts.join(' ').trim();
      if (query.length >= 10 && query.length <= 80) {
        log(`Built monitor query: "${query}"`);
        return query;
      }
    }

    // FALLBACK: Clean title-based query for non-electronics or when spec extraction fails
    // Remove common Facebook boilerplate that makes queries too long
    let cleanTitle = title
      .replace(/\bmarketplace\b/gi, '')
      .replace(/\bfacebook\b/gi, '')
      .replace(/\bselling\b/gi, '')
      .replace(/\bread description\b/gi, '')
      .replace(/\bobo\b/gi, '')  // "or best offer"
      .replace(/\bfirm\b/gi, '')
      .replace(/\bno trades?\b/gi, '')
      .replace(/\bpickup only\b/gi, '')
      .replace(/\bfree delivery\b/gi, '')
      .replace(/\bcash only\b/gi, '')
      .replace(/\|.*$/g, '')  // Remove everything after pipe (e.g., "| Facebook")
      .replace(/[【】\[\](){}]/g, ' ')  // Remove brackets
      .replace(/\s+/g, ' ')
      .trim();
    
    // If title is still too long, try to extract the core product name
    if (cleanTitle.length > 80) {
      // Take first meaningful chunk (likely the product name)
      const firstChunk = cleanTitle.split(/[-–—•,]/)[0].trim();
      if (firstChunk.length >= 10) {
        cleanTitle = firstChunk;
      }
    }

    // Add a few high-signal specs only (avoid noise like color unless we have room)
    const specKeys = ['Screen Size', 'Storage Capacity', 'Size', 'Capacity', 'Year', 'Series'];
    const specParts = [];
    for (const k of specKeys) {
      const v = attrs[k];
      if (!v) continue;
      const vv = String(v).trim();
      if (vv && vv.length <= 40) specParts.push(vv);
      if (specParts.length >= 2) break;
    }

    // Build with de-dupe (avoid repeating brand/model if title already contains them)
    const parts = [];
    const cleanTitleLc = cleanTitle.toLowerCase();
    const pushIfNew = (s) => {
      const v = String(s || '').trim();
      if (!v) return;
      const vLc = v.toLowerCase();
      if (cleanTitleLc.includes(vLc)) return;
      parts.push(v);
    };

    pushIfNew(brand);
    pushIfNew(model);
    pushIfNew(type);
    specParts.forEach(pushIfNew);

    // Final query: cleaned title first, then precision terms.
    const full = [cleanTitle, ...parts].join(' ').replace(/\s+/g, ' ').trim();
    const finalQuery = full.length > 80 ? full.slice(0, 80) : full;
    
    log(`Built title-based query: "${finalQuery}"`);
    return finalQuery;
  }
  
  // Helper to clean extracted spec values for search
  function cleanSpecValue(value) {
    if (!value) return '';
    return value
      .replace(/\s+/g, ' ')
      .replace(/[()[\]{}]/g, '')
      .trim()
      .slice(0, 30); // Cap individual spec values
  }

  function isLikelyBadTitle(title) {
    const t = (title || '').trim().toLowerCase();
    if (!t) return true;
    if (t === 'marketplace' || t === 'facebook marketplace') return true;
    // FB feed headers / UI labels that sometimes get picked up as "title"
    if (t === "today's picks" || t.includes("today's picks")) return true;
    if (t.includes('top picks')) return true;
    if (t.includes('browse all')) return true;
    return false;
  }

  function findTitleNearPrice(root) {
    try {
      const priceEl = root?.querySelector?.('[data-testid="marketplace_pdp_price"]') || document.querySelector('[data-testid="marketplace_pdp_price"]');
      if (!priceEl) return '';

      // Walk up a few levels and search for title-like nodes within the same card/column
      let root = priceEl;
      for (let i = 0; i < 6 && root?.parentElement; i++) {
        root = root.parentElement;
      }

      const candidates = Array.from(
        (root || document.body).querySelectorAll('h1, h2, [role="heading"], [data-testid="marketplace_pdp_title"], span[dir="auto"], div[dir="auto"]')
      )
        .map((el) => ({ el, text: sanitizeTitle(el.textContent || '') }))
        .filter((c) => c.text && c.text.length >= 3 && c.text.length <= 120)
        .filter((c) => !isLikelyBadTitle(c.text))
        .filter((c) => !/^\$\s*\d/.test(c.text));

      if (!candidates.length) return '';

      // Prefer elements before the price element in DOM order
      const beforePrice = candidates.filter((c) => {
        try {
          return !!(c.el.compareDocumentPosition(priceEl) & Node.DOCUMENT_POSITION_FOLLOWING);
        } catch {
          return false;
        }
      });

      const pool = beforePrice.length ? beforePrice : candidates;
      const score = (c) => {
        const tag = (c.el?.tagName || '').toLowerCase();
        const len = c.text.length;
        const headingBoost = tag === 'h1' ? 30 : tag === 'h2' ? 20 : 10;
        const lenBoost = (len >= 5 && len <= 80) ? 20 : (len <= 120 ? 5 : -10);
        return headingBoost + lenBoost + Math.min(len, 120) / 3;
      };
      pool.sort((a, b) => score(b) - score(a));
      return pool[0]?.text || '';
    } catch {
      return '';
    }
  }

  function isListingPageReady(main) {
    // Lightweight readiness gate so we don't time out while FB is still mounting.
    // We consider page ready if we can see a price OR the pdp title element.
    try {
      const root = main || getListingRoot();
      const hasPrice = !!(root && root.querySelector && root.querySelector('[data-testid="marketplace_pdp_price"]'));
      const hasTitle = !!(root && root.querySelector && root.querySelector('[data-testid="marketplace_pdp_title"]'));
      if (hasPrice || hasTitle) return true;

      // Last-resort heuristic: look for a currency-like text node (bounded scan)
      const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
      let seen = 0;
      while (walker.nextNode()) {
        const txt = (walker.currentNode.textContent || '').trim();
        if (!txt) continue;
        if (++seen > 250) break;
        if (/^\$\s*\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?$/.test(txt)) return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  function getMetaContent(prop) {
    return document.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') || null;
  }

  function extractPriceFromMeta() {
    // Sometimes available on product-like pages
    const p = getMetaContent('product:price:amount') || getMetaContent('og:price:amount');
    const n = p ? Number(p) : NaN;
    if (Number.isFinite(n)) return n;

    // Fall back to parsing og:description for a $ price
    const desc = getMetaContent('og:description') || '';
    const m = desc.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);
    if (!m) return null;
    return parsePrice(m[0]);
  }

  // Active Search Scanner
  function initSearchScanner() {
    if (!isMarketplaceContext()) {
      log('Not on /marketplace; scanner disabled');
      return;
    }
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

    // Prevent unbounded growth (memory pressure)
    if (processedMarketplaceCardKeys.size > 2000) {
      processedMarketplaceCardKeys.clear();
    }

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
      const parentText = container.parentElement?.textContent || '';
      if (container.parentElement && parentText.length > 50) {
        container = container.parentElement;
      } else {
        break;
      }
    }

    // Use textContent (cheaper than innerText, avoids layout) and cap length
    const raw = (container.textContent || '').slice(0, 600);
    const text = raw.toLowerCase();

    const titleElement = container.querySelector('span[style*="-webkit-line-clamp"], [data-testid="marketplace_pdp_title"]');
    const titleText = (titleElement?.textContent || '').trim();
    const title = (titleText || text).toLowerCase();
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

    // Avoid heavy scanning when the user is on a single listing page.
    if (isMarketplaceListingPage()) {
      log('On listing page; skipping watchlist scan');
      return;
    }

    if (!isMarketplaceContext()) {
      log('Not in marketplace context; skipping watchlist scan');
      return;
    }

    // Prefer incremental scanner path (avoids costly innerText scanning)
    if (watchlist && watchlist.isActive && (watchlist.platforms || []).includes('facebook')) {
      activeWatchlists = [watchlist];
      processMarketplaceLinks(document);
      return;
    }
    
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
    const text = (element.textContent || '').slice(0, 800);
    const priceText = text.match(/\$[\d,]+/);
    const titleElement = element.querySelector('span[style*="-webkit-line-clamp"]');
    const title = titleElement ? (titleElement.textContent || '').trim() : 'Unknown Item';

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
    
    // Prefer polling for listing data over a broad MutationObserver (FB can mutate constantly).
    if (listingObserver) {
      try { listingObserver.disconnect(); } catch {}
      listingObserver = null;
    }
    if (listingObserverTimeout) {
      clearTimeout(listingObserverTimeout);
      listingObserverTimeout = null;
    }
    if (listingPollTimeout) {
      clearTimeout(listingPollTimeout);
      listingPollTimeout = null;
    }

    // Capture the current URL to detect if we navigated during polling
    const currentUrl = window.location.href;
    // Extract listing ID from URL to help detect fresh data
    const currentListingId = extractListingIdFromUrl(currentUrl);
    
    const startedAt = Date.now();
    const poll = () => {
      // Throttle extraction to prevent UI freezes
      const now = Date.now();
      if (now - startedAt > 12_000) {
        observerActive = false;
        log('Timed out waiting for listing data', 'warn');
        return;
      }

      // Check if URL changed while polling - abort if so
      if (window.location.href !== currentUrl) {
        log('URL changed during polling, aborting');
        observerActive = false;
        return;
      }

      // Wait until FB has mounted the key listing nodes before attempting extraction.
      if (!isListingPageReady(document.querySelector('[role="main"]') || document.body)) {
        listingPollTimeout = setTimeout(poll, 400);
        return;
      }

      if (now - lastListingExtractAt >= LISTING_EXTRACT_COOLDOWN_MS) {
        lastListingExtractAt = now;
        const listingData = extractListingData();
        if (listingData && listingData.title && !isLikelyBadTitle(listingData.title)) {
          // FIX: Check if this is stale data from a previous listing
          // If we navigated from another listing page, verify the title is different
          const isSameUrlAsLast = previousListingUrl && previousListingUrl === currentUrl;
          const isSameTitleAsPrevious = previousListingTitle &&
            normalizeForComparison(listingData.title) === normalizeForComparison(previousListingTitle);
          
          // If we're on a NEW listing page (different URL) but got the SAME title as the previous listing,
          // this is likely stale og:title data - keep polling
          if (!isSameUrlAsLast && isSameTitleAsPrevious && (now - startedAt < 6000)) {
            log('Detected potentially stale title (same as previous listing), continuing to poll...');
            listingPollTimeout = setTimeout(poll, 400);
            return;
          }
          
          log('Listing data found:', listingData.title);
          observerActive = false;
          currentListingData = listingData;
          
          // Track this listing for stale detection on next navigation
          previousListingUrl = currentUrl;
          previousListingTitle = listingData.title;
          
          requestPriceIntelligence(listingData);
          return;
        }
      }

      listingPollTimeout = setTimeout(poll, 400);
    };

    poll();
    
    // Timeout after 12 seconds (FB can be slow to mount listing panel)
    listingObserverTimeout = setTimeout(() => {
      if (observerActive) {
        if (listingPollTimeout) {
          clearTimeout(listingPollTimeout);
          listingPollTimeout = null;
        }
        observerActive = false;
        log('Timed out waiting for listing data', 'warn');
      }
    }, 12000);
  }

  // Helper to extract listing ID from Facebook Marketplace URL
  function extractListingIdFromUrl(url) {
    const match = url.match(/\/marketplace\/item\/(\d+)/);
    return match ? match[1] : null;
  }

  // Normalize title for comparison (to detect stale data)
  function normalizeForComparison(title) {
    return (title || '').toLowerCase().trim().replace(/\s+/g, ' ');
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
      const main = document.querySelector('[role="main"]') || document.body;

      // Try to scope to the details panel area to avoid scanning the whole document.
      let detailsRoot = main;
      const detailsHeading = Array.from(main.querySelectorAll('span, div'))
        .find((el) => (el.textContent || '').trim().toLowerCase() === 'details');
      if (detailsHeading) {
        detailsRoot = detailsHeading.closest('div') || main;
      }

      // Best-effort heuristic: find rows that contain a known key and a value
      const candidates = Array.from(detailsRoot.querySelectorAll('span, div'))
        .filter((el) => {
          const t = (el.textContent || '').trim();
          return t && keys.has(t);
        })
        .slice(0, 40);

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

  // NEW: Extract full description text from the listing page
  function extractFullDescription() {
    try {
      const main = document.querySelector('[role="main"]') || document.body;
      
      // Facebook marketplace listings typically have description in a specific area
      // Look for text blocks that contain spec-like content
      const descriptionCandidates = [];
      
      // Strategy 1: Look for "See more" expandable sections or long text blocks
      const allTextElements = main.querySelectorAll('span[dir="auto"], div[dir="auto"]');
      
      for (const el of allTextElements) {
        const text = (el.textContent || '').trim();
        // Skip short texts, navigation elements, buttons
        if (text.length < 50) continue;
        if (text.toLowerCase().includes('see more')) continue;
        if (text.toLowerCase().includes('message seller')) continue;
        if (text.toLowerCase().includes('is this available')) continue;
        
        // Good candidates: contains specs-like patterns
        const hasSpecs = /(?:cpu|gpu|ram|storage|processor|memory|ssd|hdd|nvidia|amd|intel|ryzen|geforce|radeon|gb|tb|mhz|ghz)/i.test(text);
        const hasDescription = text.length > 100 || hasSpecs;
        
        if (hasDescription) {
          descriptionCandidates.push({
            text,
            score: text.length + (hasSpecs ? 500 : 0)
          });
        }
      }
      
      // Sort by score and take the best candidates
      descriptionCandidates.sort((a, b) => b.score - a.score);
      
      // Combine top candidates (may have title + description separately)
      const combinedText = descriptionCandidates
        .slice(0, 3)
        .map(c => c.text)
        .join('\n\n');
      
      return combinedText.slice(0, 2000); // Cap at 2000 chars
    } catch (e) {
      log('Error extracting description: ' + e?.message, 'warn');
      return '';
    }
  }

  // NEW: Extract image URLs from the listing
  function extractImageUrls() {
    try {
      const imageUrls = [];
      const main = document.querySelector('[role="main"]') || document.body;
      
      // Look for main listing images - usually high quality images
      const images = main.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]');
      
      for (const img of images) {
        const src = img.src || img.getAttribute('data-src') || '';
        if (!src) continue;
        
        // Skip small thumbnails, icons, profile pics
        const width = img.naturalWidth || parseInt(img.getAttribute('width') || '0');
        const height = img.naturalHeight || parseInt(img.getAttribute('height') || '0');
        
        // Only include images that appear to be product images (larger size)
        if (width > 200 || height > 200 || src.includes('s1080x1080') || src.includes('s960x960')) {
          imageUrls.push(src);
        }
      }
      
      // Deduplicate and limit
      const uniqueUrls = [...new Set(imageUrls)].slice(0, 5);
      return uniqueUrls;
    } catch (e) {
      log('Error extracting images: ' + e?.message, 'warn');
      return [];
    }
  }

  // NEW: Extract structured specs from description text
  // FIXED: Make spec extraction more conservative to avoid false positives from stale descriptions
  function extractSpecsFromDescription(description) {
    const specs = {};
    
    // Only extract specs if description is substantial and contains spec-like patterns
    // This prevents extracting specs from short descriptions or unrelated text
    if (!description || description.length < 50) {
      return specs; // Return empty for short descriptions
    }
    
    const isValidSpecValue = (v) => {
      const s = String(v || '').trim();
      if (!s) return false;
      if (s.length < 2) return false;
      // Reject emojis / decorative junk / punctuation-only
      if (/^[^a-z0-9]+$/i.test(s)) return false;
      // Reject extreme lengths
      if (s.length > 80) return false;
      return true;
    };

    const extractGpuModelToken = (text) => {
      const s = String(text || '');
      const m = s.match(/\b(?:rtx|gtx|rx)\s*\d{3,4}(?:\s*(?:ti|super|xt))?\b/i);
      return m ? m[0].toUpperCase().replace(/\s+/g, ' ') : '';
    };

    const extractCpuModelToken = (text) => {
      const s = String(text || '');
      const m = s.match(/\b(?:i[3579]-?\d{4,5}[a-z]*|ryzen\s*\d+\s*\d{4}[a-z]*)\b/i);
      return m ? m[0].toUpperCase().replace(/\s+/g, ' ') : '';
    };
    
    try {
      // CPU patterns (reduce to model token only)
      const cpuRaw = (description.match(/(?:cpu|processor)[:\s]*([^\n•,]+)/i)?.[1]) ||
                     (description.match(/\b(i[3579]-?\d{4,5}[a-z]*)\b/i)?.[1]) ||
                     (description.match(/\b(ryzen\s*\d+\s*\d{4}[a-z]*)\b/i)?.[1]) ||
                     '';
      const cpuTok = extractCpuModelToken(cpuRaw);
      if (cpuTok) specs.cpu = cpuTok;
      
      // GPU patterns (reduce to model token only)
      const gpuRaw = (description.match(/(?:gpu|graphics)[:\s]*([^\n•,]+)/i)?.[1]) ||
                     (description.match(/\b((?:rtx|gtx|rx)\s*\d{3,4}(?:\s*(?:ti|super|xt))?)\b/i)?.[1]) ||
                     '';
      const gpuTok = extractGpuModelToken(gpuRaw);
      if (gpuTok) specs.gpu = gpuTok;
      
      // RAM patterns
      const ramRaw = (description.match(/(?:ram|memory)[:\s]*([^\n•,]+)/i)?.[1]) ||
                     (description.match(/\b(\d+\s*gb)\b/i)?.[1]) ||
                     '';
      const ramTok = ramRaw.match(/\b\d+\s*gb\b/i)?.[0] || '';
      if (ramTok) specs.ram = ramTok.toUpperCase();
      
      // Storage patterns
      const storageRaw = (description.match(/(?:storage|ssd|hdd)[:\s]*([^\n•,]+)/i)?.[1]) ||
                         (description.match(/\b(\d+\s*(?:gb|tb)\s*(?:ssd|hdd|nvme|m\.2))\b/i)?.[1]) ||
                         '';
      const storageTok = storageRaw.match(/\b\d+\s*(?:gb|tb)\b/i)?.[0] || '';
      if (storageTok) specs.storage = storageTok.toUpperCase();
      
      // Screen size for monitors/TVs
      const screenMatch = description.match(/\b(\d{2,3})\s*(?:"|″|in\b|inch\b)/i);
      if (screenMatch) specs.screenSize = `${screenMatch[1]}"`;
      
    } catch (e) {
      log('Error extracting specs: ' + e?.message, 'warn');
    }

    // Validate final values
    Object.keys(specs).forEach((k) => {
      if (!isValidSpecValue(specs[k])) delete specs[k];
    });
    
    return specs;
  }

  function extractListingData() {
    // Prefer a listing-specific root. FB listing pages are frequently rendered in a dialog/modal.
    const main = getListingRoot();

    // FIX: Prioritize DOM-extracted title over og:title because Facebook's React app
    // updates the DOM more reliably during SPA navigation than the og:title meta tag.
    // The og:title can be stale when quickly navigating between listings.
    
    // First, try the most reliable selector: marketplace_pdp_title (if available)
    const pdpTitle = main.querySelector('[data-testid="marketplace_pdp_title"]');
    const pdpTitleText = pdpTitle ? sanitizeTitle(pdpTitle.textContent) : '';

    // Second, try to derive title from the same DOM region as the price
    // (prevents feed headers like "Today's picks" from being used)
    const nearPriceTitle = sanitizeTitle(findTitleNearPrice(main));
    
    // Also look for title in document.title (Facebook updates on navigation, but can be noisy)
    const docTitle = sanitizeTitle(document.title);
    
    // Candidate title elements inside main.
    // IMPORTANT: avoid broad selectors like span[dir="auto"] (often captures description/other UI text).
    const candidates = Array.from(
      main.querySelectorAll('h1, h2, [role="heading"], [data-testid="marketplace_pdp_title"]')
    )
      .map((el) => ({
        el,
        text: (el.textContent || '').trim()
      }))
      .filter((c) => c.text.length >= 3)
      .filter((c) => c.text.toLowerCase() !== 'marketplace')
      .filter((c) => c.text.toLowerCase() !== 'facebook marketplace')
      .slice(0, 50);

    // Choose the best candidate by heuristic:
    // - Prefer heading-like elements
    // - Prefer reasonable title lengths (avoid huge blocks like full descriptions)
    const scoreCandidate = (c) => {
      const tag = (c?.el?.tagName || '').toLowerCase();
      const txt = c?.text || '';
      const len = txt.length;
      const isHeadingTag = tag === 'h1' ? 3 : tag === 'h2' ? 2 : 1;
      const lenScore = (len >= 5 && len <= 120) ? 2 : (len <= 180 ? 1 : -2);
      return isHeadingTag * 10 + lenScore * 3 + Math.min(len, 120) / 40;
    };
    const best = candidates.sort((a, b) => scoreCandidate(b) - scoreCandidate(a))[0];
    const bestText = sanitizeTitle(best?.text);
    
    // og:title as last resort (can be stale during SPA navigation)
    const ogTitleRaw = getMetaContent('og:title');
    const ogTitle = sanitizeTitle(ogTitleRaw);

    // Staleness guard: if we are falling back to document/meta title, verify og:url matches current listing ID.
    // FB often keeps og:title/og:url from the previous listing during SPA navigation.
    const currentListingId = extractListingIdFromUrl(window.location.href);
    const ogUrl = getMetaContent('og:url') || '';
    // IMPORTANT: og:url is sometimes missing/late-loading. Treat missing og:url as "unknown" (allow fallback).
    const ogUrlMatchesCurrent = !currentListingId ? true : (!ogUrl ? true : ogUrl.includes(currentListingId));

    // Priority order for title extraction:
    // 1. marketplace_pdp_title (most reliable React-controlled element)
    // 2. Title near price (same card/column)
    // 3. Best DOM candidate (heading heuristic)
    // 4. document.title (guarded by og:url match)
    // 5. og:title (guarded by og:url match)
    let titleText = '';
    let titleSource = '';
    
    if (pdpTitleText && pdpTitleText.length >= 3 && !isLikelyBadTitle(pdpTitleText)) {
      titleText = pdpTitleText;
      titleSource = 'pdp_title';
    } else if (nearPriceTitle && nearPriceTitle.length >= 3 && !isLikelyBadTitle(nearPriceTitle)) {
      titleText = nearPriceTitle;
      titleSource = 'near_price';
    } else if (docTitle && docTitle.length >= 3 && !isLikelyBadTitle(docTitle) && ogUrlMatchesCurrent) {
      titleText = docTitle;
      titleSource = 'document_title';
    } else if (bestText && bestText.length >= 3 && !isLikelyBadTitle(bestText)) {
      titleText = bestText;
      titleSource = 'dom_candidate';
    } else if (ogTitle && ogTitle.length >= 3 && !isLikelyBadTitle(ogTitle) && ogUrlMatchesCurrent) {
      titleText = ogTitle;
      titleSource = 'og_title';
    }

    // If we still don't have a title, or meta/doc titles are stale, keep polling.
    if (!titleText) {
      return null;
    }

    const titleEl = best?.el || pdpTitle || null;
    
    // Price - look for currency patterns
    // This is tricky on FB, often just text like "$123"
    // We look for a span containing $ nearby the title or in main column
    const metaPrice = extractPriceFromMeta();
    const priceEl = document.querySelector('[data-testid="marketplace_pdp_price"]') ||
                    findElementByContent(/^\$[\d,]+/, titleEl ? titleEl.parentElement?.parentElement || main : main);

    if (!titleText) {
      return null;
    }

    const title = sanitizeTitle(titleText);
    
    // Skip if title is too generic or short
    if (title.length < 3 || title.toLowerCase() === 'marketplace') {
      return null;
    }

    const details = extractMarketplaceDetails();
    const condition = details.Condition || null;
    const brand = details.Brand || null;
    const model = details.Model || null;

    // NEW: Extract full description and specs for AI-powered search term generation
    const fullDescription = extractFullDescription();
    const extractedSpecs = extractSpecsFromDescription(fullDescription);
    const imageUrls = extractImageUrls();
    
    // Merge extracted specs with marketplace details (prefer marketplace if available)
    const mergedSpecs = {
      ...extractedSpecs,
      ...(brand && { brand }),
      ...(model && { model }),
      ...(condition && { condition }),
    };

    log(`Title extracted from ${titleSource}: "${title.substring(0, 50)}..."`);
    if (fullDescription) {
      log(`Description length: ${fullDescription.length} chars`);
    }
    if (Object.keys(extractedSpecs).length > 0) {
      log(`Extracted specs: ${JSON.stringify(extractedSpecs)}`);
    }

    return {
      title,
      price: Number.isFinite(metaPrice) ? metaPrice : (priceEl ? parsePrice(priceEl.textContent) : null),
      url: window.location.href,
      platform: 'facebook',
      condition,
      brand,
      model,
      attributes: details,
      // NEW: Enhanced data for AI-powered search
      fullDescription,
      extractedSpecs: mergedSpecs,
      imageUrls,
      _titleSource: titleSource // For debugging
    };
  }

  function findElementByContent(regex, root = document.body) {
    // Guard against scanning huge DOMs (can freeze FB)
    const maxNodes = 600;
    let seen = 0;
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    while (walker.nextNode()) {
      seen++;
      if (seen > maxNodes) return null;
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
    log('Starting multi-modal item identification...');
    
    // Guard against SPA navigation: ignore late responses for a previous listing.
    const requestKey = `${(listingData?.url || '').split('?')[0]}::${Date.now()}`;
    window.__smartScoutActiveRequestKey = requestKey;
    
    // Show loading state
    renderLoadingOverlay(listingData);
    
    // Step 0 (NEW): Best-effort inline image extraction for AI.
    // FB image URLs (fbcdn/scontent) are often not publicly fetchable by the backend/LLM.
    // We therefore fetch a couple images in-page and send as data URLs.
    const fetchImageAsDataUrl = async (url, timeoutMs = 2500) => {
      try {
        if (!url || typeof url !== 'string') return null;
        if (url.startsWith('data:image')) return url;

        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), timeoutMs);
        // Remove credentials: 'include' to avoid CORS issues with Facebook CDN
        const resp = await fetch(url, { signal: controller.signal });
        clearTimeout(t);
        if (!resp.ok) return null;
        const blob = await resp.blob();

        // Cap size to avoid huge payloads to service worker/backend.
        // 800KB is a practical upper bound for quick analysis.
        if (blob.size > 800_000) return null;

        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
        return typeof dataUrl === 'string' ? dataUrl : null;
      } catch {
        return null;
      }
    };

    const getListingForAnalysis = async () => {
      const urls = Array.isArray(listingData?.imageUrls) ? listingData.imageUrls : [];
      const dataUrls = [];
      for (const u of urls.slice(0, 2)) {
        const du = await fetchImageAsDataUrl(u);
        if (du) dataUrls.push(du);
      }
      return {
        ...listingData,
        imageDataUrls: dataUrls
      };
    };

    // Step 1: Use multi-modal identifier to generate optimized query
    (async () => {
      const listingForAnalysis = await getListingForAnalysis();
      safeSendMessage({
        action: 'MULTIMODAL_ANALYZE_LISTING',
        listingData: listingForAnalysis
      }, async (analysisResponse) => {
      // Ignore if the user navigated away while the request was in flight.
      const currentUrl = (window.location.href || '').split('?')[0];
      const listingUrl = (listingData?.url || '').split('?')[0];
      if (window.__smartScoutActiveRequestKey !== requestKey || (listingUrl && currentUrl !== listingUrl)) {
        log('Ignoring stale analysis response (navigated away)');
        return;
      }
      
      log('Multi-modal analysis response:', analysisResponse);
      
      // Determine which query to use
      let query;
      let querySource;
      
      if (analysisResponse && analysisResponse.success && analysisResponse.query) {
        // Use AI-optimized query from multi-modal analysis
        query = analysisResponse.query;
        querySource = analysisResponse.sources?.join('+') || 'multimodal';
        log(`Using AI-optimized query (${querySource}): "${query}"`);
      } else {
        // Fallback to traditional query building
        query = buildSearchQuery(listingData);
        querySource = 'fallback_traditional';
        log(`Using fallback query: "${query}"`);
      }
      
      // Step 2: Request price intelligence with the optimized query
      safeSendMessage({
        action: 'GET_PRICE_INTELLIGENCE',
        query,
        currentPrice: listingData.price,
        item: listingData,
        querySource: querySource
      }, (response) => {
        // Ignore if the user navigated away while the request was in flight.
        const currentUrl2 = (window.location.href || '').split('?')[0];
        const listingUrl2 = (listingData?.url || '').split('?')[0];
        if (window.__smartScoutActiveRequestKey !== requestKey || (listingUrl2 && currentUrl2 !== listingUrl2)) {
          log('Ignoring stale price intelligence response (navigated away)');
          return;
        }
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
      });
    })();
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

    let lastQuickReplyAt = 0;
    quickReplyObserver = new MutationObserver(() => {
        const now = Date.now();
        if (now - lastQuickReplyAt < 700) return;
        lastQuickReplyAt = now;

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

        // Once injected, we can stop observing to reduce overhead.
        try { quickReplyObserver && quickReplyObserver.disconnect(); } catch {}
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
  // Avoid MutationObserver on entire document (high-frequency, can cause lag/freezes).
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;

      // Cleanup to avoid leaks and duplicate observers
      try { listingObserver && listingObserver.disconnect(); } catch {}
      listingObserver = null;
      if (listingObserverTimeout) {
        clearTimeout(listingObserverTimeout);
        listingObserverTimeout = null;
      }
      if (listingPollTimeout) {
        clearTimeout(listingPollTimeout);
        listingPollTimeout = null;
      }
      if (listingExtractDebounce) {
        clearTimeout(listingExtractDebounce);
        listingExtractDebounce = null;
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
      // Invalidate any in-flight request so late responses don't render on the new listing.
      window.__smartScoutActiveRequestKey = null;
      init();
    }
  }, 250);

})();
