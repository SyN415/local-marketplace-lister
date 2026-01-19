/**
 * eBay Price Filter Service
 * Core filtering logic for removing irrelevant listings and improving price accuracy
 */

import {
  ComponentType,
  ComponentFilterConfig,
  ExclusionResult,
  FilteredItem,
  MatchScore,
  PriceFilterOptions,
} from './types';
import { getComponentConfig, COMMON_EXCLUSION_KEYWORDS, COMBO_BUNDLE_KEYWORDS, LOT_PATTERNS } from './config';

/**
 * Stop words to ignore during tokenization
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'to', 'of', 'in', 'on', 'at',
  'by', 'from', 'new', 'used', 'like', 'condition', 'sale', 'listing', 'free',
  'shipping', 'fast', 'great', 'excellent', 'good', 'nice', 'tested', 'working',
  'obo', 'firm', 'price', 'best', 'offer', 'offers', 'accepted', 'shipped',
  'pickup', 'local', 'only', 'please', 'read', 'description', 'see', 'photos',
]);

/**
 * Tokenize text for matching, removing stop words and normalizing
 */
export function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

/**
 * Calculate Jaccard similarity between two token sets
 */
export function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (!setA.size || !setB.size) return 0;
  
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  
  const union = setA.size + setB.size - intersection;
  return union ? intersection / union : 0;
}

/**
 * Calculate Levenshtein distance between two strings (for fuzzy matching)
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,  // substitution
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j] + 1       // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate fuzzy similarity ratio (0-1) between two strings
 */
export function fuzzySimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  
  // Exact match
  if (aLower === bLower) return 1.0;
  
  // Substring containment
  if (aLower.includes(bLower) || bLower.includes(aLower)) {
    return 0.85;
  }
  
  // Levenshtein-based similarity
  const maxLen = Math.max(aLower.length, bLower.length);
  if (maxLen === 0) return 1.0;
  
  const distance = levenshteinDistance(aLower, bLower);
  return 1 - (distance / maxLen);
}

/**
 * Extract GPU model number and variant from text
 * Handles formats with and without RTX/GTX prefix:
 * - "RTX 3080 Ti" -> { model: "3080", variant: "ti" }
 * - "3080 Ti Gaming OC" -> { model: "3080", variant: "ti" }
 * - "GeForce 3080" -> { model: "3080", variant: "" }
 */
function extractGpuModelAndVariant(text: string): { model: string; variant: string } | null {
  const textLower = text.toLowerCase();

  // Pattern 1: With RTX/GTX/RX prefix (most reliable)
  const prefixMatch = textLower.match(/(?:rtx|gtx|rx)\s*(\d{3,4})\s*(ti|super|xt)?/i);
  if (prefixMatch) {
    return {
      model: prefixMatch[1],
      variant: (prefixMatch[2] || '').toLowerCase()
    };
  }

  // Pattern 2: Standalone 4-digit NVIDIA model (30xx, 40xx, 20xx, 10xx series)
  // Look for model number followed by optional variant
  // Must be 4-digit number in GPU range, not preceded by other numbers (like 12GB)
  const standaloneMatch = textLower.match(/(?:^|[^0-9])([12340][0-9]{3})\s*(ti|super)?(?:\s|$|[^0-9a-z])/i);
  if (standaloneMatch) {
    const model = standaloneMatch[1];
    // Validate it's a plausible GPU model (1xxx, 2xxx, 3xxx, 4xxx series)
    const firstDigit = parseInt(model[0]);
    if (firstDigit >= 1 && firstDigit <= 4) {
      return {
        model: model,
        variant: (standaloneMatch[2] || '').toLowerCase()
      };
    }
  }

  // Pattern 3: AMD RX series without prefix (5700, 6800, 7900 etc)
  const amdMatch = textLower.match(/(?:^|[^0-9])([567][0-9]{3})\s*(xt)?(?:\s|$|[^0-9a-z])/i);
  if (amdMatch) {
    return {
      model: amdMatch[1],
      variant: (amdMatch[2] || '').toLowerCase()
    };
  }

  return null;
}

