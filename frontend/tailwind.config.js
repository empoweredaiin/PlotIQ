/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        heroZoom: {
          '0%':   { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.06)' },
        },
      },
      animation: {
        'hero-zoom': 'heroZoom 38s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
};
