/**
 * Browser session helpers. The cookie itself is HttpOnly + Secure +
 * SameSite=Lax set by the API; we only read non-sensitive metadata
 * from a parallel non-HttpOnly hint cookie called `fuzzy_session_meta`.
 */

import type { WalletSession } from ".";

const META_COOKIE = "fuzzy_session_meta";

export function readSessionMeta(): WalletSession | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${META_COOKIE}=([^;]+)`));
  if (!match) return null;
  try {
    const decoded = JSON.parse(decodeURIComponent(match[1]!));
    if (
      typeof decoded?.address === "string" &&
      typeof decoded?.provider === "string" &&
      typeof decoded?.cookieExp === "number"
    ) {
      return decoded as WalletSession;
    }
  } catch {
    /* corrupt cookie — ignore */
  }
  return null;
}

export function clearSessionMeta(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${META_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
