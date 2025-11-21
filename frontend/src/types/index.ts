export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  stripeCustomerId?: string;
  credits: number;
}

export interface Listing {
  id: string;
  title: string;
  description?: string;
  price: number;
  category: string;
  condition: string;
  images?: string[];
  userId: string;
  location?: string;
  status: 'active' | 'sold' | 'expired';
  createdAt: string;
  updatedAt: string;
}

export interface ListingFormData {
  title: string;
  description?: string;
  price: number;
  category: string;
  condition: string;
  images?: File[];
  location?: {
    address?: string;
    city: string;
    state: string;
    zipCode: string;
    distance?: number;
    latitude?: number;
    longitude?: number;
  };
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface ListingFilters {
  category?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  searchQuery?: string;
}

export type MarketplacePlatform = 'facebook' | 'offerup' | 'craigslist';

export interface MarketplaceConnection {
  id: string;
  userId: string;
  platform: MarketplacePlatform;
  credentials?: Record<string, any>;
  isActive: boolean;
  connectedAt: string;
  metadata?: Record<string, any>;
}

export interface CreateConnectionData {
  platform: MarketplacePlatform;
  credentials: Record<string, any>;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface PostingJob {
  id: string;
  listing_id: string;
  user_id: string;
  platform: MarketplacePlatform;
  status: JobStatus;
  result_data: any;
  error_log: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
  listings?: {
    title: string;
  };
}

export type SortOption = 'newest' | 'oldest' | 'price-low' | 'price-high';