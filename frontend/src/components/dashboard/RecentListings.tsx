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
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useRecentListings } from '../../hooks/useDashboard';
import type { RecentListing } from '../../types/dashboard';

interface RecentListingsProps {
  limit?: number;
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
        borderColor: 'success.main',
      };
    case 'sold':
      return {
        label: 'Sold',
        color: 'info' as const,
        icon: <SoldIcon fontSize="small" />,
        borderColor: 'info.main',
      };
    case 'expired':
      return {
        label: 'Expired',
        color: 'warning' as const,
        icon: <EyeIcon fontSize="small" />,
        borderColor: 'warning.main',
      };
    default:
      return {
        label: status,
        color: 'default' as const,
        icon: <ActiveIcon fontSize="small" />,
        borderColor: 'grey.500',
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
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
          Recent Listings
        </Typography>
      </Box>
      
      <List sx={{ p: 0 }}>
        {[...Array(5)].map((_, index) => (
          <ListItem key={index} sx={{ px: 0, py: 2, borderBottom: '1px solid #eee' }}>
            <ListItemAvatar>
              <Skeleton
                variant="rectangular"
                width={48}
                height={48}
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
        px: 2,
        py: 2,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.1s ease',
        borderBottom: '1px solid #eee',
        '&:hover': onClick ? {
          backgroundColor: 'action.hover',
        } : {},
        borderRadius: 0,
      }}
      onClick={onClick}
    >
      <ListItemAvatar>
        <Avatar
          variant="square"
          sx={{
            width: 48,
            height: 48,
            bgcolor: getAvatarBg(),
            color: theme.palette.getContrastText(getAvatarBg()),
            borderRadius: 0,
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
              fontWeight: 700,
              fontSize: isMobile ? '0.9rem' : '1rem',
              mb: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {listing.title}
          </Typography>
        }
        secondary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
            <Typography
              variant="body1"
              color="text.primary"
              sx={{ fontWeight: 700 }}
            >
              {formatPrice(listing.price)}
            </Typography>
            <Chip
              label={statusConfig.label}
              size="small"
              variant="outlined"
              sx={{
                height: 24,
                borderRadius: 0,
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                borderColor: (statusConfig as any).borderColor || 'grey.300',
                color: (statusConfig as any).borderColor || 'text.secondary',
                '& .MuiChip-label': {
                   px: 1
                }
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
    <CardContent sx={{ p: 4 }}>
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <ActiveIcon sx={{ fontSize: 48, color: 'text.primary', mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, textTransform: 'uppercase', mb: 1 }}>
          No recent listings
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 3 }}>
          Start creating listings to see them here
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={onCreate}
          sx={{
            borderRadius: 0,
            fontWeight: 700,
            textTransform: 'uppercase',
            boxShadow: 'none',
            border: '2px solid transparent',
            '&:hover': {
              boxShadow: 'none',
              bgcolor: 'primary.dark',
            }
          }}
        >
          Create First Listing
        </Button>
      </Box>
    </CardContent>
  );
};

const RecentListings: React.FC<RecentListingsProps> = ({
  limit = 5,
}) => {
  const navigate = useNavigate();
  const {
    data: recentListings = [],
    isLoading,
    error,
  } = useRecentListings(limit);

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
      <Card elevation={0} sx={{ mb: 3, border: '2px solid #000', borderRadius: 0 }}>
        <EmptyRecentListings onCreate={handleCreateListing} />
      </Card>
    );
  }

  return (
    <Card elevation={0} sx={{ mb: 3, border: '2px solid #000', borderRadius: 0 }}>
      <CardContent sx={{ p: 0 }}>
        {/* Header */}
        <Box sx={{
          p: 3,
          borderBottom: '2px solid #000',
          bgcolor: 'background.default'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
            Recent Listings
          </Typography>
        </Box>

        {/* Listings */}
        <List sx={{ p: 0 }}>
          {recentListings.map((listing, index) => (
            <React.Fragment key={listing.id}>
              <RecentListingItem
                listing={listing}
                onClick={() => handleListingClick(listing.id)}
              />
            </React.Fragment>
          ))}
        </List>

      </CardContent>
    </Card>
  );
};

export default RecentListings;