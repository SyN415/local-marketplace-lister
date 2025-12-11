// Minimal observability for enrichment in the MV3 service worker.
// Tracks success/failure rates, latency, circuit breaker trips, and request usage.

const STORAGE_KEY = 'enrichmentMetrics';

export const DEFAULT_METRICS = Object.freeze({
  totalMatchesSeen: 0,
  totalEnrichmentQueued: 0,
  successfulEnrichments: 0,
  failedEnrichments: 0,
  throttledRequests: 0,
  // rolling average latency
  averageEnrichmentTimeMs: 0,
  // usage/cost analysis
  brightDataRequests: 0,
  // circuit breaker
  circuitBreakerTrips: 0,
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
