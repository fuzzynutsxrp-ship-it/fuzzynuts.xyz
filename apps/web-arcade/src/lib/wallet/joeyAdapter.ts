/* ═══════════════════════════════════════════════════════════════
   Joey Wallet adapter registry

   Joey's React provider lives in the component tree (it needs
   hooks). The Zustand wallet store is module-level state. This
   tiny registry bridges them: the JoeyProvider's bridge effect
   registers an imperative adapter here on mount, and the store's
   connect()/disconnect() actions look it up when the user picks
   Joey as their provider.

   This is a deliberate use of module-level mutable state — Zustand
   itself works the same way. Singleton, single mount, no SSR.
   ═══════════════════════════════════════════════════════════════ */

export interface JoeyAdapter {
  /** Open the WC modal and resolve with the user's r-address. */
  connect: () => Promise<string>;
  /** Terminate the WC session in both the dApp and the wallet. */
  disconnect: () => Promise<void>;
  /** Synchronously read the current session's r-address, if any. */
  restore: () => string | null;
}

let adapter: JoeyAdapter | null = null;

export function registerJoeyAdapter(next: JoeyAdapter | null): void {
  adapter = next;
}

export function getJoeyAdapter(): JoeyAdapter | null {
  return adapter;
}

export function isJoeyReady(): boolean {
  return adapter !== null;
}
