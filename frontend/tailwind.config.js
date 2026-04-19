/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
      },
      colors: {
        gold: { DEFAULT: '#B8860B', light: '#FAEEDA', dark: '#7a5a07' },
        amber: { DEFAULT: '#BA7517', hover: '#854F0B' },
      },
    },
  },
  plugins: [],
};