/**
 * Check if a GPU listing should be excluded due to variant mismatch
 * e.g., exclude "2080 Ti" when searching for "2080 Super" or "2080" (non-Ti)
 */
function checkGpuVariantMismatch(title: string, query: string): string | null {
  // Extract GPU model from query
  const queryGpu = extractGpuModelAndVariant(query);
  if (!queryGpu) {
    console.log(`[GPU-Filter] No GPU model found in query: "${query}"`);
    return null;
  }

  // Extract GPU model from title
  const titleGpu = extractGpuModelAndVariant(title);
  if (!titleGpu) {
    console.log(`[GPU-Filter] No GPU model found in title: "${title.slice(0, 60)}..."`);
    return null;
  }

  console.log(`[GPU-Filter] Comparing: query=${queryGpu.model}/${queryGpu.variant || 'base'} vs title=${titleGpu.model}/${titleGpu.variant || 'base'}`);

  // Same base model number
  if (queryGpu.model !== titleGpu.model) {
    console.log(`[GPU-Filter] Different base model, skipping variant check`);
    return null;  // Different model, let relevance scoring handle it
  }

  // Check for variant mismatch on same base model
  // If query is "2080 Super" but title has "2080 Ti" -> exclude
  // If query is "2080" (no variant) but title has "2080 Ti" -> exclude (Ti is more expensive)
  // If query is "2080 Super" but title has "2080" (no variant) -> exclude (base model is cheaper)

  if (queryGpu.variant !== titleGpu.variant) {
    // Ti is typically most expensive, Super is mid, base is cheapest
    // We want exact variant matches only
    const reason = `GPU variant mismatch: query has "${queryGpu.variant || 'base'}" but title has "${titleGpu.variant || 'base'}"`;
    console.log(`[GPU-Filter] EXCLUDING: ${reason}`);
    return reason;
  }

  console.log(`[GPU-Filter] Variant match OK`);
  return null;
}

/**
 * Check if a title should be excluded based on keywords and patterns
 */
export function checkExclusions(
  title: string,
  config: ComponentFilterConfig,
  strictMode: boolean = false,
  query?: string  // Optional query for variant checking
): ExclusionResult {
  const titleLower = title.toLowerCase();
  const reasons: string[] = [];
  const softExclusions: string[] = [];

  // GPU-specific: Check for variant mismatch (e.g., 2080 Ti vs 2080 Super)
  if (config.componentType === 'GPU' && query) {
    const variantMismatch = checkGpuVariantMismatch(title, query);
    if (variantMismatch) {
      reasons.push(variantMismatch);
    }
  }

  // Check common exclusion keywords
  for (const keyword of COMMON_EXCLUSION_KEYWORDS) {
    if (titleLower.includes(keyword.toLowerCase())) {
      reasons.push(`Contains exclusion keyword: "${keyword}"`);
    }
  }

  // Check combo/bundle keywords - these are critical for CPUs/GPUs
  for (const keyword of COMBO_BUNDLE_KEYWORDS) {
    if (titleLower.includes(keyword.toLowerCase())) {
      reasons.push(`Contains combo/bundle keyword: "${keyword}"`);
    }
  }

  // Check lot patterns - critical for accurate single-item pricing
  // These catch patterns like "(lot of 5)", "x10", "5 pcs", etc.
  for (const pattern of LOT_PATTERNS) {
    if (pattern.test(title)) {
      reasons.push(`Matches lot pattern: ${pattern.source}`);
      break;  // Only need one lot pattern match
    }
  }

  // Check component-specific exclusion keywords
  for (const keyword of config.excludeKeywords) {
    if (titleLower.includes(keyword.toLowerCase())) {
      if (!reasons.some(r => r.includes(keyword))) {
        reasons.push(`Contains component-specific exclusion: "${keyword}"`);
      }
    }
  }

  // Check exclusion patterns
  for (const pattern of config.excludePatterns) {
    if (pattern.test(title)) {
      reasons.push(`Matches exclusion pattern: ${pattern.source}`);
    }
  }

  // Soft exclusions (reduce score but don't exclude completely, but log them)
  const softPatterns = [
    { pattern: /\bread\b/i, reason: 'Has "read" - may have issues' },
    { pattern: /\block\b/i, reason: 'Has "lock" - may be locked' },
    { pattern: /\bsee\s+(pics|photos|description)\b/i, reason: 'Requires inspection' },
  ];

  for (const { pattern, reason } of softPatterns) {
    if (pattern.test(title) && !reasons.length) {
      softExclusions.push(reason);
    }
  }

  return {
    excluded: reasons.length > 0,
    reasons,
    softExclusions,
  };
}

