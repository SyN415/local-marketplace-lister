/**
 * useLogoColors Hook
 *
 * React hook for extracting and using logo colors
 * throughout the application.
 */

import { useState, useEffect, useCallback } from 'react';
import type { ColorPalette } from '../utils/logoColors';
import {
  extractColorsFromImage,
  getDefaultPalette,
  applyPaletteToDocument,
  generateGradient,
  generatePattern,
} from '../utils/logoColors';

interface UseLogoColorsOptions {
  autoApply?: boolean;
  fallbackToDefault?: boolean;
}

interface UseLogoColorsReturn {
  palette: ColorPalette;
  isLoading: boolean;
  error: Error | null;
  gradient: string;
  subtleGradient: string;
  pattern: string;
  refresh: () => void;
}

const CACHE_KEY = 'wispr-logo-palette';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get cached palette from localStorage
 */
function getCachedPalette(): ColorPalette | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { palette, timestamp } = JSON.parse(cached);
    
    // Check if cache is still valid
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    // Reconstruct the rgba functions
    return reconstructPalette(palette);
  } catch {
    return null;
  }
}

/**
 * Cache palette to localStorage
 */
function cachePalette(palette: ColorPalette): void {
  try {
    // Serialize without functions
    const serializable = {
      dominant: { hex: palette.dominant.hex, rgb: palette.dominant.rgb, hsl: palette.dominant.hsl },
      vibrant: { hex: palette.vibrant.hex, rgb: palette.vibrant.rgb, hsl: palette.vibrant.hsl },
      muted: { hex: palette.muted.hex, rgb: palette.muted.rgb, hsl: palette.muted.hsl },
      lightVibrant: { hex: palette.lightVibrant.hex, rgb: palette.lightVibrant.rgb, hsl: palette.lightVibrant.hsl },
      darkVibrant: { hex: palette.darkVibrant.hex, rgb: palette.darkVibrant.rgb, hsl: palette.darkVibrant.hsl },
      palette: palette.palette.map(c => ({ hex: c.hex, rgb: c.rgb, hsl: c.hsl })),
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify({
      palette: serializable,
      timestamp: Date.now(),
    }));
  } catch {
    // Ignore cache errors
  }
}

/**
 * Reconstruct palette with rgba functions
 */
function reconstructPalette(serialized: any): ColorPalette {
  const addRgba = (color: any) => ({
    ...color,
    rgba: (alpha: number) => `rgba(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}, ${alpha})`,
  });

  return {
    dominant: addRgba(serialized.dominant),
    vibrant: addRgba(serialized.vibrant),
    muted: addRgba(serialized.muted),
    lightVibrant: addRgba(serialized.lightVibrant),
    darkVibrant: addRgba(serialized.darkVibrant),
    palette: serialized.palette.map(addRgba),
  };
}

/**
 * Hook to extract and use logo colors
 */
export function useLogoColors(
  imagePath?: string,
  options: UseLogoColorsOptions = {}
): UseLogoColorsReturn {
  const { autoApply = true, fallbackToDefault = true } = options;

  const [palette, setPalette] = useState<ColorPalette>(() => {
    // Try to get cached palette first
    const cached = getCachedPalette();
    return cached || getDefaultPalette();
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const extractColors = useCallback(async () => {
    if (!imagePath) {
      const defaultPalette = getDefaultPalette();
      setPalette(defaultPalette);
      if (autoApply) {
        applyPaletteToDocument(defaultPalette);
      }
      return;
    }

    // Check cache first
    const cached = getCachedPalette();
    if (cached) {
      setPalette(cached);
      if (autoApply) {
        applyPaletteToDocument(cached);
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const extracted = await extractColorsFromImage(imagePath);
      setPalette(extracted);
      cachePalette(extracted);
      
      if (autoApply) {
        applyPaletteToDocument(extracted);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to extract colors'));
      
      if (fallbackToDefault) {
        const defaultPalette = getDefaultPalette();
        setPalette(defaultPalette);
        if (autoApply) {
          applyPaletteToDocument(defaultPalette);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [imagePath, autoApply, fallbackToDefault]);

  // Extract colors on mount and when imagePath changes
  useEffect(() => {
    extractColors();
  }, [extractColors]);

  // Generate gradient strings
  const gradient = generateGradient(palette, { opacity: 0.15 });
  const subtleGradient = generateGradient(palette, { opacity: 0.08 });
  const pattern = generatePattern(palette, 'dots', 0.05);

  return {
    palette,
    isLoading,
    error,
    gradient,
    subtleGradient,
    pattern,
    refresh: extractColors,
  };
}

/**
 * Simple hook that just returns the default palette
 * Use this when you don't need to extract from an image
 */
export function useDefaultPalette(): ColorPalette {
  return getDefaultPalette();
}

export default useLogoColors;