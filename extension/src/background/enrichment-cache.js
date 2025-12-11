// 24h caching for enrichment results (competitor prices)
// Stored in chrome.storage.local to survive service worker restarts.

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const PREFIX = 'enrichment_cache::';

export function makeCacheKey({ query, platform = 'ebay', country = 'us' }) {
  const q = String(query || '').trim().toLowerCase();
  return `${PREFIX}${platform}::${country}::${q}`;
}

export async function getCachedEnrichment(key) {
  if (!key) return null;
  const res = await chrome.storage.local.get([key]);
  const entry = res[key];
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt > Date.now()) return entry;
  // expired -> return but mark stale for fallback UI/logic
  return { ...entry, stale: true };
}

export async function setCachedEnrichment(key, value, ttlMs = DEFAULT_TTL_MS) {
  if (!key) return;
  const entry = {
    value,
    createdAt: Date.now(),
    expiresAt: Date.now() + (ttlMs || DEFAULT_TTL_MS)
  };
  await chrome.storage.local.set({ [key]: entry });
}

export async function clearCachedEnrichmentByPrefix() {
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter((k) => k.startsWith(PREFIX));
  if (keys.length) await chrome.storage.local.remove(keys);
  return keys.length;
}
