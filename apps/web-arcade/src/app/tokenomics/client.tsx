"use client";

import dynamic from "next/dynamic";

const Trust = dynamic(() => import("@/components/sections/Trust").then((mod) => mod.Trust), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-32">
      <p className="text-neon-green animate-pulse font-display text-lg">Loading tokenomics…</p>
    </div>
  ),
});

export function TokenomicsClient() {
  return (
    <div className="relative z-10">
      <Trust />
    </div>
  );
}
