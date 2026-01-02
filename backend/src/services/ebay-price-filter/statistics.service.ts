/**
 * Price Statistics Service
 * Robust statistical calculations for price analysis
 */

import {
  PriceStatistics,
  ConfidenceLevel,
  FilteredItem,
} from './types';

/**
 * Calculate comprehensive price statistics from a list of prices
 */
export function calculatePriceStatistics(prices: number[]): PriceStatistics | null {
  // Filter valid prices
  const validPrices = prices.filter(p => Number.isFinite(p) && p > 0);
  
  if (validPrices.length === 0) {
    return null;
  }
  
  // Sort for percentile calculations
  const sorted = [...validPrices].sort((a, b) => a - b);
  const n = sorted.length;
  
  // Basic statistics
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  
  // Median
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  
  // Quartiles (using linear interpolation method)
  const q1Index = (n - 1) * 0.25;
  const q3Index = (n - 1) * 0.75;
  
  const q1 = interpolatePercentile(sorted, q1Index);
  const q3 = interpolatePercentile(sorted, q3Index);
  const iqr = q3 - q1;
  
  // Variance and standard deviation
  const squaredDiffs = sorted.map(p => Math.pow(p - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / n;
  const standardDeviation = Math.sqrt(variance);
  
  // Trimmed mean (remove top and bottom 10%)
  const trimAmount = Math.max(1, Math.floor(n * 0.1));
  const trimmedPrices = sorted.slice(trimAmount, n - trimAmount);
  const trimmedMean = trimmedPrices.length > 0
    ? trimmedPrices.reduce((a, b) => a + b, 0) / trimmedPrices.length
    : mean;
  
  // Count outliers (using IQR method)
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const outlierCount = sorted.filter(p => p < lowerBound || p > upperBound).length;
  
  return {
    mean: roundTo(mean, 2),
    median: roundTo(median, 2),
    trimmedMean: roundTo(trimmedMean, 2),
    standardDeviation: roundTo(standardDeviation, 2),
    variance: roundTo(variance, 2),
    q1: roundTo(q1, 2),
    q3: roundTo(q3, 2),
    iqr: roundTo(iqr, 2),
    min: sorted[0],
    max: sorted[n - 1],
    count: n,
    outlierCount,
  };
}

/**
 * Interpolate percentile value
 */
function interpolatePercentile(sorted: number[], index: number): number {
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) {
    return sorted[lower];
  }
  
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Round to specified decimal places
 */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Remove statistical outliers from prices using IQR method
 */
export function removeOutliersIQR(prices: number[], multiplier: number = 1.5): number[] {
  const validPrices = prices.filter(p => Number.isFinite(p) && p > 0);
  
  if (validPrices.length < 4) {
    // Not enough data for meaningful IQR analysis
    return validPrices;
  }
  
  const sorted = [...validPrices].sort((a, b) => a - b);
  const n = sorted.length;
  
  const q1Index = (n - 1) * 0.25;
  const q3Index = (n - 1) * 0.75;
  
  const q1 = interpolatePercentile(sorted, q1Index);
  const q3 = interpolatePercentile(sorted, q3Index);
  const iqr = q3 - q1;
  
  // Handle edge case where IQR is 0 (all prices very similar)
  if (iqr === 0) {
    // Use MAD (Median Absolute Deviation) instead
    return removeOutliersMAD(validPrices);
  }
  
  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + multiplier * iqr;
  
  return sorted.filter(p => p >= lowerBound && p <= upperBound);
}

/**
 * Remove outliers using MAD (Median Absolute Deviation)
 * More robust than IQR for small samples
 */
export function removeOutliersMAD(prices: number[], threshold: number = 3.5): number[] {
  const validPrices = prices.filter(p => Number.isFinite(p) && p > 0);
  
  if (validPrices.length < 3) {
    return validPrices;
  }
  
  const sorted = [...validPrices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  // Calculate MAD
  const deviations = sorted.map(p => Math.abs(p - median)).sort((a, b) => a - b);
  const mad = deviations[Math.floor(deviations.length / 2)];
  
  if (mad === 0) {
    // All values are the same or very close
    return validPrices;
  }
  
  // Modified Z-score using MAD
  // z = 0.6745 * (x - median) / MAD
  const k = 0.6745;
  
  return validPrices.filter(p => {
    const modifiedZ = Math.abs(k * (p - median) / mad);
    return modifiedZ <= threshold;
  });
}

/**
 * Calculate confidence level based on sample size, variance, and data quality
 */
export function calculateConfidence(
  items: FilteredItem[],
  statistics: PriceStatistics | null
): { level: ConfidenceLevel; score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Sample size scoring
  const count = items.length;
  if (count >= 15) {
    score += 0.35;
    reasons.push(`Strong sample size (${count} items)`);
  } else if (count >= 8) {
    score += 0.25;
    reasons.push(`Good sample size (${count} items)`);
  } else if (count >= 4) {
    score += 0.15;
    reasons.push(`Limited sample size (${count} items)`);
  } else if (count >= 1) {
    score += 0.05;
    reasons.push(`Very small sample size (${count} items)`);
  }

  // Relevance score quality
  const avgRelevance = items.reduce((sum, i) => sum + i.relevanceScore, 0) / (count || 1);
  if (avgRelevance >= 0.7) {
    score += 0.25;
    reasons.push('High average relevance scores');
  } else if (avgRelevance >= 0.5) {
    score += 0.15;
    reasons.push('Moderate relevance scores');
  } else if (avgRelevance >= 0.35) {
    score += 0.08;
    reasons.push('Lower relevance scores');
  } else {
    reasons.push('Low relevance matches');
  }

  // Price consistency (coefficient of variation)
  if (statistics) {
    const cv = statistics.standardDeviation / (statistics.mean || 1);
    if (cv <= 0.2) {
      score += 0.25;
      reasons.push('Very consistent pricing');
    } else if (cv <= 0.35) {
      score += 0.18;
      reasons.push('Fairly consistent pricing');
    } else if (cv <= 0.5) {
      score += 0.10;
      reasons.push('Moderate price variation');
    } else {
      reasons.push('High price variation');
    }

    // Outlier ratio
    const outlierRatio = statistics.outlierCount / (statistics.count || 1);
    if (outlierRatio > 0.25) {
      score -= 0.1;
      reasons.push(`High outlier ratio (${Math.round(outlierRatio * 100)}%)`);
    } else if (outlierRatio < 0.1) {
      score += 0.1;
      reasons.push('Low outlier count');
    }
  }

  // Top item quality check
  const topItems = items.slice(0, 5);
  const topWithHighRelevance = topItems.filter(i => i.relevanceScore >= 0.6).length;
  if (topWithHighRelevance >= 4) {
    score += 0.1;
    reasons.push('Top results are highly relevant');
  }

  // Clamp score
  score = Math.max(0, Math.min(1, score));

  // Determine level
  let level: ConfidenceLevel;
  if (count < 3) {
    level = 'INSUFFICIENT';
  } else if (score >= 0.7) {
    level = 'HIGH';
  } else if (score >= 0.45) {
    level = 'MEDIUM';
  } else {
    level = 'LOW';
  }

  return { level, score: roundTo(score, 2), reasons };
}

/**
 * Calculate the best price estimate from filtered items
 * Uses robust statistics to avoid outlier influence
 */
export function calculateRobustPrice(items: FilteredItem[]): {
  bestEstimate: number;
  method: string;
  statistics: PriceStatistics | null;
} {
  const prices = items.map(i => i.price).filter(p => p > 0);

  if (prices.length === 0) {
    return { bestEstimate: 0, method: 'none', statistics: null };
  }

  if (prices.length === 1) {
    return {
      bestEstimate: prices[0],
      method: 'single_value',
      statistics: calculatePriceStatistics(prices),
    };
  }

  if (prices.length === 2) {
    return {
      bestEstimate: (prices[0] + prices[1]) / 2,
      method: 'simple_average',
      statistics: calculatePriceStatistics(prices),
    };
  }

  // Remove outliers using IQR method
  const cleanedPrices = removeOutliersIQR(prices);

  // If IQR removed too many, try MAD method
  const finalPrices = cleanedPrices.length >= Math.max(3, prices.length * 0.5)
    ? cleanedPrices
    : removeOutliersMAD(prices);

  const statistics = calculatePriceStatistics(finalPrices);

  if (!statistics) {
    return { bestEstimate: 0, method: 'none', statistics: null };
  }

  // For price estimation, we weight by relevance scores
  const relevanceWeighted = items
    .filter(i => finalPrices.includes(i.price))
    .reduce((sum, item) => ({
      weightedSum: sum.weightedSum + item.price * item.relevanceScore,
      totalWeight: sum.totalWeight + item.relevanceScore,
    }), { weightedSum: 0, totalWeight: 0 });

  const weightedAvg = relevanceWeighted.totalWeight > 0
    ? relevanceWeighted.weightedSum / relevanceWeighted.totalWeight
    : statistics.mean;

  // Choose best estimate:
  // - If data is consistent (low CV), use weighted average
  // - If data is variable, use median (more robust)
  const cv = statistics.standardDeviation / (statistics.mean || 1);

  let bestEstimate: number;
  let method: string;

  if (cv <= 0.25) {
    // Consistent data - weighted average
    bestEstimate = weightedAvg;
    method = 'relevance_weighted_average';
  } else if (cv <= 0.4) {
    // Moderate variation - blend of median and weighted average
    bestEstimate = (statistics.median + weightedAvg) / 2;
    method = 'blended_median_weighted';
  } else {
    // High variation - use median
    bestEstimate = statistics.median;
    method = 'median_robust';
  }

  return {
    bestEstimate: roundTo(bestEstimate, 2),
    method,
    statistics,
  };
}
