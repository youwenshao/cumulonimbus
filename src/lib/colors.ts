/**
 * Color utilities for Cumulonimbus atmospheric design system
 * Uses theme-aware colors that adapt to light/dark mode
 */

// Get computed style color from CSS custom properties
const getCSSColor = (property: string): string => {
  if (typeof window === 'undefined') return '#000000'; // SSR fallback

  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  return computedStyle.getPropertyValue(property).trim() || '#000000';
};

// Theme-aware color getters
export const getThemeColors = () => {
  const isDark = document.documentElement?.classList.contains('dark') ?? true;

  return {
    // Base layers
    black: '#000000',
    nearBlack: '#050505',

    // Surface layers (from Tailwind config)
    surfaceBase: isDark ? '#0a0a0a' : '#ffffff',
    surfaceLayer: isDark ? '#111111' : '#f1f5f9',
    surfaceElevated: isDark ? '#1a1a1a' : '#f8fafc',

    // Outlines
    outlineLight: isDark ? '#2d2d2d' : '#e2e8f0',
    outlineMid: isDark ? '#333333' : '#cbd5e1',

    // Text hierarchy
    textPrimary: isDark ? '#FFFFFF' : '#0f172a',
    textSecondary: isDark ? '#cccccc' : '#475569',
    textTertiary: isDark ? '#888888' : '#64748b',

    // Accent gold (same in both themes)
    accentYellow: '#fca000',

    // Pastel accents (same in both themes)
    pastelBlue: '#6bb1e0',
    pastelGreen: '#8bd9b1',
    pastelYellow: '#f0d890',
    pastelPurple: '#c8b0f0',
  };
};

// Pastel accent colors at various opacities
export const pastelBlue = (opacity: number = 0.1) => `rgba(107, 177, 224, ${opacity})`;
export const pastelGreen = (opacity: number = 0.1) => `rgba(139, 219, 177, ${opacity})`;
export const pastelYellow = (opacity: number = 0.1) => `rgba(240, 216, 144, ${opacity})`;
export const pastelPurple = (opacity: number = 0.05) => `rgba(200, 176, 240, ${opacity})`;

// Legacy color object for backwards compatibility
export const colors = {
  // Base layers
  black: '#000000',
  nearBlack: '#050505',

  // Surface layers (dark mode defaults)
  surfaceBase: '#0a0a0a',
  surfaceLayer: '#111111',
  surfaceElevated: '#1a1a1a',

  // Deprecated aliases
  surfaceDark: '#0a0a0a',
  surfaceMid: '#111111',
  surfaceLight: '#1a1a1a',

  // Outlines
  outlineLight: '#2d2d2d',
  outlineMid: '#333333',

  // Text hierarchy (dark mode defaults)
  textPrimary: '#FFFFFF',
  textSecondary: '#cccccc',
  textTertiary: '#888888',

  // Accent gold
  accentRed: '#fcad00', // Note: renamed to accentYellow in new system
} as const;

// Utility functions for dynamic opacity
export const withOpacity = (color: string, opacity: number) => {
  // If color is already rgba, extract the base color
  if (color.startsWith('rgba')) {
    const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
    }
  }

  // If color is hex, convert to rgba
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  return color;
};

// Message background utilities (theme-aware)
export const userMessageBg = (opacity: number = 0.1) => {
  const themeColors = getThemeColors();
  return `rgba(107, 177, 224, ${opacity})`; // pastel-blue with opacity
};

export const architectMessageBg = (opacity: number = 0.5) => {
  const themeColors = getThemeColors();
  return withOpacity(themeColors.surfaceLayer, opacity);
};

export const actionMessageBg = (opacity: number = 0.1) => {
  const themeColors = getThemeColors();
  return `rgba(139, 219, 177, ${opacity})`; // pastel-green with opacity
};