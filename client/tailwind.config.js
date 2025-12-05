/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "nl-green": "#005A3A",
        "nl-gold": "#B8860B",
      },
    },
  },
  plugins: [],
};
