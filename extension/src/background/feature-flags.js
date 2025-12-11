// Feature flags + staged rollout controls for enrichment.
//
// Stored in chrome.storage.local so it can be toggled without redeploying.
// Defaults are conservative (off) and can be promoted 10% -> 50% -> 100%.

export const DEFAULT_ENRICHMENT_FLAGS = Object.freeze({
  enabled: false,
  // 0..1
  sampleRate: 0.0,
  // Skip enrichment for low-value matches where ROI is unlikely to improve.
  // If null/undefined, enrichment selection is unconditional.
  minRoiScoreToEnrich: 55,
  // If true, enrichment will never block core match flow.
  // (We still keep this true always; exposed for explicitness.)
  nonBlocking: true
});

const STORAGE_KEY = 'enrichmentFlags';

export async function getEnrichmentFlags() {
  const res = await chrome.storage.local.get([STORAGE_KEY]);
  return { ...DEFAULT_ENRICHMENT_FLAGS, ...(res[STORAGE_KEY] || {}) };
}

export async function setEnrichmentFlags(partial) {
  const current = await getEnrichmentFlags();
  const next = { ...current, ...(partial || {}) };
  // Normalize
  next.enabled = !!next.enabled;
  next.sampleRate = clamp01(Number(next.sampleRate));
  if (next.minRoiScoreToEnrich === null || next.minRoiScoreToEnrich === undefined) {
    // ok
  } else {
    const n = Number(next.minRoiScoreToEnrich);
    next.minRoiScoreToEnrich = Number.isFinite(n) ? n : DEFAULT_ENRICHMENT_FLAGS.minRoiScoreToEnrich;
  }

  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export async function shouldEnrichMatch(match) {
  const flags = await getEnrichmentFlags();
  if (!flags.enabled) return { should: false, reason: 'disabled', flags };

  // Sample gate
  const r = Math.random();
  if (r >= flags.sampleRate) return { should: false, reason: 'sampled_out', flags };

  // ROI gate (best-effort; match might not have roiScore)
  const roi = typeof match?.roiScore === 'number' ? match.roiScore : null;
  if (
    roi !== null &&
    flags.minRoiScoreToEnrich !== null &&
    flags.minRoiScoreToEnrich !== undefined &&
    roi < flags.minRoiScoreToEnrich
  ) {
    return { should: false, reason: 'below_roi_threshold', flags };
  }

  return { should: true, reason: 'ok', flags };
}

function clamp01(n) {
  if (!Number.isFinite(n)) return DEFAULT_ENRICHMENT_FLAGS.sampleRate;
  return Math.max(0, Math.min(1, n));
}
