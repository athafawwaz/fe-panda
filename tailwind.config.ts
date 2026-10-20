import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      animation: {
        "float-slow": "floatSlow 5s ease-in-out infinite",
        "orb-morph": "orbMorph 8s ease-in-out infinite",
        "orb-spin": "orbSpin 10s linear infinite",
        "orb-spin-fast": "orbSpin 3s linear infinite",
        "pulse-ring": "pulseRing 2.4s cubic-bezier(0.24, 0, 0.38, 1) infinite",
      },
      keyframes: {
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        orbMorph: {
          "0%, 100%": { borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" },
          "33%": { borderRadius: "40% 60% 70% 30% / 40% 60% 30% 60%" },
          "66%": { borderRadius: "55% 45% 40% 60% / 35% 65% 55% 45%" },
        },
        orbSpin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        pulseRing: {
          "0%": { transform: "scale(0.95)", opacity: "0.7" },
          "70%": { transform: "scale(1.45)", opacity: "0" },
          "100%": { transform: "scale(1.55)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
