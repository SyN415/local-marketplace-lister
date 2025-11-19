import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { listingsAPI } from '../services/api';
import { listingKeys } from '../lib/query-keys';
import type { Listing, ListingFormData, ListingFilters } from '../types';
import type {
  ListingsListItem,
  ListingsFilters as ExtendedListingsFilters,
  ListingsSortOptions,
  ListingsQueryParams,
  ListingsPagination,
  ListingsLoadingStates,
  ListingsErrorStates,
  UseListingsResult,
} from '../types/listings';

/**
 * Hook to get all listings with pagination and filters
 * 
 * @param options Pagination and filter options
 * @returns Query object with listings data and states
 */
export const useGetListings = (options?: {
  page?: number;
  limit?: number;
  category?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
}) => {
  return useQuery({
    queryKey: listingKeys.all(options),
    queryFn: () => listingsAPI.getListings(options),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

/**
 * Hook to get single listing by ID
 * 
 * @param id Listing ID
 * @returns Query object with listing data and states
 */
export const useGetListing = (id: string) => {
  return useQuery({
    queryKey: listingKeys.detail(id),
    queryFn: () => listingsAPI.getListing(id),
    enabled: !!id, // Only run if ID is provided
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: (failureCount, error: any) => {
      // Don't retry if listing not found
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

/**
 * Hook to get current user's listings
 * 
 * @param userId User ID (defaults to current user from localStorage)
 * @param filters Additional filters
 * @returns Query object with user's listings data
 */
export const useGetMyListings = (userId?: string, filters?: ListingFilters) => {
  const resolvedUserId = userId || JSON.parse(localStorage.getItem('user') || '{}')?.id;
  
  return useQuery({
    queryKey: listingKeys.mine(resolvedUserId, filters),
    queryFn: () => listingsAPI.getListings({ ...filters }),
    enabled: !!resolvedUserId, // Only run if user ID is available
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook to create new listing
 * 
 * @returns Mutation object with create function and states
 */
export const useCreateListing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ListingFormData) => listingsAPI.createListing(data),
    
    onMutate: async (_newListing) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries();
      
      // Get current user ID for user's listings
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = currentUser?.id;
      
      // Snapshot previous values
      const previousListings = queryClient.getQueryData(listingKeys.all());
      const previousMyListings = userId ? queryClient.getQueryData(listingKeys.mine(userId)) : null;
      
      return {
        previousListings,
        previousMyListings,
        userId,
        tempListingId: 'temp-' + Date.now()
      };
    },

    onSuccess: (createdListing, _variables, context) => {
      console.log('✅ Listing created successfully');
      
      // Update all listings cache
      const allListingsKey = listingKeys.all();
      queryClient.setQueryData(allListingsKey, (old: any) => {
        if (!old) return { listings: [createdListing], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } };
        const listings = old.listings?.map((listing: Listing) =>
          listing.id.startsWith('temp-') ? createdListing : listing
        ) || [createdListing];
        return { ...old, listings };
      });
      
      // Update user's listings cache
      if (context?.userId) {
        const myListingsKey = listingKeys.mine(context.userId);
        queryClient.setQueryData(myListingsKey, (old: any) => {
          if (!old) return { listings: [createdListing], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } };
          const listings = old.listings?.map((listing: Listing) =>
            listing.id.startsWith('temp-') ? createdListing : listing
          ) || [createdListing];
          return { ...old, listings };
        });
      }
    },

    onError: (error, _variables, context) => {
      console.error('❌ Failed to create listing:', error);
      
      // Rollback to previous values
      if (context?.previousListings) {
        queryClient.setQueryData(listingKeys.all(), context.previousListings);
      }
      
      if (context?.previousMyListings && context.userId) {
        queryClient.setQueryData(listingKeys.mine(context.userId), context.previousMyListings);
      }
    },

    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries();
    },
  });
};

/**
 * Hook to update existing listing
 * 
 * @param id Listing ID
 * @returns Mutation object with update function and states
 */
export const useUpdateListing = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<ListingFormData>) => listingsAPI.updateListing(id, data),
    
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries();
      
      // Snapshot previous value
      const previousListing = queryClient.getQueryData<Listing>(listingKeys.detail(id));
      
      if (previousListing) {
        // Optimistically update the listing
        const optimisticListing = { ...previousListing, ...updates };
        queryClient.setQueryData(listingKeys.detail(id), optimisticListing);
      }
      
      return { previousListing };
    },

    onSuccess: (_updatedListing) => {
      console.log('✅ Listing updated successfully');
    },

    onError: (error, _variables, context) => {
      console.error('❌ Failed to update listing:', error);
      
      // Rollback to previous listing
      if (context?.previousListing) {
        queryClient.setQueryData(listingKeys.detail(id), context.previousListing);
      }
    },

    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries();
    },
  });
};

