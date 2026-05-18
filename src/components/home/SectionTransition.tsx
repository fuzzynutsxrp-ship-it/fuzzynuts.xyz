"use client";

/* ─────────────────────────────────────────────────────────────
   SectionTransition — Visual connectors between major sections
   
   Three variants:
   - "vine"   : Neon vine gradient fade (default)
   - "glow"   : Soft radial glow bridge
   - "fade"   : Simple gradient fade-through
   ───────────────────────────────────────────────────────────── */

type TransitionVariant = "vine" | "glow" | "fade";

interface SectionTransitionProps {
  variant?: TransitionVariant;
  /** Flip the direction of the gradient */
  flip?: boolean;
}

export function SectionTransition({ variant = "vine", flip = false }: SectionTransitionProps) {
  if (variant === "vine") {
    return (
      <div
        className="relative h-16 md:h-24 overflow-hidden pointer-events-none"
        role="separator"
        aria-hidden="true"
      >
        {/* Central neon vine line */}
        <div
          className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[1px]"
          style={{
            background: flip
              ? "linear-gradient(to top, rgba(251,191,36,0.3), rgba(16,185,129,0.2), transparent)"
              : "linear-gradient(to bottom, rgba(251,191,36,0.3), rgba(16,185,129,0.2), transparent)",
          }}
        />
        {/* Ambient horizontal vine */}
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[1px]"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.15) 25%, rgba(251,191,36,0.2) 50%, rgba(16,185,129,0.15) 75%, transparent)",
          }}
        />
        {/* Center dot */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
          style={{
            background: "var(--color-gold)",
            boxShadow: "0 0 12px rgba(251,191,36,0.4), 0 0 30px rgba(251,191,36,0.15)",
          }}
        />
      </div>
    );
  }

  if (variant === "glow") {
    return (
      <div
        className="relative h-20 md:h-32 overflow-hidden pointer-events-none"
        role="separator"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 60% 100% at 50% 50%, rgba(251,191,36,0.04) 0%, transparent 70%)",
          }}
        />
        {/* Horizontal vine */}
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[1px] opacity-30"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(251,191,36,0.4) 30%, rgba(16,185,129,0.4) 50%, rgba(251,191,36,0.4) 70%, transparent)",
          }}
        />
      </div>
    );
  }

  // "fade" variant
  return (
    <div
      className="relative h-12 md:h-20 overflow-hidden pointer-events-none"
      role="separator"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background: flip
            ? "linear-gradient(to top, rgba(1,5,8,0) 0%, rgba(1,5,8,0.5) 50%, rgba(1,5,8,0) 100%)"
            : "linear-gradient(to bottom, rgba(1,5,8,0) 0%, rgba(1,5,8,0.5) 50%, rgba(1,5,8,0) 100%)",
        }}
      />
    </div>
  );
}
