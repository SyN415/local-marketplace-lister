# JigglyPost Design System

## Principles
1. **Playful Glassmorphism**: High-contrast, playful interface with glass-like elements (`bg-glass-bg`, `backdrop-blur-md`) and bold borders (`border-glass-border`).
2. **Tailwind v4 @theme**: Leveraging the new Tailwind v4 theme configuration for streamlined token management.
3. **shadcn/ui**: Utilizing shadcn/ui components customized with our design tokens for a robust and accessible UI foundation.

## Tokens

### Colors (OKLCH)
- **Primary**: Mid-tone Magenta (`oklch(0.55 0.25 350)`)
- **Secondary**: Vibrant Orange (`oklch(0.65 0.20 30)`)
- **Accent**: Bright Pink (`oklch(0.60 0.20 330)`)
- **Background**: Slate 50 (`oklch(0.98 0.01 240)`) for light mode, Slate 950 (`oklch(0.10 0.02 240)`) for dark mode.
- **Glass Background**: `rgba(255, 255, 255, 0.7)` (light), `rgba(30, 41, 59, 0.6)` (dark).

### Typography
- **Display Font**: `Orbitron` - Used for headings (`h1` - `h6`) and key UI elements requiring a futuristic/tech feel.
- **Body Font**: `Rajdhani` - Used for body text, providing readability with a technical edge.

### Spacing & Layout
- **Container**: Max width `7xl` for main content areas.
- **Card Padding**: Standard `p-6` or `p-8` for spacious, readable cards.
- **Border Radius**: `rounded-3xl` for cards and major containers, `rounded-full` for buttons.

### Shadows & Effects
- **Glass Shadow**: `shadow-glass` - A custom shadow to enhance the depth of glassmorphism elements.
- **Blur**: `backdrop-blur-md` - Standard blur for glass backgrounds.

## Usage Examples

### Glass Card
```tsx
<div className="bg-glass-bg border border-glass-border backdrop-blur-md rounded-3xl p-6 shadow-glass">
  <h2 className="font-display font-bold text-2xl">Glass Card Title</h2>
  <p className="font-body text-muted-foreground">Content goes here...</p>
</div>
```

### Gradient Text
```tsx
<h1 className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-display font-black text-4xl">
  JigglyPost
</h1>
```

### Primary Button
```tsx
<Button className="rounded-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 font-bold">
  Action
</Button>
```

## Branding

### Logo
- **Main Logo**: `/jp1.jpg` - Used in the navbar and branding headers.
- **Sprites**: `/jp2.jpg` - Additional brand graphics and sprites.

### Iconography
- **Library**: `lucide-react`
- **Style**: Consistent stroke width (usually `2px`), rounded line caps.