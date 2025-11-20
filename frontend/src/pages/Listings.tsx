import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Fab,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  GridView as GridViewIcon,
  ViewList as ViewListIcon,
  Refresh as RefreshIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Import components
import SearchBar from '../components/listings/SearchBar';
import Filters from '../components/listings/Filters';
import Sort from '../components/listings/Sort';
import ListingsList from '../components/listings/ListingsList';

// Import hooks and types
import type {
  ListingsListItem,
  ListingsFilters,
  ListingsSortOptions,
  ListingsPagination,
  ListingsQueryParams,
  ListingsPageProps,
  ListingsLoadingStates,
  ListingsErrorStates,
  EmptyStateConfig,
} from '../types/listings';

// Define categories outside component to prevent re-creation on every render
const CATEGORIES = [
  { value: 'Electronics', label: 'Electronics' },
  { value: 'Furniture', label: 'Furniture' },
  { value: 'Clothing', label: 'Clothing' },
  { value: 'Vehicles', label: 'Vehicles' },
  { value: 'Books', label: 'Books' },
  { value: 'Sports', label: 'Sports' },
  { value: 'Home & Garden', label: 'Home & Garden' },
  { value: 'Other', label: 'Other' },
];

/**
 * Enhanced Listings page with comprehensive filtering, sorting, and search
 */
