/**
 * RecentListings Component
 *
 * Design System implementation
 * Features:
 * - Animated listing items
 * - Image thumbnails with fallback
 * - Status badges with colors
 * - Empty state with mascot
 * - Soft corners and shadows
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Package,
  Plus,
  ChevronRight,
  Clock,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRecentListings } from '../../hooks/useDashboard';
import type { RecentListing } from '../../types/dashboard';
import { Mascot } from '../ui/Mascot';
import { cn } from '../../lib/utils';

interface RecentListingsProps {
  limit?: number;
}

// Animation variants
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
};

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
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        dotColor: 'bg-emerald-500',
      };
    case 'sold':
      return {
        label: 'Sold',
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        dotColor: 'bg-blue-500',
      };
    case 'expired':
      return {
        label: 'Expired',
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        dotColor: 'bg-amber-500',
      };
    case 'draft':
      return {
        label: 'Draft',
        className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
        dotColor: 'bg-gray-400',
      };
    default:
      return {
        label: status,
        className: 'bg-muted text-muted-foreground',
        dotColor: 'bg-muted-foreground',
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
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 p-4 rounded-xl bg-muted/30"
        >
          <Skeleton className="h-14 w-14 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4 rounded-lg" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-16 rounded-lg" />
              <Skeleton className="h-4 w-14 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-4 w-12 rounded-lg" />
        </div>
      ))}
    </div>
  );
};

/**
 * Individual Recent Listing Item Component
 */
const RecentListingItem: React.FC<{
  listing: RecentListing;
  onClick?: () => void;
}> = ({ listing, onClick }) => {
  const statusConfig = getStatusConfig(listing.status);
  const hasImage = listing.images && listing.images.length > 0;
  
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ x: 4 }}
      className={cn(
        "group flex items-center gap-4 p-4 rounded-xl transition-colors",
        "hover:bg-muted/50 cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <Avatar className="h-14 w-14 rounded-xl border border-border/50 shadow-sm">
        {hasImage ? (
          <AvatarImage
            src={listing.images![0]}
            alt={listing.title}
            className="object-cover"
          />
        ) : null}
        <AvatarFallback className="rounded-xl bg-gradient-to-br from-muted to-muted/50">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-display font-semibold text-foreground truncate mb-1 group-hover:text-primary transition-colors">
          {listing.title}
        </h4>
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-foreground">
            {formatPrice(listing.price)}
          </span>
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] h-5 rounded-full px-2 font-medium",
              statusConfig.className
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", statusConfig.dotColor)} />
            {statusConfig.label}
          </Badge>
        </div>
      </div>
      
      {/* Time and arrow */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-xs text-foreground-muted">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(listing.createdAt)}
        </div>
        <ChevronRight className="h-4 w-4 text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </motion.div>
  );
};

/**
 * Empty State Component with Mascot
 */
const EmptyRecentListings: React.FC<{ onCreate: () => void }> = ({ onCreate }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      <Mascot
        variation="sleepy"
        size="lg"
        animated
        animation="float"
        className="mb-6"
      />
      
      <h3 className="font-display font-bold text-xl text-foreground mb-2">
        No listings yet
      </h3>
      <p className="text-foreground-muted max-w-sm mb-6">
        Create your first listing and start selling across multiple marketplaces instantly.
      </p>
      
      <Button
        onClick={onCreate}
        className="bg-gradient-to-r from-[var(--color-pulse)] to-[var(--color-drift)] hover:opacity-90 text-white font-display font-semibold rounded-xl"
      >
        <Plus className="mr-2 h-4 w-4" />
        Create Your First Listing
      </Button>
    </motion.div>
  );
};

/**
 * Error State Component
 */
const ErrorRecentListings: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-10 px-6 text-center"
    >
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="font-display font-semibold text-foreground mb-1">
        Failed to load listings
      </h3>
      <p className="text-sm text-foreground-muted mb-4">
        Something went wrong. Please try again.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="rounded-xl"
      >
        Try Again
      </Button>
    </motion.div>
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
    refetch,
  } = useRecentListings(limit);

  const handleListingClick = (listingId: string) => {
    navigate(`/listings/${listingId}`);
  };

  const handleCreateListing = () => {
    navigate('/create-listing');
  };

  const handleViewAll = () => {
    navigate('/listings');
  };

  return (
    <Card className="rounded-2xl border-border/50 bg-card overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-pulse)] to-[var(--color-drift)] flex items-center justify-center text-white">
              <Package className="h-5 w-5" />
            </div>
            <h3 className="font-display font-semibold text-foreground">
              Recent Listings
            </h3>
          </div>
          
          {recentListings.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewAll}
              className="text-primary hover:text-primary hover:bg-primary/5 rounded-lg"
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="p-2">
          {isLoading ? (
            <RecentListingsSkeleton />
          ) : error ? (
            <ErrorRecentListings onRetry={refetch} />
          ) : recentListings.length === 0 ? (
            <EmptyRecentListings onCreate={handleCreateListing} />
          ) : (
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence>
                {recentListings.map((listing) => (
                  <RecentListingItem
                    key={listing.id}
                    listing={listing}
                    onClick={() => handleListingClick(listing.id)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentListings;