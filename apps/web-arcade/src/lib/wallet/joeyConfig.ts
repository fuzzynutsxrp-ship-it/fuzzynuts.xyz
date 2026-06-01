import type { Config } from "@joey-wallet/wc-client";

/* ═══════════════════════════════════════════════════════════════
   WalletConnect / Joey Wallet configuration

   Joey Wallet is mobile-only and uses WalletConnect v2 via Reown.
   - Requires a Reown Cloud project ID (free at cloud.reown.com)
     exposed as NEXT_PUBLIC_PROJECT_ID at build time.
   - metadata.redirect.universal is critical for iOS deep-link
     return-trip — without it, users get stuck in the Joey app
     after approving the connection.
   ═══════════════════════════════════════════════════════════════ */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fuzzynuts.xyz";
const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID || "";

export const joeyWcConfig: Config = {
  projectId: PROJECT_ID,
  metadata: {
    name: "Fuzzynuts",
    description: "Play. Earn. Own. — The XRPL play-to-earn arcade.",
    url: SITE_URL,
    icons: [`${SITE_URL}/favicon.ico`],
    redirect: { universal: SITE_URL },
  },
};

/** True when a Reown project ID is configured; false in local/dev without env. */
export const isJoeyConfigured = (): boolean => Boolean(PROJECT_ID);
