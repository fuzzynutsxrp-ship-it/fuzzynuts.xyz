"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  ChevronDown,
  User,
  Trophy,
  LogIn,
  Search,
  Menu,
} from "lucide-react";
import { useWalletStore } from "@/store/wallet";
import { useSession, signOut } from "next-auth/react";
import { LoginModal } from "@/components/auth/LoginModal";
import { truncateAddress } from "@/lib/format";
import Image from "next/image";
import Link from "next/link";

interface TopNavProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleSidebar: () => void;
}

export function TopNav({ searchQuery, onSearchChange, onToggleSidebar }: TopNavProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const { address, isConnected, disconnect } = useWalletStore();
  const { data: session } = useSession();
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      <nav
        className="sticky top-0 z-50 h-14 md:h-16 bg-[#0a0613]/95 backdrop-blur-md border-b border-white/5 flex items-center px-4 md:px-6 gap-3"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Left: Hamburger (mobile) + Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--color-cream-dim)] hover:text-brand-gold cursor-pointer"
            aria-label="Toggle sidebar menu"
          >
            <Menu size={22} />
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0 group"
            aria-label="FuzzyNuts Home"
          >
            <Image
              src="/images/branding/logo-nav.webp"
              alt=""
              width={32}
              height={22}
              className="rounded-md"
              priority
            />
            <span className="hidden sm:inline font-display text-lg font-black text-cream group-hover:text-brand-gold transition-colors">
              FuzzyNuts
            </span>
          </Link>
        </div>

        {/* Center: Search bar */}
        <div className="flex-1 flex justify-center max-w-xl mx-auto">
          <div className="relative w-full">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-cream-dim)]/40 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search 6 games..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-cream placeholder-[var(--color-cream-dim)]/40 outline-none transition-all focus:bg-white/8 focus:border-brand-gold/30 focus:ring-1 focus:ring-brand-gold/20"
              aria-label="Search games"
            />
          </div>
        </div>

        {/* Right: Auth */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Logged out → Sign in */}
          {!session && !isConnected && (
            <motion.button
              onClick={() => setLoginModalOpen(true)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-white text-gray-900 font-bold text-sm cursor-pointer"
            >
              <LogIn size={16} />
              <span className="hidden sm:inline">Sign in</span>
            </motion.button>
          )}

          {/* Logged in → Avatar + dropdown */}
          {(session || isConnected) && (
            <div className="relative" ref={dropdownRef}>
              <motion.button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-brand-gold/20 hover:border-brand-gold/40 transition-all cursor-pointer"
              >
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-brand-gold/20 flex items-center justify-center">
                    <User size={14} className="text-brand-gold" />
                  </div>
                )}
                <span className="hidden sm:inline text-sm font-medium text-cream max-w-[100px] truncate">
                  {session?.user?.name ?? (address ? truncateAddress(address) : "Player")}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-[var(--color-cream-dim)] transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </motion.button>

              {/* Dropdown menu */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#0a0613] border border-brand-gold/20 p-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                  >
                    {session && (
                      <div className="px-3 py-2 mb-1">
                        <p className="text-xs text-[var(--color-cream-dim)]">
                          Signed in as
                        </p>
                        <p className="text-sm font-bold text-cream truncate">
                          {session.user?.name ?? session.user?.email ?? "Player"}
                        </p>
                      </div>
                    )}

                    {session && (
                      <Link
                        href="/profile/"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-cream-dim)] hover:text-cream hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <User size={14} />
                        Profile
                      </Link>
                    )}

                    <Link
                      href="/leaderboard/"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-cream-dim)] hover:text-cream hover:bg-white/5 rounded-lg transition-colors"
                    >
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

      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </>
  );
}
