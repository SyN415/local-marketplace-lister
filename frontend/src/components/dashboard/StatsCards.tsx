/**
 * StatsCards Component
 *
 * Design System implementation
 * Features:
 * - Animated stat cards with gradients
 * - Soft corners and shadows
 * - Icon-based visual hierarchy
 * - Responsive grid layout
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
} from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import {
  Package,
  Eye,
  FileEdit,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Layers,
} from 'lucide-react';
import { useDashboardStats } from '../../hooks/useDashboard';
import { cn } from '../../lib/utils';

interface StatsCardProps {
  title: string;
  value: number | null;
  icon: React.ReactNode;
  gradient: string;
  loading?: boolean;
  error?: Error | null;
  onClick?: () => void;
  clickable?: boolean;
  index?: number;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  }),
};

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  gradient,
  loading = false,
  error = null,
  onClick,
  clickable = false,
  index = 0,
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
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={clickable ? { scale: 1.02, y: -4 } : undefined}
      whileTap={clickable ? { scale: 0.98 } : undefined}
    >
      <Card
        className={cn(
          "h-full relative overflow-hidden rounded-2xl border-border/50 bg-card transition-all duration-300",
          "hover:shadow-lg hover:shadow-primary/5",
          clickable && "cursor-pointer"
        )}
        onClick={handleClick}
      >
        {/* Gradient background */}
        <div
          className={cn(
            "absolute inset-0 opacity-10",
            `bg-gradient-to-br ${gradient}`
          )}
        />
        
        <CardContent className="relative z-10 p-5">
          {/* Icon */}
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
            `bg-gradient-to-br ${gradient}`,
            "text-white shadow-md"
          )}>
            {icon}
          </div>

          {/* Title */}
          <h4 className="text-sm font-medium text-foreground-muted mb-1">
            {title}
          </h4>

          {/* Value */}
          {loading ? (
            <Skeleton className="h-9 w-2/3 rounded-lg" />
          ) : error ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Error</span>
            </div>
          ) : (
            <div className="text-3xl font-display font-bold text-foreground tracking-tight">
              {formatValue(value)}
            </div>
          )}

          {/* Click hint */}
          {clickable && !loading && !error && (
            <Badge
              variant="secondary"
              className="mt-3 text-xs h-5 rounded-full bg-muted/50 text-foreground-muted"
            >
              Click to filter
            </Badge>
          )}
        </CardContent>
      </Card>
    </motion.div>
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

  // Define card configurations with gradients
  const cardConfigs = [
    {
      key: 'totalListings',
      title: 'Total Listings',
      value: stats?.totalListings || 0,
      gradient: 'from-[var(--color-pulse)] to-[var(--color-drift)]',
      icon: <Package className="h-6 w-6" />,
      clickable: true,
    },
    {
      key: 'postedListings',
      title: 'Active',
      value: stats?.postedListings || 0,
      gradient: 'from-[var(--color-calm)] to-emerald-500',
      icon: <Eye className="h-6 w-6" />,
      clickable: true,
    },
    {
      key: 'draftListings',
      title: 'Drafts',
      value: stats?.draftListings || 0,
      gradient: 'from-amber-500 to-orange-500',
      icon: <FileEdit className="h-6 w-6" />,
      clickable: true,
    },
    {
      key: 'soldListings',
      title: 'Sold',
      value: stats?.soldListings || 0,
      gradient: 'from-blue-500 to-cyan-500',
      icon: <CheckCircle className="h-6 w-6" />,
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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-display font-semibold text-foreground">
          Overview
        </h2>
        {isLoading && (
          <Badge
            variant="outline"
            className="rounded-full border-primary/30 text-primary bg-primary/5"
          >
            <span className="animate-pulse">Refreshing...</span>
          </Badge>
        )}
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cardConfigs.map((config, index) => (
          <StatsCard
            key={config.key}
            title={config.title}
            value={config.value}
            icon={config.icon}
            gradient={config.gradient}
            loading={isDataLoading}
            error={getCardError(config.key)}
            clickable={config.clickable}
            onClick={() => handleCardClick(config.key)}
            index={index}
          />
        ))}
      </div>

      {/* Summary Row */}
      {stats && !isDataLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {/* Category Breakdown */}
          <Card className="rounded-2xl border-border/50 bg-card overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="font-display font-semibold text-foreground">
                  Category Breakdown
                </h3>
              </div>
              
              {Object.keys(stats.categoryBreakdown || {}).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.categoryBreakdown).map(([category, count]) => (
                    <Badge
                      key={category}
                      variant="secondary"
                      className="rounded-full px-3 py-1 font-medium bg-muted/50"
                    >
                      {category}: {count}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-foreground-muted">
                  No category data available yet. Create your first listing!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Portfolio Value */}
          <Card className="rounded-2xl border-border/50 bg-card overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="font-display font-semibold text-foreground">
                  Portfolio Value
                </h3>
              </div>
              
              <div className="text-3xl font-display font-bold text-foreground tracking-tight mb-1">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(stats.totalValue || 0)}
              </div>
              <p className="text-sm text-foreground-muted">
                Combined value of all your listings
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default StatsCards;