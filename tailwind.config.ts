import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  safelist: [
    // Ensure dark mode variants are not purged
    'dark:bg-surface-base',
    'dark:bg-surface-layer',
    'dark:bg-surface-elevated',
    'dark:text-text-primary',
    'dark:text-text-secondary',
    'dark:text-text-tertiary',
    'dark:border-outline-light',
    'dark:border-outline-mid',
  ],
  theme: {
    extend: {
      colors: {
        // Atmospheric color palette - Cumulonimbus design system
        // Base: True black foundation (dark mode default)
        black: '#000000',
        'near-black': '#050505',

        // Surfaces: Layered greys for atmospheric depth (with dark mode variants)
        'surface-base': 'rgb(var(--surface-base) / <alpha-value>)',
        'surface-layer': 'rgb(var(--surface-layer) / <alpha-value>)',
        'surface-elevated': 'rgb(var(--surface-elevated) / <alpha-value>)',

        // Outlines: Subtle separation
        'outline-light': 'rgb(var(--outline-light) / <alpha-value>)',
        'outline-mid': 'rgb(var(--outline-mid) / <alpha-value>)',

        // Text hierarchy
        'text-primary': 'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
        'text-tertiary': 'rgb(var(--text-tertiary) / <alpha-value>)',

        // Accent Gold: Bold, energetic (same in both themes)
        'accent-yellow': 'rgb(var(--accent-yellow) / <alpha-value>)',

        // Pastel accents (for subtle differentiation)
        'pastel-blue': 'rgb(107 177 224 / <alpha-value>)', // User/Info
        'pastel-green': 'rgb(139 219 177 / <alpha-value>)', // Success/Execution
        'pastel-yellow': 'rgb(240 216 144 / <alpha-value>)', // Warning/System
        'pastel-purple': 'rgb(200 176 240 / <alpha-value>)', // AI/Architect
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
        'pulse-yellow': 'pulseYellow 2s infinite',
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
        pulseYellow: {
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
