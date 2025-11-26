# Frontend Development Guide
## TypeScript/JavaScript Implementation

## Table of Contents
1. [Project Setup](#project-setup)
2. [Design Tokens & CSS Variables](#design-tokens--css-variables)
3. [Component Architecture](#component-architecture)
4. [Logo & Image Integration](#logo--image-integration)
5. [Theming System](#theming-system)
6. [Motion & Animations](#motion--animations)
7. [Responsive Design](#responsive-design)
8. [Accessibility Implementation](#accessibility-implementation)
9. [Performance Optimization](#performance-optimization)
10. [Code Examples](#code-examples)

---

## Project Setup

### Recommended Stack
```json
{
  "framework": "Next.js 14+ with App Router",
  "styling": "Tailwind CSS + CSS Modules",
  "language": "TypeScript",
  "components": "React with Headless UI",
  "build": "Vercel or similar edge deployment",
  "package-manager": "npm or pnpm"
}
```

### Initial Configuration

**package.json scripts**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"**/*.{ts,tsx,css}\""
  }
}
```

**tsconfig.json (key settings)**
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "paths": {
      "@/*": ["./*"],
      "@components/*": ["./components/*"],
      "@utils/*": ["./utils/*"],
      "@styles/*": ["./styles/*"]
    }
  }
}
```

---

## Design Tokens & CSS Variables

### CSS Custom Properties Setup

**globals.css**
```css
:root {
  /* Color Palette - Primary */
  --color-lumen: #F5F5F5;
  --color-void: #191521;
  --color-pulse: #9F88C8;
  --color-drift: #D9C2C0;
  --color-dawn: #524F58;
  --color-calm-green: #4CAF50; /* Calculated calm accent */

  /* Color Palette - Semantic */
  --color-background-light: var(--color-lumen);
  --color-background-dark: var(--color-void);
  --color-text-primary: var(--color-void);
  --color-text-light: var(--color-lumen);
  --color-text-secondary: var(--color-dawn);
  --color-accent-primary: var(--color-pulse);
  --color-accent-secondary: var(--color-drift);
  --color-accent-action: var(--color-calm-green);

  /* Typography */
  --font-display: 'Figtree', system-ui, sans-serif;
  --font-body: 'Merriweather', Georgia, serif;
  --font-ui: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;

  /* Font Sizes */
  --text-xs: 0.6875rem; /* 11px */
  --text-sm: 0.75rem;   /* 12px */
  --text-base: 0.875rem; /* 14px */
  --text-lg: 1rem;       /* 16px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.75rem;   /* 28px */
  --text-3xl: 2.25rem;   /* 36px */

  /* Line Heights */
  --line-xs: 1;
  --line-tight: 1.25;
  --line-snug: 1.375;
  --line-normal: 1.5;
  --line-relaxed: 1.6;
  --line-loose: 1.75;

  /* Spacing Scale (8px base unit) */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 1rem;      /* 16px */
  --space-4: 1.5rem;    /* 24px */
  --space-5: 2rem;      /* 32px */
  --space-6: 3rem;      /* 48px */
  --space-7: 4rem;      /* 64px */
  --space-8: 6rem;      /* 96px */

  /* Border Radius */
  --radius-sm: 0.75rem;  /* 12px */
  --radius-md: 1rem;     /* 16px */
  --radius-lg: 1.5rem;   /* 24px */
  --radius-xl: 2rem;     /* 32px */
  --radius-full: 9999px;

  /* Shadows */
  --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-brand: 0 4px 12px rgba(0, 0, 0, 0.08);

  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slowest: 400ms cubic-bezier(0.4, 0, 0.2, 1);

  /* Z-index Scale */
  --z-dropdown: 10;
  --z-sticky: 20;
  --z-fixed: 30;
  --z-modal: 40;
  --z-tooltip: 50;
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background-light: var(--color-void);
    --color-background-dark: var(--color-lumen);
    --color-text-primary: var(--color-lumen);
    --color-text-light: var(--color-void);
    --color-text-secondary: rgba(255, 255, 255, 0.6);
  }
}

/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  :root {
    --transition-fast: 0ms;
    --transition-base: 0ms;
    --transition-slow: 0ms;
    --transition-slowest: 0ms;
  }

  * {
    animation-duration: 0ms !important;
    transition-duration: 0ms !important;
  }
}

/* Base Styles */
html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background-color: var(--color-background-light);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--line-relaxed);
  transition: background-color var(--transition-base);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: 700;
  line-height: var(--line-tight);
}

h1 { font-size: var(--text-3xl); }
h2 { font-size: var(--text-2xl); }
h3 { font-size: var(--text-xl); }
h4 { font-size: var(--text-lg); font-weight: 600; }
```

---

## Component Architecture

### Type Definitions

**types/index.ts**
```typescript
export type ColorName = 'lumen' | 'void' | 'pulse' | 'drift' | 'dawn' | 'calm';
export type Size = 'sm' | 'md' | 'lg';
export type Variant = 'primary' | 'secondary' | 'tertiary';

export interface ButtonProps {
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: Size;
}

export interface LogoProps {
  variant?: 'light' | 'dark' | 'auto';
  size?: number; // in pixels
  className?: string;
}
```

### Base Button Component

**components/Button.tsx**
```typescript
import React from 'react';
import { ButtonProps } from '@/types';
import styles from './Button.module.css';

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  children,
  className,
  ariaLabel,
  onClick,
}) => {
  return (
    <button
      className={`
        ${styles.button}
        ${styles[variant]}
        ${styles[size]}
        ${disabled || loading ? styles.disabled : ''}
        ${className || ''}
      `}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {icon && <span className={styles.icon}>{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
```

**components/Button.module.css**
```css
.button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-display);
  font-weight: 600;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  outline: 2px solid transparent;
  outline-offset: 2px;

  &:focus-visible {
    outline: 2px solid var(--color-pulse);
  }

  &:hover:not(.disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  &:active:not(.disabled) {
    transform: scale(0.98);
  }
}

.primary {
  background-color: var(--color-pulse);
  color: var(--color-lumen);

  &:hover:not(.disabled) {
    background-color: rgba(159, 136, 200, 0.9);
  }
}

.secondary {
  background-color: transparent;
  border: 1px solid var(--color-pulse);
  color: var(--color-pulse);

  &:hover:not(.disabled) {
    background-color: rgba(159, 136, 200, 0.1);
  }
}

.tertiary {
  background-color: transparent;
  color: var(--color-pulse);

  &:hover:not(.disabled) {
    background-color: rgba(159, 136, 200, 0.05);
  }
}

.sm {
  padding: 0.75rem 1rem;
  font-size: var(--text-sm);
}

.md {
  padding: 0.75rem 1.5rem;
  font-size: var(--text-base);
}

.lg {
  padding: 1rem 2rem;
  font-size: var(--text-lg);
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

### Card Component

**components/Card.tsx**
```typescript
import React from 'react';
import { CardProps } from '@/types';
import styles from './Card.module.css';

export const Card: React.FC<CardProps> = ({
  children,
  hover = true,
  padding = 'md',
  className,
}) => {
  return (
    <div
      className={`
        ${styles.card}
        ${styles[`padding-${padding}`]}
        ${hover ? styles.hoverable : ''}
        ${className || ''}
      `}
    >
      {children}
    </div>
  );
};
```

**components/Card.module.css**
```css
.card {
  background-color: var(--color-lumen);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-drift);
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
}

.hoverable {
  &:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-4px);
  }
}

.padding-sm {
  padding: var(--space-3);
}

.padding-md {
  padding: var(--space-4);
}

.padding-lg {
  padding: var(--space-5);
}

@media (prefers-color-scheme: dark) {
  .card {
    background-color: var(--color-void);
    border-color: rgba(255, 255, 255, 0.1);
  }
}
```

---

## Logo & Image Integration

### Logo Component with Color Extraction

**components/Logo.tsx**
```typescript
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { LogoProps } from '@/types';

export const Logo: React.FC<LogoProps> = ({
  variant = 'auto',
  size = 40,
  className,
}) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Detect dark mode
    if (variant === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDark(mediaQuery.matches);
      mediaQuery.addEventListener('change', (e) => setIsDark(e.matches));
    }
  }, [variant]);

  const logoSrc = (() => {
    if (variant === 'light') return '/logo-light.svg';
    if (variant === 'dark') return '/logo-dark.svg';
    return isDark ? '/logo-light.svg' : '/logo-dark.svg';
  })();

  return (
    <Image
      src={logoSrc}
      alt="Design System"
      width={size}
      height={size}
      priority
      className={className}
    />
  );
};
```

### Logo with Background Extraction

**utils/imageColorExtraction.ts**
```typescript
/**
 * Extracts dominant color from an image
 * Returns RGB and hex color values
 */
export async function extractDominantColor(
  imagePath: string
): Promise<{ hex: string; rgb: string; rgba: (alpha: number) => string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }

      ctx.drawImage(img, 0, 0);

      // Get image data (center region to avoid edges)
      const imageData = ctx.getImageData(
        img.width * 0.25,
        img.height * 0.25,
        img.width * 0.5,
        img.height * 0.5
      );

      const data = imageData.data;
      let r = 0, g = 0, b = 0;
      let pixelCount = 0;

      // Calculate average color
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        pixelCount++;
      }

      r = Math.floor(r / pixelCount);
      g = Math.floor(g / pixelCount);
      b = Math.floor(b / pixelCount);

      // Convert RGB to Hex
      const hex = `#${[r, g, b]
        .map((x) => x.toString(16).padStart(2, '0').toUpperCase())
        .join('')}`;

      const rgb = `rgb(${r}, ${g}, ${b})`;

      resolve({
        hex,
        rgb,
        rgba: (alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha})`,
      });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imagePath;
  });
}
```

### Header with Logo & Dynamic Background

**components/Header.tsx**
```typescript
import React, { useEffect, useState } from 'react';
import { Logo } from './Logo';
import { extractDominantColor } from '@/utils/imageColorExtraction';
import styles from './Header.module.css';

interface HeaderProps {
  logoPath?: string;
  useColorExtraction?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  logoPath = '/logo.svg',
  useColorExtraction = false,
}) => {
  const [accentColor, setAccentColor] = useState<string>('transparent');

  useEffect(() => {
    if (useColorExtraction && logoPath) {
      extractDominantColor(logoPath)
        .then((color) => {
          // Apply subtle accent color (10% opacity)
          setAccentColor(color.rgba(0.1));
        })
        .catch(console.error);
    }
  }, [logoPath, useColorExtraction]);

  return (
    <header
      className={styles.header}
      style={{
        background: useColorExtraction
          ? `linear-gradient(135deg, var(--color-lumen) 0%, ${accentColor} 100%)`
          : undefined,
      }}
    >
      <div className={styles.container}>
        <Logo size={48} className={styles.logo} />
        <nav className={styles.nav}>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#about">About</a>
        </nav>
      </div>
    </header>
  );
};
```

**components/Header.module.css**
```css
.header {
  background-color: var(--color-lumen);
  border-bottom: 1px solid var(--color-drift);
  padding: var(--space-4) 0;
  transition: background var(--transition-base);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  height: auto;
  width: auto;
}

.nav {
  display: flex;
  gap: var(--space-4);
  list-style: none;

  a {
    font-family: var(--font-display);
    font-weight: 500;
    color: var(--color-text-primary);
    text-decoration: none;
    transition: color var(--transition-base);
    position: relative;

    &::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 0;
      width: 0;
      height: 2px;
      background-color: var(--color-pulse);
      transition: width var(--transition-base);
    }

    &:hover::after {
      width: 100%;
    }
  }
}

@media (max-width: 768px) {
  .nav {
    display: none; /* Consider hamburger menu for mobile */
  }
}
```

### Image with Logo Overlay Pattern

**components/HeroSection.tsx**
```typescript
import React from 'react';
import Image from 'next/image';
import styles from './HeroSection.module.css';

interface HeroSectionProps {
  logoSrc: string;
  title: string;
  subtitle: string;
  backgroundImage?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  logoSrc,
  title,
  subtitle,
  backgroundImage,
}) => {
  return (
    <section
      className={styles.hero}
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
      }}
    >
      {/* Logo pattern overlay */}
      <div className={styles.logoPattern}>
        <Image
          src={logoSrc}
          alt="background"
          width={200}
          height={200}
          className={styles.logoOverlay}
        />
      </div>

      {/* Content */}
      <div className={styles.content}>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </section>
  );
};
```

**components/HeroSection.module.css**
```css
.hero {
  position: relative;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(135deg, var(--color-lumen) 0%, var(--color-drift) 100%);
}

.logoPattern {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
  align-items: center;
  justify-items: center;
  opacity: 0.08;
  pointer-events: none;
}

.logoOverlay {
  opacity: 0.5;
  filter: grayscale(100%) saturate(0.5);
}

.content {
  position: relative;
  z-index: 10;
  text-align: center;
  max-width: 800px;
  padding: 0 var(--space-4);

  h1 {
    font-size: var(--text-3xl);
    margin-bottom: var(--space-3);
    color: var(--color-void);
  }

  p {
    font-size: var(--text-lg);
    color: var(--color-text-secondary);
  }
}

@media (max-width: 768px) {
  .logoPattern {
    display: none;
  }

  .content h1 {
    font-size: var(--text-2xl);
  }
}
```

---

## Theming System

### Theme Provider

**context/ThemeContext.tsx**
```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>('system');
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Read from localStorage
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) setTheme(stored);

    // Apply theme
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    setEffectiveTheme(isDark ? 'dark' : 'light');

    // Update document class
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

### Theme Styles

**styles/theme-dark.css**
```css
[data-theme='dark'],
.dark,
@media (prefers-color-scheme: dark) {
  :root {
    --color-background-light: var(--color-void);
    --color-background-dark: var(--color-lumen);
    --color-text-primary: var(--color-lumen);
    --color-text-light: var(--color-void);
    --color-text-secondary: rgba(255, 255, 255, 0.6);
  }

  body {
    background-color: var(--color-void);
    color: var(--color-lumen);
  }
}
```

---

## Motion & Animations

### Animation Utilities

**utils/animations.ts**
```typescript
export const animations = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
    duration: 400,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  slideInUp: {
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    duration: 600,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  slideInDown: {
    from: { opacity: 0, transform: 'translateY(-20px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    duration: 600,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  scaleIn: {
    from: { opacity: 0, transform: 'scale(0.95)' },
    to: { opacity: 1, transform: 'scale(1)' },
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  hoverLift: {
    from: { transform: 'translateY(0)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
    to: { transform: 'translateY(-4px)', boxShadow: '0 12px 24px rgba(0,0,0,0.15)' },
    duration: 200,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

export const generateKeyframes = (name: string, from: any, to: any) => {
  return `
    @keyframes ${name} {
      from {
        ${Object.entries(from)
          .map(([key, value]) => `${camelToKebab(key)}: ${value};`)
          .join('\n')}
      }
      to {
        ${Object.entries(to)
          .map(([key, value]) => `${camelToKebab(key)}: ${value};`)
          .join('\n')}
      }
    }
  `;
};

const camelToKebab = (str: string): string =>
  str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
```

### Scroll Animation Hook

**hooks/useScrollReveal.ts**
```typescript
import { useEffect, useRef, useState } from 'react';

interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  delay?: number;
}

export const useScrollReveal = (
  options: ScrollRevealOptions = {}
) => {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    delay = 0,
  } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, delay);
          observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin, delay]);

  return { ref, isVisible };
};
```

### Animation CSS Module

**styles/animations.module.css**
```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.fadeIn {
  animation: fadeIn 400ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.slideInUp {
  animation: slideInUp 600ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.slideInDown {
  animation: slideInDown 600ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.scaleIn {
  animation: scaleIn 300ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* Stagger effect for multiple elements */
.staggerContainer > * {
  animation-name: inherit;
  animation-timing-function: inherit;
  animation-duration: inherit;
}

.staggerContainer > *:nth-child(1) { animation-delay: 0ms; }
.staggerContainer > *:nth-child(2) { animation-delay: 100ms; }
.staggerContainer > *:nth-child(3) { animation-delay: 200ms; }
.staggerContainer > *:nth-child(4) { animation-delay: 300ms; }
.staggerContainer > *:nth-child(5) { animation-delay: 400ms; }

@media (prefers-reduced-motion: reduce) {
  .fadeIn,
  .slideInUp,
  .slideInDown,
  .scaleIn {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

---

## Responsive Design

### Tailwind Breakpoints (recommended)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'xs': '320px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
  },
};
```

### Mobile-First Breakpoint System

**utils/breakpoints.ts**
```typescript
export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const media = {
  xs: `@media (min-width: ${breakpoints.xs})`,
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
  '2xl': `@media (min-width: ${breakpoints['2xl']})`,
  dark: '@media (prefers-color-scheme: dark)',
  reduced: '@media (prefers-reduced-motion: reduce)',
} as const;
```

### Responsive Component Example

**components/ResponsiveGrid.tsx**
```typescript
import React from 'react';
import styles from './ResponsiveGrid.module.css';

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
}) => {
  return (
    <div
      className={styles.grid}
      style={{
        '--columns-xs': columns.xs,
        '--columns-sm': columns.sm,
        '--columns-md': columns.md,
        '--columns-lg': columns.lg,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
};
```

**components/ResponsiveGrid.module.css**
```css
.grid {
  display: grid;
  grid-template-columns: repeat(var(--columns-xs), 1fr);
  gap: var(--space-3);

  @media (min-width: 640px) {
    grid-template-columns: repeat(var(--columns-sm), 1fr);
    gap: var(--space-4);
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(var(--columns-md), 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(var(--columns-lg), 1fr);
    gap: var(--space-5);
  }
}
```

---

## Accessibility Implementation

### Form Component with Accessibility

**components/TextInput.tsx**
```typescript
import React, { useId } from 'react';
import styles from './TextInput.module.css';

interface TextInputProps {
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  ariaDescribedBy?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  placeholder,
  type = 'text',
  required = false,
  error,
  disabled = false,
  value,
  onChange,
  ariaDescribedBy,
}) => {
  const id = useId();
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : ariaDescribedBy;

  return (
    <div className={styles.container}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && <span aria-label="required">*</span>}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        aria-describedby={describedBy}
        aria-invalid={!!error}
        className={`${styles.input} ${error ? styles.error : ''}`}
      />
      {error && (
        <p id={errorId} className={styles.errorMessage} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
```

**components/TextInput.module.css**
```css
.container {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.label {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--color-text-primary);

  span {
    color: #dc2626;
    margin-left: 4px;
  }
}

.input {
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-drift);
  border-radius: var(--radius-sm);
  background-color: var(--color-lumen);
  font-family: var(--font-ui);
  font-size: var(--text-base);
  color: var(--color-text-primary);
  transition: all var(--transition-base);
  outline: 2px solid transparent;
  outline-offset: 2px;

  &:focus {
    outline: 2px solid var(--color-pulse);
    outline-offset: 2px;
  }

  &:disabled {
    background-color: var(--color-dawn);
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.error {
    border-color: #dc2626;
    background-color: rgba(220, 38, 38, 0.05);
  }

  &.error:focus {
    outline-color: #dc2626;
  }
}

.errorMessage {
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  color: #dc2626;
  margin: 0;
}
```

### Keyboard Navigation Helper

**hooks/useKeyboardNavigation.ts**
```typescript
import { useEffect } from 'react';

export const useKeyboardNavigation = (
  ref: React.RefObject<HTMLElement>,
  onEnter?: () => void,
  onEscape?: () => void,
  onArrowUp?: () => void,
  onArrowDown?: () => void
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          onEnter?.();
          break;
        case 'Escape':
          e.preventDefault();
          onEscape?.();
          break;
        case 'ArrowUp':
          e.preventDefault();
          onArrowUp?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          onArrowDown?.();
          break;
      }
    };

    const element = ref.current;
    element?.addEventListener('keydown', handleKeyDown);

    return () => element?.removeEventListener('keydown', handleKeyDown);
  }, [onEnter, onEscape, onArrowUp, onArrowDown, ref]);
};
```

---

## Performance Optimization

### Image Optimization

**components/OptimizedImage.tsx**
```typescript
import React from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width = 400,
  height = 400,
  priority = false,
  sizes,
}) => {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
      quality={85}
      placeholder="blur"
      blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Crect fill='%23F5F5F5' width='100%25' height='100%25'/%3E%3C/svg%3E"
    />
  );
};
```

### Code Splitting

**layout.tsx**
```typescript
import dynamic from 'next/dynamic';

// Heavy components loaded on demand
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <div>Loading...</div>,
  ssr: false,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <HeavyChart />
    </>
  );
}
```

---

## Code Examples

### Complete Page Implementation

**app/page.tsx**
```typescript
import React from 'react';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <main>
      <Header useColorExtraction={true} logoPath="/logo.svg" />

      <HeroSection
        logoSrc="/logo-dark.svg"
        title="Voice in Motion"
        subtitle="Effortless voice dictation in every app"
      />

      <section className={styles.features}>
        <h2>Features</h2>
        <div className={styles.grid}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} hover>
              <h3>Feature {i}</h3>
              <p>Innovative capability description</p>
              <Button variant="secondary" size="sm">
                Learn More
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <h2>Ready to get started?</h2>
        <Button size="lg">Download for Free</Button>
      </section>
    </main>
  );
}
```

**app/page.module.css**
```css
.features {
  padding: var(--space-6) var(--space-4);
  max-width: 1200px;
  margin: 0 auto;

  h2 {
    margin-bottom: var(--space-4);
  }
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-4);
}

.cta {
  padding: var(--space-8) var(--space-4);
  background: linear-gradient(135deg, var(--color-pulse) 0%, var(--color-drift) 100%);
  text-align: center;
  color: var(--color-lumen);

  h2 {
    margin-bottom: var(--space-4);
  }
}
```

---

## Quick Reference

### CSS Variable Usage
```css
/* Colors */
background-color: var(--color-pulse);
color: var(--color-text-primary);

/* Spacing */
padding: var(--space-4);
margin-bottom: var(--space-3);

/* Typography */
font-family: var(--font-display);
font-size: var(--text-lg);
line-height: var(--line-relaxed);

/* Motion */
transition: all var(--transition-base);

/* Shadows */
box-shadow: var(--shadow-lg);
```

### TypeScript Import Pattern
```typescript
import { Button, Card, Logo } from '@/components';
import { useTheme } from '@/context/ThemeContext';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { extractDominantColor } from '@/utils/imageColorExtraction';
```

### Common Component Usage
```typescript
<Button variant="primary" size="md" onClick={() => {}}>
  Click me
</Button>

<Card hover padding="lg">
  <h3>Content</h3>
</Card>

<Logo variant="auto" size={48} />
```
