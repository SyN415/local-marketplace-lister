export interface Listing {
  id: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  images: string[];
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  status: 'draft' | 'active' | 'sold' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CreateListingRequest {
  title: string;
  description: string;
  price: number;
  category: string;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  images?: string[];
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  status?: 'draft' | 'active';
}

export interface UpdateListingRequest {
  title?: string;
  description?: string;
  price?: number;
  category?: string;
  condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  images?: string[];
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  status?: 'draft' | 'active' | 'sold' | 'inactive';
}

export interface ListingFilters {
  category?: string;
  condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  status?: 'draft' | 'active' | 'sold' | 'inactive';
  min_price?: number;
  max_price?: number;
  location_lat?: number;
  location_lng?: number;
  radius_km?: number;
}

export interface ListingStats {
  total: number;
  posted: number;
  drafts: number;
  sold: number;
  inactive: number;
  average_price: number;
  total_value: number;
}

export interface PaginatedListings {
  listings: Listing[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SearchListingsRequest {
  query: string;
  filters?: ListingFilters;
  page?: number;
  limit?: number;
}

export interface ListingSearchResponse {
  listings: Listing[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  search_query: string;
}

export const LISTING_CATEGORIES = [
  'electronics',
  'clothing',
  'home_garden',
  'automotive',
  'books',
  'sports',
  'toys',
  'furniture',
  'tools',
  'collectibles',
  'art',
  'music',
  'jewelry',
  'beauty',
  'health',
  'books_media',
  'other'
] as const;

export const LISTING_CONDITIONS = [
  'new',
  'like_new',
  'good',
  'fair',
  'poor'
] as const;

export const LISTING_STATUSES = [
  'draft',
  'active',
  'sold',
  'inactive'
] as const;