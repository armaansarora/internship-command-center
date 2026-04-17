import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tower Gold
        gold: {
          DEFAULT: "#C9A84C",
          50: "#FCF8ED",
          100: "#F6EDCF",
          200: "#EDDB9F",
          300: "#E3C86F",
          400: "#D4B55A",
          500: "#C9A84C",
          600: "#A88A3D",
          700: "#876D30",
          800: "#665124",
          900: "#453618",
        },
        // Tower Dark backgrounds
        tower: {
          dark: "#1A1A2E",
          darker: "#12121F",
          darkest: "#0A0A14",
          surface: "#1E1E35",
          "surface-2": "#24243D",
        },
        // Glass
        glass: {
          light: "rgba(255, 255, 255, 0.08)",
          medium: "rgba(255, 255, 255, 0.12)",
          heavy: "rgba(255, 255, 255, 0.18)",
          border: "rgba(255, 255, 255, 0.10)",
        },
      },
      fontFamily: {
        display: ["'Playfair Display'", "Georgia", "serif"],
        body: ["'Satoshi'", "system-ui", "sans-serif"],
        data: ["'JetBrains Mono'", "monospace"],
      },
      backdropBlur: {
        glass: "16px",
      },
      animation: {
        "elevator-doors": "elevatorDoors 400ms ease-in-out",
        "floor-transition": "floorTransition 600ms ease-in-out",
        "gold-pulse": "goldPulse 2s ease-in-out infinite",
        "fade-in": "fadeIn 300ms ease-out",
        "slide-up": "slideUp 500ms ease-out",
      },
      keyframes: {
        elevatorDoors: {
          "0%": { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
        floorTransition: {
          "0%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
          "100%": { transform: "translateY(0)" },
        },
        goldPulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      boxShadow: {
        gold: "0 0 20px rgba(201, 168, 76, 0.15)",
        "gold-lg": "0 0 40px rgba(201, 168, 76, 0.25)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.37)",
      },
    },
  },
  plugins: [typography],
};

export default config;
