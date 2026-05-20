"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════
   useTouchControls — Reusable touch gesture detection hook

   Returns:
   • isTouchDevice: whether the device supports touch
   • lastGesture: the most recent detected gesture
   • resetGesture: clear the current gesture state

   Detects swipe direction with 50px threshold,
   debounced to 200ms to prevent duplicate triggers.
   Works with pointer events for unified mouse + touch.
   ═══════════════════════════════════════════════════════════════ */

export type GestureType = "swipe-left" | "swipe-right" | "swipe-up" | "swipe-down" | "tap" | null;

interface TouchControlsState {
  isTouchDevice: boolean;
  lastGesture: GestureType;
  resetGesture: () => void;
}

const SWIPE_THRESHOLD = 50; // px
const DEBOUNCE_MS = 200;

export function useTouchControls(
  targetRef?: React.RefObject<HTMLElement | null>,
): TouchControlsState {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [lastGesture, setLastGesture] = useState<GestureType>(null);

  const startPos = useRef<{ x: number; y: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect touch device
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  const resetGesture = useCallback(() => {
    setLastGesture(null);
  }, []);

  // Gesture detection
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = targetRef?.current ?? document;

    const handlePointerDown = (e: Event) => {
      const pe = e as PointerEvent;
      startPos.current = { x: pe.clientX, y: pe.clientY };
    };

    const handlePointerUp = (e: Event) => {
      if (!startPos.current) return;
      const pe = e as PointerEvent;
      const dx = pe.clientX - startPos.current.x;
      const dy = pe.clientY - startPos.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Prevent duplicate triggers
      if (debounceRef.current) return;

      let gesture: GestureType = null;

      if (absDx < 10 && absDy < 10) {
        gesture = "tap";
      } else if (absDx > absDy && absDx >= SWIPE_THRESHOLD) {
        gesture = dx > 0 ? "swipe-right" : "swipe-left";
      } else if (absDy > absDx && absDy >= SWIPE_THRESHOLD) {
        gesture = dy > 0 ? "swipe-down" : "swipe-up";
      }

      if (gesture) {
        setLastGesture(gesture);
        debounceRef.current = setTimeout(() => {
          debounceRef.current = null;
        }, DEBOUNCE_MS);
      }

      startPos.current = null;
    };

    const handlePointerCancel = () => {
      startPos.current = null;
    };

    el.addEventListener("pointerdown", handlePointerDown, { passive: true });
    el.addEventListener("pointerup", handlePointerUp, { passive: true });
    el.addEventListener("pointercancel", handlePointerCancel, { passive: true });

    return () => {
      el.removeEventListener("pointerdown", handlePointerDown);
      el.removeEventListener("pointerup", handlePointerUp);
      el.removeEventListener("pointercancel", handlePointerCancel);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [targetRef]);

  return { isTouchDevice, lastGesture, resetGesture };
}
