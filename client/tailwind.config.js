/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary brand — Discord Blurple (#5865F2)
        brand: {
          50: '#F1F3FE',
          100: '#E1E5FE',
          200: '#C5CDFC',
          300: '#A3AFFB',
          400: '#7D8BF8',
          500: '#5865F2',
          600: '#4752C4',
          700: '#3C45A5',
          800: '#2F3687',
          900: '#25296C',
          950: '#14163A',
          DEFAULT: '#5865F2',
        },
        discord: {
          blurple: '#5865F2',
          green: '#57F287',
          yellow: '#FEE75C',
          fuchsia: '#EB459E',
          red: '#ED4245',
          dark: '#313338',
          darker: '#2B2D31',
          darkest: '#1E1F22',
        },
      },
      screens: {
        xs: '420px',
      },
    },
  },
  plugins: [],
};