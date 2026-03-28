import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["'Nunito'", "ui-rounded", "system-ui", "sans-serif"],
      },
      colors: {
        border: "rgba(0,0,0,0.05)",
        input: "rgba(0,0,0,0.05)",
        ring: "#FF6B8A",
        background: "#FFFFFF",
        foreground: "#1C1C1E",
        apple: {
          pink: "#FF6B8A",
          gray: "#8E8E93",
          bg: "#F5F5F7",
        },
        primary: {
          DEFAULT: "#FF6B8A",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F5F5F7",
          foreground: "#1C1C1E",
        },
        destructive: {
          DEFAULT: "#FF3B30",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F5F5F7",
          foreground: "#8E8E93",
        },
        accent: {
          DEFAULT: "#FF6B8A",
          foreground: "#FFFFFF",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#1C1C1E",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1C1C1E",
        },
        success: "#34C759",
        warning: "#FFCC00",
        error: "#FF3B30",
      },
      borderRadius: {
        apple: "16px",
        lg: "16px",
        md: "12px",
        sm: "8px",
      },
      boxShadow: {
        apple: "0 8px 32px rgba(0, 0, 0, 0.05)",
        'apple-soft': "0 4px 16px rgba(0, 0, 0, 0.03)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(8px)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "tab-tap": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.92)" },
          "100%": { transform: "scale(1)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 8px 0 hsla(335,42%,32%,0.2)" },
          "50%": { boxShadow: "0 0 16px 4px hsla(335,42%,32%,0.35)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.35s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "scale-in": "scale-in 0.25s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "tab-tap": "tab-tap 0.2s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
