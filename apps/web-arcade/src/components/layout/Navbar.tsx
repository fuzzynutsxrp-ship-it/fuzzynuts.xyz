"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  LogOut,
  ChevronDown,
  User,
  Trophy,
  Menu,
  X,
  LogIn,
} from "lucide-react";
import { useWalletStore } from "@/store/wallet";
import { useSession, signOut } from "next-auth/react";
import { LoginModal } from "@/components/auth/LoginModal";
import { truncateAddress } from "@/lib/format";
import Image from "next/image";
import Link from "next/link";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const { address, isConnected, connect, disconnect, provider } =
    useWalletStore();
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

  const handleConnect = useCallback(
    async (prov: "xaman" | "joey") => {
      await connect(prov);
    },
    [connect],
  );

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 pt-[env(safe-area-inset-top)] ${
          scrolled
            ? "bg-[#0a0613]/95 backdrop-blur-md border-b border-brand-gold/10 shadow-[0_2px_20px_rgba(0,0,0,0.4)]"
            : "bg-[#0a0613]/80"
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-[1400px] mx-auto flex items-center justify-between h-14 md:h-16 px-4 md:px-6">
          {/* Left: Logo + mascot */}
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0 group"
            aria-label="FuzzyNuts Home"
          >
            <Image
              src="/images/branding/logo-nav.webp"
              alt=""
              width={36}
              height={24}
              className="rounded-md"
              priority
            />
            <Image
              src="/images/branding/wordmarks/text_logo.png"
              alt="FuzzyNuts"
              width={120}
              height={24}
              className="h-6 md:h-7 w-auto"
              priority
            />
          </Link>

          {/* Center: Search bar placeholder (future) */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search games..."
                disabled
                className="w-full px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-[var(--color-cream-dim)] placeholder-[var(--color-cream-dim)]/40 outline-none cursor-not-allowed opacity-50"
                aria-label="Search games (coming soon)"
              />
            </div>
          </div>

          {/* Right: Auth + Wallet + Mobile toggle */}
          <div className="flex items-center gap-2">
            {/* Auth: Logged out → Sign in button */}
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

            {/* Auth: Logged in → Avatar + dropdown */}
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

                      {/* Wallet status */}
                      {isConnected && address && (
                        <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-cream-dim)]">
                          <Wallet size={14} className="text-brand-gold" />
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

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--color-cream)] hover:text-brand-gold cursor-pointer"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
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
