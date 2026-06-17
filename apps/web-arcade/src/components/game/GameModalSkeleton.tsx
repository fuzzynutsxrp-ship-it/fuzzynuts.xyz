"use client";

/**
 * GameModalSkeleton — lightweight loading placeholder shown while the
 * GameModal chunk is being downloaded via next/dynamic.
 *
 * This is NOT the iframe loading spinner (that lives inside GameModal itself).
 * This skeleton renders during the JS chunk fetch phase to give the user
 * immediate visual feedback instead of a blank screen.
 *
 * Zero heavy dependencies — pure CSS animations, no framer-motion.
 */

export function GameModalSkeleton() {
  return (
    <dialog open className="game-modal" aria-label="Loading game" aria-busy="true">
      {/* Header skeleton */}
      <div className="game-modal__header">
        <div className="game-modal__header-left">
          <div
            className="h-5 w-20 rounded-full animate-pulse"
            style={{ background: "var(--color-cream-dim, rgba(255,255,255,0.1))" }}
          />
          <div
            className="h-6 w-40 rounded animate-pulse"
            style={{ background: "var(--color-cream-dim, rgba(255,255,255,0.1))" }}
          />
        </div>
        <div className="game-modal__header-right">
          {["w-8", "w-8", "w-8", "w-8"].map((w, i) => (
            <div
              key={i}
              className={`${w} h-8 rounded animate-pulse`}
              style={{ background: "var(--color-cream-dim, rgba(255,255,255,0.08))" }}
            />
          ))}
        </div>
      </div>

      {/* Body skeleton */}
      <div className="game-modal__body">
        <div className="game-modal__viewport game-modal__loading">
          {/* Bouncing nut */}
          <div
            className="text-5xl sm:text-6xl mb-4 select-none"
            style={{ animation: "skeleton-bounce 1.2s ease-in-out infinite" }}
            aria-hidden="true"
          >
            🌰
          </div>
          <div
            className="h-7 w-48 rounded animate-pulse mb-3"
            style={{ background: "var(--color-cream-dim, rgba(255,255,255,0.1))" }}
          />
          <div className="flex items-center gap-2 text-sm text-[var(--color-cream-dim)]">
            <svg
              className="animate-spin"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span>Loading game…</span>
          </div>
        </div>

        {/* Sidebar skeleton */}
        <aside className="game-modal__sidebar" aria-hidden="true">
          <div className="game-modal__sidebar-header">
            <div
              className="h-4 w-4 rounded animate-pulse"
              style={{ background: "var(--color-cream-dim, rgba(255,255,255,0.1))" }}
            />
            <div
              className="h-4 w-20 rounded animate-pulse"
              style={{ background: "var(--color-cream-dim, rgba(255,255,255,0.1))" }}
            />
          </div>
          <div className="game-modal__sidebar-list">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="play-next-card" style={{ opacity: 1 - i * 0.15 }}>
                <div className="play-next-card__thumb">
                  <div
                    className="w-full h-full rounded animate-pulse"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  />
                </div>
                <div className="play-next-card__info flex flex-col gap-1.5">
                  <div
                    className="h-3 w-24 rounded animate-pulse"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  />
                  <div
                    className="h-2.5 w-16 rounded animate-pulse"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </dialog>
  );
}
