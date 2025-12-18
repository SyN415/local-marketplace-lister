# Bright Data Enrichment Integration Guide

This guide documents the Bright Data enrichment pipeline added to the MV3 Chrome extension. The design is **event-driven and non-blocking**: marketplace scanning (FB/CL) continues even if Bright Data is misconfigured, rate-limited, or down.

> Reference plan: [`Bright-Data-Integration-Plan.md`](../Bright-Data-Integration-Plan.md)

## 1) What’s implemented

### Core components

- Bright Data API wrapper (fetch-based, MV3 compatible):
  - [`BrightDataClient`](../extension/src/background/brightdata-client.js:1)
  - Bearer token auth (`Authorization: Bearer <token>`)
  - Exponential backoff retry on **429 / 503 / 504**

- Enrichment consumer worker:
  - [`EnrichmentWorker`](../extension/src/background/enrichment-worker.js:1)
  - **Max concurrency**: 5
  - **Circuit breaker**: 10 consecutive failures → 60s open
  - **Dedup**: 60s window per query
  - **Selective enrichment**: via feature flags
  - **Smart batching hook**: micro-batches queueing (ready for future Bright Data batch APIs)

- Caching + metrics:
  - 24h caching in [`enrichment-cache.js`](../extension/src/background/enrichment-cache.js:1)
  - metrics in [`enrichment-metrics.js`](../extension/src/background/enrichment-metrics.js:1)

- Cross-tab sync + UI updates:
  - BroadcastChannel relay: [`enrichment-bridge.js`](../extension/src/content/enrichment-bridge.js:1)
  - HUD listens for `enrichment:priceUpdated`: [`hud.js`](../extension/src/content/scout/hud.js:206)

### Data flow (high level)

1. Content scripts detect a match (`SMART_SCOUT_MATCH_FOUND`) and send `SCOUT_MATCH_FOUND` to background.
2. Background still broadcasts `SCOUT_MATCH_BROADCAST` to all marketplace tabs (existing behavior).
3. Background *also* queues enrichment (best-effort) in [`SCOUT_MATCH_FOUND`](../extension/src/background/service-worker.js:377).
4. When enrichment completes, background sends `ENRICHMENT_UPDATE` to tabs.
5. The content-side [`EnrichmentBridge`](../extension/src/content/enrichment-bridge.js:1) re-broadcasts the payload across tabs via `BroadcastChannel('marketplace_enrichment')` and dispatches a custom DOM event.
6. HUD recomputes ROI using enriched comps when available.

## 2) Bright Data products used

### 2.1 Web Unlocker API (Craigslist / anti-bot bypass)

Implemented via `POST https://api.brightdata.com/request` with the configured `webUnlockerZone`.

Entry point: [`BrightDataClient.scrapeWithWebUnlocker()`](../extension/src/background/brightdata-client.js:94)

### 2.2 Scraping Browser API (eBay / dynamic pages)

Currently the extension produces a WS endpoint for external Playwright/Puppeteer sessions.

Entry point: [`BrightDataClient.getScrapingBrowserWsEndpoint()`](../extension/src/background/brightdata-client.js:113)

> This project’s current enrichment uses Web Unlocker to fetch eBay sold comps HTML. The Scraping Browser endpoint is implemented for future expansion.

### 2.3 Residential Proxies (geo-targeted monitoring)

Proxy config helper is implemented for future use.

Entry point: [`BrightDataClient.getResidentialProxyConfig()`](../extension/src/background/brightdata-client.js:132)

## 3) Configuration: where credentials live

### Important note about MV3 extensions

Chrome extensions **do not** have access to backend environment variables at runtime. The extension service worker stores Bright Data settings in **`chrome.storage.local`**.

The service worker reads these keys when initializing enrichment:
- `brightDataApiToken`
- `brightDataWebUnlockerZone`
- `brightDataBrowserZone`
- `brightDataResidentialZone` (optional)
- `brightDataCustomerId` (optional)
- `brightDataBrowserPassword` (optional)
- `brightDataProxyPassword` (optional)

Initialization logic: [`initEnrichmentWorker()`](../extension/src/background/service-worker.js:63)

### How to set credentials (current implementation)

The service worker exposes a message API to set credentials:

- Action: `ENRICHMENT_SET_CREDENTIALS`
- Fields:
  - `apiToken`
  - `webUnlockerZone`
  - `browserZone`
  - `residentialProxyZone` (optional)
  - `customerId` (optional)
  - `browserPassword` (optional)
  - `proxyPassword` (optional)

Handler: [`ENRICHMENT_SET_CREDENTIALS`](../extension/src/background/service-worker.js:451)

> The project does not yet include a UI screen for this; you can send it from a privileged extension page or temporarily via DevTools.

## 4) Feature flags (rollout + rollback)

Flags are stored under `chrome.storage.local.enrichmentFlags`.

Default definition: [`DEFAULT_ENRICHMENT_FLAGS`](../extension/src/background/feature-flags.js:8)

Fields:
- `enabled` (boolean)
- `sampleRate` (0..1)
- `minRoiScoreToEnrich` (number | null)

Actions:
- `ENRICHMENT_GET_FLAGS`
- `ENRICHMENT_SET_FLAGS`

Handlers: [`ENRICHMENT_GET_FLAGS`](../extension/src/background/service-worker.js:411), [`ENRICHMENT_SET_FLAGS`](../extension/src/background/service-worker.js:416)

Recommended staged rollout:
- 10%: `enabled=true`, `sampleRate=0.10`
- 50%: `sampleRate=0.50`
- 100%: `sampleRate=1.00`

Rollback:
- set `enabled=false`

## 5) Monitoring & observability

Metrics are tracked in `chrome.storage.local.enrichmentMetrics`.

### Added metrics (2025-12 audit)

The baseline counters remain, and the following were added for better operational visibility:

- `cacheHits`, `staleCacheHits`
- `throttledByReason` (e.g. `duplicate_request`, `circuit_open`)
- `averageQueueDelayMs` (queue wait time)
- `brightDataRetries` (retry attempts emitted by [`BrightDataClient.requestWithRetry()`](../extension/src/background/brightdata-client.js:56))
- `brightDataErrorsByCode` + `lastError` (bucketed errors)

Implementation:
- metrics schema: [`DEFAULT_METRICS`](../extension/src/background/enrichment-metrics.js:6)
- queue delay + throttled reasons: [`EnrichmentWorker.enqueueMatch()`](../extension/src/background/enrichment-worker.js:70)
- retry counter hook: [`initEnrichmentWorker()`](../extension/src/background/service-worker.js:63)

API:
- `ENRICHMENT_GET_METRICS`
- `ENRICHMENT_RESET_METRICS`

Handlers: [`ENRICHMENT_GET_METRICS`](../extension/src/background/service-worker.js:421), [`ENRICHMENT_RESET_METRICS`](../extension/src/background/service-worker.js:426)

Cache maintenance:
- `ENRICHMENT_CLEAR_CACHE`

Handler: [`ENRICHMENT_CLEAR_CACHE`](../extension/src/background/service-worker.js:431)

Target latency:
- < 5s per match (measured via `averageEnrichmentTimeMs`)

## 6) Graceful degradation guarantees

- Core scan/broadcast is always executed even when enrichment fails.
- Enrichment failures emit `price_enrichment_failed` but do not block UI.

Core behavior preserved in: [`SCOUT_MATCH_FOUND`](../extension/src/background/service-worker.js:377)

## 7) Render hosted instance configuration (environment variables)

### What goes in Render vs what goes in the extension

**Render (backend/web app) environment variables** are for server-side code only. They do *not* automatically configure the extension.

However, you should still define Bright Data variables in Render so your backend can:
- proxy/configure future server-side enrichment
- store defaults for an eventual “configure extension” UI

Recommended Render environment variables:

```bash
# Bright Data (server-side usage / future)
BRIGHTDATA_API_TOKEN=...
BRIGHTDATA_WEB_UNLOCKER_ZONE=...
BRIGHTDATA_BROWSER_ZONE=...
BRIGHTDATA_RESIDENTIAL_PROXY_ZONE=...

# If/when you use Scraping Browser / Residential proxies with username+password
BRIGHTDATA_CUSTOMER_ID=...
BRIGHTDATA_BROWSER_PASSWORD=...
BRIGHTDATA_PROXY_PASSWORD=...
```

> Today’s implementation uses the extension’s `chrome.storage.local` keys. Treat the Render env vars as the canonical source of truth for your org; then mirror them into the extension via whatever admin workflow you choose.

## 8) Testing & validation

### Node smoke test

Run:

```bash
node extension/test/enrichment_smoke_test.js
```

File: [`extension/test/enrichment_smoke_test.js`](../extension/test/enrichment_smoke_test.js:1)

### Failure scenario simulation (local)

The enrichment pipeline is designed to degrade gracefully; you can validate key edge cases via unit tests:

- Dedup window prevents extra scrapes
- Circuit breaker opens after consecutive failures and then throttles

Run:

```bash
node --test extension/src/background/__tests__/enrichment-worker.test.js
```

Tests: [`enrichment-worker.test.js`](../extension/src/background/__tests__/enrichment-worker.test.js:1)

### Manual browser validation checklist

1. Load extension unpacked.
2. Configure Bright Data creds in extension storage.
3. Set flags to 10% and confirm only some matches get enriched.
4. Open two tabs (FB + CL) and confirm enrichment updates propagate via BroadcastChannel.
5. Simulate failure:
   - remove `brightDataApiToken` or set an invalid token
   - confirm matches still appear + ROI fallback works
6. Confirm cache:
   - reload tab and confirm `STALE` badge appears when served from stale cache.
