/**
 * eBay Price Intelligence Types
 * Comprehensive type definitions for the enhanced price filtering system
 */

// Component types for PC parts
export type ComponentType = 
  | 'GPU' 
  | 'CPU' 
  | 'RAM' 
  | 'STORAGE' 
  | 'PSU' 
  | 'MOTHERBOARD' 
  | 'CASE' 
  | 'COOLING'
  | 'MONITOR'
  | 'PERIPHERAL'
  | 'GENERIC';

// eBay item condition codes
export type EbayCondition = 
  | 'NEW' 
  | 'OPEN_BOX' 
  | 'CERTIFIED_REFURBISHED' 
  | 'EXCELLENT_REFURBISHED'
  | 'VERY_GOOD_REFURBISHED'
  | 'GOOD_REFURBISHED'
  | 'SELLER_REFURBISHED'
  | 'USED_EXCELLENT'
  | 'USED_VERY_GOOD'
  | 'USED_GOOD'
  | 'USED_ACCEPTABLE'
  | 'FOR_PARTS';

// Confidence levels for price estimates
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';

// Price statistics result
export interface PriceStatistics {
  mean: number;
  median: number;
  trimmedMean: number;  // Mean after removing top/bottom percentile
  standardDeviation: number;
  variance: number;
  q1: number;  // 25th percentile
  q3: number;  // 75th percentile
  iqr: number; // Interquartile range
  min: number;
  max: number;
  count: number;
  outlierCount: number;  // Number of items removed as outliers
}

// Individual item after filtering
export interface FilteredItem {
  title: string;
  price: number;
  condition?: string;
  relevanceScore: number;  // 0-1 how well it matches the search
  exclusionReasons: string[];  // Any soft-match exclusions noted
  url?: string;
  image?: string;
  soldDate?: Date;
  shippingCost?: number;
  itemId?: string;
}

// Filter configuration for a specific component type
export interface ComponentFilterConfig {
  componentType: ComponentType;
  minPrice: number;
  maxPrice: number;
  ebayCategories: string[];  // eBay category IDs
  requiredKeywords: string[];  // At least one must be present
  excludePatterns: RegExp[];  // Patterns to exclude
  excludeKeywords: string[];  // Simple keyword exclusions
  minRelevanceScore: number;  // Minimum fuzzy match score (0-1)
  allowedConditions: EbayCondition[];
  typicalPriceRanges?: {  // Tier-based typical prices for validation
    budget: { min: number; max: number };
    midRange: { min: number; max: number };
    highEnd: { min: number; max: number };
  };
}

// Filter options passed to the search
export interface PriceFilterOptions {
  componentType?: ComponentType;
  condition?: 'new' | 'used' | 'any';
  brand?: string;
  model?: string;
  minPrice?: number;
  maxPrice?: number;
  specs?: Record<string, string>;
  categoryId?: string;
  currentPrice?: number;  // Reference price for sanity checks
  maxResults?: number;
  strictMode?: boolean;  // If true, use tighter filtering
}

// Complete price intelligence result
export interface PriceIntelligenceResult {
  found: boolean;
  error?: string;
  message?: string;
  
  // Price data (only present if found)
  avgPrice?: number;
  medianPrice?: number;
  lowPrice?: number;
  highPrice?: number;
  
  // Statistics
  statistics?: PriceStatistics;
  
  // Confidence
  confidence?: ConfidenceLevel;
  confidenceScore?: number;  // 0-1 numeric confidence
  confidenceReasons?: string[];  // Why confidence is at this level
  
  // Results
  count?: number;
  totalSearched?: number;  // Before filtering
  filteredOut?: number;  // Number excluded
  
  // Sample items
  samples?: FilteredItem[];
  
  // Metadata
  cached?: boolean;
  stale?: boolean;
  searchQuery?: string;
  filterConfig?: Partial<ComponentFilterConfig>;
}

// Exclusion result for tracking why items were excluded
export interface ExclusionResult {
  excluded: boolean;
  reasons: string[];
  softExclusions: string[];  // Things that reduce score but don't exclude
}

// Match scoring result
export interface MatchScore {
  overall: number;  // 0-1 combined score
  tokenMatch: number;  // Jaccard similarity
  keywordMatch: number;  // Required keyword presence
  brandMatch: number;  // Brand match score
  modelMatch: number;  // Model match score
  specMatch: number;  // Spec matching score
  penalties: Array<{ reason: string; amount: number }>;
  boosts: Array<{ reason: string; amount: number }>;
}

