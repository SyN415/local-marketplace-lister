// EnrichmentWorker (event-driven consumer) for Bright Data enrichment.
//
// Goals (per Bright-Data-Integration-Plan.md):
// - Integrate with event-driven consumer pattern (consume SCOUT_MATCH_FOUND events)
// - Exponential backoff retries via BrightDataClient for 429/503/504
// - Circuit breaker: 10 consecutive failures -> 60s pause
// - Concurrency limiting: max 5 parallel requests
// - Deduplication window: 60s (per query) to prevent redundant scrapes
// - Cost controls: selective enrichment (skip low ROI), smart batching hook

import { BrightDataClient } from './brightdata-client.js';
import { getCachedEnrichment, setCachedEnrichment, makeCacheKey } from './enrichment-cache.js';
import { addBrightDataRequests, inc, recordLatency } from './enrichment-metrics.js';
import { shouldEnrichMatch } from './feature-flags.js';

/**
 * @typedef {object} EnrichmentWorkerConfig
 * @property {number=} maxConcurrentRequests
 * @property {number=} deduplicationWindowMs
 * @property {number=} circuitBreakerThreshold
 * @property {number=} circuitBreakerResetMs
 * @property {number=} minBatchDelayMs
 */

export class EnrichmentWorker {
  /**
   * @param {BrightDataClient} brightData
   * @param {EnrichmentWorkerConfig=} config
   */
  constructor(brightData, config = {}) {
    this.brightData = brightData;
    this.config = {
      maxConcurrentRequests: 5,
      deduplicationWindowMs: 60_000,
      circuitBreakerThreshold: 10,
      circuitBreakerResetMs: 60_000,
      // batching hook: collect same-tick requests; can be expanded to Bright Data batch API later
      minBatchDelayMs: 50,
      ...config
    };

    /** @type {Set<string>} */
    this.active = new Set();

    // dedupe: key -> lastAttemptAt
    /** @type {Map<string, number>} */
    this.dedupe = new Map();

    // circuit breaker
    this.cb = {
      state: 'closed',
      failures: 0,
      openedAt: 0
    };

    // queue
    /** @type {Array<{match:any, cacheKey:string, requestedAt:number}>} */
    this.queue = [];
    this.pumpScheduled = false;

    // batching accumulator
    this.batchTimer = null;
    /** @type {Array<{match:any, cacheKey:string, requestedAt:number}>} */
    this.batchBuffer = [];
  }

