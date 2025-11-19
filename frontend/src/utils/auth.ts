import type { User } from '../types';

/**
 * Token management utilities
 */

// Token storage keys
export const TOKEN_KEYS = {
  TOKEN: 'auth_token',
  USER: 'user',
  REMEMBER_ME: 'remember_me',
} as const;

/**
 * Get stored authentication token
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEYS.TOKEN);
};

/**
 * Store authentication token
 */
export const setAuthToken = (token: string, rememberMe?: boolean): void => {
  localStorage.setItem(TOKEN_KEYS.TOKEN, token);
  
  if (rememberMe) {
    localStorage.setItem(TOKEN_KEYS.REMEMBER_ME, 'true');
  }
};

/**
 * Remove authentication token
 */
export const removeAuthToken = (): void => {
  localStorage.removeItem(TOKEN_KEYS.TOKEN);
  localStorage.removeItem(TOKEN_KEYS.REMEMBER_ME);
};

/**
 * Get stored user data
 */
export const getStoredUser = (): User | null => {
  try {
    const userData = localStorage.getItem(TOKEN_KEYS.USER);
    return userData ? JSON.parse(userData) : null;
  } catch {
    return null;
  }
};

/**
 * Store user data
 */
export const setStoredUser = (user: User): void => {
  localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user));
};

/**
 * Remove stored user data
 */
export const removeStoredUser = (): void => {
  localStorage.removeItem(TOKEN_KEYS.USER);
};

/**
 * Clear all auth data from storage
 */
export const clearAuthData = (): void => {
  removeAuthToken();
  removeStoredUser();
};

/**
 * Check if user is remembered
 */
export const isRememberMeEnabled = (): boolean => {
  return localStorage.getItem(TOKEN_KEYS.REMEMBER_ME) === 'true';
};

/**
 * Auth header generation for API calls
 */

/**
 * Generate authorization header for API requests
 */
export const getAuthHeader = (): { Authorization?: string } => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Session expiration handling
 */

// Check if token is expired (basic implementation - should be enhanced with JWT parsing)
export const isTokenExpired = (token: string): boolean => {
  try {
    // For JWT tokens, decode the exp claim
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch {
    // If token parsing fails, consider it expired
    return true;
  }
};

/**
 * Check if session is still valid
 */
export const isSessionValid = (): boolean => {
  const token = getAuthToken();
  const user = getStoredUser();
  
  if (!token || !user) {
    return false;
  }
  
  // Basic token expiration check
  return !isTokenExpired(token);
};

/**
 * Redirect utilities
 */

/**
 * Redirect to login page with return URL
 */
export const redirectToLogin = (returnUrl?: string): void => {
  const currentUrl = returnUrl || window.location.pathname + window.location.search;
  const loginUrl = `/login${currentUrl !== '/' ? `?redirect=${encodeURIComponent(currentUrl)}` : ''}`;
  window.location.href = loginUrl;
};

/**
 * Redirect to dashboard or specified URL
 */
export const redirectAfterLogin = (redirectTo?: string): void => {
  // Default redirect to home page
  const defaultRedirect = '/';
  
  // Use redirect URL if provided, otherwise use default
  const targetUrl = redirectTo || defaultRedirect;
  
  window.location.href = targetUrl;
};

/**
 * Redirect to home page
 */
export const redirectToHome = (): void => {
  window.location.href = '/';
};

/**
 * Utility to handle authentication errors
 */
export const handleAuthError = (error: any): void => {
  if (error?.response?.status === 401) {
    // Unauthorized - clear auth data and redirect
    clearAuthData();
    redirectToLogin();
  } else if (error?.response?.status === 403) {
    // Forbidden - show access denied message
    console.warn('Access denied');
  } else if (error?.response?.status >= 500) {
    // Server error - log for debugging
    console.error('Server error during authentication');
  }
};

/**
 * Format user display name
 */
export const getUserDisplayName = (user: User): string => {
  if (user.fullName) {
    return user.fullName;
  }
  
  if (user.email) {
    return user.email.split('@')[0];
  }
  
  return 'User';
};

/**
 * Get user initials for avatar
 */
export const getUserInitials = (user: User): string => {
  const name = getUserDisplayName(user);
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
};

/**
 * Check if user has required role/permission
 */
export const hasPermission = (user: User | null): boolean => {
  if (!user) {
    return false;
  }
  
  // Add role-based permission logic here as needed
  // For now, all authenticated users have basic permissions
  return true;
};

/**
 * Get authentication status summary
 */
export const getAuthStatus = () => {
  const token = getAuthToken();
  const user = getStoredUser();
  const isValid = isSessionValid();
  
  return {
    isAuthenticated: !!user && !!token && isValid,
    hasToken: !!token,
    hasUser: !!user,
    sessionValid: isValid,
    user,
    token: token ? 'present' : 'missing',
  };
};