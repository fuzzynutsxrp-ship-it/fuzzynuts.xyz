"use client";

/* ═══════════════════════════════════════════════════════════════
   JoeyProvider — WalletConnect provider + Zustand bridge

   Wraps the app in Joey's WC provider AND wires the resulting
   session state into the Zustand wallet store:
     1. WC session populates → push address into store (auto-restore)
     2. WC session terminates externally → clear store
     3. Store's connect("joey") needs to trigger WC modal → register
        an imperative adapter the store can call

   Mount once, high in the tree (see app/layout.tsx).
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useRef } from "react";
import joeyReact from "@joey-wallet/wc-react";
import { joeyWcConfig, isJoeyConfigured } from "@/lib/wallet/joeyConfig";
import { registerJoeyAdapter, type JoeyAdapter } from "@/lib/wallet/joeyAdapter";
import { useWalletStore } from "@/store/wallet";

const { Provider, useProvider } = joeyReact;

/** Strip the CAIP chain prefix (xrpl:0:rXXX → rXXX) and validate r-address shape. */
function extractRAddress(caipAccount: string | undefined): string | null {
  if (!caipAccount) return null;
  const tail = caipAccount.includes(":")
    ? caipAccount.split(":").pop() ?? caipAccount
    : caipAccount;
  return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(tail) ? tail : null;
}

function JoeyBridge({ children }: { children: React.ReactNode }) {
  const { actions, session, accounts } = useProvider();
  const setConnectedFromAdapter = useWalletStore((s) => s.setConnectedFromAdapter);
  const setDisconnectedFromAdapter = useWalletStore((s) => s.setDisconnectedFromAdapter);
  const currentProvider = useWalletStore((s) => s.provider);

  // Pending connect() promise — resolved when session/accounts arrive
  const pendingRef = useRef<{
    resolve: (addr: string) => void;
    reject: (err: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);

  // ── Sync WC session state into the store ──
  useEffect(() => {
    const account = accounts?.[0];
    const address = extractRAddress(account);

    if (session && address) {
      // Resolve any in-flight connect()
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timeoutId);
        pendingRef.current.resolve(address);
        pendingRef.current = null;
      }
      // Auto-restore on mount: if WC session was cached and the store hasn't
      // been told about it yet, push the address in.
      if (currentProvider !== "joey") {
        setConnectedFromAdapter(address, "joey");
      }
    } else if (!session && currentProvider === "joey") {
      // Session ended externally (e.g. user disconnected from inside Joey app)
      setDisconnectedFromAdapter();
    }
  }, [session, accounts, currentProvider, setConnectedFromAdapter, setDisconnectedFromAdapter]);

  // ── Register the imperative adapter the store calls into ──
  useEffect(() => {
    const adapter: JoeyAdapter = {
      connect: () =>
        new Promise<string>((resolve, reject) => {
          // Replace any prior pending request
          if (pendingRef.current) {
            clearTimeout(pendingRef.current.timeoutId);
            pendingRef.current.reject(new Error("Replaced by a newer connect attempt"));
          }
          const timeoutId = setTimeout(() => {
            if (pendingRef.current) {
              pendingRef.current = null;
              reject(new Error("Joey connection timed out after 90s"));
            }
          }, 90_000);
          pendingRef.current = { resolve, reject, timeoutId };

          // Kick off the WC modal. Joey's actions.connect returns a TResult,
          // but we listen for session updates via the effect above rather
          // than awaiting the call directly (its resolution races with the
          // session state update).
          actions
            .connect()
            .then((result) => {
              if (result?.error) {
                if (pendingRef.current) {
                  clearTimeout(pendingRef.current.timeoutId);
                  pendingRef.current.reject(
                    new Error(result.error.message || "Joey connection failed")
                  );
                  pendingRef.current = null;
                }
              }
              // Success path: the session effect above will fire and resolve
            })
            .catch((err: unknown) => {
              if (pendingRef.current) {
                clearTimeout(pendingRef.current.timeoutId);
                const message =
                  err instanceof Error ? err.message : "Joey connection failed";
                pendingRef.current.reject(new Error(message));
                pendingRef.current = null;
              }
            });
        }),
      disconnect: async () => {
        try {
          await actions.disconnect();
        } catch {
          // Store will clear regardless
        }
      },
      restore: () => extractRAddress(accounts?.[0]),
    };

    registerJoeyAdapter(adapter);
    return () => {
      registerJoeyAdapter(null);
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timeoutId);
        pendingRef.current.reject(new Error("JoeyProvider unmounted"));
        pendingRef.current = null;
      }
    };
  }, [actions, accounts]);

  return <>{children}</>;
}

export function JoeyProvider({ children }: { children: React.ReactNode }) {
  // If no Reown project ID is configured (local dev without env), skip the
  // provider entirely — Joey connect will surface a clear error instead of
  // a confusing init failure.
  if (!isJoeyConfigured()) {
    return <>{children}</>;
  }

  return (
    <Provider config={joeyWcConfig}>
      <JoeyBridge>{children}</JoeyBridge>
    </Provider>
  );
}
