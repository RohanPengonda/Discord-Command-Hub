/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF7F0',
          100: '#FFEADD',
          200: '#FFD2B0',
          300: '#FFB37D',
          400: '#FB8F42',
          500: '#E8751A',
          600: '#C55E12',
          700: '#9E490E',
          800: '#7C3A0E',
          900: '#63300F',
          950: '#351706',
          DEFAULT: '#E8751A',
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