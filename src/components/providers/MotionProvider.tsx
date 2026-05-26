"use client";

/* ═══════════════════════════════════════════════════════════════
   MotionProvider — global Framer Motion accessibility boundary

   Wraps the whole app in <MotionConfig reducedMotion="user">. With
   this set, every `motion.*` component automatically disables
   transform/layout animations (and preserves safe ones like opacity)
   when the user has "reduce motion" enabled at the OS level — without
   each component needing its own useReducedMotion guard.

   A CSS @media (prefers-reduced-motion) rule only stops CSS-driven
   animations; it does NOT stop JS-driven Framer Motion loops such as
   the hero logo float or the looping CTA arrows. This is what closes
   that gap. Mount once, high in the tree (see app/layout.tsx).
   ═══════════════════════════════════════════════════════════════ */

import { MotionConfig } from "framer-motion";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
