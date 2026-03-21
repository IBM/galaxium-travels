/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'space-dark': '#030712',
        'space-blue': '#0A1929',
        'cosmic-purple': '#6366F1',
        'nebula-pink': '#EC4899',
        'alien-green': '#10B981',
        'solar-orange': '#F59E0B',
        'star-white': '#F9FAFB',
      },
      backgroundImage: {
        'space-gradient': 'linear-gradient(to bottom, #030712, #0A1929)',
        'cosmic-gradient': 'linear-gradient(135deg, #6366F1, #EC4899)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'twinkle': 'twinkle 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
      },
    },
  },
  plugins: [],
}

// Made with Bob
