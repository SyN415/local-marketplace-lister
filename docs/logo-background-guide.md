# Logo-to-Background Integration Guide
## Advanced Techniques

## Overview

This guide provides advanced techniques for integrating logo JPGs with HTML layouts, extracting color information, and creating visually cohesive backgrounds that enhance the overall branding experience.

---

## Part 1: Logo File Format Management

### Why JPG to SVG/PNG Conversion Matters

**JPG Format Limitations:**
- Raster format (pixel-based)
- Lossy compression
- Difficult for color extraction
- Poor scalability
- Challenges with transparency

**Best Practices:**
1. Request SVG versions from design team (preferred for web)
2. If only JPG available, convert to PNG with transparency
3. Create JPG variants at multiple resolutions for responsive design

### Conversion Workflow

**Quick JPG to PNG Conversion (TypeScript)**
```typescript
import sharp from 'sharp';

export async function convertLogoJpgToPng(
  inputPath: string,
  outputPath: string
): Promise<void> {
  await sharp(inputPath)
    .png({ quality: 95 })
    .toFile(outputPath);
}

// Usage with multiple resolutions
export async function generateLogoVariants(
  inputJpg: string,
  outputDir: string
): Promise<void> {
  const sizes = [32, 48, 64, 128, 256, 512];
  
  for (const size of sizes) {
    await sharp(inputJpg)
      .resize(size, size, { fit: 'contain', background: 'white' })
      .png()
      .toFile(`${outputDir}/logo-${size}x${size}.png`);
  }
}
```

---

## Part 2: Advanced Color Extraction

### Method 1: Canvas-Based Dominant Color (Client-Side)

**Complete Implementation**
```typescript
/**
 * Advanced color extraction with multiple analysis methods
 */
export interface ColorAnalysis {
  dominant: Color;
  palette: Color[];
  vibrant: Color;
  muted: Color;
  lightVibrant: Color;
  darkVibrant: Color;
}

export interface Color {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  rgba: (alpha: number) => string;
}

async function analyzeImageColors(imagePath: string): Promise<ColorAnalysis> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }

      // Resize canvas to smaller size for performance
      const size = 100;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;

      // Collect all colors
      const colors: Array<{ r: number; g: number; b: number; count: number }> = [];
      const colorMap = new Map<string, number>();

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Skip fully transparent pixels
        if (a < 128) continue;

        // Skip near-white pixels (background)
        if (r > 240 && g > 240 && b > 240) continue;

        const key = `${r},${g},${b}`;
        colorMap.set(key, (colorMap.get(key) || 0) + 1);
      }

      // Sort by frequency
      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, count]) => {
          const [r, g, b] = key.split(',').map(Number);
          return { r, g, b, count };
        });

      // Generate color objects
      const colorObjects = sortedColors.map(c => rgbToColor(c.r, c.g, c.b));

      // Categorize colors
      const dominant = colorObjects[0];
      const palette = colorObjects;
      const vibrant = findVibrant(colorObjects);
      const muted = findMuted(colorObjects);
      const lightVibrant = findLightVibrant(colorObjects);
      const darkVibrant = findDarkVibrant(colorObjects);

      resolve({
        dominant,
        palette,
        vibrant,
        muted,
        lightVibrant,
        darkVibrant,
      });
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imagePath;
  });
}

// Helper functions
function rgbToColor(r: number, g: number, b: number): Color {
  const hex = `#${[r, g, b]
    .map(x => x.toString(16).padStart(2, '0').toUpperCase())
    .join('')}`;
  
  const hsl = rgbToHsl(r, g, b);

  return {
    hex,
    rgb: { r, g, b },
    hsl,
    rgba: (alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha})`,
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
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

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function findVibrant(colors: Color[]): Color {
  return colors.reduce((best, color) => {
    const bestSat = best.hsl.s;
    const currentSat = color.hsl.s;
    return currentSat > bestSat ? color : best;
  });
}

