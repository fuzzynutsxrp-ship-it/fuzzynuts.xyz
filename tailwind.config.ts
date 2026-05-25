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
        silver: {
          DEFAULT: "#C0C0C0",
          dim: "rgba(192, 192, 192, 0.12)",
        },
        bronze: {
          DEFAULT: "#CD7F32",
          dim: "rgba(205, 127, 50, 0.12)",
        },
        "glass-bg": "rgba(1, 5, 8, 0.85)",
        glass: {
          DEFAULT: "var(--color-glass-border)",
          strong: "var(--color-glass-border-strong)",
          faint: "var(--color-glass-border-faint)",
          hover: "var(--color-glass-hover)",
        },
        gold: {
          DEFAULT: "#FBBF24",
          dark: "#daa520",
          light: "#ffe066",
        },
        orange: "#e8943a",
        brown: "#8b6914",
        cream: {
          DEFAULT: "#f0ede6",
          dim: "#b0a890",
        },
        overlay: "rgba(0, 0, 0, 0.7)",
      },
      borderColor: {
        glass: "var(--color-glass-border)",
        "glass-strong": "var(--color-glass-border-strong)",
        "glass-faint": "var(--color-glass-border-faint)",
        "glass-neon": "var(--color-glass-border-neon)",
        "gold-dim": "var(--color-gold-dim-border)",
      },
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      zIndex: {
        "0": "0",
        "10": "10",
        "20": "20",
        "30": "30",
        "40": "40",
        "50": "50",
      },
      boxShadow: {
        cabinet:
          "0 12px 32px -8px rgba(0,0,0,0.85), 0 24px 64px -16px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -3px 6px rgba(0,0,0,0.5)",
        "cabinet-hover":
          "0 24px 56px -12px rgba(0,0,0,0.9), 0 40px 96px -24px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -3px 6px rgba(0,0,0,0.5)",
        "play-arcade":
          "0 4px 12px rgba(0,0,0,0.5), 0 0 24px rgba(251,191,36,0.25), inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -3px 0 rgba(120,53,15,0.5)",
        "play-arcade-hover":
          "0 6px 24px rgba(0,0,0,0.6), 0 0 48px rgba(251,191,36,0.55), inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -3px 0 rgba(120,53,15,0.4)",
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
        "pulse-neon": "pulse-neon 3s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "vine-glow": "vine-glow 2.5s ease-in-out infinite",
        "fade-in": "fade-in 600ms ease-out forwards",
        // Hero gradient mesh — slow continuous drift of the
        // background-position so the gradient feels alive without
        // any JS animation work.
        "hero-mesh": "hero-mesh 22s ease-in-out infinite",
        "cabinet-shine": "cabinet-shine 1.6s ease-out",
        "neon-flicker": "neon-flicker 2.5s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "hero-mesh": {
          "0%, 100%": { backgroundPosition: "0% 0%, 100% 100%, 50% 50%" },
          "50%": { backgroundPosition: "100% 30%, 0% 70%, 70% 30%" },
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
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "cabinet-shine": {
          "0%": { transform: "translateX(-160%) skewX(-20deg)" },
          "100%": { transform: "translateX(260%) skewX(-20deg)" },
        },
        "neon-flicker": {
          "0%, 100%": { opacity: "0.85" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [
    function ({
      addUtilities,
    }: {
      addUtilities: (u: Record<string, Record<string, string>>) => void;
    }) {
      addUtilities({
        ".bg-video-cover": {
          "object-fit": "cover",
          "object-position": "center center",
          width: "100%",
          height: "100%",
        },
        /* Hero gradient mesh — CSS-only animated multi-radial. Three
           soft color spots (gold, cyan, magenta) drift via the
           `hero-mesh` keyframes above. Sits BEHIND the photo at
           subtle opacity so it adds drifting hue without dominating. */
        ".bg-hero-gradient": {
          background: [
            "radial-gradient(ellipse 50% 35% at 0% 0%, rgba(251,191,36,0.18) 0%, transparent 60%)",
            "radial-gradient(ellipse 60% 45% at 100% 100%, rgba(34,211,238,0.18) 0%, transparent 60%)",
            "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(217,70,239,0.10) 0%, transparent 65%)",
            "linear-gradient(to bottom, #03110a 0%, #010508 100%)",
          ].join(", "),
          "background-size": "180% 180%, 180% 180%, 200% 200%, 100% 100%",
          animation: "hero-mesh 22s ease-in-out infinite",
        },
        /* Gold text with a layered glow shadow — combines the
           existing `gradient-text-gold` look with a Bloom-like halo. */
        ".text-hero-glow": {
          "text-shadow": [
            "0 0 12px rgba(251,191,36,0.55)",
            "0 0 28px rgba(245,196,66,0.35)",
            "0 1px 2px rgba(0,0,0,0.85)",
          ].join(", "),
        },
      });
    },
  ],
};

export default config;
