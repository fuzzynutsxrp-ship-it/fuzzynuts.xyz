"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Trophy, Gift, Gamepad2, Flame, Users, Joystick, Car, Coffee, X } from "lucide-react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  /** When set, hides category filters and shows only nav links (for sub-pages) */
  hideCategories?: boolean;
}

const NAV_LINKS = [
  { label: "Leaderboard", href: "/leaderboard/", icon: Trophy },
  { label: "Rewards / Referrals", href: "/prizes/", icon: Gift },
  { label: "All Games", href: "/", icon: Gamepad2 },
];

const CATEGORIES = [
  { label: "Popular", icon: Flame, value: "popular" },
  { label: "Multiplayer", icon: Users, value: "multiplayer" },
  { label: "Arcade", icon: Joystick, value: "arcade" },
  { label: "Racing", icon: Car, value: "racing" },
  { label: "Chill", icon: Coffee, value: "chill" },
];

export function Sidebar({
  open,
  onClose,
  activeCategory,
  onCategoryChange,
  hideCategories,
}: SidebarProps) {
  const pathname = usePathname();

  const isActiveHref = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href.replace(/\/$/, ""));
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-14 md:top-16 bottom-0 left-0 z-40
          w-60 bg-[#0a0613] border-r border-white/5
          flex flex-col overflow-y-auto
          transition-transform duration-300 ease-out
          lg:sticky lg:top-14 md:lg:top-16 lg:h-[calc(100vh-3.5rem)] md:lg:h-[calc(100vh-4rem)] lg:translate-x-0 lg:z-10
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
        role="navigation"
        aria-label="Sidebar navigation"
      >
        {/* Mobile close button */}
        <div className="flex items-center justify-between px-4 py-3 lg:hidden">
          <span className="text-sm font-bold text-cream font-display">Menu</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-cream-dim)] hover:text-cream hover:bg-white/5 cursor-pointer"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        <div className="px-3 py-4 space-y-1">
          {NAV_LINKS.map((link) => {
            const active = isActiveHref(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-gold/12 text-brand-gold border border-brand-gold/20"
                    : "text-[var(--color-cream-dim)] hover:text-cream hover:bg-white/5 border border-transparent"
                }`}
              >
                <link.icon size={18} className="shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Divider + Category filters (homepage only) */}
        {!hideCategories && (
          <>
            <div className="mx-4 h-px bg-white/5" />
            <div className="px-3 py-4">
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-cream-dim)]/50">
                Categories
              </p>
              <div className="space-y-0.5">
                {CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat.value;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => {
                        onCategoryChange(cat.value);
                        onClose();
                      }}
                      className={`
                        flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer
                        ${
                          isActive
                            ? "bg-brand-gold/12 text-brand-gold border border-brand-gold/20"
                            : "text-[var(--color-cream-dim)] hover:text-cream hover:bg-white/5 border border-transparent"
                        }
                      `}
                    >
                      <cat.icon size={16} className="shrink-0" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Bottom spacer for chat widget clearance */}
        <div className="flex-1" />
        <div className="h-20" />
      </aside>
    </>
  );
}
