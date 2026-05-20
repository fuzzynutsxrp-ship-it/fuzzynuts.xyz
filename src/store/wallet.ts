import { create } from "zustand";

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
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded,
    );
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
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );
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

export type WalletProvider = "xaman" | "gemwallet" | "crossmark" | "none";

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
  setBalance: (balance: string) => void;
  setNutBalance: (nutBalance: string) => void;
  setError: (error: string | null) => void;

  /** Restore wallet session from encrypted localStorage on app mount */
  autoReconnect: () => Promise<void>;
}

/* ═══════════════════════════════════════════════════════════════
   Xaman SDK Loader + PKCE Connect
   ═══════════════════════════════════════════════════════════════

   The CDN script (`xumm.min.js`) exposes a `Xumm` class that
   implements OAuth2 PKCE in the browser:
     1. Load script (idempotent)
     2. `new Xumm(apiKey)` — constructor, triggers PKCE retrieval
     3. `.authorize()` — opens OAuth2 popup
     4. Listen for `success` event to get the user's account

   Previous code called `.authorize()` and then immediately read
   `.user?.account`, which was always `undefined` because the SDK
   resolves asynchronously via events.

   This rewrite:
   - Uses the correct event-driven flow
   - Adds a 60s connection timeout
   - Handles popup-blocked, user-rejected, and network errors
   - Provides console.error breadcrumbs for debugging
   ═══════════════════════════════════════════════════════════════ */

/** Idempotent CDN script loader — resolves when script is ready */
function loadXummScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const win = window as unknown as Record<string, unknown>;

    // Already loaded
    if (win.Xumm) {
      resolve();
      return;
    }

    // Check if script tag already exists (in-flight load)
    const existing = document.querySelector(
      'script[src*="xumm.min.js"], script[src*="xaman.app/assets/cdn"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Xaman SDK from CDN"))
      );
      // If it already loaded but Xumm isn't on window yet, wait a tick
      if ((existing as HTMLScriptElement).dataset.loaded === "true") {
        resolve();
      }
      return;
    }

    const script = document.createElement("script");
    // Use the canonical CDN URL (xaman.app is the current domain per docs)
    script.src = "https://xumm.app/assets/cdn/xumm.min.js";
    script.async = true;

    script.onload = () => {
      script.dataset.loaded = "true";
      // Small delay to ensure global `Xumm` is registered
      setTimeout(() => {
        if (win.Xumm) {
          resolve();
        } else {
          reject(new Error("Xaman SDK loaded but Xumm class not found on window"));
        }
      }, 100);
    };

    script.onerror = () =>
      reject(new Error("Failed to load Xaman SDK — check your internet connection"));

    document.head.appendChild(script);
  });
}

/** Mobile detection for deep link fallback */
function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
    navigator.userAgent
  );
}

/**
 * Connect via Xaman OAuth2 PKCE flow.
 * Returns the r-address on success, throws on failure.
 */
