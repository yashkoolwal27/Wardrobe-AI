/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Core Palette ────────────────────────────────
        charcoal: {
          50:  '#f5f5f5',
          100: '#e8e8e8',
          200: '#d0d0d0',
          300: '#a8a8a8',
          400: '#787878',
          500: '#505050',
          600: '#383838',
          700: '#282828',
          800: '#1a1a1a',
          900: '#0f0f0f',
          950: '#080808',
        },
        ivory: {
          50:  '#fefdfb',
          100: '#fdf8f0',
          200: '#f9f0e0',
          300: '#f5f0e8',  // primary ivory
          400: '#ede4d3',
          500: '#d9cebc',
          600: '#c4b49e',
          700: '#a8926e',
          800: '#7a6540',
          900: '#4a3c1e',
        },
        gold: {
          50:  '#fdf9ed',
          100: '#faf0cf',
          200: '#f5de98',
          300: '#efc75f',
          400: '#e9b230',
          500: '#c9a84c',  // primary gold accent
          600: '#b8921a',
          700: '#9a7416',
          800: '#7d5c14',
          900: '#604714',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:    ['"Inter"', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass':       '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glass-lg':    '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
        'gold-glow':   '0 0 24px rgba(201,168,76,0.35)',
        'gold-glow-sm':'0 0 12px rgba(201,168,76,0.25)',
        'inset-glass': 'inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      backgroundImage: {
        'gradient-radial':  'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':   'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'shimmer':          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
        'gold-shimmer':     'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.15) 50%, transparent 100%)',
      },
      animation: {
        'shimmer':         'shimmer 2s infinite',
        'float':           'float 6s ease-in-out infinite',
        'float-slow':      'float 10s ease-in-out infinite',
        'pulse-gold':      'pulseGold 2s ease-in-out infinite',
        'spin-slow':       'spin 8s linear infinite',
        'fade-in':         'fadeIn 0.5s ease-out',
        'slide-up':        'slideUp 0.4s ease-out',
      },
      keyframes: {
        shimmer:    { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        float:      { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        pulseGold:  { '0%, 100%': { boxShadow: '0 0 12px rgba(201,168,76,0.25)' }, '50%': { boxShadow: '0 0 24px rgba(201,168,76,0.5)' } },
        fadeIn:     { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:    { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
}
