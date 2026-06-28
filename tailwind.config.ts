import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1200px',
      },
    },
    extend: {
      colors: {
        coral: {
          DEFAULT: '#F05537',
          dark: '#D9442A',
        },
        success: '#3EB489',
        // Semantic tokens backed by CSS variables (see globals.css) so the whole
        // UI flips with the `dark` class. RGB channels keep Tailwind alpha
        // utilities working (border-ink/10, bg-surface/40, …).
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        body: 'rgb(var(--color-body) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        card: 'rgb(var(--color-card) / <alpha-value>)',
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 3px rgba(30,10,60,0.08), 0 4px 12px rgba(30,10,60,0.06)',
      },
      borderRadius: {
        lg: '0.625rem',
        xl: '1rem',
      },
      maxWidth: {
        container: '1200px',
      },
    },
  },
  plugins: [],
};

export default config;
