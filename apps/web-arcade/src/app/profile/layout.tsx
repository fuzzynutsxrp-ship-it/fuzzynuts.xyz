/**
 * Profile route layout — matches the homepage's clean, light style.
 * No video background, no particles, no dark overlay.
 */

import { SiteHeader } from "@/components/layout/SiteHeader";
import dynamic from "next/dynamic";

const Footer = dynamic(
  () => import("@/components/layout/Footer").then((m) => ({ default: m.Footer })),
  { ssr: false },
);

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fnx">
      <SiteHeader variant="light" />
      <main className="fn-dashboard">
        {children}
        <Footer />
      </main>
    </div>
  );
}
