import React from 'react';
import {
  Card,
  CardContent,
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  Eye,
  ShoppingCart,
  Package,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRecentListings } from '../../hooks/useDashboard';
import type { RecentListing } from '../../types/dashboard';
import { cn } from '../../lib/utils';

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
        className: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
        icon: <Package className="h-4 w-4" />,
      };
    case 'sold':
      return {
        label: 'Sold',
        className: 'bg-info/10 text-info border-info/20 hover:bg-info/20',
        icon: <ShoppingCart className="h-4 w-4" />,
      };
    case 'expired':
      return {
        label: 'Expired',
        className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
        icon: <Eye className="h-4 w-4" />,
      };
    default:
      return {
        label: status,
        className: 'bg-muted text-muted-foreground hover:bg-muted/80',
        icon: <Package className="h-4 w-4" />,
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
    <CardContent className="p-0">
      <div className="p-6 border-b-2 border-black bg-muted/20 dark:border-white/20">
        <h6 className="font-bold uppercase tracking-tight font-display">
          Recent Listings
        </h6>
      </div>
      
      <div className="divide-y divide-border">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="p-4 flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-none" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
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
  const statusConfig = getStatusConfig(listing.status);
  
  return (
    <div
      className={cn(
        "group flex items-center p-4 gap-4 border-b border-border last:border-0 transition-colors hover:bg-accent/50 cursor-pointer",
        !onClick && "cursor-default"
      )}
      onClick={onClick}
    >
      <Avatar className="h-12 w-12 rounded-none border border-border">
        <AvatarFallback className={cn("bg-background", statusConfig.className)}>
          {statusConfig.icon}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm truncate mb-1 group-hover:text-primary transition-colors font-display">
          {listing.title}
        </h4>
        <div className="flex items-center gap-3">
          <span className="font-bold text-foreground">
            {formatPrice(listing.price)}
          </span>
          <Badge 
            variant="outline" 
            className={cn("text-[10px] h-5 rounded-none px-1.5 font-bold uppercase", statusConfig.className)}
          >
            {statusConfig.label}
          </Badge>
        </div>
      </div>
      
      <div className="text-right text-xs text-muted-foreground whitespace-nowrap font-medium">
        {formatRelativeTime(listing.createdAt)}
      </div>
    </div>
  );
};

/**
 * Empty State Component
 */
const EmptyRecentListings: React.FC<{ onCreate: () => void }> = ({ onCreate }) => {
  return (
    <CardContent className="p-8">
      <div className="text-center py-8">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h6 className="text-lg font-bold uppercase mb-2 font-display">
          No recent listings
        </h6>
        <p className="text-muted-foreground mb-6">
          Start creating listings to see them here
        </p>
        <Button
          onClick={onCreate}
          className="font-bold uppercase tracking-wide rounded-none"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create First Listing
        </Button>
      </div>
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
      <Card className="mb-6 rounded-none border-2 border-black dark:border-white/20">
        <RecentListingsSkeleton />
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card className="mb-6 rounded-none border-2 border-black dark:border-white/20">
        <Alert variant="destructive" className="m-4 border-none rounded-none">
          <AlertDescription className="flex items-center justify-between">
            <span>Failed to load recent listings. Please try again.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="ml-4 h-8"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  // Show empty state
  if (recentListings.length === 0) {
    return (
      <Card className="mb-6 rounded-none border-2 border-black dark:border-white/20">
        <EmptyRecentListings onCreate={handleCreateListing} />
      </Card>
    );
  }

  return (
    <Card className="mb-6 rounded-none border-2 border-black dark:border-white/20 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-6 border-b-2 border-black bg-muted/30 dark:border-white/20">
          <h6 className="font-extrabold uppercase tracking-tight text-lg font-display">
            Recent Listings
          </h6>
        </div>

        {/* Listings */}
        <div className="bg-card">
          {recentListings.map((listing) => (
            <RecentListingItem
              key={listing.id}
              listing={listing}
              onClick={() => handleListingClick(listing.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentListings;