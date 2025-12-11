# Bright Data API Integration Implementation Plan

## Executive Overview

This document outlines a phased, event-driven approach to integrating Bright Data's Web Scraping APIs into your marketplace scout platform. The integration leverages your existing standardized match event contracts, background service worker architecture, and cross-tab broadcast relay to augment real-time marketplace scanning (Craigslist, Facebook) and competitive price intelligence (eBay).

The plan emphasizes minimal disruption to existing functionality while maximizing data enrichment and ROI calculation accuracy through decoupled, consumer-based event processing.

---

## Part 1: Architecture & Integration Strategy

### 1.1 High-Level Integration Architecture

Your existing pipeline:
```
Craigslist Scanner → Match Detection → Standardized Event → Broadcast Relay → HUD/Profit Analyzer
Facebook Scanner → Real-time Sync → Match Contract → Cross-Tab State → ROI Scoring
```

Post-Bright Data integration (parallel consumer pattern):
```
Craigslist Scanner → Match Detection → Standardized Event ──┐
                                                            ├→ Broadcast Relay → HUD
Facebook Scanner → Real-time Sync → Match Contract ────────┤
                                                            ├→ [NEW] Bright Data Consumer
                                                            │   (Price Intelligence)
                                                            └→ Enriched Events → Updated HUD
```

**Key Architecture Principle**: Bright Data calls are processed as **decoupled event consumers**, not inline within your match detection logic. This ensures:

- **Resilience**: Match detection continues if Bright Data API is unavailable
- **Scalability**: Price lookups don't block marketplace scanning
- **Observability**: Event streams provide audit trails for ROI calculations
- **Testability**: Mock Bright Data responses without affecting core matching

### 1.2 Bright Data Product Alignment

| Product | Use Case | Your Application |
|---------|----------|------------------|
| **Web Unlocker API** | Bypass Craigslist anti-bot detection | Enhanced Craigslist active scanning success rate |
| **Scraping Browser API** | Headless browser for dynamic content | eBay competitive intelligence (sold listings, trends) |
| **Residential Proxies** | Rotate IP geographically for localized data | Facebook Marketplace region-specific scanning |
| **SERP API** | Search engine scraping | (Optional) hyperlocal listing aggregation |

---

## Part 2: Technical Implementation

### 2.1 Phase 1: Environment & Authentication Setup

#### Step 1.1.1: Install Bright Data SDK

```bash
npm install @brightdata/mcp
# OR for direct API calls:
npm install axios dotenv
```

#### Step 1.1.2: Environment Configuration

Create `.env`:
```env
BRIGHTDATA_API_TOKEN=your_api_token_here
BRIGHTDATA_WEB_UNLOCKER_ZONE=your_unlocker_zone
BRIGHTDATA_BROWSER_ZONE=your_browser_zone
BRIGHTDATA_RESIDENTIAL_PROXY_ZONE=your_proxy_zone
```

**How to obtain credentials:**
1. Log in to Bright Data control panel
2. Navigate to Account settings → API Keys
3. Create an API key with "User" or "Ops" permissions (least privilege)
4. Create zones for each product:
   - Web Unlocker zone (for Craigslist)
   - Browser zone (for eBay scraping)
   - Residential Proxy zone (optional, for geo-targeting)

#### Step 1.1.3: Initialize Bright Data Client

Create `src/services/brightDataClient.ts`:

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

interface BrightDataConfig {
  apiToken: string;
  webUnlockerZone: string;
  browserZone: string;
  residentialProxyZone?: string;
  timeout?: number;
  maxRetries?: number;
  retryBackoffFactor?: number;
}

interface BrightDataRequest {
  zone: string;
  url: string;
  format?: 'json' | 'html';
  method?: 'GET' | 'POST';
  country?: string;
  data_format?: string;
}

class BrightDataClient {
  private apiClient: AxiosInstance;
  private config: BrightDataConfig;
  private requestQueue: Map<string, Promise<any>> = new Map();

