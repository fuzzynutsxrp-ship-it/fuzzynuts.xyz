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
import { CyberCard } from "@/components/ui/CyberCard";
import {
  usePayoutEligibility,
  getCurrentWeekKey,
  type ClaimStatus,
} from "@/hooks/useArcadeState";

/* ═══════════════════════════════════════════════════════════════
   Prize Tier Config
   ═══════════════════════════════════════════════════════════════ */

const PRIZE_TIERS: Record<number, { label: string; amount: string; nutAmount: number; emoji: string }> = {
  1: { label: "1st Place", amount: "250,000 $NUT", nutAmount: 250_000, emoji: "🥇" },
  2: { label: "2nd Place", amount: "150,000 $NUT", nutAmount: 150_000, emoji: "🥈" },
  3: { label: "3rd Place", amount: "100,000 $NUT", nutAmount: 100_000, emoji: "🥉" },
};

/* ═══════════════════════════════════════════════════════════════
   Confetti Burst — Lightweight CSS-only confetti animation
   ═══════════════════════════════════════════════════════════════ */

function ConfettiBurst() {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    angle: (i / 24) * 360,
    distance: 60 + Math.random() * 80,
    size: 4 + Math.random() * 6,
    color: ["#FBBF24", "#10B981", "#f59e0b", "#4ade80", "#22d3ee", "#a855f7"][
      i % 6
    ],
    delay: Math.random() * 0.3,
  }));

  return (
    <div className="confetti-container absolute inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: "50%",
            top: "50%",
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.id % 3 === 0 ? "50%" : "2px",
            animationDelay: `${p.delay}s`,
            // Use CSS custom properties for the animation
            "--confetti-x": `${Math.cos((p.angle * Math.PI) / 180) * p.distance}px`,
            "--confetti-y": `${Math.sin((p.angle * Math.PI) / 180) * p.distance - 40}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

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
          return tier ? `Claim ${tier.amount}` : "Claim Prize";
      }
    },
    [tier]
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
     Already Claimed / Success with Confetti
     ═══════════════════════════════════════════════════════ */
  if (status === "already-claimed" || status === "success") {
    return (
      <CyberCard accentColor="green">
        <div className="p-6 sm:p-8 relative">
          {/* Confetti on fresh success */}
          {status === "success" && <ConfettiBurst />}

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
                {status === "success" ? "Prize sent to wallet! 🌰" : "Rewards Claimed! ✅"}
              </h3>
              <p className="text-sm text-cream-dim">
                {tier
                  ? `${tier.emoji} ${tier.label} — ${tier.amount} sent to your wallet.`
                  : "Your $NUT prize has been sent to your wallet."}
              </p>
              {txHash && (
                <a
                  href={`https://xrpscan.com/tx/${txHash}`}
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
  if (status === "not-eligible" || (!eligibility?.eligible && status !== "eligible")) {
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
            tier={tier}
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

            <h3 className="font-display text-2xl font-bold gradient-text-gold mb-1">
              {tier?.label ?? "Prize"} — {eligibility?.game ?? "Arcade"}
            </h3>
            <p className="text-cream-dim text-sm mb-1">
              Week {weekKey}
            </p>
            <p className="font-display text-3xl font-black text-brand-gold mb-6">
              {tier?.amount ?? "—"}
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
              onClick={startClaim}
              disabled={status !== "eligible" && status !== "idle" && status !== "error"}
              whileHover={{ scale: 1.04, boxShadow: "0 0 35px rgba(245,196,66,0.5)" }}
              whileTap={{ scale: 0.96 }}
              className="w-full max-w-xs px-8 py-4 rounded-xl
                         bg-gradient-to-r from-brand-gold to-yellow-500
                         text-forest-dark font-bold text-base
                         hover:shadow-[0_0_30px_rgba(245,196,66,0.5)]
                         transition-all disabled:opacity-60 cursor-pointer
                         payout-claim-pulse"
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

            <p className="text-[11px] text-cream-dim/50 mt-3">
              Prize is sent directly to your connected wallet via XRPL.
            </p>
          </div>
        </div>
      </CyberCard>
    </>
  );
}
