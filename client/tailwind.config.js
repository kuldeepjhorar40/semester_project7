/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'], serif: ['"Playfair Display"', 'Georgia', 'serif'] },
      colors: {
        // University navy + gold
        navy: { 50: '#f1f5fb', 100: '#dde7f4', 200: '#b9cde8', 300: '#8aaad6', 400: '#5a83bf', 500: '#3a63a3', 600: '#2c4d85', 700: '#243f6b', 800: '#1b2f52', 900: '#12213b', 950: '#0b1527' },
        gold: { 50: '#fdf9eb', 100: '#faf0c8', 200: '#f5e08f', 300: '#efcb55', 400: '#e8b82f', 500: '#d49a1a', 600: '#b87713', 700: '#935713' },
      },
      boxShadow: { card: '0 1px 2px rgba(18,33,59,.06), 0 4px 16px rgba(18,33,59,.06)' },
      keyframes: {
        pop: { '0%': { opacity: 0, transform: 'translateY(6px) scale(.98)' }, '100%': { opacity: 1, transform: 'none' } },
        blink: { '0%, 80%, 100%': { opacity: 0.25 }, '40%': { opacity: 1 } },
      },
      animation: { pop: 'pop .25s ease-out both', blink: 'blink 1.2s infinite both' },
    },
  },
  plugins: [],
};
