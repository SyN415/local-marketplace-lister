/**
 * Logo Color Extraction Utility
 * 
 * Extracts dominant colors from logo images to create
 * dynamic, cohesive backgrounds and accents for the design system.
 */

export interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

export interface ColorHSL {
  h: number;
  s: number;
  l: number;
}

export interface ExtractedColor {
  hex: string;
  rgb: ColorRGB;
  hsl: ColorHSL;
  rgba: (alpha: number) => string;
}

export interface ColorPalette {
  dominant: ExtractedColor;
  vibrant: ExtractedColor;
  muted: ExtractedColor;
  lightVibrant: ExtractedColor;
  darkVibrant: ExtractedColor;
  palette: ExtractedColor[];
}

// Pre-extracted colors from jp1.jpg (logo) and jp2.jpg (mascot)
// These are fallback values extracted from the actual images
export const LOGO_COLORS = {
  // Primary logo colors (jp1.jpg)
  logo: {
    dominant: '#4A3F6B',     // Deep purple
    vibrant: '#7B5FA3',      // Warm purple  
    muted: '#8B7A9E',        // Soft lavender
    lightVibrant: '#B8A5D1', // Light purple
    darkVibrant: '#2D2640',  // Dark purple
    accent: '#C9B8DC',       // Accent purple
  },
  // Mascot colors (jp2.jpg - Jiggly)
  mascot: {
    primary: '#FFB5D8',      // Pink
    secondary: '#FFE5F0',    // Light pink
    outline: '#333333',      // Dark outline
    highlight: '#FF8AC4',    // Hot pink
    shadow: '#E8A0C3',       // Muted pink
  }
};

/**
 * Convert RGB to Hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map(x => Math.max(0, Math.min(255, Math.round(x))))
    .map(x => x.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(r: number, g: number, b: number): ColorHSL {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert Hex to RGB
 */
export function hexToRgb(hex: string): ColorRGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Create an ExtractedColor object from RGB values
 */
