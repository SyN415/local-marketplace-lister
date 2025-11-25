import React from 'react';
import {
  Card,
  CardContent,
} from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { Alert, AlertTitle } from '../ui/alert';
import {
  Package,
  Eye,
  FileEdit,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useDashboardStats } from '../../hooks/useDashboard';
import { cn } from '../../lib/utils';

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
      className={cn(
        "h-full rounded-none border-2 border-black bg-card transition-all duration-100 dark:border-white/20",
        clickable && "cursor-pointer hover:bg-accent/50"
      )}
      onClick={handleClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground font-display">
            {title}
          </h4>
          <div className="text-foreground scale-125">
            {icon}
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-14 w-3/5" />
        ) : error ? (
          <Alert variant="destructive" className="p-2 min-h-[40px] flex items-center rounded-none border-none">
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertTitle className="mb-0 text-sm">Error</AlertTitle>
          </Alert>
        ) : (
          <div className="text-4xl sm:text-5xl font-black text-foreground mb-0 leading-none tracking-tight font-display">
            {formatValue(value)}
          </div>
        )}

        {clickable && !loading && !error && (
          <Badge 
            variant="outline" 
            className="mt-4 text-xs h-6 rounded-none border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Click to filter
          </Badge>
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
      icon: <Package className="h-8 w-8" />,
      clickable: true,
    },
    {
      key: 'postedListings',
      title: 'Posted',
      value: stats?.postedListings || 0,
      color: 'success' as const,
      icon: <Eye className="h-8 w-8" />,
      clickable: true,
    },
    {
      key: 'draftListings',
      title: 'Drafts',
      value: stats?.draftListings || 0,
      color: 'warning' as const,
      icon: <FileEdit className="h-8 w-8" />,
      clickable: true,
    },
    {
      key: 'soldListings',
      title: 'Sold',
      value: stats?.soldListings || 0,
      color: 'info' as const,
      icon: <CheckCircle className="h-8 w-8" />,
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
    <div className="mb-8">
      <div className="flex items-center mb-8">
        <h2 className="text-2xl font-extrabold uppercase tracking-tight font-display">
          OVERVIEW
        </h2>
        {isLoading && (
          <Badge
            variant="outline"
            className="ml-4 rounded-none border-black font-semibold bg-transparent dark:border-white"
          >
            Refreshing...
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {cardConfigs.map((config) => (
          <div key={config.key}>
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
          </div>
        ))}
      </div>

      {/* Summary stats row for larger screens */}
      {stats && !isDataLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          <Card className="h-full rounded-none border-2 border-black bg-card dark:border-white/20">
            <CardContent className="p-6">
              <h6 className="text-lg font-bold uppercase mb-4 font-display">
                Category Breakdown
              </h6>
              {Object.keys(stats.categoryBreakdown || {}).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.categoryBreakdown).map(([category, count]) => (
                    <div
                      key={category}
                      className="border border-black px-3 py-1 text-sm font-semibold dark:border-white/50"
                    >
                      {category}: {count}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No category data available
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="h-full rounded-none border-2 border-black bg-card dark:border-white/20">
            <CardContent className="p-6">
              <h6 className="text-lg font-bold uppercase mb-2 font-display">
                Portfolio Value
              </h6>
              <div className="text-4xl font-black tracking-tight font-display mb-2">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(stats.totalValue || 0)}
              </div>
              <p className="text-sm text-muted-foreground">
                Combined value of all listings
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StatsCards;