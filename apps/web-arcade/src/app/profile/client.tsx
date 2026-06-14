"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * Profile page client boundary.
 * Background, navbar, and footer are now provided by layout.tsx
 * via SubPageLayout — this component only renders content.
 */
const UserProfile = dynamic(
  () =>
    import("@/components/sections/UserProfile").then(
      (mod) => mod.UserProfile,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-32">
        <p className="text-neon-green animate-pulse font-display text-lg">
          Loading profile…
        </p>
      </div>
    ),
  },
);

export function ProfileClient() {
  return (
    <div className="relative z-10">
      {/* Back to Home — matches homepage card style */}
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

      {/* Profile Content — clean container matching homepage */}
      <div className="container-main py-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <UserProfile />
        </motion.div>
      </div>
    </div>
  );
}
