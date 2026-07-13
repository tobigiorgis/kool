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
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // Tinta
        ink: {
          DEFAULT: "#1D1D1F",
          secondary: "#86868B",
          tertiary: "#B4B2B8",
        },
        // Superficies
        surface: {
          DEFAULT: "#FBFAFA",
          hover: "#F6F5F5",
        },
        hairline: "#F5F4F4",
        // Rosa como brand — mapea el viejo ramp `brand` para que las
        // clases existentes (bg-brand-50, text-brand-600...) pasen a rosa
        // sin tocar cada archivo.
        pink: {
          DEFAULT: "#FB7185",
          fill: "#FFF1F2",
          "fill-hover": "#FFE4E6",
          strong: "#F43F5E",
          text: "#E11D48",
          deep: "#BE123C",
        },
        brand: {
          DEFAULT: "#FB7185",
          50: "#FFF1F2",
          100: "#FFE4E6",
          200: "#FECDD3",
          300: "#FDA4AF",
          400: "#FB7185",
          500: "#F43F5E",
          600: "#E11D48",
          700: "#BE123C",
          800: "#9F1239",
          900: "#881337",
        },
        rose: {
          50: "#FFF1F2",
          100: "#FFE4E6",
          200: "#FECDD3",
          300: "#FDA4AF",
          400: "#FB7185",
          500: "#F43F5E",
          600: "#E11D48",
        },
        amber: { DEFAULT: "#F5A623" },
      },
      borderColor: {
        DEFAULT: "#F5F4F4",
      },
      borderRadius: {
        card: "16px",
        field: "10px",
        pill: "100px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(29,29,31,0.04), 0 8px 24px rgba(29,29,31,0.05)",
        "card-hover": "0 2px 4px rgba(29,29,31,0.05), 0 16px 40px rgba(29,29,31,0.08)",
        pill: "0 1px 2px rgba(29,29,31,0.04)",
        overlay: "0 4px 12px rgba(29,29,31,0.08), 0 24px 64px rgba(29,29,31,0.16)",
      },
      transitionTimingFunction: {
        "out-strong": "cubic-bezier(0.23, 1, 0.32, 1)",
        "in-out-strong": "cubic-bezier(0.77, 0, 0.175, 1)",
        drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
        spring: "cubic-bezier(0.34, 1.4, 0.64, 1)",
      },
      transitionDuration: {
        press: "140ms",
        fast: "180ms",
        base: "240ms",
        drawer: "380ms",
      },
      animation: {
        "fade-up": "kool-fade-up 240ms cubic-bezier(0.23,1,0.32,1) both",
        "scale-in": "kool-scale-in 180ms cubic-bezier(0.23,1,0.32,1) both",
        "slide-in-right": "kool-slide-in-right 380ms cubic-bezier(0.32,0.72,0,1) both",
        "slide-up": "kool-slide-up 380ms cubic-bezier(0.32,0.72,0,1) both",
        "overlay-in": "kool-overlay-in 180ms ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
