"use client";

/* ═══════════════════════════════════════════════════════════════
   Xaman (Xumm) SDK service

   Extracted from src/store/wallet.ts. The CDN script (xumm.min.js)
   exposes a global `Xumm` class implementing OAuth2 PKCE in the
   browser. We:
     1. Idempotently load the script
     2. Instantiate Xumm(apiKey) — this triggers JWT retrieval
     3. Listen for the `success` (fresh sign-in) or `retrieved`
        (cached session restored) events to read the user's account

   The store calls connectXaman() for an explicit user-initiated
   connect, and tryRestoreXamanSession() on app mount to silently
   re-auth from a cached JWT.
   ═══════════════════════════════════════════════════════════════ */

type XummEventName = "success" | "error" | "retrieved";
type XummEventHandler = (...args: unknown[]) => void;

interface XummInstance {
  authorize(): Promise<unknown> | undefined;
  logout?(): Promise<void> | void;
  user?: { account?: Promise<string | undefined> | string | undefined };
  state?: { account?: string };
  on?(event: XummEventName, handler: XummEventHandler): void;
  off?(event: XummEventName, handler: XummEventHandler): void;
}

declare global {
  interface Window {
    Xumm?: new (apiKey: string) => XummInstance;
  }
}

let xummInstance: XummInstance | null = null;

function isMobile(): boolean {
  return (
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
  );
}

function loadXummScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Xaman requires a browser environment"));
      return;
    }
    if (window.Xumm) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="xumm.min.js"], script[src*="xaman.app/assets/cdn"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Xaman SDK from CDN")),
      );
      if (existing.dataset.loaded === "true") resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://xumm.app/assets/cdn/xumm.min.js";
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      // The global registration sometimes lags onload by a tick
      setTimeout(() => {
        if (window.Xumm) resolve();
        else reject(new Error("Xaman SDK loaded but Xumm class not found"));
      }, 100);
    };
    script.onerror = () =>
      reject(new Error("Failed to load Xaman SDK — check your internet connection"));
    document.head.appendChild(script);
  });
}

async function ensureInstance(apiKey: string): Promise<XummInstance> {
  if (xummInstance) return xummInstance;
  await loadXummScript();
  if (!window.Xumm) throw new Error("Xaman SDK failed to initialize");
  xummInstance = new window.Xumm(apiKey);
  return xummInstance;
}

/**
 * Read the current account from the Xumm instance.
 * The SDK exposes `user.account` as either a Promise or a primitive.
 */
async function readAccount(xumm: XummInstance): Promise<string | null> {
  try {
    const fromUser = await xumm.user?.account;
    const account = fromUser ?? xumm.state?.account;
    if (typeof account === "string" && /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(account)) {
      return account;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Interactive connect: opens the Xaman OAuth2 PKCE popup (desktop)
 * or deep-links to the Xaman app (mobile). Resolves with the user's
 * r-address.
 */
export async function connectXaman(apiKey: string): Promise<string> {
  const xumm = await ensureInstance(apiKey);

  return new Promise<string>((resolve, reject) => {
    const TIMEOUT_MS = 90_000;
    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          isMobile()
            ? "Connection timed out. Make sure the Xaman app is installed and try again."
            : "Connection timed out. Complete sign-in in the Xaman popup, or allow pop-ups for this site.",
        ),
      );
    }, TIMEOUT_MS);

    const cleanup = () => {
      clearTimeout(timeout);
      try {
        xumm.off?.("success", onSuccess);
      } catch {}
      try {
        xumm.off?.("retrieved", onSuccess);
      } catch {}
      try {
        xumm.off?.("error", onError);
      } catch {}
    };

    const onSuccess = async () => {
      const account = await readAccount(xumm);
      if (account) {
        cleanup();
        resolve(account);
      } else {
        cleanup();
        reject(new Error("Xaman returned no wallet address. Please try again."));
      }
    };

    const onError = (err: unknown) => {
      cleanup();
      const message = err instanceof Error ? err.message : String(err ?? "Unknown error");
      if (message.includes("closed") || message.includes("rejected")) {
        reject(new Error("Sign-in was cancelled. Click Connect to try again."));
      } else if (message.includes("popup")) {
        reject(new Error("Pop-up was blocked. Allow pop-ups for this site and try again."));
      } else {
        reject(new Error(`Xaman error: ${message}`));
      }
    };

    xumm.on?.("retrieved", onSuccess);
    xumm.on?.("success", onSuccess);
    xumm.on?.("error", onError);

    const p = xumm.authorize();
    if (p && typeof (p as Promise<unknown>).catch === "function") {
      (p as Promise<unknown>).catch(() => {
        /* events drive resolution */
      });
    }
  });
}

/**
 * Silent restore on app mount. Initializes the SDK; if a cached
 * JWT exists, the `retrieved` event fires with the account. If no
 * cached session, we resolve null after a short window so the UI
 * doesn't hang.
 */
export async function tryRestoreXamanSession(apiKey: string): Promise<string | null> {
  try {
    const xumm = await ensureInstance(apiKey);

    // Some SDK builds expose the account synchronously when a JWT exists
    const synchronousAccount = await readAccount(xumm);
    if (synchronousAccount) return synchronousAccount;

    return await new Promise<string | null>((resolve) => {
      let settled = false;
      const settle = (val: string | null) => {
        if (settled) return;
        settled = true;
        try {
          xumm.off?.("retrieved", onRetrieved);
        } catch {}
        resolve(val);
      };
      const onRetrieved = async () => {
        const account = await readAccount(xumm);
        settle(account);
      };
      xumm.on?.("retrieved", onRetrieved);
      // No cached session → no event will fire; give up after a short window
      setTimeout(() => settle(null), 1500);
    });
  } catch {
    return null;
  }
}

/** Clear the Xumm SDK's local OAuth2 session. */
export async function disconnectXaman(): Promise<void> {
  try {
    await xummInstance?.logout?.();
  } catch {
    // Non-critical — store will clear regardless
  }
}
