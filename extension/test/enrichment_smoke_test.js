// Smoke test (Node) for enrichment worker primitives.
// Note: This does NOT run in an actual MV3 environment; it validates logic contracts.
// Run: node extension/test/enrichment_smoke_test.js

class FakeBrightDataClient {
  constructor() {
    this.calls = 0;
  }
  async scrapeWithWebUnlocker() {
    this.calls += 1;
    return { body: '<span>$100</span><span>$110</span><span>$90</span><span>$105</span>' };
  }
}

// Minimal polyfills for Node
if (!globalThis.queueMicrotask) globalThis.queueMicrotask = (fn) => Promise.resolve().then(fn);

// Minimal chrome.storage polyfill (must be defined BEFORE importing worker modules)
const store = new Map();
const chrome = {
  storage: {
    local: {
      async get(keys) {
        if (keys === null) {
          const all = {};
          for (const [k, v] of store.entries()) all[k] = v;
          return all;
        }
        const out = {};
        for (const k of keys) out[k] = store.get(k);
        return out;
      },
      async set(obj) {
        Object.entries(obj).forEach(([k, v]) => store.set(k, v));
      },
      async remove(keys) {
        keys.forEach((k) => store.delete(k));
      }
    }
  }
};
// eslint-disable-next-line no-undef
globalThis.chrome = chrome;

// feature flags storage: enable 100% sampling
await chrome.storage.local.set({
  enrichmentFlags: { enabled: true, sampleRate: 1.0, minRoiScoreToEnrich: null }
});

// Dynamic import after globals exist
const { EnrichmentWorker } = await import('../src/background/enrichment-worker.js');

const bd = new FakeBrightDataClient();
const worker = new EnrichmentWorker(bd, { maxConcurrentRequests: 2, deduplicationWindowMs: 60_000 });

let enriched = 0;
worker.onEnriched = () => {
  enriched += 1;
};

const match = { id: 'm1', title: 'Makita Drill', link: 'http://example.com', platform: 'facebook', price: 50, roiScore: 80 };

await worker.enqueueMatch(match);
// allow pump to run
await new Promise((r) => setTimeout(r, 50));

// second enqueue should be deduped (within window) OR served from cache
await worker.enqueueMatch(match);
await new Promise((r) => setTimeout(r, 50));

console.log('FakeBrightDataClient calls:', bd.calls);
console.log('Enriched events:', enriched);

if (bd.calls < 1) process.exit(1);
if (enriched < 1) process.exit(1);

console.log('✓ enrichment smoke test passed');
