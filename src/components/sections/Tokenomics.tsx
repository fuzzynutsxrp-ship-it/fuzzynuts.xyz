"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { CyberCard } from "@/components/ui/CyberCard";
import { TOKENOMICS } from "@/lib/utils";

function AnimatedBar({
  item,
  index,
}: {
  item: (typeof TOKENOMICS)[number];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-3.5 h-3.5 rounded-full"
            style={{
              background: item.color,
              boxShadow: `0 0 12px ${item.color}50`,
            }}
          />
          <span className="font-display font-semibold text-[var(--color-cream)]">
            {item.label}
          </span>
        </div>
        <div className="text-right">
          <span className="font-bold text-[var(--color-gold)]">
            {item.percentage}%
          </span>
          <span className="text-xs text-[var(--color-cream-dim)] ml-2">
            ({item.amount})
          </span>
        </div>
      </div>

      {/* Animated bar */}
      <div className="h-3 rounded-full bg-[rgba(251,191,36,0.08)] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${item.percentage}%` }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{
            duration: 1.2,
            delay: 0.2 + index * 0.1,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="h-full rounded-full relative"
          style={{
            background: `linear-gradient(90deg, ${item.color}CC, ${item.color})`,
            boxShadow: `0 0 15px ${item.color}40`,
          }}
        >
          {/* Shimmer effect */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--color-glass-border-strong), transparent)",
              backgroundSize: "200% 100%",
              animation: "shimmer 2s linear infinite",
            }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

function DonutChart() {
  const total = TOKENOMICS.reduce((sum, t) => sum + t.percentage, 0);

  // Build SVG paths
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
    const path = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;

    segments.push({
      path,
      color: item.color,
      percentage: item.percentage,
      label: item.label,
    });

    currentAngle += angle;
  }

  return (
    <div className="relative w-64 h-64 mx-auto">
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        role="img"
        aria-label="Token distribution chart: 80% AMM Liquidity, 18% Prize Pool, 2% Dev/Ops"
      >
        <title>Tokenomics Distribution</title>

        {/* Segments - always visible, animate rotation on entry */}
        <motion.g
          initial={{ rotate: -90, opacity: 0 }}
          whileInView={{ rotate: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: "100px 100px" }}
        >
          {segments.map((seg, i) => (
            <motion.path
              key={seg.label}
              d={seg.path}
              fill={seg.color}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
              style={{
                filter: `drop-shadow(0 0 10px ${seg.color}50)`,
              }}
            >
              <title>{`${seg.label}: ${seg.percentage}%`}</title>
            </motion.path>
          ))}
        </motion.g>

        {/* Center hole */}
        <circle cx="100" cy="100" r="45" fill="#0a0f0a" />

        {/* Center text - always visible */}
        <text
          x="100"
          y="96"
          textAnchor="middle"
          fill="#FBBF24"
          fontSize="16"
          fontWeight="bold"
          fontFamily="Outfit, sans-serif"
        >
          321B
        </text>
        <text
          x="100"
          y="113"
          textAnchor="middle"
          fill="#b0a890"
          fontSize="9"
          fontFamily="Inter, sans-serif"
        >
          Fixed Supply
        </text>
      </svg>
    </div>
  );
}

export function Tokenomics() {
  return (
    <section id="tokenomics" className="py-12 relative overflow-hidden">
      {/* Section background removed — page-level herobackground3.jpg
          shows through. */}
      <div className="container-main relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          className="text-center mb-16"
        >
          <Image
            src="/tokenomics.png"
            alt="Tokenomics"
            width={720}
            height={140}
            className="mx-auto mb-4 h-10 sm:h-12 md:h-14 w-auto drop-shadow-[0_0_24px_rgba(245,196,66,0.45)]"
          />
          <p className="mt-4 text-[var(--color-cream-dim)] text-lg max-w-2xl mx-auto">
            321 billion $NUT. Permanently fixed supply. Issuer blackholed. What
            you see is what you get.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Pie chart */}
          <div>
            <DonutChart />
          </div>

          {/* Bars + details */}
          <div className="space-y-6">
            {TOKENOMICS.map((item, i) => (
              <AnimatedBar key={item.label} item={item} index={i} />
            ))}

            {/* Key facts */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ delay: 0.3 }}
              className="mt-8"
            >
              <CyberCard accentColor="gold" className="p-5 space-y-3">
                <h4 className="font-display font-bold text-[var(--color-brand-gold)] text-sm uppercase tracking-wider">
                  Key Facts
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[var(--color-cream-dim)]">
                      Total Supply
                    </p>
                    <p className="font-bold text-[var(--color-cream)]">
                      321,000,000,000
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--color-cream-dim)]">Trading Fee</p>
                    <p className="font-bold text-[var(--color-cream)]">1%</p>
                  </div>
                  <div>
                    <p className="text-[var(--color-cream-dim)]">
                      Issuer Status
                    </p>
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
      </div>
    </section>
  );
}
