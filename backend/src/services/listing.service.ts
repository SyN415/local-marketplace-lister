import { supabaseAdmin } from '../config/supabase';
import {
  Listing,
  CreateListingRequest,
  UpdateListingRequest,
  ListingFilters,
  ListingStats,
  PaginatedListings,
  SearchListingsRequest,
  ListingSearchResponse,
  ApiResponse
} from '../types/listing.types';

/**
 * Service for handling listing-related operations
 */
class ListingService {
  /**
   * Deduct a credit from the user's account
   * @param userId - ID of the user
   * @returns Success boolean and current credits
   */
  async deductCredit(userId: string): Promise<{ success: boolean; credits?: number; error?: string }> {
    try {
      // Start a transaction-like operation (Supabase doesn't fully support transactions via JS client yet easily,
      // but we can do a check-and-update or use a stored procedure. For MVP, check-and-update is okay-ish but race-condition prone.
      // A better way is to use the `decrement` approach if possible, or a stored procedure.
      // We'll fetch first, check, then update.)

      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();

      if (fetchError || !profile) {
        return { success: false, error: 'User profile not found' };
      }

      if (profile.credits < 1) {
        return { success: false, error: 'Insufficient credits', credits: profile.credits };
      }

      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ credits: profile.credits - 1 })
        .eq('id', userId)
        .select('credits')
        .single();

      if (updateError) {
        return { success: false, error: 'Failed to deduct credit' };
      }

