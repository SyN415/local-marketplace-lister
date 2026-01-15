/**
 * PC Resale Service
 * Orchestrates component extraction, eBay validation, and profitability analysis
 * for PC build resale opportunities
 */

import { supabaseAdmin as supabase } from '../config/supabase';
import { ComponentExtractorService, ExtractedComponents, ComponentProfile } from './component-extractor.service';
import { ProfitabilityCalculatorService, RoiAnalysis, ComponentValuation, ReportSummary } from './profitability-calculator.service';
import { ScoutService } from './scout.service';
import { mapComponentType, ComponentType } from './ebay-price-filter';

export interface MarketplaceListing {
  platform: 'facebook' | 'craigslist';
  platformListingUrl: string;
  title: string;
  description?: string;
  price: number;
  imageUrls?: string[];
  sellerLocation?: string;
}

export interface ResaleAnalysis extends RoiAnalysis {
  listing: MarketplaceListing;
  componentProfile: ComponentProfile;
  componentValuation: ComponentValuation;
}

export interface SavedOpportunity {
  id: string;
  userId: string;
  platform: string;
  platformListingUrl: string;
  listingTitle: string;
  listingPrice: number;
  recommendation: string;
  netProfit: number;
  roiPercentage: number;
  status: string;
  createdAt: string;
}

export class PcResaleService {
  private componentExtractor: ComponentExtractorService;
  private profitabilityCalc: ProfitabilityCalculatorService;
  private scoutService: ScoutService;

  constructor() {
    this.componentExtractor = new ComponentExtractorService();
    this.profitabilityCalc = new ProfitabilityCalculatorService();
    this.scoutService = new ScoutService();
  }

  /**
   * Analyze a single listing for resale potential
   */
  async analyzeListing(listing: MarketplaceListing): Promise<ResaleAnalysis> {
    // Step 1: Extract components from listing
    const componentProfile = this.componentExtractor.buildComponentProfile({
      title: listing.title,
      description: listing.description,
    });

    // Step 2: Get eBay valuations for each component
    const componentValuation = await this.getComponentValuations(componentProfile.rawComponents);

    // Step 3: Calculate profitability
    const roiAnalysis = this.profitabilityCalc.calculateRoi(
      { price: listing.price, componentGaps: componentProfile.missingSpecs },
      componentValuation
    );

    return {
      ...roiAnalysis,
      listing,
      componentProfile,
      componentValuation,
    };
  }

  /**
   * Get eBay valuations for extracted components
   */
  /**
   * Generate eBay search URL for a component
   */
  private generateEbaySearchUrl(componentName: string): string {
    const encodedQuery = encodeURIComponent(componentName);
    // eBay completed listings search for used items - shows sold prices for reference
    return `https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}&LH_Complete=1&LH_Sold=1&LH_ItemCondition=3000`;
  }

  private async getComponentValuations(components: ExtractedComponents): Promise<ComponentValuation> {
    const breakdown: Record<string, number> = {};
    const searchUrls: Record<string, string> = {};
    let total = 0;
    let pricedCount = 0;
    const confidenceScores: number[] = [];

    const componentTypes = ['gpu', 'cpu', 'motherboard', 'psu', 'ram', 'storage'] as const;

    for (const compType of componentTypes) {
      const compValues = components[compType];
      if (!compValues || compValues.length === 0) continue;

      // Use the first (most specific) component found
      const componentName = compValues[0];

      // Always generate the search URL for the component
      searchUrls[compType] = this.generateEbaySearchUrl(componentName);

      try {
        // Check cache first
        const cached = await this.getCachedValuation(componentName);
        if (cached) {
          breakdown[compType] = cached.avgPrice;
          total += cached.avgPrice;
          pricedCount++;
          confidenceScores.push(Math.min(cached.sampleCount / 50, 1));
          continue;
        }

        // Query eBay via scout service with component type for enhanced filtering
        const mappedType = mapComponentType(compType);
        const priceData = await this.scoutService.getPriceIntelligence(componentName, {
          condition: 'used',
          componentType: mappedType,  // Pass component type for better filtering
        });

        if (priceData.found && priceData.avgPrice) {
          breakdown[compType] = priceData.avgPrice;
          total += priceData.avgPrice;
          pricedCount++;

          // Use confidenceScore from enhanced filtering if available, otherwise fallback
          const confidenceFromPriceData = priceData.confidenceScore ?? Math.min((priceData.count || 1) / 50, 1);
          confidenceScores.push(confidenceFromPriceData);

          // Cache the result
          await this.cacheComponentValuation(compType, componentName, priceData);
        }
      } catch (err) {
        console.warn(`Failed to get valuation for ${componentName}:`, err);
      }
    }

    const avgConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0;

    return {
      totalAggregatedValue: Math.round(total * 100) / 100,
      componentBreakdown: breakdown,
      componentSearchUrls: searchUrls,
      confidence: Math.round(avgConfidence * 100) / 100,
      componentsPriced: pricedCount,
    };
  }

