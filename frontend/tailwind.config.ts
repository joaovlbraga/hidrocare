import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "ui-sans-serif",
          "system-ui",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        hospital: {
          50: "#eff8ff",
          100: "#dbeefe",
          200: "#b8dffc",
          300: "#7dc6f8",
          400: "#3aa7ef",
          500: "#1677c8",
          600: "#0f66ad",
          700: "#095a9c",
          800: "#0c4a7d",
          900: "#0b3254",
          950: "#081f37",
        },
        status: {
          stable: { bg: "#ecfdf5", fg: "#047857", border: "#a7f3d0", solid: "#10b981" },
          warning: { bg: "#fffbeb", fg: "#b45309", border: "#fde68a", solid: "#f59e0b" },
          critical: { bg: "#fef2f2", fg: "#b91c1c", border: "#fecaca", solid: "#ef4444" },
        },
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        "card-hover": "0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.06)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "pulse-soft": { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.5" } },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
