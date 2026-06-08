"use client";

import { useRef, useState, useEffect } from "react";

const CATEGORIES = [
  "All Games",
  "MMORPG",
  "Platformer",
  "Roguelite",
  "Mini Golf",
  "Racing",
];

interface CategoryFiltersProps {
  active: string;
  onChange: (category: string) => void;
}

export function CategoryFilters({ active, onChange }: CategoryFiltersProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  // Check scroll position for fade indicators
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const checkScroll = () => {
      setShowLeftFade(el.scrollLeft > 10);
      setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    };

    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  return (
    <div className="relative">
      {/* Left fade */}
      {showLeftFade && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0a0613] to-transparent z-10 pointer-events-none" />
      )}
      {/* Right fade */}
      {showRightFade && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0a0613] to-transparent z-10 pointer-events-none" />
      )}

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-none py-1 px-1"
        role="tablist"
        aria-label="Filter games by category"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = active === cat;
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(cat)}
              className={`
                shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${
                  isActive
                    ? "bg-brand-gold/15 text-brand-gold border border-brand-gold/30 font-bold"
                    : "text-[var(--color-cream-dim)] hover:text-cream hover:bg-white/5 border border-transparent"
                }
              `}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}
