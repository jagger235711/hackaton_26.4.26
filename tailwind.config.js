/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          red: '#ff0033',
          green: '#00ff66',
        }
      }
    },
  },
  plugins: [],
}