# Cumulonimbus Design System Style Guide

## Overview

Cumulonimbus is an atmospheric design system inspired by cloud formations and layered depth. The system creates visual hierarchy through subtle surface layering, maintains brand continuity with a signature accent gold, and ensures accessibility through comprehensive theme support.

## Design Philosophy

### Atmospheric Layering
- **Surface Hierarchy**: Three distinct surface layers create depth and visual separation
- **Glass Effects**: Subtle backdrop blur and transparency effects enhance atmospheric feel
- **Subtle Shadows**: Minimal shadow usage focused on elevated elements

### Brand Continuity
- **Accent Gold**: Consistent golden yellow (#fca000) across both light and dark themes
- **Typography Scale**: Serif for display, sans-serif for interface, monospace for code
- **Rounded Corners**: Consistent `rounded-xl` (0.75rem) for primary elements

### Accessibility First
- **Theme Support**: Comprehensive light and dark mode implementation
- **Color Contrast**: WCAG compliant text hierarchy
- **Focus States**: Clear focus rings for keyboard navigation

## Color Palette

### Primary Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| **surface-base** | `#ffffff` | `#0a0a0a` | Primary background |
| **surface-layer** | `#f1f5f9` | `#111111` | Secondary surfaces, cards |
| **surface-elevated** | `#f8fafc` | `#1a1a1a` | Elevated content, modals |

### Text Hierarchy

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| **text-primary** | `#0f172a` | `#ffffff` | Primary content, headings |
| **text-secondary** | `#475569` | `#cccccc` | Secondary content, descriptions |
| **text-tertiary** | `#64748b` | `#888888` | Metadata, captions, disabled states |

### Outlines and Borders

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| **outline-light** | `#e2e8f0` | `#2d2d2d` | Subtle borders, dividers |
| **outline-mid** | `#cbd5e1` | `#333333` | Interactive borders, focus states |

### Accent Colors

| Token | Hex Code | Usage |
|-------|----------|-------|
| **accent-yellow** | `#fca000` | Primary actions, highlights, focus states |
| **pastel-blue** | `#6bb1e0` | User messages, informational content |
| **pastel-green** | `#8bd9b1` | Success states, action messages, confirmations |
| **pastel-yellow** | `#f0d890` | Warning states, system notifications |
| **pastel-purple** | `#c8b0f0` | AI responses, architectural content |

## Typography

### Font Families

```css
--font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
--font-serif: Georgia, 'Times New Roman', serif;
--font-mono: 'JetBrains Mono', 'SF Mono', Monaco, 'Cascadia Code', monospace;
```

### Type Scale

| Size Class | Font Size | Line Height | Usage |
|------------|-----------|-------------|-------|
| **text-xs** | 0.75rem (12px) | 1rem | Captions, metadata |
| **text-sm** | 0.875rem (14px) | 1.25rem | Secondary text, descriptions |
| **text-base** | 1rem (16px) | 1.5rem | Body text, default content |
| **text-lg** | 1.125rem (18px) | 1.75rem | Section headings, emphasized content |
| **text-xl** | 1.25rem (20px) | 1.75rem | Primary headings |
| **text-2xl** | 1.5rem (24px) | 1.5rem | Page titles, major sections |

### Font Weights

| Weight Class | Value | Usage |
|--------------|-------|-------|
| **font-light** | 300 | Subtle text, captions |
| **font-normal** | 400 | Body text, default |
| **font-medium** | 500 | Emphasized content, buttons |
| **font-semibold** | 600 | Headings, important labels |
| **font-bold** | 700 | Strong emphasis, branding |

### Font Usage Guidelines

- **Sans-serif**: Interface elements, buttons, navigation, body text
- **Serif**: Display headings, section titles, branding elements
- **Monospace**: Code blocks, technical content, data display

## Spacing System

### Layout Spacing

| Class | Value | Usage |
|-------|-------|-------|
| **space-y-2** | 0.5rem (8px) | Tight spacing between related elements |
| **space-y-4** | 1rem (16px) | Standard spacing between form fields |
| **space-y-6** | 1.5rem (24px) | Section spacing, major content blocks |
| **space-y-8** | 2rem (32px) | Large section breaks, page layout |

### Component Padding

| Class | Value | Usage |
|-------|-------|-------|
| **p-4** | 1rem (16px) | Small cards, compact elements |
| **p-6** | 1.5rem (24px) | Standard cards, content containers |
| **p-8** | 2rem (32px) | Large cards, spacious layouts |
| **px-6** | 1.5rem horizontal | Page content margins |

## Component Patterns

### Cards

```css
/* Base card styles */
.glass-atmospheric {
  background-color: rgb(var(--surface-base) / 0.9);
  backdrop-filter: blur(24px);
  border: 1px solid rgb(var(--outline-light) / 0.3);
  border-radius: 0.75rem;
}

.glass-surface {
  background-color: rgb(var(--surface-layer) / 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgb(var(--outline-light) / 0.2);
  border-radius: 0.75rem;
}
```

**Variants:**
- **Default**: `glass-atmospheric` - Primary content containers
- **Outlined**: `border border-outline-light bg-surface-base/50` - Subtle separation
- **Elevated**: `glass-surface shadow-lg shadow-black/50` - Modal dialogs, important content

### Buttons

```css
/* Primary button */
.btn-primary {
  @apply bg-accent-yellow hover:bg-accent-yellow/90 text-text-primary font-medium rounded-xl transition-all duration-200 shadow-lg shadow-accent-yellow/25 hover:shadow-xl hover:shadow-accent-yellow/30;
}

/* Secondary button */
.btn-secondary {
  @apply bg-surface-elevated border border-outline-light hover:border-outline-mid text-text-primary font-medium rounded-xl transition-all duration-200;
}

/* Ghost button */
.btn-ghost {
  @apply text-text-secondary hover:text-text-primary hover:bg-surface-elevated/50 rounded-lg transition-all duration-200;
}
```

**Sizes:**
- **sm**: `px-3 py-1.5 text-sm`
- **md**: `px-4 py-2.5 text-base`
- **lg**: `px-6 py-3 text-lg`

### Message Bubbles

```css
/* User messages */
.message-user {
  background-color: rgb(var(--pastel-blue) / 0.1);
  border: 1px solid rgb(var(--outline-light) / 0.3);
  border-radius: 1rem;
}

/* Architect messages */
.message-architect {
  border-left: 4px solid rgb(var(--accent-yellow));
  background-color: rgb(var(--surface-layer) / 0.5);
}

/* Action messages */
.message-action {
  background-color: rgb(var(--pastel-green) / 0.1);
  border: 1px solid rgb(var(--outline-light) / 0.3);
  border-radius: 0.75rem;
}
```

### Form Elements

```css
/* Input styling */
.input-atmospheric {
  @apply bg-surface-elevated border border-outline-light/50 focus:border-accent-yellow/50 focus:ring-1 focus:ring-accent-yellow/20;
}

/* Focus ring */
.focus-ring-yellow {
  @apply focus:outline-none focus:ring-2 focus:ring-accent-yellow/50 focus:ring-offset-2 focus:ring-offset-black;
}
```

## Interactive States

### Hover Effects
- **Buttons**: `hover:bg-accent-yellow/90` with enhanced shadow
- **Cards**: `hover:border-outline-mid` for outlined variants
- **Links**: `hover:text-accent-yellow` transition

### Focus States
- **Keyboard Navigation**: `focus-ring-yellow` utility class
- **Form Elements**: `focus:ring-accent-yellow/50` with offset
- **Interactive Elements**: Consistent 2px ring with accent color

### Loading States
- **Buttons**: Spinner animation with `animate-spin`
- **Content**: `animate-pulse` for skeleton loading
- **Progress**: Yellow progress bars with `animate-pulse`

## Theme System

### Light Mode Values
```css
:root {
  --surface-base: 255 255 255;
  --surface-layer: 241 245 249;
  --surface-elevated: 248 250 252;
  --outline-light: 226 232 240;
  --outline-mid: 203 213 225;
  --text-primary: 15 23 42;
  --text-secondary: 71 85 105;
  --text-tertiary: 100 116 139;
  --accent-yellow: 252 160 0;
}
```

### Dark Mode Values
```css
.dark {
  --surface-base: 10 10 10;
  --surface-layer: 17 17 17;
  --surface-elevated: 26 26 26;
  --outline-light: 45 45 45;
  --outline-mid: 51 51 51;
  --text-primary: 255 255 255;
  --text-secondary: 204 204 204;
  --text-tertiary: 136 136 136;
  --accent-yellow: 252 160 0;
}
```

### Theme Implementation
- **Class-based**: Uses Tailwind's `dark:` prefix system
- **CSS Variables**: All colors defined as HSL values in CSS custom properties
- **Automatic Switching**: Theme provider manages `dark` class on document root

## Animation and Motion

### Keyframe Animations

```css
@keyframes confident {
  0% { opacity: 0; transform: scale(0.98); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes pulseYellow {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(252, 160, 0, 0.4); }
  50% { opacity: 0.8; box-shadow: 0 0 0 4px rgba(252, 160, 0, 0); }
}

@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
```

### Transition Classes

| Class | Duration | Easing |
|-------|----------|--------|
| **transition-all** | 200ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| **transition-colors** | 300ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| **transition-transform** | 200ms | `cubic-bezier(0.4, 0, 0.2, 1)` |

## Usage Guidelines

### Content Organization
- **Page Layout**: Max-width constraints with centered content
- **Section Spacing**: Consistent `space-y-6` between major sections
- **Content Hierarchy**: Clear visual separation with surface layers

### Color Usage
- **Accent Yellow**: Reserve for primary actions and important highlights
- **Pastel Colors**: Use sparingly for status indication and user feedback
- **Text Hierarchy**: Always use semantic text tokens for accessibility

### Responsive Design
- **Mobile First**: Design for mobile, enhance for larger screens
- **Breakpoint System**: Uses Tailwind's default responsive prefixes
- **Flexible Layouts**: Grid and flexbox with appropriate wrapping

### Accessibility Considerations
- **Color Contrast**: All text combinations meet WCAG AA standards
- **Keyboard Navigation**: Focus rings on all interactive elements
- **Screen Readers**: Proper ARIA labels and semantic markup
- **Reduced Motion**: Respect `prefers-reduced-motion` settings

## Implementation Notes

### CSS Architecture
- **Utility-First**: Tailwind CSS with custom design tokens
- **CSS Variables**: Theme-aware colors using HSL format
- **Component Classes**: Predefined utility combinations for consistency

### File Structure
- **globals.css**: Global styles, CSS variables, utility classes
- **tailwind.config.ts**: Theme configuration and custom utilities
- **colors.ts**: JavaScript color utilities and theme functions

### Maintenance
- **Design Tokens**: All colors and spacing defined as CSS custom properties
- **Consistent Naming**: Semantic token names for maintainability
- **Documentation**: Keep this guide updated with design system changes

---

*This style guide reflects the Cumulonimbus design system as of January 15, 2026. For implementation questions or design system updates, refer to the development team.*