# Design System: Comprehensive Style Guide

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [Color Palette](#color-palette)
3. [Typography System](#typography-system)
4. [Spacing & Layout](#spacing--layout)
5. [Components](#components)
6. [Motion & Micro-interactions](#motion--micro-interactions)
7. [Imagery & Illustration](#imagery--illustration)
8. [Accessibility](#accessibility)
9. [Logo & Branding Integration](#logo--branding-integration)

---

## Design Philosophy

### Voice in Motion
The design philosophy centers on **Voice in Motion**—capturing the essence of fluid, intuitive expression. The visual language should reflect:

- **Purposeful clarity** over minimalism for its own sake
- **Editorial warmth** combined with technological sophistication
- **Human-centered design** that feels grounded and approachable
- **Flow state readiness**—designs that support deep focus without distraction
- **Quiet confidence**—brand through rhythm, not noise

### Design Principles

| Principle | Application |
|-----------|-------------|
| **Humanistic** | Avoid clinical AI aesthetics; embrace personality and warmth |
| **Editorial** | Generous spacing, wide margins, breathing room for content |
| **Accessible** | Prioritize contrast and readability without sacrificing beauty |
| **Motion-aware** | Subtle animations that acknowledge both movement and stillness |
| **Tactile** | Show Flow in real-life contexts; avoid sterile UI screenshots |
| **Expressive** | Balance utility with creativity; support visual storytelling |

---

## Color Palette

### Primary Colors

| Color Name | Hex | RGB | CMYK | Usage |
|-----------|-----|-----|------|-------|
| **Lumen** (Off-White) | `#F5F5F5` | 245, 245, 245 | 0/0/0/4 | Primary background, light elements |
| **Void** (Deep Navy) | `#191521` | 25, 21, 33 | 99/0/86/7 | Text, dark overlays, primary contrast |
| **Pulse** (Warm Purple) | `#9F88C8` | 159, 136, 200 | 21/32/0/22 | CTAs, highlights, accent elements |
| **Drift** (Soft Rose) | `#D9C2C0` | 217, 194, 192 | 0/11/12/15 | Warm accents, secondary highlights |
| **Dawn** (Soft Gray) | `#524F58` | 82, 79, 88 | 7/10/0/65 | Tertiary text, disabled states |
| **Calm** (Soft Green) | Strategic use in CTAs and UI details | N/A | N/A | Rooted vitality, action signals |

### Gradient System

**Primary Brand Gradient** (bottom-to-top):
```
Start: #9F88C8 (Pulse) at 0%
Middle: #D9C2C0 (Drift) at 20%
End: #F5F5F5 (Lumen) at 80%
```

This gradient invokes warmth, humanity, and empathy—core brand qualities.

### Color Application

- **Backgrounds**: Lumen (#F5F5F5) or Void (#191521) for maximum clarity
- **Text**: Void (#191521) on light backgrounds; Lumen (#F5F5F5) on dark backgrounds
- **CTAs**: Pulse (#9F88C8) with green accents for emphasis (never overwhelming)
- **Secondary Actions**: Soft neutrals (Drift, Dawn)
- **Disabled/Tertiary**: Dawn (#524F58) at reduced opacity
- **Accent Focus**: Green tones for actionable UI, never as primary treatment

### Color Contrast Standards

- Main text on background: Minimum 7:1 WCAG AAA compliance
- UI elements: Minimum 4.5:1 WCAG AA compliance
- Never rely on color alone to convey information

---

## Typography System

### Typeface Pairings

**Primary Heading Typeface: Figtree**
- Weight: Bold, Medium, Regular
- Usage: H1, H2, H3 titles, brand-forward statements
- Characteristics: Clean modernism with humanistic quirks
- Available weights: 300 (Light), 400 (Regular), 500 (Medium), 600 (Semi-Bold), 700 (Bold)

**Secondary/Editorial Typeface: Serif (e.g., Merriweather, or similar editorial serif)**
- Weight: Regular, Bold
- Usage: Body copy, descriptive text, narrative elements
- Characteristics: Warm, elegant, adds editorial personality
- Provides contrast to Figtree's modernism

**Fallback/System Font: Inter or -apple-system stack**
- Usage: UI labels, metadata, utility text
- Characteristics: Highly legible at small sizes
- Font stack: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue'`

### Type Scale & Hierarchy

```
H1 (Display)      36px / 44px    Figtree Bold      Brand statements, hero sections
H2 (Large Heading) 28px / 36px   Figtree Bold      Section headers
H3 (Heading)      20px / 28px    Figtree Semi-Bold Core content headers
H4 (Subheading)   16px / 24px    Figtree Medium    Sub-sections
Body (Large)      16px / 24px    Editorial Serif   Primary body copy
Body (Regular)    14px / 22px    Editorial Serif   Standard body copy
Label/Metadata    12px / 18px    System Font       Tags, timestamps, meta info
Micro Text        11px / 16px    System Font       Disclaimers, fine print
Button Text       14px / 20px    Figtree Medium    CTA labels
Input Text        14px / 20px    System Font       Form inputs
```

### Font Weights & Usage

| Weight | Figtree Use | Editorial Use | When to Use |
|--------|------------|---------------|------------|
| 300 (Light) | Emphasis/inverse | N/A | Large heading with reduced weight |
| 400 (Regular) | Body/utility | Body copy | Primary text content |
| 500 (Medium) | UI labels, subheads | N/A | Navigation, buttons, emphasis |
| 600 (Semi-Bold) | Subheadings | N/A | H4 and minor emphasis |
| 700 (Bold) | Main headings, CTAs | Headlines/bold | H1, H2, H3, strong emphasis |

### Typographic Details

- **Line Spacing**: 1.6 for body copy (ensures readability and breathing room)
- **Letter Spacing**: Tight (default kerning) for headings; relaxed for body
- **Numerals**: Use lining figures for UI, tabular numbers for data alignment
- **Punctuation**: Leverage serif typeface's quirks (curly quotes, em-dashes)
- **Emphasis**: Use italics sparingly; prefer weight contrast or color

---

## Spacing & Layout

### Spacing Scale

Follow an 8px base unit system for consistency:

```
xs    4px    (micro adjustments)
sm    8px    (element spacing)
md    16px   (component spacing)
lg    24px   (section spacing)
xl    32px   (major section breaks)
2xl   48px   (hero/major elements)
3xl   64px   (page breaks)
4xl   96px   (viewport-spanning sections)
```

### Layout Principles

- **Generous Whitespace**: Aim for 40-60% whitespace in editorial sections
- **Wide Margins**: Use `width: 90vw` or container with max-width on desktop
- **Two-Column Layouts**: Preferred for brand pages (left content, right breathing space)
- **Soft Corners**: Border radius of `12px` to `24px` (never sharp corners)
- **Centered Content**: Use CSS Grid or Flexbox with `place-items: center`

### Container Guidelines

```
Mobile (< 640px)        min padding: 16px
Tablet (640px - 1024px) min padding: 24px
Desktop (> 1024px)      max-width: 1200px, min padding: 32px
Ultra-wide (> 1600px)   max-width: 1400px with centered container
```

### Grid Systems

- **6-column grid** for mobile layouts
- **12-column grid** for tablet/desktop layouts
- **Gaps between columns**: 16px (mobile), 24px (tablet/desktop)

---

## Components

### Buttons

**Primary Button**
- Background: Pulse (#9F88C8)
- Text: Lumen (#F5F5F5)
- Padding: 12px 24px (vertical × horizontal)
- Border Radius: 12px
- Font: Figtree Medium, 14px
- Hover State: Slightly darker Pulse (opacity 0.9), subtle shadow
- Active State: Darker Pulse (opacity 0.8)
- Transition: All 200ms ease-out

**Secondary Button**
- Border: 1px solid Pulse (#9F88C8)
- Background: Transparent
- Text: Pulse (#9F88C8)
- Padding: 12px 24px
- Border Radius: 12px
- Hover State: Light Pulse background (opacity 0.1)
- Transition: All 200ms ease-out

**Button Sizes**
```
sm  10px 16px  12px font
md  12px 24px  14px font (default)
lg  16px 32px  16px font
```

### Cards & Containers

- **Background**: Lumen (#F5F5F5) or semi-transparent Void
- **Border Radius**: 16px to 24px
- **Shadow**: Soft drop-shadow (0 4px 12px rgba(0,0,0,0.08))
- **Padding**: 24px to 32px
- **Border**: Optional 1px solid Drift (#D9C2C0) for subtle definition

### Form Elements

**Text Input**
- Border: 1px solid Drift (#D9C2C0)
- Background: Lumen (#F5F5F5)
- Padding: 12px 16px
- Border Radius: 12px
- Font: System font, 14px
- Focus State: 2px solid Pulse (#9F88C8), no outline
- Transition: All 150ms ease-out

**Labels**
- Font: Figtree Medium, 12px
- Color: Void (#191521)
- Margin: 0 0 8px 0

### Navigation

- **Alignment**: Horizontal, left-aligned or centered
- **Spacing**: 24px between items
- **Active State**: Pulse (#9F88C8) underline or background
- **Font**: Figtree Medium, 14px

---

## Motion & Micro-interactions

### Transition Principles

- **Entrance animations**: 300-400ms (subtle fade/slide)
- **Hover interactions**: 150-200ms (immediate feedback)
- **Exit animations**: 200-300ms (graceful fadeout)
- **Easing function**: `cubic-bezier(0.4, 0, 0.2, 1)` (Material Design standard)

### Common Animations

**Fade In (Hero Section)**
```
opacity: 0 → 1
duration: 400ms
delay: 0ms (staggered children by 100ms)
easing: ease-out
```

**Hover Lift (Cards)**
```
transform: translateY(0) → translateY(-4px)
box-shadow: 0 4px 12px → 0 12px 24px
duration: 200ms
easing: ease-out
```

**Scroll Reveal**
```
opacity: 0, transform: translateY(20px) → opacity: 1, translateY(0)
trigger: on scroll (Intersection Observer)
duration: 600ms
delay: based on element position
```

**Button Press**
```
transform: scale(1) → scale(0.98)
duration: 100ms
easing: ease-in
(followed by scale(1) on release)
```

### Animation Guiding Principle

- Subtle over showy (never distract from content)
- Performance-first (use `transform` and `opacity` only)
- Purposeful (every animation should communicate or guide)
- Respectful (honor `prefers-reduced-motion` preference)

---

## Imagery & Illustration

### Photography Style

- **Real-life contexts**: Show Flow in lived-in spaces (desks, coffee shops, etc.)
- **Tactile focus**: Hands-on interaction, authentic moments
- **Lighting**: Natural, warm lighting; avoid harsh fluorescent
- **Composition**: Minimalist, thoughtful framing
- **Subjects**: Diverse professionals in authentic work settings
- **Editing**: Subtle color grading; enhanced clarity without oversaturation

### Illustration Style

Based on the "Voice in Motion" concept:

- **Organic forms**: Fluid, curved lines reflecting speech and flow
- **Character positioning**: Mid-thought, mid-gesture moments
- **Proportions**: Playful but intentional; reflect cadence of voice
- **Color**: Leverage brand palette (Pulse, Drift, Calm accents)
- **Stroke weight**: Variable strokes for visual interest
- **Background**: Minimal or absent; subjects float in space

### Icon Style

- **Stroke-based** (2px to 3px strokes)
- **Round corners** (2px to 3px border-radius)
- **24px grid** (for UI), scalable to 48px+
- **Consistent stroke width** across all icons
- **Negative space** is active design element
- **Color**: Void (#191521) on light; Lumen (#F5F5F5) on dark; Pulse for highlights

---

## Accessibility

### Contrast Ratios

- **AAA Compliance** for all primary text (7:1 minimum)
- **AA Compliance** for UI elements (4.5:1 minimum)
- **Avoid** light text on light backgrounds, dark on dark

### Color Considerations

- **Never use color alone** to convey information
- **Pair visual cues** with text labels or icons
- **Color blind safe** palette (test with Colorblind Simulation tools)

### Text Readability

- **Minimum font size**: 12px for body copy (14px preferred)
- **Line length**: 50-75 characters per line (optimal readability)
- **Line spacing**: 1.5x minimum for body copy (1.6x recommended)
- **Font choice**: Serif for body improves readability on screen

### Interactive Elements

- **Focus states**: Visible, high-contrast (minimum 2px border)
- **Hover states**: Clear visual feedback (color, shadow, transform)
- **Active states**: Distinct from hover
- **Disabled states**: Reduce opacity to 50%, clear label

### Motion Accessibility

- **Respect `prefers-reduced-motion`**: Disable animations for users who opt-out
- **No auto-playing videos**: Always require user interaction
- **Pause on hover**: For any looping animations

### Keyboard Navigation

- **Tab order**: Logical, left-to-right, top-to-bottom
- **Skip links**: Provide skip-to-main-content for navigation
- **Focusable elements**: All interactive elements must be keyboard accessible

---

## Logo & Branding Integration

### Logo Basics

**Two-Color Logo System**
- **Light version**: For dark backgrounds
- **Dark version**: For light backgrounds
- **Never** use other colors or apply effects

### Logo Sizing & Spacing

- **Minimum size**: 40px wide (print: 20mm)
- **Spacing metric**: Use lowercase 'r' as reference for minimum clear space around logo
- **Never crowd**: Maintain at least 40px clear space on all sides

### Logo Scaling Rules

```
Desktop header     Logo at 32-48px height
Mobile header      Logo at 24-32px height
Favicon            Logo simplified to icon at 16x16px, 32x32px
Social profiles    Logo at 400x400px minimum
Print materials    Logo at 20-50mm width
```

### Logo Integration Examples

**Header with Dark Background**
```html
<!-- Use light logo on dark backgrounds -->
<header style="background: #191521;">
  <img src="logo-light.svg" alt="Design System" style="height: 40px;">
</header>
```

**Header with Light/Gradient Background**
```html
<!-- Use dark logo on light backgrounds -->
<header style="background: linear-gradient(135deg, #F5F5F5 0%, #D9C2C0 100%);">
  <img src="logo-dark.svg" alt="Design System" style="height: 40px;">
</header>
```

**Logo Color Extraction & Background Integration**
- Extract dominant color from logo JPG using image analysis tools
- Use extracted color as primary or accent in surrounding layout
- Apply subtle opacity (0.1-0.3) of logo color as background wash
- Create complementary gradient using brand palette colors

---

## Implementation Checklist

- [ ] Color palette variables defined in CSS or design system
- [ ] Typeface families imported and loaded
- [ ] Spacing scale implemented as utility classes
- [ ] Button and form component styles created
- [ ] Motion defaults set with reasonable easing/duration
- [ ] Accessibility audit completed (contrast, keyboard nav, ARIA labels)
- [ ] Logo variants created and properly versioned
- [ ] Dark mode support implemented (consider Void as dark background)
- [ ] Responsive breakpoints aligned with layout guidelines
- [ ] Component library documented for team reference
