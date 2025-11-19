import React, { createContext, useContext, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { handleApiError } from '../services/api';
import { redirectAfterLogin } from '../utils/auth';
import type { User } from '../types';

// Extended auth state from React Query hooks
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  
  // Loading states
  isLoading: boolean;
  isLoggingIn: boolean;
  isSigningUp: boolean;
  isLoggingOut: boolean;
  isUpdatingProfile: boolean;
  
  // Error states
  loginError: Error | null;
  signupError: Error | null;
  logoutError: Error | null;
  updateProfileError: Error | null;
  userError: Error | null;
}

// Auth actions
interface AuthActions {
  login: (credentials: { email: string; password: string; rememberMe?: boolean }) => void;
  signup: (credentials: { email: string; password: string; fullName?: string }) => void;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  clearErrors: () => void;
  refetchUser: () => void;
}

// Combined auth context value
interface AuthContextValue extends AuthState, AuthActions {}

// Create context with default values
const AuthContext = createContext<AuthContextValue | null>(null);

// Default context values (when not authenticated)

// Auth Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  
  // Get authentication state and actions from React Query hooks
  const authState = useAuth();
  
  // Handle successful login - use closure to access latest authState
  const handleLogin = useCallback((credentials: { email: string; password: string; rememberMe?: boolean }) => {
    authState.login(credentials);
  }, []); // Empty deps - relies on closure
  
  // Handle successful signup - use closure to access latest authState
  const handleSignup = useCallback((credentials: { email: string; password: string; fullName?: string }) => {
    authState.signup(credentials);
  }, []); // Empty deps - relies on closure
  
  // Handle logout with navigation - use closure to access latest authState
  const handleLogout = useCallback(() => {
    authState.logout();
    
    // Redirect to home page after logout
    navigate('/');
  }, [navigate]); // Only depend on stable navigate
  
  // Handle profile updates - use closure to access latest authState
  const handleUpdateProfile = useCallback((updates: Partial<User>) => {
    authState.updateProfile(updates);
  }, []); // Empty deps - relies on closure
  
  // Memoize clearErrors - use closure to access latest authState
  const handleClearErrors = useCallback(() => {
    authState.clearErrors();
  }, []); // Empty deps - relies on closure
  
  // Memoize refetchUser - use closure to access latest authState
  const handleRefetchUser = useCallback(() => {
    authState.refetchUser();
  }, []); // Empty deps - relies on closure
  
  // Handle login success (redirect after successful login)
  React.useEffect(() => {
    if (authState.isAuthenticated && authState.user) {
      // Get redirect URL from query params or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get('redirect') || localStorage.getItem('login_redirect') || '/';
      
      // Clean up redirect URL
      localStorage.removeItem('login_redirect');
      
      // Only redirect if not already on the target page
      if (window.location.pathname !== redirectTo && redirectTo !== window.location.pathname + window.location.search) {
        redirectAfterLogin(redirectTo);
      }
    }
  }, [authState.isAuthenticated, authState.user?.id]); // ✅ Use user.id (primitive) instead of user object
  
  // Handle login errors
  React.useEffect(() => {
    if (authState.loginError) {
      console.error('Login error:', authState.loginError);
      // Error handling is done in the Login component via the error state
    }
  }, [authState.loginError]);
  
  // Handle logout errors
  React.useEffect(() => {
    if (authState.logoutError) {
      console.error('Logout error:', authState.logoutError);
      // Even if logout fails on server, we clear local state
      // User should still be considered logged out
    }
  }, [authState.logoutError]);
  
  // Context value - memoized to prevent unnecessary re-renders
  const contextValue: AuthContextValue = useMemo(() => ({
    // Data
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    
    // Loading states
    isLoading: authState.isLoading,
    isLoggingIn: authState.isLoggingIn,
    isSigningUp: authState.isSigningUp,
    isLoggingOut: authState.isLoggingOut,
    isUpdatingProfile: authState.isUpdatingProfile,
    
    // Error states
    loginError: authState.loginError,
    signupError: authState.signupError,
    logoutError: authState.logoutError,
    updateProfileError: authState.updateProfileError,
    userError: authState.userError,
    
    // Actions
    login: handleLogin,
    signup: handleSignup,
    logout: handleLogout,
    updateProfile: handleUpdateProfile,
    clearErrors: handleClearErrors,
    refetchUser: handleRefetchUser,
  }), [
    // Only include primitive values and objects that change when actual data changes
    authState.user,
    authState.isAuthenticated,
    authState.isLoading,
    authState.isLoggingIn,
    authState.isSigningUp,
    authState.isLoggingOut,
    authState.isUpdatingProfile,
    authState.loginError,
    authState.signupError,
    authState.logoutError,
    authState.updateProfileError,
    authState.userError,
    // Include the stable callback references (they won't cause re-creation)
    handleLogin,
    handleSignup,
    handleLogout,
    handleUpdateProfile,
    handleClearErrors,
    handleRefetchUser,
  ]);
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuthContext = (): AuthContextValue => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  
  return context;
};

// Hook for authentication status only (for quick checks)
export const useAuthStatus = () => {
  const { isAuthenticated, isLoading } = useAuthContext();
  return { isAuthenticated, isLoading };
};

// Hook for current user only (for quick access)
export const useCurrentUser = () => {
  const { user } = useAuthContext();
  return user;
};

// Hook for authentication loading state
export const useAuthLoading = () => {
  const { isLoading, isLoggingIn, isSigningUp, isLoggingOut } = useAuthContext();
  return {
    isLoading,
    isLoggingIn,
    isSigningUp,
    isLoggingOut,
    isAuthenticating: isLoggingIn || isSigningUp,
  };
};

// Hook for authentication errors
export const useAuthErrors = () => {
  const {
    loginError,
    signupError,
    logoutError,
    updateProfileError,
    userError,
    clearErrors,
  } = useAuthContext();
  
  return {
    loginError,
    signupError,
    logoutError,
    updateProfileError,
    userError,
    clearErrors,
    getErrorMessage: (error: Error | null): string => {
      if (!error) return '';
      return handleApiError(error as any);
    },
  };
};

// Re-export useAuth hook from hooks directory for convenience
export { useAuth } from '../hooks/useAuth';