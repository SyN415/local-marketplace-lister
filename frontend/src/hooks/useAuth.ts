import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authAPI } from '../services/api';
import { authKeys } from '../lib/query-keys';
import { setSupabaseSession } from '../lib/supabase';
import type { User } from '../types';

/**
 * Hook to login user
 *
 * @returns Mutation object with login function and states
 */
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authAPI.login(email, password),
    
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: authKeys.currentUser });
      
      // Snapshot previous value
      const previousUser = queryClient.getQueryData<User | null>(authKeys.currentUser);
      
      // Optimistically update user state
      queryClient.setQueryData(authKeys.currentUser, null); // Set to null while logging in
      
      return { previousUser };
    },

    onSuccess: (data) => {
      // Store token and user in localStorage
      localStorage.setItem('auth_token', data.token);
      
      if (data.supabaseAccessToken) {
        localStorage.setItem('supabase_access_token', data.supabaseAccessToken);
      }
      
      if (data.refreshToken) {
        localStorage.setItem('supabase_refresh_token', data.refreshToken);
      }
      
      // Initialize Supabase session
      if (data.supabaseAccessToken && data.refreshToken) {
        setSupabaseSession(data.supabaseAccessToken, data.refreshToken);
      }

      // Ensure credits are present, default to 0 if missing
      const userWithCredits = {
        ...data.user,
        credits: data.user.credits ?? 0
      };
      localStorage.setItem('user', JSON.stringify(userWithCredits));
      
      // Update current user query
      queryClient.setQueryData(authKeys.currentUser, userWithCredits);
      
      console.log('✅ User logged in successfully');
    },

    onError: (error, _variables, context) => {
      // Rollback to previous user state
      if (context?.previousUser !== undefined) {
        queryClient.setQueryData(authKeys.currentUser, context.previousUser);
      }
      
      console.error('❌ Login failed:', error);
    },

    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser });
    },
  });
};

/**
 * Hook to signup user
 * 
 * @returns Mutation object with signup function and states
 */
export const useSignup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      email, 
      password, 
      fullName 
    }: { 
      email: string; 
      password: string; 
      fullName?: string 
    }) => authAPI.signup(email, password, fullName),
    
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: authKeys.currentUser });
      
      // Snapshot previous value
      const previousUser = queryClient.getQueryData<User | null>(authKeys.currentUser);
      
      // Set loading state
      queryClient.setQueryData(authKeys.currentUser, null);
      
      return { previousUser };
    },

    onSuccess: (data) => {
      // Store token and user in localStorage
      localStorage.setItem('auth_token', data.token);
      
      if (data.supabaseAccessToken) {
        localStorage.setItem('supabase_access_token', data.supabaseAccessToken);
      }
      
      if (data.refreshToken) {
        localStorage.setItem('supabase_refresh_token', data.refreshToken);
      }
      
      // Initialize Supabase session
      if (data.supabaseAccessToken && data.refreshToken) {
        setSupabaseSession(data.supabaseAccessToken, data.refreshToken);
      }
      
      // Ensure credits are present, default to 0 if missing
      const userWithCredits = {
        ...data.user,
        credits: data.user.credits ?? 0
      };
      localStorage.setItem('user', JSON.stringify(userWithCredits));
      
      // Update current user query
      queryClient.setQueryData(authKeys.currentUser, userWithCredits);
      
      console.log('✅ User signed up successfully');
    },

    onError: (error, _variables, context) => {
      // Rollback to previous user state
      if (context?.previousUser !== undefined) {
        queryClient.setQueryData(authKeys.currentUser, context.previousUser);
      }
      
      console.error('❌ Signup failed:', error);
    },

    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser });
    },
  });
};

/**
 * Hook to logout user
 *
 * @returns Mutation object with logout function and states
 */
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authAPI.logout(),
    
    onMutate: async () => {
      // Clear all queries immediately for instant UI response
      queryClient.clear();
      
      // Clear localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('supabase_access_token');
      localStorage.removeItem('supabase_refresh_token');
      localStorage.removeItem('user');
    },

    onSuccess: () => {
      console.log('✅ User logged out successfully');
    },

    onError: (error) => {
      // Even if logout fails, clear local state
      queryClient.clear();
      localStorage.removeItem('auth_token');
      localStorage.removeItem('supabase_access_token');
      localStorage.removeItem('supabase_refresh_token');
      localStorage.removeItem('user');
      
      console.error('❌ Logout failed:', error);
    },
  });
};