function findMuted(colors: Color[]): Color {
  return colors.reduce((best, color) => {
    const bestSat = best.hsl.s;
    const currentSat = color.hsl.s;
    return currentSat < bestSat ? color : best;
  });
}

function findLightVibrant(colors: Color[]): Color {
  return colors
    .filter(c => c.hsl.l > 50)
    .reduce((best, color) => 
      color.hsl.s > best.hsl.s ? color : best
    ) || colors[0];
}

function findDarkVibrant(colors: Color[]): Color {
  return colors
    .filter(c => c.hsl.l < 50)
    .reduce((best, color) => 
      color.hsl.s > best.hsl.s ? color : best
    ) || colors[0];
}
```

### Method 2: Server-Side Color Extraction (Node.js with Sharp)

**Faster Server-Side Processing**
```typescript
import sharp from 'sharp';

export interface PaletteAnalysis {
  dominant: string;
  palette: string[];
  stats: {
    avgBrightness: number;
    avgSaturation: number;
    isDark: boolean;
    isLight: boolean;
  };
}

export async function analyzePaletteServer(
  logoPath: string
): Promise<PaletteAnalysis> {
  // Extract color data using Sharp
  const image = sharp(logoPath);
  const stats = await image.stats();

  // Get histogram
  const { data: pixels } = await image
    .resize(100, 100, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Analyze pixels
  const colors = new Map<string, number>();
  let totalBrightness = 0;
  let totalSaturation = 0;

  for (let i = 0; i < pixels.length; i += 3) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    // Skip near-white
    if (r > 240 && g > 240 && b > 240) continue;

    const hex = rgbToHex(r, g, b);
    colors.set(hex, (colors.get(hex) || 0) + 1);

    // Calculate brightness and saturation
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    totalBrightness += brightness;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : ((max - min) / max) * 100;
    totalSaturation += saturation;
  }

  const palette = Array.from(colors.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([hex]) => hex);

  const avgBrightness = totalBrightness / colors.size;
  const avgSaturation = totalSaturation / colors.size;

  return {
    dominant: palette[0],
    palette,
    stats: {
      avgBrightness,
      avgSaturation,
      isDark: avgBrightness < 128,
      isLight: avgBrightness > 192,
    },
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}
```

---

## Part 3: Logo-Background Integration Techniques

### Technique 1: Gradient Background from Logo Colors

**Component Implementation**
```typescript
import React, { useEffect, useState } from 'react';
import { analyzeImageColors, Color } from '@/utils/colorExtraction';

interface LogoBackgroundProps {
  logoSrc: string;
  intensity?: 'subtle' | 'moderate' | 'bold';
  children: React.ReactNode;
}

export const LogoBackground: React.FC<LogoBackgroundProps> = ({
  logoSrc,
  intensity = 'subtle',
  children,
}) => {
  const [gradient, setGradient] = useState<string>('transparent');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    analyzeImageColors(logoSrc).then((analysis) => {
      // Extract key colors from analysis
      const primary = analysis.dominant;
      const secondary = analysis.vibrant;
      const tertiary = analysis.muted;

      // Calculate opacity based on intensity
      const opacities = {
        subtle: { primary: 0.08, secondary: 0.04 },
        moderate: { primary: 0.15, secondary: 0.08 },
        bold: { primary: 0.25, secondary: 0.15 },
      };

      const { primary: primOp, secondary: secOp } = opacities[intensity];

      // Create multi-color gradient
      const gradientStr = `
        linear-gradient(
          135deg,
          ${primary.rgba(primOp)} 0%,
          ${secondary.rgba(secOp)} 50%,
          ${tertiary.rgba(primOp * 0.5)} 100%
        )
      `;

      setGradient(gradientStr);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
  }, [logoSrc, intensity]);

  return (
    <div
      style={{
        background: gradient,
        backgroundColor: '#F5F5F5', // fallback
      }}
    >
      {children}
    </div>
  );
};
```

### Technique 2: Logo Color in Border/Accent Elements

**Advanced CSS-in-JS Implementation**
```typescript
import React, { useEffect, useState } from 'react';
import { analyzeImageColors } from '@/utils/colorExtraction';

interface LogoAccentProps {
  logoSrc: string;
  children: React.ReactNode;
}

export const LogoAccent: React.FC<LogoAccentProps> = ({ logoSrc, children }) => {
  const [accentColor, setAccentColor] = useState<string>('#9F88C8');

  useEffect(() => {
    analyzeImageColors(logoSrc).then((analysis) => {
      // Use most saturated color as accent
      setAccentColor(analysis.vibrant.hex);
    });
  }, [logoSrc]);

  return (
    <div
      style={{
        '--accent-color': accentColor,
      } as React.CSSProperties}
    >
      <style>{`
        div {
          --accent-color: ${accentColor};
        }

        div h1::after {
          content: '';
          display: block;
          width: 60px;
          height: 4px;
          background: var(--accent-color);
          margin-top: 12px;
          border-radius: 2px;
        }

        div a {
          color: var(--accent-color);
          transition: all 200ms;
        }

        div a:hover {
          opacity: 0.8;
        }

        div button {
          border-color: var(--accent-color);
          color: var(--accent-color);
        }

        div button:hover {
          background: var(--accent-color);
          color: white;
        }
      `}</style>
      {children}
    </div>
  );
};
```

### Technique 3: Logo-Inspired Background Pattern

**Pattern Generation**
```typescript
import React, { useEffect, useState } from 'react';
import { analyzeImageColors } from '@/utils/colorExtraction';

interface PatternBackgroundProps {
  logoSrc: string;
  pattern?: 'dots' | 'grid' | 'waves' | 'lines';
  children: React.ReactNode;
}

export const PatternBackground: React.FC<PatternBackgroundProps> = ({
  logoSrc,
  pattern = 'dots',
  children,
}) => {
  const [svgPattern, setSvgPattern] = useState<string>('');

  useEffect(() => {
    analyzeImageColors(logoSrc).then((analysis) => {
      const color = analysis.dominant.hex;
      const lightColor = analysis.lightVibrant.hex;

      const patterns = {
        dots: `
          <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="2" fill="${color}" opacity="0.1"/>
                <circle cx="30" cy="30" r="2" fill="${color}" opacity="0.1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)"/>
          </svg>
        `,
        grid: `
          <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" stroke="${color}" stroke-width="0.5" fill="none" opacity="0.1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        `,
        waves: `
          <svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="waves" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
                <path d="M0,60 Q30,50 60,60 T120,60" stroke="${color}" stroke-width="1" fill="none" opacity="0.15"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#waves)"/>
          </svg>
        `,
        lines: `
          <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="lines" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="40" stroke="${color}" stroke-width="1" opacity="0.1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#lines)"/>
          </svg>
        `,
      };

      setSvgPattern(patterns[pattern]);
    });
  }, [logoSrc, pattern]);

  return (
    <div
      style={{
        background: `url('data:image/svg+xml;utf8,${encodeURIComponent(svgPattern)}')`,
        backgroundAttachment: 'fixed',
      }}
    >
      {children}
    </div>
  );
};
```

---

## Part 4: Header Integration Patterns

### Pattern A: Logo with Extracted Color Underline

```typescript
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { analyzeImageColors } from '@/utils/colorExtraction';
import styles from './header.module.css';

export const HeaderWithLogoAccent: React.FC = () => {
  const [accentColor, setAccentColor] = useState<string>('transparent');

  useEffect(() => {
    analyzeImageColors('/logo.svg').then((analysis) => {
      setAccentColor(analysis.dominant.hex);
    });
  }, []);

  return (
    <header className={styles.header}>
      <div
        className={styles.logoContainer}
        style={{
          borderBottomColor: accentColor,
          borderBottomWidth: '3px',
          borderBottomStyle: 'solid',
        }}
      >
        <Image
          src="/logo-dark.svg"
          alt="Design System"
          width={48}
          height={48}
        />
      </div>
      <nav className={styles.nav}>
        <a href="#home">Home</a>
        <a href="#features">Features</a>
      </nav>
    </header>
  );
};
```

**CSS Module**
```css
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: linear-gradient(to bottom, #F5F5F5, rgba(245, 245, 245, 0.95));
  border-bottom: 1px solid #D9C2C0;
}

.logoContainer {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  transition: all 200ms;
}

.logoContainer:hover {
  opacity: 0.8;
}

.nav {
  display: flex;
  gap: 2rem;
  list-style: none;

  a {
    text-decoration: none;
    color: #191521;
    font-weight: 500;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 0;
      width: 0;
      height: 2px;
      background: inherit;
      transition: width 200ms;
    }

    &:hover::after {
      width: 100%;
    }
  }
}
```

### Pattern B: Logo with Full-Bleed Color Background

```typescript
export const FullBleedHeader: React.FC = () => {
  const [backgroundColor, setBackgroundColor] = useState<string>('#F5F5F5');

  useEffect(() => {
    analyzeImageColors('/logo.svg').then((analysis) => {
      // Use darkened version of dominant color
      const darker = darkenColor(analysis.dominant.hex, 20);
      setBackgroundColor(darker);
    });
  }, []);

  return (
    <header
      style={{
        background: backgroundColor,
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Image
          src="/logo-light.svg"
          alt="Design System"
          width={48}
          height={48}
          style={{ filter: 'brightness(1.2)' }}
        />
        <h1 style={{ color: '#F5F5F5', marginTop: '1rem' }}>
          Welcome to Design System
        </h1>
      </div>
    </header>
  );
};

// Utility to darken hex color
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
}
```

---

## Part 5: Responsive Logo Sizing

### Smart Responsive Component

```typescript
import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface ResponsiveLogoProps {
  src: string;
  alt: string;
  maxWidth?: number;
}

export const ResponsiveLogo: React.FC<ResponsiveLogoProps> = ({
  src,
  alt,
  maxWidth = 200,
}) => {
  const [size, setSize] = useState(48);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      
      if (width < 640) setSize(32);      // Mobile
      else if (width < 1024) setSize(40); // Tablet
      else setSize(48);                   // Desktop
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      priority
      style={{
        maxWidth: `${maxWidth}px`,
        height: 'auto',
      }}
    />
  );
};
```

---

## Part 6: Advanced: Animated Logo-Background Sync

**Framer Motion Implementation**
```typescript
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { analyzeImageColors } from '@/utils/colorExtraction';

