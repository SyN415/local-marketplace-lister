/**
 * eBay Price Filter Module
 * Enhanced price filtering and statistical analysis for accurate pricing
 */

// Export types
export * from './types';

// Export configuration
export { 
  getComponentConfig, 
  mapComponentType,
  COMMON_EXCLUSION_KEYWORDS,
  COMPONENT_CONFIGS,
  GPU_CONFIG,
  CPU_CONFIG,
  RAM_CONFIG,
  STORAGE_CONFIG,
  PSU_CONFIG,
  MOTHERBOARD_CONFIG,
  GENERIC_CONFIG,
} from './config';

// Export filter functions
export {
  tokenize,
  jaccardSimilarity,
  levenshteinDistance,
  fuzzySimilarity,
  checkExclusions,
  calculateMatchScore,
  filterItems,
} from './filter.service';

// Export statistics functions
export {
  calculatePriceStatistics,
  removeOutliersIQR,
  removeOutliersMAD,
  calculateConfidence,
  calculateRobustPrice,
} from './statistics.service';

// Main enhanced price intelligence function
import { FilteredItem, PriceFilterOptions, PriceIntelligenceResult } from './types';
import { getComponentConfig } from './config';
import { filterItems } from './filter.service';
import { calculateRobustPrice, calculateConfidence } from './statistics.service';

/**
 * Process eBay search results with enhanced filtering and statistical analysis
 */
export function processEbayResults(
  items: any[],
  query: string,
  options?: PriceFilterOptions
): PriceIntelligenceResult {
  const config = getComponentConfig(options?.componentType);
  const totalSearched = items.length;
  
  // Apply filtering
  const filteredItems = filterItems(items, query, options);
  const filteredOut = totalSearched - filteredItems.length;
  
  if (filteredItems.length === 0) {
    return {
      found: false,
      message: `No matching items found after filtering (${filteredOut} excluded)`,
      count: 0,
      totalSearched,
      filteredOut,
      filterConfig: {
        componentType: config.componentType,
        minPrice: options?.minPrice ?? config.minPrice,
        maxPrice: options?.maxPrice ?? config.maxPrice,
        minRelevanceScore: config.minRelevanceScore,
      },
    };
  }
  
  // Calculate robust price
  const priceResult = calculateRobustPrice(filteredItems);
  
  if (!priceResult.statistics) {
    return {
      found: false,
      message: 'Could not calculate price statistics',
      count: 0,
      totalSearched,
      filteredOut,
    };
  }
  
  // Calculate confidence
  const confidence = calculateConfidence(filteredItems, priceResult.statistics);
  
  // Build samples for response
  const samples: FilteredItem[] = filteredItems.slice(0, 5).map(item => ({
    title: item.title,
    price: item.price,
    condition: item.condition,
    relevanceScore: Math.round(item.relevanceScore * 100) / 100,
    exclusionReasons: item.exclusionReasons,
    url: item.url,
    image: item.image,
  }));
  
  return {
    found: true,
    avgPrice: priceResult.bestEstimate,
    medianPrice: priceResult.statistics.median,
    lowPrice: priceResult.statistics.min,
    highPrice: priceResult.statistics.max,
    statistics: priceResult.statistics,
    confidence: confidence.level,
    confidenceScore: confidence.score,
    confidenceReasons: confidence.reasons,
    count: filteredItems.length,
    totalSearched,
    filteredOut,
    samples,
    searchQuery: query,
    filterConfig: {
      componentType: config.componentType,
      minPrice: options?.minPrice ?? config.minPrice,
      maxPrice: options?.maxPrice ?? config.maxPrice,
      minRelevanceScore: config.minRelevanceScore,
    },
  };
}

