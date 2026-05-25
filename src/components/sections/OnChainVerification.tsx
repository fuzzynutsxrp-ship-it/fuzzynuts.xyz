"use client";

import { motion } from "framer-motion";
import { Copy, ExternalLink, Check, ShieldCheck, Terminal } from "lucide-react";
import { XRPL_CONFIG } from "@/lib/utils";
import { useState, useCallback } from "react";

/* ─────────────────────────────────────────────────────────────
   On-Chain Verification — Terminal / Ledger Aesthetic

   Design intent:
   - Zero glassmorphism. Fully opaque dark backgrounds.
   - Left accent bar on each record instead of full glass border.
   - Monospace address rendering with clear label hierarchy.
   - Subtle circuit grid in section bg only, not on cards.
   - Feels like reading a secure on-chain record or terminal.
   ───────────────────────────────────────────────────────────── */

const ACCENT_COLORS: Record<string, string> = {
  issuer: "#ef4444", // Red — blackholed, dangerous, permanent
  distributor: "#FBBF24", // Gold — active treasury
  amm: "#10B981", // Green — liquidity, alive
};

interface LedgerEntryProps {
  index: number;
  label: string;
  tag?: string;
  address: string;
  explorerUrl: string;
  accentColor: string;
  delay: number;
}

function LedgerEntry({
  index,
  label,
  tag,
  address,
  explorerUrl,
  accentColor,
  delay,
}: LedgerEntryProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = address;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="ledger-entry group"
      style={{ "--ledger-accent": accentColor } as React.CSSProperties}
    >
      {/* Left accent bar */}
      <div className="ledger-entry__bar" style={{ background: accentColor }} />

      <div className="flex-1 min-w-0 py-4 sm:py-5 pr-4 sm:pr-5 pl-5 sm:pl-6">
        {/* Row 1: Index + Label + Tag + Explorer link */}
        <div className="flex items-center gap-2 sm:gap-3 mb-2.5 flex-wrap">
          {/* Record index */}
          <span
            className="font-mono text-[10px] tabular-nums opacity-40 select-none"
            style={{ color: accentColor }}
          >
            {String(index).padStart(2, "0")}
          </span>

          {/* Label */}
          <span
            className="text-xs sm:text-sm font-bold uppercase tracking-wider"
            style={{ color: accentColor }}
          >
            {label}
          </span>

          {/* Optional tag */}
          {tag && (
            <span
              className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
              style={{
                color: accentColor,
                background: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
              }}
            >
              {tag}
            </span>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Explorer link */}
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ledger-entry__link flex items-center gap-1 text-[10px] sm:text-xs font-medium opacity-50 hover:opacity-100 transition-opacity"
          >
            <ExternalLink size={11} />
            <span className="hidden sm:inline">View on XRPScan</span>
            <span className="sm:hidden">Explorer</span>
          </a>
        </div>

        {/* Row 2: Address + Copy button */}
        <div className="flex items-center gap-2">
          <code className="ledger-entry__address flex-1 min-w-0 font-mono text-[11px] sm:text-[13px] tracking-wide break-all select-all leading-relaxed">
            {address}
          </code>
          <motion.button
            onClick={handleCopy}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="ledger-entry__copy shrink-0 p-1.5 sm:p-2 rounded-md transition-colors cursor-pointer"
            aria-label={`Copy ${label} address`}
          >
            {copied ? (
              <Check size={14} className="text-[var(--color-neon-green)]" />
            ) : (
              <Copy
                size={14}
                className="opacity-40 group-hover:opacity-70 transition-opacity"
              />
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export function OnChainVerification() {
  return (
    <section
      id="verification"
      className="py-20 sm:py-24 relative overflow-hidden"
    >
      {/* Section background removed — page-level herobackground3.jpg
          shows through. */}
      <div className="container-main relative z-10">
        {/* ── Section Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="text-center mb-10 sm:mb-14"
        >
          <motion.span
            whileHover={{ scale: 1.05 }}
            className="section-badge mb-4"
          >
            <ShieldCheck size={14} />
            On-Chain Verification
          </motion.span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black gradient-text-gold mb-3 sm:mb-4">
            Verify Everything
          </h2>
          <p className="text-[var(--color-cream-dim)] text-sm sm:text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            Don&apos;t trust, verify. Every address is public on the
            XRP&nbsp;Ledger.
          </p>
        </motion.div>

        {/* ── Terminal frame ── */}
        <div className="max-w-2xl mx-auto">
          {/* Terminal header bar */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05, duration: 0.3 }}
            className="ledger-terminal__header"
          >
            <div className="flex items-center gap-2">
              <Terminal
                size={13}
                className="text-[var(--color-neon-green)] opacity-70"
              />
              <span className="font-mono text-[10px] sm:text-xs text-[var(--color-cream-dim)] opacity-60 tracking-wider uppercase">
                xrpl-ledger — $NUT on-chain records
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[rgba(239,68,68,0.6)]" />
              <div className="w-2 h-2 rounded-full bg-[rgba(251,191,36,0.6)]" />
              <div className="w-2 h-2 rounded-full bg-[rgba(16,185,129,0.6)]" />
            </div>
          </motion.div>

          {/* Ledger entries */}
          <div className="ledger-terminal__body">
            <LedgerEntry
              index={1}
              label="Issuer"
              tag="Blackholed"
              address={XRPL_CONFIG.issuer}
              explorerUrl={`https://xrpscan.com/account/${XRPL_CONFIG.issuer}`}
              accentColor={ACCENT_COLORS.issuer}
              delay={0.1}
            />
            <LedgerEntry
              index={2}
              label="Distributor"
              address={XRPL_CONFIG.distributor}
              explorerUrl={`https://xrpscan.com/account/${XRPL_CONFIG.distributor}`}
              accentColor={ACCENT_COLORS.distributor}
              delay={0.18}
            />
            <LedgerEntry
              index={3}
              label="AMM Liquidity Pool"
              address={XRPL_CONFIG.ammPool}
              explorerUrl={`https://xrpscan.com/account/${XRPL_CONFIG.ammPool}`}
              accentColor={ACCENT_COLORS.amm}
              delay={0.26}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
