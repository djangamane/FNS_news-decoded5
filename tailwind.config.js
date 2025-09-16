/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // This will scan all necessary files in the src directory
  ],
  theme: {
    extend: {
      fontFamily: {
        'mono': ['Courier New', 'monospace'],
      },
      colors: {
        'matrix-green': '#00ff00',
        'matrix-dark': '#000000',
        'cyber-blue': '#00ffff',
      },
    },
  },
  plugins: [],
}