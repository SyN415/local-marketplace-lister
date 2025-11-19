import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listingsAPI } from '../services/api';
import { listingKeys } from '../lib/query-keys';
import type { DashboardStats, RecentListing, DashboardQueryOptions } from '../types/dashboard';

/**
 * Hook to get dashboard statistics
 * 
 * @param options Query options (refresh interval, retry count, etc.)
 * @returns Query object with dashboard statistics and states
 */
export const useDashboardStats = (options?: DashboardQueryOptions) => {
  const {
    refreshInterval = 5 * 60 * 1000, // 5 minutes
    retry = 3,
    staleTime = 5 * 60 * 1000, // 5 minutes
  } = options || {};

  return useQuery({
    queryKey: listingKeys.stats,
    queryFn: async (): Promise<DashboardStats> => {
      try {
        const stats = await listingsAPI.getListingStats();
        
        // Transform backend data to match DashboardStats interface
        return {
          totalListings: stats.totalListings || 0,
          postedListings: stats.activeListings || 0,
          draftListings: (stats.totalListings || 0) - (stats.activeListings || 0) - (stats.soldListings || 0),
          soldListings: stats.soldListings || 0,
          totalValue: stats.totalValue || 0,
          categoryBreakdown: stats.categoryBreakdown || {},
        };
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        throw error;
      }
    },
    staleTime,
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchInterval: refreshInterval,
  });
};

/**
 * Hook to get recent listings for dashboard
 * 
 * @param limit Number of recent listings to fetch (default: 5)
 * @param options Query options
 * @returns Query object with recent listings data
 */
export const useRecentListings = (
  limit: number = 5,
  options?: DashboardQueryOptions
) => {
  const {
    retry = 2,
    staleTime = 2 * 60 * 1000, // 2 minutes
    refreshInterval = 10 * 60 * 1000, // 10 minutes
  } = options || {};

  return useQuery({
    queryKey: listingKeys.featured(limit),
    queryFn: async (): Promise<RecentListing[]> => {
      try {
        const response = await listingsAPI.getListings({
          limit,
          page: 1,
        });

        // Transform listings to recent listings format
        return (response.listings || []).map((listing): RecentListing => ({
          id: listing.id,
          title: listing.title,
          price: listing.price,
          status: listing.status,
          createdAt: listing.createdAt,
          category: listing.category,
          images: listing.images,
        }));
      } catch (error) {
        console.error('Failed to fetch recent listings:', error);
        throw error;
      }
    },
    staleTime,
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
    refetchInterval: refreshInterval,
  });
};

/**
 * Combined hook for dashboard data
 * Provides both stats and recent listings in a single hook
 * 
 * @param recentListingsLimit Number of recent listings to show (default: 5)
 * @param options Query options for both stats and recent listings
 * @returns Object containing both stats and recent listings queries
 */
export const useDashboard = (
  recentListingsLimit: number = 5,
  options?: DashboardQueryOptions
) => {
  const statsQuery = useDashboardStats(options);
  const recentListingsQuery = useRecentListings(recentListingsLimit, options);

  return {
    // Stats data and states
    stats: statsQuery.data,
    isLoadingStats: statsQuery.isLoading,
    statsError: statsQuery.error,
    statsRefetch: statsQuery.refetch,

    // Recent listings data and states
    recentListings: recentListingsQuery.data || [],
    isLoadingRecentListings: recentListingsQuery.isLoading,
    recentListingsError: recentListingsQuery.error,
    recentListingsRefetch: recentListingsQuery.refetch,

    // Combined states
    isLoading: statsQuery.isLoading || recentListingsQuery.isLoading,
    isInitialLoad: statsQuery.isLoading && recentListingsQuery.isLoading,
    hasError: !!(statsQuery.error || recentListingsQuery.error),
    
    // Error details
    errors: {
      statsError: statsQuery.error,
      recentListingsError: recentListingsQuery.error,
    },

    // Refetch all dashboard data
    refetch: () => {
      statsQuery.refetch();
      recentListingsQuery.refetch();
    },

    // Query helpers
    isStale: statsQuery.isStale || recentListingsQuery.isStale,
    isRefetching: statsQuery.isRefetching || recentListingsQuery.isRefetching,
  };
};

/**
 * Helper hook for refreshing dashboard data
 * Provides a simple refresh function for components
 */
export const useRefreshDashboard = () => {
  const statsQuery = useDashboardStats();
  const recentListingsQuery = useRecentListings();

  return {
    refreshStats: statsQuery.refetch,
    refreshRecentListings: recentListingsQuery.refetch,
    refreshAll: () => {
      statsQuery.refetch();
      recentListingsQuery.refetch();
    },
    isRefreshing: statsQuery.isRefetching || recentListingsQuery.isRefetching,
  };
};

/**
 * Hook for manual dashboard data refresh
 * Use this when user performs actions that should update dashboard
 */
export const useManualDashboardRefresh = () => {
  const queryClient = useQueryClient();

  const refreshDashboard = async () => {
    try {
      // Invalidate specific query keys
      await queryClient.invalidateQueries({
        queryKey: ['listings', 'stats'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['listings', 'featured'],
      });
      // Also invalidate general listings queries
      await queryClient.invalidateQueries({
        queryKey: ['listings'],
      });
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
      throw error;
    }
  };

  return {
    refreshDashboard,
    isRefreshing: false, // Simplified for now
  };
};