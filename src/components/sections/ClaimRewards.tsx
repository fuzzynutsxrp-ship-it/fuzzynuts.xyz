"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Wallet,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Gift,
  X,
  ShieldCheck,
} from "lucide-react";
import { useWalletStore } from "@/store/wallet";
// DEGEN OVERHAUL — formatter from the lean @/lib/format module
import { formatNumber } from "@/lib/format";
import { CyberCard } from "@/components/ui/CyberCard";
// DEGEN OVERHAUL — shared degen confetti (was a local function below)
import { ConfettiBurst } from "@/components/ui/ConfettiBurst";
import {
  usePayoutEligibility,
  getCurrentWeekKey,
  type ClaimStatus,
} from "@/features/arcade";

/* ═══════════════════════════════════════════════════════════════
   Prize Tier Config
   ═══════════════════════════════════════════════════════════════ */

const PRIZE_TIERS: Record<number, { label: string; emoji: string }> = {
  1: { label: "1st Place", emoji: "🥇" },
  2: { label: "2nd Place", emoji: "🥈" },
  3: { label: "3rd Place", emoji: "🥉" },
};

/** Sub-cent memecoin price formatter, e.g. $0.0001234 */
function fmtSnapshotPrice(p?: number | null): string {
  if (!p || !isFinite(p)) return "—";
  return `$${Number(p).toPrecision(4)}`;
}

/* DEGEN OVERHAUL — local ConfettiBurst removed; now imported from
   @/components/ui/ConfettiBurst (extracted for reuse across claim
   success + score submission success + any future $NUT moment). */

/* ═══════════════════════════════════════════════════════════════
   Confirmation Modal
   ═══════════════════════════════════════════════════════════════ */

