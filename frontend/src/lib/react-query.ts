import { QueryClient } from '@tanstack/react-query';

/**
 * React Query client configuration for the marketplace application
 *
 * This configuration sets up:
 * - Default query and mutation options
 * - Cache management and stale time settings
 * - Retry policies for failed requests
 * - Error handling and logging
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /** How long data remains fresh (5 minutes) */
      staleTime: 1000 * 60 * 5,
      
      /** How long unused data stays in cache (10 minutes) */
      gcTime: 1000 * 60 * 10,
      
      /** Number of retry attempts for failed queries */
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500) {
            return false;
          }
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      
      /** Retry delay increases exponentially */
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      /** Refetch data when window gets focus */
      refetchOnWindowFocus: false,
      
      /** Refetch data when reconnecting */
      refetchOnReconnect: true,
      
      /** Don't refetch on mount if data is fresh */
      refetchOnMount: false,
    },
    
    mutations: {
      /** Number of retry attempts for failed mutations */
      retry: 1,
      
      /** Don't retry mutations by default */
      retryDelay: 1000,
    },
  },
});

/**
 * Query configuration for listing-related queries
 * Listings can be cached for longer as they don't change frequently
 */
export const listingQueryOptions = {
  staleTime: 1000 * 60 * 10, // 10 minutes
  gcTime: 1000 * 60 * 30, // 30 minutes
  refetchOnWindowFocus: false,
};

/**
 * Query configuration for user data
 * User data should be more frequently updated
 */
export const userQueryOptions = {
  staleTime: 1000 * 60 * 2, // 2 minutes
  gcTime: 1000 * 60 * 15, // 15 minutes
  refetchOnWindowFocus: true,
};

/**
 * Mutation configuration for optimistic updates
 * Used for creating, updating, and deleting listings
 */
export const optimisticMutationOptions = {
  onMutate: async (variables: any) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries();
    
    // Snapshot previous value
    const previousData = queryClient.getQueryData(variables.queryKey);
    
    return { previousData };
  },
  
  onError: (_err: any, variables: any, context: any) => {
    // Rollback on error
    if (context?.previousData) {
      queryClient.setQueryData(variables.queryKey, context.previousData);
    }
  },
  
  onSettled: (_data: any, _error: any, variables: any) => {
    // Always refetch after error or success
    queryClient.invalidateQueries({ queryKey: variables.queryKey });
  },
};