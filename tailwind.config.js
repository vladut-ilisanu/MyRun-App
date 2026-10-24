/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#07070A',
        surface: '#0E0E13',
        card: '#15151B',
        cardhi: '#1C1C24',
        border: '#242430',
        borderhi: '#33333F',
        mint: '#00F5A0',
        cyan: '#22D3EE',
        blue: '#3B82F6',
        violet: '#A855F7',
        pink: '#FF4D8D',
        orange: '#FF7A45',
        amber: '#FBBF24',
        dim: '#8A8A98',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        '2xl': '1.1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
        hero: '0 20px 60px -20px rgba(0,0,0,0.8)',
      },
      fontSize: {
        '7xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.03em' }],
      },
    },
  },
  plugins: [],
};
