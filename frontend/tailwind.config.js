/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
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
          950: '#1a0a30',
        },
        accent: {
          gold: '#D4A853',
          'gold-light': '#F5E6C8',
          'gold-dark': '#B8923F',
        },
        ink: {
          DEFAULT: '#0F0A1A',
          muted: '#5C5670',
          subtle: '#8B8499',
        },
        surface: {
          base: '#FAFAFC',
          card: '#FFFFFF',
          muted: '#F4F2F8',
          elevated: '#EBE8F2',
        },
      },
      boxShadow: {
        soft: '0 4px 24px -4px rgba(42, 16, 80, 0.08)',
        'soft-lg': '0 12px 40px -8px rgba(42, 16, 80, 0.12)',
        glow: '0 8px 32px -4px rgba(108, 62, 171, 0.35)',
        'glow-gold': '0 8px 32px -4px rgba(212, 168, 83, 0.25)',
        glass: '0 8px 32px rgba(15, 10, 26, 0.08)',
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #1a0a30 0%, #3b1a6a 45%, #6C3EAB 100%)',
        'gradient-cta': 'linear-gradient(135deg, #5c31a0 0%, #6C3EAB 50%, #8655ff 100%)',
        'gradient-gold-shimmer': 'linear-gradient(135deg, #6C3EAB 0%, #8655ff 60%, #D4A853 100%)',
        'gradient-section': 'linear-gradient(180deg, #F4F2F8 0%, #FAFAFC 100%)',
        'gradient-sidebar': 'linear-gradient(180deg, #0F0A1A 0%, #2a1050 100%)',
        'gradient-chamber': 'linear-gradient(135deg, #2a1050 0%, #4b2585 50%, #6C3EAB 100%)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'mesh-drift': 'meshDrift 24s ease-in-out infinite',
        'shimmer': 'shimmer 3s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        meshDrift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(2%, -2%) scale(1.02)' },
          '66%': { transform: 'translate(-1%, 1%) scale(0.98)' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