  private async getCachedValuation(componentName: string): Promise<{
    avgPrice: number;
    sampleCount: number;
  } | null> {
    const normalizedName = componentName.toLowerCase().trim().replace(/\s+/g, ' ');
    
    const { data } = await supabase
      .from('pc_component_valuations')
      .select('avg_price, sample_count')
      .eq('normalized_name', normalizedName)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (data) {
      return {
        avgPrice: parseFloat(data.avg_price),
        sampleCount: data.sample_count || 1,
      };
    }
    return null;
  }

  private async cacheComponentValuation(
    componentType: string,
    componentName: string,
    priceData: any
  ): Promise<void> {
    const normalizedName = componentName.toLowerCase().trim().replace(/\s+/g, ' ');

    try {
      await supabase.from('pc_component_valuations').upsert({
        component_type: componentType,
        component_name: componentName,
        normalized_name: normalizedName,
        condition: 'used',
        avg_price: priceData.avgPrice,
        min_price: priceData.lowPrice,
        max_price: priceData.highPrice,
        sample_count: priceData.count || 1,
        sample_listings: priceData.samples || [],
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }, {
        onConflict: 'normalized_name,condition',
      });
    } catch (err) {
      console.warn('Failed to cache component valuation:', err);
    }
  }

  /**
   * Save an analyzed opportunity to the database
   */
  async saveOpportunity(userId: string, analysis: ResaleAnalysis): Promise<SavedOpportunity> {
    const { data, error } = await supabase
      .from('pc_resale_opportunities')
      .upsert({
        user_id: userId,
        platform: analysis.listing.platform,
        platform_listing_url: analysis.listing.platformListingUrl,
        listing_title: analysis.listing.title,
        listing_description: analysis.listing.description,
        listing_price: analysis.listing.price,
        listing_image_urls: analysis.listing.imageUrls || [],
        seller_location: analysis.listing.sellerLocation,
        extracted_components: analysis.componentProfile.rawComponents,
        estimated_tier: analysis.componentProfile.estimatedTier,
        missing_specs: analysis.componentProfile.missingSpecs,
        total_component_value: analysis.componentValuation.totalAggregatedValue,
        component_breakdown: analysis.componentValuation.componentBreakdown,
        valuation_confidence: analysis.componentValuation.confidence,
        gross_profit: analysis.grossProfit,
        net_profit: analysis.netProfit,
        roi_percentage: analysis.roiPercentage,
        roi_multiplier: analysis.roiMultiplier,
        cost_breakdown: analysis.costBreakdown,
        profit_threshold_met: analysis.profitThresholdMet,
        recommendation: analysis.recommendation,
        recommendation_reason: analysis.reasoning,
      }, {
        onConflict: 'user_id,platform,platform_listing_url',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      userId: data.user_id,
      platform: data.platform,
      platformListingUrl: data.platform_listing_url,
      listingTitle: data.listing_title,
      listingPrice: parseFloat(data.listing_price),
      recommendation: data.recommendation,
      netProfit: parseFloat(data.net_profit),
      roiPercentage: parseFloat(data.roi_percentage),
      status: data.status,
      createdAt: data.created_at,
    };
  }

  /**
   * Get user's saved opportunities
   */
  async getUserOpportunities(userId: string, filters?: {
    recommendation?: 'BUY' | 'SKIP';
    status?: string;
    minRoi?: number;
  }): Promise<SavedOpportunity[]> {
    let query = supabase
      .from('pc_resale_opportunities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters?.recommendation) {
      query = query.eq('recommendation', filters.recommendation);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.minRoi) {
      query = query.gte('roi_percentage', filters.minRoi);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      platform: row.platform,
      platformListingUrl: row.platform_listing_url,
      listingTitle: row.listing_title,
      listingPrice: parseFloat(row.listing_price),
      recommendation: row.recommendation,
      netProfit: parseFloat(row.net_profit || 0),
      roiPercentage: parseFloat(row.roi_percentage || 0),
      status: row.status,
      createdAt: row.created_at,
    }));
  }

  /**
   * Update opportunity status
   */
  async updateOpportunityStatus(
    id: string,
    userId: string,
    status: string,
    notes?: string
  ): Promise<void> {
    const updateData: Record<string, any> = { status };
    if (notes !== undefined) {
      updateData.user_notes = notes;
    }

    const { error } = await supabase
      .from('pc_resale_opportunities')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Delete an opportunity
   */
  async deleteOpportunity(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('pc_resale_opportunities')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Get full opportunity details
   */
  async getOpportunityDetails(id: string, userId: string): Promise<ResaleAnalysis | null> {
    const { data, error } = await supabase
      .from('pc_resale_opportunities')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    // Generate search URLs from extracted components
    const extractedComponents = data.extracted_components || {};
    const componentSearchUrls: Record<string, string> = {};
    for (const [compType, compValues] of Object.entries(extractedComponents)) {
      if (Array.isArray(compValues) && compValues.length > 0) {
        componentSearchUrls[compType] = this.generateEbaySearchUrl(compValues[0]);
      }
    }

    return {
      listingPrice: parseFloat(data.listing_price),
      aggregateComponentValue: parseFloat(data.total_component_value || 0),
      grossProfit: parseFloat(data.gross_profit || 0),
      netProfit: parseFloat(data.net_profit || 0),
      roiPercentage: parseFloat(data.roi_percentage || 0),
      roiMultiplier: parseFloat(data.roi_multiplier || 0),
      profitThresholdMet: data.profit_threshold_met,
      recommendation: data.recommendation,
      costBreakdown: data.cost_breakdown || {},
      confidenceScore: parseFloat(data.valuation_confidence || 0),
      reasoning: data.recommendation_reason || '',
      listing: {
        platform: data.platform,
        platformListingUrl: data.platform_listing_url,
        title: data.listing_title,
        description: data.listing_description,
        price: parseFloat(data.listing_price),
        imageUrls: data.listing_image_urls || [],
        sellerLocation: data.seller_location,
      },
      componentProfile: {
        rawComponents: extractedComponents,
        rawTitle: data.listing_title,
        estimatedTier: data.estimated_tier,
        missingSpecs: data.missing_specs || [],
      },
      componentValuation: {
        totalAggregatedValue: parseFloat(data.total_component_value || 0),
        componentBreakdown: data.component_breakdown || {},
        componentSearchUrls: componentSearchUrls,
        confidence: parseFloat(data.valuation_confidence || 0),
        componentsPriced: Object.keys(data.component_breakdown || {}).length,
      },
    };
  }

  /**
   * Check if a listing is likely a PC build
   */
  isPcBuildListing(title: string, description?: string): boolean {
    return this.componentExtractor.isPcBuildListing(title, description || '');
  }

  /**
   * Generate a daily report for the user
   */
  async generateDailyReport(userId: string): Promise<ReportSummary> {
    const today = new Date().toISOString().split('T')[0];

    const { data: opportunities } = await supabase
      .from('pc_resale_opportunities')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00Z`);

    const analyses = (opportunities || []).map(opp => ({
      listingPrice: parseFloat(opp.listing_price),
      aggregateComponentValue: parseFloat(opp.total_component_value || 0),
      grossProfit: parseFloat(opp.gross_profit || 0),
      netProfit: parseFloat(opp.net_profit || 0),
      roiPercentage: parseFloat(opp.roi_percentage || 0),
      roiMultiplier: parseFloat(opp.roi_multiplier || 0),
      profitThresholdMet: opp.profit_threshold_met,
      recommendation: opp.recommendation as 'BUY' | 'SKIP',
      costBreakdown: opp.cost_breakdown || {},
      confidenceScore: parseFloat(opp.valuation_confidence || 0),
      reasoning: opp.recommendation_reason || '',
      title: opp.listing_title,
    }));

    return this.profitabilityCalc.generateReport(analyses);
  }
}

