// EnrichmentBridge
// - Forwards match events to background service worker enrichment pipeline
// - Uses BroadcastChannel for cross-tab synchronization
// - Provides graceful degradation (if SW or BC missing, core HUD continues on base matches)

(function () {
  'use strict';

  const CHANNEL = 'marketplace_enrichment';

  // Cross-tab channel: content scripts across tabs can coordinate and avoid missing updates
  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;

  // Listen for enrichment updates from service worker (sent via chrome.tabs.sendMessage)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.action !== 'ENRICHMENT_UPDATE' || !msg.payload) return;

    // 1) Fan out cross-tab
    try {
      bc?.postMessage(msg.payload);
    } catch {
      // ignore
    }

    // 2) Dispatch DOM event for HUD/components (same tab)
    dispatchEnrichmentDomEvent(msg.payload);
  });

  // Receive cross-tab updates
  bc?.addEventListener('message', (ev) => {
    if (!ev?.data) return;
    dispatchEnrichmentDomEvent(ev.data);
  });

  // Forward match_detected events from page/content to service worker
  document.addEventListener('SMART_SCOUT_MATCH_FOUND', (e) => {
    const match = e?.detail;
    if (!match) return;

    // Tell background we saw a match (it already handles SCOUT_MATCH_FOUND from scouts)
    // but this bridge ensures any match events that bypass background still can be enriched.
    try {
      chrome.runtime.sendMessage({ action: 'ENRICH_MATCH', match }, () => {});
    } catch {
      // ignore
    }
  });

  function dispatchEnrichmentDomEvent(payload) {
    try {
      if (payload.type === 'price_intelligence_enriched') {
        window.dispatchEvent(new CustomEvent('enrichment:priceUpdated', { detail: payload }));
      } else if (payload.type === 'price_enrichment_failed') {
        window.dispatchEvent(new CustomEvent('enrichment:failed', { detail: payload }));
      } else if (payload.type === 'enrichment_throttled') {
        window.dispatchEvent(new CustomEvent('enrichment:throttled', { detail: payload }));
      }
    } catch {
      // ignore
    }
  }
})();
