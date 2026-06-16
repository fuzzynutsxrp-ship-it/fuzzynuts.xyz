/**
 * Profile route layout — matches the homepage's clean, light style.
 * No video background, no particles, no dark overlay.
 */

import { SiteHeader } from "@/components/layout/SiteHeader";
import DynamicFooter from "@/components/DynamicFooter";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
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
