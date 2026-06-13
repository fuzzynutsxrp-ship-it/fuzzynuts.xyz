"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * PriceTicker — live $NUT price + market cap, plus Chart / Buy CTAs.
 *
 * Price comes from the backend (GET /api/rewards/price), which computes
 * it from the on-chain AMM and caches it. No client-side xrpl (keeps the
 * bundle small and avoids a hard dependency). If the fetch fails, price/
 * mcap fall back to "—" and the Chart/Buy links still work.
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LineChart, ShoppingCart } from "lucide-react";
import { XRPL_CONFIG, formatNumber } from "@/lib/utils";
import { API_REWARDS } from "@/features/arcade/constants";

const ISSUER = XRPL_CONFIG.issuer;
const SUPPLY = XRPL_CONFIG.totalSupply;

const CHART_URL = `https://xpmarket.com/token/NUT-${ISSUER}`;
const BUY_URL = `https://xpmarket.com/dex/NUT-${ISSUER}/XRP`;

function fmtPrice(p: number | null): string {
  if (p == null || !isFinite(p) || p <= 0) return "—";
  return p < 0.01
    ? `$${p.toPrecision(3)}`
    : `$${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function PriceTicker() {
  const [priceUsd, setPriceUsd] = useState<number | null>(null);
  const [mcap, setMcap] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_REWARDS}/price`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d || typeof d.price_usd !== "number" || !(d.price_usd > 0)) return;
        setPriceUsd(d.price_usd);
        setMcap(typeof d.market_cap === "number" ? d.market_cap : d.price_usd * SUPPLY);
      })
      .catch(() => {
        /* leave null → renders "—"; Chart/Buy links still work */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1, duration: 0.5 }}
      className="mt-6 flex flex-wrap items-center justify-center gap-2.5"
    >
      {/* DEGEN OVERHAUL START — kill glassmorphism: solid bg, thick
          hot-pink border, sharp corners, outer glow (no backdrop-blur,
          no rounded-xl pill, no neon-ring soft inset). */}
      <div className="flex items-center gap-4 px-4 py-2 rounded-md bg-degen-950 border-2 border-hot-pink shadow-[0_0_20px_rgba(255,46,136,0.45)]">
        <div className="text-left">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-cream-dim)]">
            Price
          </p>
          <p className="font-mono font-bold text-sm text-[var(--color-gold)] tabular-nums">
            {fmtPrice(priceUsd)}
          </p>
        </div>
        <div className="w-px h-7 bg-hot-pink/30" aria-hidden="true" />
        <div className="text-left">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-cream-dim)]">
            Market Cap
          </p>
          <p className="font-mono font-bold text-sm text-[var(--color-acid)] tabular-nums">
            {mcap != null ? `$${formatNumber(mcap)}` : "—"}
          </p>
        </div>
      </div>
      {/* DEGEN OVERHAUL END */}

      <a
        href={CHART_URL}
        target="_blank"
        rel="noopener noreferrer"
        // DEGEN OVERHAUL — Chart button: solid degen-950, thick 2 px gold border, sharp 6 px corners, outer gold glow
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-bold text-[var(--color-gold)] border-2 border-[var(--color-gold)] bg-degen-950 hover:bg-[rgba(251,191,36,0.12)] transition-all shadow-[0_0_12px_rgba(251,191,36,0.35)]"
      >
        <LineChart size={16} />
        Chart
      </a>
      <a
        href={BUY_URL}
        target="_blank"
        rel="noopener noreferrer"
        // DEGEN OVERHAUL — Buy button: same gradient, just sharp 6 px corners (was 12 px rounded-xl)
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-black text-[var(--color-degen-black)] bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-hot-pink)] hover:shadow-[0_0_28px_rgba(255,46,136,0.55)] transition-all"
      >
        <ShoppingCart size={16} />
        Buy $NUT
      </a>
      {/* DEGEN OVERHAUL END */}
    </motion.div>
  );
}

export default PriceTicker;