async function connectXaman(apiKey: string): Promise<string> {
  console.log("[Wallet] Starting Xaman PKCE connection flow…");

  await loadXummScript();

  const win = window as unknown as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const XummClass = win.Xumm as any;

  if (!XummClass) {
    throw new Error("Xaman SDK failed to initialize after load");
  }

  // Create Xumm instance — the constructor triggers state retrieval
  const xumm = new XummClass(apiKey);

  return new Promise<string>((resolve, reject) => {
    const CONNECTION_TIMEOUT_MS = 60_000;

    const timeout = setTimeout(() => {
      cleanup();
      console.error("[Wallet] Xaman connection timed out after 60s");
      reject(
        new Error(
          isMobile()
            ? "Connection timed out. Make sure the Xaman app is installed and try again."
            : "Connection timed out. Complete the sign-in in the Xaman popup, or check that pop-ups are allowed."
        )
      );
    }, CONNECTION_TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timeout);
      try { xumm.off?.("success", onSuccess); } catch {}
      try { xumm.off?.("error", onError); } catch {}
      try { xumm.off?.("retrieved", onRetrieved); } catch {}
    };

    const resolveWithAccount = async () => {
      try {
        // The SDK resolves user info asynchronously
        const account =
          (await xumm?.user?.account) ||
          xumm?.state?.account;

        if (account && typeof account === "string" && account.startsWith("r")) {
          cleanup();
          console.log("[Wallet] ✅ Xaman connected:", account);
          resolve(account);
        } else {
          cleanup();
          console.error("[Wallet] Xaman returned no account after auth");
          reject(new Error("Xaman returned no wallet address. Please try again."));
        }
      } catch (err) {
        cleanup();
        console.error("[Wallet] Error reading Xaman account:", err);
        reject(new Error("Failed to read wallet address from Xaman."));
      }
    };

    // Event: Previously stored JWT was retrieved (auto-login)
    const onRetrieved = () => {
      console.log("[Wallet] Xaman: existing session retrieved");
      resolveWithAccount();
    };

    // Event: Fresh OAuth2 sign-in completed
    const onSuccess = () => {
      console.log("[Wallet] Xaman: OAuth2 PKCE success");
      resolveWithAccount();
    };

    // Event: Error during auth
    const onError = (err: Error | string) => {
      cleanup();
      const message = typeof err === "string" ? err : err?.message || "Unknown error";
      console.error("[Wallet] Xaman auth error:", message);

      if (message.includes("closed") || message.includes("rejected")) {
        reject(new Error("Sign-in was cancelled. Click Connect to try again."));
      } else if (message.includes("popup")) {
        reject(
          new Error(
            "Pop-up was blocked by your browser. Allow pop-ups for fuzzynuts.xyz and try again."
          )
        );
      } else {
        reject(new Error(`Xaman error: ${message}`));
      }
    };

    // Register event listeners
    xumm.on?.("retrieved", onRetrieved);
    xumm.on?.("success", onSuccess);
    xumm.on?.("error", onError);

    // Trigger the OAuth2 popup flow
    console.log("[Wallet] Calling xumm.authorize()…");
    const authPromise = xumm.authorize?.();

    if (authPromise && typeof authPromise.catch === "function") {
      authPromise.catch((err: Error) => {
        // Don't double-reject if events already fired
        console.error("[Wallet] xumm.authorize() rejected:", err?.message);
      });
    }
  });
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
            throw new Error(
              "Xaman API key not configured. Please contact support."
            );
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
              throw new Error(
                "GemWallet extension not found. Please install it."
              );
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
              throw new Error(
                "Crossmark extension not found. Please install it."
              );
            }
            const result = await sdk.signInAndWait();
            address = result?.response?.data?.address || null;
          }
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
      const message =
        err instanceof Error ? err.message : "Connection failed";
      console.error("[Wallet] Connection error:", message);
      set({ error: message, isConnecting: false });
    }
  },

  disconnect: () => {
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

      // Also logout from Xumm SDK to clear OAuth2 session
      try {
        const win = window as unknown as Record<string, unknown>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const XummInstance = win._XummPkce as any;
        if (XummInstance?.logout) {
          XummInstance.logout();
        }
      } catch {
        // Non-critical: Xumm session cleanup failed silently
      }
    }
  },

  setBalance: (balance: string) => set({ balance }),
  setNutBalance: (nutBalance: string) => set({ nutBalance }),
  setError: (error: string | null) => set({ error }),

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

      // Restore session (does NOT re-auth — just restores cached state)
      set({
        address: stored.address,
        provider: stored.provider as WalletProvider,
        isConnected: true,
        isConnecting: false,
        error: null,
      });

      console.log(`[Wallet] autoReconnect: restored ${stored.provider} session for ${stored.address.slice(0, 8)}...`);
    } catch (err) {
      console.warn("[Wallet] autoReconnect failed:", err);
    }
  },
}));
