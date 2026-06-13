"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Search, ArrowLeft } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

/**
 * Poki-style full-height left-side search panel.
 * Slides in from the left, dims the main content.
 * Contains: search input, category quick-links, popular games.
 */
export function SearchPanel({ open, onClose, searchQuery, onSearchChange }: SearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — dims right side */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/50"
            onClick={onClose}
          />

          {/* Panel — slides in from left */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 left-0 bottom-0 z-[70] w-full max-w-[480px] bg-[#0a0613] flex flex-col"
          >
            {/* Top bar: back arrow + search input */}
            <div className="flex items-center gap-3 px-4 pt-[env(safe-area-inset-top)] h-14 md:h-16 shrink-0">
              <button
                onClick={onClose}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/8 hover:bg-white/15 transition-colors cursor-pointer shrink-0"
                aria-label="Close search"
              >
                <ArrowLeft size={20} className="text-cream" />
              </button>
              <div className="flex-1 relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-cream-dim)]/40 pointer-events-none"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="What are you playing today?"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/8 border border-white/10 text-sm text-cream placeholder-[var(--color-cream-dim)]/40 outline-none focus:border-brand-gold/30 focus:ring-1 focus:ring-brand-gold/20 transition-all"
                  aria-label="Search games"
                />
              </div>
            </div>

            {/* Category quick-links */}
            <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
              {["All Games", "Multiplayer", "Arcade", "Racing", "Chill", "Classic"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    onSearchChange("");
                    onClose();
                  }}
                  className="shrink-0 px-4 py-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/8 text-sm font-medium text-[var(--color-cream-dim)] hover:text-cream transition-all cursor-pointer"
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="h-px bg-white/5 mx-4" />

            {/* Popular section */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <h3 className="font-display text-sm font-bold text-cream/60 mb-3 uppercase tracking-wider">
                Popular this week
              </h3>
              {/* Content will be filled by parent with game data */}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
