"use client";

/**
 * PriceTicker — live $NUT price + market cap, plus Chart / Buy CTAs.
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
      {/* Price / Market Cap — solid dark, warm gold border */}
      <div
        className="flex items-center gap-4 px-4 py-2 rounded-md bg-[#0a0a0a] border-2 border-brand-gold/30"
        style={{ boxShadow: "0 0 20px rgba(251,191,36,0.12), 0 0 40px rgba(251,191,36,0.06), inset 0 1px 0 rgba(251,191,36,0.1)" }}
      >
        <div className="text-left">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-cream-dim)]">Price</p>
          <p className="font-mono font-bold text-sm text-brand-gold tabular-nums">{fmtPrice(priceUsd)}</p>
        </div>
        <div className="w-px h-7 bg-brand-gold/20" aria-hidden="true" />
        <div className="text-left">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-cream-dim)]">Market Cap</p>
          <p className="font-mono font-bold text-sm text-amber-500 tabular-nums">
            {mcap != null ? `$${formatNumber(mcap)}` : "—"}
          </p>
        </div>
      </div>

      <a
        href={CHART_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-bold text-brand-gold border-2 border-brand-gold/40 bg-[#0a0a0a] hover:bg-[rgba(251,191,36,0.08)] transition-all shadow-[0_0_12px_rgba(251,191,36,0.15),inset_0_1px_0_rgba(251,191,36,0.1)]"
      >
        <LineChart size={16} />
        Chart
      </a>
      <a
        href={BUY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-black text-forest-dark bg-gradient-to-r from-brand-gold to-amber-500 hover:shadow-[0_0_28px_rgba(251,191,36,0.45)] transition-all"
      >
        <ShoppingCart size={16} />
        Buy $NUT
      </a>
    </motion.div>
  );
}

export default PriceTicker;
