import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Atmospheric color palette - Cumulonimbus design system
        // Base: True black foundation
        black: '#000000',
        'near-black': '#050505',

        // Surfaces: Layered greys for atmospheric depth
        'surface-dark': '#0a0a0a',
        'surface-mid': '#111111',
        'surface-light': '#1a1a1a',

        // Outlines: Subtle separation
        'outline-light': '#2d2d2d',
        'outline-mid': '#333333',

        // Text hierarchy
        'text-primary': '#FFFFFF',
        'text-secondary': '#cccccc',
        'text-tertiary': '#888888',

        // Accent Gold: Bold, energetic
        'accent-red': '#fca000',

        // Pastel accents (for subtle differentiation)
        'pastel-blue': '#6bb1e0', // User/Info
        'pastel-green': '#8bd9b1', // Success/Execution
        'pastel-yellow': '#f0d890', // Warning/System
        'pastel-purple': '#c8b0f0', // AI/Architect
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Source Serif Pro', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
        display: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'], // For backwards compatibility
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
        'pulse-red': 'pulseRed 2s infinite',
        'confident': 'confident 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        pulseRed: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(252, 160, 0, 0.4)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 0 4px rgba(252, 160, 0, 0)' },
        },
        confident: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
