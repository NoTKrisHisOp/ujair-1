export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
        'gradient-x': 'gradient-x 3s ease infinite',
        'pulse-slow': 'pulse-slow 2s ease-in-out infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        'slide-in-from-top': 'slide-in-from-top 0.5s ease-out forwards',
        'slide-in-from-left': 'slide-in-from-left 0.6s ease-out forwards',
        'slide-in-from-right': 'slide-in-from-right 0.6s ease-out forwards',
      },
      scale: {
        'active': 'scale(0.95)',
      }
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant('active', '&:active');
    },
  ],
}