  constructor(config: BrightDataConfig) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      retryBackoffFactor: 1.5,
      ...config,
    };

    this.apiClient = axios.create({
      baseURL: 'https://api.brightdata.com',
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Add request/response interceptors for logging & debugging
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.apiClient.interceptors.response.use(
      (response) => {
        console.log(`[Bright Data] Success: ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error(`[Bright Data] Error:`, {
          status: error.response?.status,
          message: error.response?.data?.error || error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Make request with exponential backoff retry logic
   */
  async requestWithRetry<T>(
    request: BrightDataRequest,
    attempt: number = 0
  ): Promise<T> {
    try {
      const response = await this.apiClient.post<T>('/request', request);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;

      // Determine if retry-worthy (429, 503, 504)
      const isRetryable = [429, 503, 504].includes(status || 0);
      const shouldRetry = isRetryable && attempt < this.config.maxRetries!;

      if (shouldRetry) {
        // Exponential backoff: 0.3s, 0.45s, 0.675s (with 1.5 factor)
        const backoffMs = 
          300 * Math.pow(this.config.retryBackoffFactor!, attempt);
        
        console.warn(
          `[Bright Data] Retry attempt ${attempt + 1}/${this.config.maxRetries} after ${backoffMs}ms`
        );
        
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return this.requestWithRetry(request, attempt + 1);
      }

      // Final failure: log and throw
      throw {
        type: 'BrightDataError',
        status,
        message: axiosError.message,
        url: request.url,
        attempt,
      };
    }
  }

  /**
   * Web Unlocker: Scrape URL with proxy rotation & CAPTCHA solving
   */
  async scrapeWithUnlocker(
    url: string,
    options?: { country?: string; format?: 'json' | 'html' }
  ): Promise<any> {
    return this.requestWithRetry({
      zone: this.config.webUnlockerZone,
      url,
      format: options?.format || 'html',
      country: options?.country,
      data_format: 'markdown',
    });
  }

  /**
   * Browser API: Control headless browser for interactive scraping
   * Returns WebSocket endpoint for Puppeteer/Playwright connection
   */
  getBrowserEndpoint(): string {
    const username = `brd-customer-${process.env.BRIGHTDATA_CUSTOMER_ID}-zone-${this.config.browserZone}`;
    const password = process.env.BRIGHTDATA_BROWSER_PASSWORD;
    return `wss://${username}:${password}@brd.superproxy.io:9222`;
  }

  /**
   * Residential Proxy: Standard HTTP proxy with rotating IPs
   * Used for geo-targeted marketplace scanning
   */
  getResidentialProxyConfig(): {
    host: string;
    port: number;
    auth: { username: string; password: string };
  } {
    const customerId = process.env.BRIGHTDATA_CUSTOMER_ID;
    const zone = this.config.residentialProxyZone;
    const password = process.env.BRIGHTDATA_PROXY_PASSWORD;

    return {
      host: 'brd.superproxy.io',
      port: 22225,
      auth: {
        username: `brd-customer-${customerId}-zone-${zone}`,
        password: password || '',
      },
    };
  }
}

export { BrightDataClient, BrightDataConfig, BrightDataRequest };
```

### 2.2 Phase 2: Event-Driven Consumer Pattern

#### Step 2.2.1: Define Enrichment Event Schema

Create `src/types/enrichmentEvents.ts`:

```typescript
/**
 * Event emitted when price intelligence enrichment completes
 */
export interface PriceIntelligenceEnrichedEvent {
  type: 'price_intelligence_enriched';
  matchId: string;
  originalMatch: MarketplaceMatch; // Your existing match type
  competitorPrices: {
    platform: 'ebay' | 'amazon' | 'mercari' | 'specialty';
    price: number;
    listingUrl: string;
    lastScraped: number; // timestamp
    confidence: 'high' | 'medium' | 'low';
  }[];
  revisedROI: {
    scoreBefore: number;
    scoreAfter: number;
    confidenceImprovement: number; // percentage points
  };
  enrichmentTimestamp: number;
  brightDataRequestId?: string; // For debugging/auditing
}

/**
 * Event emitted when enrichment fails (graceful degradation)
 */
export interface EnrichmentFailedEvent {
  type: 'price_enrichment_failed';
  matchId: string;
  reason: string;
  willRetry: boolean;
  attemptCount: number;
  brightDataError?: {
    status: number;
    message: string;
  };
}

/**
 * Event for deduplication/circuit breaking
 */
export interface EnrichmentThrottledEvent {
  type: 'enrichment_throttled';
  matchId: string;
  reason: 'rate_limit' | 'concurrent_limit' | 'duplicate_request';
  retryAfterMs: number;
}
```

#### Step 2.2.2: Implement Enrichment Consumer Worker

Create `src/services/enrichmentWorker.ts`:

```typescript
import { EventEmitter } from 'eventemitter3';
import { BrightDataClient } from './brightDataClient';
import { MarketplaceMatch } from './types/marketplace'; // Your existing type
import {
  PriceIntelligenceEnrichedEvent,
  EnrichmentFailedEvent,
  EnrichmentThrottledEvent,
} from './types/enrichmentEvents';

interface EnrichmentWorkerConfig {
  maxConcurrentRequests?: number;
  requestTimeoutMs?: number;
  deduplicationWindowMs?: number;
  circuitBreakerThreshold?: number; // failures before circuit opens
  circuitBreakerResetMs?: number;
}

class EnrichmentWorker extends EventEmitter {
  private brightData: BrightDataClient;
  private config: EnrichmentWorkerConfig;
  private activeRequests = new Set<string>();
  private recentRequests = new Map<string, number>(); // SKU -> timestamp
  private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
  private circuitBreakerFailures = 0;
  private circuitBreakerLastFailure = 0;

  constructor(brightData: BrightDataClient, config?: EnrichmentWorkerConfig) {
    super();
    this.brightData = brightData;
    this.config = {
      maxConcurrentRequests: 5,
      requestTimeoutMs: 15000,
      deduplicationWindowMs: 60000, // Don't re-scrape same SKU for 1 min
      circuitBreakerThreshold: 10,
      circuitBreakerResetMs: 60000,
      ...config,
    };

    // Listen for match detection events from your existing broadcast relay
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // This will be wired to your existing broadcastChannel or EventEmitter
    // Example: listening to match_detected events
    globalThis.addEventListener?.('message', (event) => {
      if (event.data?.type === 'match_detected') {
        this.handleMatchDetected(event.data.match);
      }
    });
  }

  /**
   * Main entry point: handle incoming marketplace match
   */
  async handleMatchDetected(match: MarketplaceMatch): Promise<void> {
    // 1. Check circuit breaker
    if (!this.isCircuitBreakerClosed()) {
      this.emitThrottled(match.id, 'rate_limit');
      return;
    }

    // 2. Check concurrent request limit
    if (this.activeRequests.size >= this.config.maxConcurrentRequests!) {
      this.emitThrottled(match.id, 'concurrent_limit');
      return;
    }

    // 3. Deduplication: skip if same SKU recently enriched
    const lastEnrichment = this.recentRequests.get(match.sku);
    if (lastEnrichment && Date.now() - lastEnrichment < this.config.deduplicationWindowMs!) {
      this.emitThrottled(match.id, 'duplicate_request');
      return;
    }

    // 4. Proceed with enrichment
    this.activeRequests.add(match.id);
    try {
      await this.enrichMatchWithPriceIntelligence(match);
      this.recentRequests.set(match.sku, Date.now());
      this.recordSuccess();
    } catch (error) {
      this.recordFailure();
      this.emitFailed(match.id, error as Error);
    } finally {
      this.activeRequests.delete(match.id);
    }
  }

  /**
   * Core enrichment logic: fetch competitive pricing
   */
  private async enrichMatchWithPriceIntelligence(
    match: MarketplaceMatch
  ): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.requestTimeoutMs!
    );

    try {
      // Example: eBay sold listings for price comps
      const ebayPrices = await this.fetchEBayComps(match);
      
      // (Optional) Amazon price check
      const amazonPrices = await this.fetchAmazonPrices(match);

      // Calculate revised ROI with multi-source data
      const revisedROI = this.calculateRevisedROI(
        match,
        [...ebayPrices, ...amazonPrices]
      );

      // Emit enriched event back to your HUD via broadcast
      this.emitEnriched(match, [
        ...ebayPrices,
        ...amazonPrices,
      ], revisedROI);

    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Scrape eBay for sold listings (historical comps)
   */
  private async fetchEBayComps(
    match: MarketplaceMatch
  ): Promise<{ platform: 'ebay'; price: number; listingUrl: string }[]> {
    const query = `${match.title} ${match.category}`;
    const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1`;

    try {
      const html = await this.brightData.scrapeWithUnlocker(ebayUrl, {
        format: 'html',
        country: 'us', // Adjust based on your location targeting
      });

      // Parse eBay sold listings
      // This is pseudo-code; actual parsing depends on eBay's HTML structure
      const prices = this.parseEBaySoldListings(html);
      return prices.map((p) => ({
        platform: 'ebay',
        price: p,
        listingUrl: ebayUrl,
      }));
    } catch (error) {
      console.error(`[Enrichment] eBay scrape failed for "${query}":`, error);
      return []; // Graceful degradation
    }
  }

  /**
   * (Optional) Check Amazon pricing for price validation
   */
  private async fetchAmazonPrices(
    match: MarketplaceMatch
  ): Promise<{ platform: 'amazon'; price: number; listingUrl: string }[]> {
    // Similar pattern: construct search URL, scrape via Bright Data, parse results
    // Returns array of prices or empty array on failure
    return [];
  }

  /**
   * Recalculate ROI using multi-source competitive data
   */
  private calculateRevisedROI(
    match: MarketplaceMatch,
    competitorPrices: any[]
  ): { scoreBefore: number; scoreAfter: number; confidenceImprovement: number } {
    // Use your existing ROI model, but with richer price data
    // Example logic:
    // - Average competitor prices
    // - Adjust for category, condition, market volatility
    // - Recalculate flip potential

    const scoreBefore = match.roiScore || 0;
    const avgCompPrice = competitorPrices.length
      ? competitorPrices.reduce((sum, p) => sum + p.price, 0) / competitorPrices.length
      : match.estimatedResalePrice;

    // Simplified: adjust ROI if competitors are cheaper
    const scoreAfter =
      avgCompPrice > match.estimatedResalePrice
        ? scoreBefore * 1.1 // Better margin → higher ROI
        : scoreBefore * 0.95; // Worse margin → lower ROI

    return {
      scoreBefore,
      scoreAfter,
      confidenceImprovement: competitorPrices.length > 0 ? 25 : 0, // Arbitrary confidence boost
    };
  }

  /**
   * Parse eBay HTML response (simplified example)
   */
  private parseEBaySoldListings(html: string): number[] {
    // Use cheerio or similar to extract prices from HTML
    // This is pseudo-code; adapt to eBay's actual structure
    const prices: number[] = [];
    // TODO: Implement actual parsing
    return prices;
  }

  // ============ Event Emission ============

  private emitEnriched(
    match: MarketplaceMatch,
    competitorPrices: any[],
    revisedROI: any
  ): void {
    const event: PriceIntelligenceEnrichedEvent = {
      type: 'price_intelligence_enriched',
      matchId: match.id,
      originalMatch: match,
      competitorPrices,
      revisedROI,
      enrichmentTimestamp: Date.now(),
    };

    // Broadcast to HUD via cross-tab relay
    this.broadcastEnrichmentEvent(event);
    this.emit('enriched', event);
  }

  private emitFailed(matchId: string, error: Error): void {
    const event: EnrichmentFailedEvent = {
      type: 'price_enrichment_failed',
      matchId,
      reason: error.message,
      willRetry: this.circuitBreakerFailures < this.config.circuitBreakerThreshold!,
      attemptCount: this.circuitBreakerFailures,
    };

    this.broadcastEnrichmentEvent(event);
    this.emit('failed', event);
  }

  private emitThrottled(
    matchId: string,
    reason: 'rate_limit' | 'concurrent_limit' | 'duplicate_request'
  ): void {
    const event: EnrichmentThrottledEvent = {
      type: 'enrichment_throttled',
      matchId,
      reason,
      retryAfterMs: this.calculateBackoffMs(reason),
    };

    this.emit('throttled', event);
  }

  private calculateBackoffMs(reason: string): number {
    switch (reason) {
      case 'rate_limit':
        return 5000; // Retry in 5s
      case 'concurrent_limit':
        return 1000; // Quick retry
      case 'duplicate_request':
        return 0; // Don't retry, skip
      default:
        return 1000;
    }
  }

  private broadcastEnrichmentEvent(event: any): void {
    // Integrate with your existing broadcast relay
    if (typeof window !== 'undefined') {
      const broadcastChannel = new BroadcastChannel('marketplace_enrichment');
      broadcastChannel.postMessage(event);
      broadcastChannel.close();
    }
  }

  // ============ Circuit Breaker ============

  private isCircuitBreakerClosed(): boolean {
    if (this.circuitBreakerState === 'closed') return true;

    const timeSinceLastFailure = Date.now() - this.circuitBreakerLastFailure;
    if (timeSinceLastFailure > this.config.circuitBreakerResetMs!) {
      this.circuitBreakerState = 'half-open';
      this.circuitBreakerFailures = 0;
      return true;
    }

    return false;
  }

  private recordSuccess(): void {
    if (this.circuitBreakerState === 'half-open') {
      this.circuitBreakerState = 'closed';
      this.circuitBreakerFailures = 0;
    }
  }

  private recordFailure(): void {
    this.circuitBreakerFailures++;
    this.circuitBreakerLastFailure = Date.now();

    if (this.circuitBreakerFailures >= this.config.circuitBreakerThreshold!) {
      this.circuitBreakerState = 'open';
      console.warn('[Enrichment] Circuit breaker OPEN due to repeated failures');
    }
  }
}

export { EnrichmentWorker, EnrichmentWorkerConfig };
```

### 2.3 Phase 3: Background Service Worker Integration

#### Step 3.2.1: Invert Control in Your Service Worker

Create/modify `public/serviceWorker.ts`:

```typescript
import { EnrichmentWorker } from '../src/services/enrichmentWorker';
import { BrightDataClient } from '../src/services/brightDataClient';

// Initialize Bright Data & Enrichment Worker at service worker startup
let enrichmentWorker: EnrichmentWorker;

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker with Bright Data enrichment...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  self.clients.claim();

  // Initialize enrichment worker after activation
  const brightData = new BrightDataClient({
    apiToken: process.env.BRIGHTDATA_API_TOKEN!,
    webUnlockerZone: process.env.BRIGHTDATA_WEB_UNLOCKER_ZONE!,
    browserZone: process.env.BRIGHTDATA_BROWSER_ZONE!,
  });

  enrichmentWorker = new EnrichmentWorker(brightData, {
    maxConcurrentRequests: 5,
    requestTimeoutMs: 15000,
  });

  // Forward enrichment events to all connected clients
  enrichmentWorker.on('enriched', (event) => {
    broadcastToClients(event);
  });

  enrichmentWorker.on('failed', (event) => {
    broadcastToClients(event);
  });

  event.waitUntil(Promise.resolve());
});

// Listen for match_detected events from main thread
self.addEventListener('message', (event) => {
  if (event.data?.type === 'match_detected') {
    enrichmentWorker.handleMatchDetected(event.data.match);
  }

  if (event.data?.type === 'enrichment_query') {
    // On-demand enrichment (e.g., user hovers over a match in HUD)
    enrichmentWorker.handleMatchDetected(event.data.match);
  }
});

// Helper: broadcast enrichment results to all clients
function broadcastToClients(event: any): void {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'enrichment_update',
        payload: event,
      });
    });
  });
}
```

#### Step 3.2.2: Wire Main Thread to Service Worker

Create `src/workers/enrichmentBridge.ts`:

```typescript
/**
 * Bridge between main application thread and background service worker
 * Forwards match events to enrichment worker
 */

export class EnrichmentBridge {
  private serviceWorker: ServiceWorker | null = null;

  async initialize(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('[Enrichment] Service Workers not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register(
        '/serviceWorker.js'
      );
      this.serviceWorker = registration.active || registration.installing;

      // Listen for enrichment updates from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'enrichment_update') {
          this.handleEnrichmentUpdate(event.data.payload);
        }
      });

      console.log('[Enrichment] Service Worker connected');
    } catch (error) {
      console.error('[Enrichment] Service Worker registration failed:', error);
    }
  }

  /**
   * Forward match detection event to service worker for enrichment
   */
  async enqueueMatchForEnrichment(match: any): Promise<void> {
    if (!this.serviceWorker) return;

    this.serviceWorker.controller?.postMessage({
      type: 'match_detected',
      match,
    });
  }

  /**
   * Handle enrichment results from service worker
   */
  private handleEnrichmentUpdate(event: any): void {
    if (event.type === 'price_intelligence_enriched') {
      // Update HUD with enriched data
      window.dispatchEvent(
        new CustomEvent('enrichment:priceUpdated', { detail: event })
      );
    } else if (event.type === 'price_enrichment_failed') {
      // Log or gracefully handle failure
      console.warn('[Enrichment] Enrichment failed:', event);
      window.dispatchEvent(
        new CustomEvent('enrichment:failed', { detail: event })
      );
    }
  }
}

// Export singleton instance
export const enrichmentBridge = new EnrichmentBridge();
```

---

## Part 3: Integration Checkpoints

### 3.1 Phase 1 Completion Checklist

- [ ] Bright Data API credentials configured in `.env`
- [ ] `BrightDataClient` class instantiated and tested with dummy requests
- [ ] Authentication verified with test scrape (e.g., simple URL)
- [ ] Error handling & retry logic validated with mock failures
- [ ] Request logging operational for debugging

### 3.2 Phase 2 Completion Checklist

- [ ] `EnrichmentWorker` class created and unit tested
- [ ] Event schema defined for `PriceIntelligenceEnrichedEvent`, etc.
- [ ] eBay scraping logic implemented (URL construction, parsing)
- [ ] (Optional) Amazon/other marketplace scraping added
- [ ] ROI recalculation logic integrated with existing model
- [ ] Circuit breaker logic tested under simulated load
- [ ] Deduplication window prevents duplicate requests

### 3.3 Phase 3 Completion Checklist

- [ ] Service Worker modified to initialize `EnrichmentWorker`
- [ ] `EnrichmentBridge` wired into main application
- [ ] Match detection events forwarded to service worker
- [ ] Enrichment results broadcast back to HUD
- [ ] Cross-tab synchronization tested (open two tabs, trigger match, verify both update)
- [ ] UI updates with enriched ROI scores
- [ ] Fallback behavior tested (Bright Data down → HUD shows original ROI)

---

## Part 4: Error Handling & Resilience

### 4.1 Graceful Degradation Strategy

| Failure Scenario | Current Behavior | With Enrichment | Fallback |
|-----------------|-----------------|-----------------|----------|
| Bright Data API down | N/A | No enrichment events | Show original ROI, cache results |
| Rate limited (429) | N/A | Exponential backoff | Skip enrichment, don't retry |
| Scraping blocked (403) | N/A | Logged + circuit open | Retry with new proxy/IP |
| Timeout (>15s) | N/A | Abort request | Return original ROI estimate |
| Network error | N/A | Classify as retryable/non-retryable | Queue for retry if transient |

### 4.2 Error Response Handling

```typescript
/**
 * Bright Data error classification & handling
 */

enum BrightDataErrorType {
  AUTHENTICATION = 403,
  RATE_LIMITED = 429,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_ERROR = 504,
  TIMEOUT = 'TIMEOUT',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN',
}

function classifyError(error: AxiosError): {
  type: BrightDataErrorType;
  isRetryable: boolean;
  backoffMs: number;
} {
  const status = error.response?.status;

  switch (status) {
    case 403:
      return { type: BrightDataErrorType.AUTHENTICATION, isRetryable: false, backoffMs: 0 };
    case 429:
      return { type: BrightDataErrorType.RATE_LIMITED, isRetryable: true, backoffMs: 5000 };
    case 503:
    case 504:
      return { type: BrightDataErrorType.SERVICE_UNAVAILABLE, isRetryable: true, backoffMs: 10000 };
    default:
      return { type: BrightDataErrorType.UNKNOWN, isRetryable: false, backoffMs: 0 };
  }
}
```

### 4.3 Circuit Breaker Pattern

Circuit breaker state transitions:

```
CLOSED (normal) 
  ↓ (repeated failures)
OPEN (reject all enrichment requests)
  ↓ (timeout elapsed: circuitBreakerResetMs)
HALF_OPEN (allow single trial request)
  ↓ (success) → back to CLOSED
  ↓ (failure) → back to OPEN
```

---

## Part 5: Monitoring & Observability

### 5.1 Key Metrics to Track

```typescript
interface EnrichmentMetrics {
  totalMatchesProcessed: number;
  successfulEnrichments: number;
  failedEnrichments: number;
  throttledRequests: number;
  averageEnrichmentTimeMs: number;
  circuitBreakerTrips: number;
  costPerEnrichmentUsd: number;
}
```

### 5.2 Logging Best Practices

- **[Bright Data]** prefix for all Bright Data-related logs
- Include `matchId`, `SKU`, `timestamp` in every log entry
- Log request ID for correlation with Bright Data's dashboard
- Separate info/warn/error levels:
  - **INFO**: Successful scrapes, enrichment complete
  - **WARN**: Retries, circuit breaker state changes
  - **ERROR**: Permanent failures, authentication issues

### 5.3 Dead Letter Queue Pattern

If enrichment fails permanently:

```typescript
interface DeadLetterEntry {
  matchId: string;
  sku: string;
  failureReason: string;
  attemptCount: number;
  lastAttempt: number;
  scheduledRetry?: number; // Re-attempt in 24h
}

// Store in IndexedDB or persistent backend
const deadLetterQueue: DeadLetterEntry[] = [];
```

---

## Part 6: Testing Strategy

### 6.1 Unit Tests

```typescript
// Test BrightDataClient retry logic
test('retries with exponential backoff on 503', async () => {
  const client = new BrightDataClient({ /* mocked */ });
  // Mock first 2 requests → 503, 3rd → success
  // Verify backoff delays: 300ms, 450ms
});

// Test EnrichmentWorker deduplication
test('skips duplicate SKU within window', async () => {
  const worker = new EnrichmentWorker(client);
  await worker.handleMatchDetected(match1); // SKU: ABC123
  await worker.handleMatchDetected(match2); // SKU: ABC123 (same)
  // Verify second call emits 'throttled' event
});
```

### 6.2 Integration Tests

```typescript
// Test end-to-end: Match → Enrichment → HUD update
test('e2e: marketplace match enriched and HUD updated', async () => {
  const enrichmentBridge = new EnrichmentBridge();
  await enrichmentBridge.initialize();

  const match = { id: '1', sku: 'ABC123', title: 'Makita Drill' };
  
  await enrichmentBridge.enqueueMatchForEnrichment(match);

  // Wait for enrichment event
  const enrichedEvent = await waitForEvent('enrichment:priceUpdated', 5000);
  
  expect(enrichedEvent.detail.competitorPrices).toHaveLength(2); // eBay + Amazon
  expect(enrichedEvent.detail.revisedROI.scoreAfter).toBeGreaterThan(0);
});
```

### 6.3 Load Testing

```bash
# Simulate rapid match detection: 10 matches/sec, verify backpressure
loadtest -n 1000 -c 10 \
  --target-rps 100 \
  --match-payload '{"id":"...","sku":"..."}' \
  http://localhost:3000/api/enqueue-enrichment
```

---

## Part 7: Deployment & Rollout

### 7.1 Feature Flags

```typescript
const ENRICHMENT_ENABLED = process.env.ENRICHMENT_ENABLED === 'true';
const ENRICHMENT_SAMPLE_RATE = parseFloat(process.env.ENRICHMENT_SAMPLE_RATE || '1.0'); // 0-1

if (ENRICHMENT_ENABLED && Math.random() < ENRICHMENT_SAMPLE_RATE) {
  await enrichmentBridge.enqueueMatchForEnrichment(match);
}
```

### 7.2 Staged Rollout Plan

**Week 1**: Feature flag OFF  
- Deploy code, test in staging  
- Monitor service worker lifecycle in production (logs only)

**Week 2**: 10% sample rate  
- Enable enrichment for 10% of matches  
- Monitor error rates, latency, costs

**Week 3**: 50% sample rate  
- Increase to 50%  
- Gather user feedback on ROI accuracy improvements

**Week 4**: 100% enabled  
- Full rollout  
- Monitor cost vs. ROI improvement delta

### 7.3 Rollback Plan

If enrichment degrades performance:

```bash
# Disable enrichment
export ENRICHMENT_ENABLED=false
# Restart service worker
# Monitor metrics return to baseline within 5 minutes
```

---

## Part 8: Cost Optimization

### 8.1 Minimize Bright Data Usage

1. **Deduplication Window** (60s default)
   - Don't re-scrape same SKU within 1 minute
   - Reduces requests by ~70% in typical listing scenarios

2. **Smart Request Batching**
   - Batch multiple eBay searches in single request if possible
   - Use Bright Data's `batch` API feature if available

3. **Caching Layer**
   - Cache competitor prices for 24 hours
   - Store in IndexedDB (client-side) or Redis (server-side)

4. **Selective Enrichment**
   - Only enrich high-value matches (ROI > threshold)
   - Skip luxury/niche items where margins are unpredictable

### 8.2 Cost Tracking

```typescript
interface CostTracker {
  brightDataRequestsMonth: number;
  estimatedCostUsd: number; // Calculate from plan
  roiScoreImprovement: number; // Percentage points
  paybackPeriod: string; // "X days"
}
```

---

## Appendix A: Bright Data API Reference

### A.1 Available Endpoints

| Endpoint | Purpose | Auth Method | Zone Required |
|----------|---------|-------------|---------------|
| `POST /request` | Web Unlocker (proxy-based scraping) | API Token | `web_unlocker` |
| `wss://.../9222` | Browser API (Puppeteer/Playwright) | Zone credentials | `browser` |
| `http://brd.superproxy.io:22225` | Residential Proxies | Zone credentials | `residential` |
| `GET /api/v1/zones` | List zones | API Token | N/A |

### A.2 Request Example: Web Unlocker

```bash
curl -X POST https://api.brightdata.com/request \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "zone": "my_unlocker_zone",
    "url": "https://www.ebay.com/sch/i.html?_nkw=makita%20drill",
    "format": "html",
    "country": "us"
  }'
```

### A.3 Response Format

```json
{
  "status_code": 200,
  "status_message": "OK",
  "body": "<html>...</html>",
  "headers": { "content-type": "text/html" },
  "cookies": [...],
  "username": "..."
}
```

---

## Appendix B: Troubleshooting Guide

### B.1 Common Issues

| Issue | Diagnosis | Solution |
|-------|-----------|----------|
| 403 Authentication Error | Invalid API token or zone | Verify token in `.env`, check zone exists in control panel |
| 429 Rate Limited | Too many concurrent requests | Reduce `maxConcurrentRequests`, implement queue |
| 503 Service Unavailable | Bright Data scaling | Exponential backoff + circuit breaker will retry |
| Timeout (>15s) | Slow target site or network | Increase `requestTimeoutMs`, reduce payload size |
| Service Worker not activating | Old version cached | Clear site cache, restart browser |

### B.2 Debugging Tools

```typescript
// Enable verbose logging
process.env.DEBUG = 'brightdata:*';

// Inspect active requests
console.log(enrichmentWorker.getMetrics());
// { active: 3, queued: 12, failed: 2, succeeded: 156 }

// Check circuit breaker state
console.log(enrichmentWorker.getCircuitBreakerState());
// 'closed' | 'open' | 'half-open'
```

---

## Appendix C: Production Checklist

- [ ] API token stored in secure vault (not hardcoded)
- [ ] All error scenarios tested (auth, rate limit, timeout, network)
- [ ] Monitoring & alerting configured (cost, errors, latency)
- [ ] Feature flags and gradual rollout strategy implemented
- [ ] Rollback procedure documented and tested
- [ ] Service worker caching strategy optimized
- [ ] Cross-tab sync verified in multi-tab scenario
- [ ] Load testing passed (100+ concurrent matches)
- [ ] User documentation updated (new ROI scoring)
- [ ] Team training completed on troubleshooting enrichment failures
