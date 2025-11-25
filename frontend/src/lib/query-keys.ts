import { type ListingFilters } from '../types';

/**
 * Query keys for React Query caching
 * 
 * This file defines all the query keys used throughout the application.
 * Following the convention of using arrays for query keys for better
 * invalidation granularity and automatic cache management.
 */

/**
 * Authentication query keys
 */
export const authKeys = {
  /** Query key for current user data */
  currentUser: ['auth', 'me'] as const,
  
  /** Auth status check */
  status: ['auth', 'status'] as const,
} as const;

/**
 * User profile query keys
 */
export const userKeys = {
  /** User profile by ID */
  profile: (id: string) => ['user', 'profile', id] as const,
  
  /** User listings */
  userListings: (userId: string) => ['user', 'listings', userId] as const,
} as const;

/**
 * Listing query keys
 */
export const listingKeys = {
  /** All listings with filters and pagination */
  all: (filters?: {
    page?: number;
    limit?: number;
    category?: string;
    condition?: string;
    minPrice?: number;
    maxPrice?: number;
    location?: string;
  }) => {
    const key = ['listings'] as const;
    
    if (!filters) return key;
    
    // Only add filters that are defined
    const definedFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    return [...key, definedFilters] as const;
  },

  /** Single listing by ID */
  detail: (id: string) => ['listing', id] as const,
  
  /** User's own listings */
  mine: (userId: string, filters?: ListingFilters) => {
    const key = ['listings', 'mine', userId] as const;
    
    if (!filters) return key;
    
    const definedFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    return [...key, definedFilters] as const;
  },

  /** Listing statistics */
  stats: ['listings', 'stats'] as const,
  
  /** Search results */
  search: (query: string, filters?: ListingFilters) => {
    const key = ['listings', 'search', query] as const;
    
    if (!filters) return key;
    
    const definedFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    return [...key, definedFilters] as const;
  },

  /** Featured listings */
  featured: (limit?: number) => {
    const key = ['listings', 'featured'] as const;
    return limit ? [...key, { limit }] as const : key;
  },
} as const;

/**
 * Category query keys
 */
export const categoryKeys = {
  /** All categories */
  all: ['categories'] as const,
  
  /** Category listings */
  listings: (category: string) => ['categories', category] as const,
} as const;
/**
 * Email query keys
 */
export const emailKeys = {
  stats: ['email', 'stats'] as const,
} as const;

/**
 * Combined query key factory
 * Helper to generate query keys based on common patterns
 */
export const createQueryKeys = {
  /**
   * Create pagination-aware query keys
   */
  withPagination: (base: readonly unknown[], page?: number, limit?: number) => {
    if (page !== undefined || limit !== undefined) {
      return [...base, { page, limit }] as const;
    }
    return base;
  },

  /**
   * Create filter-aware query keys
   */
  withFilters: (base: readonly unknown[], filters?: Record<string, any>) => {
    if (!filters) return base;
    
    const definedFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    if (Object.keys(definedFilters).length === 0) return base;
    
    return [...base, definedFilters] as const;
  },

  /**
   * Create timestamp-aware query keys for real-time updates
   */
  withTimestamp: (base: readonly unknown[], timestamp?: number) => {
    if (!timestamp) return base;
    return [...base, { timestamp }] as const;
  },
};

/**
 * Query key helpers for cache invalidation
 */
export const invalidateQueries = {
  /** Invalidate all authentication queries */
  auth: () => ['auth'] as const,
  
  /** Invalidate user queries */
  user: () => ['user'] as const,
  
  /** Invalidate listing queries */
  listings: () => listingKeys.all(),
  
  /** Invalidate email stats */
  emailStats: () => emailKeys.stats,
  /** Invalidate specific listing */
  listing: (id: string) => [listingKeys.detail(id)[0], id] as const,
  
  /** Invalidate user's own listings */
  myListings: (userId: string) => [listingKeys.mine(userId)[0], userId] as const,
  
  /** Invalidate all data */
  all: () => ['*'] as const,
} as const;

/**
 * Type definitions for query key arrays
 * These help with TypeScript inference when using query keys
 */
export type AuthQueryKey = typeof authKeys.currentUser;
export type ListingQueryKey = ReturnType<typeof listingKeys.all>;
export type UserQueryKey = ReturnType<typeof userKeys.profile>;
export type SearchQueryKey = ReturnType<typeof listingKeys.search>;

/**
 * Helper to extract the base key from a query key array
 * Useful for invalidating related queries
 */
export const getQueryKeyBase = <T extends readonly unknown[]>(key: T): readonly unknown[] => {
  // Remove the last element if it's a filters object (has 'page', 'limit', etc.)
  if (key.length > 1 && typeof key[key.length - 1] === 'object' && key[key.length - 1] !== null) {
    return key.slice(0, -1);
  }
  return key;
};

/**
 * Helper to check if two query keys are related
 * Used for smart cache invalidation
 */
export const areQueryKeysRelated = <T extends readonly unknown[], U extends readonly unknown[]>(
  key1: T,
  key2: U
): boolean => {
  const base1 = getQueryKeyBase(key1);
  const base2 = getQueryKeyBase(key2);
  
  if (base1.length === 0 || base2.length === 0) return false;
  
  // Check if the first elements match
  return base1[0] === base2[0];
};

/**
 * Development helper to clear specific query caches
 * Only available in development mode
 */
export const clearQueryCache = (key: readonly unknown[]) => {
  if (import.meta.env.DEV) {
    console.log(`🧹 Clearing query cache for key:`, key);
    // This would be called from a React component with access to queryClient
    // import { queryClient } from '../lib/react-query';
    // queryClient.removeQueries({ queryKey: key });
  }
};