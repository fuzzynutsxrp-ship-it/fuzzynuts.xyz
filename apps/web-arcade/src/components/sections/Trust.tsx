"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Copy, Check, ExternalLink, Terminal, Bot, Users } from "lucide-react";
import { useState, useCallback } from "react";
import { CyberCard } from "@/components/ui/CyberCard";
import { TOKENOMICS, XRPL_CONFIG } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   Trust — "Don't Trust. Verify."

   Merges the old Tokenomics + OnChainVerification sections and the
   two trust-flavored items rescued from the cut Features grid
   (Anti-Bot, Community-Governed). Moved high on the page so the
   rug-pull objection is answered right after the prize promise.

   Heading is real text (the old section used a tokenomics.png
   wordmark) for a consistent type scale + selectable/SEO text.
   ───────────────────────────────────────────────────────────── */

/* ── Distribution legend row ──
   Plain data row (dot · label · % · amount). No progress-bar track,
   so a small allocation like the 2% founder slice reads as a real
   line item instead of a broken/unfilled rail. The donut carries the
   proportional visualization. */
function LegendRow({
  item,
  index,
  last,
  active,
  onHover,
}: {
  item: (typeof TOKENOMICS)[number];
  index: number;
  last: boolean;
  active: number | null;
  onHover: (i: number | null) => void;
}) {
  const isActive = active === index;
  const dimmed = active !== null && !isActive;
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      className={`flex items-center justify-between gap-4 -mx-3 px-3 py-4 rounded-lg cursor-default transition-colors ${
        last ? "" : "border-b border-[var(--color-glass-border)]"
      } ${isActive ? "bg-[var(--color-glass-hover)]" : ""}`}
      style={{ opacity: dimmed ? 0.45 : 1, transition: "opacity 0.2s ease" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="rounded-full shrink-0 transition-all"
          style={{
            width: isActive ? 14 : 12,
            height: isActive ? 14 : 12,
            background: item.color,
            boxShadow: `0 0 ${isActive ? 16 : 10}px ${item.color}${isActive ? "99" : "66"}`,
          }}
        />
        <span className="font-display font-semibold text-[var(--color-cream)] truncate">
          {item.label}
        </span>
      </div>
      <div className="flex items-baseline gap-2 shrink-0">
        <span className="font-display font-black text-xl text-[var(--color-gold)] tabular-nums">
          {item.percentage}%
        </span>
        <span className="text-xs text-[var(--color-cream-dim)] tabular-nums">
          {item.amount}
        </span>
      </div>
    </motion.div>
  );
}

/* ── Donut chart ──
   Donut is the right tool here: 3 segments, part-to-whole, dominant
   80% share (perceptual studies show donut ≈ pie accuracy and that it
   handles a dominant slice well). The fixes that matter for a donut are
   distinct high-contrast colors and dark separator strokes so the tiny
   2% slice stays delineated. Hover ties a slice to its legend row. */
function DonutChart({
  active,
  onHover,
}: {
  active: number | null;
  onHover: (i: number | null) => void;
}) {
  const total = TOKENOMICS.reduce((sum, t) => sum + t.percentage, 0);
  const segments: {
    path: string;
    color: string;
    percentage: number;
    label: string;
  }[] = [];
  let currentAngle = -90;

  for (const item of TOKENOMICS) {
    const angle = (item.percentage / total) * 360;
    const startRad = (currentAngle * Math.PI) / 180;
    const endRad = ((currentAngle + angle) * Math.PI) / 180;
    const x1 = 100 + 80 * Math.cos(startRad);
    const y1 = 100 + 80 * Math.sin(startRad);
    const x2 = 100 + 80 * Math.cos(endRad);
    const y2 = 100 + 80 * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;
    segments.push({
      path: `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`,
      color: item.color,
      percentage: item.percentage,
      label: item.label,
    });
    currentAngle += angle;
  }

  return (
    <div className="relative w-72 h-72 sm:w-80 sm:h-80 lg:w-96 lg:h-96 mx-auto">
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full overflow-visible"
        role="img"
        aria-label="Token distribution: 80% AMM Liquidity, 18% Community Nut Jar, 2% Founder"
      >
        <title>Tokenomics Distribution</title>
        <motion.g
          initial={{ rotate: -90, opacity: 0 }}
          whileInView={{ rotate: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: "100px 100px" }}
        >
          {segments.map((seg, i) => {
            const dimmed = active !== null && active !== i;
            return (
              <path
                key={seg.label}
                d={seg.path}
                fill={seg.color}
                stroke="#0a0f0a"
                strokeWidth={2.5}
                strokeLinejoin="round"
                onMouseEnter={() => onHover(i)}
                onMouseLeave={() => onHover(null)}
                style={{
                  cursor: "pointer",
                  opacity: dimmed ? 0.32 : 1,
                  filter:
                    active === i
                      ? `drop-shadow(0 0 14px ${seg.color})`
                      : `drop-shadow(0 0 8px ${seg.color}50)`,
                  transition: "opacity 0.2s ease, filter 0.2s ease",
                }}
              >
                <title>{`${seg.label}: ${seg.percentage}%`}</title>
              </path>
            );
          })}
        </motion.g>

        {/* Center hole — content (mascot + supply label) is an HTML overlay below */}
        <circle cx="100" cy="100" r="45" fill="#0a0f0a" />
      </svg>

      {/* Center overlay: on-brand mascot + fixed-supply label. pointer-events
          off so hovering a donut slice underneath still works. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
        {/* translate-x nudges the squirrel right so its feet/body sit on the
            centerline — the bushy tail otherwise pushes the box-centered image
            visually left. % translate scales the nudge with the responsive size. */}
        {/* DEGEN OVERHAUL START — interactive mascot in the donut core.
            Wrapper carries logo-degen (idle bounce + hover neon glow);
            inner image keeps its translate-x centering nudge so the bounce
            transform on the wrapper never disturbs it. pointer-events-auto
            sits over the empty donut hole, so donut-slice hovers still work. */}
        <span className="logo-degen pointer-events-auto inline-block mb-0.5">
          <Image
            src="/images/branding/logo_512.png"
            alt=""
            width={80}
            height={80}
            className="w-16 lg:w-20 h-auto translate-x-[13%]"
            style={{ imageRendering: "pixelated" }}
          />
        </span>
        {/* DEGEN OVERHAUL END */}
        <span className="font-display font-black text-2xl lg:text-3xl text-[var(--color-gold)] leading-none">
          321B
        </span>
        <span className="mt-0.5 text-[10px] lg:text-xs text-[var(--color-cream-dim)] tracking-wide">
          Fixed Supply
        </span>
      </div>
    </div>
  );
}

/* ── On-chain ledger entry ── */
const LEDGER_ACCENTS: Record<string, string> = {
  issuer: "#ef4444",
  distributor: "#FBBF24",
  amm: "#10B981",
};

function LedgerEntry({
  index,
  label,
  tag,
  address,
  explorerUrl,
  accentColor,
  delay,
}: {
  index: number;
  label: string;
  tag?: string;
  address: string;
  explorerUrl: string;
  accentColor: string;
  delay: number;
}) {
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
      <div className="ledger-entry__bar" style={{ background: accentColor }} />
      <div className="flex-1 min-w-0 py-4 sm:py-5 pr-4 sm:pr-5 pl-5 sm:pl-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-2.5 flex-wrap">
          <span className="font-mono text-[10px] tabular-nums opacity-40 select-none" style={{ color: accentColor }}>
            {String(index).padStart(2, "0")}
          </span>
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider" style={{ color: accentColor }}>
            {label}
          </span>
          {tag && (
            <span
              className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
              style={{ color: accentColor, background: `color-mix(in srgb, ${accentColor} 10%, transparent)` }}
            >
              {tag}
            </span>
          )}
          <div className="flex-1" />
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
              <Copy size={14} className="opacity-40 group-hover:opacity-70 transition-opacity" />
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Trust chips rescued from the cut Features grid ── */
// DEGEN OVERHAUL START — irreverent titles, every fact intact
const TRUST_CHIPS = [
  {
    icon: Bot,
    title: "Anti-Cheat",
    desc: "Score caps, minimum play durations, rate limits, and verification keep the arcade fair — no scripts, no exploits.",
    color: "#3B82F6",
  },
  {
    icon: Users,
    title: "Community-Governed",
    desc: "The community shapes what games come next, what features matter, and how the platform evolves.",
    color: "#a855f7",
  },
];
// DEGEN OVERHAUL END

export function Trust() {
  // Shared hover state so a donut slice and its legend row highlight together.
  const [activeSlice, setActiveSlice] = useState<number | null>(null);

  return (
    <section id="tokenomics" className="py-16 md:py-20 relative overflow-hidden">
      {/* Subtle scrim — darkens the bright forest backdrop behind the content
          so the legend/text stays legible, while the edges keep the theme. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 92% 72% at 50% 50%, rgba(1,5,8,0.74) 0%, rgba(1,5,8,0.5) 55%, transparent 100%)",
        }}
      />
      <div className="container-main relative z-10">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="text-center mb-12 md:mb-16"
        >
          {/* DEGEN OVERHAUL START — same facts, zero corporate tone (crisp pass:
              text-hero-glow → text-hero-glow-crisp tightens the blur 12+28 px →
              10+22 px; text-degen-crisp adds antialiasing + paint-order so the
              gold gradient-clip text stays razor sharp under the halo.) */}
          <h2 className="font-display text-4xl md:text-5xl font-black gradient-text-gold text-hero-glow-crisp text-degen-crisp mb-4">
            Built to Last
          </h2>
          <p className="text-[var(--color-cream-dim)] text-lg max-w-2xl mx-auto leading-relaxed">
            Fair play, transparent systems, and a community-first approach.
            Every score is verified, every leaderboard is public, and every
            player competes on equal footing.
          </p>
          {/* DEGEN OVERHAUL END */}
        </motion.div>

        {/* ── Distribution: donut hero + legend + key facts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center mb-16">
          <div className="flex justify-center">
            <DonutChart active={activeSlice} onHover={setActiveSlice} />
          </div>

          <div>
            {/* Legend — plain rows, no progress tracks */}
            <div className="mb-2">
              {TOKENOMICS.map((item, i) => (
                <LegendRow
                  key={item.label}
                  item={item}
                  index={i}
                  last={i === TOKENOMICS.length - 1}
                  active={activeSlice}
                  onHover={setActiveSlice}
                />
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ delay: 0.3 }}
              className="mt-8"
            >
              <CyberCard accentColor="gold" className="p-5 space-y-3">
                {/* DEGEN OVERHAUL — same facts, degen label */}
                <h3 className="font-display font-bold text-[var(--color-brand-gold)] text-sm uppercase tracking-wider">
                  The Receipts 🧾
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[var(--color-cream-dim)]">Total Supply</p>
                    <p className="font-bold text-[var(--color-cream)]">321,000,000,000</p>
                  </div>
                  <div>
                    <p className="text-[var(--color-cream-dim)]">Trading Fee</p>
                    <p className="font-bold text-[var(--color-cream)]">1%</p>
                  </div>
                  <div>
                    <p className="text-[var(--color-cream-dim)]">Issuer Status</p>
                    <p className="font-bold text-red-400">💀 Blackholed</p>
                  </div>
                  <div>
                    <p className="text-[var(--color-cream-dim)]">DEX</p>
                    <p className="font-bold text-neon-green">XRPL Native AMM</p>
                  </div>
                </div>
              </CyberCard>
            </motion.div>
          </div>
        </div>

        {/* ── On-chain ledger ── */}
        <div className="max-w-2xl mx-auto mb-12">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05, duration: 0.3 }}
            className="ledger-terminal__header"
          >
            <div className="flex items-center gap-2">
              <Terminal size={13} className="text-[var(--color-neon-green)] opacity-70" />
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

          <div className="ledger-terminal__body">
            <LedgerEntry
              index={1}
              label="Issuer"
              tag="Blackholed"
              address={XRPL_CONFIG.issuer}
              explorerUrl={`https://xrpscan.com/account/${XRPL_CONFIG.issuer}`}
              accentColor={LEDGER_ACCENTS.issuer}
              delay={0.1}
            />
            <LedgerEntry
              index={2}
              label="Distributor"
              address={XRPL_CONFIG.distributor}
              explorerUrl={`https://xrpscan.com/account/${XRPL_CONFIG.distributor}`}
              accentColor={LEDGER_ACCENTS.distributor}
              delay={0.18}
            />
            <LedgerEntry
              index={3}
              label="AMM Liquidity Pool"
              address={XRPL_CONFIG.ammPool}
              explorerUrl={`https://xrpscan.com/account/${XRPL_CONFIG.ammPool}`}
              accentColor={LEDGER_ACCENTS.amm}
              delay={0.26}
            />
          </div>
        </div>

        {/* ── Trust chips (rescued from Features) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {TRUST_CHIPS.map((chip, i) => (
            <motion.div
              key={chip.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex items-start gap-3 p-4 rounded-xl"
              style={{ background: "#0a0613", border: "1.5px solid rgba(255,46,136,0.15)", boxShadow: "0 0 10px rgba(255,46,136,0.06), inset 0 0 12px rgba(124,58,237,0.06)" }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `color-mix(in srgb, ${chip.color} 12%, transparent)` }}
              >
                <chip.icon size={18} style={{ color: chip.color }} strokeWidth={2.5} />
              </div>
              <div>
                <p className="font-display font-bold text-sm mb-1" style={{ color: chip.color }}>
                  {chip.title}
                </p>
                <p className="text-xs text-[var(--color-cream-dim)] leading-relaxed">
                  {chip.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
