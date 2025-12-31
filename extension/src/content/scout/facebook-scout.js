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

  // Debug helper: dump information about visible elements for troubleshooting
  // Call this from browser console: window.__smartScoutDump()
  function dumpPageStructure() {
    const results = {
      dialogs: [],
      headings: [],
      prices: [],
      dollarElements: [],
      dataTestids: []
    };

    // Find dialogs
    document.querySelectorAll('[role="dialog"]').forEach(el => {
      const rect = el.getBoundingClientRect();
      results.dialogs.push({ tag: el.tagName, width: rect.width, height: rect.height });
    });

    // Find headings
    document.querySelectorAll('h1, h2, [role="heading"]').forEach(el => {
      const text = el.textContent?.trim().substring(0, 60) || '';
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        results.headings.push({ tag: el.tagName, role: el.getAttribute('role'), text, top: rect.top });
      }
    });

    // Find price-like text (exact match)
    document.querySelectorAll('span, div').forEach(el => {
      const text = el.textContent?.trim() || '';
      if (/^\$[\d,]+$/.test(text) && el.childElementCount === 0) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.top < 600) {
          results.prices.push({ text, tag: el.tagName, top: rect.top, left: rect.left });
        }
      }
    });

    // Find ANY element containing $ (more permissive search)
    document.querySelectorAll('span, div').forEach(el => {
      const text = el.textContent?.trim() || '';
      // Look for $ anywhere in text, or currency-like patterns
      if ((text.includes('$') || text.includes('＄') || /\d{2,}/.test(text)) &&
          el.childElementCount <= 1 && text.length < 30) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.top < 600) {
          results.dollarElements.push({
            text,
            tag: el.tagName,
            top: rect.top?.toFixed(0),
            children: el.childElementCount,
            className: el.className?.substring?.(0, 30) || ''
          });
        }
      }
    });

    // Find data-testid elements
    document.querySelectorAll('[data-testid]').forEach(el => {
      const testid = el.getAttribute('data-testid');
      if (testid.includes('marketplace') || testid.includes('pdp') || testid.includes('price') || testid.includes('title')) {
        results.dataTestids.push({ testid, tag: el.tagName, text: el.textContent?.substring(0, 40) });
      }
    });

    console.log('[SmartScout DEBUG] Page structure:', results);
    return results;
  }

  // Expose debug function globally
  window.__smartScoutDump = dumpPageStructure;

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
    // Facebook system messages / UI prompts
    if (t.includes('create a pin')) return true;
    if (t.includes('chat history')) return true;
    if (t.includes('losing chat')) return true;
    if (t.includes('log in')) return true;
    if (t.includes('sign up')) return true;
    if (t.includes('message seller')) return true;
    if (t.includes('is this available')) return true;
    if (t.includes('send seller')) return true;
    // Generic UI elements
    if (t.includes('all categories')) return true;
    if (t.includes('search marketplace')) return true;
    if (t.includes('see more')) return true;
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
    if (Number.isFinite(n)) {
      log(`Meta price found: ${n} from product:price:amount or og:price:amount`);
      return n;
    }

    // Fall back to parsing og:description for a $ price
    const desc = getMetaContent('og:description') || '';
    const m = desc.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);
    if (m) {
      log(`Meta price found in og:description: ${m[0]}`);
      return parsePrice(m[0]);
    }

    // Try JSON-LD structured data (Facebook sometimes uses this)
    try {
      const ldScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of ldScripts) {
        const data = JSON.parse(script.textContent);
        // Check for Product schema
        if (data['@type'] === 'Product' || data['@type'] === 'Offer') {
          const price = data.offers?.price || data.price;
          if (price) {
            log(`JSON-LD price found: ${price}`);
            return Number(price);
          }
        }
      }
    } catch (e) {
      // Ignore JSON parse errors
    }

    return null;
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

          // FIX: If we don't have a price yet and we're still early in polling, keep trying
          // The DOM might not be fully rendered yet
          const hasPrice = listingData.price !== null && listingData.price !== undefined;
          if (!hasPrice && (now - startedAt < 4000)) {
            log(`Got listing without price (elapsed: ${now - startedAt}ms), retrying...`);
            listingPollTimeout = setTimeout(poll, 500);
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

  // Helper: Find the title element on the listing page
  // Facebook uses various elements, NOT necessarily h1
  // Updated 2025-12: Facebook changed their DOM structure, data-testid selectors may no longer exist
  function findTitleElement() {
    // Try both dialog (modal view) and main content areas
    const dialog = document.querySelector('[role="dialog"]');
    const mainArea = document.querySelector('[role="main"]');
    const roots = [dialog, mainArea, document.body].filter(Boolean);

    for (const root of roots) {
      // Priority 1: Facebook's specific data-testid for listing title (legacy, may not exist)
      const pdpTitle = root.querySelector('[data-testid="marketplace_pdp_title"]');
      if (pdpTitle) {
        log('findTitleElement: Found via marketplace_pdp_title');
        return pdpTitle;
      }

      // Priority 2: h1 element - most reliable semantic indicator
      const h1 = root.querySelector('h1');
      if (h1) {
        const text = h1.textContent?.trim() || '';
        // Skip generic h1s like "Marketplace"
        if (text.length >= 5 && !text.toLowerCase().includes('marketplace') && text.toLowerCase() !== 'chats') {
          log(`findTitleElement: Found via h1: "${text.substring(0, 50)}..."`);
          return h1;
        }
      }

      // Priority 3: [role="heading"] elements with aria-level
      const headings = root.querySelectorAll('[role="heading"]');
      for (const heading of headings) {
        const text = heading.textContent?.trim() || '';
        const ariaLevel = heading.getAttribute('aria-level');
        // Skip navigation/sidebar headings
        if (text.length >= 5 && text.length <= 200 &&
            !text.toLowerCase().includes('marketplace') &&
            !text.toLowerCase().includes("today's picks") &&
            !text.toLowerCase().includes('chats') &&
            !text.toLowerCase().includes('messages')) {
          log(`findTitleElement: Found via role=heading (level=${ariaLevel}): "${text.substring(0, 50)}..."`);
          return heading;
        }
      }
    }

    // Priority 4: Look for title based on document.title match
    // If we have a document.title, search for an element containing that text
    const docTitle = sanitizeTitle(document.title);
    if (docTitle && docTitle.length >= 10) {
      // Take first meaningful part of title (before common separators)
      const titlePart = docTitle.split(/[|\-–—]/)[0].trim();
      if (titlePart.length >= 8) {
        for (const root of roots) {
          const allElements = root.querySelectorAll('span, div');
          for (const el of allElements) {
            const text = el.textContent?.trim() || '';
            // Element text should match title closely and be a leaf or near-leaf node
            if (text.length >= 8 && text.length <= 250 && el.childElementCount <= 2) {
              // Check if this element's text closely matches the title
              const lowerText = text.toLowerCase();
              const lowerTitle = titlePart.toLowerCase();
              if (lowerText.includes(lowerTitle.substring(0, Math.min(30, lowerTitle.length))) ||
                  lowerTitle.includes(lowerText.substring(0, Math.min(30, lowerText.length)))) {
                const rect = el.getBoundingClientRect();
                // Must be visible and in reasonable position
                if (rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.top < 500) {
                  log(`findTitleElement: Found via document.title match: "${text.substring(0, 50)}..."`);
                  return el;
                }
              }
            }
          }
        }
      }
    }

    // Priority 5: Large, prominent text near top of page (expanded search)
    for (const root of roots) {
      const allSpans = root.querySelectorAll('span[dir="auto"], span');
      for (const span of allSpans) {
        const rect = span.getBoundingClientRect();
        const text = span.textContent?.trim() || '';
        // Title is usually in upper part of viewport, moderate length, not a container
        if (rect.top < 400 && rect.top > 30 && rect.width > 0 && rect.height > 0 &&
            text.length >= 8 && text.length <= 200 &&
            span.childElementCount <= 1) {
          // Skip common non-title text
          const lowerText = text.toLowerCase();
          if (lowerText.includes('today') || lowerText.includes('picks') ||
              lowerText.includes('similar') || lowerText.includes('message') ||
              lowerText.includes('chats') || lowerText.includes('available') ||
              lowerText.includes('share') || lowerText === 'details' ||
              lowerText === 'description' || lowerText === 'condition') {
            continue;
          }

          try {
            const style = window.getComputedStyle(span);
            const fontSize = parseFloat(style.fontSize);
            const fontWeight = parseInt(style.fontWeight) || 400;
            // Title usually has larger font (>= 16px) and may be bold
            if (fontSize >= 16 || fontWeight >= 600) {
              log(`findTitleElement: Found via prominent span: "${text.substring(0, 50)}..." (fontSize: ${fontSize}, weight: ${fontWeight})`);
              return span;
            }
          } catch (e) {
            // getComputedStyle can fail for detached elements
            continue;
          }
        }
      }
    }

    log('findTitleElement: No title element found');
    return null;
  }

  // NEW: Extract full description text from the listing page
  function extractFullDescription() {
    try {
      // Facebook's listing page structure:
      // - Left side: images
      // - Right side: title, price, details section with description
      // - Below/Side: "Today's picks" with other listings (MUST AVOID!)

      const main = document.querySelector('[role="main"]');
      if (!main) {
        log('extractFullDescription: No [role="main"] found');
        return '';
      }

      // Step 1: Find the title element - this is our anchor
      const titleEl = findTitleElement();
      if (!titleEl) {
        log('extractFullDescription: No title element found, trying alternative approach');
        // Alternative: search the entire main area but with strict filtering
        return extractDescriptionFallback(main);
      }

      log(`extractFullDescription: Title element found, text="${titleEl.textContent?.substring(0, 50)}..."`);

      // Step 2: Find the listing panel - the narrower column containing the title
      let listingPanel = null;
      let parent = titleEl.parentElement;

      for (let i = 0; i < 12 && parent; i++) {
        const rect = parent.getBoundingClientRect?.();
        if (rect) {
          // The listing panel is narrow (not full width) and reasonably tall
          const isNarrow = rect.width > 250 && rect.width < Math.min(700, window.innerWidth * 0.6);
          const isTall = rect.height > 300;

          if (isNarrow && isTall) {
            listingPanel = parent;
          }
        }
        if (parent.getAttribute?.('role') === 'main') break;
        parent = parent.parentElement;
      }

      if (!listingPanel) {
        log('extractFullDescription: Could not find listing panel, using title parent chain');
        listingPanel = titleEl.parentElement?.parentElement?.parentElement?.parentElement || titleEl.parentElement;
      }

      const panelRect = listingPanel?.getBoundingClientRect?.();
      log(`extractFullDescription: Using listing panel (${panelRect?.width?.toFixed(0)}x${panelRect?.height?.toFixed(0)}px) with ${listingPanel?.children?.length || 0} children`);

      // Step 3: Extract text ONLY from within the listing panel
      // Walk through text nodes and collect description content
      const textParts = [];
      const seenTexts = new Set();

      // Find all text-containing elements in the panel
      const textElements = listingPanel.querySelectorAll('span, div');

      for (const el of textElements) {
        // Skip elements with many children (containers)
        if (el.childElementCount > 2) continue;

        const text = el.textContent?.trim() || '';

        // Skip empty, too short, or already seen
        if (!text || text.length < 10 || seenTexts.has(text)) continue;

        // Skip if it's a parent of something we already processed
        let isParent = false;
        for (const seen of seenTexts) {
          if (text.includes(seen) && text.length > seen.length * 1.5) {
            isParent = true;
            break;
          }
        }
        if (isParent) continue;

        // Check element position - must be within the panel
        const elRect = el.getBoundingClientRect();
        if (elRect.left < panelRect.left - 50 || elRect.right > panelRect.right + 50) continue;

        // Skip "Today's picks" and similar sections
        const lowerText = text.toLowerCase();
        if (lowerText.includes("today's picks") ||
            lowerText.includes("you may also like") ||
            lowerText.includes("similar listings") ||
            lowerText.includes("see more listings")) continue;

        // Skip if contains multiple dollar amounts (aggregated recommendations)
        const priceMatches = text.match(/\$\d/g) || [];
        if (priceMatches.length > 2) continue;

        // Skip sponsored/ad content
        if (lowerText.includes('sponsored') || lowerText.includes('temu') ||
            lowerText.includes('amazon') || lowerText.includes('shop now') ||
            lowerText.includes('shopify') || lowerText.includes('bring your idea')) continue;

        // Skip quick reply buttons and messaging UI
        if (lowerText.includes('is it available') || lowerText.includes('pick up today') ||
            lowerText.includes('cash ready') || lowerText.includes('bundle deal') ||
            lowerText.includes('send seller a message') || lowerText.includes('is this still available') ||
            lowerText.includes('message') && text.length < 20) continue;

        // Skip seller information section
        if (lowerText.includes('seller information') || lowerText.includes('seller details') ||
            lowerText.includes('joined facebook') || lowerText.includes('highly rated on marketplace') ||
            lowerText.includes('rated on marketplace')) continue;

        // Skip meta info that's not part of description
        if (lowerText.includes('location is approximate')) continue;

        seenTexts.add(text);
        textParts.push(text);
      }

      // Combine all text parts
      let description = textParts.join('\n');

      // If we got a reasonable description, return it
      if (description.length >= 50) {
        log(`extractFullDescription: Found ${textParts.length} text parts, total ${description.length} chars`);
        log(`Preview: ${description.substring(0, 200)}...`);
        return description.slice(0, 2000);
      }

      // Fallback: Get all visible text in the panel
      log('extractFullDescription: Trying full panel text extraction');
      const allText = listingPanel.textContent || '';

      // Try to extract just the details section
      const detailsMatch = allText.match(/Details[\s\S]*?(?=Today's picks|Similar|You may also|$)/i);
      if (detailsMatch && detailsMatch[0].length > 50) {
        log(`extractFullDescription: Found via Details section match`);
        return detailsMatch[0].slice(0, 2000);
      }

      return allText.slice(0, 2000);

    } catch (e) {
      log('Error extracting description: ' + e?.message, 'warn');
      return '';
    }
  }

  // Fallback description extraction when title element isn't found
  function extractDescriptionFallback(main) {
    log('extractDescriptionFallback: Starting fallback approach');

    // IMPORTANT: Try to get the current listing title to verify we're extracting from the right listing
    const currentDocTitle = sanitizeTitle(document.title);
    const titlePart = currentDocTitle.split(/[|\-–—]/)[0].trim().toLowerCase();

    // Look for "Details" or "Condition" section headers
    const allSpans = main.querySelectorAll('span, div');
    let detailsSection = null;
    let detailsSectionScore = 0;

    for (const span of allSpans) {
      const text = span.textContent?.trim()?.toLowerCase() || '';
      if ((text === 'details' || text === 'condition' || text === 'description') && span.textContent?.trim().length < 15) {
        // Found a section header - look for content nearby
        let parent = span.parentElement;
        for (let i = 0; i < 8 && parent; i++) {
          const rect = parent.getBoundingClientRect?.();
          if (rect && rect.height > 80 && rect.width < 700 && rect.width > 200) {
            const parentText = parent.textContent || '';
            const score = parentText.length;
            if (score > detailsSectionScore) {
              detailsSection = parent;
              detailsSectionScore = score;
            }
          }
          parent = parent.parentElement;
        }
      }
    }

    if (detailsSection && detailsSectionScore > 100) {
      let text = detailsSection.textContent || '';

      // Clean up the text - remove UI elements
      text = text.replace(/Is it available\?/g, '')
                 .replace(/Pick up today\?/g, '')
                 .replace(/Cash ready/g, '')
                 .replace(/Bundle deal\?/g, '')
                 .replace(/Send seller a message/g, '')
                 .replace(/is this still available\??/gi, '')
                 .replace(/Seller information/g, '')
                 .replace(/Seller details/g, '')
                 .replace(/Joined Facebook in \d{4}/g, '')
                 .replace(/Highly rated on Marketplace/g, '')
                 .replace(/Location is approximate/g, '')
                 .replace(/Message/g, '')
                 .replace(/Send/g, '');

      const cleaned = text.replace(/\s+/g, ' ').trim();
      if (cleaned.length > 30) {
        log(`extractDescriptionFallback: Found ${cleaned.length} chars from details section`);
        return cleaned.slice(0, 2000);
      }
    }

    // Last resort: find text blocks with PC specs
    // IMPROVED: Also check element position to avoid "Today's Picks" and other listings
    const candidates = [];
    const allDivs = main.querySelectorAll('div, span');

    for (const el of allDivs) {
      // Allow up to 5 child elements for container divs
      if (el.childElementCount > 5) continue;

      const text = el.textContent?.trim() || '';
      // Lowered minimum to 30 chars, raised max to 3000
      if (text.length < 30 || text.length > 3000) continue;

      const lowerText = text.toLowerCase();

      // Skip navigation/sidebar content
      if (lowerText.includes("today's picks") ||
          lowerText.includes("similar listings") ||
          lowerText.includes("you may also like") ||
          lowerText.includes("seller's other items") ||
          lowerText.includes("more from this seller") ||
          lowerText.includes("related items") ||
          lowerText.includes("browse all") ||
          lowerText.includes("shopify") ||
          lowerText.includes("bring your idea")) continue;

      // Skip if too many prices (recommendation section)
      const priceCount = (text.match(/\$\d/g) || []).length;
      if (priceCount > 3) continue;

      // Check element position - should be in upper/middle part of page
      const rect = el.getBoundingClientRect?.();
      if (rect) {
        // Skip elements that are very low on the page (likely recommendations)
        if (rect.top > 900) continue;
        // Skip very wide elements (likely full-page containers)
        if (rect.width > window.innerWidth * 0.9) continue;
      }

      // Score based on PC keywords
      let score = 0;
      const keywords = ['ryzen', 'intel', 'nvidia', 'amd', 'rtx', 'gtx', 'radeon',
                        'ddr4', 'ddr5', 'ssd', 'nvme', 'ram', 'gpu', 'cpu', 'ghz', 'gb', 'tb',
                        'core i5', 'core i7', 'core i9', 'geforce', 'specs', 'gaming'];
      for (const kw of keywords) {
        if (lowerText.includes(kw)) score += 10;
      }

      // Bonus for longer descriptions (more likely to be the actual content)
      if (text.length > 200) score += 20;
      if (text.length > 500) score += 30;

      // Bonus points if the text contains part of the document title (likely same listing)
      if (titlePart && titlePart.length >= 8 && lowerText.includes(titlePart.substring(0, Math.min(15, titlePart.length)))) {
        score += 50;
      }

      // Bonus if contains "condition" or "details" - likely the right section
      if (lowerText.includes('condition') || lowerText.includes('details')) {
        score += 30;
      }

      if (score > 0) {
        candidates.push({ text, score, top: rect?.top || 0, length: text.length });
      }
    }

    // Sort by score first, then by length (prefer longer descriptions), then by position
    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.length !== a.length) return b.length - a.length;
      return a.top - b.top;
    });

    if (candidates.length > 0) {
      log(`extractDescriptionFallback: Found ${candidates.length} candidates, best score: ${candidates[0].score}`);

      // Clean the result
      let result = candidates[0].text;
      result = result.replace(/Is it available\?/g, '')
                     .replace(/Pick up today\?/g, '')
                     .replace(/Cash ready/g, '')
                     .replace(/Bundle deal\?/g, '')
                     .replace(/Send seller a message/g, '')
                     .replace(/is this still available\??/gi, '')
                     .replace(/Seller information/g, '')
                     .replace(/Seller details/g, '')
                     .replace(/Joined Facebook in \d{4}/g, '')
                     .replace(/Highly rated on Marketplace/g, '')
                     .replace(/Location is approximate/g, '')
                     .replace(/\s+/g, ' ')
                     .trim();

      return result.slice(0, 2000);
    }

    log('extractDescriptionFallback: No description found');
    return '';
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

  // NEW: Extract structured specs from description text (also works with titles)
  // FIXED: Make spec extraction more conservative to avoid false positives from stale descriptions
  function extractSpecsFromDescription(text) {
    const specs = {};

    // Accept shorter text (for titles) - minimum 10 chars to have any meaningful content
    if (!text || text.length < 10) {
      return specs; // Return empty for very short text
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
      // Match RTX/GTX/RX followed by model number, with optional Ti/Super/XT suffix
      // Examples: RTX 3070, GTX 1080 Ti, RX 5700 XT, RX 6500 XT
      const m = s.match(/\b(?:rtx|gtx|rx)\s*\d{3,4}(?:\s*(?:ti|super|xt))?\b/i);
      return m ? m[0].toUpperCase().replace(/\s+/g, ' ') : '';
    };

    const extractCpuModelToken = (text) => {
      const s = String(text || '');
      // Match Intel: i3/i5/i7/i9 followed by model number
      // Examples: i7 11700K, i5-12400F, i9-13900K
      let m = s.match(/\b(i[3579][-\s]?\d{4,5}[a-z]*)\b/i);
      if (m) return m[1].toUpperCase().replace(/\s+/g, ' ');

      // Match AMD Ryzen: Ryzen [3/5/7/9] followed by model
      // Examples: Ryzen 5 5600X, Ryzen 7 5800X, Ryzen 5 2600X, Ryzen 5 5500
      m = s.match(/\bryzen\s*[3579]\s*\d{4}[a-z]*/i);
      if (m) return m[0].toUpperCase().replace(/\s+/g, ' ');

      return '';
    };

    try {
      // CPU patterns - be more aggressive in finding CPU mentions
      let cpuTok = '';

      // Pattern 1: Look for "CPU:" label first (most reliable)
      const cpuLabelMatch = text.match(/cpu[:\s]+([^\n•,]+)/i);
      if (cpuLabelMatch) {
        cpuTok = extractCpuModelToken(cpuLabelMatch[1]);
      }

      // Pattern 2: Look for AMD Ryzen anywhere
      if (!cpuTok) {
        const ryzenMatch = text.match(/\b((?:amd\s+)?ryzen\s*[3579]\s*\d{4}[a-z]*)\b/i);
        if (ryzenMatch) cpuTok = extractCpuModelToken(ryzenMatch[1]);
      }

      // Pattern 3: Look for Intel Core anywhere
      if (!cpuTok) {
        const intelMatch = text.match(/\b((?:intel\s+)?(?:core\s+)?i[3579][-\s]?\d{4,5}[a-z]*)\b/i);
        if (intelMatch) cpuTok = extractCpuModelToken(intelMatch[1]);
      }

      if (cpuTok) specs.cpu = cpuTok;

      // GPU patterns - be more aggressive
      let gpuTok = '';

      // Pattern 1: Look for "GPU:" label first
      const gpuLabelMatch = text.match(/gpu[:\s]+([^\n•,]+)/i);
      if (gpuLabelMatch) {
        gpuTok = extractGpuModelToken(gpuLabelMatch[1]);
      }

      // Pattern 2: Look for Nvidia/AMD GPU models anywhere
      if (!gpuTok) {
        // Match RTX, GTX, RX with model numbers
        const gpuMatch = text.match(/\b(?:(?:nvidia|amd|geforce|radeon)\s+)?((?:rtx|gtx|rx)\s*\d{3,4}(?:\s*(?:ti|super|xt))?)\b/i);
        if (gpuMatch) gpuTok = extractGpuModelToken(gpuMatch[1]);
      }

      if (gpuTok) specs.gpu = gpuTok;

      // RAM patterns
      let ramTok = '';

      // Pattern 1: "RAM:" label
      const ramLabelMatch = text.match(/ram[:\s]+([^\n•,]+)/i);
      if (ramLabelMatch) {
        const ramVal = ramLabelMatch[1].match(/\b(\d+)\s*gb\b/i);
        if (ramVal) ramTok = ramVal[0].toUpperCase();
      }

      // Pattern 2: "XX GB" followed by DDR
      if (!ramTok) {
        const ramDdrMatch = text.match(/\b(\d+)\s*gb\s*ddr[45]/i);
        if (ramDdrMatch) ramTok = `${ramDdrMatch[1]}GB`;
      }

      // Pattern 3: Just "XX GB" (less reliable, could be storage)
      if (!ramTok) {
        // Only match common RAM sizes to avoid confusion with storage
        const ramSizeMatch = text.match(/\b(8|16|32|64)\s*gb\s*(?:ram|memory|ddr)/i);
        if (ramSizeMatch) ramTok = `${ramSizeMatch[1]}GB`;
      }

      if (ramTok) specs.ram = ramTok;

      // Storage patterns
      let storageTok = '';

      // Pattern 1: Explicit storage labels
      const storageLabelMatch = text.match(/(?:storage|ssd|hdd|nvme)[:\s]+([^\n•,]+)/i);
      if (storageLabelMatch) {
        const storageVal = storageLabelMatch[1].match(/\b(\d+)\s*(?:gb|tb)\b/i);
        if (storageVal) storageTok = storageVal[0].toUpperCase();
      }

      // Pattern 2: "X TB" or "XXX GB" followed by SSD/HDD/NVME
      if (!storageTok) {
        const storageMatch = text.match(/\b(\d+)\s*(tb|gb)\s*(?:ssd|hdd|nvme|m\.2)\b/i);
        if (storageMatch) storageTok = `${storageMatch[1]}${storageMatch[2].toUpperCase()}`;
      }

      if (storageTok) specs.storage = storageTok;

      // Screen size for monitors/TVs
      const screenMatch = text.match(/\b(\d{2,3})\s*(?:"|″|in\b|inch\b)/i);
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

    // Get title element for price anchoring - use findTitleElement() as fallback
    // This is important because we may have gotten the title from document.title but need
    // a DOM element to anchor price search
    let titleEl = best?.el || pdpTitle || null;
    if (!titleEl) {
      titleEl = findTitleElement();
      if (titleEl) {
        log(`Using findTitleElement() for price anchoring`);
      }
    }

    // Price - look for currency patterns
    // Facebook's DOM structure: title (h1) and price are siblings in a container
    // We need to find the price element that's a SIBLING or near the title
    const metaPrice = extractPriceFromMeta();
    let priceEl = null;
    let priceSource = '';

    // Method 1: Try data-testid (may not exist on current FB layout)
    const allPriceEls = Array.from(document.querySelectorAll('[data-testid="marketplace_pdp_price"]'));
    log(`Found ${allPriceEls.length} price elements with data-testid`);

    for (const el of allPriceEls) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.top < window.innerHeight) {
        priceEl = el;
        priceSource = 'data-testid';
        log(`Selected visible price element: "${el.textContent?.trim()}"`);
        break;
      }
    }

    // Method 1b: Search in dialog (modal view) - FB often renders listings in dialogs
    // FIXED: Handle concatenated prices like "$650$800" (sale + original)
    if (!priceEl) {
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) {
        // Look for price pattern in dialog - handles both exact "$650" and concatenated "$650$800"
        const candidates = Array.from(dialog.querySelectorAll('span, div'))
          .filter(el => {
            const text = el.textContent?.trim() || '';
            // Match price at start: "$650" or "$650$800" (sale + original price)
            if (!/^\$[\d,]+(?:\$[\d,]+)?$/.test(text)) return false;
            if (el.childElementCount > 0) return false;
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          })
          .map(el => {
            const rect = el.getBoundingClientRect();
            const text = el.textContent?.trim() || '';
            // Extract first price (sale price) from "$650$800"
            const priceMatch = text.match(/^\$([\d,]+)/);
            return { el, top: rect.top, price: priceMatch ? parsePrice(priceMatch[0]) : 0 };
          })
          .sort((a, b) => a.top - b.top);

        if (candidates.length > 0) {
          priceEl = candidates[0].el;
          priceSource = 'dialog-search';
          log(`Found price in dialog: "${priceEl.textContent?.trim()}" (parsed: $${candidates[0].price})`);
        }
      }
    }

    // Method 2: Look for price as sibling of title (Facebook's current structure)
    // The title is in an h1, and price is in a sibling div with "$X,XXX" or "$X,XXX$Y,YYY" (sale + original)
    if (!priceEl && titleEl) {
      const titleContainer = titleEl.closest('div')?.parentElement;
      if (titleContainer) {
        // Search siblings and children for price pattern
        const walker = document.createTreeWalker(titleContainer, NodeFilter.SHOW_TEXT);
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent?.trim() || '';
          // Match $XXX or $X,XXX patterns - handle concatenated "$650$800"
          if (/^\$[\d,]+(?:\$[\d,]+)?$/.test(text)) {
            priceEl = node.parentElement;
            priceSource = 'title-sibling';
            log(`Found price near title: "${text}"`);
            break;
          }
        }
      }
    }

    // Method 3: Look for h1 heading and find price in same container
    if (!priceEl) {
      const h1 = main?.querySelector('h1') || document.querySelector('[role="main"] h1');
      if (h1) {
        const container = h1.parentElement?.parentElement;
        if (container) {
          const divs = container.querySelectorAll('div, span');
          for (const div of divs) {
            const text = div.textContent?.trim() || '';
            // Price is "$X,XXX" or "$X,XXX$Y,YYY" (sale + original price)
            if (/^\$[\d,]+(?:\$[\d,]+)?$/.test(text) && div.childElementCount === 0) {
              priceEl = div;
              priceSource = 'h1-container';
              log(`Found price in h1 container: "${text}"`);
              break;
            }
          }
        }
      }
    }

    // Method 4: Fallback to findElementByContent
    if (!priceEl) {
      // Also handle concatenated prices "$650$800"
      priceEl = findElementByContent(/^\$[\d,]+(?:\$[\d,]+)?$/, titleEl ? titleEl.parentElement?.parentElement || main : main);
      if (priceEl) priceSource = 'findElementByContent';
    }

    // Method 5: Search for price near the h1 title (in the listing panel only)
    // IMPORTANT: Don't search the entire page - "Today's picks" has many prices
    if (!priceEl && !Number.isFinite(metaPrice)) {
      const h1 = main?.querySelector('h1');
      let searchArea = null;

      if (h1) {
        // Find the listing panel - it's an ancestor of h1 but not role="main"
        let parent = h1.parentElement;
        for (let i = 0; i < 8 && parent; i++) {
          if (parent.getAttribute?.('role') === 'main') break;
          const rect = parent.getBoundingClientRect?.();
          // Listing panel is typically 300-600px wide on right side
          if (rect && rect.width > 250 && rect.width < 700 && rect.height > 200) {
            searchArea = parent;
          }
          parent = parent.parentElement;
        }
      }

      // Fallback: use a limited area around top of viewport
      if (!searchArea) {
        searchArea = main;
      }

      const allPriceElements = Array.from(searchArea.querySelectorAll('span, div'))
        .filter(el => {
          const text = el.textContent?.trim() || '';
          // Match "$650" or "$650$800" (sale + original price)
          if (!/^\$[\d,]+(?:\$[\d,]+)?$/.test(text) || text.length >= 20) return false;
          if (el.childElementCount > 0) return false; // Avoid containers
          const rect = el.getBoundingClientRect();
          // Must be in viewport AND in upper portion (listing price is near top)
          return rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.top < 500;
        })
        .map(el => {
          // Check if price is crossed out (strikethrough)
          const style = window.getComputedStyle(el);
          const parentStyle = el.parentElement ? window.getComputedStyle(el.parentElement) : null;
          const isCrossedOut = style.textDecoration.includes('line-through') ||
                              (parentStyle && parentStyle.textDecoration.includes('line-through'));
          const rect = el.getBoundingClientRect();
          // Extract first price from text (handles "$650$800" -> $650)
          const text = el.textContent?.trim() || '';
          const priceMatch = text.match(/^\$([\d,]+)/);
          return { el, isCrossedOut, price: priceMatch ? parsePrice(priceMatch[0]) : 0, top: rect.top };
        })
        .sort((a, b) => {
          // Prefer non-crossed-out prices first
          if (a.isCrossedOut !== b.isCrossedOut) {
            return a.isCrossedOut ? 1 : -1;
          }
          // If same crossed-out status, prefer the one closer to top (main price is first)
          return a.top - b.top;
        });

      if (allPriceElements.length > 0) {
        const best = allPriceElements[0];
        priceEl = best.el;
        priceSource = best.isCrossedOut ? 'broad-search-crossed' : 'broad-search';
        log(`Found price via broad search: "${priceEl.textContent?.trim()}" (crossedOut: ${best.isCrossedOut}, parsed: $${best.price})`);

        // If we found multiple prices, log them
        if (allPriceElements.length > 1) {
          log(`Multiple prices found: ${allPriceElements.slice(0, 5).map(p => `$${p.price}(${p.isCrossedOut ? 'X' : 'OK'})`).join(', ')}`);
        }
      }
    }

    // Extract price from description as final fallback
    let fallbackPrice = null;
    if (!priceEl && !Number.isFinite(metaPrice)) {
      // Method 6: More aggressive search - find price in listing panel
      // Key insight: search within the same panel as the title, not the whole page
      // Note: titleEl was already set earlier, reuse it
      log(`Price fallback: titleEl=${titleEl ? 'found' : 'not found'}`);

      if (titleEl) {
        // Find the listing panel (same logic as description extraction)
        let listingPanel = null;
        let parent = titleEl.parentElement;
        for (let i = 0; i < 12 && parent; i++) {
          const rect = parent.getBoundingClientRect?.();
          if (rect) {
            const isNarrow = rect.width > 250 && rect.width < Math.min(700, window.innerWidth * 0.6);
            const isTall = rect.height > 300;
            if (isNarrow && isTall) listingPanel = parent;
          }
          if (parent.getAttribute?.('role') === 'main') break;
          parent = parent.parentElement;
        }

        const searchArea = listingPanel || titleEl.parentElement?.parentElement?.parentElement || main;
        const titleRect = titleEl.getBoundingClientRect();
        const priceCandidates = [];

        log(`Price search: using ${listingPanel ? 'listingPanel' : 'fallback'} area, titleRect.top=${titleRect.top?.toFixed(0)}`);

        if (searchArea) {
          // Search for elements containing $ amounts
          const allElements = searchArea.querySelectorAll('span, div');

          for (const el of allElements) {
            // Skip containers with children
            if (el.childElementCount > 1) continue;

            const text = el.textContent?.trim() || '';

            // Match prices: exact "$X,XXX" or text starting with "$X,XXX"
            // But NOT text with multiple prices (recommendations)
            const priceMatch = text.match(/^\$\s*([\d,]+)/);
            if (!priceMatch) continue;

            // Skip if multiple prices in same element (recommendations)
            const allPrices = text.match(/\$\d+/g) || [];
            if (allPrices.length > 2) continue;

            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;

            // Calculate distance from title
            const distFromTitle = Math.abs(rect.top - titleRect.top) + Math.abs(rect.left - titleRect.left);

            // Prefer prices close to the title (within 200px vertically)
            const isNearTitle = Math.abs(rect.top - titleRect.top) < 200;

            priceCandidates.push({
              price: parsePrice(priceMatch[0]),
              distance: distFromTitle,
              top: rect.top,
              isExact: /^\$[\d,]+$/.test(text), // Bonus for exact match
              isNearTitle,
              el
            });
          }
        }

        log(`Price search: found ${priceCandidates.length} candidates`);

        // Sort by: nearTitle first, then exact matches, then by distance
        priceCandidates.sort((a, b) => {
          // Prefer prices near the title
          if (a.isNearTitle !== b.isNearTitle) return a.isNearTitle ? -1 : 1;
          // Prefer exact price matches (just "$X,XXX" vs "$X,XXX something else")
          if (a.isExact !== b.isExact) return a.isExact ? -1 : 1;
          // Then by distance from title
          return a.distance - b.distance;
        });

        if (priceCandidates.length > 0) {
          fallbackPrice = priceCandidates[0].price;
          priceSource = 'listing-panel';
          log(`Found price via listing panel search: $${fallbackPrice} (distance: ${priceCandidates[0].distance?.toFixed(0)}px, nearTitle: ${priceCandidates[0].isNearTitle})`);
          if (priceCandidates.length > 1) {
            log(`Other price candidates: ${priceCandidates.slice(1, 4).map(p => `$${p.price}`).join(', ')}`);
          }
        }
      }

      // Ultimate fallback: first $ amount on the page (in upper portion)
      if (!fallbackPrice) {
        log('Price search: trying ultimate fallback - scanning upper portion of page');
        // Look for any $ amount in elements near the top of the viewport
        // Also search dialogs explicitly
        const searchRoots = [main, document.querySelector('[role="dialog"]')].filter(Boolean);
        const allElements = [];
        for (const root of searchRoots) {
          allElements.push(...root.querySelectorAll('span, div'));
        }

        log(`Ultimate fallback: searching ${allElements.length} elements from ${searchRoots.length} roots`);

        let debugMatchCount = 0;
        let debugRectFailCount = 0;
        let debugChildFailCount = 0;
        let debugSamples = [];

        for (const el of allElements) {
          const text = el.textContent?.trim() || '';

          // RELAXED: Match $ anywhere in text, not just at start
          // This catches cases where the price might have leading text
          const priceMatch = text.match(/\$\s*([\d,]+)/);
          if (!priceMatch) continue;

          debugMatchCount++;

          // Collect samples for debugging
          if (debugSamples.length < 5) {
            debugSamples.push({ text: text.substring(0, 40), children: el.childElementCount });
          }

          if (el.childElementCount > 1) {
            debugChildFailCount++;
            continue;
          }

          const rect = el.getBoundingClientRect();
          // Must be visible and in upper portion of viewport (changed > 0 to >= 0)
          if (rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.top < 500) {
            // Skip if more than 2 prices (recommendation section with many listings)
            const allPrices = text.match(/\$\d/g) || [];
            if (allPrices.length <= 2) {
              fallbackPrice = parsePrice(priceMatch[0]);
              priceSource = 'text-fallback';
              log(`Price search: found via ultimate fallback: $${fallbackPrice} at y=${rect.top?.toFixed(0)}, text="${text.substring(0, 50)}"`);
              break;
            }
          } else {
            debugRectFailCount++;
          }
        }

        if (!fallbackPrice) {
          log(`Ultimate fallback failed: ${debugMatchCount} regex matches, ${debugChildFailCount} failed childCount, ${debugRectFailCount} failed rect check`);
          if (debugSamples.length > 0) {
            log(`Sample $ elements: ${JSON.stringify(debugSamples)}`);
          }
          // Dump page structure for debugging
          log('Dumping page structure for debugging...');
          dumpPageStructure();
        }
      }

      // Super aggressive fallback: search ALL elements for ANY price pattern
      // This handles cases where Facebook renders prices in unexpected ways
      if (!fallbackPrice) {
        log('Price search: trying super aggressive fallback - ALL elements');
        const allPageElements = document.querySelectorAll('*');
        let foundPrices = [];

        for (const el of allPageElements) {
          // Skip elements with many children (containers)
          if (el.childElementCount > 2) continue;

          const text = el.textContent?.trim() || '';
          if (text.length > 50) continue; // Skip long text

          // Match various price patterns including unicode dollar signs
          // Also match patterns like "Price: $500" or "500 dollars"
          const pricePatterns = [
            /[\$＄]\s*([\d,]+)/,           // Standard or fullwidth dollar sign
            /(\d{2,})\s*(?:dollars?|USD)/i, // "500 dollars"
            /price[:\s]+[\$＄]?\s*([\d,]+)/i // "Price: $500" or "Price 500"
          ];

          for (const pattern of pricePatterns) {
            const match = text.match(pattern);
            if (match) {
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.top < 600) {
                const priceVal = parsePrice(match[0]);
                if (priceVal > 0 && priceVal < 100000) {
                  foundPrices.push({
                    price: priceVal,
                    top: rect.top,
                    text: text.substring(0, 30),
                    tag: el.tagName
                  });
                }
              }
              break;
            }
          }

          if (foundPrices.length >= 5) break;
        }

        if (foundPrices.length > 0) {
          // Sort by position (prefer elements near top)
          foundPrices.sort((a, b) => a.top - b.top);
          fallbackPrice = foundPrices[0].price;
          priceSource = 'aggressive-fallback';
          log(`Found price via aggressive fallback: $${fallbackPrice} (tag: ${foundPrices[0].tag}, top: ${foundPrices[0].top?.toFixed(0)})`);
        } else {
          log('Super aggressive fallback: no prices found');
        }
      }

      // NEW: Extract price from description text as absolute last resort
      // This catches cases where the price element isn't separately identifiable
      if (!fallbackPrice) {
        const descForPrice = extractFullDescription();
        log(`Description-text fallback: desc length=${descForPrice?.length || 0}`);
        if (descForPrice) {
          // Look for price pattern in ENTIRE description (not just first 500 chars)
          // Match prices like "$700", "$1,200", "$700$800" (sale+original)
          const priceInDesc = descForPrice.match(/\$\s*([\d,]+)/);
          if (priceInDesc) {
            fallbackPrice = parsePrice(priceInDesc[0]);
            priceSource = 'description-text';
            log(`Price search: extracted from description text: $${fallbackPrice} from "${priceInDesc[0]}"`);
          } else {
            log(`Description-text fallback: no price match. First 200 chars: "${descForPrice.substring(0, 200)}..."`);
          }
        }
      }
    }

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

    // IMPORTANT: Extract specs from BOTH title AND description
    // Title is more reliable as it's less likely to be from stale/cached content
    const specsFromTitle = extractSpecsFromDescription(title);
    const specsFromDescription = extractSpecsFromDescription(fullDescription);

    // Prioritize title specs over description specs (title is more reliable)
    const extractedSpecs = {
      ...specsFromDescription, // Start with description specs
      ...specsFromTitle,       // Override with title specs (more reliable)
    };

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
    if (Object.keys(specsFromTitle).length > 0) {
      log(`Specs from title: ${JSON.stringify(specsFromTitle)}`);
    }
    if (Object.keys(specsFromDescription).length > 0) {
      log(`Specs from description: ${JSON.stringify(specsFromDescription)}`);
    }
    if (Object.keys(extractedSpecs).length > 0) {
      log(`Final merged specs: ${JSON.stringify(extractedSpecs)}`);
    }

    // Determine final price with fallbacks
    let finalPrice = null;
    const priceElText = priceEl?.textContent?.trim() || '';

    if (Number.isFinite(metaPrice)) {
      finalPrice = metaPrice;
    } else if (priceEl && priceElText) {
      finalPrice = parsePrice(priceElText);
    } else if (fallbackPrice) {
      finalPrice = fallbackPrice;
    }

    log(`Price extraction result: metaPrice=${metaPrice}, priceEl=${!!priceEl}, priceSource="${priceSource}", priceElText="${priceElText}", fallbackPrice=${fallbackPrice}, final=${finalPrice}`);

    return {
      title,
      price: finalPrice,
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
      log('Sending MULTIMODAL_ANALYZE_LISTING request with:', {
        url: listingForAnalysis?.url,
        title: listingForAnalysis?.title,
        hasImageDataUrls: !!(listingForAnalysis?.imageDataUrls && listingForAnalysis.imageDataUrls.length),
        imageDataUrlCount: listingForAnalysis?.imageDataUrls?.length || 0
      });
      
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
      
      log('Multi-modal analysis response:', JSON.stringify(analysisResponse));
      
      log('Listing for analysis:', {
        url: listingForAnalysis?.url,
        title: listingForAnalysis?.title,
        hasImageDataUrls: !!(listingForAnalysis?.imageDataUrls && listingForAnalysis.imageDataUrls.length),
        imageDataUrlCount: listingForAnalysis?.imageDataUrls?.length || 0
      });
      
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
    const showPartOut = isPcBuildListing(listing);

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
        ${showPartOut ? `
          <button class="scout-link pc-partout-btn" style="background: #7c3aed; border: none; cursor: pointer; margin-bottom: 8px;">
            🖥️ PC Part-Out Analysis →
          </button>
        ` : ''}
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

    // Add PC Part-Out Analysis button handler
    const partoutBtn = shadow.querySelector('.pc-partout-btn');
    if (partoutBtn) {
      partoutBtn.addEventListener('click', () => {
        partoutBtn.textContent = '⏳ Analyzing...';
        partoutBtn.disabled = true;
        requestPcResaleAnalysis(listing);
      });
    }
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
        
        ${isPcBuildListing(listing) ? `
          <button class="scout-link pc-partout-btn" style="background: #7c3aed; border: none; cursor: pointer; margin-bottom: 8px;">
            🖥️ Part-Out Analysis →
          </button>
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

    // Add PC Part-Out Analysis button handler
    const partoutBtn = shadow.querySelector('.pc-partout-btn');
    if (partoutBtn) {
      partoutBtn.addEventListener('click', () => {
        partoutBtn.textContent = '⏳ Analyzing...';
        partoutBtn.disabled = true;
        requestPcResaleAnalysis(listing);
      });
    }
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

  // PC Build Detection for Part-Out Analysis
  function isPcBuildListing(listing) {
    const title = (listing?.title || '').toLowerCase();
    const description = (listing?.fullDescription || '').toLowerCase();
    const combinedText = `${title} ${description}`;

    // Keywords indicating a full PC build
    const pcKeywords = [
      'full pc', 'gaming pc', 'gaming rig', 'custom build', 'custom pc',
      'desktop tower', 'computer build', 'pc build', 'gaming computer',
      'full build', 'complete build', 'gaming setup', 'workstation',
      'desktop computer', 'tower pc', 'gaming desktop', 'portable gaming',
      'itx build', 'atx build', 'mini pc', 'sff pc'
    ];

    const hasKeyword = pcKeywords.some(kw => combinedText.includes(kw));

    // Check for multiple component types
    const specs = listing?.extractedSpecs || {};
    // Improved regex patterns for component detection
    const hasGpu = specs.gpu || /(?:rtx|gtx|rx)\s*\d{3,4}/i.test(combinedText) || /(?:geforce|radeon)/i.test(combinedText);
    const hasCpu = specs.cpu || /(?:i[3579]-?\d{4,5}|ryzen\s*\d+|\d{4,5}x)/i.test(combinedText) || /(?:intel|amd)\s*(?:core|ryzen)/i.test(combinedText);
    const hasRam = specs.ram || /\d+\s*gb\s*(?:ddr|ram)/i.test(combinedText) || /ddr[345]\s*ram/i.test(combinedText);
    const hasStorage = specs.storage || /\d+\s*(?:tb|gb)\s*(?:ssd|hdd|nvme|m\.?2)/i.test(combinedText);

    const componentCount = [hasGpu, hasCpu, hasRam, hasStorage].filter(Boolean).length;

    log(`isPcBuildListing: keyword=${hasKeyword}, gpu=${hasGpu}, cpu=${hasCpu}, ram=${hasRam}, storage=${hasStorage}, count=${componentCount}`);

    // If 3+ component types are mentioned, likely a PC build
    return hasKeyword || componentCount >= 3;
  }

  // Request PC Resale Analysis from backend
  function requestPcResaleAnalysis(listing) {
    // CRITICAL: Re-extract fresh listing data to avoid stale cached data from SPA navigation
    // The `listing` object passed here may be from when the page first loaded, which could be stale
    const freshListing = extractListingData();

    // Use fresh data if available, otherwise fall back to the provided listing
    const listingToAnalyze = freshListing || listing;

    // Verify the fresh data matches the current URL to ensure we're analyzing the right listing
    const currentUrl = window.location.href;
    const listingUrl = listingToAnalyze.url || '';

    // Extract listing IDs to compare
    const currentId = extractListingIdFromUrl(currentUrl);
    const listingId = extractListingIdFromUrl(listingUrl);

    if (currentId && listingId && currentId !== listingId) {
      log('Listing data mismatch - current URL has different listing ID', 'warn');
      alert('Please wait for the page to fully load before analyzing.');
      return;
    }

    log('Requesting PC resale analysis with FRESH data...', {
      title: listingToAnalyze.title,
      price: listingToAnalyze.price,
      priceType: typeof listingToAnalyze.price,
      url: listingToAnalyze.url,
      descriptionLength: (listingToAnalyze.fullDescription || '').length,
      wasFreshExtract: !!freshListing
    });

    safeSendMessage({
      action: 'PC_RESALE_ANALYZE',
      listingData: {
        platform: 'facebook',
        platformListingUrl: listingToAnalyze.url,
        title: listingToAnalyze.title,
        description: listingToAnalyze.fullDescription || '',
        price: listingToAnalyze.price,
        imageUrls: listingToAnalyze.imageUrls || [],
        sellerLocation: listingToAnalyze.location || ''
      }
    }, (response) => {
      if (response && response.success) {
        renderPcResaleOverlay(listingToAnalyze, response.data);
      } else {
        log('PC resale analysis failed: ' + (response?.error || 'Unknown error'), 'warn');
        alert(response?.error || 'PC Resale Analysis failed. Please try again.');
      }
    });
  }

  // Render PC Resale Analysis Overlay
  function renderPcResaleOverlay(listing, analysis) {
    const shadow = createOverlayContainer();

    const recommendation = analysis.recommendation || 'SKIP';
    const netProfit = analysis.netProfit || 0;
    const roiPct = analysis.roiPercentage || 0;
    const partsValue = analysis.aggregateComponentValue || 0;
    const confidence = analysis.confidenceScore || 0;
    const components = analysis.componentProfile?.rawComponents || {};
    const componentBreakdown = analysis.componentValuation?.componentBreakdown || {};
    const missingSpecs = analysis.componentProfile?.missingSpecs || [];
    const costBreakdown = analysis.costBreakdown || {};
    const reasoning = analysis.reasoning || '';

    const isGoodDeal = recommendation === 'BUY';

    shadow.innerHTML = `
      <style>${getBaseStyles()}</style>

      <div class="scout-card" style="max-width: 360px;">
        <button class="close-btn" title="Close">&times;</button>

        <div class="scout-header" style="background: ${isGoodDeal ? '#22c55e' : '#f59e0b'};">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          PC Part-Out Analysis
        </div>

        <div style="text-align: center; padding: 12px 0; border-bottom: 1px solid #334155;">
          <div style="font-size: 24px; font-weight: bold; color: ${isGoodDeal ? '#22c55e' : '#f59e0b'};">
            ${recommendation}
          </div>
          <div style="font-size: 12px; color: #94a3b8;">
            ${isGoodDeal ? '🔥 Profitable Part-Out Opportunity!' : '⚠️ Not Recommended'}
          </div>
          ${reasoning ? `<div style="font-size: 10px; color: #64748b; margin-top: 4px;">${reasoning}</div>` : ''}
        </div>

        <div class="price-row">
          <span class="price-label">Listing Price:</span>
          <span class="price-value">$${listing.price || 0}</span>
        </div>

        <div class="price-row">
          <span class="price-label">Parts Value:</span>
          <span class="price-value ebay-price">$${partsValue.toFixed(0)}</span>
        </div>

        <div class="price-row">
          <span class="price-label">Net Profit:</span>
          <span class="price-value ${netProfit > 0 ? 'spread-positive' : 'spread-negative'}">
            ${netProfit >= 0 ? '+' : ''}$${netProfit.toFixed(0)}
          </span>
        </div>

        <div class="price-row">
          <span class="price-label">ROI:</span>
          <span class="price-value">${roiPct.toFixed(0)}%</span>
        </div>

        ${Object.keys(componentBreakdown).length > 0 ? `
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #334155;">
            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">Component Values (eBay):</div>
            ${Object.entries(componentBreakdown).map(([type, price]) =>
              `<div style="display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0;">
                <span style="color: #94a3b8; text-transform: uppercase;">${type}</span>
                <span style="color: #22c55e;">$${price.toFixed(0)}</span>
              </div>`
            ).join('')}
          </div>
        ` : ''}

        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #334155;">
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;">Detected Components:</div>
          <div style="display: flex; flex-wrap: wrap; gap: 4px;">
            ${Object.entries(components).map(([type, values]) =>
              (values || []).map(v =>
                `<span style="background: #1e293b; padding: 2px 6px; border-radius: 4px; font-size: 10px; color: #e2e8f0;">${type}: ${v}</span>`
              ).join('')
            ).join('')}
          </div>
          ${missingSpecs.length > 0 ? `
            <div style="margin-top: 8px; font-size: 10px; color: #f59e0b;">
              ⚠️ Missing: ${missingSpecs.join(', ')}
            </div>
          ` : ''}
        </div>

        ${costBreakdown.total ? `
          <div style="margin-top: 8px; font-size: 10px; color: #64748b;">
            Est. Costs: $${costBreakdown.total.toFixed(0)} (fees, shipping, etc.)
          </div>
        ` : ''}

        <div style="margin-top: 8px; font-size: 10px; color: #64748b;">
          Confidence: ${(confidence * 100).toFixed(0)}%
        </div>

        <a class="scout-link" id="full-analysis-link" href="#" target="_blank" style="margin-top: 12px;">
          View Full Analysis →
        </a>
      </div>
    `;

    shadow.querySelector('.close-btn').addEventListener('click', () => {
      overlayElement.remove();
      overlayElement = null;
    });

    // Build URL with listing data for Jiggly form pre-fill
    shadow.querySelector('#full-analysis-link').addEventListener('click', (e) => {
      e.preventDefault();
      const params = new URLSearchParams();
      if (listing.title) params.set('title', listing.title);

      // Re-extract description NOW (DOM should be fully loaded by now)
      // This fixes timing issues where initial extraction happened too early
      let desc = extractFullDescription();
      if (!desc || desc.length < 50) {
        // Fall back to stored description if re-extraction fails
        desc = listing.fullDescription || listing.description || '';
      }

      // Clean description of UI noise before sending
      desc = cleanDescription(desc);

      if (desc) params.set('description', desc.substring(0, 2000));
      if (listing.price) params.set('price', String(listing.price));
      if (listing.url) params.set('url', listing.url);
      const fullUrl = `${APP_URL}/pc-resale?${params.toString()}`;
      window.open(fullUrl, '_blank');
    });
  }

  // Clean description of Facebook UI noise
  function cleanDescription(text) {
    if (!text) return '';

    return text
      // Remove quick reply buttons
      .replace(/Is it available\??/gi, '')
      .replace(/Pick up today\??/gi, '')
      .replace(/Cash ready\??/gi, '')
      .replace(/Bundle deal\??/gi, '')
      // Remove messaging UI
      .replace(/Send seller a message/gi, '')
      .replace(/is this still available\??/gi, '')
      .replace(/Hi [^,]+, is this still available\??/gi, '')
      // Remove seller info
      .replace(/Seller information/gi, '')
      .replace(/Seller details/gi, '')
      .replace(/Joined Facebook in \d{4}/gi, '')
      .replace(/Highly rated on Marketplace/gi, '')
      .replace(/\(\d+\)\s*$/gm, '') // Remove rating like "(3)" at end of names
      // Remove location meta
      .replace(/Location is approximate/gi, '')
      .replace(/Public meetup/gi, '')
      .replace(/Door pickup or dropoff/gi, '')
      // Remove ads and sponsored content
      .replace(/Shopify/gi, '')
      .replace(/Bring your idea to life/gi, '')
      .replace(/Step up and stand out\.?/gi, '')
      .replace(/Northeastern University[^.]*\.?/gi, '')
      // Remove duplicate listings of time/location
      .replace(/Listed \d+ (?:days?|weeks?|months?) ago in [^.]+\./gi, '')
      .replace(/\d+ (?:days?|weeks?|months?) ago\s+[A-Z][a-z]+,?\s*[A-Z]{2}/g, '')
      // Remove common FB boilerplate
      .replace(/Message\s*$/gm, '')
      .replace(/Send\s*$/gm, '')
      // Clean up excessive whitespace and newlines
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+/g, ' ')
      .trim();
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
