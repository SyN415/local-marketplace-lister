// Cyberpunk HUD Overlay
// Provides persistent "active assistant" monitoring UI
// Profit Analyzer (HUD-only): computes ROI score + resale suggestion using eBay comps when available

(function() {
  'use strict';

  const HUD_CONTAINER_ID = 'smart-scout-hud-root';
  const APP_URL = 'https://local-marketplace-backend-wr5e.onrender.com';
  
  let shadowRoot = null;
  let isExpanded = false;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  function init() {
    // Avoid duplicates
    if (document.getElementById(HUD_CONTAINER_ID)) return;

    createHudElement();
    loadStats();
    setupEventListeners();
  }

  function createHudElement() {
    const container = document.createElement('div');
    container.id = HUD_CONTAINER_ID;
    document.body.appendChild(container);

    shadowRoot = container.attachShadow({ mode: 'open' });

    // Load external CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('src/content/scout/hud.css');
    shadowRoot.appendChild(link);

    // Create Dock (Collapsed)
    const dock = document.createElement('div');
    dock.className = 'hud-dock';
    dock.innerHTML = `
      <div class="eye-icon">
        <div class="eye-pupil"></div>
      </div>
      <span>SCOUT ONLINE</span>
      <span class="notification-badge" id="hud-badge" style="display:none">0</span>
    `;
    shadowRoot.appendChild(dock);

    // Create Main Panel (Expanded)
    const panel = document.createElement('div');
    panel.className = 'hud-panel';
    panel.innerHTML = `
      <div class="hud-header">
        <span class="hud-title">[ SYSTEM ACTIVE ]</span>
        <button class="minimize-btn" title="Minimize">_</button>
      </div>
      <div class="hud-body">
        <div class="radar-container">
          <div class="radar-circle">
            <div class="radar-sweep"></div>
            <!-- Radar dots will be injected here -->
          </div>
        </div>
        
        <div class="stats-grid">
          <div class="stat-item active">
            <span class="stat-value" id="hud-active-count">--</span>
            <span class="stat-label">Watchlists</span>
          </div>
          <div class="stat-item matches">
            <span class="stat-value" id="hud-match-count">--</span>
            <span class="stat-label">Matches</span>
          </div>
          <div class="stat-item roi">
            <span class="stat-value" id="hud-roi-score">--</span>
            <span class="stat-label">ROI Score</span>
          </div>
        </div>

        <div class="feed-section" id="hud-feed">
          <div style="text-align: center; opacity: 0.5; font-size: 10px;">No recent matches</div>
        </div>
        
        <div style="margin-top: 10px; display: flex; gap: 5px;">
          <a href="${APP_URL}/dashboard" target="_blank" class="scout-btn" style="flex: 1; padding: 6px; font-size: 10px; margin: 0;">DASHBOARD</a>
        </div>
      </div>
    `;
    shadowRoot.appendChild(panel);

    // Dock interactions
    dock.addEventListener('click', () => {
      if (!isDragging) {
        toggleHud(true);
      }
    });

    // Minimize interaction
    panel.querySelector('.minimize-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleHud(false);
    });

    // Dragging Logic (for Dock)
    makeDraggable(dock);
    // Dragging Logic (for Panel Header)
    makeDraggable(panel.querySelector('.hud-header'), panel);
  }

  function toggleHud(expanded) {
    isExpanded = expanded;
    const dock = shadowRoot.querySelector('.hud-dock');
    const panel = shadowRoot.querySelector('.hud-panel');

    if (expanded) {
      dock.style.display = 'none';
      panel.style.display = 'flex';
      panel.style.left = dock.style.left || '20px';
      panel.style.bottom = dock.style.bottom || '20px';
      // Adjust if off-screen
      const rect = panel.getBoundingClientRect();
      if (rect.right > window.innerWidth) panel.style.left = (window.innerWidth - rect.width - 20) + 'px';
      if (rect.bottom > window.innerHeight) panel.style.top = (window.innerHeight - rect.height - 20) + 'px';
      panel.classList.add('visible');
    } else {
      dock.style.display = 'flex';
      panel.style.display = 'none';
      panel.classList.remove('visible');
      // Sync position back to dock
      dock.style.left = panel.style.left;
      dock.style.bottom = panel.style.bottom || '20px'; // Reset bottom if top was used
      if (panel.style.top) {
         dock.style.top = panel.style.top;
         dock.style.bottom = 'auto';
      }
    }
  }

  function makeDraggable(handle, target) {
    const el = target || handle;
    
    handle.addEventListener('mousedown', (e) => {
      isDragging = false;
      const startX = e.clientX;
      const startY = e.clientY;
      const rect = el.getBoundingClientRect();
      const offsetX = startX - rect.left;
      const offsetY = startY - rect.top;

      function onMouseMove(e) {
        isDragging = true;
        el.style.left = (e.clientX - offsetX) + 'px';
        el.style.top = (e.clientY - offsetY) + 'px';
        el.style.bottom = 'auto';
        el.style.right = 'auto';
      }

      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        // Small timeout to prevent click event if it was a drag
        setTimeout(() => isDragging = false, 50);
      }

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  function loadStats() {
    chrome.storage.local.get(['watchlistItems', 'lastProfitAnalysis'], (result) => {
      updateStatsUI(result.watchlistItems || []);
      if (result.lastProfitAnalysis) {
        const el = shadowRoot?.getElementById('hud-roi-score');
        if (el && Number.isFinite(result.lastProfitAnalysis.roiScore)) {
          el.textContent = result.lastProfitAnalysis.roiScore;
        }
      }
    });
  }

  function updateStatsUI(items) {
    if (!shadowRoot) return;

    const activeCount = items.filter(i => i.isActive).length;
    const totalMatches = items.reduce((sum, item) => sum + (item.totalMatches || 0), 0);

    const activeEl = shadowRoot.getElementById('hud-active-count');
    const matchEl = shadowRoot.getElementById('hud-match-count');
    const badgeEl = shadowRoot.getElementById('hud-badge');

    if (activeEl) activeEl.textContent = activeCount;
    if (matchEl) matchEl.textContent = totalMatches;
    
    if (badgeEl) {
      if (totalMatches > 0) {
        badgeEl.textContent = totalMatches;
        badgeEl.style.display = 'block';
      } else {
        badgeEl.style.display = 'none';
      }
    }
  }

  function setupEventListeners() {
    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== 'local') return;

      if (changes.watchlistItems) {
        updateStatsUI(changes.watchlistItems.newValue);
      }

      if (changes.lastProfitAnalysis) {
        const next = changes.lastProfitAnalysis.newValue;
        const el = shadowRoot?.getElementById('hud-roi-score');
        if (el && next && Number.isFinite(next.roiScore)) {
          el.textContent = next.roiScore;
        }
      }

      // Unified cross-tab match feed
      if (changes.recentMatches) {
        renderRecentMatches(changes.recentMatches.newValue || []);
      }
    });

    // Listen for match events from other content scripts (same-tab)
    document.addEventListener('SMART_SCOUT_MATCH_FOUND', (e) => {
      triggerRadarPing();
      updateFeed(e.detail);
      updateRoiScore(e.detail);
    });

    // Listen for enrichment updates (same-tab via EnrichmentBridge)
    window.addEventListener('enrichment:priceUpdated', (e) => {
      const detail = e?.detail;
      const patch = detail?.patch;
      const match = detail?.originalMatch || {};

      // Apply enrichment patch for ROI calc (avgPrice/lowPrice/highPrice/compsCount)
      const updated = { ...match, ...(patch || {}) };

      triggerRadarPing();
      updateFeed(updated);
      updateRoiScore(updated);
    });

    // Listen for cross-tab broadcasts
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.action === 'SCOUT_MATCH_BROADCAST' && msg.match) {
        triggerRadarPing();
        updateFeed(msg.match);
        updateRoiScore(msg.match);
      }

      // Back-compat: allow service worker to send enrichment updates directly
      if (msg?.action === 'ENRICHMENT_UPDATE' && msg.payload) {
        const payload = msg.payload;
        if (payload.type === 'price_intelligence_enriched') {
          const updated = { ...(payload.originalMatch || {}), ...(payload.patch || {}) };
          triggerRadarPing();
          updateFeed(updated);
          updateRoiScore(updated);
        }
      }
    });
  }

  function renderRecentMatches(matches) {
    if (!shadowRoot) return;
    const feed = shadowRoot.getElementById('hud-feed');
    if (!feed) return;
    feed.innerHTML = '';

    if (!Array.isArray(matches) || matches.length === 0) {
      feed.innerHTML = '<div style="text-align: center; opacity: 0.5; font-size: 10px;">No recent matches</div>';
      return;
    }

    // Render newest first
    matches.slice(0, 5).forEach((m) => {
      updateFeed(m);
    });
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function parseMaybeNumber(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string') {
      const m = v.match(/[\d,.]+/);
      if (!m) return null;
      const n = parseFloat(m[0].replace(/,/g, ''));
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  // Profit Analyzer (robust ROI model)
  // - Integrates comps when available
  // - Weighted scoring: profit, condition, category trends, sales velocity
  // - Tiered fallback (0..100) when comps are unavailable
  // - Error boundary ensures no silent failures

  function inferCondition(match) {
    const t = (match?.title || '').toLowerCase();
    const c = (match?.condition || '').toLowerCase();
    const text = `${t} ${c}`;

    if (text.includes('new in box') || text.includes('nib')) return { label: 'new', score: 95 };
    if (text.includes('brand new') || text.includes('new')) return { label: 'new', score: 90 };
    if (text.includes('like new') || text.includes('excellent')) return { label: 'like_new', score: 80 };
    if (text.includes('good')) return { label: 'good', score: 65 };
    if (text.includes('fair')) return { label: 'fair', score: 50 };
    if (text.includes('parts') || text.includes('broken') || text.includes('repair')) return { label: 'parts', score: 20 };

    return { label: 'unknown', score: 55 };
  }

  function inferCategory(match) {
    const t = (match?.title || '').toLowerCase();
    if (/(aeron|chair|desk|furniture)/.test(t)) return { label: 'furniture', trendScore: 70 };
    if (/(iphone|ipad|macbook|laptop|ps5|xbox|gpu|rtx)/.test(t)) return { label: 'electronics', trendScore: 75 };
    if (/(bike|bicycle|mtb)/.test(t)) return { label: 'bikes', trendScore: 65 };
    return { label: 'general', trendScore: 60 };
  }

  function tieredFallbackScore(match) {
    const asking = parseMaybeNumber(match.price);
    if (asking === null) return { roiScore: 35, rationale: 'no_price' };

    // Tiered fallback: clearer thresholds 0..100
    let base;
    if (asking <= 25) base = 80;
    else if (asking <= 50) base = 70;
    else if (asking <= 100) base = 60;
    else if (asking <= 200) base = 45;
    else if (asking <= 400) base = 35;
    else base = 25;

    const cond = inferCondition(match);
    const category = inferCategory(match);

    const roiScore = clamp(Math.round(base * 0.55 + cond.score * 0.25 + category.trendScore * 0.20), 0, 100);
    return { roiScore, rationale: 'tiered_fallback', base, cond: cond.label, category: category.label };
  }

  function analyzeProfit(match) {
    try {
      const asking = parseMaybeNumber(match.price);
      const avg = parseMaybeNumber(match.avgPrice);
      const low = parseMaybeNumber(match.lowPrice);
      const high = parseMaybeNumber(match.highPrice);
      const comps = parseMaybeNumber(match.compsCount);

      const condition = inferCondition(match);
      const category = inferCategory(match);

      // Historical sales velocity proxy (compsCount ~ last N days), 0..60 => 0..100
      const velocityScore = comps !== null ? clamp((comps / 60) * 100, 0, 100) : 50;

      // Competitor volatility: wide comps range => lower score
      let competitorScore = 50;
      if (low !== null && high !== null && avg !== null && avg > 0) {
        const spread = (high - low) / avg;
        competitorScore = clamp(100 - spread * 120, 0, 100);
      }

      // No comps => tiered fallback
      if (avg === null || !Number.isFinite(avg)) {
        const fallback = tieredFallbackScore(match);
        return {
          roiScore: fallback.roiScore,
          suggestedResale: null,
          expectedProfit: null,
          roiPct: null,
          flipPotential: false,
          demandScore: Math.round(velocityScore),
          competitorScore: Math.round(competitorScore),
          trendScore: category.trendScore,
          velocityScore: Math.round(velocityScore),
          condition: condition.label,
          category: category.label,
          method: 'fallback',
          meta: { ...fallback }
        };
      }

      // Comps-based resale estimate
      const conditionMultiplier = condition.label === 'new' ? 1.02 : condition.label === 'like_new' ? 1.00 : condition.label === 'good' ? 0.95 : 0.90;
      const trendAggression = (category.trendScore - 50) / 100; // 0..0.5

      let suggestedResale = avg * (0.92 + trendAggression * 0.10) * conditionMultiplier;
      if (low !== null && high !== null) {
        suggestedResale = clamp(suggestedResale, low, high);
      }

      // Fees assumptions
      const feeRate = 0.13;
      const handling = 8;

      let expectedProfit = null;
      let roiPct = null;
      if (asking !== null && Number.isFinite(asking)) {
        const proceeds = suggestedResale * (1 - feeRate) - handling;
        expectedProfit = proceeds - asking;
        roiPct = asking > 0 ? (expectedProfit / asking) * 100 : null;
      }

      // Profit score mapping (0..100)
      let profitScore = 0;
      if (roiPct === null) profitScore = 35;
      else if (roiPct <= -20) profitScore = 0;
      else if (roiPct <= 0) profitScore = 20 + (roiPct + 20) * 1;
      else if (roiPct <= 30) profitScore = 40 + roiPct * 1.1667;
      else if (roiPct <= 60) profitScore = 75 + (roiPct - 30) * 0.6667;
      else profitScore = 95;
      profitScore = clamp(profitScore, 0, 100);

      // Composite weighted ROI score
      const roiScore = clamp(Math.round(
        profitScore * 0.50 +
        condition.score * 0.15 +
        category.trendScore * 0.15 +
        velocityScore * 0.15 +
        competitorScore * 0.05
      ), 0, 100);

      const flipPotential = expectedProfit !== null && expectedProfit >= 40 && roiScore >= 70;

      return {
        roiScore,
        suggestedResale: Math.round(suggestedResale),
        expectedProfit: expectedProfit !== null ? Math.round(expectedProfit) : null,
        roiPct: roiPct !== null ? Math.round(roiPct) : null,
        flipPotential,
        demandScore: Math.round(velocityScore),
        competitorScore: Math.round(competitorScore),
        trendScore: category.trendScore,
        velocityScore: Math.round(velocityScore),
        condition: condition.label,
        category: category.label,
        method: 'comps',
        meta: {
          inputs: { asking, avg, low, high, comps, feeRate, handling },
          scores: {
            profitScore: Math.round(profitScore),
            conditionScore: condition.score,
            trendScore: category.trendScore,
            velocityScore: Math.round(velocityScore),
            competitorScore: Math.round(competitorScore)
          },
          multipliers: { conditionMultiplier, trendAggression }
        }
      };
    } catch (err) {
      return {
        roiScore: 0,
        suggestedResale: null,
        expectedProfit: null,
        roiPct: null,
        flipPotential: false,
        demandScore: 0,
        competitorScore: 0,
        trendScore: 0,
        velocityScore: 0,
        condition: 'error',
        category: 'error',
        method: 'error',
        meta: { error: String(err?.message || err) }
      };
    }
  }

  function updateRoiScore(match) {
    if (!shadowRoot) return;
    const el = shadowRoot.getElementById('hud-roi-score');
    if (!el) return;

    const analysis = analyzeProfit(match);
    el.textContent = Number.isFinite(analysis.roiScore) ? analysis.roiScore : '--';
  }

  function updateFeed(match) {
    if (!shadowRoot) return;
    const feed = shadowRoot.getElementById('hud-feed');

    // Remove empty state if present
    const emptyState = feed.querySelector('div[style*="opacity: 0.5"]');
    if (emptyState) emptyState.remove();

    const analysis = analyzeProfit(match);
    const roiClass = analysis.roiScore >= 75 ? 'good' : analysis.roiScore >= 50 ? 'warn' : 'bad';

    // Add new item
    const item = document.createElement('a');
    item.className = 'feed-item';
    item.href = match.link;
    item.target = '_blank';

    const priceStr = match.price ?? '???';
    const platformBadge = match.platform === 'facebook' ? 'FB' : match.platform === 'craigslist' ? 'CL' : '??';
    const roiStr = Number.isFinite(analysis.roiScore) ? `${analysis.roiScore}` : '--';
    const suggestedStr = analysis.suggestedResale !== null ? `$${analysis.suggestedResale}` : '--';
    const profitStr = analysis.expectedProfit !== null ? `$${analysis.expectedProfit}` : '--';

    // Enrichment UI fallback indicator
    const staleBadge = match?.stale ? '<span class="roi-pill warn" style="min-width:64px; text-align:center;">STALE</span>' : '';

    item.innerHTML = `
      <div class="feed-line-1">
        <span class="feed-price">$${priceStr}</span>
        <span class="roi-pill ${roiClass}" style="min-width:52px; text-align:center;">${platformBadge}</span>
        ${staleBadge}
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${match.title}</span>
        <span class="roi-pill ${roiClass}">ROI ${roiStr}</span>
        ${analysis.flipPotential ? '<span class="flip-badge">Flip Potential</span>' : ''}
      </div>
      <div class="feed-line-2">
        <span class="feed-metric">Resale: ${suggestedStr}</span>
        <span class="feed-metric">Profit: ${profitStr}</span>
      </div>
    `;

    feed.insertBefore(item, feed.firstChild);

    // Limit to 5 items
    while (feed.children.length > 5) {
      feed.removeChild(feed.lastChild);
    }

    // Persist last analysis with metadata for debugging + transparency
    chrome.storage.local.set({
      lastProfitAnalysis: {
        ...analysis,
        title: match.title,
        link: match.link,
        platform: match.platform,
        matchId: match.id,
        ts: Date.now()
      }
    });

    // Maintain a unified recentMatches list (storage-driven sidebar feed)
    chrome.storage.local.get(['recentMatches'], (res) => {
      const existing = Array.isArray(res.recentMatches) ? res.recentMatches : [];
      const next = [
        {
          ...match,
          analysis,
          ts: match.ts || Date.now()
        },
        ...existing.filter((m) => (m?.id || m?.link) !== (match.id || match.link))
      ].slice(0, 50);
      chrome.storage.local.set({ recentMatches: next });
    });
  }

  function triggerRadarPing() {
    if (!shadowRoot) return;
    const radar = shadowRoot.querySelector('.radar-circle');
    
    // Create a temporary dot
    const dot = document.createElement('div');
    dot.className = 'radar-dot';
    // Random position within circle
    const angle = Math.random() * 360;
    const dist = Math.random() * 40; // max radius 20px approx
    dot.style.transform = `rotate(${angle}deg) translate(${dist}px)`;
    
    radar.appendChild(dot);
    
    // Remove after animation
    setTimeout(() => dot.remove(), 2000);
  }

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();