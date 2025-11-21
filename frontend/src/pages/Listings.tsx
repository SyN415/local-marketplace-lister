import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Divider,
  Alert,
  Snackbar,
  useMediaQuery,
  useTheme,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  GridView as GridViewIcon,
  ViewList as ListViewIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';

// Components
import ListingsList from '../components/listings/ListingsList';
import SearchBar from '../components/listings/SearchBar';
import Filters from '../components/listings/Filters';
import Sort from '../components/listings/Sort';

// Hooks & Types
import { useListings, useBulkActions } from '../hooks/useListings';
import { useAuthContext } from '../contexts/AuthContext';
import type { ListingsListItem, ViewMode } from '../types/listings';
import { listingsAPI } from '../services/api';

const Listings: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuthContext();
  
  // View mode state (grid/table)
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Filter visibility state
  const [showFilters, setShowFilters] = useState(!isMobile);

  // Notification state
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Listings Hook
  const {
    listings,
    pagination,
    filters,
    sort,
    loading,
    errors,
    updateFilters,
    updateSort,
    clearFilters,
    setPage,
    searchListings,
    refetch
  } = useListings({
    defaultLimit: 12,
    initialSort: { sortBy: 'createdAt', sortOrder: 'desc' }
  });

  // Bulk Actions Hook
  const {
    selectedIds,
    isPerforming: isPerformingBulkAction,
    selectAll,
    clearSelection,
    performBulkAction
  } = useBulkActions();

  // Handlers
  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handleCreateNew = () => {
    navigate('/create-listing');
  };

  const handleListingClick = (listing: ListingsListItem) => {
    navigate(`/listings/${listing.id}`);
  };

  const handleEditListing = (listing: ListingsListItem) => {
    navigate(`/listings/${listing.id}/edit`);
  };

  const handleDeleteListing = async (listing: ListingsListItem) => {
    if (window.confirm(`Are you sure you want to delete "${listing.title}"?`)) {
      try {
        await listingsAPI.deleteListing(listing.id);
        setNotification({
          open: true,
          message: 'Listing deleted successfully',
          severity: 'success'
        });
        refetch();
      } catch (error) {
        console.error('Delete error:', error);
        setNotification({
          open: true,
          message: 'Failed to delete listing',
          severity: 'error'
        });
      }
    }
  };

  const handleCrossPost = (listing: ListingsListItem) => {
    // Mock Repost Action
    console.log('Reposting:', listing.title);
    setNotification({
      open: true,
      message: `Simulated repost for "${listing.title}" - Credit deducted (mock)`,
      severity: 'success'
    });
    // Here we would actually call an API endpoint to post to external platforms
  };

  // Bulk Action Handlers
  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} listings?`)) {
      try {
        await performBulkAction('delete', selectedIds);
        setNotification({
          open: true,
          message: `${selectedIds.length} listings deleted successfully`,
          severity: 'success'
        });
        clearSelection();
        refetch();
      } catch (error) {
        console.error('Bulk delete error:', error);
        setNotification({
          open: true,
          message: 'Failed to perform bulk deletion',
          severity: 'error'
        });
      }
    }
  };

  const handleBulkArchive = async () => {
    // Mock Bulk Archive
    setNotification({
      open: true,
      message: `Archived ${selectedIds.length} listings (mock action)`,
      severity: 'info'
    });
    clearSelection();
  };

  // Selection management wrapper
  const handleSelectionChange = (ids: string[]) => {
    if (ids.length === 0) {
      clearSelection();
    } else if (ids.length === listings.length) {
      selectAll(ids);
    } else {
      // This is a bit tricky with the current hook structure, 
      // but we can just use selectAll for now as it sets the array directly
      selectAll(ids);
    }
  };

  // Categories for filter
  // Ideally fetched from API or constants
  const categoryOptions = [
    { value: 'Electronics', label: 'Electronics' },
    { value: 'Furniture', label: 'Furniture' },
    { value: 'Clothing', label: 'Clothing' },
    { value: 'Books', label: 'Books' },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'start', sm: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            My Inventory
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your listings and cross-post to marketplaces
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Paper elevation={0} sx={{ px: 2, py: 1, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
             <Typography variant="subtitle2" fontWeight="bold">
               Credits: {user?.credits ?? 0}
             </Typography>
          </Paper>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)',
            }}
          >
            Create New
          </Button>
        </Box>
      </Box>

      {/* Analytics Summary (Mock) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
        {[
          { label: 'Total Listings', value: pagination.total || 0, color: 'primary.main' },
          { label: 'Active', value: listings.filter(l => l.status === 'active').length, color: 'success.main' },
          { label: 'Sold', value: listings.filter(l => l.status === 'sold').length, color: 'warning.main' },
          { label: 'Total Views', value: '1.2k', color: 'info.main' } // Mock value
        ].map((stat, index) => (
          <Paper key={index} sx={{ p: 2, borderRadius: 2 }} elevation={1}>
            <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">
              {stat.label}
            </Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ color: stat.color, mt: 1 }}>
              {stat.value}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Controls Bar */}
      <Box sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
          {/* Search */}
          <Box sx={{ flexGrow: 1 }}>
            <SearchBar
              value={filters.searchQuery || ''}
              onChange={searchListings}
              placeholder="Search by title..."
              loading={loading.searching}
              onClear={() => updateFilters({ searchQuery: '' })}
            />
          </Box>

          {/* Filter Toggle & Sort & View Mode */}
          <Stack direction="row" spacing={2} sx={{ minWidth: { md: 'auto' } }}>
             <Button
              variant={showFilters ? "contained" : "outlined"}
              color="secondary"
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{ height: 56 }}
            >
              Filters
            </Button>

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              aria-label="view mode"
              sx={{ height: 56 }}
            >
              <ToggleButton value="grid" aria-label="grid view">
                <GridViewIcon />
              </ToggleButton>
              <ToggleButton value="table" aria-label="list view">
                <ListViewIcon />
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>

        {/* Expanded Filters */}
        {showFilters && (
          <Box sx={{ mt: 2 }}>
            <Filters
              filters={filters}
              onChange={updateFilters}
              onClear={clearFilters}
              categories={categoryOptions}
              loading={loading.filtering}
            />
          </Box>
        )}
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
           <Sort value={sort} onChange={updateSort} loading={loading.sorting} />
        </Box>
      </Box>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <Paper
          elevation={3}
          sx={{
            p: 2,
            mb: 3,
            bgcolor: 'secondary.light',
            color: 'secondary.contrastText',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: 2,
            animation: 'fadeIn 0.3s ease-in-out',
            '@keyframes fadeIn': {
              '0%': { opacity: 0, transform: 'translateY(-10px)' },
              '100%': { opacity: 1, transform: 'translateY(0)' },
            }
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Badge badgeContent={selectedIds.length} color="primary">
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mr: 1 }}>
                Selected
              </Typography>
            </Badge>
            <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
            <Button
              startIcon={<ArchiveIcon />}
              color="inherit"
              onClick={handleBulkArchive}
              disabled={isPerformingBulkAction}
            >
              Archive
            </Button>
            <Button
              startIcon={<DeleteIcon />}
              color="inherit"
              onClick={handleBulkDelete}
              disabled={isPerformingBulkAction}
            >
              Delete
            </Button>
          </Stack>
          <Button color="inherit" size="small" onClick={clearSelection}>
            Cancel
          </Button>
        </Paper>
      )}

      {/* Listings List */}
      <ListingsList
        listings={listings}
        loading={loading.loading}
        error={errors.general}
        pagination={pagination}
        onPageChange={setPage}
        onListingClick={handleListingClick}
        viewMode={viewMode}
        selectedIds={selectedIds}
        onSelectionChange={handleSelectionChange}
        actions={{
          onView: handleListingClick,
          onEdit: handleEditListing,
          onDelete: handleDeleteListing,
          onCrossPost: handleCrossPost
        }}
        emptyState={{
          title: 'No listings found',
          description: filters.searchQuery 
            ? `No results matching "${filters.searchQuery}"` 
            : "You haven't added any listings yet.",
          actionLabel: 'Create First Listing',
          onAction: handleCreateNew
        }}
      />

      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setNotification(prev => ({ ...prev, open: false }))} 
          severity={notification.severity} 
          variant="filled"
          elevation={6}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Listings;