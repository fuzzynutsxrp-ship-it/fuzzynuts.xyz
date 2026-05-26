import { NextRequest, NextResponse } from "next/server";

/**
 * ═══════════════════════════════════════════════════════════════
 *  LAYER 1: Edge Middleware — HTTP Basic Authentication
 * ═══════════════════════════════════════════════════════════════
 *
 *  This runs at the Vercel Edge BEFORE any content is served.
 *  It blocks ALL requests (pages, static assets, API routes,
 *  images, JS bundles, games, everything) unless the browser
 *  provides valid HTTP Basic Auth credentials.
 *
 *  Password: stored in SITE_LOCKDOWN_PASSWORD env var on Vercel.
 *  Username: admin (hardcoded, irrelevant for single-user).
 *
 *  This is the STRONGEST protection available in this stack
 *  because it runs server-side at the CDN edge — no JS needed,
 *  no client-side bypass possible, no content ever transmitted.
 *
 *  Rate limiting: 5 failed attempts → 60-second lockout per IP.
 * ═══════════════════════════════════════════════════════════════
 */

// ── In-memory rate limiting (per-edge-instance) ──
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60_000; // 60 seconds

function isRateLimited(ip: string): boolean {
  const record = failedAttempts.get(ip);
  if (!record) return false;
  if (Date.now() - record.lastAttempt > LOCKOUT_DURATION_MS) {
    failedAttempts.delete(ip);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

function recordFailure(ip: string): void {
  const record = failedAttempts.get(ip);
  if (record) {
    record.count++;
    record.lastAttempt = Date.now();
  } else {
    failedAttempts.set(ip, { count: 1, lastAttempt: Date.now() });
  }
  // Prevent memory leak — evict old entries
  if (failedAttempts.size > 10_000) {
    const now = Date.now();
    for (const [k, v] of failedAttempts) {
      if (now - v.lastAttempt > LOCKOUT_DURATION_MS) failedAttempts.delete(k);
    }
  }
}

function clearFailures(ip: string): void {
  failedAttempts.delete(ip);
}

// ── Security headers applied to ALL responses ──
function applySecurityHeaders(response: NextResponse, pathname: string): NextResponse {
  // Anti-indexing (Layer 3 redundancy)
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet, noimageindex");
  // Prevent caching of any content
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  // Standard security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");

  // Frame headers: game pages need SAME-ORIGIN so the React shell at
  // /games/[slug]/ can embed the static iframe asset at the same path.
  // Everything else stays unframable.
  if (pathname.startsWith("/games/")) {
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    response.headers.set("Content-Security-Policy", "frame-ancestors 'self'");
  } else {
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
  }
  return response;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const LOCKDOWN_PASSWORD = process.env.SITE_LOCKDOWN_PASSWORD;

  // If no password is configured, BLOCK EVERYTHING (fail-closed)
  if (!LOCKDOWN_PASSWORD) {
    const response = new NextResponse(
      "Site is in maintenance mode.",
      { status: 503, headers: { "Content-Type": "text/plain", "Retry-After": "3600" } }
    );
    return applySecurityHeaders(response, pathname);
  }

  // ── Rate limit check ──
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  if (isRateLimited(ip)) {
    const response = new NextResponse(
      "Too many failed attempts. Try again later.",
      { status: 429, headers: { "Content-Type": "text/plain", "Retry-After": "60" } }
    );
    return applySecurityHeaders(response, pathname);
  }

  // ── Parse Basic Auth header ──
  const authHeader = request.headers.get("authorization");

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme === "Basic" && encoded) {
      try {
        const decoded = atob(encoded);
        const [, password] = decoded.split(":");

        if (password === LOCKDOWN_PASSWORD) {
          clearFailures(ip);
          const response = NextResponse.next();
          return applySecurityHeaders(response, pathname);
        }
      } catch {
        // Malformed auth header — treat as failure
      }
    }
  }

  // ── No valid auth → record failure + prompt for credentials ──
  if (authHeader) {
    // They tried and failed
    recordFailure(ip);
  }

  // NOTE: WWW-Authenticate value must be PRINTABLE ASCII ONLY — Vercel's
  // edge silently strips headers containing non-ASCII chars (em dash,
  // curly quotes, etc.), which results in a 401 body with no browser
  // prompt. Stick to hyphens and straight quotes here.
  const response = new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Fuzzynuts Staging - Authorized Access Only", charset="UTF-8"',
      "Content-Type": "text/plain",
    },
  });
  return applySecurityHeaders(response, pathname);
}

/**
 * Match EVERY route — no exceptions.
 * This covers: pages, static files, _next chunks, images, games, API routes, etc.
 */
export const config = {
  matcher: ["/((?!_vercel).*)"],
};