function ClaimConfirmModal({
  tier,
  game,
  onConfirm,
  onCancel,
  claiming,
}: {
  tier: { label: string; amount: string; emoji: string };
  game: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  claiming: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !claiming) onCancel();
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="relative w-full max-w-md rounded-2xl border border-brand-gold/20
                   bg-[rgba(1,5,8,0.95)] backdrop-blur-2xl shadow-2xl overflow-hidden"
      >
        {/* Close button */}
        {!claiming && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 rounded-lg text-cream-dim hover:text-cream
                       hover:bg-white/[0.06] transition-colors min-h-[44px] min-w-[44px]
                       flex items-center justify-center"
            aria-label="Cancel"
          >
            <X size={18} />
          </button>
        )}

        <div className="p-8 text-center">
          {/* Shield icon */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-gold/10 border border-brand-gold/20
                          flex items-center justify-center mb-5">
            <ShieldCheck size={32} className="text-brand-gold" />
          </div>

          <h3 className="font-display text-xl font-bold text-cream mb-2">
            Confirm Prize Claim
          </h3>

          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm">
              <span className="text-cream-dim">Prize</span>
              <span className="font-bold text-brand-gold">{tier.emoji} {tier.label} — {tier.amount}</span>
            </div>
            {game && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm">
                <span className="text-cream-dim">Game</span>
                <span className="text-cream font-medium">{game}</span>
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm">
              <span className="text-cream-dim">Network</span>
              <span className="text-cream font-medium">XRPL Mainnet</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm">
              <span className="text-cream-dim">Est. Gas</span>
              <span className="text-cream font-medium">~0.000012 XRP</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={claiming}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold
                         text-cream-dim border border-white/[0.1] hover:border-white/[0.2]
                         hover:bg-white/[0.04] transition-all min-h-[44px]
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <motion.button
              onClick={onConfirm}
              disabled={claiming}
              whileHover={claiming ? {} : { scale: 1.02 }}
              whileTap={claiming ? {} : { scale: 0.98 }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                         text-sm font-bold bg-gradient-to-r from-brand-gold to-yellow-500
                         text-forest-dark hover:shadow-[0_0_30px_rgba(245,196,66,0.5)]
                         transition-all min-h-[44px] disabled:opacity-60 cursor-pointer"
            >
              {claiming ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Gift size={16} />
                  Claim Prize
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ClaimRewards — Main Component
   ═══════════════════════════════════════════════════════════════ */

export function ClaimRewards() {
  const { address, isConnected, connect, isConnecting } = useWalletStore();

  const {
    eligibility,
    status,
    error,
    txHash,
    checkEligibility,
    startClaim,
    cancelClaim,
    confirmClaim,
  } = usePayoutEligibility(address);

  const weekKey = getCurrentWeekKey();
  const tier = eligibility?.rank ? PRIZE_TIERS[eligibility.rank] : null;

  // Dynamic, snapshot-locked amounts (USD announced + exact NUT @ snapshot price)
  const usdValue = eligibility?.usd_value ?? null;
  const nutAmount = eligibility?.nut_amount != null ? Number(eligibility.nut_amount) : null;
  const snapPrice = eligibility?.snapshot_price ?? null;
  const usdLabel = usdValue != null ? `$${usdValue}` : "—";
  const nutLabel =
    nutAmount != null
      ? `${formatNumber(nutAmount)} NUT @ ${fmtSnapshotPrice(snapPrice)} snapshot`
      : eligibility?.announced === false
      ? "amount set at Monday snapshot"
      : "—";

  /** Status-to-string for claim button */
  const getButtonLabel = useCallback(
    (claimStatus: ClaimStatus): string => {
      switch (claimStatus) {
        case "checking":
          return "Checking eligibility…";
        case "claiming":
          return "Processing on XRPL…";
        case "polling":
          return "Confirming transaction…";
        default:
          // DEGEN OVERHAUL — bag-the-bag copy, same dynamic value
          return usdValue != null ? `Bag ${usdLabel} in $NUT 🥜` : "Bag the Bag";
      }
    },
    [usdValue, usdLabel]
  );

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
          {/* DEGEN OVERHAUL START — degen copy + gold→hot-pink CTA (flow unchanged) */}
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-display text-lg font-bold text-cream mb-1">
              The Weekly Nut Hoard 🥜
            </h3>
            <p className="text-sm text-cream-dim">
              Connect your wallet and see if you bagged $NUT this week. Read-only — we can&apos;t touch your bag.
            </p>
          </div>
          <motion.button
            onClick={() => connect("xaman")}
            disabled={isConnecting}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-gradient-to-r from-brand-gold to-hot-pink
                       text-[var(--color-degen-black)] font-black text-sm shrink-0
                       hover:shadow-[0_0_28px_rgba(255,46,136,0.5)]
                       transition-all min-h-[44px] cursor-pointer
                       disabled:opacity-50"
          >
            <Wallet size={16} />
            {isConnecting ? "Connecting…" : "Connect & Check"}
          </motion.button>
          {/* DEGEN OVERHAUL END */}
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
     Already Claimed / Success with Confetti
     ═══════════════════════════════════════════════════════ */
  if (status === "already-claimed" || status === "success") {
    return (
      <CyberCard accentColor="green">
        <div className="p-6 sm:p-10 relative">
          {/* Confetti on fresh success */}
          {status === "success" && <ConfettiBurst />}

          <div className="flex flex-col items-center text-center gap-5">
            {/* Animated emoji entrance */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 10, stiffness: 150 }}
              className="text-6xl sm:text-7xl"
            >
              {status === "success" ? "🎉" : "✅"}
            </motion.div>

            {/* Headline */}
            <div>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-display text-2xl sm:text-3xl font-black gradient-text-neon mb-2"
              >
                {status === "success" ? "Prize Sent! 🌰" : "Rewards Claimed!"}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-cream-dim"
              >
                {tier
                  ? `${tier.emoji} ${tier.label} — ${usdLabel} (${nutLabel}) sent to your wallet.`
                  : "Your $NUT prize has been sent to your wallet."}
              </motion.p>
            </div>

            {/* Animated prize amount */}
            {tier && status === "success" && (
              <motion.p
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="font-display text-4xl sm:text-5xl font-black text-brand-gold text-glow-gold"
              >
                +{usdLabel}
              </motion.p>
            )}

            {/* Premium Transaction Verification Card */}
            {txHash && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="w-full max-w-sm"
              >
                <div className="rounded-xl bg-white/[0.03] border border-neon-green/20 p-4 space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <ShieldCheck size={14} className="text-neon-green" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-neon-green">
                      Verified on XRPL Ledger
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                    <span className="text-[11px] font-mono text-cream-dim truncate mr-2">
                      {txHash.slice(0, 12)}…{txHash.slice(-8)}
                    </span>
                    <a
                      href={`https://xrpscan.com/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg
                                 bg-neon-green/10 border border-neon-green/20
                                 text-[11px] font-bold text-neon-green
                                 hover:bg-neon-green/20 transition-colors shrink-0"
                    >
                      <ExternalLink size={10} />
                      XRPScan
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </CyberCard>
    );
  }

  /* ═══════════════════════════════════════════════════════
     Not Eligible
     ═══════════════════════════════════════════════════════ */
  if (status === "not-eligible" || (!eligibility?.eligible && status !== "eligible")) {
    return (
      <CyberCard accentColor="gold">
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
            <Trophy size={28} className="text-brand-gold opacity-50" />
          </div>
          {/* DEGEN OVERHAUL START — bagless-for-now copy */}
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-display text-lg font-bold text-cream mb-1">
              Bagless… For Now 🥜
            </h3>
            <p className="text-sm text-cream-dim">
              No Top 3 finish for {weekKey} — it happens. Get back on the{" "}
              <a href="/leaderboard/" className="text-neon-green hover:underline font-semibold">
                leaderboard
              </a>{" "}
              and run it back next week.
            </p>
          </div>
          {/* DEGEN OVERHAUL END */}
          <button
            onClick={checkEligibility}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold
                       text-cream-dim hover:text-cream bg-white/[0.04] hover:bg-white/[0.08]
                       border border-white/[0.06] transition-all min-h-[44px] shrink-0"
          >
            Re-check
          </button>
        </div>
      </CyberCard>
    );
  }

  /* ═══════════════════════════════════════════════════════
     Eligible — Claim CTA + Confirmation Modal
     ═══════════════════════════════════════════════════════ */
  return (
    <>
      {/* Confirmation Modal */}
      <AnimatePresence>
        {(status === "confirming" || status === "claiming" || status === "polling") && tier && (
          <ClaimConfirmModal
            tier={{ ...tier, amount: `${usdLabel} — ${nutLabel}` }}
            game={eligibility?.game || null}
            onConfirm={confirmClaim}
            onCancel={cancelClaim}
            claiming={status === "claiming" || status === "polling"}
          />
        )}
      </AnimatePresence>

      <CyberCard accentColor="gold">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            {/* Trophy */}
            {tier && (
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 10, stiffness: 200 }}
                className="text-5xl mb-4"
              >
                {tier.emoji}
              </motion.div>
            )}

            <h3 className="font-display text-2xl sm:text-3xl font-bold gradient-text-gold mb-1">
              {tier?.label ?? "Prize"} — {eligibility?.game ?? "Arcade"}
            </h3>
            <p className="text-cream-dim text-sm mb-1">
              Week {weekKey}
            </p>
            <motion.p
              initial={{ scale: 0.8 }}
              animate={{ scale: [0.8, 1.05, 1] }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="font-display text-4xl sm:text-5xl font-black text-brand-gold text-glow-gold mb-1"
            >
              {usdLabel}
            </motion.p>
            <p className="text-sm text-cream-dim font-mono mb-6">({nutLabel})</p>

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
            {/* DEGEN OVERHAUL START — gold→hot-pink claim banger; payout-claim-pulse + click handlers unchanged */}
            <motion.button
              onClick={startClaim}
              disabled={status !== "eligible" && status !== "idle" && status !== "error"}
              whileHover={{ scale: 1.04, boxShadow: "0 0 38px rgba(255,46,136,0.55)" }}
              whileTap={{ scale: 0.96 }}
              className="w-full max-w-xs px-8 py-4 rounded-xl
                         bg-gradient-to-r from-brand-gold to-hot-pink
                         text-[var(--color-degen-black)] font-black text-base
                         hover:shadow-[0_0_32px_rgba(255,46,136,0.55)]
                         transition-all disabled:opacity-60 cursor-pointer
                         payout-claim-pulse prize-banger"
            >
              <span className="flex items-center justify-center gap-2">
                {status === "claiming" || status === "polling" ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {getButtonLabel(status)}
                  </>
                ) : (
                  <>
                    <Gift size={18} />
                    {getButtonLabel(status)}
                  </>
                )}
              </span>
            </motion.button>
            {/* DEGEN OVERHAUL END */}

            <p className="text-[11px] text-cream-dim/50 mt-3">
              Prize is sent directly to your connected wallet via XRPL.
            </p>
          </div>
        </div>
      </CyberCard>
    </>
  );
}
