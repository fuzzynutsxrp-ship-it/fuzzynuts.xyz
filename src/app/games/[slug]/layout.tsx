/**
 * Game route layout — wraps with SubPageLayout
 * with performance-optimized settings for gameplay:
 *   - No video bg (games use their own)
 *   - No falling nuts particles (reduce GPU load)
 *   - Transparent navbar (overlay on game canvas)
 */

import { SubPageLayout } from "@/components/layout/SubPageLayout";

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SubPageLayout
      showVideoBg={false}
      showFallingNuts={false}
      navbarTransparent={true}
    >
      {children}
    </SubPageLayout>
  );
}
