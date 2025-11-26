# Design System: Quick Reference & Cheatsheet

## Brand Colors Quick Access

```
Primary Palette:
- Lumen (Off-White)     #F5F5F5   245, 245, 245
- Void (Navy)           #191521    25, 21, 33
- Pulse (Purple)        #9F88C8   159, 136, 200   ← Main accent
- Drift (Rose)          #D9C2C0   217, 194, 192
- Dawn (Gray)           #524F58    82, 79, 88
- Calm (Green)          Strategic use only
```

## CSS Variables (Copy-Paste Ready)

```css
/* Colors */
--color-lumen: #F5F5F5;
--color-void: #191521;
--color-pulse: #9F88C8;
--color-drift: #D9C2C0;
--color-dawn: #524F58;

/* Typography */
--font-display: 'Figtree';
--font-body: 'Merriweather';
--font-ui: system-ui;

/* Spacing (8px base) */
--space-1: 4px;   --space-3: 16px;  --space-5: 32px;  --space-7: 64px;
--space-2: 8px;   --space-4: 24px;  --space-6: 48px;  --space-8: 96px;

/* Transitions */
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);

/* Border Radius */
--radius-sm: 12px;
--radius-md: 16px;
--radius-lg: 24px;

/* Shadows */
--shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
--shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
--shadow-brand: 0 4px 12px rgba(0,0,0,0.08);
```

## Typography Scale

| Element | Size | Weight | Line-height | Use |
|---------|------|--------|-------------|-----|
| H1 | 36px | Bold (700) | 1.2 | Hero sections |
| H2 | 28px | Bold (700) | 1.286 | Section headers |
| H3 | 20px | Semi-Bold (600) | 1.4 | Sub-headers |
| Body | 16px | Regular (400) | 1.6 | Main content |
| Small | 14px | Regular (400) | 1.57 | UI text |
| Label | 12px | Medium (500) | 1.5 | Form labels |

## Component Sizing

**Buttons**
- Small: 10px / 16px (vertical / horizontal)
- Medium: 12px / 24px (default)
- Large: 16px / 32px

**Cards**
- Padding: 24px-32px
- Border-radius: 16px-24px
- Shadow: var(--shadow-brand)

**Inputs**
- Padding: 12px / 16px
- Border-radius: 12px
- Focus: 2px solid #9F88C8

## Responsive Breakpoints

```
Mobile      < 640px
Tablet      640px - 1024px
Desktop     > 1024px
Ultra-wide  > 1600px
```

## Logo Integration Quick Start

### Client-Side Color Extraction

```typescript
import { analyzeImageColors } from '@/utils/colorExtraction';

const analysis = await analyzeImageColors('/logo.svg');
// Returns: dominant, vibrant, muted, lightVibrant, darkVibrant, palette
```

### Create Gradient from Logo

```typescript
const gradient = `linear-gradient(
  135deg,
  ${analysis.dominant.rgba(0.1)} 0%,
  ${analysis.vibrant.rgba(0.08)} 50%,
  ${analysis.lightVibrant.rgba(0.06)} 100%
)`;
```

### Apply Accent Color

```typescript
<button style={{ backgroundColor: analysis.vibrant.hex }}>
  Click me
</button>
```

## Common Patterns

### Fade In Animation

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
animation: fadeIn 400ms cubic-bezier(0.4, 0, 0.2, 1);
```

### Hover Lift Effect

```css
&:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.15);
}
```

### Scroll Reveal

```typescript
const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });
```

### Dark Mode Support

```css
@media (prefers-color-scheme: dark) {
  body { background: #191521; color: #F5F5F5; }
}
```

## Logo Format Guide

| Format | Best For | Pros | Cons |
|--------|----------|------|------|
| SVG | Web/responsive | Scalable, small files | Needs proper export |
| PNG | General use | Good quality, transparent | Larger files |
| JPG | Photography | Small file size | No transparency, lossy |

## Accessibility Checklist

- [ ] Text contrast ≥ 7:1 (AAA)
- [ ] Interactive elements ≥ 4.5:1 (AA)
- [ ] Focus states visible (2px border minimum)
- [ ] Keyboard navigation working
- [ ] Alt text on all images
- [ ] Form labels properly associated
- [ ] prefers-reduced-motion respected
- [ ] Color never sole indicator of info

## Performance Tips

1. **Images**: Use `next/image` with proper sizes
2. **CSS**: Minimize repaints (use transform/opacity)
3. **Colors**: Cache extracted colors in localStorage
4. **Animations**: Use `will-change` sparingly
5. **Layout**: Use CSS containment for complex sections

## Motion Defaults

```
Entrance: 300-400ms fade/slide
Hover: 150-200ms response
Easing: cubic-bezier(0.4, 0, 0.2, 1)
Exit: 200-300ms fadeout
```

## File Structure

```
├── components/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Logo.tsx
│   ├── Header.tsx
│   └── Footer.tsx
├── utils/
│   ├── colorExtraction.ts
│   └── animations.ts
├── hooks/
│   ├── useScrollReveal.ts
│   └── useKeyboardNavigation.ts
├── styles/
│   ├── globals.css
│   ├── animations.module.css
│   └── theme-dark.css
└── context/
    └── ThemeContext.tsx
```

## Debugging Quick Fixes

**Colors not loading?**
```css
/* Use fallback colors */
background: linear-gradient(135deg, #F5F5F5, #D9C2C0);
```

**Animations stuttering?**
```css
/* Enable GPU acceleration */
transform: translateZ(0);
will-change: transform;
```

**Image extraction failing?**
```typescript
img.crossOrigin = 'Anonymous'; /* Add CORS header */
```

**Responsive issues?**
```css
/* Use clamp for fluid sizing */
font-size: clamp(1rem, 2vw, 2rem);
padding: clamp(1rem, 3vw, 2rem);
```

## Import Patterns

```typescript
// Components
import { Button, Card, Logo } from '@/components';

// Utils
import { analyzeImageColors } from '@/utils/colorExtraction';
import { animations } from '@/utils/animations';

// Hooks
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useTheme } from '@/context/ThemeContext';

// Types
import type { ButtonProps, CardProps } from '@/types';
```

## Command Quick Reference

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build production
npm run lint            # Check code quality
npm run type-check      # TypeScript validation
npm run format          # Format code with Prettier

# Testing
npm run test            # Run tests
npm run test:watch      # Watch mode
```

## Links & Resources

- **Design System**
- **Fonts**: Figtree (display), Merriweather (body)
- **Tools**: Next.js, TypeScript, Tailwind CSS
- **Accessibility**: WCAG 2.1 AAA compliance
- **Performance**: Optimized for Web Vitals

## Common Questions

**Q: What color should CTA buttons be?**
A: Use Pulse (#9F88C8) with optional green accent overlay (10% opacity max)

**Q: How do I make dark mode?**
A: Use CSS custom properties with `@media (prefers-color-scheme: dark)`

**Q: Which font for mobile headings?**
A: Still Figtree, but use `clamp()` for fluid sizing: `font-size: clamp(1.5rem, 5vw, 3rem)`

**Q: How many animation keyframes is too many?**
A: Limit to 2-3 per page section. Use `prefers-reduced-motion` for users who opt out.

**Q: Should I use the gradient everywhere?**
A: Use strategically for section transitions. Avoid overuse—preserve white space.

---

**Version**: 1.0
**Last Updated**: November 2025
**Maintainer**: Design System Team
