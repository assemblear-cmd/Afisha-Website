import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
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
        ink: '#1E0A3C',
        body: '#39364F',
        muted: '#6F7287',
        success: '#3EB489',
        surface: '#F8F7FA',
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