/**
 * Calculate comprehensive match score between search query and item title
 */
export function calculateMatchScore(
  title: string,
  query: string,
  options?: PriceFilterOptions
): MatchScore {
  const queryTokens = tokenize(query);
  const titleTokens = tokenize(title);
  const titleLower = title.toLowerCase();
  const queryLower = query.toLowerCase();

  const penalties: Array<{ reason: string; amount: number }> = [];
  const boosts: Array<{ reason: string; amount: number }> = [];

  // Base token similarity
  const tokenMatch = jaccardSimilarity(queryTokens, titleTokens);

  // Keyword presence check
  let keywordMatch = 0;
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  if (queryWords.length > 0) {
    // Check that the first 2-3 important terms are present
    const importantTerms = queryWords.slice(0, Math.min(3, queryWords.length));
    const matchedTerms = importantTerms.filter(term => titleLower.includes(term));
    keywordMatch = matchedTerms.length / importantTerms.length;

    if (keywordMatch < 0.5) {
      penalties.push({ reason: 'Missing key search terms', amount: 0.2 });
    }
  }

  // Brand matching
  let brandMatch = 0;
  if (options?.brand) {
    const brandLower = options.brand.toLowerCase();
    if (titleLower.includes(brandLower)) {
      brandMatch = 1.0;
      boosts.push({ reason: 'Brand match', amount: 0.1 });
    } else {
      penalties.push({ reason: 'Brand mismatch', amount: 0.15 });
    }
  }

  // Model matching (most important for accuracy)
  let modelMatch = 0;
  if (options?.model) {
    const modelLower = options.model.toLowerCase();
    if (titleLower.includes(modelLower)) {
      modelMatch = 1.0;
      boosts.push({ reason: 'Exact model match', amount: 0.25 });
    } else {
      // Try fuzzy match for model
      const similarity = fuzzySimilarity(modelLower, title);
      if (similarity > 0.8) {
        modelMatch = similarity;
        boosts.push({ reason: 'Fuzzy model match', amount: 0.15 });
      } else {
        penalties.push({ reason: 'Model mismatch', amount: 0.25 });
      }
    }
  }

  // Spec matching
  let specMatch = 0;
  if (options?.specs && Object.keys(options.specs).length > 0) {
    const specValues = Object.values(options.specs).filter(Boolean);
    if (specValues.length > 0) {
      const matchedSpecs = specValues.filter(v =>
        titleLower.includes(String(v).toLowerCase())
      );
      specMatch = matchedSpecs.length / specValues.length;
      if (specMatch > 0.5) {
        boosts.push({ reason: 'Spec match', amount: specMatch * 0.1 });
      }
    }
  }

  // Phrase containment boost
  if (queryLower.length >= 6 && titleLower.includes(queryLower)) {
    boosts.push({ reason: 'Full query in title', amount: 0.15 });
  }

  // Calculate overall score
  let overall = tokenMatch * 0.4 + keywordMatch * 0.3;

  if (options?.brand) overall += brandMatch * 0.1;
  if (options?.model) overall += modelMatch * 0.15;
  if (options?.specs) overall += specMatch * 0.05;

  // Apply boosts and penalties
  for (const { amount } of boosts) overall += amount;
  for (const { amount } of penalties) overall -= amount;

  // Clamp to 0-1
  overall = Math.max(0, Math.min(1, overall));

  return {
    overall,
    tokenMatch,
    keywordMatch,
    brandMatch,
    modelMatch,
    specMatch,
    penalties,
    boosts,
  };
}

