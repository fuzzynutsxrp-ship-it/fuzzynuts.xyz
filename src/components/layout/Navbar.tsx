"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Wallet,
  LogOut,
  ChevronDown,
  ExternalLink,
  Gift,
  Coins,
  Trophy,
  User,
  AlertCircle,
} from "lucide-react";
import { useWalletStore } from "@/store/wallet";
// DEGEN OVERHAUL — formatter from the lean @/lib/format module
import { truncateAddress } from "@/lib/format";
import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/#games", label: "Arcade" },
  { href: "/leaderboard/", label: "Leaderboard", icon: "trophy" },
  { href: "/#prizes", label: "Prizes" },
  { href: "/#tokenomics", label: "Tokenomics" },
  { href: "/#how-to-get", label: "Get $NUT" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const {
    address,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    provider,
    nutBalance,
    error,
    setError,
  } = useWalletStore();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [hasClaimable, setHasClaimable] = useState(false);

  // Lightweight eligibility check for notification dot
  useEffect(() => {
    if (!isConnected || !address) {
      setHasClaimable(false);
      return;
    }

    const checkRewards = async () => {
      try {
        const now = new Date();
        const d = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
        );
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNum = Math.ceil(
          ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
        );
        const week = `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;

        const res = await fetch(
          `https://world.fuzzynuts.xyz/api/rewards/eligibility?wallet=${encodeURIComponent(address)}&week=${week}`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (!res.ok) {
          setHasClaimable(false);
          return;
        }
        const data = await res.json();
        setHasClaimable(data.eligible === true && !data.claimed);
      } catch {
        setHasClaimable(false);
      }
    };

    checkRewards();
  }, [isConnected, address]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
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
        setWalletMenuOpen(false);
      }
    };
    if (walletMenuOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [walletMenuOpen]);

  // Auto-dismiss wallet errors after 8s
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 8000);
    return () => clearTimeout(timer);
  }, [error, setError]);

  const handleConnect = useCallback(
    async (prov: "xaman" | "joey") => {
      setWalletMenuOpen(false);
      setError(null); // Clear any previous error
      await connect(prov);
    },
    [connect, setError],
  );

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? // DEGEN OVERHAUL START — black/purple bar w/ hot-pink underglow
              "bg-degen-950/90 backdrop-blur-xl border-b border-hot-pink/25 shadow-[0_4px_30px_rgba(0,0,0,0.5),0_1px_0_rgba(255,46,136,0.4)]"
              // DEGEN OVERHAUL END
            : "bg-transparent"
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="container-main flex items-center justify-between h-16 md:h-[72px]">
          {/* Logo — squirrel emblem + text_logo.png wordmark */}
          <Link
            href="/"
            className="flex items-center gap-2 group shrink-0"
            aria-label="Fuzzynuts Home"
          >
            <motion.div
              whileHover={{ scale: 1.08 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2"
            >
              {/* DEGEN OVERHAUL START — interactive mascot: idle bounce + hover neon glow */}
              <Image
                src="/images/branding/logo-nav.webp"
                alt=""
                width={54}
                height={36}
                className="logo-degen rounded-md"
                priority
              />
              {/* DEGEN OVERHAUL END */}
              <Image
                src="/images/branding/wordmarks/text_logo.png"
                alt="Fuzzynuts"
                width={160}
                height={32}
                className="h-7 md:h-8 w-auto"
                priority
              />
            </motion.div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isRoute =
                link.href.startsWith("/") && !link.href.startsWith("/#");
              const isLeaderboard = link.icon === "trophy";
              // DEGEN OVERHAUL START — hot-pink link hover
              const classes = `px-4 py-2 text-sm font-medium text-[var(--color-cream-dim)] hover:text-[var(--color-hot-pink)] transition-colors rounded-lg hover:bg-[rgba(255,46,136,0.07)] flex items-center gap-1.5 relative`;
              // DEGEN OVERHAUL END

              if (isRoute) {
                return (
                  <Link key={link.href} href={link.href} className={classes}>
                    {isLeaderboard && (
                      <Trophy
                        size={14}
                        className={
                          hasClaimable
                            ? "text-brand-gold"
                            : "text-brand-gold opacity-70"
                        }
                      />
                    )}
                    {link.label}
                    {/* Prize badge on Leaderboard link */}
                    {isLeaderboard && hasClaimable && (
                      <span className="ml-1 text-[9px] font-black uppercase tracking-wider bg-brand-gold/15 text-brand-gold border border-brand-gold/30 px-1.5 py-0.5 rounded-full animate-pulse">
                        Top 3!
                      </span>
                    )}
                  </Link>
                );
              }
              return (
                <Link key={link.href} href={link.href} className={classes}>
                  {link.label}
                </Link>
              );
            })}

            {/* Profile link — only visible when wallet is connected */}
            {isConnected && (
              <Link
                href="/profile/"
                className="relative px-4 py-2 text-sm font-medium text-[var(--color-cream-dim)] hover:text-[var(--color-neon-green)] transition-colors rounded-lg hover:bg-[rgba(16,185,129,0.05)] flex items-center gap-1.5"
              >
                {hasClaimable ? (
                  <Gift size={14} className="text-brand-gold" />
                ) : (
                  <User size={14} className="text-neon-green opacity-70" />
                )}
                {hasClaimable ? "Claim Rewards" : "Profile"}
                {hasClaimable && (
                  <span className="text-[9px] font-black bg-brand-gold text-forest-dark px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)] animate-pulse">
                    $NUT
                  </span>
                )}
              </Link>
            )}
          </div>

          {/* Wallet + Mobile Toggle */}
          <div className="flex items-center gap-3">
            {/* Wallet Button */}
            <div className="relative" ref={dropdownRef}>
              {isConnected && address ? (
                <motion.button
                  onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-[rgba(245,196,66,0.1)] border border-[rgba(245,196,66,0.2)] text-[var(--color-gold)] hover:bg-[rgba(245,196,66,0.15)] transition-all text-sm font-medium"
                >
                  <div className="w-2 h-2 rounded-full bg-[var(--color-accent-green)] animate-pulse" />
                  <span className="hidden sm:inline">
                    {truncateAddress(address)}
                  </span>
                  <span className="sm:hidden">
                    <Wallet size={16} />
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${walletMenuOpen ? "rotate-180" : ""}`}
                  />
                </motion.button>
              ) : (
                <motion.button
                  onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                  disabled={isConnecting}
                  // DEGEN OVERHAUL START — pink neon glow on the gold CTA (flow unchanged)
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 0 28px rgba(255,46,136,0.55)",
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-hot-pink)] text-[var(--color-degen-black)] font-black text-sm transition-all disabled:opacity-50 cursor-pointer"
                  style={{
                    animation: !isConnecting
                      ? "pulse-pink 2.6s ease-in-out infinite"
                      : "none",
                  }}
                  // DEGEN OVERHAUL END
                >
                  <Wallet size={16} />
                  <span className="hidden sm:inline">
                    {isConnecting ? "Connecting…" : "Connect Wallet"}
                  </span>
                  <span className="sm:hidden">
                    {isConnecting ? "…" : "Connect"}
                  </span>
                </motion.button>
              )}

              {/* Wallet Dropdown */}
              <AnimatePresence>
                {walletMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-72 rounded-xl glass-card p-3 shadow-2xl"
                  >
                    {isConnected ? (
                      <div className="space-y-2">
                        {/* Address display */}
                        <div className="px-3 py-2.5 rounded-lg bg-[rgba(245,196,66,0.05)] border border-[rgba(245,196,66,0.08)]">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-[var(--color-cream-dim)] capitalize">
                              Connected via {provider}
                            </p>
                            <div className="w-2 h-2 rounded-full bg-[var(--color-accent-green)]" />
                          </div>
                          <p className="text-xs font-mono text-[var(--color-gold)] break-all leading-relaxed">
                            {address}
                          </p>
                        </div>

                        {/* NUT Balance */}
                        <div className="px-3 py-2 rounded-lg bg-[rgba(245,196,66,0.03)] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Coins
                              size={14}
                              className="text-[var(--color-gold)]"
                            />
                            <span className="text-xs text-[var(--color-cream-dim)]">
                              $NUT Balance
                            </span>
                          </div>
                          <span className="text-sm font-bold text-[var(--color-gold)]">
                            {nutBalance || "—"}
                          </span>
                        </div>

                        {/* Actions */}
                        <Link
                          href="/profile/"
                          onClick={() => setWalletMenuOpen(false)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--color-accent-green)] hover:bg-[rgba(74,222,128,0.08)] rounded-lg transition-colors cursor-pointer"
                        >
                          <Gift size={14} />
                          {hasClaimable ? "Claim Rewards 🔔" : "Claim Rewards"}
                        </Link>
                        <a
                          href={`https://xrpscan.com/account/${address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--color-cream-dim)] hover:text-[var(--color-gold)] hover:bg-[rgba(245,196,66,0.05)] rounded-lg transition-colors"
                        >
                          <ExternalLink size={14} />
                          View on XRPScan
                        </a>
                        <div className="h-px bg-[rgba(245,196,66,0.08)] mx-1" />
                        <button
                          onClick={() => {
                            disconnect();
                            setWalletMenuOpen(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <LogOut size={14} />
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs text-[var(--color-cream-dim)] px-2 pb-2 font-medium">
                          Choose wallet
                        </p>

                        {/* Inline error in dropdown */}
                        {error && (
                          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 mb-1">
                            <AlertCircle
                              size={14}
                              className="text-red-400 mt-0.5 shrink-0"
                            />
                            <div className="text-xs text-red-400 leading-relaxed">
                              {error}
                              {error.includes("installed") ||
                              error.includes("not found") ? (
                                <>
                                  {" "}
                                  <a
                                    href="https://xaman.app"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline text-brand-gold hover:text-[var(--color-gold)] font-semibold"
                                  >
                                    Get Xaman →
                                  </a>
                                </>
                              ) : null}
                            </div>
                          </div>
                        )}

                        {[
                          {
                            id: "xaman" as const,
                            name: "Xaman (Xumm)",
                            icon: "📱",
                            desc: "Mobile / Desktop",
                          },
                          {
                            id: "joey" as const,
                            name: "Joey Wallet",
                            icon: "🦘",
                            desc: "Mobile / WalletConnect",
                          },
                        ].map((w) => (
                          <motion.button
                            key={w.id}
                            onClick={() => handleConnect(w.id)}
                            disabled={isConnecting}
                            whileHover={{ x: 4 }}
                            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-[var(--color-cream)] hover:text-[var(--color-gold)] hover:bg-[rgba(245,196,66,0.08)] rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <span className="text-xl w-8 text-center">
                              {w.icon}
                            </span>
                            <div className="text-left">
                              <div className="font-medium">{w.name}</div>
                              <div className="text-xs text-[var(--color-cream-dim)]">
                                {w.desc}
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-[var(--color-cream)] hover:text-[var(--color-gold)] cursor-pointer"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              <AnimatePresence mode="wait">
                {mobileOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X size={24} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu size={24} />
                  </motion.div>
                )}
              </AnimatePresence>
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
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="md:hidden overflow-hidden bg-forest-900/95 backdrop-blur-xl border-b border-gold-dim"
            >
              <div className="container-main py-4 space-y-1">
                {NAV_LINKS.map((link, i) => {
                  const isRoute =
                    link.href.startsWith("/") && !link.href.startsWith("/#");
                  const classes =
                    "flex items-center gap-2 px-4 py-3 text-base font-medium text-[var(--color-cream-dim)] hover:text-[var(--color-gold)] hover:bg-[rgba(245,196,66,0.05)] rounded-lg transition-colors min-h-[44px]";

                  if (isRoute) {
                    return (
                      <motion.div
                        key={link.href}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Link
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                          className={classes}
                        >
                          {link.icon === "trophy" && (
                            <Trophy
                              size={16}
                              className="text-brand-gold opacity-70"
                            />
                          )}
                          {link.label}
                        </Link>
                      </motion.div>
                    );
                  }
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className={classes}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  );
                })}

                {/* Profile — mobile, only when connected */}
                {isConnected && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: NAV_LINKS.length * 0.05 }}
                  >
                    <Link
                      href="/profile/"
                      onClick={() => setMobileOpen(false)}
                      className="relative flex items-center gap-2 px-4 py-3 text-base font-medium text-[var(--color-cream-dim)] hover:text-[var(--color-neon-green)] hover:bg-[rgba(16,185,129,0.05)] rounded-lg transition-colors min-h-[44px]"
                    >
                      {hasClaimable ? (
                        <Gift size={16} className="text-brand-gold" />
                      ) : (
                        <User
                          size={16}
                          className="text-neon-green opacity-70"
                        />
                      )}
                      {hasClaimable ? "Claim Rewards!" : "My Profile"}
                      {hasClaimable && (
                        <span className="text-[10px] font-black bg-brand-gold text-forest-dark px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)] animate-pulse">
                          $NUT
                        </span>
                      )}
                    </Link>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
}