const Listings: React.FC<ListingsPageProps> = ({
  initialFilters = {},
  initialSort = { sortBy: 'createdAt', sortOrder: 'desc' },
  defaultLimit = 20,
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();

  // State management
  const [listings, setListings] = useState<ListingsListItem[]>([]);
  const [pagination, setPagination] = useState<ListingsPagination>({
    page: 1,
    limit: defaultLimit,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  
  const [filters, setFilters] = useState<ListingsFilters>({
    ...initialFilters,
  });
  
  const [sort, setSort] = useState<ListingsSortOptions>(initialSort);
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI state
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Notification state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // URL parameters sync
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Parse filters from URL
    const urlFilters: ListingsFilters = {};
    if (urlParams.get('category')) urlFilters.category = urlParams.get('category')!;
    if (urlParams.get('status')) urlFilters.status = urlParams.get('status') as any;
    if (urlParams.get('minPrice')) urlFilters.minPrice = parseFloat(urlParams.get('minPrice')!);
    if (urlParams.get('maxPrice')) urlFilters.maxPrice = parseFloat(urlParams.get('maxPrice')!);
    if (urlParams.get('location')) urlFilters.location = urlParams.get('location')!;
    if (urlParams.get('search')) {
      urlFilters.searchQuery = urlParams.get('search')!;
      setSearchQuery(urlParams.get('search')!);
    }
    
    // Parse sort from URL
    if (urlParams.get('sortBy')) {
      setSort({
        sortBy: urlParams.get('sortBy') as ListingsSortOptions['sortBy'],
        sortOrder: (urlParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      });
    }
    
    // Parse pagination
    const page = parseInt(urlParams.get('page') || '1');
    const limit = parseInt(urlParams.get('limit') || defaultLimit.toString());
    
    setFilters(prev => ({ ...prev, ...urlFilters }));
    setPagination(prev => ({ ...prev, page, limit }));
    
  }, [defaultLimit]);

  // Update URL when filters/sort/pagination change
  useEffect(() => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, String(value));
      }
    });
    
    if (searchQuery) {
      params.set('search', searchQuery);
    }
    
    if (sort.sortBy !== initialSort.sortBy || sort.sortOrder !== initialSort.sortOrder) {
      params.set('sortBy', sort.sortBy);
      params.set('sortOrder', sort.sortOrder);
    }
    
    if (pagination.page !== 1) {
      params.set('page', pagination.page.toString());
    }
    
    if (pagination.limit !== defaultLimit) {
      params.set('limit', pagination.limit.toString());
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [filters, sort, searchQuery, pagination, defaultLimit, initialSort]);

  // Mock data for demonstration (replace with actual API call)
  const mockListings: ListingsListItem[] = [
    {
      id: '1',
      title: 'iPhone 14 Pro Max',
      description: 'Excellent condition, barely used. Includes original box and charger.',
      price: 899,
      category: 'Electronics',
      condition: 'like-new',
      images: [],
      userId: 'user1',
      location: 'San Francisco, CA',
      status: 'active',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      imageUrl: '/api/placeholder/300/200',
    },
    {
      id: '2',
      title: 'MacBook Pro 16"',
      description: '2023 M2 Max chip, 32GB RAM, 1TB SSD. Perfect for development work.',
      price: 2499,
      category: 'Electronics',
      condition: 'good',
      images: [],
      userId: 'user1',
      location: 'San Francisco, CA',
      status: 'active',
      createdAt: '2024-01-14T14:20:00Z',
      updatedAt: '2024-01-14T14:20:00Z',
      imageUrl: '/api/placeholder/300/200',
    },
    {
      id: '3',
      title: 'Vintage Leather Couch',
      description: 'Genuine Italian leather, very comfortable. Minor wear on armrests.',
      price: 650,
      category: 'Furniture',
      condition: 'good',
      images: [],
      userId: 'user2',
      location: 'Oakland, CA',
      status: 'sold',
      createdAt: '2024-01-13T09:15:00Z',
      updatedAt: '2024-01-13T09:15:00Z',
      imageUrl: '/api/placeholder/300/200',
    },
  ];

  // Simulate loading data
  const loadListings = useCallback(async (params: ListingsQueryParams) => {
    setLoading(prev => ({ ...prev, loading: true, initial: false }));
    setErrors(prev => ({ ...prev, general: null }));

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Filter and sort mock data
      let filteredListings = [...mockListings];
      
      // Apply filters
      if (params.category && params.category !== 'all') {
        filteredListings = filteredListings.filter(l => l.category === params.category);
      }
      
      if (params.status && params.status !== 'all') {
        filteredListings = filteredListings.filter(l => l.status === params.status);
      }
      
      if (params.minPrice !== undefined) {
        filteredListings = filteredListings.filter(l => l.price >= params.minPrice!);
      }
      
      if (params.maxPrice !== undefined) {
        filteredListings = filteredListings.filter(l => l.price <= params.maxPrice!);
      }
      
      if (params.searchQuery) {
        const query = params.searchQuery.toLowerCase();
        filteredListings = filteredListings.filter(l => 
          l.title.toLowerCase().includes(query) || 
          l.description?.toLowerCase().includes(query)
        );
      }
      
      // Apply sorting
      filteredListings.sort((a, b) => {
        let aVal: any, bVal: any;
        
        switch (params.sortBy) {
          case 'price':
            aVal = a.price;
            bVal = b.price;
            break;
          case 'title':
            aVal = a.title;
            bVal = b.title;
            break;
          case 'date':
          case 'createdAt':
          default:
            aVal = new Date(a.createdAt);
            bVal = new Date(b.createdAt);
            break;
        }
        
        if (params.sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
      
      // Apply pagination
      const startIndex = (params.page! - 1) * params.limit!;
      const endIndex = startIndex + params.limit!;
      const paginatedListings = filteredListings.slice(startIndex, endIndex);
      
      setListings(paginatedListings);
      setPagination({
        page: params.page!,
        limit: params.limit!,
        total: filteredListings.length,
        totalPages: Math.ceil(filteredListings.length / params.limit!),
        hasNextPage: endIndex < filteredListings.length,
        hasPreviousPage: params.page! > 1,
      });
      
    } catch (error) {
      console.error('Failed to load listings:', error);
      setErrors(prev => ({ ...prev, general: new Error('Failed to load listings') }));
      setSnackbar({ open: true, message: 'Failed to load listings', severity: 'error' });
    } finally {
      setLoading(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Load listings when filters/sort/pagination change
  useEffect(() => {
    const params: ListingsQueryParams = {
      ...filters,
      sortBy: sort.sortBy,
      sortOrder: sort.sortOrder,
      page: pagination.page,
      limit: pagination.limit,
    };
    
    loadListings(params);
  }, [filters, sort, pagination.page, pagination.limit, loadListings]);

  // Event handlers
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const handleFilterChange = useCallback((newFilters: ListingsFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const handleSortChange = useCallback((newSort: ListingsSortOptions) => {
    setSort(newSort);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleListingClick = useCallback((listing: ListingsListItem) => {
    navigate(`/listings/${listing.id}`);
  }, [navigate]);

  const handleCreateListing = useCallback(() => {
    navigate('/listings/create');
  }, [navigate]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const params: ListingsQueryParams = {
      ...filters,
      sortBy: sort.sortBy,
      sortOrder: sort.sortOrder,
      page: pagination.page,
      limit: pagination.limit,
    };
    await loadListings(params);
    setIsRefreshing(false);
    setSnackbar({ open: true, message: 'Listings refreshed', severity: 'success' });
  }, [filters, sort, pagination, loadListings]);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setSnackbar({ open: true, message: 'Shareable link copied to clipboard', severity: 'success' });
  }, []);

  const handleCrossPost = useCallback((listing: ListingsListItem) => {
    if (!user) return;

    if ((user.credits || 0) < 1) {
      setSnackbar({
        open: true,
        message: 'Insufficient credits. Please purchase more to cross-post.',
        severity: 'warning'
      });
      // Optional: redirect to pricing after a delay or show a button
      setTimeout(() => navigate('/pricing'), 1500);
      return;
    }

    // Logic to initiate cross-post (e.g. open extension or modal)
    // For now, we just simulate success/start
    setSnackbar({
      open: true,
      message: `Starting cross-post for "${listing.title}". Opening extension...`,
      severity: 'info'
    });
    // In a real scenario, this would trigger the extension or an API call
  }, [user, navigate]);

  // Compute active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (filters.category && filters.category !== 'all') count++;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count++;
    if (filters.location) count++;
    if (filters.condition && filters.condition !== 'all') count++;
    if (filters.dateFrom || filters.dateTo) count++;
    return count;
  }, [filters, searchQuery]);

  // Empty state configuration
  const emptyStateConfig: EmptyStateConfig = {
    title: searchQuery ? 'No search results found' : 'No listings found',
    description: searchQuery 
      ? `Try adjusting your search query "${searchQuery}" or clear filters to see more results.`
      : 'Start by creating your first listing or adjust your filters.',
    actionLabel: searchQuery ? 'Clear Search' : 'Create Listing',
    actionIcon: <AddIcon />,
    onAction: searchQuery ? handleClearFilters : handleCreateListing,
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h3" component="h1">
          Listings
        </Typography>
        
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={loading.loading || isRefreshing}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Share">
            <IconButton onClick={handleShare}>
              <ShareIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateListing}
            size={isMobile ? 'small' : 'medium'}
          >
            Create Listing
          </Button>
        </Stack>
      </Box>

      {/* Active filters display */}
      {activeFiltersCount > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Active filters ({activeFiltersCount})
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {searchQuery && (
              <Chip label={`Search: "${searchQuery}"`} onDelete={() => setSearchQuery('')} color="primary" />
            )}
            {filters.category && filters.category !== 'all' && (
              <Chip 
                label={`Category: ${filters.category}`} 
                onDelete={() => setFilters(prev => ({ ...prev, category: undefined }))} 
                color="secondary" 
              />
            )}
            {filters.status && filters.status !== 'all' && (
              <Chip 
                label={`Status: ${filters.status}`} 
                onDelete={() => setFilters(prev => ({ ...prev, status: undefined }))} 
                color="info" 
              />
            )}
            {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
              <Chip 
                label={`Price: ${filters.minPrice || 0} - ${filters.maxPrice || '∞'}`} 
                onDelete={() => setFilters(prev => ({ ...prev, minPrice: undefined, maxPrice: undefined }))} 
                color="success" 
              />
            )}
            <Button
              variant="outlined"
              size="small"
              onClick={handleClearFilters}
              sx={{ ml: 1 }}
            >
              Clear All
            </Button>
          </Stack>
        </Box>
      )}

      {/* Search bar */}
      <SearchBar
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder="Search listings by title or description..."
        loading={loading.searching}
        onClear={() => setSearchQuery('')}
      />

      {/* Controls row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, gap: 2 }}>
        {/* Sort controls */}
        <Sort
          value={sort}
          onChange={handleSortChange}
          loading={loading.sorting}
        />

        {/* View mode toggle */}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_event, newMode) => newMode && setViewMode(newMode)}
          size="small"
        >
          <ToggleButton value="grid">
            <GridViewIcon />
          </ToggleButton>
          <ToggleButton value="table">
            <ViewListIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Filters section */}
      <Filters
        filters={filters}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
        loading={loading.filtering}
        categories={CATEGORIES}
      />

      {/* Error display */}
      {errors.general && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrors(prev => ({ ...prev, general: null }))}>
          {errors.general.message}
        </Alert>
      )}

      {/* Results summary */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {loading.loading ? (
            <Stack direction="row" alignItems="center" spacing={1}>
              <CircularProgress size={16} />
              <span>Loading listings...</span>
            </Stack>
          ) : (
            `Showing ${listings.length} of ${pagination.total} listings`
          )}
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          Page {pagination.page} of {pagination.totalPages}
        </Typography>
      </Box>

      {/* Listings list */}
      <ListingsList
        listings={listings}
        loading={loading.loading}
        error={errors.general}
        pagination={pagination}
        onPageChange={handlePageChange}
        onListingClick={handleListingClick}
        viewMode={viewMode}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        emptyState={emptyStateConfig}
        actions={{
          onView: handleListingClick,
          onCrossPost: handleCrossPost,
          // Add other actions if implemented in the page (e.g. onEdit, onDelete)
        }}
      />

      {/* Floating action button */}
      <Fab
        color="primary"
        aria-label="create listing"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={handleCreateListing}
      >
        <AddIcon />
      </Fab>

      {/* Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Listings;