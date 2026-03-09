/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#111827',
          hover: '#1f2937',
          active: '#374151',
        }
      }
    },
  },
  plugins: [],
}
