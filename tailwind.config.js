/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Scan all files in the src directory
    "./src/components/**/*.{js,ts,jsx,tsx}", // Explicitly scan the components directory
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