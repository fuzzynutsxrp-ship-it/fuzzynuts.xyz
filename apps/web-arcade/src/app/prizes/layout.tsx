/**
 * Prizes route layout — matches homepage light style.
 */

import { SiteHeader } from "@/components/layout/SiteHeader";
import DynamicFooter from "@/components/DynamicFooter";

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
        <DynamicFooter />
      </main>
    </div>
  );
}
