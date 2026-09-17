/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif']
      },
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e'
        },
        dark: '#0f172a'
      },
      boxShadow: {
        soft: '0 10px 40px -10px rgba(0,0,0,0.15)',
        glow: '0 0 40px rgba(14,165,233,0.25)'
      }
    }
  },
  plugins: []
}
