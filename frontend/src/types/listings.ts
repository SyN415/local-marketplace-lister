/**
 * Extended listing interface for list view
 */
export interface ListingsListItem {
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
  // Additional computed fields for list view
  imageUrl?: string;
  isOwner?: boolean;
  daysSinceCreated?: number;
}

/**
 * Listings pagination data structure
 */
export interface ListingsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Complete listings response structure
 */
export interface ListingsResponse {
  listings: ListingsListItem[];
  pagination: ListingsPagination;
}

/**
 * Filter options for listings
 */
export interface ListingsFilters {
  // Search
  searchQuery?: string;
  
  // Status filters
  status?: 'active' | 'sold' | 'expired' | 'all';
  
  // Category filters
  category?: string;
  
  // Price range
  minPrice?: number;
  maxPrice?: number;
  
  // Location
  location?: string;
  
  // Date range
  dateFrom?: string;
  dateTo?: string;
  
  // Condition
  condition?: string;
}

/**
 * Sort options for listings
 */
export interface ListingsSortOptions {
  sortBy: 'date' | 'price' | 'title' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

/**
 * Complete listings query parameters
 */
export interface ListingsQueryParams extends ListingsFilters, ListingsSortOptions {
  page?: number;
  limit?: number;
}

/**
 * Status badge configuration
 */
export interface StatusConfig {
  label: string;
  color: 'success' | 'warning' | 'error' | 'info' | 'default';
  bgColor: string;
  textColor: string;
}

/**
 * Category options for filter dropdown
 */
export interface CategoryOption {
  value: string;
  label: string;
  count?: number;
}

/**
 * Price range filter interface
 */
export interface PriceRangeFilter {
  min: number | null;
  max: number | null;
  currency: string;
}

/**
 * Date range filter interface
 */
export interface DateRangeFilter {
  from: Date | null;
  to: Date | null;
}

/**
 * Active filters display interface
 */
export interface ActiveFilter {
  key: keyof ListingsFilters;
  label: string;
  value: string | number;
  displayValue: string;
}

/**
 * Search state interface
 */
export interface SearchState {
  query: string;
  isSearching: boolean;
  hasSearched: boolean;
  debounceTimer?: ReturnType<typeof setTimeout>;
}

/**
 * Bulk actions interface
 */
export interface BulkAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: (selectedIds: string[]) => void | Promise<void>;
  confirmationMessage?: string;
  color?: 'primary' | 'secondary' | 'error' | 'warning';
}

/**
 * Listing card actions interface
 */
export interface ListingCardActions {
  onView: (listing: ListingsListItem) => void;
  onEdit?: (listing: ListingsListItem) => void;
  onDelete?: (listing: ListingsListItem) => void;
  onToggleFavorite?: (listing: ListingsListItem) => void;
}

/**
 * Loading states for different components
 */
export interface ListingsLoadingStates {
  initial: boolean;
  loading: boolean;
  searching: boolean;
  filtering: boolean;
  sorting: boolean;
  pagination: boolean;
}

/**
 * Error states for different components
 */
export interface ListingsErrorStates {
  general: Error | null;
  search: Error | null;
  filter: Error | null;
  pagination: Error | null;
}

/**
 * Empty states configuration
 */
export interface EmptyStateConfig {
  title: string;
  description: string;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
}

/**
 * View mode options (grid vs table)
 */
export type ViewMode = 'grid' | 'table';

/**
 * Responsive breakpoints
 */
export interface ResponsiveConfig {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

/**
 * Card display options
 */
export interface CardDisplayConfig {
  columns: ResponsiveConfig;
  showDescription: boolean;
  showLocation: boolean;
  showCreatedDate: boolean;
  showStatusBadge: boolean;
  showPriceBadge: boolean;
}

/**
 * Table columns configuration
 */
export interface TableColumn {
  id: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: ListingsListItem) => React.ReactNode;
}

/**
 * Component props interfaces
 */

// SearchBar props
export interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
  loading?: boolean;
  onClear?: () => void;
  autoFocus?: boolean;
}

// Filters component props
export interface FiltersProps {
  filters: ListingsFilters;
  onChange: (filters: ListingsFilters) => void;
  onClear: () => void;
  categories: CategoryOption[];
  loading?: boolean;
  priceRange?: PriceRangeFilter;
  dateRange?: DateRangeFilter;
}

// Sort component props
export interface SortProps {
  value: ListingsSortOptions;
  onChange: (sort: ListingsSortOptions) => void;
  loading?: boolean;
}

// ListingsList props
export interface ListingsListProps {
  listings: ListingsListItem[];
  loading: boolean;
  error: Error | null;
  pagination: ListingsPagination;
  onPageChange: (page: number) => void;
  onListingClick: (listing: ListingsListItem) => void;
  viewMode?: ViewMode;
  actions?: ListingCardActions;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  emptyState?: EmptyStateConfig;
  displayConfig?: CardDisplayConfig;
}

// Main Listings page props
export interface ListingsPageProps {
  initialFilters?: ListingsFilters;
  initialSort?: ListingsSortOptions;
  defaultLimit?: number;
}

// Hook return types
export interface UseListingsResult {
  listings: ListingsListItem[];
  pagination: ListingsPagination;
  filters: ListingsFilters;
  sort: ListingsSortOptions;
  loading: ListingsLoadingStates;
  errors: ListingsErrorStates;
  updateFilters: (filters: Partial<ListingsFilters>) => void;
  updateSort: (sort: Partial<ListingsSortOptions>) => void;
  clearFilters: () => void;
  resetPage: () => void;
  refetch: () => void;
  searchListings: (query: string) => void;
}

export interface UseBulkActionsResult {
  selectedIds: string[];
  isPerforming: boolean;
  selectListing: (id: string) => void;
  deselectListing: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  performBulkAction: (actionId: string, ids: string[]) => Promise<void>;
}