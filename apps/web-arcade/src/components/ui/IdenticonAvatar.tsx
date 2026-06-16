"use client";

import { useMemo } from "react";
import { toSvg } from "jdenticon";
import DOMPurify from "dompurify";

/**
 * IdenticonAvatar — deterministic SVG identicon from any string value.
 *
 * Uses jdenticon to generate a unique geometric pattern from a wallet
 * address or guest ID. Renders as inline SVG inside a rounded container
 * with the degen theme border/glow treatment.
 */

interface IdenticonAvatarProps {
  /** Wallet address (r...) or guest ID (Guest-XXXX) */
  value: string;
  /** Size in pixels (default: 80) */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

export function IdenticonAvatar({ value, size = 80, className = "" }: IdenticonAvatarProps) {
  const svgMarkup = useMemo(() => {
    if (!value) return "";
    try {
      const raw = toSvg(value, size, {
        backColor: "#0a0613",
        padding: 0.1,
        saturation: {
          color: 0.6,
        },
        lightness: {
          color: [0.35, 0.65],
          grayscale: [0.3, 0.6],
        },
      });
      return DOMPurify.sanitize(raw, { USE_PROFILES: { svg: true } });
    } catch {
      return "";
    }
  }, [value, size]);

  if (!svgMarkup) {
    return (
      <div
        className={`rounded-2xl bg-degen-950 border-2 border-brand-gold/40 flex items-center justify-center ${className}`}
        style={{
          width: size,
          height: size,
          boxShadow:
            "0 0 24px rgba(251,191,36,0.2), 0 0 48px rgba(251,191,36,0.1), inset 0 1px 0 rgba(251,191,36,0.2)",
        }}
      >
        <span className="text-brand-gold text-lg">🥜</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl overflow-hidden border-2 border-brand-gold/40 shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow:
          "0 0 24px rgba(251,191,36,0.2), 0 0 48px rgba(251,191,36,0.1), inset 0 1px 0 rgba(251,191,36,0.2)",
      }}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}
