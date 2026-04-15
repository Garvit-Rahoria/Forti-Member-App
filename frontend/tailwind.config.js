/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f3eeff',
          100: '#e0d4ff',
          200: '#c4aaff',
          300: '#a47fff',
          400: '#8655ff',
          500: '#6C3EAB',
          600: '#5c31a0',
          700: '#4b2585',
          800: '#3b1a6a',
          900: '#2a1050',
        },
      },
    },
  },
  plugins: [],
}
