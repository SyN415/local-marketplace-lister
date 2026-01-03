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
import { getComponentConfig, COMMON_EXCLUSION_KEYWORDS, COMBO_BUNDLE_KEYWORDS } from './config';

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
 * Check if a title should be excluded based on keywords and patterns
 */
export function checkExclusions(
  title: string,
  config: ComponentFilterConfig,
  strictMode: boolean = false
): ExclusionResult {
  const titleLower = title.toLowerCase();
  const reasons: string[] = [];
  const softExclusions: string[] = [];

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

    // Check exclusions
    const exclusion = checkExclusions(title, config, strictMode);
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
