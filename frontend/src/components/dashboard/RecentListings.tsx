import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Button,
  Skeleton,
  Alert,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  Visibility as EyeIcon,
  ShoppingCart as SoldIcon,
  Inventory as ActiveIcon,
  ViewList as ViewAllIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useRecentListings } from '../../hooks/useDashboard';
import type { RecentListing } from '../../types/dashboard';

interface RecentListingsProps {
  limit?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 */
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMilliseconds = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
};

/**
 * Get status configuration for display
 */
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        color: 'success' as const,
        icon: <ActiveIcon fontSize="small" />,
      };
    case 'sold':
      return {
        label: 'Sold',
        color: 'info' as const,
        icon: <SoldIcon fontSize="small" />,
      };
    case 'expired':
      return {
        label: 'Expired',
        color: 'warning' as const,
        icon: <EyeIcon fontSize="small" />,
      };
    default:
      return {
        label: status,
        color: 'default' as const,
        icon: <ActiveIcon fontSize="small" />,
      };
  }
};

/**
 * Format price for display
 */
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

/**
 * Recent Listings Skeleton Component
 */
const RecentListingsSkeleton: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <TimeIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Recent Listings
        </Typography>
      </Box>
      
      <List sx={{ p: 0 }}>
        {[...Array(5)].map((_, index) => (
          <ListItem key={index} sx={{ px: 0, py: 1.5 }}>
            <ListItemAvatar>
              <Skeleton
                variant="circular"
                width={40}
                height={40}
                sx={{ bgcolor: 'grey.200' }}
              />
            </ListItemAvatar>
            <ListItemText
              primary={
                <Skeleton
                  variant="text"
                  width={isMobile ? '70%' : '60%'}
                  height={24}
                  sx={{ bgcolor: 'grey.200' }}
                />
              }
              secondary={
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <Skeleton
                    variant="text"
                    width={80}
                    height={20}
                    sx={{ bgcolor: 'grey.200', mr: 1 }}
                  />
                  <Skeleton
                    variant="text"
                    width={100}
                    height={20}
                    sx={{ bgcolor: 'grey.200' }}
                  />
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    </CardContent>
  );
};

/**
 * Individual Recent Listing Item Component
 */
const RecentListingItem: React.FC<{
  listing: RecentListing;
  onClick?: () => void;
}> = ({ listing, onClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const statusConfig = getStatusConfig(listing.status);
  
  // Get avatar background color based on status
  const getAvatarBg = () => {
    switch (listing.status) {
      case 'active':
        return theme.palette.success.light;
      case 'sold':
        return theme.palette.info.light;
      case 'expired':
        return theme.palette.warning.light;
      default:
        return theme.palette.grey[300];
    }
  };

  return (
    <ListItem
      sx={{
        px: 0,
        py: 1.5,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background-color 0.2s ease',
        '&:hover': onClick ? {
          backgroundColor: 'action.hover',
        } : {},
        borderRadius: 1,
      }}
      onClick={onClick}
    >
      <ListItemAvatar>
        <Avatar
          sx={{
            width: 40,
            height: 40,
            bgcolor: getAvatarBg(),
            color: theme.palette.getContrastText(getAvatarBg()),
          }}
        >
          {statusConfig.icon}
        </Avatar>
      </ListItemAvatar>
      
      <ListItemText
        primary={
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 500,
              fontSize: isMobile ? '0.9rem' : '1rem',
              mb: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {listing.title}
          </Typography>
        }
        secondary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="h6"
              color="primary.main"
              sx={{ fontWeight: 600 }}
            >
              {formatPrice(listing.price)}
            </Typography>
            <Chip
              label={statusConfig.label}
              size="small"
              color={statusConfig.color}
              icon={statusConfig.icon}
              sx={{
                height: 20,
                fontSize: '0.7rem',
                '& .MuiChip-icon': {
                  fontSize: '0.7rem',
                },
              }}
            />
          </Box>
        }
      />
      
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          textAlign: 'right',
          minWidth: 80,
          fontSize: '0.75rem',
        }}
      >
        {formatRelativeTime(listing.createdAt)}
      </Typography>
    </ListItem>
  );
};

/**
 * Empty State Component
 */
const EmptyRecentListings: React.FC<{ onCreate: () => void }> = ({ onCreate }) => {
  return (
    <CardContent>
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <ActiveIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No recent listings
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Start creating listings to see them here
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={onCreate}
        >
          Create First Listing
        </Button>
      </Box>
    </CardContent>
  );
};

const RecentListings: React.FC<RecentListingsProps> = ({
  limit = 5,
  showViewAll = true,
  onViewAll,
}) => {
  const navigate = useNavigate();
  const {
    data: recentListings = [],
    isLoading,
    error,
  } = useRecentListings(limit);

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      navigate('/listings');
    }
  };

  const handleListingClick = (listingId: string) => {
    navigate(`/listings/${listingId}`);
  };

  const handleCreateListing = () => {
    navigate('/create-listing');
  };

  // Show skeleton while loading
  if (isLoading) {
    return (
      <Card sx={{ mb: 3 }}>
        <RecentListingsSkeleton />
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card sx={{ mb: 3 }}>
        <Alert
          severity="error"
          sx={{ m: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          }
        >
          Failed to load recent listings. Please try again.
        </Alert>
      </Card>
    );
  }

  // Show empty state
  if (recentListings.length === 0) {
    return (
      <Card sx={{ mb: 3 }}>
        <EmptyRecentListings onCreate={handleCreateListing} />
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TimeIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Recent Listings
            </Typography>
          </Box>
          
          {showViewAll && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<ViewAllIcon />}
              onClick={handleViewAll}
            >
              View All
            </Button>
          )}
        </Box>

        {/* Listings */}
        <List sx={{ p: 0 }}>
          {recentListings.map((listing, index) => (
            <React.Fragment key={listing.id}>
              <RecentListingItem
                listing={listing}
                onClick={() => handleListingClick(listing.id)}
              />
              {index < recentListings.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>

        {/* View All Button - Mobile */}
        {showViewAll && recentListings.length >= limit && (
          <Box sx={{ textAlign: 'center', mt: 2, display: { xs: 'block', md: 'none' } }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<ViewAllIcon />}
              onClick={handleViewAll}
              size="small"
            >
              View All Listings
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentListings;