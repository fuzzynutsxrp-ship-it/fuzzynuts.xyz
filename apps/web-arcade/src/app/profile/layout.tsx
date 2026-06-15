/**
 * Profile route layout — matches the homepage's clean, light style.
 * No video background, no particles, no dark overlay.
 */

import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/layout/Footer";

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