  /**
   * Non-blocking entry point.
   */
  async enqueueMatch(match) {
    await inc('totalMatchesSeen', 1);

    const gate = await shouldEnrichMatch(match);
    if (!gate.should) {
      return { enqueued: false, reason: gate.reason };
    }

    // Dedupe key: for now, use query=title (normalize) + platform eBay + US.
    const query = String(match?.title || '').trim();
    if (!query) return { enqueued: false, reason: 'no_query' };

    const cacheKey = makeCacheKey({ query, platform: 'ebay', country: 'us' });

    // 24h cache fast path
    const cached = await getCachedEnrichment(cacheKey);
    if (cached?.value) {
      // Emit immediate update sourced from cache
      this.#emitEnriched(match, cached.value, { cached: true, stale: !!cached.stale });
      return { enqueued: false, reason: cached.stale ? 'stale_cache_hit' : 'cache_hit' };
    }

    // Dedup window (60s): skip if recently attempted
    const last = this.dedupe.get(cacheKey);
    if (last && Date.now() - last < this.config.deduplicationWindowMs) {
      await inc('throttledRequests', 1);
      this.#emitThrottled(match, 'duplicate_request', this.config.deduplicationWindowMs - (Date.now() - last));
      return { enqueued: false, reason: 'duplicate_request' };
    }

    // Circuit breaker
    if (!this.#isCircuitClosed()) {
      await inc('throttledRequests', 1);
      const retryAfter = Math.max(0, this.config.circuitBreakerResetMs - (Date.now() - this.cb.openedAt));
      this.#emitThrottled(match, 'circuit_open', retryAfter);
      return { enqueued: false, reason: 'circuit_open' };
    }

    // batch buffer (cost optimization hook)
    this.batchBuffer.push({ match, cacheKey, requestedAt: Date.now() });
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        const items = this.batchBuffer.splice(0, this.batchBuffer.length);
        this.batchTimer = null;
        // Currently just pushes into queue; can be replaced with real API batching
        items.forEach((i) => this.queue.push(i));
        this.#schedulePump();
      }, this.config.minBatchDelayMs);
    }

    await inc('totalEnrichmentQueued', 1);
    return { enqueued: true, reason: 'queued' };
  }

  // ========== core pipeline ==========

  #schedulePump() {
    if (this.pumpScheduled) return;
    this.pumpScheduled = true;
    queueMicrotask(() => {
      this.pumpScheduled = false;
      this.#pump().catch((e) => console.warn('[EnrichmentWorker] pump error', e));
    });
  }

  async #pump() {
    while (this.queue.length > 0 && this.active.size < this.config.maxConcurrentRequests) {
      if (!this.#isCircuitClosed()) return;

      const next = this.queue.shift();
      if (!next) return;

      const { match, cacheKey, requestedAt } = next;
      this.dedupe.set(cacheKey, Date.now());

      const id = match?.id || cacheKey;
      if (this.active.has(id)) continue;

      this.active.add(id);
      this.#processOne(match, cacheKey, requestedAt)
        .catch(() => {})
        .finally(() => {
          this.active.delete(id);
          this.#schedulePump();
        });
    }
  }

  async #processOne(match, cacheKey, requestedAt) {
    const started = Date.now();
    try {
      const enrichment = await this.#fetchCompetitorPrices(match);

      // Cache 24h
      await setCachedEnrichment(cacheKey, enrichment, 24 * 60 * 60 * 1000);

      this.#recordSuccess();
      await inc('successfulEnrichments', 1);
      await recordLatency(Date.now() - started);

      this.#emitEnriched(match, enrichment, { cached: false, stale: false });

      return enrichment;
    } catch (err) {
      this.#recordFailure();
      await inc('failedEnrichments', 1);
      await recordLatency(Date.now() - started);

      this.#emitFailed(match, err);

      // Graceful degradation: do not throw to caller.
      throw err;
    } finally {
      // clean old dedupe entries opportunistically
      this.#gcDedupe();
    }
  }

  async #fetchCompetitorPrices(match) {
    // Primary: eBay sold comps via Bright Data Web Unlocker (anti-bot resilient)
    const query = String(match?.title || '').trim();
    const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1`;

    // Bright Data usage accounting: 1 request
    const res = await this.brightData.scrapeWithWebUnlocker(ebayUrl, { format: 'html', country: 'us' });
    await addBrightDataRequests(1);

    // Bright Data API returns { body: "<html..." } per plan
    const html = res?.body || '';

    // Lightweight parsing heuristic: extract $xx.xx patterns and take some of them.
    // (We keep it conservative to avoid fragile selectors.)
    const prices = extractPricesFromHtml(html);

    // basic stats
    const sorted = prices.slice(0, 40).sort((a, b) => a - b);
    const count = sorted.length;
    const avg = count ? Math.round(sorted.reduce((s, p) => s + p, 0) / count) : null;
    const low = count ? sorted[0] : null;
    const high = count ? sorted[count - 1] : null;

    return {
      platform: 'ebay',
      query,
      listingUrl: ebayUrl,
      prices: sorted,
      count,
      avgPrice: avg,
      lowPrice: low,
      highPrice: high,
      sources: [
        {
          platform: 'ebay',
          listingUrl: ebayUrl,
          lastScraped: Date.now(),
          confidence: count >= 10 ? 'high' : count >= 3 ? 'medium' : 'low'
        }
      ]
    };
  }

  // ========== event emission ==========

  #emitEnriched(match, enrichment, meta) {
    const payload = {
      type: 'price_intelligence_enriched',
      matchId: match?.id,
      originalMatch: match,
      competitorPrices: [
        {
          platform: 'ebay',
          price: enrichment?.avgPrice,
          listingUrl: enrichment?.listingUrl,
          lastScraped: Date.now(),
          confidence: enrichment?.sources?.[0]?.confidence || 'low'
        }
      ].filter((x) => Number.isFinite(x.price)),
      // carry through existing fields for compatibility with HUD
      patch: {
        avgPrice: enrichment?.avgPrice,
        lowPrice: enrichment?.lowPrice,
        highPrice: enrichment?.highPrice,
        compsCount: enrichment?.count,
        stale: !!meta?.stale || !!meta?.cached
      },
      meta: {
        ...meta,
        avgPrice: enrichment?.avgPrice,
        count: enrichment?.count
      },
      enrichmentTimestamp: Date.now()
    };

    this.onEnriched?.(payload);
  }

  #emitFailed(match, err) {
    const payload = {
      type: 'price_enrichment_failed',
      matchId: match?.id,
      reason: String(err?.message || err),
      willRetry: this.cb.state !== 'open',
      attemptCount: this.cb.failures,
      brightDataError: {
        status: err?.status || null,
        code: err?.code || null,
        message: String(err?.message || err)
      },
      enrichmentTimestamp: Date.now()
    };

    this.onFailed?.(payload);
  }

  #emitThrottled(match, reason, retryAfterMs) {
    const payload = {
      type: 'enrichment_throttled',
      matchId: match?.id,
      reason,
      retryAfterMs: Math.max(0, Number(retryAfterMs) || 0),
      enrichmentTimestamp: Date.now()
    };

    this.onThrottled?.(payload);
  }

  // ========== circuit breaker ==========

  #isCircuitClosed() {
    if (this.cb.state === 'closed') return true;

    const elapsed = Date.now() - this.cb.openedAt;
    if (elapsed >= this.config.circuitBreakerResetMs) {
      // half-open: allow traffic again, reset failures
      this.cb.state = 'half-open';
      this.cb.failures = 0;
      return true;
    }

    return false;
  }

  #recordSuccess() {
    if (this.cb.state === 'half-open') {
      this.cb.state = 'closed';
      this.cb.failures = 0;
    } else {
      this.cb.failures = 0;
    }
  }

  #recordFailure() {
    this.cb.failures += 1;
    if (this.cb.failures >= this.config.circuitBreakerThreshold) {
      if (this.cb.state !== 'open') {
        this.cb.state = 'open';
        this.cb.openedAt = Date.now();
        inc('circuitBreakerTrips', 1).catch(() => {});
        console.warn('[EnrichmentWorker] circuit breaker OPEN', {
          failures: this.cb.failures,
          resetMs: this.config.circuitBreakerResetMs
        });
      }
    }

    if (this.cb.state === 'half-open') {
      // immediately re-open
      this.cb.state = 'open';
      this.cb.openedAt = Date.now();
    }
  }

  #gcDedupe() {
    const now = Date.now();
    const windowMs = this.config.deduplicationWindowMs;
    // keep map bounded
    if (this.dedupe.size <= 500) return;
    for (const [k, ts] of this.dedupe.entries()) {
      if (now - ts > windowMs) this.dedupe.delete(k);
    }
  }
}

function extractPricesFromHtml(html) {
  if (!html || typeof html !== 'string') return [];

  // Matches $1,234.56 or $123
  const re = /\$\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const n = parseFloat(String(m[1]).replace(/,/g, ''));
    if (!Number.isFinite(n)) continue;
    // basic sanity filter
    if (n <= 1 || n >= 100000) continue;
    out.push(n);
    if (out.length >= 80) break; // cap
  }

  // de-noise: remove extreme outliers using IQR-ish trimming when enough samples
  if (out.length >= 10) {
    const s = out.slice().sort((a, b) => a - b);
    const q1 = s[Math.floor(s.length * 0.25)];
    const q3 = s[Math.floor(s.length * 0.75)];
    const iqr = q3 - q1;
    const lo = q1 - iqr * 1.5;
    const hi = q3 + iqr * 1.5;
    return s.filter((x) => x >= lo && x <= hi);
  }

  return out;
}
