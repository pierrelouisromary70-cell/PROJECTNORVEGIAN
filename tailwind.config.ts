import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        fjord: {
          50: '#f0f6ff',
          100: '#dbe9ff',
          200: '#b8d3ff',
          300: '#8ab4ff',
          400: '#5a8ff7',
          500: '#3a6be8',
          600: '#2a4fcc',
          700: '#233fa3',
          800: '#1f3582',
          900: '#1b2d68',
          950: '#0f1a3f',
        },
        glacier: {
          50: '#f4fbfb',
          100: '#e3f5f5',
          500: '#3fb6b6',
          700: '#1f7878',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
