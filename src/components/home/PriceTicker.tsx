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
  return p < 0.01 ? `$${p.toPrecision(3)}` : `$${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
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
    return () => { cancelled = true; };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1, duration: 0.5 }}
      className="mt-6 flex flex-wrap items-center justify-center gap-2.5"
    >
      {/* DEGEN OVERHAUL START — neon-ringed price pill */}
      <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-degen-950/70 backdrop-blur-md neon-ring-pink">
        <div className="text-left">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-cream-dim)]">Price</p>
          <p className="font-mono font-bold text-sm text-[var(--color-gold)] tabular-nums">{fmtPrice(priceUsd)}</p>
        </div>
        <div className="w-px h-7 bg-hot-pink/30" aria-hidden="true" />
        <div className="text-left">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-cream-dim)]">Market Cap</p>
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
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-[var(--color-gold)] border border-[rgba(251,191,36,0.35)] bg-[rgba(1,5,8,0.35)] backdrop-blur-sm hover:bg-[rgba(251,191,36,0.1)] transition-colors"
      >
        <LineChart size={16} />
        Chart
      </a>
      <a
        href={BUY_URL}
        target="_blank"
        rel="noopener noreferrer"
        // DEGEN OVERHAUL — gold→hot-pink Buy button with pink bloom
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-black text-[var(--color-degen-black)] bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-hot-pink)] hover:shadow-[0_0_28px_rgba(255,46,136,0.55)] transition-all"
      >
        <ShoppingCart size={16} />
        Buy $NUT
      </a>
    </motion.div>
  );
}

export default PriceTicker;
