/**
 * Mascot Component - Jiggly
 * 
 * Displays the Jiggly mascot in different variations
 * based on the context and state of the application.
 * 
 * Variations:
 * - happy: Hero sections, success states, loading spinners
 * - sad: Errors, 404s, empty states, dead ends
 * - vampire: Validation errors, rate limits
 * - sleepy: Idle states, footers
 * - superhero: Completion screens, milestones
 */

import React from 'react';
import { cn } from '../../lib/utils';

// Import mascot images
import mascotBase from '../../assets/jp2.jpg';

export type MascotVariation = 
  | 'happy' 
  | 'excited' 
  | 'sad' 
  | 'crying' 
  | 'vampire' 
  | 'sleepy' 
  | 'superhero'
  | 'default';

export type MascotSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface MascotProps {
  /** Which variation of the mascot to display */
  variation?: MascotVariation;
  /** Size of the mascot */
  size?: MascotSize;
  /** Whether to animate the mascot */
  animated?: boolean;
  /** Animation type to apply */
  animation?: 'bounce' | 'float' | 'pulse' | 'shake' | 'spin' | 'none';
  /** Additional className */
  className?: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Whether to show the mascot's speech bubble */
  message?: string;
  /** Click handler */
  onClick?: () => void;
  /** Whether the mascot should be responsive */
  responsive?: boolean;
}

const sizeClasses: Record<MascotSize, string> = {
  xs: 'w-8 h-8',
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
};

const responsiveSizeClasses: Record<MascotSize, string> = {
  xs: 'w-6 h-6 sm:w-8 sm:h-8',
  sm: 'w-10 h-10 sm:w-12 sm:h-12',
  md: 'w-12 h-12 sm:w-16 sm:h-16',
  lg: 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24',
  xl: 'w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32',
};

const animationClasses: Record<string, string> = {
  bounce: 'animate-bounce',
  float: 'animate-float',
  pulse: 'animate-pulse-slow',
  shake: 'animate-shake',
  spin: 'animate-spin',
  none: '',
};

// Default animations per variation
const defaultAnimations: Record<MascotVariation, string> = {
  happy: 'bounce',
  excited: 'bounce',
  sad: 'none',
  crying: 'shake',
  vampire: 'shake',
  sleepy: 'float',
  superhero: 'bounce',
  default: 'none',
};

// Variation-specific styles/filters
const variationStyles: Record<MascotVariation, React.CSSProperties> = {
  happy: {},
  excited: {},
  sad: { filter: 'saturate(0.7)' },
  crying: { filter: 'saturate(0.6)' },
  vampire: { filter: 'hue-rotate(180deg) saturate(1.2)' },
  sleepy: { filter: 'brightness(0.9) saturate(0.8)', opacity: 0.9 },
  superhero: { filter: 'brightness(1.1) saturate(1.1)' },
  default: {},
};

// Background colors per variation
const bgColors: Record<MascotVariation, string> = {
  happy: 'bg-gradient-to-br from-primary-100 to-primary-200',
  excited: 'bg-gradient-to-br from-accent/20 to-primary-200',
  sad: 'bg-gray-100 dark:bg-gray-800',
  crying: 'bg-blue-50 dark:bg-blue-900/20',
  vampire: 'bg-purple-100 dark:bg-purple-900/20',
  sleepy: 'bg-indigo-50 dark:bg-indigo-900/20',
  superhero: 'bg-gradient-to-br from-yellow-100 to-orange-100',
  default: 'bg-primary-50',
};

export const Mascot: React.FC<MascotProps> = ({
  variation = 'default',
  size = 'md',
  animated = true,
  animation,
  className,
  alt,
  message,
  onClick,
  responsive = false,
}) => {
  const effectiveAnimation = animation || (animated ? defaultAnimations[variation] : 'none');
  const sizeClass = responsive ? responsiveSizeClasses[size] : sizeClasses[size];
  
  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      {/* Speech Bubble */}
      {message && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-10 animate-fade-in">
          <div className="relative px-4 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-border text-sm font-medium text-foreground whitespace-nowrap">
            {message}
            {/* Bubble arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
              <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800" />
            </div>
          </div>
        </div>
      )}
      
      {/* Mascot Container */}
      <div 
        className={cn(
          'relative rounded-full overflow-hidden',
          'shadow-lg hover:shadow-xl transition-shadow duration-300',
          sizeClass,
          animationClasses[effectiveAnimation],
          onClick && 'cursor-pointer',
        )}
        style={variationStyles[variation]}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      >
        {/* Background glow effect */}
        <div className={cn(
          'absolute inset-0 rounded-full',
          bgColors[variation],
          'opacity-30 blur-sm'
        )} />
        
        {/* Mascot Image */}
        <img
          src={mascotBase}
          alt={alt || `Jiggly mascot - ${variation}`}
          className={cn(
            'relative z-10 w-full h-full object-cover rounded-full',
            'border-2 border-white/50 dark:border-white/30',
          )}
          loading="lazy"
        />
        
        {/* Variation Overlays */}
        {variation === 'crying' && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 z-20">
            <span className="text-xs">💧</span>
          </div>
        )}
        
        {variation === 'superhero' && (
          <div className="absolute -top-1 -right-1 z-20">
            <span className="text-sm">⭐</span>
          </div>
        )}
        
        {variation === 'sleepy' && (
          <div className="absolute top-0 right-0 z-20">
            <span className="text-xs">💤</span>
          </div>
        )}
        
        {variation === 'vampire' && (
          <div className="absolute top-0 left-0 z-20">
            <span className="text-xs">💨</span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Pre-configured mascot for success states
 */
export const MascotSuccess: React.FC<Omit<MascotProps, 'variation'>> = (props) => (
  <Mascot variation="happy" {...props} />
);

/**
 * Pre-configured mascot for error states
 */
export const MascotError: React.FC<Omit<MascotProps, 'variation'>> = (props) => (
  <Mascot variation="sad" {...props} />
);

/**
 * Pre-configured mascot for loading states
 */
export const MascotLoading: React.FC<Omit<MascotProps, 'variation' | 'animation'>> = (props) => (
  <Mascot variation="excited" animation="bounce" {...props} />
);

/**
 * Pre-configured mascot for empty states
 */
export const MascotEmpty: React.FC<Omit<MascotProps, 'variation'>> = (props) => (
  <Mascot variation="sleepy" {...props} />
);

/**
 * Pre-configured mascot for validation errors
 */
export const MascotValidation: React.FC<Omit<MascotProps, 'variation'>> = (props) => (
  <Mascot variation="vampire" {...props} />
);

/**
 * Pre-configured mascot for completion/milestone screens
 */
export const MascotCelebration: React.FC<Omit<MascotProps, 'variation'>> = (props) => (
  <Mascot variation="superhero" {...props} />
);

export default Mascot;