/**
 * Hook to delete listing
 *
 * @param id Listing ID
 * @returns Mutation object with delete function and states
 */
export const useDeleteListing = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => listingsAPI.deleteListing(id),
    
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries();
      
      // Remove from cache immediately
      queryClient.removeQueries({ queryKey: listingKeys.detail(id) });
    },

    onSuccess: () => {
      console.log('✅ Listing deleted successfully');
    },

    onError: (error) => {
      console.error('❌ Failed to delete listing:', error);
    },

    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries();
    },
  });
};

/**
 * Hook to get listing statistics
 *
 * @returns Query object with statistics data
 */
export const useListingStats = () => {
  return useQuery({
    queryKey: listingKeys.stats,
    queryFn: () => listingsAPI.getListingStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to search listings
 *
 * @param query Search query string
 * @param filters Additional filters
 * @returns Query object with search results
 */
export const useSearchListings = (query: string, filters?: ListingFilters) => {
  return useQuery({
    queryKey: listingKeys.search(query, filters),
    queryFn: () => listingsAPI.searchListings(query, filters),
    enabled: !!query.trim(), // Only run if query is not empty
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

/**
 * Combined hook for comprehensive listing operations
 * Provides all listing-related hooks in one convenient interface
 *
 * @param defaultOptions Default options for hooks
 * @returns Object with all listing hooks and their states
 */
export const useListingOperations = (defaultOptions?: {
  page?: number;
  limit?: number;
  category?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
}) => {
  const listingsQuery = useGetListings(defaultOptions);
  const statsQuery = useListingStats();
  const createMutation = useCreateListing();

  return {
    // Queries
    listings: listingsQuery.data?.listings || [],
    pagination: listingsQuery.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 },
    stats: statsQuery.data,
    searchResults: [],
    
    // Query states
    isLoadingListings: listingsQuery.isLoading,
    isLoadingStats: statsQuery.isLoading,
    isSearching: false,
    listingsError: listingsQuery.error,
    statsError: statsQuery.error,
    searchError: null,
    
    // Mutation states
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    isUpdating: false,
    isDeleting: false,
    
    // Mutation functions
    createListing: createMutation.mutate,
    updateListing: (_id: string, _data: Partial<ListingFormData>) => {
      console.warn('useUpdateListing should be called separately');
    },
    deleteListing: (_id: string) => {
      console.warn('useDeleteListing should be called separately');
    },
    
    // Search function
    searchListings: (_query: string, _filters?: ListingFilters) => {
      console.warn('useSearchListings should be called separately');
    },
    
    // Utilities
    clearErrors: () => {
      createMutation.reset();
    },
    
    refetchListings: listingsQuery.refetch,
    refetchStats: statsQuery.refetch,
  };
};
/**
 * Comprehensive hook for managing listings with filters, sorting, and pagination
 * Provides complete state management for listings functionality
 * 
 * @param options Initial options for listings management
 * @returns Object with all listings state and management functions
 */
export const useListings = (options?: {
  initialFilters?: ExtendedListingsFilters;
  initialSort?: ListingsSortOptions;
  defaultLimit?: number;
  enableSearch?: boolean;
}): UseListingsResult => {
  // const queryClient = useQueryClient();
  
  // State management
  const [filters, setFiltersState] = useState<ExtendedListingsFilters>(options?.initialFilters || {});
  const [sort, setSortState] = useState<ListingsSortOptions>(
    options?.initialSort || { sortBy: 'createdAt', sortOrder: 'desc' }
  );
  const [pagination, setPagination] = useState<ListingsPagination>({
    page: 1,
    limit: options?.defaultLimit || 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // Loading and error states
  const [loading, setLoading] = useState<ListingsLoadingStates>({
    initial: true,
    loading: false,
    searching: false,
    filtering: false,
    sorting: false,
    pagination: false,
  });

  const [errors, setErrors] = useState<ListingsErrorStates>({
    general: null,
    search: null,
    filter: null,
    pagination: null,
  });

  // Current listings data
  const [listings, setListings] = useState<ListingsListItem[]>([]);

  // Prepare query parameters
  const queryParams: ListingsQueryParams = {
    ...filters,
    sortBy: sort.sortBy,
    sortOrder: sort.sortOrder,
    page: pagination.page,
    limit: pagination.limit,
  };

  // Main query for listings
  const listingsQuery = useQuery({
    queryKey: listingKeys.all(queryParams),
    queryFn: async () => {
      try {
        setLoading(prev => ({ ...prev, loading: true, initial: false }));
        setErrors(prev => ({ ...prev, general: null }));
        
        // Transform API response to our format
        const apiResponse = await listingsAPI.getListings({
          page: queryParams.page,
          limit: queryParams.limit,
          category: filters.category,
          condition: filters.condition,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          location: filters.location,
        });

        // Transform listings to our format
        const transformedListings: ListingsListItem[] = apiResponse.listings.map(listing => ({
          ...listing,
          imageUrl: listing.images?.[0],
          isOwner: false, // Will be set by context or props
          daysSinceCreated: Math.floor(
            (new Date().getTime() - new Date(listing.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          ),
        }));

        setListings(transformedListings);
        setPagination(prev => ({
          ...prev,
          ...apiResponse.pagination,
          hasNextPage: apiResponse.pagination.page < apiResponse.pagination.totalPages,
          hasPreviousPage: apiResponse.pagination.page > 1,
        }));

        return apiResponse;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to fetch listings');
        setErrors(prev => ({ ...prev, general: err }));
        throw err;
      } finally {
        setLoading(prev => ({ ...prev, loading: false }));
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: (failureCount, error) => {
      if (failureCount < 3 && !error?.message?.includes('404')) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<ExtendedListingsFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    setErrors(prev => ({ ...prev, filter: null }));
  }, []);

  // Update sort
  const updateSort = useCallback((newSort: Partial<ListingsSortOptions>) => {
    setSortState(prev => ({ ...prev, ...newSort }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    setErrors(prev => ({ ...prev, sort: null }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFiltersState({});
    setPagination(prev => ({ ...prev, page: 1 }));
    setErrors(prev => ({ ...prev, filter: null, search: null }));
  }, []);

  // Reset to first page
  const resetPage = useCallback(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Search listings
  const searchListings = useCallback((query: string) => {
    updateFilters({ searchQuery: query });
  }, [updateFilters]);

  // Refetch listings
  const refetch = useCallback(() => {
    listingsQuery.refetch();
  }, [listingsQuery]);

  return {
    // Data
    listings,
    pagination,
    filters,
    sort,
    
    // Loading states
    loading,
    
    // Error states
    errors,
    
    // Actions
    updateFilters,
    updateSort,
    clearFilters,
    resetPage,
    refetch,
    searchListings,
  };
};

/**
 * Hook for bulk operations on listings
 * 
 * @returns Object with bulk operation functions and states
 */
export const useBulkActions = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPerforming, setIsPerforming] = useState(false);
  const queryClient = useQueryClient();

  // Delete multiple listings
  const deleteListings = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => listingsAPI.deleteListing(id)));
    },
    onSuccess: () => {
      // Invalidate all listing queries
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      setSelectedIds([]);
    },
  });

  // Bulk actions
  const performBulkAction = useCallback(async (actionId: string, ids: string[]) => {
    setIsPerforming(true);
    try {
      switch (actionId) {
        case 'delete':
          await deleteListings.mutateAsync(ids);
          break;
        default:
          throw new Error(`Unknown bulk action: ${actionId}`);
      }
    } finally {
      setIsPerforming(false);
    }
  }, [deleteListings]);

  return {
    selectedIds,
    isPerforming,
    selectListing: (id: string) => {
      setSelectedIds(prev => [...prev, id]);
    },
    deselectListing: (id: string) => {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    },
    selectAll: (ids: string[]) => {
      setSelectedIds(ids);
    },
    clearSelection: () => {
      setSelectedIds([]);
    },
    performBulkAction,
  };
};

/**
 * Hook for managing listing favorites
 * 
 * @returns Object with favorite management functions
 */
export const useListingFavorites = () => {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  // const queryClient = useQueryClient();

  // Load favorites from localStorage or API
  useEffect(() => {
    const favorites = localStorage.getItem('listing-favorites');
    if (favorites) {
      try {
        const favoriteList = JSON.parse(favorites);
        setFavoriteIds(new Set(favoriteList));
      } catch (error) {
        console.error('Failed to parse favorites from localStorage:', error);
      }
    }
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('listing-favorites', JSON.stringify(Array.from(favoriteIds)));
  }, [favoriteIds]);

  const toggleFavorite = useCallback((listingId: string) => {
    setFavoriteIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(listingId)) {
        newSet.delete(listingId);
      } else {
        newSet.add(listingId);
      }
      return newSet;
    });
  }, []);

  const isFavorite = useCallback((listingId: string) => {
    return favoriteIds.has(listingId);
  }, [favoriteIds]);

  const addFavorite = useCallback((listingId: string) => {
    setFavoriteIds(prev => new Set([...prev, listingId]));
  }, []);

  const removeFavorite = useCallback((listingId: string) => {
    setFavoriteIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(listingId);
      return newSet;
    });
  }, []);

  return {
    favoriteIds: Array.from(favoriteIds),
    toggleFavorite,
    isFavorite,
    addFavorite,
    removeFavorite,
  };
};