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

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: 0,
        border: '2px solid #000',
        transition: 'all 0.1s ease-in-out',
        cursor: clickable ? 'pointer' : 'default',
        bgcolor: 'background.paper',
        '&:hover': clickable ? {
          bgcolor: 'action.hover',
        } : {},
      }}
      onClick={handleClick}
    >
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontSize: '0.875rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'text.secondary',
            }}
          >
            {title}
          </Typography>
          <Box
            sx={{
              color: 'text.primary',
              transform: 'scale(1.2)',
            }}
          >
            {icon}
          </Box>
        </Box>

        {loading ? (
          <Skeleton
            variant="text"
            width="60%"
            height={60}
          />
        ) : error ? (
          <Alert
            severity="error"
            sx={{
              p: 0,
              minHeight: 40,
              borderRadius: 0,
              alignItems: 'center',
              '& .MuiAlert-message': { p: 0 },
            }}
          >
            <Typography variant="body2" color="error">
              Error
            </Typography>
          </Alert>
        ) : (
          <Typography
            variant="h2"
            component="div"
            sx={{
              fontWeight: 900,
              color: 'text.primary',
              mb: 0,
              fontSize: isMobile ? '2.5rem' : '3.5rem',
              lineHeight: 1,
              letterSpacing: '-0.03em',
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
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          OVERVIEW
        </Typography>
        {isLoading && (
          <Chip
            label="Refreshing..."
            size="small"
            sx={{
              ml: 2,
              borderRadius: 0,
              border: '1px solid #000',
              fontWeight: 600,
              bgcolor: 'transparent'
            }}
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
          <Card
            elevation={0}
            sx={{
              border: '2px solid #000',
              borderRadius: 0,
              height: '100%'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, textTransform: 'uppercase', mb: 2 }}>
                Category Breakdown
              </Typography>
              {Object.keys(stats.categoryBreakdown || {}).length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(stats.categoryBreakdown).map(([category, count]) => (
                    <Box
                      key={category}
                      sx={{
                        border: '1px solid #000',
                        px: 1.5,
                        py: 0.5,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                      }}
                    >
                      {category}: {count}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No category data available
                </Typography>
              )}
            </CardContent>
          </Card>
          <Card
            elevation={0}
            sx={{
              border: '2px solid #000',
              borderRadius: 0,
              height: '100%'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, textTransform: 'uppercase', mb: 1 }}>
                Portfolio Value
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: '-0.03em' }}>
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