"use client";

import { useProgress } from "@react-three/drei";

/* ─────────────────────────────────────────────────────────────
   LoadingScreen — Real progress UI for GLB asset downloads.

   `useProgress` subscribes to Three.js's default LoadingManager
   (which `useGLTF` uses internally), so this DOES NOT need to be
   inside a Canvas. Mount it as a sibling overlay and it'll show
   the % of assets currently downloading.

   `active` is true while any tracked asset is loading; we fade
   the overlay out otherwise so it never blocks interaction.
   The visual is the same squirrel-bob the user already sees on
   first paint, plus a numeric % and the current asset name.
   ───────────────────────────────────────────────────────────── */

export function LoadingScreen() {
  const { active, progress, item } = useProgress();

  // Hide once loading finishes; CSS transition handles the fade.
  if (!active && progress >= 100) return null;

  // Strip the leading "/" + extension for a cleaner display name.
  const cleanItem = item
    ? item.replace(/^.*\//, "").replace(/\.[^.]+$/, "")
    : "scene";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading 3D scene: ${progress.toFixed(0)}%`}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[var(--color-forest-dark)]"
      style={{
        opacity: active ? 1 : 0,
        transition: "opacity 400ms ease",
        pointerEvents: active ? "auto" : "none",
      }}
    >
      {/* Soft radial halo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(251,191,36,0.10) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 50% 60%, rgba(16,185,129,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-6">
        {/* Squirrel bob */}
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

        {/* Progress bar — gold gradient fill */}
        <div className="w-64 sm:w-80 flex flex-col items-center gap-2">
          <div className="w-full h-1.5 rounded-full bg-[rgba(251,191,36,0.15)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-gold)] to-yellow-300"
              style={{
                width: `${Math.max(2, progress)}%`,
                transition: "width 220ms ease",
                boxShadow: "0 0 14px rgba(251,191,36,0.55)",
              }}
            />
          </div>

          <div className="flex items-center justify-between w-full text-[10px] sm:text-xs uppercase tracking-[0.18em]">
            <span className="text-[var(--color-gold)] font-bold">
              Gathering acorns
            </span>
            <span className="text-[var(--color-cream)] font-mono">
              {progress.toFixed(0)}%
            </span>
          </div>

          {/* Currently-downloading asset (truncated) */}
          <p className="text-[10px] sm:text-xs text-[var(--color-cream-dim)] max-w-full truncate">
            {cleanItem}
          </p>
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
      `}</style>
    </div>
  );
}

export default LoadingScreen;
