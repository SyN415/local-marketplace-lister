export type MarketplacePlatform = 'facebook' | 'craigslist' | 'offerup' | 'unknown';

export interface ScoutMatchEvent {
  /** Stable-ish id for dedupe across tabs */
  id: string;
  /** Epoch ms */
  ts: number;
  platform: MarketplacePlatform;
  title: string;
  /** Asking price (number when parsed, otherwise '???') */
  price: number | string;
  link: string;

  watchlistId?: string;
  watchlistKeywords?: string;

  /** eBay sold comps enrichment */
  avgPrice?: number;
  lowPrice?: number;
  highPrice?: number;
  compsCount?: number;
  stale?: boolean;

  /** Optional listing metadata */
  condition?: string;
  category?: string;
}

export type ProfitAnalysisMethod = 'comps' | 'fallback' | 'error';

export interface ProfitAnalysisMeta {
  inputs?: {
    asking: number | null;
    avg: number | null;
    low: number | null;
    high: number | null;
    comps: number | null;
    feeRate: number;
    handling: number;
  };
  scores?: {
    profitScore: number;
    conditionScore: number;
    trendScore: number;
    velocityScore: number;
    competitorScore: number;
  };
  multipliers?: {
    conditionMultiplier: number;
    trendAggression: number;
  };

  /** Fallback-only details */
  rationale?: string;
  base?: number;
  cond?: string;
  category?: string;

  /** Error-only */
  error?: string;
}

export interface ProfitAnalysis {
  roiScore: number;
  suggestedResale: number | null;
  expectedProfit: number | null;
  roiPct: number | null;
  flipPotential: boolean;

  demandScore: number;
  competitorScore: number;
  trendScore: number;
  velocityScore: number;

  condition: string;
  category: string;

  method: ProfitAnalysisMethod;
  meta: ProfitAnalysisMeta;
}
