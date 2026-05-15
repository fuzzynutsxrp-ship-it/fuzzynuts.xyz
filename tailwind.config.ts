import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        forest: {
          dark: "#010508",
          900: "#0a0f0a",
          800: "#112211",
          700: "#1a3318",
          600: "#224422",
          500: "#2d5a2d",
        },
        "brand-gold": {
          DEFAULT: "#FBBF24",
          dark: "#daa520",
          light: "#ffe066",
        },
        "neon-green": {
          DEFAULT: "#10B981",
          dim: "rgba(16, 185, 129, 0.12)",
        },
        "neon-blue": {
          DEFAULT: "#3B82F6",
          dim: "rgba(59, 130, 246, 0.12)",
        },
        "glass-bg": "rgba(1, 5, 8, 0.85)",
        gold: {
          DEFAULT: "#f5c442",
          dark: "#daa520",
          light: "#ffe066",
        },
        orange: "#e8943a",
        brown: "#8b6914",
        cream: {
          DEFAULT: "#f0ede6",
          dim: "#b0a890",
        },
      },
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
        "pulse-neon": "pulse-neon 3s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "vine-glow": "vine-glow 2.5s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(251, 191, 36, 0.2)" },
          "50%": { boxShadow: "0 0 40px rgba(251, 191, 36, 0.5)" },
        },
        "pulse-neon": {
          "0%, 100%": { boxShadow: "0 0 15px rgba(16, 185, 129, 0.15)" },
          "50%": { boxShadow: "0 0 30px rgba(16, 185, 129, 0.4)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "vine-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
