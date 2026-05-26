"use client";

import { useEffect } from "react";
import { useWalletStore } from "@/store/wallet";

/* ═══════════════════════════════════════════════════════════════
   AppMount — root-level mount effects

   Lives at the top of the React tree (in app/layout.tsx) and is
   responsible for one-shot, app-wide side effects:
     • Restore the wallet session from cached state (silently re-auths
       Xaman via JWT, lets JoeyProvider's bridge handle WC restore)

   This component renders nothing. Splitting it out keeps the server
   layout itself a pure server component and gives a clear home for
   any future app-mount effects (analytics init, feature-flag
   bootstrap, etc.) instead of bloating other components.
   ═══════════════════════════════════════════════════════════════ */

export function AppMount() {
  useEffect(() => {
    void useWalletStore.getState().autoReconnect();
  }, []);

  return null;
}
