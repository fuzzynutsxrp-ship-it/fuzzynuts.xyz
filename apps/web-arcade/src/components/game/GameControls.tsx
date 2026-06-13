"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Maximize, Minimize, ArrowLeft } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   GameControls — Shared header for React-based game pages

   Provides:
   1. "Back to Arcade" button → links to /
   2. Fullscreen toggle → targets the provided containerRef
      (falls back to document.body)

   Mirrors the vanilla arcade-shell.js nav for standalone HTML games.
   ═══════════════════════════════════════════════════════════════ */

interface GameControlsProps {
  /** Game title displayed in the header */
  title: string;
  /** Game icon (emoji) displayed next to the title */
  icon?: string;
  /** Ref to the element that should go fullscreen (canvas / game container) */
  containerRef?: React.RefObject<HTMLElement | null>;
  /** Optional accent color override */
  accentColor?: string;
  /** Additional class name */
  className?: string;
}

export function GameControls({
  title,
  icon = "🐿️",
  containerRef,
  accentColor,
  className,
}: GameControlsProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fallbackRef = useRef<HTMLElement>(null);

  // Track fullscreen state
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef?.current || fallbackRef.current;
    if (!el) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- webkit prefix needed for Safari
      const doc = document as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- webkit prefix needed for Safari
      const target = el as any;
      if (!document.fullscreenElement) {
        const req = target.requestFullscreen || target.webkitRequestFullscreen;
        if (req) await req.call(target);
      } else {
        const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
        if (exit) await exit.call(doc);
      }
    } catch (err) {
      console.warn("[GameControls] Fullscreen not supported:", err);
    }
  }, [containerRef]);

  // Keyboard shortcut: F key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        e.preventDefault();
        toggleFullscreen();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggleFullscreen]);

  return (
    <nav
      className={className}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "var(--arcade-nav-height, 44px)",
        padding: "0 0.75rem",
        background: "var(--arcade-bg, rgba(10, 10, 15, 0.92))",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--arcade-border, rgba(245, 166, 35, 0.15))",
        fontFamily: "var(--arcade-font, 'Outfit', system-ui, sans-serif)",
        ...(accentColor
          ? ({ "--arcade-accent": accentColor } as React.CSSProperties)
          : {}),
      }}
    >
      {/* Left cluster */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: "0.3rem 0.7rem",
            background: "linear-gradient(135deg, rgba(245,166,35,0.15), rgba(245,166,35,0.05))",
            border: "1px solid rgba(245,166,35,0.25)",
            borderRadius: "6px",
            color: "var(--arcade-accent, #d4a843)",
            textDecoration: "none",
            fontSize: "0.75rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          <ArrowLeft size={14} />
          Arcade
        </Link>
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "rgba(245, 166, 35, 0.4)",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            color: "var(--arcade-text-secondary, rgba(255,255,255,0.7))",
            fontSize: "0.78rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {icon} {title}
        </span>
      </div>

      {/* Right cluster */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
        <button
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Toggle fullscreen"}
          title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            padding: 0,
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "6px",
            color: "var(--arcade-text-secondary, rgba(255,255,255,0.7))",
            cursor: "pointer",
          }}
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
      </div>
    </nav>
  );
}
