import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Premium neutral — near-black ink, used for serious editorial typography.
        ink: {
          50: '#f7f7f8',
          100: '#eeeef0',
          200: '#d8d8dd',
          300: '#b4b4bd',
          400: '#888893',
          500: '#5c5c69',
          600: '#3f3f4a',
          700: '#2a2a33',
          800: '#1a1a21',
          900: '#0e0e13',
          950: '#06060a',
        },
        // Aurora accent — athletic, evocative of Northern lights.
        aurora: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        // Backward compatibility — fjord now points to ink for already-styled screens.
        fjord: {
          50: '#f7f7f8',
          100: '#eeeef0',
          200: '#d8d8dd',
          300: '#b4b4bd',
          400: '#888893',
          500: '#5c5c69',
          600: '#3f3f4a',
          700: '#2a2a33',
          800: '#1a1a21',
          900: '#0e0e13',
          950: '#06060a',
        },
        glacier: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          700: '#047857',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
    },
  },
  plugins: [],
};

export default config;
