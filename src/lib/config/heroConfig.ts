export const HERO_CONFIG = {
  video: {
    src: "/videos/hero-background.mp4",
    fallback: "/images/hero-fallback.webp",
    loop: true,
    autoplay: true,
    muted: true,
  },
  particles: {
    count: 300,
    mobileCount: 100,
    colors: ["#FBBF24", "#06b6d4", "#a855f7"] as const,
    size: { min: 0.02, max: 0.08 },
    speed: { min: 0.2, max: 0.5 },
    parallaxStrength: 0.3,
  },
} as const;

export type HeroConfig = typeof HERO_CONFIG;
