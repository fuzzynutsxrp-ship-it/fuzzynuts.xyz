"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  User,
  Trophy,
  Menu,
  X,
  LogIn,
  Search,
} from "lucide-react";
import { useWalletStore } from "@/store/wallet";
import { useSession, signOut } from "next-auth/react";
import { LoginModal } from "@/components/auth/LoginModal";
import { truncateAddress } from "@/lib/format";
import { PokiLogo } from "./PokiLogo";
import Link from "next/link";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const { address, isConnected, disconnect } = useWalletStore();
  const { data: session } = useSession();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [dropdownOpen]);

  return (
    <>
      {/*
        Poki-style unified nav strip:
        [hamburger] [logo badge] [user icon] [──── search bar ────]
      */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 pt-[env(safe-area-inset-top)] ${
          scrolled
            ? "bg-[#0a0613]/95 backdrop-blur-md border-b border-brand-gold/10 shadow-[0_2px_20px_rgba(0,0,0,0.4)]"
            : "bg-[#0a0613]/80 border-b border-white/5"
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-center h-[52px] md:h-[60px] px-2 md:px-3 gap-1.5">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-[var(--color-cream-dim)] hover:text-brand-gold cursor-pointer rounded-lg hover:bg-white/5 transition-colors shrink-0"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Logo badge */}
          <PokiLogo />

          {/* User icon — right next to logo, Poki-style */}
          <div className="relative shrink-0" ref={dropdownRef}>
            {!session && !isConnected ? (
              <motion.button
                onClick={() => setLoginModalOpen(true)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 hover:border-brand-gold/30 transition-all cursor-pointer"
                aria-label="Sign in"
              >
                <User size={18} className="text-[var(--color-cream-dim)]" />
              </motion.button>
            ) : (
              <>
                <motion.button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl bg-brand-gold/15 hover:bg-brand-gold/25 border border-brand-gold/20 hover:border-brand-gold/40 transition-all cursor-pointer"
                  aria-label="Account menu"
                >
                  {session?.user?.image ? (
                    <img src={session.user.image} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <User size={18} className="text-brand-gold" />
                  )}
                </motion.button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full mt-2 w-52 rounded-xl bg-[#0a0613] border border-brand-gold/20 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50"
                    >
                      {session && (
                        <div className="px-3 py-2 mb-1">
                          <p className="text-xs text-[var(--color-cream-dim)]">Signed in as</p>
                          <p className="text-sm font-bold text-cream truncate">
                            {session.user?.name ?? session.user?.email ?? "Player"}
                          </p>
                        </div>
                      )}

                      {session && (
                        <Link href="/profile/" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-cream-dim)] hover:text-cream hover:bg-white/5 rounded-lg transition-colors">
                          <User size={14} />
                          Profile
                        </Link>
                      )}

                      <Link href="/leaderboard/" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-cream-dim)] hover:text-cream hover:bg-white/5 rounded-lg transition-colors">
                        <Trophy size={14} />
                        Leaderboard
                      </Link>

                      {isConnected && address && (
                        <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-cream-dim)]">
                          <span className="font-mono">{truncateAddress(address)}</span>
                        </div>
                      )}

                      <div className="h-px bg-white/5 my-1" />

                      <button
                        onClick={() => {
                          disconnect();
                          if (session) signOut({ callbackUrl: "/" });
                          setDropdownOpen(false);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <LogOut size={14} />
                        {session ? "Sign Out" : "Disconnect"}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>

          {/* Search bar — fills remaining space, Poki-style white pill */}
          <div className="flex-1 min-w-0">
            <div className="poki-search relative w-full flex items-center px-4 py-2">
              <Search size={16} className="search-icon mr-2" />
              <input
                type="text"
                placeholder="What are you playing today?"
                aria-label="Search games"
              />
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden bg-[#0a0613] border-b border-brand-gold/10"
            >
              <div className="px-4 py-4 space-y-1">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-[var(--color-cream-dim)] hover:text-cream hover:bg-white/5 rounded-lg transition-colors"
                >
                  🎮 Games
                </Link>
                <Link
                  href="/leaderboard/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-[var(--color-cream-dim)] hover:text-cream hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Trophy size={16} />
                  Leaderboard
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </>
  );
}