export function createColor(r: number, g: number, b: number): ExtractedColor {
  const hex = rgbToHex(r, g, b);
  const hsl = rgbToHsl(r, g, b);
  
  return {
    hex,
    rgb: { r, g, b },
    hsl,
    rgba: (alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha})`,
  };
}

/**
 * Create an ExtractedColor from hex string
 */
export function createColorFromHex(hex: string): ExtractedColor {
  const rgb = hexToRgb(hex);
  return createColor(rgb.r, rgb.g, rgb.b);
}

/**
 * Darken a hex color by a percentage
 */
export function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  const factor = 1 - percent / 100;
  return rgbToHex(
    Math.round(rgb.r * factor),
    Math.round(rgb.g * factor),
    Math.round(rgb.b * factor)
  );
}

/**
 * Lighten a hex color by a percentage
 */
export function lightenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  const factor = percent / 100;
  return rgbToHex(
    Math.round(rgb.r + (255 - rgb.r) * factor),
    Math.round(rgb.g + (255 - rgb.g) * factor),
    Math.round(rgb.b + (255 - rgb.b) * factor)
  );
}

/**
 * Mix two colors together
 */
export function mixColors(color1: string, color2: string, weight: number = 0.5): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  return rgbToHex(
    Math.round(rgb1.r * weight + rgb2.r * (1 - weight)),
    Math.round(rgb1.g * weight + rgb2.g * (1 - weight)),
    Math.round(rgb1.b * weight + rgb2.b * (1 - weight))
  );
}

/**
 * Check if a color is considered "light"
 */
export function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  // Using relative luminance formula
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5;
}

/**
 * Get a contrasting text color (black or white) for a background
 */
export function getContrastColor(backgroundHex: string): string {
  return isLightColor(backgroundHex) ? '#191521' : '#F5F5F5';
}

/**
 * Extract dominant colors from an image using Canvas
 * Client-side implementation
 */
export async function extractColorsFromImage(imagePath: string): Promise<ColorPalette> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        // Resize to smaller size for performance
        const size = 100;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        // Collect colors with frequency
        const colorMap = new Map<string, { r: number; g: number; b: number; count: number }>();

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Skip transparent or near-white/near-black pixels
          if (a < 128) continue;
          if (r > 240 && g > 240 && b > 240) continue;
          if (r < 15 && g < 15 && b < 15) continue;

          // Quantize colors to reduce palette
          const qr = Math.round(r / 16) * 16;
          const qg = Math.round(g / 16) * 16;
          const qb = Math.round(b / 16) * 16;
          const key = `${qr},${qg},${qb}`;

          const existing = colorMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            colorMap.set(key, { r: qr, g: qg, b: qb, count: 1 });
          }
        }

        // Sort by frequency
        const sortedColors = Array.from(colorMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
          .map(c => createColor(c.r, c.g, c.b));

        if (sortedColors.length === 0) {
          // Return fallback colors
          resolve(getDefaultPalette());
          return;
        }

        // Categorize colors
        const dominant = sortedColors[0];
        const vibrant = findVibrant(sortedColors) || dominant;
        const muted = findMuted(sortedColors) || dominant;
        const lightVibrant = findLightVibrant(sortedColors) || lightenColorExtracted(vibrant);
        const darkVibrant = findDarkVibrant(sortedColors) || darkenColorExtracted(vibrant);

        resolve({
          dominant,
          vibrant,
          muted,
          lightVibrant,
          darkVibrant,
          palette: sortedColors,
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imagePath;
  });
}

/**
 * Find the most vibrant (saturated) color
 */
function findVibrant(colors: ExtractedColor[]): ExtractedColor | null {
  return colors.reduce<ExtractedColor | null>((best, color) => {
    if (!best) return color;
    return color.hsl.s > best.hsl.s ? color : best;
  }, null);
}

/**
 * Find the most muted (desaturated) color
 */
function findMuted(colors: ExtractedColor[]): ExtractedColor | null {
  return colors.reduce<ExtractedColor | null>((best, color) => {
    if (!best) return color;
    return color.hsl.s < best.hsl.s ? color : best;
  }, null);
}

/**
 * Find light vibrant color
 */
function findLightVibrant(colors: ExtractedColor[]): ExtractedColor | null {
  const light = colors.filter(c => c.hsl.l > 50);
  return findVibrant(light);
}

/**
 * Find dark vibrant color
 */
function findDarkVibrant(colors: ExtractedColor[]): ExtractedColor | null {
  const dark = colors.filter(c => c.hsl.l <= 50);
  return findVibrant(dark);
}

/**
 * Create lightened version of extracted color
 */
function lightenColorExtracted(color: ExtractedColor): ExtractedColor {
  const hex = lightenColor(color.hex, 30);
  return createColorFromHex(hex);
}

/**
 * Create darkened version of extracted color
 */
function darkenColorExtracted(color: ExtractedColor): ExtractedColor {
  const hex = darkenColor(color.hex, 30);
  return createColorFromHex(hex);
}

/**
 * Get default color palette based on pre-extracted logo colors
 */
export function getDefaultPalette(): ColorPalette {
  const dominant = createColorFromHex(LOGO_COLORS.logo.dominant);
  const vibrant = createColorFromHex(LOGO_COLORS.logo.vibrant);
  const muted = createColorFromHex(LOGO_COLORS.logo.muted);
  const lightVibrant = createColorFromHex(LOGO_COLORS.logo.lightVibrant);
  const darkVibrant = createColorFromHex(LOGO_COLORS.logo.darkVibrant);

  return {
    dominant,
    vibrant,
    muted,
    lightVibrant,
    darkVibrant,
    palette: [dominant, vibrant, muted, lightVibrant, darkVibrant],
  };
}

/**
 * Generate CSS gradient from palette
 */
export function generateGradient(
  palette: ColorPalette,
  options: {
    direction?: string;
    opacity?: number;
    type?: 'linear' | 'radial';
  } = {}
): string {
  const { direction = '135deg', opacity = 0.1, type = 'linear' } = options;

  const color1 = palette.dominant.rgba(opacity);
  const color2 = palette.muted.rgba(opacity * 0.5);

  if (type === 'radial') {
    return `radial-gradient(circle at center, ${color1} 0%, ${color2} 100%)`;
  }

  return `linear-gradient(${direction}, ${color1} 0%, ${color2} 100%)`;
}

/**
 * Generate SVG pattern from palette
 */
export function generatePattern(
  palette: ColorPalette,
  pattern: 'dots' | 'grid' | 'waves' = 'dots',
  opacity: number = 0.08
): string {
  const color = palette.dominant.hex;

  const patterns = {
    dots: `
      <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="2" fill="${color}" opacity="${opacity}"/>
            <circle cx="30" cy="30" r="2" fill="${color}" opacity="${opacity}"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)"/>
      </svg>
    `,
    grid: `
      <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" stroke="${color}" stroke-width="0.5" fill="none" opacity="${opacity}"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>
      </svg>
    `,
    waves: `
      <svg width="120" height="20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="waves" x="0" y="0" width="120" height="20" patternUnits="userSpaceOnUse">
            <path d="M0,10 Q30,5 60,10 T120,10" stroke="${color}" stroke-width="1" fill="none" opacity="${opacity}"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#waves)"/>
      </svg>
    `,
  };

  return `url("data:image/svg+xml,${encodeURIComponent(patterns[pattern].trim())}")`;
}

/**
 * Apply extracted colors as CSS custom properties
 */
export function applyPaletteToDocument(palette: ColorPalette): void {
  const root = document.documentElement;
  
  root.style.setProperty('--logo-dominant', palette.dominant.hex);
  root.style.setProperty('--logo-vibrant', palette.vibrant.hex);
  root.style.setProperty('--logo-muted', palette.muted.hex);
  root.style.setProperty('--logo-light', palette.lightVibrant.hex);
  root.style.setProperty('--logo-dark', palette.darkVibrant.hex);
  
  // Alpha variants
  root.style.setProperty('--logo-dominant-10', palette.dominant.rgba(0.1));
  root.style.setProperty('--logo-dominant-20', palette.dominant.rgba(0.2));
  root.style.setProperty('--logo-vibrant-10', palette.vibrant.rgba(0.1));
  root.style.setProperty('--logo-vibrant-20', palette.vibrant.rgba(0.2));
}

/**
 * React hook for using extracted logo colors
 * Usage: const palette = useLogoColors('/path/to/logo.jpg');
 */
export function useLogoColorsInit(): ColorPalette {
  // Return the default palette immediately
  // In a real implementation, this would be in a React hook
  // but we'll use it in the component directly
  return getDefaultPalette();
}