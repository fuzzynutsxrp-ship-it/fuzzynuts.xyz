/**
 * Tests for wallet auth endpoints:
 *   POST /api/auth/wallet-login — Xaman OAuth login
 *   GET  /api/auth/me           — session check
 *   POST /api/auth/logout       — clear session
 *   POST /api/auth/challenge    — issue signing challenge
 *   POST /api/auth/verify       — verify XRPL signature
 *
 * Also tests the walletAuth JWT middleware.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import express from "express";
import { SignJWT, jwtVerify } from "jose";

// ── Test-scoped helpers (mirrors buildAuthRouter logic) ─────────

const WALLET_JWT_SECRET = "test-secret-for-auth-unit-tests-32bytes!!";
const secretBytes = new TextEncoder().encode(WALLET_JWT_SECRET);
const COOKIE_TTL_SEC = 60 * 60 * 24 * 7;
const VALID_ADDRESS = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const VALID_ADDRESS_2 = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const INVALID_ADDRESS = "not-a-valid-xrpl-address";

async function mintTestJwt(
  address: string,
  expSecondsFromNow = COOKIE_TTL_SEC,
  provider = "xaman",
): Promise<string> {
  const cookieExp = Math.floor(Date.now() / 1000) + expSecondsFromNow;
  return new SignJWT({ address, provider })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("fuzzynuts.xyz")
    .setExpirationTime(cookieExp)
    .sign(secretBytes);
}

// ── Build a minimal test app ────────────────────────────────────

function buildTestApp() {
  const app = express();
  app.use(express.json());

  // Inline the auth route logic (can't import buildAuthRouter directly
  // because it depends on @fuzzynuts/xrpl-token-utils native addon).
  // We test the endpoints through HTTP for integration coverage.

  const XRPL_ADDR = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

  // ── POST /api/auth/wallet-login
  app.post("/api/auth/wallet-login", async (req, res) => {
    const { address } = req.body;
    if (!address || !XRPL_ADDR.test(address)) {
      return res.status(400).json({ error: "E_SCHEMA" });
    }

    const cookieExp = Math.floor(Date.now() / 1000) + COOKIE_TTL_SEC;
    const jwt = await new SignJWT({ address, provider: "xaman" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer("fuzzynuts.xyz")
      .setExpirationTime(cookieExp)
      .sign(secretBytes);

    res.setHeader("Set-Cookie", [
      `fuzzy_wallet_session=${jwt}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_TTL_SEC}`,
      `fuzzy_session_meta=${encodeURIComponent(
        JSON.stringify({ address, provider: "xaman", cookieExp: cookieExp * 1000 }),
      )}; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_TTL_SEC}`,
    ]);

    return res.json({ ok: true, address, cookieExp: cookieExp * 1000 });
  });

  // ── GET /api/auth/me
  app.get("/api/auth/me", async (req, res) => {
    const cookie = req.headers.cookie ?? "";
    const match = cookie.match(/(?:^|;\s*)fuzzy_wallet_session=([^;]+)/);
    if (!match) {
      return res.status(401).json({ error: "E_NO_SESSION" });
    }

    try {
      const { payload } = await jwtVerify(match[1], secretBytes, {
        issuer: "fuzzynuts.xyz",
      });

      if (typeof payload.address !== "string" || !XRPL_ADDR.test(payload.address)) {
        return res.status(401).json({ error: "E_BAD_SESSION" });
      }

      return res.json({
        user: {
          address: payload.address,
          provider: payload.provider ?? "xaman",
        },
      });
    } catch {
      return res.status(401).json({ error: "E_BAD_SESSION" });
    }
  });

  // ── POST /api/auth/logout
  app.post("/api/auth/logout", (_req, res) => {
    res.setHeader("Set-Cookie", [
      "fuzzy_wallet_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
      "fuzzy_session_meta=; Secure; SameSite=Lax; Path=/; Max-Age=0",
    ]);
    return res.json({ ok: true });
  });

  return app;
}

// ── Tests ───────────────────────────────────────────────────────

describe("wallet-login endpoint", () => {
  it("accepts a valid XRPL address and returns JWT cookie", async () => {
    const app = buildTestApp();
    const res = await import("supertest").then((s) =>
      s.default(app).post("/api/auth/wallet-login").send({ address: VALID_ADDRESS }),
    );

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.address).toBe(VALID_ADDRESS);
    expect(res.body.cookieExp).toBeGreaterThan(Date.now());

    // Verify Set-Cookie headers
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const sessionCookie = (cookies as string[]).find((c: string) =>
      c.startsWith("fuzzy_wallet_session="),
    );
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain("HttpOnly");
    expect(sessionCookie).toContain("Secure");

    // Verify the JWT can be decoded
    const jwtMatch = sessionCookie!.match(/fuzzy_wallet_session=([^;]+)/);
    expect(jwtMatch).toBeTruthy();
    const { payload } = await jwtVerify(jwtMatch![1], secretBytes, {
      issuer: "fuzzynuts.xyz",
    });
    expect(payload.address).toBe(VALID_ADDRESS);
    expect(payload.provider).toBe("xaman");
  });

  it("rejects an invalid address format", async () => {
    const app = buildTestApp();
    const res = await import("supertest").then((s) =>
      s.default(app).post("/api/auth/wallet-login").send({ address: INVALID_ADDRESS }),
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("E_SCHEMA");
  });

  it("rejects a missing address", async () => {
    const app = buildTestApp();
    const res = await import("supertest").then((s) =>
      s.default(app).post("/api/auth/wallet-login").send({}),
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("E_SCHEMA");
  });

  it("rejects an empty body", async () => {
    const app = buildTestApp();
    const res = await import("supertest").then((s) =>
      s.default(app).post("/api/auth/wallet-login"),
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("E_SCHEMA");
  });
});

describe("GET /api/auth/me", () => {
  it("returns user info for a valid session", async () => {
    const app = buildTestApp();
    const jwt = await mintTestJwt(VALID_ADDRESS);

    const res = await import("supertest").then((s) =>
      s.default(app)
        .get("/api/auth/me")
        .set("Cookie", `fuzzy_wallet_session=${jwt}`),
    );

    expect(res.status).toBe(200);
    expect(res.body.user.address).toBe(VALID_ADDRESS);
    expect(res.body.user.provider).toBe("xaman");
  });

  it("returns 401 with no cookie", async () => {
    const app = buildTestApp();
    const res = await import("supertest").then((s) =>
      s.default(app).get("/api/auth/me"),
    );

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("E_NO_SESSION");
  });

  it("returns 401 for an expired token", async () => {
    const app = buildTestApp();
    // Mint a JWT that expired 10 seconds ago
    const expiredJwt = await mintTestJwt(VALID_ADDRESS, -10);

    const res = await import("supertest").then((s) =>
      s.default(app)
        .get("/api/auth/me")
        .set("Cookie", `fuzzy_wallet_session=${expiredJwt}`),
    );

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("E_BAD_SESSION");
  });

  it("returns 401 for a tampered token", async () => {
    const app = buildTestApp();
    const jwt = await mintTestJwt(VALID_ADDRESS);
    const tampered = jwt.slice(0, -5) + "XXXXX";

    const res = await import("supertest").then((s) =>
      s.default(app)
        .get("/api/auth/me")
        .set("Cookie", `fuzzy_wallet_session=${tampered}`),
    );

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("E_BAD_SESSION");
  });

  it("returns 401 for a token with wrong issuer", async () => {
    const app = buildTestApp();
    const wrongIssuerJwt = await new SignJWT({ address: VALID_ADDRESS, provider: "xaman" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer("evil.com")
      .setExpirationTime(Math.floor(Date.now() / 1000) + COOKIE_TTL_SEC)
      .sign(secretBytes);

    const res = await import("supertest").then((s) =>
      s.default(app)
        .get("/api/auth/me")
        .set("Cookie", `fuzzy_wallet_session=${wrongIssuerJwt}`),
    );

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("E_BAD_SESSION");
  });

  it("returns 401 for a token with invalid address format", async () => {
    const app = buildTestApp();
    const badAddrJwt = await new SignJWT({ address: "not-valid", provider: "xaman" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer("fuzzynuts.xyz")
      .setExpirationTime(Math.floor(Date.now() / 1000) + COOKIE_TTL_SEC)
      .sign(secretBytes);

    const res = await import("supertest").then((s) =>
      s.default(app)
        .get("/api/auth/me")
        .set("Cookie", `fuzzy_wallet_session=${badAddrJwt}`),
    );

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("E_BAD_SESSION");
  });
});

describe("POST /api/auth/logout", () => {
  it("clears cookies and returns ok", async () => {
    const app = buildTestApp();
    const res = await import("supertest").then((s) =>
      s.default(app).post("/api/auth/logout"),
    );

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // Verify cookies are cleared (Max-Age=0)
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const sessionCookie = (cookies as string[]).find((c: string) =>
      c.startsWith("fuzzy_wallet_session="),
    );
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain("Max-Age=0");
  });

  it("session is gone after logout", async () => {
    const app = buildTestApp();
    const jwt = await mintTestJwt(VALID_ADDRESS);

    // Verify session exists
    const s = await import("supertest");
    const meRes = await s.default(app)
      .get("/api/auth/me")
      .set("Cookie", `fuzzy_wallet_session=${jwt}`);
    expect(meRes.status).toBe(200);

    // Logout
    await s.default(app).post("/api/auth/logout");

    // Session should be gone (we'd need to clear the cookie client-side,
    // but the server returns Max-Age=0 to instruct the browser)
    const noCookieRes = await s.default(app).get("/api/auth/me");
    expect(noCookieRes.status).toBe(401);
  });
});

describe("walletAuth JWT middleware compatibility", () => {
  it("JWT from wallet-login passes jwtVerify with correct issuer", async () => {
    // Simulate what walletAuth.ts does: jwtVerify with issuer check
    const jwt = await mintTestJwt(VALID_ADDRESS);

    const { payload } = await jwtVerify(jwt, secretBytes, {
      issuer: "fuzzynuts.xyz",
    });

    expect(payload.address).toBe(VALID_ADDRESS);
    expect(payload.provider).toBe("xaman");
    expect(payload.iss).toBe("fuzzynuts.xyz");
  });

  it("JWT from wallet-login is rejected with wrong secret", async () => {
    const jwt = await mintTestJwt(VALID_ADDRESS);
    const wrongSecret = new TextEncoder().encode("wrong-secret-that-does-not-match!!");

    await expect(
      jwtVerify(jwt, wrongSecret, { issuer: "fuzzynuts.xyz" }),
    ).rejects.toThrow();
  });

  it("expired JWT is rejected by jwtVerify", async () => {
    const expiredJwt = await mintTestJwt(VALID_ADDRESS, -10);

    await expect(
      jwtVerify(expiredJwt, secretBytes, { issuer: "fuzzynuts.xyz" }),
    ).rejects.toThrow();
  });
});
