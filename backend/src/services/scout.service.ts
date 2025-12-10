import { supabaseAdmin as supabase } from '../config/supabase';
import EbayApi from 'ebay-api';

export class ScoutService {
  private ebay: any;

  constructor() {
    this.ebay = new EbayApi({
      appId: process.env.EBAY_APP_ID!,
      certId: process.env.EBAY_CERT_ID!,
      sandbox: process.env.EBAY_SANDBOX === 'true',
      marketplaceId: 'EBAY_US'
    });
  }

  // Watchlist Methods
  async getUserWatchlists(userId: string) {
    const { data, error } = await supabase
      .from('watchlist_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async createWatchlist(userId: string, watchlist: any) {
    const { data, error } = await supabase
      .from('watchlist_searches')
      .insert({
        user_id: userId,
        keywords: watchlist.keywords,
        platforms: watchlist.platforms || ['facebook', 'craigslist'],
        max_price: watchlist.maxPrice,
        min_price: watchlist.minPrice,
        location: watchlist.location,
        radius_miles: watchlist.radiusMiles || 25,
        check_interval_minutes: Math.max(watchlist.checkInterval || 30, 15)
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateWatchlist(id: string, userId: string, updates: any) {
    const { data, error } = await supabase
      .from('watchlist_searches')
      .update({
        keywords: updates.keywords,
        platforms: updates.platforms,
        max_price: updates.maxPrice,
        min_price: updates.minPrice,
        is_active: updates.isActive,
        notification_enabled: updates.notificationEnabled,
        check_interval_minutes: Math.max(updates.checkInterval || 30, 15)
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteWatchlist(id: string, userId: string) {
    const { error } = await supabase
      .from('watchlist_searches')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // Price Intelligence Methods
  async getPriceIntelligence(query: string) {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Check cache first
    const { data: cached } = await supabase
      .from('price_intelligence')
      .select('*')
      .eq('normalized_query', normalizedQuery)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) {
      return {
        found: true,
        avgPrice: cached.ebay_avg_price,
        lowPrice: cached.ebay_low_price,
        highPrice: cached.ebay_high_price,
        count: cached.ebay_sold_count,
        samples: cached.ebay_sample_listings,
        cached: true
      };
    }

    // Fetch from eBay
    try {
      const results = await this.ebay.buy.browse.search({
        q: query,
        limit: 50
      });

      const items = results.itemSummaries || [];
      
      if (!items.length) {
        return { found: false };
      }

      const prices = items
        .filter((item: any) => item.price?.value)
        .map((item: any) => parseFloat(item.price.value));

      const sorted = [...prices].sort((a: number, b: number) => a - b);
      const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;

      const result = {
        found: true,
        avgPrice,
        lowPrice: sorted[0],
        highPrice: sorted[sorted.length - 1],
        count: items.length,
        samples: items.slice(0, 5).map((item: any) => ({
          title: item.title,
          price: parseFloat(item.price?.value || 0),
          image: item.image?.imageUrl,
          url: item.itemWebUrl
        }))
      };

      // Cache result
      await supabase.from('price_intelligence').upsert({
        search_query: query,
        normalized_query: normalizedQuery,
        ebay_avg_price: avgPrice,
        ebay_low_price: sorted[0],
        ebay_high_price: sorted[sorted.length - 1],
        ebay_sold_count: items.length,
        ebay_sample_listings: result.samples,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }, {
        onConflict: 'normalized_query'
      });

      return result;
    } catch (error) {
      console.error('eBay API error:', error);
      // Fallback or rethrow based on strategy
      return { found: false, error: 'Failed to fetch price intelligence' };
    }
  }

  // Market Comparisons
  async getUserComparisons(userId: string) {
    const { data, error } = await supabase
      .from('market_comparisons')
      .select(`
        *,
        price_intelligence (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async saveComparison(userId: string, comparison: any) {
    // Get or create price intelligence
    const priceData = await this.getPriceIntelligence(comparison.listingTitle);
    
    let priceIntelligenceId = null;
    if (priceData.found) {
      const { data: pi } = await supabase
        .from('price_intelligence')
        .select('id')
        .eq('normalized_query', comparison.listingTitle.toLowerCase().trim())
        .single();
      priceIntelligenceId = pi?.id;
    }

    const spread = priceData.found && comparison.listingPrice 
      ? priceData.avgPrice - comparison.listingPrice 
      : null;
    
    const spreadPct = spread && comparison.listingPrice 
      ? (spread / comparison.listingPrice) * 100 
      : null;

    const { data, error } = await supabase
      .from('market_comparisons')
      .insert({
        user_id: userId,
        platform: comparison.platform,
        platform_listing_url: comparison.listingUrl,
        listing_title: comparison.listingTitle,
        listing_price: comparison.listingPrice,
        listing_image_url: comparison.listingImage,
        price_intelligence_id: priceIntelligenceId,
        spread_amount: spread,
        spread_percentage: spreadPct,
        deal_score: this.calculateDealScore(comparison.listingPrice, priceData)
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private calculateDealScore(askingPrice: number | null, priceData: any): number {
    if (!askingPrice || !priceData.found) return 50;
    
    const ratio = askingPrice / priceData.avgPrice;
    
    if (ratio <= 0.5) return 95;
    if (ratio <= 0.7) return 85;
    if (ratio <= 0.85) return 70;
    if (ratio <= 1.0) return 50;
    if (ratio <= 1.15) return 35;
    if (ratio <= 1.3) return 20;
    return 10;
  }
}