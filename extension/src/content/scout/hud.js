// Cyberpunk HUD Overlay
// Provides persistent "active assistant" monitoring UI

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
    chrome.storage.local.get(['watchlistItems'], (result) => {
      updateStatsUI(result.watchlistItems || []);
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
      if (namespace === 'local' && changes.watchlistItems) {
        updateStatsUI(changes.watchlistItems.newValue);
      }
    });

    // Listen for match events from other content scripts
    document.addEventListener('SMART_SCOUT_MATCH_FOUND', (e) => {
      triggerRadarPing();
      updateFeed(e.detail);
    });
  }

  function updateFeed(match) {
    if (!shadowRoot) return;
    const feed = shadowRoot.getElementById('hud-feed');
    
    // Remove empty state if present
    const emptyState = feed.querySelector('div[style*="opacity: 0.5"]');
    if (emptyState) emptyState.remove();
    
    // Add new item
    const item = document.createElement('a');
    item.className = 'feed-item';
    item.href = match.link;
    item.target = '_blank';
    item.innerHTML = `<span class="feed-price">$${match.price}</span> ${match.title}`;
    
    feed.insertBefore(item, feed.firstChild);
    
    // Limit to 5 items
    while (feed.children.length > 5) {
      feed.removeChild(feed.lastChild);
    }
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