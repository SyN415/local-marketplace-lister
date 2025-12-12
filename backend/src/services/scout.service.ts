import { supabaseAdmin as supabase } from '../config/supabase';
import EbayApi from 'ebay-api';

export class ScoutService {
  private ebay: any;
  private ebayConfigured: boolean;

  constructor() {
    // Check if eBay credentials are configured
    this.ebayConfigured = !!(process.env.EBAY_APP_ID && process.env.EBAY_CERT_ID);
    
    if (this.ebayConfigured) {
      try {
        this.ebay = new EbayApi({
          appId: process.env.EBAY_APP_ID!,
          certId: process.env.EBAY_CERT_ID!,
          sandbox: process.env.EBAY_SANDBOX === 'true',
          marketplaceId: 'EBAY_US'
        });
        console.log('eBay API initialized successfully');
      } catch (err) {
        console.error('Failed to initialize eBay API:', err);
        this.ebayConfigured = false;
      }
    } else {
      console.warn('eBay API credentials not configured - price intelligence will be limited');
    }
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
    // Build insert object, only including fields that are provided
    const insertData: any = {
      user_id: userId,
      keywords: watchlist.keywords,
      platforms: watchlist.platforms || ['facebook', 'craigslist'],
      radius_miles: watchlist.radiusMiles || watchlist.radius_miles || 25,
      check_interval_minutes: Math.max(
        watchlist.checkInterval || watchlist.checkIntervalMinutes || watchlist.check_interval_minutes || 30,
        15
      ),
      is_active: true,
      notification_enabled: watchlist.notificationEnabled ?? watchlist.notification_enabled ?? true,
      total_matches: 0
    };
    
    // Handle optional price fields
    const maxPrice = watchlist.maxPrice ?? watchlist.max_price;
    const minPrice = watchlist.minPrice ?? watchlist.min_price;
    
    if (maxPrice !== null && maxPrice !== undefined && maxPrice !== '') {
      insertData.max_price = parseFloat(maxPrice);
    }
    if (minPrice !== null && minPrice !== undefined && minPrice !== '') {
      insertData.min_price = parseFloat(minPrice);
    }
    
    // Handle optional location
    if (watchlist.location) {
      insertData.location = watchlist.location;
    }
    
    console.log('Creating watchlist with data:', insertData);
    
    const { data, error } = await supabase
      .from('watchlist_searches')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating watchlist:', error);
      throw error;
    }
    
