"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Wallet, LogOut, ChevronDown, ExternalLink, Gift, Coins, Trophy, User, Bell } from "lucide-react";
import { useWalletStore } from "@/store/wallet";
import { truncateAddress } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = [
  { href: "#games", label: "Arcade" },
  { href: "/leaderboard/", label: "Leaderboard", icon: "trophy" },
  { href: "#features", label: "Features" },
  { href: "#tokenomics", label: "Tokenomics" },
  { href: "#how-to-get", label: "Get $NUT" },
];

function ClaimModal({ onClose }: { onClose: () => void }) {
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const handleClaim = () => {
    setClaiming(true);
    setTimeout(() => {
      setClaiming(false);
      setClaimed(true);
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative glass-card p-8 max-w-sm w-full text-center"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-[var(--color-cream-dim)] hover:text-[var(--color-cream)] cursor-pointer"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {claimed ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="text-6xl mb-4"
            >
              🎉
            </motion.div>
            <h3 className="font-display text-2xl font-bold gradient-text-gold mb-2">
              Test Rewards Claimed!
            </h3>
            <p className="text-sm text-[var(--color-cream-dim)] mb-4">
              +1,000 $NUT (demo) has been added to your test balance.
              In the real arcade, you earn by playing games!
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-orange)] text-[var(--color-forest-900)] font-bold text-sm cursor-pointer"
            >
              Awesome! 🐿️
            </button>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">🌰</div>
            <h3 className="font-display text-2xl font-bold gradient-text-gold mb-2">
              Claim Test Rewards
            </h3>
            <p className="text-sm text-[var(--color-cream-dim)] mb-6">
              Welcome to Fuzzynuts! Claim 1,000 test $NUT to explore the arcade.
              No real tokens are transferred.
            </p>
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-orange)] text-[var(--color-forest-900)] font-bold text-base hover:shadow-[0_0_30px_rgba(245,196,66,0.5)] transition-all disabled:opacity-60 cursor-pointer"
            >
              {claiming ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="inline-block"
                  >
                    🌰
                  </motion.span>
                  Claiming…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Gift size={18} />
                  Claim 1,000 $NUT
                </span>
              )}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const { address, isConnected, isConnecting, connect, disconnect, provider, nutBalance } = useWalletStore();
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
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
        const week = `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;

        const res = await fetch(
          `https://world.fuzzynuts.xyz/api/rewards/eligibility?wallet=${encodeURIComponent(address)}&week=${week}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) { setHasClaimable(false); return; }
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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setWalletMenuOpen(false);
      }
    };
    if (walletMenuOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [walletMenuOpen]);

  const handleConnect = useCallback(async (prov: "xaman" | "gemwallet" | "crossmark") => {
    setWalletMenuOpen(false);
    await connect(prov);
  }, [connect]);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0a0f0a]/90 backdrop-blur-xl border-b border-[rgba(245,196,66,0.1)] shadow-[0_4px_30px_rgba(0,0,0,0.3)]"
            : "bg-transparent"
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="container-main flex items-center justify-between h-16 md:h-[72px]">
          {/* Logo */}
          <a href="#hero" className="flex items-center gap-2 group shrink-0" aria-label="Fuzzynuts Home">
            <motion.div
              whileHover={{ scale: 1.08 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2"
            >
              <Image
                src="/images/branding/logo-nav.webp"
                alt="Fuzzynuts"
                width={54}
                height={36}
                className="rounded-md"
                priority
              />
              <span className="font-display font-bold text-lg md:text-xl gradient-text-gold tracking-tight">
                FUZZYNUTS
              </span>
            </motion.div>
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isRoute = link.href.startsWith("/");
              const classes = `px-4 py-2 text-sm font-medium text-[var(--color-cream-dim)] hover:text-[var(--color-gold)] transition-colors rounded-lg hover:bg-[rgba(245,196,66,0.05)] flex items-center gap-1.5`;

              if (isRoute) {
                return (
                  <Link key={link.href} href={link.href} className={classes}>
                    {link.icon === "trophy" && <Trophy size={14} className="text-brand-gold opacity-70" />}
                    {link.label}
                  </Link>
                );
              }
              return (
                <a key={link.href} href={link.href} className={classes}>
                  {link.label}
                </a>
              );
            })}

            {/* Profile link — only visible when wallet is connected */}
            {isConnected && (
              <Link
                href="/profile/"
                className="relative px-4 py-2 text-sm font-medium text-[var(--color-cream-dim)] hover:text-[var(--color-neon-green)] transition-colors rounded-lg hover:bg-[rgba(16,185,129,0.05)] flex items-center gap-1.5"
              >
                {hasClaimable ? (
                  <Bell size={14} className="text-brand-gold animate-pulse" />
                ) : (
                  <User size={14} className="text-neon-green opacity-70" />
                )}
                Profile
                {hasClaimable && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand-gold shadow-[0_0_8px_rgba(245,196,66,0.6)] animate-pulse" />
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
                  <span className="hidden sm:inline">{truncateAddress(address)}</span>
                  <span className="sm:hidden"><Wallet size={16} /></span>
                  <ChevronDown size={14} className={`transition-transform ${walletMenuOpen ? "rotate-180" : ""}`} />
                </motion.button>
              ) : (
                <motion.button
                  onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                  disabled={isConnecting}
                  whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(245,196,66,0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-orange)] text-[var(--color-forest-900)] font-bold text-sm transition-all disabled:opacity-50 cursor-pointer"
                  style={{ animation: !isConnecting ? "pulse-gold 3s ease-in-out infinite" : "none" }}
                >
                  <Wallet size={16} />
                  <span className="hidden sm:inline">{isConnecting ? "Connecting…" : "Connect Wallet"}</span>
                  <span className="sm:hidden">{isConnecting ? "…" : "Connect"}</span>
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
                            <p className="text-xs text-[var(--color-cream-dim)] capitalize">Connected via {provider}</p>
                            <div className="w-2 h-2 rounded-full bg-[var(--color-accent-green)]" />
                          </div>
                          <p className="text-xs font-mono text-[var(--color-gold)] break-all leading-relaxed">{address}</p>
                        </div>

                        {/* NUT Balance */}
                        <div className="px-3 py-2 rounded-lg bg-[rgba(245,196,66,0.03)] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Coins size={14} className="text-[var(--color-gold)]" />
                            <span className="text-xs text-[var(--color-cream-dim)]">$NUT Balance</span>
                          </div>
                          <span className="text-sm font-bold text-[var(--color-gold)]">
                            {nutBalance || "—"}
                          </span>
                        </div>

                        {/* Actions */}
                        <button
                          onClick={() => { setClaimOpen(true); setWalletMenuOpen(false); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--color-accent-green)] hover:bg-[rgba(74,222,128,0.08)] rounded-lg transition-colors cursor-pointer"
                        >
                          <Gift size={14} />
                          Claim Test Rewards
                        </button>
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
                          onClick={() => { disconnect(); setWalletMenuOpen(false); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <LogOut size={14} />
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs text-[var(--color-cream-dim)] px-2 pb-2 font-medium">Choose wallet</p>
                        {[
                          { id: "xaman" as const, name: "Xaman (Xumm)", icon: "📱", desc: "Mobile / Desktop" },
                          { id: "gemwallet" as const, name: "GemWallet", icon: "💎", desc: "Browser Extension" },
                          { id: "crossmark" as const, name: "Crossmark", icon: "✖️", desc: "Browser Extension" },
                        ].map((w) => (
                          <motion.button
                            key={w.id}
                            onClick={() => handleConnect(w.id)}
                            whileHover={{ x: 4 }}
                            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-[var(--color-cream)] hover:text-[var(--color-gold)] hover:bg-[rgba(245,196,66,0.08)] rounded-lg transition-all cursor-pointer"
                          >
                            <span className="text-xl w-8 text-center">{w.icon}</span>
                            <div className="text-left">
                              <div className="font-medium">{w.name}</div>
                              <div className="text-xs text-[var(--color-cream-dim)]">{w.desc}</div>
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
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X size={24} />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
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
              className="md:hidden overflow-hidden bg-[#0a0f0a]/95 backdrop-blur-xl border-b border-[rgba(245,196,66,0.1)]"
            >
              <div className="container-main py-4 space-y-1">
                {NAV_LINKS.map((link, i) => {
                  const isRoute = link.href.startsWith("/");
                  const classes = "flex items-center gap-2 px-4 py-3 text-base font-medium text-[var(--color-cream-dim)] hover:text-[var(--color-gold)] hover:bg-[rgba(245,196,66,0.05)] rounded-lg transition-colors min-h-[44px]";

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
                          {link.icon === "trophy" && <Trophy size={16} className="text-brand-gold opacity-70" />}
                          {link.label}
                        </Link>
                      </motion.div>
                    );
                  }
                  return (
                    <motion.a
                      key={link.href}
                      href={link.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setMobileOpen(false)}
                      className={classes}
                    >
                      {link.label}
                    </motion.a>
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
                        <Bell size={16} className="text-brand-gold animate-pulse" />
                      ) : (
                        <User size={16} className="text-neon-green opacity-70" />
                      )}
                      {hasClaimable ? "Claim Rewards!" : "My Profile"}
                      {hasClaimable && (
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-gold shadow-[0_0_8px_rgba(245,196,66,0.6)] animate-pulse" />
                      )}
                    </Link>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Claim Modal */}
      <AnimatePresence>
        {claimOpen && <ClaimModal onClose={() => setClaimOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
