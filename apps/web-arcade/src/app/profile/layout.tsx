/**
 * Profile route layout — wraps with SubPageLayout
 * for consistent navbar, footer, video bg, and particles.
 */

import { SubPageLayout } from "@/components/layout/SubPageLayout";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <SubPageLayout showVideoBg={true} showFallingNuts={true} navbarTransparent={false}>
      {children}
    </SubPageLayout>
  );
}
