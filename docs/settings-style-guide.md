# Settings Page Style Guide

## Typography

- Body text uses the global sans-serif stack defined in `globals.css`.
- Primary headings use the serif display stack with `font-serif` and `font-medium`.
- Settings page title uses `text-2xl` on desktop with tight line height.
- Section headers inside cards use `text-lg` with `font-serif` and `font-medium`.
- Supporting descriptions use `text-sm` with `text-text-secondary` and `leading-relaxed`.

## Color Palette

- Text colors:
  - Primary: `text-text-primary`
  - Secondary: `text-text-secondary`
  - Tertiary and meta: `text-text-tertiary`
- Accent and interactive:
  - Accent highlight: `text-accent-yellow` and `bg-accent-yellow/10`
  - Tab active state: `bg-accent-yellow/15 text-accent-yellow border-accent-yellow/40`
  - Surfaces: `bg-surface-base`, `bg-surface-layer`, `bg-surface-elevated`
- Status messages:
  - Success: `bg-green-500/20 text-green-400 border-green-500/30`
  - Error: `bg-red-500/20 text-red-400 border-red-500/30`

All tokens are backed by CSS variables, providing automatic dark mode support.

## Spacing and Layout

- Settings page content is constrained to `max-w-4xl` and centered with horizontal padding `px-6`.
- Vertical spacing uses `space-y-6` for sections and `mb-2`–`mb-6` for headings.
- Tabs row uses `pb-4` and a bottom border `border-b border-outline-light`.
- Inside cards:
  - Outer padding is handled by the `Card` component with `padding="lg"`.
  - Headings to content spacing uses `mb-2` or `mb-4`.
  - Form field stacks use `space-y-4`.

## Interactive Elements

- Health Monitoring:
  - Connection Test: `btn-ghost` with `RefreshCw` icon for manual status refresh.
  - Availability: `CheckCircle2` (green) or `XCircle` (red) icons for real-time provider health.
  - Error Feedback: `AlertCircle` with `text-red-400` for provider-specific error messages.
- Tabs:
  - Base: `text-sm font-medium`, rounded `rounded-xl`.
  - Active: `bg-accent-yellow/15 text-accent-yellow border border-accent-yellow/40`.
  - Inactive: `text-text-secondary hover:text-text-primary hover:bg-surface-elevated/70 border border-transparent`.
  - Focus: `focus-ring-yellow` utility for keyboard accessibility.
- Inputs:
  - Background: `bg-surface-elevated`.
  - Border: `border-outline-light`.
  - Rounded corners: `rounded-lg`.
  - Focus: `focus:ring-2 focus:ring-accent-yellow/60`.
- Checkboxes:
  - Border: `border-outline-mid`.
  - Checked color: `text-accent-yellow`.

## Responsiveness and Dark Mode

- Layout is built on flex and max-width constraints and inherits global breakpoints.
- Dark mode is handled via Tailwind class-based dark mode and CSS variables:
  - Surface and text tokens automatically switch in `.dark` theme.
  - Accent yellow remains consistent in both themes for brand continuity.

