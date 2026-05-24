import { create } from "zustand";
import {
  connectXaman,
  disconnectXaman,
  tryRestoreXamanSession,
} from "@/lib/wallet/xamanService";
import { getJoeyAdapter } from "@/lib/wallet/joeyAdapter";

/* ═══════════════════════════════════════════════════════════════
   Wallet store

   Single source of truth for the connected wallet (address, provider,
   balances, in-flight state, error). Supports two providers:
     • xaman  — Xaman (Xumm) OAuth2 PKCE via CDN SDK
     • joey   — Joey Wallet via WalletConnect v2 (bridged from
                JoeyProvider, see src/components/providers/JoeyProvider)

   Persistence is intentionally plain JSON in localStorage. The
   address is a public XRPL r-address — encrypting it on the client
   provides no real security (the key would have to ship in JS too).
   ═══════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "fuzzy_wallet";
const LEGACY_ENCRYPTED_KEY = "fuzzy_wallet_enc"; // Cleaned up on first load
const R_ADDRESS_REGEX = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

export type WalletProvider = "xaman" | "joey" | "none";
type ConnectableProvider = Exclude<WalletProvider, "none">;

interface PersistedSession {
  address: string;
  provider: ConnectableProvider;
}

function loadPersistedSession(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  // One-time cleanup of legacy AES-encrypted entries
  try {
    localStorage.removeItem(LEGACY_ENCRYPTED_KEY);
  } catch {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    if (
      typeof parsed.address !== "string" ||
      !R_ADDRESS_REGEX.test(parsed.address)
    )
      return null;
    if (parsed.provider !== "xaman" && parsed.provider !== "joey") return null;
    return { address: parsed.address, provider: parsed.provider };
  } catch {
    return null;
  }
}

function persistSession(session: PersistedSession | null): void {
  if (typeof window === "undefined") return;
  try {
    if (session) {
      // `connected: true` is here for compatibility with the iframe-side
      // wallet bridge in public/games/fuzzy-score.js, which reads this
      // localStorage key and expects { connected, address } to recognise
      // a live session. The post-fix fuzzy-score.js falls back to plain
      // address presence too, but keeping the flag avoids regressions if
      // anyone reverts the iframe-side change.
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...session, connected: true }),
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable — non-fatal
  }
}

interface WalletState {
  address: string | null;
  provider: WalletProvider;
  balance: string | null;
  nutBalance: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;

  connect: (provider: ConnectableProvider) => Promise<void>;
  disconnect: () => Promise<void>;
  setBalance: (balance: string) => void;
  setNutBalance: (nutBalance: string) => void;
  setError: (error: string | null) => void;

  /** Internal: JoeyProvider bridge calls this when WC session changes. */
  setConnectedFromAdapter: (address: string, provider: WalletProvider) => void;
  /** Internal: JoeyProvider bridge calls this when WC session ends. */
  setDisconnectedFromAdapter: () => void;

  /**
   * App-mount restore. Verifies any cached session is still valid before
   * treating it as connected:
   *   • xaman → re-init the SDK and wait briefly for the `retrieved` event
   *   • joey  → no-op; JoeyProvider's bridge effect handles it
   */
  autoReconnect: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  provider: "none",
  balance: null,
  nutBalance: null,
  isConnecting: false,
  isConnected: false,
  error: null,

  connect: async (provider) => {
    set({ isConnecting: true, error: null });
    try {
      let address: string;

      if (provider === "xaman") {
        const apiKey = process.env.NEXT_PUBLIC_XAMAN_API_KEY;
        if (!apiKey)
          throw new Error("Xaman is not configured. Please contact support.");
        if (typeof window === "undefined")
          throw new Error("Wallet connection requires a browser");
        address = await connectXaman(apiKey);
      } else if (provider === "joey") {
        const adapter = getJoeyAdapter();
        if (!adapter) {
          throw new Error(
            "Joey Wallet is still initializing — please try again in a moment.",
          );
        }
        address = await adapter.connect();
      } else {
        throw new Error(`Unknown wallet provider: ${provider satisfies never}`);
      }

      set({
        address,
        provider,
        isConnected: true,
        isConnecting: false,
        error: null,
      });
      persistSession({ address, provider });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      console.error("[Wallet] Connection error:", message);
      set({ error: message, isConnecting: false });
    }
  },

  disconnect: async () => {
    const { provider } = get();
    // Clear store first so the UI updates immediately
    set({
      address: null,
      provider: "none",
      balance: null,
      nutBalance: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
    persistSession(null);

    if (provider === "xaman") {
      await disconnectXaman();
    } else if (provider === "joey") {
      const adapter = getJoeyAdapter();
      await adapter?.disconnect();
    }
  },

  setBalance: (balance) => set({ balance }),
  setNutBalance: (nutBalance) => set({ nutBalance }),
  setError: (error) => set({ error }),

  setConnectedFromAdapter: (address, provider) => {
    if (provider !== "xaman" && provider !== "joey") return;
    set({
      address,
      provider,
      isConnected: true,
      isConnecting: false,
      error: null,
    });
    persistSession({ address, provider });
  },

  setDisconnectedFromAdapter: () => {
    set({
      address: null,
      provider: "none",
      balance: null,
      nutBalance: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
    persistSession(null);
  },

  autoReconnect: async () => {
    if (typeof window === "undefined") return;
    const { isConnected, isConnecting } = get();
    if (isConnected || isConnecting) return;

    const cached = loadPersistedSession();
    if (!cached) return;

    if (cached.provider === "joey") {
      // JoeyProvider's bridge effect will populate the store from the
      // restored WC session. Nothing to do here.
      return;
    }

    // Xaman: try to silently restore from cached JWT
    const apiKey = process.env.NEXT_PUBLIC_XAMAN_API_KEY;
    if (!apiKey) {
      persistSession(null);
      return;
    }

    try {
      const account = await tryRestoreXamanSession(apiKey);
      if (account) {
        set({
          address: account,
          provider: "xaman",
          isConnected: true,
          isConnecting: false,
          error: null,
        });
      } else {
        // Cached pointer was stale (JWT expired / cleared)
        persistSession(null);
      }
    } catch (err) {
      console.warn("[Wallet] Xaman auto-restore failed:", err);
      persistSession(null);
    }
  },
}));
