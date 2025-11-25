/**
 * Empty State Component
 * 
 * Displays a friendly empty state with mascot
 * Used when there's no data to display
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './button';
import { Mascot } from './Mascot';
import type { MascotVariation } from './Mascot';
import { cn } from '../../lib/utils';
import { Plus, RefreshCw, ArrowRight } from 'lucide-react';

export interface EmptyStateProps {
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Mascot variation to display */
  mascotVariation?: MascotVariation;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Additional className */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: {
    mascot: 'sm' as const,
    title: 'text-lg',
    description: 'text-sm',
    container: 'py-8',
  },
  md: {
    mascot: 'md' as const,
    title: 'text-xl',
    description: 'text-base',
    container: 'py-12',
  },
  lg: {
    mascot: 'lg' as const,
    title: 'text-2xl',
    description: 'text-lg',
    container: 'py-16',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  mascotVariation = 'sleepy',
  action,
  secondaryAction,
  className,
  size = 'md',
}) => {
  const config = sizeConfig[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        config.container,
        className
      )}
    >
      <Mascot
        variation={mascotVariation}
        size={config.mascot}
        animated
        animation="float"
        className="mb-6"
      />

      <h3 className={cn(
        'font-display font-bold text-foreground mb-2',
        config.title
      )}>
        {title}
      </h3>

      {description && (
        <p className={cn(
          'text-foreground-muted max-w-md mb-6',
          config.description
        )}>
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-display font-semibold rounded-xl"
            >
              {action.icon || <Plus className="w-4 h-4 mr-2" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              className="border-primary/30 text-primary hover:bg-primary/5 font-display rounded-xl"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
};

/**
 * Empty Listings State
 */
export const EmptyListings: React.FC<{
  onCreateListing: () => void;
}> = ({ onCreateListing }) => (
  <EmptyState
    title="No listings yet"
    description="Create your first listing and start selling across multiple platforms instantly."
    mascotVariation="sleepy"
    action={{
      label: 'Create Listing',
      onClick: onCreateListing,
      icon: <Plus className="w-4 h-4 mr-2" />,
    }}
  />
);

/**
 * Empty Search Results State
 */
export const EmptySearchResults: React.FC<{
  query?: string;
  onClear: () => void;
}> = ({ query, onClear }) => (
  <EmptyState
    title="No results found"
    description={query ? `We couldn't find anything matching "${query}". Try a different search.` : 'No items match your search criteria.'}
    mascotVariation="sad"
    action={{
      label: 'Clear Search',
      onClick: onClear,
      icon: <RefreshCw className="w-4 h-4 mr-2" />,
    }}
  />
);

/**
 * Empty Connections State
 */
export const EmptyConnections: React.FC<{
  onConnect: () => void;
}> = ({ onConnect }) => (
  <EmptyState
    title="No platforms connected"
    description="Connect your marketplace accounts to start cross-posting your listings."
    mascotVariation="excited"
    action={{
      label: 'Connect Platform',
      onClick: onConnect,
      icon: <ArrowRight className="w-4 h-4 mr-2" />,
    }}
  />
);

export default EmptyState;