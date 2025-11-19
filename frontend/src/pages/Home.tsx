import React from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Fab,
  Skeleton,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../contexts/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import StatsCards from '../components/dashboard/StatsCards';
import RecentListings from '../components/dashboard/RecentListings';

/**
 * Dashboard loading skeleton
 */
const DashboardSkeleton: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Container maxWidth="lg">
      {/* Header Skeleton */}
      <Box sx={{ mb: 4 }}>
        <Skeleton
          variant="text"
          width={isMobile ? '80%' : '60%'}
          height={60}
          sx={{ fontSize: '2rem' }}
        />
        <Skeleton
          variant="text"
          width={isMobile ? '60%' : '40%'}
          height={24}
        />
      </Box>

      {/* Create Button Skeleton */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
        <Skeleton variant="rectangular" width={200} height={40} />
      </Box>

      {/* Stats Cards Skeleton */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 3,
          mb: 4,
        }}
      >
        {[...Array(4)].map((_, index) => (
          <Skeleton
            key={index}
            variant="rectangular"
            height={180}
            sx={{ borderRadius: 1 }}
          />
        ))}
      </Box>

      {/* Recent Listings Skeleton */}
      <Skeleton
        variant="rectangular"
        height={300}
        sx={{ borderRadius: 1 }}
      />
    </Container>
  );
};

/**
 * Welcome message for new users
 */
const WelcomeMessage: React.FC<{ onCreateListing: () => void }> = ({ onCreateListing }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          textAlign: 'center',
          mt: 8,
          py: 6,
          px: 4,
          borderRadius: 2,
          bgcolor: 'background.paper',
          boxShadow: theme.shadows[3],
        }}
      >
        <DashboardIcon
          sx={{
            fontSize: 64,
            color: 'primary.main',
            mb: 3,
          }}
        />
        
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 'bold',
            fontSize: isMobile ? '2rem' : '2.5rem',
            mb: 2,
          }}
        >
          Welcome to Your Dashboard
        </Typography>
        
        <Typography
          variant="h6"
          color="text.secondary"
          paragraph
          sx={{
            fontSize: isMobile ? '1rem' : '1.25rem',
            mb: 4,
            maxWidth: 500,
            mx: 'auto',
          }}
        >
          Start your marketplace journey by creating your first listing. Track your sales, manage your inventory, and grow your business.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<AddIcon />}
            onClick={onCreateListing}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
            }}
          >
            Create Your First Listing
          </Button>
          
          <Button
            variant="outlined"
            color="primary"
            size="large"
            onClick={() => window.location.reload()}
            sx={{
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
            }}
          >
            Browse Listings
          </Button>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 4,
            fontStyle: 'italic',
          }}
        >
          Join thousands of sellers in your local community
        </Typography>
      </Box>
    </Container>
  );
};

/**
 * Main Dashboard Error Component
 */
const DashboardError: React.FC<{ onRetry: () => void; onRefresh: () => void }> = ({
  onRetry,
  onRefresh,
}) => {
  const isFirstLoad = React.useRef(true);

  // Call onRefresh only once on mount, not when the callback changes
  React.useEffect(() => {
    if (isFirstLoad.current) {
      onRefresh();
      isFirstLoad.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Container maxWidth="md">
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        }
        sx={{ mt: 4 }}
      >
        Unable to load dashboard data. Please check your connection and try again.
      </Alert>
    </Container>
  );
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const {
    stats,
    recentListings,
    isLoading,
    isInitialLoad,
    hasError,
    refetch,
  } = useDashboard();

  const handleCreateListing = () => {
    navigate('/create-listing');
  };

  const handleViewAllListings = () => {
    navigate('/listings');
  };

  const handleFilterChange = (filterType: string) => {
    // Navigate to listings with appropriate filter
    const filterParams = new URLSearchParams();
    
    switch (filterType) {
      case 'totalListings':
        // Show all listings
        break;
      case 'postedListings':
        filterParams.set('status', 'active');
        break;
      case 'draftListings':
        filterParams.set('status', 'draft');
        break;
      case 'soldListings':
        filterParams.set('status', 'sold');
        break;
    }
    
    navigate(`/listings?${filterParams.toString()}`);
  };

  const handleStatsRetry = () => {
    refetch();
  };

  // Show loading skeleton on initial load
  if (isInitialLoad) {
    return <DashboardSkeleton />;
  }

  // Show error state
  if (hasError) {
    return (
      <DashboardError
        onRetry={handleStatsRetry}
        onRefresh={refetch}
      />
    );
  }

  // Show welcome message for authenticated users with no data
  if (isAuthenticated && user && !stats && !recentListings.length) {
    return (
      <WelcomeMessage onCreateListing={handleCreateListing} />
    );
  }

  // Show public welcome message for non-authenticated users
  if (!isAuthenticated) {
    return (
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Typography variant="h2" component="h1" gutterBottom>
            Welcome to Local Marketplace
          </Typography>
          <Typography variant="h5" color="text.secondary" paragraph>
            Buy and sell items in your local community
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Browse listings, create your own, and connect with local buyers and sellers.
          </Typography>
          
          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => navigate('/listings')}
            >
              Browse Listings
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      {/* Dashboard Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <DashboardIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 'bold',
              fontSize: isMobile ? '1.75rem' : '2.25rem',
            }}
          >
            Dashboard
          </Typography>
        </Box>
        <Typography variant="subtitle1" color="text.secondary">
          Welcome back, {user?.fullName || user?.email || 'User'}! Here's what's happening with your listings.
        </Typography>
      </Box>

      {/* Create Listing Button */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          mb: 4,
        }}
      >
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<AddIcon />}
          onClick={handleCreateListing}
          sx={{
            px: 4,
            py: 1.5,
            fontSize: '1rem',
            boxShadow: theme.shadows[4],
            '&:hover': {
              boxShadow: theme.shadows[8],
            },
          }}
        >
          Create New Listing
        </Button>
      </Box>

      {/* Stats Cards */}
      <StatsCards
        onFilterChange={handleFilterChange}
        showLoading={isLoading}
      />

      {/* Recent Listings */}
      <RecentListings
        limit={5}
        showViewAll={true}
        onViewAll={handleViewAllListings}
      />

      {/* Mobile Floating Action Button */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="create listing"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            boxShadow: theme.shadows[6],
          }}
          onClick={handleCreateListing}
        >
          <AddIcon />
        </Fab>
      )}
    </Container>
  );
};

export default Home;