    console.log('Watchlist created successfully:', data);
    return data;
  }

  async updateWatchlist(id: string, userId: string, updates: any) {
    // Build update object, only including fields that are explicitly provided
    const updateData: any = {};
    
    if (updates.keywords !== undefined) {
      updateData.keywords = updates.keywords;
    }
    if (updates.platforms !== undefined) {
      updateData.platforms = updates.platforms;
    }
    if (updates.maxPrice !== undefined || updates.max_price !== undefined) {
      const maxPrice = updates.maxPrice ?? updates.max_price;
      updateData.max_price = maxPrice === '' || maxPrice === null ? null : parseFloat(maxPrice);
    }
    if (updates.minPrice !== undefined || updates.min_price !== undefined) {
      const minPrice = updates.minPrice ?? updates.min_price;
      updateData.min_price = minPrice === '' || minPrice === null ? null : parseFloat(minPrice);
    }
    if (updates.isActive !== undefined || updates.is_active !== undefined) {
      updateData.is_active = updates.isActive ?? updates.is_active;
    }
    if (updates.notificationEnabled !== undefined || updates.notification_enabled !== undefined) {
      updateData.notification_enabled = updates.notificationEnabled ?? updates.notification_enabled;
    }
    if (updates.checkInterval !== undefined || updates.checkIntervalMinutes !== undefined || updates.check_interval_minutes !== undefined) {
      updateData.check_interval_minutes = Math.max(
        updates.checkInterval || updates.checkIntervalMinutes || updates.check_interval_minutes || 30,
        15
      );
    }
    if (updates.location !== undefined) {
      updateData.location = updates.location || null;
    }
    if (updates.radiusMiles !== undefined || updates.radius_miles !== undefined) {
      updateData.radius_miles = updates.radiusMiles ?? updates.radius_miles;
    }
    
    console.log('Updating watchlist', id, 'with data:', updateData);
    
    const { data, error } = await supabase
      .from('watchlist_searches')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating watchlist:', error);
      throw error;
    }
    
    console.log('Watchlist updated successfully:', data);
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
    // Validate query
    if (!query || typeof query !== 'string') {
      console.warn('getPriceIntelligence: Invalid query provided');
      return { found: false, error: 'Invalid query' };
    }
    
    const normalizedQuery = query.toLowerCase().trim();
    
    if (normalizedQuery.length < 2) {
      console.warn('getPriceIntelligence: Query too short');
      return { found: false, error: 'Query too short' };
    }
    
    console.log('getPriceIntelligence: Searching for:', normalizedQuery);
    
    // Check cache first
    try {
      const { data: cached, error: cacheError } = await supabase
        .from('price_intelligence')
        .select('*')
        .eq('normalized_query', normalizedQuery)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cacheError && cacheError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" which is fine
        console.warn('Cache query error:', cacheError);
      }

      if (cached) {
        console.log('getPriceIntelligence: Returning cached data for:', normalizedQuery);
        return {
          found: true,
          avgPrice: parseFloat(cached.ebay_avg_price) || 0,
          lowPrice: parseFloat(cached.ebay_low_price) || 0,
          highPrice: parseFloat(cached.ebay_high_price) || 0,
          count: cached.ebay_sold_count || 0,
          samples: cached.ebay_sample_listings || [],
          cached: true
        };
      }
    } catch (cacheErr) {
      console.warn('Cache lookup failed:', cacheErr);
      // Continue to fetch from eBay
    }

    // Check if eBay is configured
    if (!this.ebayConfigured || !this.ebay) {
      console.warn('getPriceIntelligence: eBay API not configured');
      return {
        found: false,
        error: 'Price intelligence service not configured',
        message: 'eBay API credentials are not set up'
      };
    }

    // Fetch from eBay
    try {
      console.log('getPriceIntelligence: Fetching from eBay API for:', query);
      
      const results = await this.ebay.buy.browse.search({
        q: query,
        limit: 50
      });

      const items = results.itemSummaries || [];
      
      console.log(`getPriceIntelligence: eBay returned ${items.length} items`);
      
      if (!items.length) {
        return { found: false, message: 'No comparable items found on eBay' };
      }

      const prices = items
        .filter((item: any) => item.price?.value)
        .map((item: any) => parseFloat(item.price.value))
        .filter((price: number) => !isNaN(price) && price > 0);

      if (prices.length === 0) {
        return { found: false, message: 'No priced items found' };
      }

      const sorted = [...prices].sort((a: number, b: number) => a - b);
      const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;

      const result = {
        found: true,
        avgPrice: Math.round(avgPrice * 100) / 100,
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
      try {
        await supabase.from('price_intelligence').upsert({
          search_query: query,
          normalized_query: normalizedQuery,
          ebay_avg_price: result.avgPrice,
          ebay_low_price: result.lowPrice,
          ebay_high_price: result.highPrice,
          ebay_sold_count: items.length,
          ebay_sample_listings: result.samples,
          fetched_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }, {
          onConflict: 'normalized_query'
        });
        console.log('getPriceIntelligence: Cached result for:', normalizedQuery);
      } catch (cacheWriteErr) {
        // Non-critical - just log the error
        console.warn('Failed to cache price intelligence:', cacheWriteErr);
      }

      return result;
    } catch (error: any) {
      console.error('eBay API error:', error?.message || error);
      
      // Try to return stale cache if available
      try {
        const { data: staleCache } = await supabase
          .from('price_intelligence')
          .select('*')
          .eq('normalized_query', normalizedQuery)
          .single();
        
        if (staleCache) {
          console.log('getPriceIntelligence: Returning stale cache due to API error');
          return {
            found: true,
            avgPrice: parseFloat(staleCache.ebay_avg_price) || 0,
            lowPrice: parseFloat(staleCache.ebay_low_price) || 0,
            highPrice: parseFloat(staleCache.ebay_high_price) || 0,
            count: staleCache.ebay_sold_count || 0,
            samples: staleCache.ebay_sample_listings || [],
            cached: true,
            stale: true
          };
        }
      } catch {
        // Ignore stale cache errors
      }
      
      // Return error response
      const errorMessage = error?.message?.includes('401') || error?.message?.includes('unauthorized')
        ? 'eBay API authentication failed'
        : error?.message?.includes('429')
        ? 'Rate limit exceeded, please try again later'
        : 'Failed to fetch price data from eBay';
      
      return { found: false, error: errorMessage };
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

    // Calculate spread, ensuring avgPrice exists
    const avgPrice = priceData.found && priceData.avgPrice ? priceData.avgPrice : null;
    const spread = avgPrice !== null && comparison.listingPrice
      ? avgPrice - comparison.listingPrice
      : null;
    
    const spreadPct = spread !== null && comparison.listingPrice
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

  // eBay Notification Verification
  verifyEbayNotification(challengeCode: string, verificationToken: string): string | null {
    // In a real implementation, you should verify the token matches your stored verification token
    // For this implementation, we assume the token is correct if it matches the configured token
    
    // Check if verification token matches configured token
    // Note: We need to add EBAY_VERIFICATION_TOKEN to .env
    const configuredToken = process.env.EBAY_VERIFICATION_TOKEN;
    
    if (!configuredToken) {
      console.warn('EBAY_VERIFICATION_TOKEN not configured');
      return null;
    }

    if (verificationToken !== configuredToken) {
      console.warn('Invalid verification token received from eBay');
      return null;
    }

    // Hash the challenge code, endpoint URL, and verification token
    // eBay requirement:
    // response = hash(challengeCode + verificationToken + endpointUrl)
    // However, for the initial verification (Get), eBay just expects a hash of the challenge code
    // actually, for the initial verification, we just need to echo the challenge code if we trust the source?
    // Wait, eBay documentation says:
    // "Your endpoint must support HTTPS. When you save your settings, eBay sends a GET request to your endpoint with a challenge_code parameter.
    // Your endpoint must respond with a JSON object containing a challengeResponse field.
    // The value of the challengeResponse field must be the challenge_code hashed with the verification token and the endpoint URL."
    
    // Let's implement the hashing logic
    const crypto = require('crypto');
    const endpointUrl = `${process.env.BACKEND_URL}/api/scout/ebay-notifications`; // Verify this matches your actual endpoint URL
    
    const hash = crypto.createHash('sha256');
    hash.update(challengeCode);
    hash.update(verificationToken);
    hash.update(endpointUrl);
    
    return hash.digest('hex');
  }
}