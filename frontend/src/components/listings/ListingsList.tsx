import React, { useState } from 'react';
import {
  Box,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Button,
  Skeleton,
  Alert,
  Pagination,
  Stack,
  IconButton,
  Checkbox,
  useMediaQuery,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  LinearProgress,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import type {
  ListingsListProps,
  ListingsListItem,
  ViewMode,
  EmptyStateConfig,
  ListingCardActions,
} from '../../types/listings';

/**
 * Individual listing card component
 */
const ListingCard: React.FC<{
  listing: ListingsListItem;
  loading?: boolean;
  actions?: ListingCardActions;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  showActions?: boolean;
}> = ({ listing, loading = false, actions, selected = false, onSelect, showActions = true }) => {
  if (loading) {
    return (
      <Card>
        <Skeleton variant="rectangular" height={200} />
        <CardContent>
          <Skeleton variant="text" height={32} />
          <Skeleton variant="text" height={24} />
          <Skeleton variant="text" height={24} />
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Skeleton variant="rectangular" width={60} height={24} />
            <Skeleton variant="rectangular" width={80} height={24} />
          </Box>
        </CardContent>
        <CardActions>
          <Skeleton variant="rectangular" width={80} height={32} />
          <Skeleton variant="rectangular" width={80} height={32} />
        </CardActions>
      </Card>
    );
  }

  const getStatusConfig = (status: ListingsListItem['status']) => {
    switch (status) {
      case 'active':
        return { label: 'Active', color: 'success' as const, bgColor: 'success.light', textColor: 'success.contrastText' };
      case 'sold':
        return { label: 'Sold', color: 'error' as const, bgColor: 'error.light', textColor: 'error.contrastText' };
      case 'expired':
        return { label: 'Expired', color: 'warning' as const, bgColor: 'warning.light', textColor: 'warning.contrastText' };
      default:
        return { label: 'Draft', color: 'default' as const, bgColor: 'grey.100', textColor: 'grey.800' };
    }
  };

  const statusConfig = getStatusConfig(listing.status);

  const handleView = () => {
    actions?.onView?.(listing);
  };

  const handleEdit = () => {
    actions?.onEdit?.(listing);
  };

  const handleDelete = () => {
    actions?.onDelete?.(listing);
  };

  const handleToggleFavorite = () => {
    actions?.onToggleFavorite?.(listing);
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSelect?.(event.target.checked);
  };

  return (
    <Card
      className="glass-card"
      sx={{
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
        },
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
      }}
      onClick={handleView}
    >
      {/* Selection checkbox */}
      {onSelect && (
        <Checkbox
          checked={selected}
          onChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
          sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
        />
      )}

      {/* Status badge */}
      <Chip
        label={statusConfig.label}
        color={statusConfig.color}
        size="small"
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 1,
          backgroundColor: statusConfig.bgColor,
          color: statusConfig.textColor,
        }}
      />

      {/* Favorite button */}
      {actions?.onToggleFavorite && (
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            handleToggleFavorite();
          }}
          sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
        >
          <FavoriteBorderIcon />
        </IconButton>
      )}

      {/* Image */}
      <CardMedia
        component="img"
        height="220"
        image={listing.imageUrl || '/api/placeholder/300/200'}
        alt={listing.title}
        sx={{
          backgroundColor: 'grey.100',
          transition: 'transform 0.3s ease',
          '&:hover': {
            transform: 'scale(1.05)',
          },
        }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = '/api/placeholder/300/200';
        }}
      />

      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="h6" component="h2" noWrap sx={{ fontWeight: 700, mb: 0.5 }}>
          {listing.title}
        </Typography>
        
        <Typography
          variant="h5"
          sx={{
            mt: 1,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ${listing.price.toLocaleString()}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.5em',
            lineHeight: 1.5
          }}
        >
          {listing.description || 'No description available'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.5, mt: 2, flexWrap: 'wrap' }}>
          <Chip
            label={listing.category}
            size="small"
            sx={{
              borderRadius: '6px',
              fontWeight: 500,
              background: 'rgba(99, 102, 241, 0.1)',
              color: 'primary.main',
              border: 'none'
            }}
          />
          <Chip
            label={listing.condition}
            size="small"
            sx={{
              borderRadius: '6px',
              fontWeight: 500,
              background: 'rgba(236, 72, 153, 0.1)',
              color: 'secondary.main',
              border: 'none'
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          {listing.location && (
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              📍 {listing.location}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {new Date(listing.createdAt).toLocaleDateString()}
          </Typography>
        </Box>
      </CardContent>

      {showActions && (
        <CardActions>
          <Button size="small" startIcon={<ViewIcon />} onClick={handleView}>
            View
          </Button>
          {actions?.onEdit && (
            <Button
              size="small"
              startIcon={<EditIcon />}
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}
            >
              Edit
            </Button>
          )}
          {actions?.onDelete && (
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
            >
              <DeleteIcon />
            </IconButton>
          )}
        </CardActions>
      )}
    </Card>
  );
};

/**
 * Table row component for list view
 */
const ListingTableRow: React.FC<{
  listing: ListingsListItem;
  loading?: boolean;
  actions?: ListingCardActions;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
}> = ({ listing, loading = false, actions, selected = false, onSelect }) => {
  if (loading) {
    return (
      <TableRow>
        <TableCell>
          <Skeleton variant="circular" width={20} height={20} />
        </TableCell>
        <TableCell>
          <Skeleton variant="text" width={200} />
        </TableCell>
        <TableCell>
          <Skeleton variant="text" width={80} />
        </TableCell>
        <TableCell>
          <Skeleton variant="text" width={100} />
        </TableCell>
        <TableCell>
          <Skeleton variant="text" width={60} />
        </TableCell>
        <TableCell>
          <Skeleton variant="text" width={80} />
        </TableCell>
      </TableRow>
    );
  }

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSelect?.(event.target.checked);
  };

  return (
    <TableRow
      hover
      sx={{ cursor: 'pointer' }}
      onClick={() => actions?.onView?.(listing)}
    >
      <TableCell padding="checkbox">
        <Checkbox
          checked={selected}
          onChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
        />
      </TableCell>
      
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CardMedia
            component="img"
            sx={{ width: 60, height: 60, borderRadius: 1 }}
            image={listing.imageUrl || '/api/placeholder/60/60'}
            alt={listing.title}
          />
          <Box>
            <Typography variant="subtitle2" noWrap>
              {listing.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {listing.description || 'No description'}
            </Typography>
          </Box>
        </Box>
      </TableCell>
      
      <TableCell align="right">
        <Typography variant="subtitle1" fontWeight="bold" color="primary">
          ${listing.price.toLocaleString()}
        </Typography>
      </TableCell>
      
      <TableCell>
        <Chip label={listing.category} size="small" variant="outlined" />
      </TableCell>
      
      <TableCell>
        <Chip 
          label={listing.status} 
          size="small" 
          color={listing.status === 'active' ? 'success' : listing.status === 'sold' ? 'error' : 'default'}
        />
      </TableCell>
      
      <TableCell>
        <Typography variant="caption">
          {new Date(listing.createdAt).toLocaleDateString()}
        </Typography>
      </TableCell>
    </TableRow>
  );
};

/**
 * Empty state component
 */
const EmptyState: React.FC<{
  config?: EmptyStateConfig;
  onCreateListing?: () => void;
}> = ({ config, onCreateListing }) => {
  const defaultConfig: EmptyStateConfig = {
    title: 'No listings found',
    description: 'Create your first listing to get started.',
    actionLabel: 'Create Listing',
    actionIcon: <AddIcon />,
    onAction: onCreateListing,
  };

  const finalConfig = { ...defaultConfig, ...config };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
        textAlign: 'center',
        p: 4,
      }}
    >
      <Typography variant="h5" color="text.secondary" gutterBottom>
        {finalConfig.title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {finalConfig.description}
      </Typography>
      {finalConfig.onAction && (
        <Button
          variant="contained"
          startIcon={finalConfig.actionIcon}
          onClick={finalConfig.onAction}
          size="large"
        >
          {finalConfig.actionLabel}
        </Button>
      )}
    </Box>
  );
};

