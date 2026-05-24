"use client";

/* ─────────────────────────────────────────────────────────────
   SquirrelSpinner — Loading fallback for the 3D hero.

   Shown while the R3F bundle + scene resources are being
   downloaded / hydrated. Pure CSS — no Three.js, no Canvas,
   no heavy paint work. Drop-in replacement for a regular
   spinner that fits the Fuzzynuts brand.
   ───────────────────────────────────────────────────────────── */

export function SquirrelSpinner() {
  return (
    <div
      role="status"
      aria-label="Loading immersive 3D scene"
      className="absolute inset-0 z-[5] flex flex-col items-center justify-center bg-[var(--color-forest-dark)]"
    >
      {/* Soft radial halo behind the squirrel */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(251,191,36,0.10) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 50% 60%, rgba(16,185,129,0.08) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Spinning squirrel mascot (emoji-based — zero asset cost) */}
      <div className="relative flex flex-col items-center gap-5">
        <div
          className="relative w-24 h-24 flex items-center justify-center rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(251,191,36,0.18) 0%, transparent 70%)",
            animation: "squirrel-bob 1.6s ease-in-out infinite",
          }}
        >
          <span
            className="text-6xl select-none"
            style={{
              filter: "drop-shadow(0 0 18px rgba(251,191,36,0.45))",
              animation: "squirrel-spin 2.2s ease-in-out infinite",
              display: "inline-block",
            }}
          >
            🐿️
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[var(--color-gold)] font-display font-bold tracking-wider text-sm uppercase">
            Gathering acorns
          </span>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]"
            style={{ animation: "squirrel-dot 1s ease-in-out infinite" }}
          />
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]"
            style={{ animation: "squirrel-dot 1s ease-in-out 0.15s infinite" }}
          />
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]"
            style={{ animation: "squirrel-dot 1s ease-in-out 0.3s infinite" }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes squirrel-spin {
          0% {
            transform: rotate(-12deg) scale(1);
          }
          50% {
            transform: rotate(12deg) scale(1.08);
          }
          100% {
            transform: rotate(-12deg) scale(1);
          }
        }
        @keyframes squirrel-bob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        @keyframes squirrel-dot {
          0%,
          100% {
            opacity: 0.25;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(-3px);
          }
        }
      `}</style>
    </div>
  );
}
