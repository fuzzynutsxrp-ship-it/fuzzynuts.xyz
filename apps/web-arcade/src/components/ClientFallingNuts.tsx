"use client";

import dynamic from "next/dynamic";

// Client-only wrapper so we can use ssr: false (not allowed in Server Components)
const FallingNutsCanvas = dynamic(
  () => import("@/components/FallingNuts").then((m) => ({ default: m.FallingNuts })),
  { ssr: false },
);

export function ClientFallingNuts() {
  return <FallingNutsCanvas />;
}
