/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        rose: {
          50:  "#FFF1F2",
          100: "#FFE4E6",
          200: "#FECDD3",
          300: "#FDA4AF",
          400: "#FB7185",
          500: "#F43F5E",
        },
        brand: {
          DEFAULT: "#00C46A",
          50:  "#f0fdf6",
          100: "#dcfce9",
          200: "#bbf7d4",
          300: "#86efac",
          400: "#00C46A",
          500: "#00a857",
          600: "#008a47",
          700: "#006f38",
          800: "#00572c",
          900: "#003d1e",
        },
      },
      borderColor: {
        DEFAULT: "#f0f0f0",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
