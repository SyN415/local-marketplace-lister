/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: '#0055FF', // International Blue
        background: '#FFFFFF', // White
        surface: '#F5F5F5', // Light Gray
        text: '#000000', // Black
        'text-secondary': '#666666', // Dark Gray
        border: '#E5E5E5', // Light Gray
      },
      borderRadius: {
        none: '0px', // Force sharp corners
      },
      boxShadow: {
        'none': 'none', // Remove default shadows
      }
    },
  },
  plugins: [],
}