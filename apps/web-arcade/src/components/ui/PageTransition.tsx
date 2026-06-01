"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * PageTransition — Framer Motion page transition wrapper
 *
 * Scroll preservation + iframe awareness for game pages.
 * Skips animation if:
 *   - disabled prop is true
 *   - SSR (typeof window === 'undefined')
 *   - An iframe is actively loading (prevents flicker)
 *
 * Custom ease: [0.22, 1, 0.36, 1] for "snappy but smooth"
 * ═══════════════════════════════════════════════════════════════
 */

import { ReactNode, useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import { usePathname, useSearchParams } from "next/navigation";

interface PageTransitionProps {
  children: ReactNode;
  disabled?: boolean;
  preserveScroll?: boolean;
  iframeAware?: boolean;
}

export function PageTransition({
  children,
  disabled = false,
  preserveScroll = true,
  iframeAware = true,
}: PageTransitionProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const controls = useAnimation();
  const scrollRef = useRef<number>(0);

  // Preserve scroll position on nav
  useEffect(() => {
    if (!preserveScroll) return;

    if (pathname) {
      scrollRef.current = window.scrollY;
    }

    return () => {
      if (preserveScroll && scrollRef.current) {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollRef.current);
        });
      }
    };
  }, [pathname, searchParams, preserveScroll]);

  // Skip animation if iframe is loading (prevents flicker)
  useEffect(() => {
    if (!iframeAware) return;

    const checkIframe = () => {
      const iframe = document.querySelector(
        "iframe[data-game-wrapper]",
      ) as HTMLIFrameElement | null;
      if (iframe) {
        // Disable transition if iframe is still loading
        try {
          if (iframe.contentDocument?.readyState !== "complete") {
            controls.start({ opacity: 1, y: 0, transition: { duration: 0 } });
          }
        } catch {
          // Cross-origin iframe — skip check silently
        }
      }
    };

    checkIframe();
    const observer = new MutationObserver(checkIframe);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [iframeAware, controls]);

  // Animation variants
  const variants = {
    initial: { opacity: 0, y: 16 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.28,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
    exit: {
      opacity: 0,
      y: -8,
      transition: { duration: 0.2 },
    },
  };

  // Disabled or SSR: render without motion
  if (disabled || typeof window === "undefined") {
    return <>{children}</>;
  }

  return (
    <motion.div
      key={`${pathname}?${searchParams?.toString()}`}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="outline-none"
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}
