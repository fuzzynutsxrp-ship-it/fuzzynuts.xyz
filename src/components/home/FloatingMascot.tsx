"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * FloatingMascot — Looping FuzzyBear slide-up animation
 *
 * Lifecycle per loop iteration:
 *   1. Slide up from below viewport (1.4s ease-out)
 *   2. Idle visible for 7s with gentle float
 *   3. Slide back down (1.6s ease-in)
 *   4. Wait 120s (hidden)
 *   5. Repeat from step 1
 *
 * Dismissible via close button (persists for session via state).
 * Respects prefers-reduced-motion.
 * ═══════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";

/* ── Timing constants (ms) ── */

const SLIDE_UP_DURATION = 1.4;
const IDLE_DURATION_MS = 7_000;
const SLIDE_DOWN_DURATION = 1.6;
const LOOP_DELAY_MS = 120_000;

/* ── Animation phases ── */

type Phase = "hidden" | "entering" | "visible" | "exiting";

export function FloatingMascot() {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const prefersReduced = useReducedMotion();

  /* ── Cleanup helper ── */
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /* ── Phase machine ── */
  const advancePhase = useCallback(
    (nextPhase: Phase, delayMs?: number) => {
      clearTimer();
      if (delayMs) {
        timerRef.current = setTimeout(() => {
          if (mountedRef.current && !dismissed) setPhase(nextPhase);
        }, delayMs);
      } else {
        if (mountedRef.current && !dismissed) setPhase(nextPhase);
      }
    },
    [clearTimer, dismissed],
  );

  /* ── Start the first loop after a short initial delay ── */
  useEffect(() => {
    mountedRef.current = true;

    if (dismissed) return;

    // Start first appearance after 3s page load
    timerRef.current = setTimeout(() => {
      if (mountedRef.current) setPhase("entering");
    }, 3_000);

    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, [dismissed, clearTimer]);

  /* ── Phase transitions ── */
  useEffect(() => {
    if (dismissed) return;

    switch (phase) {
      case "entering":
        // After slide-up completes → visible
        advancePhase("visible", SLIDE_UP_DURATION * 1000);
        break;
      case "visible":
        // After idle period → exiting
        advancePhase("exiting", IDLE_DURATION_MS);
        break;
      case "exiting":
        // After slide-down completes → hidden
        advancePhase("hidden", SLIDE_DOWN_DURATION * 1000);
        break;
      case "hidden":
        // After loop delay → entering again
        advancePhase("entering", LOOP_DELAY_MS);
        break;
    }
  }, [phase, dismissed, advancePhase]);

  /* ── Dismiss handler ── */
  const handleDismiss = useCallback(() => {
    clearTimer();
    setDismissed(true);
    setPhase("hidden");
  }, [clearTimer]);

  /* ── Don't render if dismissed ── */
  if (dismissed) return null;

  /* ── Determine if mascot should be visible in DOM ── */
  const isPresent =
    phase === "entering" || phase === "visible" || phase === "exiting";

  /* ── Reduced motion: show static image briefly, no animation ── */
  if (prefersReduced) {
    return (
      <AnimatePresence>
        {isPresent && (
          <div
            className="floating-mascot"
            role="presentation"
            aria-hidden="true"
          >
            <button
              onClick={handleDismiss}
              className="floating-mascot__close"
              aria-label="Dismiss mascot"
              type="button"
            >
              ×
            </button>
            <Image
              src="/images/branding/FuzzyBear.png"
              alt=""
              width={150}
              height={200}
              className="floating-mascot__img"
              priority={false}
              draggable={false}
            />
          </div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isPresent && (
        <motion.div
          className="floating-mascot"
          role="presentation"
          aria-hidden="true"
          initial={{ y: "100%", opacity: 0 }}
          animate={
            phase === "exiting"
              ? { y: "100%", opacity: 0 }
              : { y: "0%", opacity: 1 }
          }
          exit={{ y: "100%", opacity: 0 }}
          transition={{
            y: {
              duration:
                phase === "exiting" ? SLIDE_DOWN_DURATION : SLIDE_UP_DURATION,
              ease:
                phase === "exiting"
                  ? [0.4, 0, 1, 1] /* ease-in for exit */
                  : [0, 0, 0.2, 1] /* ease-out for entry */,
            },
            opacity: {
              duration: phase === "exiting" ? SLIDE_DOWN_DURATION * 0.6 : 0.4,
              delay: phase === "exiting" ? SLIDE_DOWN_DURATION * 0.4 : 0,
            },
          }}
        >
          {/* Close button */}
          <motion.button
            onClick={handleDismiss}
            className="floating-mascot__close"
            aria-label="Dismiss mascot"
            type="button"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
          >
            ×
          </motion.button>

          {/* Mascot image with gentle idle float */}
          <motion.div
            className="floating-mascot__img-wrapper"
            animate={
              phase === "visible"
                ? {
                    y: [0, -6, 0],
                    rotate: [0, 1.5, 0, -1.5, 0],
                  }
                : {}
            }
            transition={
              phase === "visible"
                ? {
                    y: {
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                    rotate: {
                      duration: 5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }
                : {}
            }
          >
            <Image
              src="/images/branding/FuzzyBear.png"
              alt=""
              width={150}
              height={200}
              className="floating-mascot__img"
              priority={false}
              draggable={false}
            />
          </motion.div>

          {/* Subtle ground shadow */}
          <motion.div
            className="floating-mascot__shadow"
            animate={
              phase === "visible"
                ? { scaleX: [1, 0.85, 1], opacity: [0.3, 0.2, 0.3] }
                : { scaleX: 1, opacity: 0.3 }
            }
            transition={
              phase === "visible"
                ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
                : {}
            }
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default FloatingMascot;
