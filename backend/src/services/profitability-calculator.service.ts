/**
 * Profitability Calculator Service
 * Calculates ROI for dismantling and reselling PC parts individually
 */

export interface CostBreakdown {
  dismantling: number;
  shipping: number;
  ebayFees: number;
  packaging: number;
  total: number;
}

export interface ComponentValuation {
  totalAggregatedValue: number;
  componentBreakdown: Record<string, number>;
  confidence: number;
  componentsPriced: number;
}

export interface RoiAnalysis {
  listingPrice: number;
  aggregateComponentValue: number;
  grossProfit: number;
  netProfit: number;
  roiPercentage: number;
  roiMultiplier: number;
  profitThresholdMet: boolean;
  recommendation: 'BUY' | 'SKIP';
  costBreakdown: CostBreakdown;
  confidenceScore: number;
  reasoning: string;
}

export interface Listing {
  price: number;
  componentGaps?: string[];
}

export interface ReportSummary {
  totalListingsAnalyzed: number;
  profitableOpportunities: number;
  skipListings: number;
  totalPotentialNetProfit: number;
  averageRoiPercentage: number;
  topOpportunities: Array<RoiAnalysis & { title?: string }>;
  summary: string;
}

export class ProfitabilityCalculatorService {
  // Cost assumptions (configurable)
  private readonly DISMANTLING_COST = 50; // Labor/tools to disassemble
  private readonly SHIPPING_COST_MULTIPLIER = 0.08; // 8% of value for shipping
  private readonly EBAY_FINAL_VALUE_FEE = 0.13; // 13% seller fee
  private readonly PACKAGING_COST = 30; // Average packaging materials
  private readonly MIN_PROFIT_THRESHOLD = 100; // Minimum $100 net profit
  private readonly ROI_MULTIPLIER_THRESHOLD = 2.0; // 2x ROI minimum

  /**
   * Calculate ROI for dismantling and reselling PC parts individually
   */
  calculateRoi(listing: Listing, componentValue: ComponentValuation): RoiAnalysis {
    const listingPrice = listing.price || 0;
    const totalComponentValue = componentValue.totalAggregatedValue || 0;

    // Validate inputs
    if (!totalComponentValue || listingPrice <= 0) {
      return this.createSkipResult(listingPrice, 'Insufficient data for ROI calculation');
    }

    // Calculate costs
    const dismantlingCost = this.DISMANTLING_COST;
    const shippingCost = totalComponentValue * this.SHIPPING_COST_MULTIPLIER;
    const ebayFees = totalComponentValue * this.EBAY_FINAL_VALUE_FEE;
    const packagingCost = this.PACKAGING_COST;
    const totalCosts = dismantlingCost + shippingCost + ebayFees + packagingCost;

    // Calculate profit
    const grossProfit = totalComponentValue - listingPrice;
    const netProfit = grossProfit - totalCosts;

    // Calculate ROI metrics
    const roiPercentage = listingPrice > 0 ? (netProfit / listingPrice) * 100 : 0;
    const roiMultiplier = listingPrice > 0 ? totalComponentValue / listingPrice : 0;

    // Determine if meets profit threshold
    const profitThresholdMet = roiMultiplier >= this.ROI_MULTIPLIER_THRESHOLD;
    const recommendation: 'BUY' | 'SKIP' = 
      profitThresholdMet && netProfit > this.MIN_PROFIT_THRESHOLD ? 'BUY' : 'SKIP';

    const reasoning = this.generateRecommendationReason(
      profitThresholdMet,
      netProfit,
      componentValue.confidence,
      listing.componentGaps || []
    );

    return {
      listingPrice,
      aggregateComponentValue: totalComponentValue,
      grossProfit,
      netProfit,
      roiPercentage: Math.round(roiPercentage * 10) / 10,
      roiMultiplier: Math.round(roiMultiplier * 100) / 100,
      profitThresholdMet,
      recommendation,
      costBreakdown: {
        dismantling: dismantlingCost,
        shipping: Math.round(shippingCost * 100) / 100,
        ebayFees: Math.round(ebayFees * 100) / 100,
        packaging: packagingCost,
        total: Math.round(totalCosts * 100) / 100,
      },
      confidenceScore: componentValue.confidence,
      reasoning,
    };
  }

  /**
   * Generate aggregate report across multiple listings
   */
  generateReport(listingsAnalysis: Array<RoiAnalysis & { title?: string }>): ReportSummary {
    const profitable = listingsAnalysis.filter(l => l.recommendation === 'BUY');
    const totalPotentialRevenue = profitable.reduce((sum, l) => sum + l.netProfit, 0);
    const avgRoi = profitable.length > 0
      ? profitable.reduce((sum, l) => sum + l.roiPercentage, 0) / profitable.length
      : 0;

    return {
      totalListingsAnalyzed: listingsAnalysis.length,
      profitableOpportunities: profitable.length,
      skipListings: listingsAnalysis.length - profitable.length,
      totalPotentialNetProfit: Math.round(totalPotentialRevenue * 100) / 100,
      averageRoiPercentage: Math.round(avgRoi * 10) / 10,
      topOpportunities: profitable
        .sort((a, b) => b.netProfit - a.netProfit)
        .slice(0, 10),
      summary: `Found ${profitable.length} profitable opportunities out of ${listingsAnalysis.length} listings`,
    };
  }

  private createSkipResult(listingPrice: number, reason: string): RoiAnalysis {
    return {
      listingPrice,
      aggregateComponentValue: 0,
      grossProfit: 0,
      netProfit: 0,
      roiPercentage: 0,
      roiMultiplier: 0,
      profitThresholdMet: false,
      recommendation: 'SKIP',
      costBreakdown: { dismantling: 0, shipping: 0, ebayFees: 0, packaging: 0, total: 0 },
      confidenceScore: 0,
      reasoning: reason,
    };
  }

  private generateRecommendationReason(
    thresholdMet: boolean,
    netProfit: number,
    confidence: number,
    componentGaps: string[]
  ): string {
    const reasons: string[] = [];

    if (!thresholdMet) {
      reasons.push('Does not meet 2x profit threshold');
    }
    if (netProfit < this.MIN_PROFIT_THRESHOLD) {
      reasons.push(`Net profit below $${this.MIN_PROFIT_THRESHOLD} minimum`);
    }
    if (confidence < 0.6) {
      reasons.push('Low confidence in component pricing (incomplete specs)');
    }
    if (componentGaps.length > 0) {
      reasons.push(`Missing critical specs: ${componentGaps.join(', ')}`);
    }

    if (reasons.length === 0) {
      reasons.push('Meets profitability requirements');
    }

    return reasons.join('; ');
  }
}

