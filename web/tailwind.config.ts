import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        brand: "var(--brand)",
        "brand-dark": "var(--brand-dark)",
        "brand-light": "var(--brand-light)",
        ink: "#0F0F0F",
        // RISA clinical gray palette — pure, not tinted.
        // Mapped onto tailwind's slate slots so existing slate-* classes update automatically.
        slate: {
          50:  "#FAFAFA",
          100: "#F5F5F5",
          200: "#E6E6E6",
          300: "#D6D6D6",
          400: "#8A8A8A",
          500: "#6B6B6B",
          600: "#5C5C5C",
          700: "#3D3D3D",
          800: "#1F1F1F",
          900: "#0F0F0F",
        },
        // semantic data colors — citation classes
        owned:      "#10b981",
        earned:     "#3b82f6",
        competitor: "#f43f5e",
        social:     "#8b5cf6",
        // threshold / sentiment
        pos:    "#22c55e",
        neu:    "#f59e0b",
        neg:    "#ef4444",
        absent: "#8A8A8A",
      },
      boxShadow: {
        xs:      "0px 1px 2px 0px rgba(16, 24, 40, 0.05)",
        sm:      "0px 1px 2px 0px rgba(16, 24, 40, 0.05)",
        DEFAULT: "0px 1px 2px 0px rgba(16, 24, 40, 0.05)",
        md:      "0 2px 4px rgba(16, 24, 40, 0.06), 0 8px 24px -8px rgba(16, 24, 40, 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
