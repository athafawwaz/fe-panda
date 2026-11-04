import type { Config } from "tailwindcss";

const pusriBlue = {
  50: "#eef3f9",
  100: "#dbe6f2",
  200: "#b9cce0",
  300: "#8eabcb",
  400: "#5e86b5",
  500: "#3a6ea9",
  600: "#225d9f",
  700: "#1b4f88",
  800: "#18436f",
  900: "#153860",
  950: "#0d2440",
};

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
        sans: ["var(--font-corporate)", "Segoe UI", "system-ui", "sans-serif"],
      },
      // Legacy screens use Tailwind blue/indigo/sky; remap them to the Pusri web blue (600 = --action, 900 = --ink)
      // so every page shares one brand palette without touching hundreds of class names.
      colors: {
        blue: pusriBlue,
        indigo: pusriBlue,
        sky: pusriBlue,
        // slate-400 is used for small secondary text; the stock #94a3b8 fails WCAG AA (2.5:1). #64748b = 4.8:1 on white.
        slate: { 400: "#64748b" },
      },
    },
  },
  plugins: [],
};

export default config;
