/**
 * Error State Component
 * 
 * Displays friendly error states with mascot
 * Used for 404s, API errors, validation errors, etc.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from './button';
import { Mascot } from './Mascot';
import { cn } from '../../lib/utils';
import { Home, RefreshCw, ArrowLeft, XCircle } from 'lucide-react';

export interface ErrorStateProps {
  /** Error title */
  title: string;
  /** Error description */
  description?: string;
  /** Error code (e.g., 404, 500) */
  code?: string | number;
  /** Mascot variation to display */
  mascotVariation?: 'happy' | 'sad' | 'surprised' | 'neutral' | 'cries' | 'vampire' | 'sleepy' | 'superhero';
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  /** Show go home button */
  showHomeButton?: boolean;
  /** Show back button */
  showBackButton?: boolean;
  /** Show retry button */
  showRetryButton?: boolean;
  /** Retry handler */
  onRetry?: () => void;
  /** Additional className */
  className?: string;
  /** Full page error */
  fullPage?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  description,
  code,
  mascotVariation = 'sad',
  action,
  showHomeButton = true,
  showBackButton = false,
  showRetryButton = false,
  onRetry,
  className,
  fullPage = false,
}) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'flex flex-col items-center justify-center text-center px-4',
        fullPage ? 'min-h-[80vh]' : 'py-12',
        className
      )}
    >
      {/* Error Code */}
      {code && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <span className="font-display text-6xl md:text-8xl font-bold bg-gradient-to-r from-primary/30 to-secondary/30 bg-clip-text text-transparent">
            {code}
          </span>
        </motion.div>
      )}

  {/* Mascot */}
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
  >
    <Mascot
      // @ts-ignore - Prop naming transition
      variant={mascotVariation === 'crying' ? 'cries' : (mascotVariation as any)}
      size="lg"
      animated
      animation={mascotVariation === 'sad' || mascotVariation === 'cries' ? 'shake' : 'bounce'}
      className="mb-6"
    />
  </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3"
      >
        {title}
      </motion.h1>

      {/* Description */}
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-foreground-muted max-w-md mb-8 text-lg"
        >
          {description}
        </motion.p>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-wrap gap-3 justify-center"
      >
        {action && (
          <Button
            onClick={action.onClick}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-display font-semibold rounded-xl"
          >
            {action.icon}
            {action.label}
          </Button>
        )}

        {showBackButton && (
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="border-primary/30 text-primary hover:bg-primary/5 font-display rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        )}

        {showHomeButton && (
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="border-primary/30 text-primary hover:bg-primary/5 font-display rounded-xl"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        )}

        {showRetryButton && onRetry && (
          <Button
            variant="outline"
            onClick={onRetry}
            className="border-primary/30 text-primary hover:bg-primary/5 font-display rounded-xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
};

/**
 * 404 Not Found Error
 */
export const Error404: React.FC<{ className?: string }> = ({ className }) => (
<ErrorState
  code="404"
  title="Page Not Found"
  description="Oops! The page you're looking for seems to have wandered off. Let's get you back on track."
  mascotVariation="cries"
  showHomeButton
  showBackButton
  fullPage
  className={className}
/>
);

/**
 * 500 Server Error
 */
export const Error500: React.FC<{ 
  onRetry?: () => void;
  className?: string;
}> = ({ onRetry, className }) => (
  <ErrorState
    code="500"
    title="Something Went Wrong"
    description="We're having some technical difficulties. Our team has been notified and is working on it."
    mascotVariation="sad"
    showHomeButton
    showRetryButton
    onRetry={onRetry}
    fullPage
    className={className}
  />
);

/**
 * Network Error
 */
export const NetworkError: React.FC<{
  onRetry?: () => void;
  className?: string;
}> = ({ onRetry, className }) => (
  <ErrorState
    title="Connection Lost"
    description="It looks like you're offline. Please check your internet connection and try again."
    mascotVariation="sad"
    showRetryButton
    onRetry={onRetry}
    className={className}
  />
);

/**
 * Access Denied Error
 */
export const AccessDenied: React.FC<{ className?: string }> = ({ className }) => (
  <ErrorState
    code="403"
    title="Access Denied"
    description="You don't have permission to view this page. Please sign in or contact support if you believe this is an error."
    mascotVariation="vampire"
    showHomeButton
    showBackButton
    fullPage
    className={className}
  />
);

/**
 * Validation Error Display
 */
export const ValidationError: React.FC<{
  message: string;
  onDismiss?: () => void;
  className?: string;
}> = ({ message, onDismiss, className }) => (
  <motion.div
    initial={{ opacity: 0, y: -10, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -10, scale: 0.95 }}
    className={cn(
      'flex items-center gap-3 p-4 rounded-xl',
      'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
      className
    )}
  >
    <Mascot variant="vampire" size="sm" animated animation="shake" />
    <p className="flex-1 text-sm text-red-700 dark:text-red-300">{message}</p>
    {onDismiss && (
      <button
        onClick={onDismiss}
        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-800/50 transition-colors"
      >
        <XCircle className="w-4 h-4 text-red-500" />
      </button>
    )}
  </motion.div>
);

/**
 * Generic Error Alert
 */
export const ErrorAlert: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}> = ({ title = 'Error', message, onRetry, onDismiss, className }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className={cn(
      'p-4 rounded-xl',
      'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
      className
    )}
  >
    <div className="flex items-start gap-3">
      <Mascot variant="cries" size="sm" animated animation="shake" />
      <div className="flex-1">
        <h4 className="font-display font-semibold text-red-700 dark:text-red-300 mb-1">
          {title}
        </h4>
        <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
        {(onRetry || onDismiss) && (
          <div className="flex gap-2 mt-3">
            {onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="text-red-600 border-red-300 hover:bg-red-100 dark:hover:bg-red-800/50"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="text-red-600 hover:bg-red-100 dark:hover:bg-red-800/50"
              >
                Dismiss
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  </motion.div>
);

export default ErrorState;