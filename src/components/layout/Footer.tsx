"use client";

import { motion } from "framer-motion";
import { XRPL_CONFIG } from "@/lib/utils";
import { Heart, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const SOCIAL_LINKS = [
  { icon: "𝕏", label: "X / Twitter", href: "https://x.com/fuzzynutsxrp" },
  { icon: "💬", label: "Discord", href: "#" },
  { icon: "✈️", label: "Telegram", href: "https://t.me/FuzzynutsXRP" },
];

const XRPL_LINKS = [
  { label: "XPMarket", href: `https://xpmarket.com/token/NUT-${XRPL_CONFIG.issuer}` },
  { label: "XRPScan", href: `https://xrpscan.com/account/${XRPL_CONFIG.issuer}` },
  { label: "DEX Trading", href: `https://xpmarket.com/dex/NUT-${XRPL_CONFIG.issuer}/XRP` },
];

export function Footer() {
  return (
    <footer className="relative pt-20 pb-8 border-t border-[rgba(245,196,66,0.12)]" role="contentinfo">
      <div className="container-main">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/images/branding/logo-nav.webp"
                alt="Fuzzynuts"
                width={48}
                height={32}
                className="rounded-md"
                loading="lazy"
              />
              <span className="font-display font-bold text-xl gradient-text-gold">FUZZYNUTS</span>
            </div>
            <p className="text-sm text-[var(--color-cream-dim)] leading-relaxed mb-6">
              The nuttiest meme coin on XRPL. Play games, earn $NUT, and join a community
              that refuses to take crypto seriously.
            </p>
            <div className="flex gap-3">
              {SOCIAL_LINKS.map((link) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.15, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-[rgba(245,196,66,0.08)] border border-[rgba(245,196,66,0.12)] hover:bg-[rgba(245,196,66,0.15)] hover:border-[rgba(245,196,66,0.25)] transition-all"
                  aria-label={link.label}
                >
                  {link.icon}
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ delay: 0.1 }}
          >
            <h4 className="font-display font-bold text-sm uppercase tracking-wider text-[var(--color-gold)] mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {[
                { label: "Arcade", href: "#games" },
                { label: "Leaderboard", href: "/leaderboard/", route: true },
                { label: "Tokenomics", href: "#tokenomics" },
                { label: "Get $NUT", href: "#how-to-get" },
                { label: "Litepaper", href: "/litepaper.html" },
              ].map((link) => (
                <li key={link.label}>
                  {link.route ? (
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--color-cream-dim)] hover:text-[var(--color-neon-green)] transition-colors inline-flex items-center gap-1.5 group"
                    >
                      <Trophy size={13} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-sm text-[var(--color-cream-dim)] hover:text-[var(--color-gold)] transition-colors inline-flex items-center gap-1 group"
                    >
                      <span className="w-0 group-hover:w-2 transition-all overflow-hidden text-[var(--color-gold)]">→</span>
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* XRPL Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ delay: 0.2 }}
          >
            <h4 className="font-display font-bold text-sm uppercase tracking-wider text-[var(--color-gold)] mb-4">
              On-Chain
            </h4>
            <ul className="space-y-2">
              {XRPL_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--color-cream-dim)] hover:text-[var(--color-gold)] transition-colors inline-flex items-center gap-1"
                  >
                    {link.label}
                    <span className="text-xs">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="section-divider mb-6" />

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-cream-dim)]">
          <p className="flex items-center gap-1">
            © {new Date().getFullYear()} Fuzzynuts. Built with
            <Heart size={12} className="text-red-400 inline" fill="currentColor" />
            not financial advice.
          </p>
          <p className="flex items-center gap-1">
            Powered by
            <a
              href="https://xrpl.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-gold)] hover:underline font-bold"
            >
              XRP Ledger
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
