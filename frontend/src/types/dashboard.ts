/**
 * Dashboard statistics interface
 * Contains aggregated data for dashboard stats cards
 */
export interface DashboardStats {
  totalListings: number;
  postedListings: number;
  draftListings: number;
  soldListings: number;
  totalValue: number;
  categoryBreakdown: Record<string, number>;
}

/**
 * Stats card data interface
 * Used for individual stat card display
 */
export interface StatCardData {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
  error?: string | null;
}

/**
 * Recent listing data interface
 * Simplified version of Listing for dashboard display
 */
export interface RecentListing {
  id: string;
  title: string;
  price: number;
  status: 'active' | 'sold' | 'expired';
  createdAt: string;
  category?: string;
  images?: string[];
}

/**
 * Dashboard filters interface
 * Used for filtering recent listings
 */
export interface DashboardFilters {
  category?: string;
  status?: string;
  limit?: number;
  sortBy?: 'newest' | 'oldest' | 'price-high' | 'price-low';
}

/**
 * Dashboard query options interface
 * Configuration options for dashboard data fetching
 */
export interface DashboardQueryOptions {
  page?: number;
  limit?: number;
  refreshInterval?: number;
  retry?: number;
  staleTime?: number;
}

/**
 * Dashboard loading states interface
 * Tracks loading states for different dashboard sections
 */
export interface DashboardLoadingStates {
  stats: boolean;
  recentListings: boolean;
  isInitialLoad: boolean;
}

/**
 * Dashboard error states interface
 * Tracks error states for different dashboard sections
 */
export interface DashboardErrorStates {
  statsError: Error | null;
  recentListingsError: Error | null;
}

/**
 * Complete dashboard data interface
 * Contains all data needed for dashboard display
 */
export interface DashboardData {
  stats: DashboardStats | null;
  recentListings: RecentListing[];
}

/**
 * Dashboard state interface
 * Combines data, loading, and error states
 */
export interface DashboardState extends DashboardData {
  loading: DashboardLoadingStates;
  errors: DashboardErrorStates;
}

/**
 * Stats card configuration interface
 * Configuration for individual stat cards
 */
export interface StatCardConfig {
  key: keyof Omit<DashboardStats, 'totalValue' | 'categoryBreakdown'>;
  title: string;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  icon: React.ReactNode;
  formatValue?: (value: number) => string;
}