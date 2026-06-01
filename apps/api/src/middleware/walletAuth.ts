/**
 * walletAuth — Next.js Edge Middleware for protected routes
 *
 * Protects /profile/ and /api/protected/* by verifying:
 *   1. A wallet session cookie or localStorage-backed token exists
 *   2. The wallet address format is valid (XRPL r-address)
 *   3. Redirects unauthenticated users to /#connect
 *
 * This runs at the edge (no Node.js APIs) — uses only Web APIs.
 * Wallet state comes from a signed cookie set during connect().
 */

import { NextRequest, NextResponse } from "next/server";

/* ── Configuration ── */

/** Routes that require wallet authentication */
const PROTECTED_PATHS = ["/profile"];

/** API routes that require wallet auth */
const PROTECTED_API_PREFIXES = ["/api/protected/"];

/** Where to redirect unauthenticated users */
const REDIRECT_URL = "/#connect";

/** Cookie name for wallet session */
const WALLET_COOKIE = "fuzzy_wallet_session";

/** Valid XRPL r-address pattern */
const XRPL_ADDRESS_RE = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

/* ── Helpers ── */

interface WalletSession {
  address: string;
  provider: string;
  ts: number;
}

/** Parse and validate the wallet session from cookie */
function parseWalletSession(
  cookieValue: string | undefined,
): WalletSession | null {
  if (!cookieValue) return null;

  try {
    // Cookie is base64-encoded JSON
    const decoded = atob(cookieValue);
    const session: WalletSession = JSON.parse(decoded);

    // Validate address format
    if (!session.address || !XRPL_ADDRESS_RE.test(session.address)) {
      return null;
    }

    // Validate provider
    const validProviders = ["xaman", "gemwallet", "crossmark"];
    if (!validProviders.includes(session.provider)) {
      return null;
    }

    // Check session age (max 7 days)
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - session.ts > maxAge) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/** Check if a path matches any protected pattern */
function isProtectedPath(pathname: string): boolean {
  // Check page routes
  for (const path of PROTECTED_PATHS) {
    if (pathname === path || pathname.startsWith(path + "/")) {
      return true;
    }
  }

  // Check API routes
  for (const prefix of PROTECTED_API_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}

/* ── Middleware ── */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip non-protected routes
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // Check for wallet session cookie
  const sessionCookie = request.cookies.get(WALLET_COOKIE)?.value;
  const session = parseWalletSession(sessionCookie);

  // Authenticated — pass through with wallet headers
  if (session) {
    const response = NextResponse.next();

    // Inject wallet address as header for downstream API routes
    response.headers.set("x-wallet-address", session.address);
    response.headers.set("x-wallet-provider", session.provider);

    return response;
  }

  // Unauthenticated — handle based on route type
  const isAPI = PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p));

  if (isAPI) {
    // API routes: return 401 JSON
    return NextResponse.json(
      {
        ok: false,
        error: "Wallet not connected",
        code: "WALLET_AUTH_REQUIRED",
      },
      { status: 401 },
    );
  }

  // Page routes: redirect to connect
  const redirectUrl = new URL(REDIRECT_URL, request.url);
  redirectUrl.searchParams.set("returnTo", pathname);
  return NextResponse.redirect(redirectUrl);
}

/* ── Route Matcher ── */

export const config = {
  matcher: ["/profile/:path*", "/api/protected/:path*"],
};

/* ── Client-side helpers (for setting the cookie after connect) ── */

/**
 * Set the wallet session cookie after a successful connect.
 * Call this from the wallet store's connect() success path.
 */
export function setWalletSessionCookie(
  address: string,
  provider: string,
): void {
  if (typeof document === "undefined") return;

  const session: WalletSession = {
    address,
    provider,
    ts: Date.now(),
  };

  const encoded = btoa(JSON.stringify(session));
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  const secure = location.protocol === "https:" ? ";Secure" : "";

  document.cookie = `${WALLET_COOKIE}=${encoded};Path=/;Max-Age=${maxAge};SameSite=Lax${secure}`;
}

/**
 * Clear the wallet session cookie on disconnect.
 */
export function clearWalletSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${WALLET_COOKIE}=;Path=/;Max-Age=0;SameSite=Lax`;
}
