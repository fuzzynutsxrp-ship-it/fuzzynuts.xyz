/**
 * Prizes route layout — matches homepage light style.
 */

import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/layout/Footer";

export default function PrizesLayout({
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