/**
 * Hook to get current user
 *
 * @returns Query object with user data and states
 *
 * This hook will:
 * - Check localStorage first for cached user data
 * - Make API call to verify token validity
 * - Handle authentication state changes
 * - Automatically refresh on window focus
 */
export const useCurrentUser = () => {
  return useQuery({
    queryKey: authKeys.currentUser,
    
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const cachedUser = localStorage.getItem('user');
      
      if (!token) {
        // No token available, return null
        return null;
      }

      // Ensure Supabase session is initialized if we have tokens
      const supabaseAccessToken = localStorage.getItem('supabase_access_token');
      const supabaseRefreshToken = localStorage.getItem('supabase_refresh_token');
      
      if (supabaseAccessToken && supabaseRefreshToken) {
        setSupabaseSession(supabaseAccessToken, supabaseRefreshToken);
      }
      
      // If we have a cached user, use it for immediate UI update
      if (cachedUser) {
        try {
          const user = JSON.parse(cachedUser);
          
          // Return cached user immediately
          // Background validation removed to prevent infinite loop
          // Token validation happens via refetchInterval or manual refetch
          
          return user;
        } catch {
          // Invalid JSON in localStorage, clear it
          localStorage.removeItem('user');
        }
      }
      
      // Make API call to get current user
      const user = await authAPI.getCurrentUser();
      
      // Cache the user data
      localStorage.setItem('user', JSON.stringify(user));
      
      return user;
    },
    
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors
      if (error?.response?.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('supabase_access_token');
        localStorage.removeItem('supabase_refresh_token');
        localStorage.removeItem('user');
        return false;
      }
      return failureCount < 2;
    },

    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    
    enabled: () => {
      // Only run query if we have a token
      const token = localStorage.getItem('auth_token');
      return !!token;
    },
  });
};

/**
 * Hook to update user profile
 * 
 * @returns Mutation object with update function and states
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<User>) => authAPI.updateProfile(updates),
    
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: authKeys.currentUser });
      
      // Snapshot previous value
      const previousUser = queryClient.getQueryData<User | null>(authKeys.currentUser);
      
      if (previousUser) {
        // Optimistically update user data
        const optimisticUser = { ...previousUser, ...updates };
        queryClient.setQueryData(authKeys.currentUser, optimisticUser);
        
        // Update localStorage
        localStorage.setItem('user', JSON.stringify(optimisticUser));
      }
      
      return { previousUser };
    },

    onSuccess: (updatedUser) => {
      // Update with actual server response
      queryClient.setQueryData(authKeys.currentUser, updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      console.log('✅ Profile updated successfully');
    },

    onError: (error, _updates, context) => {
      // Rollback to previous user state
      if (context?.previousUser !== undefined) {
        queryClient.setQueryData(authKeys.currentUser, context.previousUser);
        localStorage.setItem('user', JSON.stringify(context.previousUser));
      }
      
      console.error('❌ Profile update failed:', error);
    },

    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser });
    },
  });
};

/**
 * Hook to check if user is authenticated
 * 
 * @returns Boolean indicating authentication status
 */
export const useIsAuthenticated = () => {
  const { data: user, isLoading } = useCurrentUser();
  
  return {
    isAuthenticated: !!user && !isLoading,
    isLoading,
    user,
  };
};

/**
 * Hook for authentication state management
 * Combines multiple auth hooks for convenience
 * 
 * @returns Authentication state and methods
 */
export const useAuth = () => {
  const loginMutation = useLogin();
  const signupMutation = useSignup();
  const logoutMutation = useLogout();
  const updateProfileMutation = useUpdateProfile();
  const currentUserQuery = useCurrentUser();

  return {
    // Data
    user: currentUserQuery.data,
    isAuthenticated: !!currentUserQuery.data && !currentUserQuery.isLoading,
    
    // Loading states
    isLoading: currentUserQuery.isLoading,
    isLoggingIn: loginMutation.isPending,
    isSigningUp: signupMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isUpdatingProfile: updateProfileMutation.isPending,
    
    // Error states
    loginError: loginMutation.error,
    signupError: signupMutation.error,
    logoutError: logoutMutation.error,
    updateProfileError: updateProfileMutation.error,
    userError: currentUserQuery.error,
    
    // Mutation functions
    login: loginMutation.mutate,
    signup: signupMutation.mutate,
    logout: logoutMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    
    // Utilities
    clearErrors: () => {
      loginMutation.reset();
      signupMutation.reset();
      logoutMutation.reset();
      updateProfileMutation.reset();
    },
    
    refetchUser: currentUserQuery.refetch,
  };
};