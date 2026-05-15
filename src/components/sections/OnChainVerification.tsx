"use client";

import { motion } from "framer-motion";
import { Copy, ExternalLink, Check, ShieldCheck } from "lucide-react";
import { XRPL_CONFIG } from "@/lib/utils";
import { useState, useCallback } from "react";
import Image from "next/image";
import { CyberCard } from "@/components/ui/CyberCard";

function CopyableAddress({ label, address, explorerUrl, delay }: { label: string; address: string; explorerUrl: string; delay: number }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = address;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [address]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ delay }}
      whileHover={{ x: 4 }}
    >
      <CyberCard accentColor="blue" circuit className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-[var(--color-brand-gold)] uppercase tracking-wider">{label}</span>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-[var(--color-cream-dim)] hover:text-neon-green transition-colors"
          >
            <ExternalLink size={12} />
            Explorer
          </a>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs sm:text-sm font-mono text-[var(--color-cream)] bg-[rgba(16,185,129,0.04)] px-3 py-2 rounded-lg break-all border border-[rgba(16,185,129,0.08)] select-all">
            {address}
          </code>
          <motion.button
            onClick={handleCopy}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-lg hover:bg-[rgba(16,185,129,0.1)] transition-colors cursor-pointer shrink-0"
            aria-label={`Copy ${label} address`}
          >
            {copied ? (
              <Check size={16} className="text-neon-green" />
            ) : (
              <Copy size={16} className="text-[var(--color-cream-dim)]" />
            )}
          </motion.button>
        </div>
      </CyberCard>
    </motion.div>
  );
}

export function OnChainVerification() {
  return (
    <section id="verification" className="py-24 relative overflow-hidden">
      {/* ── Verification Section Background Image ── */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/sections/verify-bg.jpg"
          alt=""
          fill
          quality={72}
          className="object-cover object-center hidden sm:block"
          sizes="100vw"
          aria-hidden="true"
          loading="lazy"
        />
        <Image
          src="/images/sections/verify-bg-mobile.jpg"
          alt=""
          fill
          quality={68}
          className="object-cover object-center sm:hidden"
          sizes="100vw"
          aria-hidden="true"
          loading="lazy"
        />
      </div>

      {/* ── Combined Overlay (merged 4 layers → 1) ── */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: [
            "linear-gradient(to bottom, rgba(1,5,8,0.96) 0%, rgba(1,5,8,0.68) 15%, rgba(1,5,8,0.58) 50%, rgba(1,5,8,0.68) 85%, rgba(1,5,8,0.96) 100%)",
            "linear-gradient(to right, rgba(1,5,8,0.6) 0%, transparent 18%, transparent 82%, rgba(1,5,8,0.6) 100%)",
            "radial-gradient(ellipse 70% 60% at 50% 55%, rgba(59,130,246,0.08) 0%, transparent 65%)",
            "radial-gradient(ellipse 80% 30% at 50% 90%, rgba(16,185,129,0.05) 0%, transparent 60%)",
          ].join(", "),
        }}
      />

      <div className="container-main relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="text-center mb-12"
        >
          <motion.span
            whileHover={{ scale: 1.05 }}
            className="section-badge mb-4"
          >
            <ShieldCheck size={14} />
            On-Chain Verification
          </motion.span>
          <h2 className="font-display text-4xl md:text-5xl font-black gradient-text-gold mb-4">
            Verify Everything
          </h2>
          <p className="text-[var(--color-cream-dim)] text-lg max-w-2xl mx-auto">
            Don&apos;t trust, verify. Every address is public on the XRP Ledger.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto space-y-4">
          <CopyableAddress
            label="💀 Issuer (Blackholed)"
            address={XRPL_CONFIG.issuer}
            explorerUrl={`https://xrpscan.com/account/${XRPL_CONFIG.issuer}`}
            delay={0.1}
          />
          <CopyableAddress
            label="🏦 Distributor"
            address={XRPL_CONFIG.distributor}
            explorerUrl={`https://xrpscan.com/account/${XRPL_CONFIG.distributor}`}
            delay={0.2}
          />
          <CopyableAddress
            label="💧 AMM Liquidity Pool"
            address={XRPL_CONFIG.ammPool}
            explorerUrl={`https://xrpscan.com/account/${XRPL_CONFIG.ammPool}`}
            delay={0.3}
          />
        </div>
      </div>
    </section>
  );
}
