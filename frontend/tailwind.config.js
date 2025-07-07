/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      scale: {
        120: '1.2',
        125: '1.25',
        150: '1.5',
      },
      colors: {
        pinkdeep: "#C2185B",
        pink: "#E91E63",
        lightpink: "#F8BBD0",
      },
    },
  },
  plugins: [],
};
