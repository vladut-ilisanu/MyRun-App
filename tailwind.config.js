/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A12',
        surface: '#101019',
        card: '#16161F',
        cardhi: '#1D1D28',
        border: '#272734',
        borderhi: '#363646',
        mint: '#7B8CFF',
        cyan: '#22D3EE',
        blue: '#3B82F6',
        indigo: '#6366F1',
        violet: '#A855F7',
        pink: '#FF4D8D',
        orange: '#FB923C',
        amber: '#FBBF24',
        dim: '#8C8C9E',
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
