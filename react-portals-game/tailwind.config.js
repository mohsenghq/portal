/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'game-bg': '#1a202c',
        'tile-hidden': '#4a5568',
        'tile-empty': '#2d3748',
        'panel-bg': '#2d3748',
      },
      fontFamily: {
        'game': ['Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}