/**
 * Filter and score eBay items based on search query and component type
 */
export function filterItems(
  items: any[],
  query: string,
  options?: PriceFilterOptions
): FilteredItem[] {
  const config = getComponentConfig(options?.componentType);
  const strictMode = options?.strictMode ?? false;
  const debug = process.env.NODE_ENV !== 'production';  // Enable debug in non-production

  const filtered: FilteredItem[] = [];
  let noPriceCount = 0;
  let priceRangeExcluded = 0;
  let exclusionKeywordCount = 0;
  let lowRelevanceCount = 0;

  for (const item of items) {
    const title = String(item?.title || '');
    const price = parseFloat(item?.price?.value || '0');

    // Skip if no price
    if (!price || price <= 0) {
      noPriceCount++;
      continue;
    }

    // Skip if outside price bounds
    const minPrice = options?.minPrice ?? config.minPrice;
    const maxPrice = options?.maxPrice ?? config.maxPrice;
    if (price < minPrice || price > maxPrice) {
      if (debug) {
        console.log(`[PriceFilter] Excluded (price ${price} outside ${minPrice}-${maxPrice}): "${title.slice(0, 60)}..."`);
      }
      priceRangeExcluded++;
      continue;
    }

    // Check exclusions (pass query for GPU variant matching)
    const exclusion = checkExclusions(title, config, strictMode, query);
    if (exclusion.excluded) {
      if (debug) {
        console.log(`[PriceFilter] Excluded (keywords): "${title.slice(0, 60)}..." - Reasons: ${exclusion.reasons.slice(0, 2).join(', ')}`);
      }
      exclusionKeywordCount++;
      continue;
    }

    // Calculate match score
    const matchScore = calculateMatchScore(title, query, options);

    // Skip if below minimum relevance
    if (matchScore.overall < config.minRelevanceScore) {
      if (debug && matchScore.overall > 0.2) {  // Only log items with some relevance
        console.log(`[PriceFilter] Low relevance (${matchScore.overall.toFixed(2)} < ${config.minRelevanceScore}): "${title.slice(0, 50)}..." @ $${price}`);
      }
      lowRelevanceCount++;
      continue;
    }

    // Create filtered item
    filtered.push({
      title,
      price,
      condition: item?.condition,
      relevanceScore: matchScore.overall,
      exclusionReasons: exclusion.softExclusions,
      url: item?.itemWebUrl,
      image: item?.image?.imageUrl,
      itemId: item?.itemId,
      shippingCost: parseFloat(item?.shippingCost?.value || '0'),
    });
  }

  console.log(`[PriceFilter] Filtering summary: noPrice=${noPriceCount}, priceRange=${priceRangeExcluded}, exclusionKeyword=${exclusionKeywordCount}, lowRelevance=${lowRelevanceCount}, passed=${filtered.length}`);

  // Log top 3 accepted items with prices
  if (filtered.length > 0) {
    const top3 = filtered.slice(0, 3).map(f => `"${f.title.slice(0, 40)}..." @ $${f.price} (rel: ${f.relevanceScore.toFixed(2)})`);
    console.log(`[PriceFilter] Top accepted items: ${top3.join(' | ')}`);
  }

  // Sort by relevance score descending
  filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Return top results
  const maxResults = options?.maxResults ?? 50;
  return filtered.slice(0, maxResults);
}