      return { success: true, credits: updatedProfile.credits };
    } catch (error) {
      console.error('Deduct credit error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Create a new listing
   * @param userId - ID of the user creating the listing
   * @param data - Listing creation data
   * @returns API response with created listing
   */
  async createListing(userId: string, data: CreateListingRequest): Promise<ApiResponse<Listing>> {
    try {
      const listingData = {
        user_id: userId,
        title: data.title.trim(),
        description: data.description.trim(),
        price: Number(data.price),
        category: data.category,
        condition: data.condition,
        images: data.images || [],
        location_lat: data.location_lat || null,
        location_lng: data.location_lng || null,
        location_address: data.location_address?.trim() || null,
        status: data.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: listing, error } = await supabaseAdmin
        .from('listings')
        .insert(listingData)
        .select()
        .single();

      if (error) {
        console.error('Create listing error:', error);
        return {
          success: false,
          error: 'Failed to create listing'
        };
      }

      return {
        success: true,
        data: listing as Listing,
        message: 'Listing created successfully'
      };

    } catch (error) {
      console.error('Create listing service error:', error);
      return {
        success: false,
        error: 'Internal server error during listing creation'
      };
    }
  }

  /**
   * Get all listings for a user with pagination and filters
   * @param userId - ID of the user
   * @param page - Page number (1-based)
   * @param limit - Items per page
   * @param filters - Optional filters
   * @returns API response with paginated listings
   */
  async getListingsByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
    filters?: ListingFilters
  ): Promise<ApiResponse<PaginatedListings>> {
    try {
      const offset = (page - 1) * limit;
      
      let query = supabaseAdmin
        .from('listings')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Apply filters
      if (filters) {
        if (filters.category) {
          query = query.eq('category', filters.category);
        }
        if (filters.condition) {
          query = query.eq('condition', filters.condition);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.min_price !== undefined) {
          query = query.gte('price', filters.min_price);
        }
        if (filters.max_price !== undefined) {
          query = query.lte('price', filters.max_price);
        }
        if (filters.location_lat && filters.location_lng && filters.radius_km) {
          // Calculate distance using PostGIS or Haversine formula
          // For simplicity, we'll use a basic bounding box approach
          const latRange = filters.radius_km / 111; // Rough approximation
          const lngRange = filters.radius_km / (111 * Math.cos(filters.location_lat * Math.PI / 180));
          
          query = query
            .gte('location_lat', filters.location_lat - latRange)
            .lte('location_lat', filters.location_lat + latRange)
            .gte('location_lng', filters.location_lng - lngRange)
            .lte('location_lng', filters.location_lng + lngRange);
        }
      }

      // Order by creation date (newest first)
      query = query.order('created_at', { ascending: false });

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data: listings, error, count } = await query;

      if (error) {
        console.error('Get listings error:', error);
        return {
          success: false,
          error: 'Failed to fetch listings'
        };
      }

      const total = count || 0;
      const total_pages = Math.ceil(total / limit);
      const has_next = page < total_pages;
      const has_prev = page > 1;

      const paginatedResponse: PaginatedListings = {
        listings: listings as Listing[],
        total,
        page,
        limit,
        total_pages,
        has_next,
        has_prev
      };

      return {
        success: true,
        data: paginatedResponse,
        message: 'Listings retrieved successfully'
      };

    } catch (error) {
      console.error('Get listings service error:', error);
      return {
        success: false,
        error: 'Internal server error during listings retrieval'
      };
    }
  }

  /**
   * Get a single listing by ID (with ownership verification)
   * @param listingId - ID of the listing
   * @param userId - ID of the requesting user
   * @returns API response with listing
   */
  async getListingById(listingId: string, userId: string): Promise<ApiResponse<Listing>> {
    try {
      const { data: listing, error } = await supabaseAdmin
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'Listing not found'
          };
        }
        console.error('Get listing error:', error);
        return {
          success: false,
          error: 'Failed to fetch listing'
        };
      }

      return {
        success: true,
        data: listing as Listing,
        message: 'Listing retrieved successfully'
      };

    } catch (error) {
      console.error('Get listing by ID service error:', error);
      return {
        success: false,
        error: 'Internal server error during listing retrieval'
      };
    }
  }

  /**
   * Update a listing
   * @param listingId - ID of the listing
   * @param userId - ID of the user making the update
   * @param data - Update data
   * @returns API response with updated listing
   */
  async updateListing(
    listingId: string,
    userId: string,
    data: UpdateListingRequest
  ): Promise<ApiResponse<Listing>> {
    try {
      // First verify ownership
      const ownershipCheck = await this.getListingById(listingId, userId);
      if (!ownershipCheck.success) {
        return ownershipCheck;
      }

      // Build update data
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (data.title !== undefined) updateData.title = data.title.trim();
      if (data.description !== undefined) updateData.description = data.description.trim();
      if (data.price !== undefined) updateData.price = Number(data.price);
      if (data.category !== undefined) updateData.category = data.category;
      if (data.condition !== undefined) updateData.condition = data.condition;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.images !== undefined) updateData.images = data.images;
      if (data.location_lat !== undefined) updateData.location_lat = data.location_lat;
      if (data.location_lng !== undefined) updateData.location_lng = data.location_lng;
      if (data.location_address !== undefined) {
        updateData.location_address = data.location_address?.trim() || null;
      }

      const { data: updatedListing, error } = await supabaseAdmin
        .from('listings')
        .update(updateData)
        .eq('id', listingId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Update listing error:', error);
        return {
          success: false,
          error: 'Failed to update listing'
        };
      }

      return {
        success: true,
        data: updatedListing as Listing,
        message: 'Listing updated successfully'
      };

    } catch (error) {
      console.error('Update listing service error:', error);
      return {
        success: false,
        error: 'Internal server error during listing update'
      };
    }
  }

  /**
   * Delete a listing
   * @param listingId - ID of the listing
   * @param userId - ID of the user making the deletion
   * @returns API response
   */
  async deleteListing(listingId: string, userId: string): Promise<ApiResponse> {
    try {
      // First verify ownership
      const ownershipCheck = await this.getListingById(listingId, userId);
      if (!ownershipCheck.success) {
        return ownershipCheck;
      }

      const { error } = await supabaseAdmin
        .from('listings')
        .delete()
        .eq('id', listingId)
        .eq('user_id', userId);

      if (error) {
        console.error('Delete listing error:', error);
        return {
          success: false,
          error: 'Failed to delete listing'
        };
      }

      return {
        success: true,
        message: 'Listing deleted successfully'
      };

    } catch (error) {
      console.error('Delete listing service error:', error);
      return {
        success: false,
        error: 'Internal server error during listing deletion'
      };
    }
  }

  /**
   * Search listings with query and filters
   * @param userId - ID of the user performing the search
   * @param searchRequest - Search request with query and filters
   * @returns API response with search results
   */
  async searchListings(
    userId: string,
    searchRequest: SearchListingsRequest
  ): Promise<ApiResponse<ListingSearchResponse>> {
    try {
      const { query, filters, page = 1, limit = 10 } = searchRequest;
      const offset = (page - 1) * limit;

      let searchQuery = supabaseAdmin
        .from('listings')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Apply text search on title and description
      if (query && query.trim()) {
        const searchTerm = query.trim().toLowerCase();
        searchQuery = searchQuery.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // Apply filters
      if (filters) {
        if (filters.category) {
          searchQuery = searchQuery.eq('category', filters.category);
        }
        if (filters.condition) {
          searchQuery = searchQuery.eq('condition', filters.condition);
        }
        if (filters.status) {
          searchQuery = searchQuery.eq('status', filters.status);
        }
        if (filters.min_price !== undefined) {
          searchQuery = searchQuery.gte('price', filters.min_price);
        }
        if (filters.max_price !== undefined) {
          searchQuery = searchQuery.lte('price', filters.max_price);
        }
        if (filters.location_lat && filters.location_lng && filters.radius_km) {
          const latRange = filters.radius_km / 111;
          const lngRange = filters.radius_km / (111 * Math.cos(filters.location_lat * Math.PI / 180));
          
          searchQuery = searchQuery
            .gte('location_lat', filters.location_lat - latRange)
            .lte('location_lat', filters.location_lat + latRange)
            .gte('location_lng', filters.location_lng - lngRange)
            .lte('location_lng', filters.location_lng + lngRange);
        }
      }

      // Order by relevance (title matches first, then creation date)
      searchQuery = searchQuery.order('created_at', { ascending: false });

      // Apply pagination
      searchQuery = searchQuery.range(offset, offset + limit - 1);

      const { data: listings, error, count } = await searchQuery;

      if (error) {
        console.error('Search listings error:', error);
        return {
          success: false,
          error: 'Failed to search listings'
        };
      }

      const total = count || 0;
      const total_pages = Math.ceil(total / limit);

      const searchResponse: ListingSearchResponse = {
        listings: listings as Listing[],
        total,
        page,
        limit,
        total_pages,
        search_query: query
      };

      return {
        success: true,
        data: searchResponse,
        message: 'Search completed successfully'
      };

    } catch (error) {
      console.error('Search listings service error:', error);
      return {
        success: false,
        error: 'Internal server error during search'
      };
    }
  }

  /**
   * Get listing statistics for a user
   * @param userId - ID of the user
   * @returns API response with listing statistics
   */
  async getListingStats(userId: string): Promise<ApiResponse<ListingStats>> {
    try {
      // Get basic counts
      const { data: listings, error } = await supabaseAdmin
        .from('listings')
        .select('status, price')
        .eq('user_id', userId);

      if (error) {
        console.error('Get listing stats error:', error);
        return {
          success: false,
          error: 'Failed to fetch listing statistics'
        };
      }

      const stats = {
        total: listings.length,
        posted: listings.filter((l: any) => l.status === 'active').length,
        drafts: listings.filter((l: any) => l.status === 'draft').length,
        sold: listings.filter((l: any) => l.status === 'sold').length,
        inactive: listings.filter((l: any) => l.status === 'inactive').length,
        average_price: 0,
        total_value: 0
      };

      // Calculate average price and total value
      const prices = listings.filter((l: any) => l.status === 'active').map((l: any) => l.price);
      if (prices.length > 0) {
        stats.average_price = prices.reduce((sum: number, price: number) => sum + price, 0) / prices.length;
        stats.total_value = prices.reduce((sum: number, price: number) => sum + price, 0);
      }

      return {
        success: true,
        data: stats,
        message: 'Listing statistics retrieved successfully'
      };

    } catch (error) {
      console.error('Get listing stats service error:', error);
      return {
        success: false,
        error: 'Internal server error during statistics retrieval'
      };
    }
  }

  /**
   * Validate listing creation data
   * @param data - Data to validate
   * @returns Validation result
   */
  validateListingData(data: CreateListingRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic field validation
    if (!data.title || data.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters long');
    }
    if (!data.description || data.description.trim().length < 10) {
      errors.push('Description must be at least 10 characters long');
    }
    if (typeof data.price !== 'number' || data.price < 0) {
      errors.push('Price must be a positive number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const listingService = new ListingService();
export default listingService;