interface AnimatedLogoBackgroundProps {
  logoSrc: string;
  children: React.ReactNode;
}

export const AnimatedLogoBackground: React.FC<AnimatedLogoBackgroundProps> = ({
  logoSrc,
  children,
}) => {
  const [colors, setColors] = useState<string[]>([]);

  useEffect(() => {
    analyzeImageColors(logoSrc).then((analysis) => {
      setColors(analysis.palette.map(c => c.hex));
    });
  }, [logoSrc]);

  return (
    <motion.div
      initial={{ background: colors[0] }}
      animate={{
        background: colors.length > 0 ? colors[0] : '#F5F5F5',
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        repeatType: 'reverse',
      }}
      style={{ minHeight: '100vh' }}
    >
      {children}
    </motion.div>
  );
};
```

---

## Implementation Checklist

- [ ] Decide: Server-side or client-side color extraction
- [ ] Obtain SVG or high-quality PNG version of logo
- [ ] Test color extraction with actual logo file
- [ ] Create color palette CSS variables
- [ ] Choose 2-3 integration patterns that fit design
- [ ] Implement responsive logo sizing
- [ ] Test on multiple devices and screen sizes
- [ ] Verify accessibility (contrast ratios)
- [ ] Optimize image sizes for web (use srcset)
- [ ] Add loading states for color extraction
- [ ] Cache extracted colors in localStorage
- [ ] Document color extraction process for team
