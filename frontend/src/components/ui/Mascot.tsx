import React from 'react';
import type { CSSProperties } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

export type MascotVariant = 'happy' | 'superhero' | 'cries' | 'sleepy' | 'vampire' | 'santa' | 'sad' | 'excited';
export type MascotVariation = MascotVariant;
export type MascotSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
export type MascotAnimation = 'bounce' | 'pulse' | 'float' | 'shake' | 'none';

interface MascotProps extends Omit<HTMLMotionProps<"img">, 'size' | 'style'> {
  variant?: MascotVariant;
  variation?: string | MascotVariant;
  size?: MascotSize;
  animated?: boolean;
  animation?: MascotAnimation;
  frame?: number; // Custom frame override
  style?: CSSProperties;
  responsive?: boolean;
}

// Map variants to specific frames (using approximate indices from the sprite sheet)
// These would need to be fine-tuned based on the actual sprite sheet layout
const VARIANT_FRAMES: Record<MascotVariant, number[]> = {
  happy: [2], // Happy/Easter variant
  superhero: [3], // Superhero variant
  cries: [4], // Crying variant
  sleepy: [5], // Sleeping variant
  vampire: [0], // Vampire variant
  santa: [1], // Santa variant
  sad: [4], // Alias for cries
  excited: [2], // Alias for happy
};

const ANIMATIONS = {
  bounce: {
    y: [0, -10, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  },
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  },
  float: {
    y: [0, -6, 0],
    rotate: [0, 2, -2, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  },
  shake: {
    x: [0, -5, 5, -5, 5, 0],
    transition: {
      duration: 0.5,
      repeatDelay: 2,
      repeat: Infinity
    }
  },
  none: {}
};

const getSize = (size: MascotSize): number => {
  if (typeof size === 'number') return size;
  switch (size) {
    case 'xs': return 24;
    case 'sm': return 32;
    case 'md': return 64;
    case 'lg': return 128;
    case 'xl': return 256;
    default: return 64;
  }
};

export const Mascot: React.FC<MascotProps> = ({
  variant = 'happy',
  variation,
  size = 'md',
  animated = false,
  animation = 'none',
  frame,
  className,
  style,
  responsive,
  ...props
}) => {
  // Determine frame index
  let frameIndex = 0;
  
  const actualVariant = (variation as MascotVariant) || variant;

  // Use Christmas variant if available and not overridden
  // Note: This relies on the parent component or context to trigger re-renders if needed
  const isChristmas = typeof window !== 'undefined' &&
    document.documentElement.classList.contains('theme-christmas') &&
    actualVariant === 'happy'; // Only override happy mascots for now

  const effectiveVariant = isChristmas ? 'santa' : actualVariant;

  if (typeof frame === 'number') {
    frameIndex = frame;
  } else {
    // Pick a random frame from the variant set or cycle through them
    // For now, just picking the first one
    const frames = VARIANT_FRAMES[effectiveVariant as MascotVariant] || VARIANT_FRAMES['happy'];
    frameIndex = frames[0];
  }

  // Ensure frame index is valid (based on extracted count 0-999)
  frameIndex = frameIndex % 1000;

  const pixelSize = getSize(size);
  const webpSrc = `/mascots/optimized/mascot_${frameIndex}.webp`;
  const pngSrc = `/mascots/mascot_${frameIndex}.png`;

  const animationKey = animation === 'none' ? 'float' : animation;
  // @ts-ignore - Framer motion types are complex
  const animateProp = animated ? ANIMATIONS[animationKey] : undefined;

  const containerStyle = responsive ? style : { width: pixelSize, height: pixelSize, ...style };


  return (
    <div
      className={`relative inline-block ${className || ''}`}
      style={containerStyle}
    >
      <picture>
        <source srcSet={webpSrc} type="image/webp" />
        <motion.img
          src={pngSrc}
          alt={`Jiggly Mascot - ${effectiveVariant}`}
          width={pixelSize}
          height={pixelSize}
          loading="lazy"
          className="object-contain w-full h-full"
          // @ts-ignore - Framer motion types compatibility issue
          animate={animateProp}
          {...props}
        />
      </picture>
    </div>
  );
};