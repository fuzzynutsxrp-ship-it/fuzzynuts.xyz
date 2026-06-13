"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const UserStatsGrid = dynamic(
  () =>
    import("@/components/sections/UserStatsGrid").then(
      (mod) => mod.UserStatsGrid,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-32">
        <p className="text-neon-green animate-pulse font-display text-lg">
          Loading stats…
        </p>
      </div>
    ),
  },
);

interface ProfileIdClientProps {
  deviceId: string;
}

export function ProfileIdClient({ deviceId }: ProfileIdClientProps) {
  const shortId = `${deviceId.slice(0, 6)}...${deviceId.slice(-4)}`;

  return (
    <div className="relative z-10">
      {/* Back to Home */}
      <div className="container-main pt-6">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            href="/"
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-gradient-to-r from-brand-gold to-yellow-500
                       text-forest-dark font-bold text-sm
                       hover:shadow-[0_0_25px_rgba(251,191,36,0.4)]
                       active:scale-95 transition-all min-h-[44px]"
          >
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-1"
            />
            Back to Home
          </Link>
        </motion.div>
      </div>

      {/* Profile Stats Container */}
      <div className="container-main py-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border-2 border-hot-pink neon-ring-pink
                     bg-degen-950
                     shadow-[0_0_24px_rgba(255,46,136,0.25),0_8px_40px_rgba(0,0,0,0.5)]
                     overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-hot-pink/15">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl bg-[#0f0a00] border-2 border-brand-gold/40
                           flex items-center justify-center shrink-0 text-2xl"
                style={{
                  boxShadow:
                    "0 0 24px rgba(251,191,36,0.2), inset 0 1px 0 rgba(251,191,36,0.2)",
                }}
              >
                🐿️
              </div>
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-cream">
                  Player Stats
                </h1>
                <p className="text-xs text-cream-dim font-mono mt-0.5">
                  {shortId}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="p-6 sm:p-8">
            <UserStatsGrid deviceId={deviceId} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
