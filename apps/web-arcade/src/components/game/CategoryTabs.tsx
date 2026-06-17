"use client";

import { useRef, useEffect } from "react";

export interface CategoryTab {
  label: string;
  value: string;
}

const CATEGORIES: CategoryTab[] = [
  { label: "All", value: "all" },
  { label: "Multiplayer", value: "multiplayer" },
  { label: "Arcade", value: "arcade" },
  { label: "Racing", value: "racing" },
  { label: "Chill", value: "chill" },
  { label: "Classic", value: "classic" },
];

interface CategoryTabsProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryTabs({ activeCategory, onCategoryChange }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view on mount / change
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const btn = activeRef.current;
      const left = btn.offsetLeft - container.offsetLeft - 16;
      container.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    }
  }, [activeCategory]);

  return (
    <div className="sticky top-[52px] md:top-[60px] z-40 bg-[#0a0613]/95 backdrop-blur-md border-b border-white/5">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-none px-4 md:px-5 py-2.5"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        role="tablist"
        aria-label="Game categories"
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.value;
          return (
            <button
              key={cat.value}
              ref={isActive ? activeRef : undefined}
              role="tab"
              aria-selected={isActive}
              onClick={() => onCategoryChange(cat.value)}
              className={`
                shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer
                ${
                  isActive
                    ? "bg-brand-gold text-[#0a0613] font-bold shadow-[0_0_12px_rgba(251,191,36,0.25)]"
                    : "bg-white/5 text-[var(--color-cream-dim)] hover:text-cream hover:bg-white/10 border border-white/5"
                }
              `}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
