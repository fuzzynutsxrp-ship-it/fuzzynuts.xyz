"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Wallet,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Gift,
} from "lucide-react";
import { useWalletStore } from "@/store/wallet";
import { CyberCard } from "@/components/ui/CyberCard";

/* ═══════════════════════════════════════════════════════════════
   Types & Constants
   ═══════════════════════════════════════════════════════════════ */

interface EligibilityData {
  eligible: boolean;
  rank: number | null;
  game: string | null;
  prize: number | null;
  claimed: boolean;
  txHash: string | null;
}

type ClaimStatus = "idle" | "checking" | "claiming" | "success" | "error";

const API_BASE = "https://world.fuzzynuts.xyz/api/rewards";

const PRIZE_TIERS: Record<number, { label: string; amount: string; emoji: string }> = {
  1: { label: "1st Place", amount: "250,000 $NUT", emoji: "🥇" },
  2: { label: "2nd Place", amount: "150,000 $NUT", emoji: "🥈" },
  3: { label: "3rd Place", amount: "100,000 $NUT", emoji: "🥉" },
};

function getCurrentWeekKey(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/* ═══════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════ */

export function ClaimRewards() {
  const { address, isConnected, connect, isConnecting } = useWalletStore();
  const [eligibility, setEligibility] = useState<EligibilityData | null>(null);
  const [status, setStatus] = useState<ClaimStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null);

  /* ── Check eligibility ── */
  const checkEligibility = useCallback(async () => {
    if (!address) return;
    setStatus("checking");
    setError(null);

    try {
      const week = getCurrentWeekKey();
      const url = `${API_BASE}/eligibility?wallet=${encodeURIComponent(address)}&week=${week}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data: EligibilityData = await res.json();
      setEligibility(data);
      if (data.claimed && data.txHash) setClaimTxHash(data.txHash);
      setStatus("idle");
    } catch {
      // If endpoint doesn't exist yet, show graceful fallback
      setEligibility({ eligible: false, rank: null, game: null, prize: null, claimed: false, txHash: null });
      setStatus("idle");
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) checkEligibility();
  }, [isConnected, address, checkEligibility]);

  /* ── Claim reward ── */
  const handleClaim = async () => {
    if (!address || !eligibility?.eligible) return;
    setStatus("claiming");
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          week: getCurrentWeekKey(),
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server returned ${res.status}`);
      }

      const result = await res.json();
      setClaimTxHash(result.txHash || null);
      setEligibility((prev) => prev ? { ...prev, claimed: true, txHash: result.txHash } : prev);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim failed — please try again");
      setStatus("error");
    }
  };

  const weekKey = getCurrentWeekKey();
  const tier = eligibility?.rank ? PRIZE_TIERS[eligibility.rank] : null;

  /* ═══════════════════════════════════════════════════════
     Not Connected
     ═══════════════════════════════════════════════════════ */
  if (!isConnected || !address) {
    return (
      <CyberCard accentColor="gold">
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
            <Gift size={28} className="text-brand-gold" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-display text-lg font-bold text-cream mb-1">
              Weekly Prize Pool
            </h3>
            <p className="text-sm text-cream-dim">
              Connect your wallet to check if you&apos;ve won $NUT prizes this week.
            </p>
          </div>
          <motion.button
            onClick={() => connect("xaman")}
            disabled={isConnecting}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-gradient-to-r from-brand-gold to-yellow-500
                       text-forest-dark font-bold text-sm shrink-0
                       hover:shadow-[0_0_25px_rgba(251,191,36,0.4)]
                       transition-all min-h-[44px] cursor-pointer
                       disabled:opacity-50"
          >
            <Wallet size={16} />
            {isConnecting ? "Connecting…" : "Connect"}
          </motion.button>
        </div>
      </CyberCard>
    );
  }

  /* ═══════════════════════════════════════════════════════
     Checking Eligibility
     ═══════════════════════════════════════════════════════ */
  if (status === "checking") {
    return (
      <CyberCard accentColor="gold">
        <div className="p-8 flex flex-col items-center justify-center text-center">
          <Loader2 size={28} className="text-brand-gold animate-spin mb-3" />
          <p className="text-sm text-cream-dim">
            Checking prize eligibility for {weekKey}…
          </p>
        </div>
      </CyberCard>
    );
  }

  /* ═══════════════════════════════════════════════════════
     Already Claimed
     ═══════════════════════════════════════════════════════ */
  if (eligibility?.claimed || status === "success") {
    return (
      <CyberCard accentColor="green">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="w-14 h-14 rounded-xl bg-neon-green/15 border border-neon-green/30 flex items-center justify-center shrink-0"
            >
              <CheckCircle size={28} className="text-neon-green" />
            </motion.div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="font-display text-lg font-bold text-neon-green mb-1">
                Rewards Claimed! ✅
              </h3>
              <p className="text-sm text-cream-dim">
                {tier
                  ? `${tier.emoji} ${tier.label} — ${tier.amount} sent to your wallet.`
                  : "Your $NUT prize has been sent to your wallet."}
              </p>
              {(claimTxHash || eligibility?.txHash) && (
                <a
                  href={`https://xrpscan.com/tx/${claimTxHash || eligibility?.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs text-brand-gold hover:underline font-mono"
                >
                  <ExternalLink size={12} />
                  View on XRPScan
                </a>
              )}
            </div>
          </div>
        </div>
      </CyberCard>
    );
  }

  /* ═══════════════════════════════════════════════════════
     Not Eligible
     ═══════════════════════════════════════════════════════ */
  if (!eligibility?.eligible || !tier) {
    return (
      <CyberCard accentColor="gold">
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
            <Trophy size={28} className="text-brand-gold opacity-50" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-display text-lg font-bold text-cream mb-1">
              No Prize This Week
            </h3>
            <p className="text-sm text-cream-dim">
              You didn&apos;t place in the Top 3 for {weekKey}. Keep playing to climb the{" "}
              <a href="/leaderboard/" className="text-neon-green hover:underline font-semibold">
                leaderboard
              </a>{" "}
              and win next week!
            </p>
          </div>
        </div>
      </CyberCard>
    );
  }

  /* ═══════════════════════════════════════════════════════
     Eligible — Claim CTA
     ═══════════════════════════════════════════════════════ */
  return (
    <CyberCard accentColor="gold">
      <div className="p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          {/* Trophy */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 10, stiffness: 200 }}
            className="text-5xl mb-4"
          >
            {tier.emoji}
          </motion.div>

          <h3 className="font-display text-2xl font-bold gradient-text-gold mb-1">
            {tier.label} — {eligibility.game ? eligibility.game : "Arcade"}
          </h3>
          <p className="text-cream-dim text-sm mb-1">
            Week {weekKey}
          </p>
          <p className="font-display text-3xl font-black text-brand-gold mb-6">
            {tier.amount}
          </p>

          {/* Error banner */}
          <AnimatePresence>
            {status === "error" && error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full mb-4"
              >
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  <AlertTriangle size={16} className="shrink-0" />
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Claim button */}
          <motion.button
            onClick={handleClaim}
            disabled={status === "claiming"}
            whileHover={{ scale: 1.04, boxShadow: "0 0 35px rgba(245,196,66,0.5)" }}
            whileTap={{ scale: 0.96 }}
            className="w-full max-w-xs px-8 py-4 rounded-xl
                       bg-gradient-to-r from-brand-gold to-yellow-500
                       text-forest-dark font-bold text-base
                       hover:shadow-[0_0_30px_rgba(245,196,66,0.5)]
                       transition-all disabled:opacity-60 cursor-pointer"
            style={{ animation: status !== "claiming" ? "pulse-gold 3s ease-in-out infinite" : "none" }}
          >
            {status === "claiming" ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                Processing on XRPL…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Gift size={18} />
                Claim {tier.amount}
              </span>
            )}
          </motion.button>

          <p className="text-[11px] text-cream-dim/50 mt-3">
            Prize is sent directly to your connected wallet via XRPL.
          </p>
        </div>
      </div>
    </CyberCard>
  );
}