/**
 * Main ListingsList component
 */
export const ListingsList: React.FC<ListingsListProps> = ({
  listings,
  loading,
  error,
  pagination,
  onPageChange,
  onListingClick: _onListingClick,
  viewMode = 'grid',
  actions,
  selectedIds = [],
  onSelectionChange,
  emptyState,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [currentViewMode] = useState<ViewMode>(viewMode);

  // Handle page change
  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    onPageChange(page);
  };

  // Handle listing selection
  const handleListingSelect = (listingId: string, selected: boolean) => {
    if (onSelectionChange) {
      const newSelectedIds = selected
        ? [...selectedIds, listingId]
        : selectedIds.filter(id => id !== listingId);
      onSelectionChange(newSelectedIds);
    }
  };

  // Handle select all
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectionChange) {
      const newSelectedIds = event.target.checked
        ? listings.map(listing => listing.id)
        : [];
      onSelectionChange(newSelectedIds);
    }
  };

  // Error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load listings: {error.message}
      </Alert>
    );
  }

  // Grid view
  if (currentViewMode === 'grid') {
    return (
      <Box>
        {/* Loading progress */}
        {loading && (
          <LinearProgress sx={{ mb: 2 }} />
        )}

        {/* Grid of listing cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 3,
          }}
        >
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              loading={loading}
              actions={actions}
              selected={selectedIds.includes(listing.id)}
              onSelect={(selected) => handleListingSelect(listing.id, selected)}
            />
          ))}
          
          {/* Loading skeleton cards */}
          {loading && Array.from({ length: 8 }).map((_, index) => (
            <ListingCard
              key={`skeleton-${index}`}
              listing={{} as ListingsListItem}
              loading
            />
          ))}
        </Box>

        {/* Empty state */}
        {!loading && listings.length === 0 && (
          <EmptyState
            config={emptyState}
            onCreateListing={() => actions?.onEdit?.({} as ListingsListItem)}
          />
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Stack spacing={2}>
              <Pagination
                count={pagination.totalPages}
                page={pagination.page}
                onChange={handlePageChange}
                color="primary"
                size={isMobile ? 'small' : 'medium'}
                showFirstButton
                showLastButton
              />
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </Typography>
            </Stack>
          </Box>
        )}
      </Box>
    );
  }

  // Table view
  return (
    <Box>
      {/* Loading progress */}
      {loading && <LinearProgress sx={{ mb: 1 }} />}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedIds.length > 0 && selectedIds.length < listings.length}
                  checked={listings.length > 0 && selectedIds.length === listings.length}
                  onChange={handleSelectAll}
                  inputProps={{ 'aria-label': 'select all listings' }}
                />
              </TableCell>
              <TableCell>Listing</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {listings.map((listing) => (
              <ListingTableRow
                key={listing.id}
                listing={listing}
                loading={loading}
                actions={actions}
                selected={selectedIds.includes(listing.id)}
                onSelect={(selected) => handleListingSelect(listing.id, selected)}
              />
            ))}
            
            {/* Loading skeleton rows */}
            {loading && Array.from({ length: 5 }).map((_, index) => (
              <ListingTableRow
                key={`skeleton-${index}`}
                listing={{} as ListingsListItem}
                loading
              />
            ))}
          </TableBody>
        </Table>

        {/* Empty state in table */}
        {!loading && listings.length === 0 && (
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} sx={{ textAlign: 'center' }}>
                <EmptyState
                  config={emptyState}
                  onCreateListing={() => actions?.onEdit?.({} as ListingsListItem)}
                />
              </TableCell>
            </TableRow>
          </TableBody>
        )}
      </TableContainer>

      {/* Pagination for table */}
      {pagination.totalPages > 1 && (
        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page - 1}
          onPageChange={(_event, newPage) => onPageChange(newPage + 1)}
          rowsPerPage={pagination.limit}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`}
        />
      )}
    </Box>
  );
};

export default ListingsList;