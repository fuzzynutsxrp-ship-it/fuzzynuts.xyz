"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  ChevronDown,
  User,
  Trophy,
  Menu,
  LogIn,
  Search,
} from "lucide-react";
import { useWalletStore } from "@/store/wallet";
import { useSession, signOut } from "next-auth/react";
import { LoginModal } from "@/components/auth/LoginModal";
import { truncateAddress } from "@/lib/format";
import { PokiLogo } from "./PokiLogo";
import Link from "next/link";

interface TopNavProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onMenuToggle: () => void;
}

export function TopNav({ searchQuery, onSearchChange, onMenuToggle }: TopNavProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const { address, isConnected, disconnect } = useWalletStore();
  const { data: session } = useSession();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
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
      <nav
        className="sticky top-0 z-50 h-[52px] md:h-[60px] bg-[#0a0613]/95 backdrop-blur-md border-b border-white/5 flex items-center px-3 md:px-5 gap-2"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Left: hamburger + Poki-style logo badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onMenuToggle}
            className="p-2 -ml-1 min-h-[40px] min-w-[40px] flex items-center justify-center text-[var(--color-cream-dim)] hover:text-brand-gold cursor-pointer rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Toggle menu"
          >
            <Menu size={20} />
          </button>
          <PokiLogo />
        </div>

        {/* Center: Poki-style white pill search bar */}
        <div className="flex-1 flex justify-center max-w-[55%] mx-auto">
          <div className="poki-search relative w-full flex items-center px-4 py-2">
            <Search size={16} className="search-icon mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="What are you playing today?"
              aria-label="Search games"
            />
          </div>
        </div>

        {/* Right: auth */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Logged out → Sign in */}
          {!session && !isConnected && (
            <motion.button
              onClick={() => setLoginModalOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-gray-900 font-bold text-sm cursor-pointer"
            >
              <LogIn size={16} />
              <span className="sm:inline">Sign in</span>
            </motion.button>
          )}

          {/* Logged in → Avatar + dropdown */}
          {(session || isConnected) && (
            <div className="relative" ref={dropdownRef}>
              <motion.button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-brand-gold/20 hover:border-brand-gold/40 transition-all cursor-pointer"
              >
                {session?.user?.image ? (
                  <img src={session.user.image} alt="" className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-brand-gold/20 flex items-center justify-center">
                    <User size={14} className="text-brand-gold" />
                  </div>
                )}
                <span className="hidden md:inline text-xs font-medium text-cream max-w-[80px] truncate">
                  {session?.user?.name ?? (address ? truncateAddress(address) : "Player")}
                </span>
                <ChevronDown size={12} className={`text-[var(--color-cream-dim)] transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </motion.button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-[#0a0613] border border-brand-gold/20 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
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
            </div>
          )}
        </div>
      </nav>

      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </>
  );
}
