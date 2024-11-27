/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#181825',
        primary: '#b4befe',
        secondary: '#313244',
        danger: '#f38ba8',
        tooltip: '#11111b',
        text: '#ffffff',
      },
    },
  },
  plugins: [],
};