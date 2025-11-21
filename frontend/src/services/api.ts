import axios from 'axios';
import type { AxiosResponse, AxiosError } from 'axios';
import type { Listing, ListingFormData, User, ListingFilters } from '../types';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API base configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

console.log('🚀 API Base URL:', API_BASE_URL);

/**
 * Create Axios instance with default configuration
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to add authentication token
 */
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('📤 Request Error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling
 */
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`📥 API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    console.error('📥 API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });

    // Handle common HTTP errors
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Forbidden - user doesn't have permission
      console.warn('Access denied for this resource');
    } else if (error.response?.status && error.response.status >= 500) {
      // Server error - show user-friendly message
      console.error('Server error occurred');
    }

    return Promise.reject(error);
  }
);

/**
 * Auth API functions
 */
export const authAPI = {
  /**
   * Login user
   */
  login: async (email: string, password: string): Promise<{ user: User; token: string; supabaseAccessToken?: string }> => {
    const response = await api.post<ApiResponse<{ user: User; session: { access_token: string; supabase_access_token?: string } }>>('/api/auth/login', { email, password });
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Login failed');
    }

    return {
      user: response.data.data.user,
      token: response.data.data.session.access_token,
      supabaseAccessToken: response.data.data.session.supabase_access_token
    };
  },

  /**
   * Register new user
   */
  signup: async (email: string, password: string, fullName?: string): Promise<{ user: User; token: string; supabaseAccessToken?: string }> => {
    const response = await api.post<ApiResponse<{ user: User; session: { access_token: string; supabase_access_token?: string } }>>('/api/auth/signup', { email, password, fullName });
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Signup failed');
    }

    return {
      user: response.data.data.user,
      token: response.data.data.session.access_token,
      supabaseAccessToken: response.data.data.session.supabase_access_token
    };
  },

  /**
   * Get current user
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>('/api/auth/me');
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get current user');
    }

    return response.data.data;
  },

  /**
   * Logout user
   */
  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('supabase_access_token');
  },

  /**
   * Update user profile
   */
  updateProfile: async (updates: Partial<User>): Promise<User> => {
    const response = await api.put<ApiResponse<User>>('/api/auth/profile', updates);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update profile');
    }

    return response.data.data;
  },
};

/**
 * Listings API functions
 */
export const listingsAPI = {
  /**
   * Get all listings with pagination and filters
   */
  getListings: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    condition?: string;
    minPrice?: number;
    maxPrice?: number;
    location?: string;
  }): Promise<{
    listings: Listing[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> => {
    const response = await api.get<ApiResponse<{
      listings: Listing[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>>('/api/listings', { params });
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch listings');
    }

    return response.data.data;
  },

  /**
   * Get single listing by ID
   */
  getListing: async (id: string): Promise<Listing> => {
    const response = await api.get<ApiResponse<Listing>>(`/api/listings/${id}`);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch listing');
    }

    return response.data.data;
  },

  /**
   * Create new listing
   */
  createListing: async (data: ListingFormData): Promise<Listing> => {
    // TODO: Implement image upload to storage service
    // Currently sending empty array for images as backend expects URLs
    // and we don't have a storage service set up in this MVP yet.
    
    const payload = {
      title: data.title,
      description: data.description,
      price: data.price,
      category: data.category,
      condition: data.condition,
      images: [], // Backend expects string[] (URLs), not Files.
      location_lat: data.location?.latitude,
      location_lng: data.location?.longitude,
      location_address: [
        data.location?.address,
        data.location?.city,
        data.location?.state,
        data.location?.zipCode
      ].filter(Boolean).join(', '),
      status: 'active'
    };

    const response = await api.post<ApiResponse<Listing>>('/api/listings', payload);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to create listing');
    }

    return response.data.data;
  },

  /**
   * Update existing listing
   */
  updateListing: async (id: string, data: Partial<ListingFormData>): Promise<Listing> => {
    const payload: any = {};
    
    if (data.title) payload.title = data.title;
    if (data.description) payload.description = data.description;
    if (data.price) payload.price = data.price;
    if (data.category) payload.category = data.category;
    if (data.condition) payload.condition = data.condition;
    
    // Handle location
    if (data.location) {
      if (data.location.latitude) payload.location_lat = data.location.latitude;
      if (data.location.longitude) payload.location_lng = data.location.longitude;
      
      const addressParts = [
        data.location.address,
        data.location.city,
        data.location.state,
        data.location.zipCode
      ].filter(Boolean);
      
      if (addressParts.length > 0) {
        payload.location_address = addressParts.join(', ');
      }
    }

    // Handle images
    if (data.images) {
      // TODO: Upload new images and get URLs
      // payload.images = ...
    }

    const response = await api.put<ApiResponse<Listing>>(`/api/listings/${id}`, payload);
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update listing');
    }

    return response.data.data;
  },

  /**
   * Delete listing
   */
  deleteListing: async (id: string): Promise<void> => {
    await api.delete(`/api/listings/${id}`);
  },

  /**
   * Get listing statistics
   */
  getListingStats: async (): Promise<{
    totalListings: number;
    activeListings: number;
    soldListings: number;
    totalValue: number;
    categoryBreakdown: Record<string, number>;
  }> => {
    const response = await api.get<ApiResponse<{
      totalListings: number;
      activeListings: number;
      soldListings: number;
      totalValue: number;
      categoryBreakdown: Record<string, number>;
    }>>('/api/listings/stats');
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch stats');
    }

    return response.data.data;
  },

  /**
   * Search listings
   */
  searchListings: async (query: string, filters?: ListingFilters): Promise<Listing[]> => {
    const params = { q: query, ...filters };
    const response = await api.get<ApiResponse<Listing[]>>('/api/listings/search', { params });
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to search listings');
    }

    return response.data.data;
  },
  /**
   * Analyze image using AI
   */
  analyzeImage: async (file: File): Promise<{
    title?: string;
    description?: string;
    category?: string;
    condition?: string;
    price?: number;
  }> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post<ApiResponse<{
      title?: string;
      description?: string;
      category?: string;
      condition?: string;
      price?: number;
    }>>('/api/ai/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to analyze image');
    }

    return response.data.data;
  },
};

/**
 * Generic API error handler
 */
export const handleApiError = (error: AxiosError): string => {
  if (error.response) {
    // Server responded with error status
    const message = (error.response.data as any)?.message || error.message;
    return typeof message === 'string' ? message : 'An error occurred';
  } else if (error.request) {
    // Request was made but no response received
    return 'Network error - please check your connection';
  } else {
    // Something else happened
    return error.message || 'An unexpected error occurred';
  }
};

/**
 * Type-safe API response handler
 */
export const handleApiResponse = <T>(response: AxiosResponse<T>): T => {
  return response.data;
};