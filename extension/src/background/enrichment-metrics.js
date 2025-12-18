// Minimal observability for enrichment in the MV3 service worker.
// Tracks success/failure rates, latency, circuit breaker trips, and request usage.

const STORAGE_KEY = 'enrichmentMetrics';

export const DEFAULT_METRICS = Object.freeze({
  totalMatchesSeen: 0,
  totalEnrichmentQueued: 0,
  successfulEnrichments: 0,
  failedEnrichments: 0,
  throttledRequests: 0,
  throttledByReason: {
    duplicate_request: 0,
    circuit_open: 0
  },
  cacheHits: 0,
  staleCacheHits: 0,
  // rolling average latency
  averageEnrichmentTimeMs: 0,
  // rolling average time spent waiting in the enrichment queue
  averageQueueDelayMs: 0,
  // usage/cost analysis
  brightDataRequests: 0,
  brightDataRetries: 0,
  brightDataErrorsByCode: {
    AUTH: 0,
    RATE_LIMIT: 0,
    UPSTREAM: 0,
    TIMEOUT: 0,
    NETWORK: 0,
    UNKNOWN: 0
  },
  // circuit breaker
  circuitBreakerTrips: 0,
  lastSuccessAt: 0,
  lastFailureAt: 0,
  lastError: null,
  lastUpdatedAt: 0
});

export async function getMetrics() {
  const res = await chrome.storage.local.get([STORAGE_KEY]);
  return { ...DEFAULT_METRICS, ...(res[STORAGE_KEY] || {}) };
}

export async function resetMetrics() {
  await chrome.storage.local.set({ [STORAGE_KEY]: { ...DEFAULT_METRICS, lastUpdatedAt: Date.now() } });
  return getMetrics();
}

export async function inc(field, n = 1) {
  const m = await getMetrics();
  const next = { ...m, [field]: (m[field] || 0) + n, lastUpdatedAt: Date.now() };
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export async function recordLatency(durationMs) {
  const m = await getMetrics();
  const d = Math.max(0, Number(durationMs) || 0);

  // EMA-ish smoothing to avoid heavy history; weight recent at 20%
  const prev = Number(m.averageEnrichmentTimeMs) || 0;
  const nextAvg = prev === 0 ? d : Math.round(prev * 0.8 + d * 0.2);

  const next = { ...m, averageEnrichmentTimeMs: nextAvg, lastUpdatedAt: Date.now() };
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export async function addBrightDataRequests(n = 1) {
  return inc('brightDataRequests', n);
}

export async function addBrightDataRetries(n = 1) {
  return inc('brightDataRetries', n);
}

export async function recordQueueDelay(durationMs) {
  const m = await getMetrics();
  const d = Math.max(0, Number(durationMs) || 0);

  // EMA-ish smoothing (same weighting as latency)
  const prev = Number(m.averageQueueDelayMs) || 0;
  const nextAvg = prev === 0 ? d : Math.round(prev * 0.8 + d * 0.2);

  const next = { ...m, averageQueueDelayMs: nextAvg, lastUpdatedAt: Date.now() };
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export async function incThrottledReason(reason, n = 1) {
  const m = await getMetrics();
  const current = m.throttledByReason || {};
  const nextReasons = { ...current, [reason]: (current[reason] || 0) + n };
  const next = { ...m, throttledByReason: nextReasons, throttledRequests: (m.throttledRequests || 0) + n, lastUpdatedAt: Date.now() };
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export async function recordBrightDataError(code, status, message) {
  const m = await getMetrics();
  const bucket = String(code || 'UNKNOWN');
  const by = m.brightDataErrorsByCode || {};
  const nextBy = { ...by, [bucket]: (by[bucket] || 0) + 1 };
  const next = {
    ...m,
    brightDataErrorsByCode: nextBy,
    failedEnrichments: (m.failedEnrichments || 0) + 1,
    lastFailureAt: Date.now(),
    lastError: {
      code: bucket,
      status: Number.isFinite(Number(status)) ? Number(status) : null,
      message: message ? String(message).slice(0, 280) : null
    },
    lastUpdatedAt: Date.now()
  };
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export async function recordEnrichmentSuccess() {
  const m = await getMetrics();
  const next = {
    ...m,
    successfulEnrichments: (m.successfulEnrichments || 0) + 1,
    lastSuccessAt: Date.now(),
    lastUpdatedAt: Date.now()
  };
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}
