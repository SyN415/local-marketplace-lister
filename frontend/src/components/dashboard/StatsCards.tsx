import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
  Chip,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Inventory2 as InventoryIcon,
  Visibility as VisibleIcon,
  Edit as DraftIcon,
  CheckCircle as SoldIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useDashboardStats } from '../../hooks/useDashboard';

interface StatsCardProps {
  title: string;
  value: number | null;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  loading?: boolean;
  error?: Error | null;
  onClick?: () => void;
  clickable?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  color,
  loading = false,
  error = null,
  onClick,
  clickable = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleClick = () => {
    if (clickable && onClick) {
      onClick();
    }
  };

  const formatValue = (val: number | null): string => {
    if (val === null || val === undefined) return '0';
    
    if (title.toLowerCase().includes('value') || title.toLowerCase().includes('total')) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val);
    }
    
    return val.toLocaleString();
  };

  const getStatusColor = (color: string) => {
    const paletteColor = theme.palette[color as keyof typeof theme.palette] as any;
    return paletteColor?.main || theme.palette.primary.main;
  };

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'all 0.2s ease-in-out',
        cursor: clickable ? 'pointer' : 'default',
        '&:hover': clickable ? {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8],
        } : {},
        border: clickable ? `1px solid ${theme.palette.divider}` : 'none',
      }}
      onClick={handleClick}
    >
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: 500,
            }}
          >
            {title}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: `${getStatusColor(color)}20`,
              color: getStatusColor(color),
            }}
          >
            {icon}
          </Box>
        </Box>

        {loading ? (
          <Skeleton
            variant="text"
            width="60%"
            height={40}
            sx={{ fontSize: '2rem' }}
          />
        ) : error ? (
          <Alert
            severity="error"
            sx={{
              p: 1,
              minHeight: 40,
              alignItems: 'center',
              '& .MuiAlert-message': { p: 0 },
            }}
          >
            <Typography variant="body2" color="error">
              Failed to load
            </Typography>
          </Alert>
        ) : (
          <Typography
            variant="h3"
            component="div"
            sx={{
              fontWeight: 'bold',
              color: getStatusColor(color),
              mb: 1,
              fontSize: isMobile ? '2rem' : '2.5rem',
              lineHeight: 1.2,
            }}
          >
            {formatValue(value)}
          </Typography>
        )}

        {clickable && !loading && !error && (
          <Chip
            label="Click to filter"
            size="small"
            variant="outlined"
            color="primary"
            sx={{
              fontSize: '0.75rem',
              height: 24,
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};

interface StatsCardsProps {
  onFilterChange?: (filterType: string) => void;
  showLoading?: boolean;
}

const StatsCards: React.FC<StatsCardsProps> = ({
  onFilterChange,
  showLoading = false,
}) => {
  const {
    data: stats,
    isLoading,
    error,
  } = useDashboardStats();

  // Define card configurations
  const cardConfigs = [
    {
      key: 'totalListings',
      title: 'Total Listings',
      value: stats?.totalListings || 0,
      color: 'primary' as const,
      icon: <InventoryIcon fontSize="large" />,
      clickable: true,
    },
    {
      key: 'postedListings',
      title: 'Posted',
      value: stats?.postedListings || 0,
      color: 'success' as const,
      icon: <VisibleIcon fontSize="large" />,
      clickable: true,
    },
    {
      key: 'draftListings',
      title: 'Drafts',
      value: stats?.draftListings || 0,
      color: 'warning' as const,
      icon: <DraftIcon fontSize="large" />,
      clickable: true,
    },
    {
      key: 'soldListings',
      title: 'Sold',
      value: stats?.soldListings || 0,
      color: 'info' as const,
      icon: <SoldIcon fontSize="large" />,
      clickable: true,
    },
  ];

  const handleCardClick = (filterType: string) => {
    if (onFilterChange) {
      onFilterChange(filterType);
    }
  };

  const getCardError = (_filterType: string) => {
    return error;
  };

  const isDataLoading = showLoading || isLoading;

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
          Dashboard Overview
        </Typography>
        {isLoading && (
          <Chip
            label="Refreshing..."
            size="small"
            color="primary"
            variant="outlined"
            sx={{ ml: 2 }}
          />
        )}
      </Box>

      {/* Stats Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 3,
          mb: 3,
        }}
      >
        {cardConfigs.map((config) => (
          <Box key={config.key}>
            <StatsCard
              title={config.title}
              value={config.value}
              icon={config.icon}
              color={config.color}
              loading={isDataLoading}
              error={getCardError(config.key)}
              clickable={config.clickable}
              onClick={() => handleCardClick(config.key)}
            />
          </Box>
        ))}
      </Box>

      {/* Summary stats row for larger screens */}
      {stats && !isDataLoading && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg: '2fr 1fr',
            },
            gap: 3,
          }}
        >
          <Card sx={{ bgcolor: 'background.default' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Category Breakdown
              </Typography>
              {Object.keys(stats.categoryBreakdown || {}).length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(stats.categoryBreakdown).map(([category, count]) => (
                    <Chip
                      key={category}
                      label={`${category}: ${count}`}
                      variant="outlined"
                      size="small"
                      color="primary"
                    />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No category data available
                </Typography>
              )}
            </CardContent>
          </Card>
          <Card sx={{ bgcolor: 'background.default' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Portfolio Value
              </Typography>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(stats.totalValue || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Combined value of all listings
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default StatsCards;