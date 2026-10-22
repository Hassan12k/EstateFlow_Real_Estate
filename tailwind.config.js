/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{html,js,ts}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#e50914',
          hover: '#f40612',
        },
        surface: {
          dark: '#07090e',
          card: '#10141f',
          border: '#1f2638',
        }
      },
      aspectRatio: {
        'poster': '2/3',
        'backdrop': '16/9',
      }
    },
  },
  plugins: [],
};
