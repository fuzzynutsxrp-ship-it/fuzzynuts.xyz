"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const PrizesPageContent = dynamic(
  () =>
    import("@/components/sections/PrizesPageContent").then(
      (mod) => mod.PrizesPageContent,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-32">
        <p className="text-[#6366f1] animate-pulse font-display text-lg">
          Loading prizes…
        </p>
      </div>
    ),
  },
);

export function PrizesClient() {
  return (
    <>
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <Link
          href="/"
          className="fn-hero-banner__cta"
          style={{ padding: "10px 20px", fontSize: "14px" }}
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
          Prizes & Payouts
        </h1>
      </div>

      {/* Prizes Content */}
      <PrizesPageContent />
    </>
  );
}
