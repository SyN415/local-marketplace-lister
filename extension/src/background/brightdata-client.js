// Bright Data client for MV3 extension service worker.
// Uses fetch() (no Node deps) with Bearer token auth.
//
// Implements:
// - requestWithRetry(): exponential backoff on retryable statuses
// - scrapeWithWebUnlocker(): POST https://api.brightdata.com/request
// - getScrapingBrowserWsEndpoint(): returns WebSocket endpoint for Playwright/Puppeteer
// - getResidentialProxyConfig(): returns proxy host/port/username/password

const API_BASE = 'https://api.brightdata.com';

export class BrightDataClient {
  /**
   * @param {object} config
   * @param {string} config.apiToken
   * @param {string} config.webUnlockerZone
   * @param {string} config.browserZone
   * @param {string=} config.residentialProxyZone
   * @param {number=} config.timeoutMs
   * @param {number=} config.maxRetries
   * @param {number=} config.retryBackoffFactor
   * @param {number=} config.retryBaseDelayMs
   */
  constructor(config) {
    if (!config || !config.apiToken) throw new Error('BrightDataClient: apiToken is required');
    this.config = {
      timeoutMs: 30000,
      maxRetries: 3,
      retryBackoffFactor: 1.6,
      retryBaseDelayMs: 300,
      ...config
    };

    /** @type {{count:number, lastResetMs:number}} */
    this.usage = { count: 0, lastResetMs: Date.now() };
  }

  getUsageSnapshot() {
    return { ...this.usage };
  }

  /**
   * @param {object} request
   * @param {string} request.zone
   * @param {string} request.url
   * @param {'json'|'html'=} request.format
   * @param {'GET'|'POST'=} request.method
   * @param {string=} request.country
   * @param {string=} request.data_format
   * @param {any=} request.headers
   * @param {any=} request.payload
   */
  async requestWithRetry(request, attempt = 0) {
    const startedAt = Date.now();
    try {
      const res = await this.#fetchJson(`${API_BASE}/request`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      this.usage.count += 1;
      return res;
    } catch (err) {
      const classified = classifyBrightDataError(err);
      const shouldRetry =
        classified.isRetryable &&
        attempt < this.config.maxRetries;

      if (shouldRetry) {
        const delayMs = this.#calculateBackoffMs(attempt, classified.retryAfterMs);
        console.warn('[Bright Data] retry', {
          attempt: attempt + 1,
          max: this.config.maxRetries,
          delayMs,
          status: classified.status,
          code: classified.code,
          elapsedMs: Date.now() - startedAt
        });
        await sleep(delayMs);
        return this.requestWithRetry(request, attempt + 1);
      }

      throw Object.assign(new Error(classified.message), {
        name: 'BrightDataError',
        status: classified.status,
        code: classified.code,
        retryable: classified.isRetryable,
        attempt
      });
    }
  }

  async scrapeWithWebUnlocker(url, options = {}) {
    if (!url) throw new Error('scrapeWithWebUnlocker: url required');
    return this.requestWithRetry({
      zone: this.config.webUnlockerZone,
      url,
      format: options.format || 'html',
      country: options.country,
      data_format: options.data_format
    });
  }

  /**
   * Bright Data Scraping Browser endpoint (Playwright/Puppeteer).
   * Requires BRIGHTDATA_CUSTOMER_ID + BRIGHTDATA_BROWSER_PASSWORD.
   */
  getScrapingBrowserWsEndpoint() {
    const customerId = this.config.customerId || self?.BRIGHTDATA_CUSTOMER_ID;
    // In MV3, env vars don't exist. We store secrets in chrome.storage.local.
    // This method returns a template if not enough info.
    const username = customerId
      ? `brd-customer-${customerId}-zone-${this.config.browserZone}`
      : `brd-customer-<customer_id>-zone-${this.config.browserZone}`;

    const password = this.config.browserPassword || '<browser_password>';
    return `wss://${username}:${password}@brd.superproxy.io:9222`;
  }

  /**
   * Residential proxy config.
   * Requires BRIGHTDATA_CUSTOMER_ID + BRIGHTDATA_PROXY_PASSWORD.
   */
  getResidentialProxyConfig() {
    const customerId = this.config.customerId || '<customer_id>';
    const zone = this.config.residentialProxyZone || '<residential_zone>';
    const password = this.config.proxyPassword || '<proxy_password>';

    return {
      host: 'brd.superproxy.io',
      port: 22225,
      auth: {
        username: `brd-customer-${customerId}-zone-${zone}`,
        password
      }
    };
  }

  #calculateBackoffMs(attempt, retryAfterMs) {
    if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) return retryAfterMs;
    const base = this.config.retryBaseDelayMs;
    const factor = this.config.retryBackoffFactor;
    // attempt=0 -> base, 1 -> base*factor, ...
    return Math.round(base * Math.pow(factor, attempt));
  }

  async #fetchJson(url, init) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      const text = await res.text();
      let json;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.status = res.status;
        err.body = json || text;
        err.headers = Object.fromEntries(res.headers.entries());
        throw err;
      }

      return json;
    } catch (e) {
      if (e?.name === 'AbortError') {
        const err = new Error('TIMEOUT');
        err.code = 'TIMEOUT';
        throw err;
      }
      throw e;
    } finally {
      clearTimeout(t);
    }
  }
}

export function classifyBrightDataError(err) {
  const status = err?.status || err?.response?.status || null;
  const headers = err?.headers || null;
  const retryAfterHeader = headers?.['retry-after'];
  const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : null;

  const msgBody = err?.body?.error || err?.body?.message || err?.message || 'Unknown error';

  // Retryable statuses per plan
  const retryableStatuses = new Set([429, 503, 504]);
  const isRetryable = status ? retryableStatuses.has(status) : err?.code === 'TIMEOUT' || err?.name === 'TypeError';

  let code = 'UNKNOWN';
  if (status === 401 || status === 403) code = 'AUTH';
  else if (status === 429) code = 'RATE_LIMIT';
  else if (status === 503 || status === 504) code = 'UPSTREAM';
  else if (err?.code === 'TIMEOUT') code = 'TIMEOUT';
  else if (err?.name === 'TypeError') code = 'NETWORK';

  return {
    status,
    code,
    isRetryable,
    retryAfterMs,
    message: `[Bright Data] ${code}${status ? ` (${status})` : ''}: ${msgBody}`
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
