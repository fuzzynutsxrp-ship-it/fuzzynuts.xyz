import { create } from "zustand";
import { getJoeyAdapter } from "@/lib/wallet/joeyAdapter";
import { connectXaman, disconnectXaman, tryRestoreXamanSession } from "@/lib/wallet/xamanService";

/* ═══════════════════════════════════════════════════════════════
   Encrypted Storage Utilities (AES-GCM via Web Crypto)
   ═══════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "fuzzy_wallet";
const ENCRYPTED_KEY = "fuzzy_wallet_enc";
const FINGERPRINT_SALT = "fuzzynuts-v1";

/** Derive an AES-GCM key from a browser fingerprint (domain-scoped, deterministic) */
async function deriveStorageKey(): Promise<CryptoKey> {
  const raw = [
    typeof navigator !== "undefined" ? navigator.userAgent : "",
    typeof location !== "undefined" ? location.origin : "",
    FINGERPRINT_SALT,
  ].join("|");

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(raw),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(FINGERPRINT_SALT),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypt wallet data to localStorage */
async function encryptAndStore(data: { address: string; provider: string }): Promise<void> {
  try {
    const key = await deriveStorageKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
    // Store as base64: iv(16) + ciphertext
    const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    localStorage.setItem(ENCRYPTED_KEY, btoa(String.fromCharCode(...combined)));
    // Also keep plaintext fallback for backward compat
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Fallback: store plaintext if crypto unavailable
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

/** Decrypt wallet data from localStorage */
async function decryptFromStorage(): Promise<{ address: string; provider: string } | null> {
  try {
    const stored = localStorage.getItem(ENCRYPTED_KEY);
    if (!stored) {
      // Try plaintext fallback
      const plain = localStorage.getItem(STORAGE_KEY);
      return plain ? JSON.parse(plain) : null;
    }
    const combined = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const key = await deriveStorageKey();
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch {
    // Fallback: try plaintext
    try {
      const plain = localStorage.getItem(STORAGE_KEY);
      return plain ? JSON.parse(plain) : null;
    } catch {
      return null;
    }
  }
}

export type WalletProvider = "xaman" | "gemwallet" | "crossmark" | "joey" | "none";

interface WalletState {
  address: string | null;
  provider: WalletProvider;
  balance: string | null;
  nutBalance: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;

  connect: (provider: WalletProvider) => Promise<void>;
  disconnect: () => void;
  /**
   * Push connected state in from an external adapter (e.g. the Joey /
   * WalletConnect bridge), where the session is established outside the
   * store's own connect() flow. Persists like a normal connect.
   */
  setConnectedFromAdapter: (address: string, provider: WalletProvider) => void;
  /**
   * Clear connected state when an external adapter session ends (e.g. the
   * user disconnects from inside the Joey app). Does NOT call back into the
   * adapter — it is the response to a teardown that already happened.
   */
  setDisconnectedFromAdapter: () => void;
  setBalance: (balance: string) => void;
  setNutBalance: (nutBalance: string) => void;
  setError: (error: string | null) => void;

  /** Restore wallet session from encrypted localStorage on app mount */
  autoReconnect: () => Promise<void>;
}

/* ═══════════════════════════════════════════════════════════════
   Zustand Store
   ═══════════════════════════════════════════════════════════════ */

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  provider: "none",
  balance: null,
  nutBalance: null,
  isConnecting: false,
  isConnected: false,
  error: null,

  connect: async (provider: WalletProvider) => {
    set({ isConnecting: true, error: null });

    try {
      let address: string | null = null;

      switch (provider) {
        case "xaman": {
          const apiKey = process.env.NEXT_PUBLIC_XAMAN_API_KEY;
          if (!apiKey) {
            throw new Error("Xaman API key not configured. Please contact support.");
          }

          if (typeof window === "undefined") {
            throw new Error("Wallet connection requires a browser environment");
          }

          address = await connectXaman(apiKey);
          break;
        }

        case "gemwallet": {
          if (typeof window !== "undefined") {
            const gem = (
              window as unknown as {
                GemWallet?: {
                  isConnected: () => Promise<{
                    result: { isConnected: boolean };
                  }>;
                  getAddress: () => Promise<{
                    result: { address: string };
                  }>;
                };
              }
            ).GemWallet;
            if (!gem) {
              window.open("https://gemwallet.app", "_blank");
              throw new Error("GemWallet extension not found. Please install it.");
            }
            const connected = await gem.isConnected();
            if (!connected?.result?.isConnected) {
              throw new Error("GemWallet is not connected");
            }
            const result = await gem.getAddress();
            address = result?.result?.address || null;
          }
          break;
        }

        case "crossmark": {
          if (typeof window !== "undefined") {
            const sdk = (
              window as unknown as {
                crossmark?: {
                  signInAndWait: () => Promise<{
                    response: { data: { address: string } };
                  }>;
                };
              }
            ).crossmark;
            if (!sdk) {
              window.open("https://crossmark.io", "_blank");
              throw new Error("Crossmark extension not found. Please install it.");
            }
            const result = await sdk.signInAndWait();
            address = result?.response?.data?.address || null;
          }
          break;
        }

        case "joey": {
          // Joey is mobile-only over WalletConnect. The actual modal lives
          // in <JoeyProvider> (needs React hooks); the store reaches it
          // through an imperative adapter registered at mount.
          const adapter = getJoeyAdapter();
          if (!adapter) {
            throw new Error(
              "Joey Wallet isn't ready. Make sure WalletConnect is configured, then try again.",
            );
          }
          address = await adapter.connect();
          break;
        }
      }

      if (address) {
        set({
          address,
          provider,
          isConnected: true,
          isConnecting: false,
          error: null,
        });

        // Persist to encrypted localStorage
        if (typeof window !== "undefined") {
          encryptAndStore({ address, provider }).catch(() => {
            // Non-critical: encrypted persist failed, plaintext already set by fallback
          });
        }
      } else {
        throw new Error("No wallet address returned");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      console.error("[Wallet] Connection error:", message);
      set({ error: message, isConnecting: false });
    }
  },

  disconnect: () => {
    // If the active session is Joey/WalletConnect, tear down the WC session
    // too (fire-and-forget — local state clears regardless).
    if (useWalletStore.getState().provider === "joey") {
      getJoeyAdapter()
        ?.disconnect()
        .catch(() => {
          // Non-critical: WC session teardown failed; local state still clears
        });
    }

    set({
      address: null,
      provider: "none",
      balance: null,
      nutBalance: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ENCRYPTED_KEY);

      // Clear the Xumm SDK's OAuth2 session (no-op if it was never used).
      void disconnectXaman();
    }
  },

  setBalance: (balance: string) => set({ balance }),
  setNutBalance: (nutBalance: string) => set({ nutBalance }),
  setError: (error: string | null) => set({ error }),

  setConnectedFromAdapter: (address: string, provider: WalletProvider) => {
    set({
      address,
      provider,
      isConnected: true,
      isConnecting: false,
      error: null,
    });

    // Persist to encrypted localStorage so the session auto-restores.
    if (typeof window !== "undefined") {
      encryptAndStore({ address, provider }).catch(() => {
        // Non-critical: encrypted persist failed, plaintext fallback already set
      });
    }
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
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ENCRYPTED_KEY);
    }
  },

  autoReconnect: async () => {
    if (typeof window === "undefined") return;

    const state = useWalletStore.getState();
    if (state.isConnected || state.isConnecting) return;

    try {
      const stored = await decryptFromStorage();
      if (!stored?.address || !stored?.provider) return;

      // Validate address format
      if (!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(stored.address)) {
        console.warn("[Wallet] autoReconnect: invalid stored address, clearing");
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(ENCRYPTED_KEY);
        return;
      }

      // Fast path: restore cached state immediately for all providers.
      set({
        address: stored.address,
        provider: stored.provider as WalletProvider,
        isConnected: true,
        isConnecting: false,
        error: null,
      });

      console.log(
        `[Wallet] autoReconnect: restored ${stored.provider} session for ${stored.address.slice(0, 8)}...`,
      );

      // Xaman: silently re-validate the SDK session in the background using
      // the cached OAuth2 JWT. If it resolves an account we refresh state;
      // if it fails we keep the cached state above (no disconnect). Only
      // attempted for returning Xaman users so the SDK isn't loaded for
      // everyone on every page load.
      if (stored.provider === "xaman") {
        const apiKey = process.env.NEXT_PUBLIC_XAMAN_API_KEY;
        if (apiKey) {
          tryRestoreXamanSession(apiKey)
            .then((account) => {
              if (account && account !== useWalletStore.getState().address) {
                useWalletStore.getState().setConnectedFromAdapter(account, "xaman");
              }
            })
            .catch(() => {
              // Keep the cached session — silent refresh is best-effort.
            });
        }
      }
    } catch (err) {
      console.warn("[Wallet] autoReconnect failed:", err);
    }
  },
}));
