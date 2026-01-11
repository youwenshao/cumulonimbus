/**
 * Color utilities for Cumulonimbus atmospheric design system
 */

// Pastel accent colors at various opacities
export const pastelBlue = (opacity: number = 0.1) => `rgba(107, 177, 224, ${opacity})`;
export const pastelGreen = (opacity: number = 0.1) => `rgba(139, 219, 177, ${opacity})`;
export const pastelYellow = (opacity: number = 0.1) => `rgba(240, 216, 144, ${opacity})`;
export const pastelPurple = (opacity: number = 0.05) => `rgba(200, 176, 240, ${opacity})`;

// Atmospheric color palette
export const colors = {
  // Base layers
  black: '#000000',
  nearBlack: '#050505',

  // Surface layers
  surfaceDark: '#0a0a0a',
  surfaceMid: '#111111',
  surfaceLight: '#1a1a1a',

  // Outlines
  outlineLight: '#2d2d2d',
  outlineMid: '#333333',

  // Text hierarchy
  textPrimary: '#FFFFFF',
  textSecondary: '#cccccc',
  textTertiary: '#888888',

  // Accent gold
  accentRed: '#fcad00',
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

// Message background utilities
export const userMessageBg = (opacity: number = 0.2) => pastelBlue(opacity);
export const architectMessageBg = (opacity: number = 0.5) => withOpacity(colors.surfaceMid, opacity);
export const actionMessageBg = (opacity: number = 0.1) => pastelGreen(opacity);