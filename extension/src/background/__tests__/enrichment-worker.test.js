// Unit tests for EnrichmentWorker behavior using Node's built-in test runner.
// Run: node --test extension/src/background/__tests__/*.test.js

import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal polyfills must be defined BEFORE importing the modules under test.
if (!globalThis.queueMicrotask) globalThis.queueMicrotask = (fn) => Promise.resolve().then(fn);

const store = new Map();
globalThis.chrome = {
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

function flush(ms = 0) {
  return new Promise((r) => setTimeout(r, ms));
}

async function resetTestStorage() {
  store.clear();
  await chrome.storage.local.set({
    enrichmentFlags: { enabled: true, sampleRate: 1.0, minRoiScoreToEnrich: null }
  });
}

test('EnrichmentWorker: dedupes requests within window (no extra Bright Data calls)', async () => {
  await resetTestStorage();
    class FakeBD {
      calls = 0;
      async scrapeWithWebUnlocker() {
        this.calls += 1;
        return { body: '<span>$100</span><span>$110</span><span>$90</span>' };
      }
    }

    const { EnrichmentWorker } = await import('../enrichment-worker.js');
    const bd = new FakeBD();
    const worker = new EnrichmentWorker(bd, { maxConcurrentRequests: 1, deduplicationWindowMs: 60_000, minBatchDelayMs: 0 });

    const match = { id: 'm1', title: 'Makita Drill', link: 'http://example.com', platform: 'facebook', price: 50, roiScore: 80 };

    await worker.enqueueMatch(match);
    await flush(10);

    await worker.enqueueMatch(match);
    await flush(10);

    assert.equal(bd.calls, 1);
});

test('EnrichmentWorker: opens circuit after threshold failures and throttles subsequent enqueues', async () => {
  await resetTestStorage();
    class AlwaysFailBD {
      calls = 0;
      async scrapeWithWebUnlocker() {
        this.calls += 1;
        const err = new Error('HTTP 503');
        err.status = 503;
        err.code = 'UPSTREAM';
        throw err;
      }
    }

    const { EnrichmentWorker } = await import('../enrichment-worker.js');
    const bd = new AlwaysFailBD();
    const worker = new EnrichmentWorker(bd, {
      maxConcurrentRequests: 1,
      minBatchDelayMs: 0,
      deduplicationWindowMs: 0,
      circuitBreakerThreshold: 2,
      circuitBreakerResetMs: 60_000
    });

    const match = { id: 'm1', title: 'Makita Drill', link: 'http://example.com', platform: 'facebook', price: 50, roiScore: 80 };

    // First failure
    await worker.enqueueMatch(match);
    await flush(10);
    // Second failure triggers circuit open
    await worker.enqueueMatch({ ...match, id: 'm2' });
    await flush(10);

    const res = await worker.enqueueMatch({ ...match, id: 'm3' });
    assert.equal(res.enqueued, false);
    assert.equal(res.reason, 'circuit_open');
});
