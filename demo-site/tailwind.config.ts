import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './layouts/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        black: '#000000',
        'near-black': '#050505',
        'surface-base': 'rgb(var(--surface-base) / <alpha-value>)',
        'surface-layer': 'rgb(var(--surface-layer) / <alpha-value>)',
        'surface-elevated': 'rgb(var(--surface-elevated) / <alpha-value>)',
        'outline-light': 'rgb(var(--outline-light) / <alpha-value>)',
        'outline-mid': 'rgb(var(--outline-mid) / <alpha-value>)',
        'text-primary': 'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
        'text-tertiary': 'rgb(var(--text-tertiary) / <alpha-value>)',
        'accent-yellow': 'rgb(var(--accent-yellow) / <alpha-value>)',
        'pastel-blue': 'rgb(107 177 224 / <alpha-value>)',
        'pastel-green': 'rgb(139 219 177 / <alpha-value>)',
        'pastel-yellow': 'rgb(240 216 144 / <alpha-value>)',
        'pastel-purple': 'rgb(200 176 240 / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Source Serif Pro', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
