# Swiss-Style Design System (Project "Helvetica")

This document outlines the design specifications for the comprehensive UI/UX redesign of the Marketplace Lister application. The goal is to achieve a **Swiss Style (International Typographic Style)** aesthetic: objective, photography-centric, distinctively minimal, and highly structured.

## 1. Core Principles
- **Uniformity & Geometry:** Reliance on strict grid systems and geometric forms.
- **Asymmetry:** Dynamic, asymmetric layouts to create visual tension and interest.
- **Content-First:** The design recedes to let the content (listings, data) stand out.
- **Clarity:** High contrast and generous whitespace.

## 2. Typography System
**Font Family:** `Inter` (Google Fonts)
*Why: Geometric, objective, highly legible, and versatile.*

### Scale & Hierarchy
| Role | Tag | Weight | Size (Desktop) | Line Height | Letter Spacing |
|------|-----|--------|----------------|-------------|----------------|
| **Display** | H1 | Bold (700) / Black (900) | 64px (4rem) | 1.1 | -0.02em |
| **Title** | H2 | Bold (700) | 40px (2.5rem) | 1.2 | -0.01em |
| **Section** | H3 | SemiBold (600) | 24px (1.5rem) | 1.3 | -0.01em |
| **Body Large** | p.lg | Regular (400) | 18px (1.125rem)| 1.5 | 0em |
| **Body Base** | p | Regular (400) | 16px (1rem) | 1.5 | 0em |
| **Caption** | span | Medium (500) | 12px (0.75rem) | 1.4 | 0.02em |
| **Button** | btn | Bold (700) | 14px (0.875rem)| 1.0 | 0.05em (Caps)|

*Note: Headers should use tighter letter spacing to feel solid and graphical.*

## 3. Color Palette
The palette is strictly monochromatic with one meaningful accent color.

### Neutral Scale (Structure)
- **Canvas (Bg):** `#FFFFFF` (Pure White)
- **Surface (Cards):** `#F8F9FA` (Off-White / Gray-50)
- **Border:** `#E5E7EB` (Gray-200)
- **Text Primary:** `#111827` (Gray-900 - Near Black)
- **Text Secondary:** `#6B7280` (Gray-500)

### Accent (Action)
- **Primary:** `#0055FF` (International Blue) - *Replaces current gradients.*
  - *Usage:* Primary buttons, active states, links, key data points.
- **Error:** `#DC2626` (Red-600)
- **Success:** `#16A34A` (Green-600)

*Rule: Use color sparingly. 90% of the interface should be black and white.*

## 4. Grid & Spacing
A strict 8px scaling system to ensure perfect alignment.

### Spacing Scale
- **2px** (Quarter)
- **4px** (Half)
- **8px** (Base)
- **16px** (Double)
- **24px** (Triple)
- **32px** (Quad)
- **48px** (Section)
- **64px** (Large Section)
- **96px** (Giant)

### Grid Structure
- **Container:** Max-width `1280px` (centered).
- **Columns:** 12-column grid with `24px` gutters.
- **Alignment:** Left-aligned text is preferred over centered text for longer copy.

## 5. Component Guidelines

### Buttons
*   **Shape:** Sharp corners (`border-radius: 0px`).
*   **Style:** Solid, flat color. No gradients. No drop shadows.
*   **Typography:** Uppercase, Bold, Tracking wide.
*   **Hover:** Simple color shift (darken) or invert colors (Black bg -> White bg).

### Cards / Containers
*   **Shape:** Sharp corners (`border-radius: 0px`).
*   **Border:** Thin, crisp borders (`1px solid #E5E7EB`).
*   **Shadow:** **None.** The interface is flat. Use spacing and borders to define separation.
*   **Hover:** Subtle background color shift to `#F3F4F6` (Gray-100).

### Forms (Inputs)
*   **Style:** Boxed.
*   **Borders:** `1px solid #D1D5DB`. Focus state: `2px solid #0055FF`.
*   **Shape:** Sharp corners.
*   **Labels:** Bold, uppercase, small (12px), placed outside the input.

## 6. Implementation Strategy

### Step 1: Install Tailwind CSS
We will move away from custom CSS variables and MUI-only styling to a utility-first approach with Tailwind.

**Packages:**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Step 2: Configure `frontend/tailwind.config.js`
Define the design tokens directly in the config.

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: '#0055FF', // International Blue
        'near-black': '#111827',
      },
      borderRadius: {
        none: '0px', // Force sharp corners
      },
      boxShadow: {
        'none': 'none', // Remove default shadows
      }
    },
  },
  plugins: [],
}
```

### Step 3: Update Material UI Theme
Since the app uses MUI, we must override the default rounded styles to match the Swiss/Tailwind system.

**File:** `frontend/src/theme/index.ts`
- Set `shape.borderRadius = 0`.
- Remove `boxShadow` from components.
- Update palette to match Tailwind colors.
- Override `MuiButton`, `MuiPaper`, `MuiCard` to remove rounded corners and shadows.

### Step 4: Global CSS Refactor
- Reset `frontend/src/index.css` to include Tailwind directives (`@tailwind base;`, etc.).
- Remove old "Glassmorphism" styles (`.glass-card`) as they conflict with the flat Swiss aesthetic.
