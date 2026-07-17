/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: '#d8c9a3',
        ink: '#1c1a17',
        gold: '#b8892b',
      },
    },
  },
  plugins: [],
};
