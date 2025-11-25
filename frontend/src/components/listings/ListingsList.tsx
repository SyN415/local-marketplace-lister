import React, { useState } from 'react';
import {
  Eye,
  Edit,
  Trash2,
  Heart,
  Plus,
  Send,
  MoreVertical,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { cn } from '../../lib/utils';
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
      <Card className="h-full overflow-hidden">
        <Skeleton className="h-48 w-full" />
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Skeleton className="h-9 w-full" />
        </CardFooter>
      </Card>
    );
  }

  const getStatusConfig = (status: ListingsListItem['status']) => {
    switch (status) {
      case 'active':
        return { label: 'Active', variant: 'default' as const, className: 'bg-green-500 hover:bg-green-600' };
      case 'sold':
        return { label: 'Sold', variant: 'destructive' as const, className: '' };
      case 'expired':
        return { label: 'Expired', variant: 'secondary' as const, className: 'bg-orange-500 hover:bg-orange-600 text-white' };
      default:
        return { label: status, variant: 'secondary' as const, className: '' };
    }
  };

  const statusConfig = getStatusConfig(listing.status);

  return (
    <Card 
      className={cn(
        "group relative h-full overflow-hidden bg-glass-bg border-glass-border transition-all duration-300 hover:shadow-glass hover:-translate-y-1",
        selected && "ring-2 ring-primary"
      )}
    >
      {/* Selection checkbox */}
      {onSelect && (
        <div className="absolute top-2 right-2 z-10">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelect(checked === true)}
            className="bg-white/80 backdrop-blur-sm data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
          />
        </div>
      )}

      {/* Status badge */}
      <div className="absolute top-2 left-2 z-10">
        <Badge variant={statusConfig.variant} className={cn("shadow-sm", statusConfig.className)}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={listing.imageUrl || '/api/placeholder/300/200'}
          alt={listing.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/api/placeholder/300/200';
          }}
        />
        
        {/* Favorite button overlay */}
        {actions?.onToggleFavorite && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              actions.onToggleFavorite?.(listing);
            }}
          >
            <Heart className="h-4 w-4" />
          </Button>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-display font-semibold text-lg leading-tight truncate" title={listing.title}>
            {listing.title}
          </h3>
          <p className="mt-1 text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            ${listing.price.toLocaleString()}
          </p>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5em]">
          {listing.description || 'No description available'}
        </p>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800">
            {listing.category}
          </Badge>
          <Badge variant="outline" className="text-xs bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800 capitalize">
            {listing.condition.replace('_', ' ')}
          </Badge>
        </div>

        <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
          {listing.location && (
            <span className="flex items-center gap-1">
              📍 {listing.location}
            </span>
          )}
          <span>{new Date(listing.createdAt).toLocaleDateString()}</span>
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="p-4 pt-0 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => actions?.onView?.(listing)}
          >
            <Eye className="mr-2 h-3 w-3" /> View
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions?.onEdit && (
                <DropdownMenuItem onClick={() => actions.onEdit?.(listing)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {actions?.onCrossPost && (
                <DropdownMenuItem onClick={() => actions.onCrossPost?.(listing)}>
                  <Send className="mr-2 h-4 w-4" /> Post
                </DropdownMenuItem>
              )}
              {actions?.onDelete && (
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => actions.onDelete?.(listing)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
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
        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
        <TableCell><div className="flex items-center gap-2"><Skeleton className="h-10 w-10 rounded" /><div className="space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16" /></div></div></TableCell>
        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => actions?.onView?.(listing)}
    >
      <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect?.(checked === true)}
        />
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-3">
          <img
            src={listing.imageUrl || '/api/placeholder/60/60'}
            alt={listing.title}
            className="h-10 w-10 rounded object-cover bg-muted"
          />
          <div>
            <div className="font-medium">{listing.title}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
              {listing.description || 'No description'}
            </div>
          </div>
        </div>
      </TableCell>
      
      <TableCell className="text-right font-medium">
        ${listing.price.toLocaleString()}
      </TableCell>
      
      <TableCell>
        <Badge variant="outline">{listing.category}</Badge>
      </TableCell>
      
      <TableCell>
        <Badge 
          variant={listing.status === 'active' ? 'default' : listing.status === 'sold' ? 'destructive' : 'secondary'}
          className={listing.status === 'active' ? 'bg-green-500 hover:bg-green-600' : ''}
        >
          {listing.status}
        </Badge>
      </TableCell>
      
      <TableCell className="text-muted-foreground text-sm">
        {new Date(listing.createdAt).toLocaleDateString()}
      </TableCell>

      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions?.onEdit && (
              <DropdownMenuItem onClick={() => actions.onEdit?.(listing)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
            )}
            {actions?.onCrossPost && (
              <DropdownMenuItem onClick={() => actions.onCrossPost?.(listing)}>
                <Send className="mr-2 h-4 w-4" /> Post
              </DropdownMenuItem>
            )}
            {actions?.onDelete && (
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => actions.onDelete?.(listing)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
    actionIcon: <Plus className="mr-2 h-4 w-4" />,
    onAction: onCreateListing,
  };

  const finalConfig = { ...defaultConfig, ...config };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 border-2 border-dashed rounded-lg bg-muted/20">
      <div className="p-4 rounded-full bg-muted mb-4">
        <Plus className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {finalConfig.title}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        {finalConfig.description}
      </p>
      {finalConfig.onAction && (
        <Button onClick={finalConfig.onAction} size="lg">
          {finalConfig.actionIcon}
          {finalConfig.actionLabel}
        </Button>
      )}
    </div>
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
  const [currentViewMode] = useState<ViewMode>(viewMode);

  // Handle page change (simple wrapper for now)
  const handlePageChange = (newPage: number) => {
    onPageChange(newPage);
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
  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      const newSelectedIds = checked
        ? listings.map(listing => listing.id)
        : [];
      onSelectionChange(newSelectedIds);
    }
  };

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load listings: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  // Grid view
  if (currentViewMode === 'grid') {
    return (
      <div className="space-y-6">
        {/* Loading progress overlay if needed */}
        {/* {loading && <div className="absolute inset-0 bg-background/50 z-50 flex items-center justify-center">Loading...</div>} */}

        {/* Grid of listing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
        </div>

        {/* Empty state */}
        {!loading && listings.length === 0 && (
          <EmptyState
            config={emptyState}
            onCreateListing={() => actions?.onEdit?.({} as ListingsListItem)}
          />
        )}

        {/* Pagination - Simple implementation for MVP */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center mt-8 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <span className="flex items-center text-sm text-muted-foreground px-4">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Table view
  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={listings.length > 0 && selectedIds.length === listings.length}
                  onCheckedChange={(checked) => handleSelectAll(checked === true)}
                />
              </TableHead>
              <TableHead>Listing</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
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
            
            {loading && Array.from({ length: 5 }).map((_, index) => (
              <ListingTableRow
                key={`skeleton-${index}`}
                listing={{} as ListingsListItem}
                loading
              />
            ))}

            {!loading && listings.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <EmptyState
                    config={emptyState}
                    onCreateListing={() => actions?.onEdit?.({} as ListingsListItem)}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination for table */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingsList;