"use client";

import { Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const FOOTER_LINKS = [
  { label: "Games", href: "/" },
  { label: "Leaderboard", href: "/leaderboard/" },
  { label: "Discord", href: "https://discord.gg/fuzzynuts", external: true },
  { label: "Twitter / X", href: "https://x.com/fuzzynutsxrp", external: true },
  { label: "Web3 Integration", href: "/tokenomics" },
];

export function Footer() {
  return (
    <footer
      className="relative border-t border-white/5 bg-[#0a0613]"
      role="contentinfo"
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <Image
              src="/images/branding/logo-nav.webp"
              alt=""
              width={28}
              height={20}
              className="rounded"
              loading="lazy"
            />
            <span className="text-sm font-display font-bold text-cream">
              FuzzyNuts
            </span>
          </div>

          {/* Links */}
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap items-center gap-4 sm:gap-6">
              {FOOTER_LINKS.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--color-cream-dim)] hover:text-cream transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-xs text-[var(--color-cream-dim)] hover:text-cream transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-[var(--color-cream-dim)]/50">
          <p className="flex items-center gap-1">
            © {new Date().getFullYear()} FuzzyNuts. Built with{" "}
            <Heart size={10} className="text-[var(--color-hot-pink)] inline" fill="currentColor" />{" "}
            not financial advice.
          </p>
          <p>
            Powered by{" "}
            <a
              href="https://xrpl.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-gold hover:underline"
            >
              XRP Ledger
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
