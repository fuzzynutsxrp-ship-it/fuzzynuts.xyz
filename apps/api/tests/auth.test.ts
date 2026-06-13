/**
 * Auth route tests — wallet authentication via Xaman OAuth2 + challenge/verify.
 *
 * TOUCHES MONEY CODE — the auth flow controls who can submit scores.
 * Tests cover:
 *   - Xaman OAuth token validation (server-side, not trust client)
 *   - CSRF protection (custom header requirement)
 *   - JWT TTL (24 hours, reduced from 7 days)
 *   - Address regex (exactly 34 chars)
 *   - Challenge/verify flow (existing, still works)
 *   - Session management (/me, /logout)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { SignJWT } from "jose";

// Mock the dependencies
vi.mock("@fuzzynuts/shared-anticheat", () => ({
  mintNonce: vi.fn(() => "test-nonce-" + Date.now()),
}));

vi.mock("@fuzzynuts/xrpl-token-utils/verify", () => ({
  verifyMessageSignature: vi.fn(),
}));

// Mock global fetch for Xaman userinfo calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const TEST_SECRET = "test-jwt-secret-for-auth-tests";
const TEST_ADDRESS = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh"; // exactly 34 chars

async function buildApp() {
  // Dynamic import to pick up mocks
  const { buildAuthRouter } = await import("../src/routes/auth");
  const app = express();
  app.use(express.json());
  app.use("/api/auth", buildAuthRouter({ WALLET_JWT_SECRET: TEST_SECRET }));
  return app;
}

async function mintTestJwt(
  address: string = TEST_ADDRESS,
  provider: string = "xaman",
  secret: string = TEST_SECRET,
  expOffset: number = 3600,
) {
  const exp = Math.floor(Date.now() / 1000) + expOffset;
  return new SignJWT({ address, provider })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("fuzzynuts.xyz")
    .setExpirationTime(exp)
    .sign(new TextEncoder().encode(secret));
}

describe("Auth routes", () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Wallet Login (Xaman OAuth) ────────────────────────────────

  describe("POST /api/auth/wallet-login", () => {
    it("valid wallet login → JWT cookie with correct address/provider", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ account: TEST_ADDRESS }),
      });

      const res = await request(app)
        .post("/api/auth/wallet-login")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ address: TEST_ADDRESS, token: "valid-xaman-token" });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.address).toBe(TEST_ADDRESS);

      // Check cookies are set
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const cookieArr = Array.isArray(cookies) ? cookies : [cookies];
      const sessionCookie = cookieArr.find((c: string) =>
        c.startsWith("fuzzy_wallet_session="),
      );
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain("HttpOnly");
      expect(sessionCookie).toContain("Secure");
      expect(sessionCookie).toContain("SameSite=Lax");
      // 24-hour TTL (86400 seconds)
      expect(sessionCookie).toContain("Max-Age=86400");
    });

    it("missing CSRF header → 403 E_CSRF", async () => {
      const res = await request(app)
        .post("/api/auth/wallet-login")
        .send({ address: TEST_ADDRESS, token: "valid-token" });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("E_CSRF");
    });

    it("missing address → 400 E_SCHEMA", async () => {
      const res = await request(app)
        .post("/api/auth/wallet-login")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ token: "valid-token" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("E_SCHEMA");
    });

    it("missing token → 400 E_SCHEMA", async () => {
      const res = await request(app)
        .post("/api/auth/wallet-login")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ address: TEST_ADDRESS });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("E_SCHEMA");
    });

    it("invalid address format (too short) → 400 E_SCHEMA", async () => {
      const res = await request(app)
        .post("/api/auth/wallet-login")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ address: "rShort", token: "valid-token" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("E_SCHEMA");
    });

    it("invalid Xaman token → 401 E_XAMAN_TOKEN_INVALID", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const res = await request(app)
        .post("/api/auth/wallet-login")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ address: TEST_ADDRESS, token: "invalid-token" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("E_XAMAN_TOKEN_INVALID");
    });

    it("address mismatch (token for different wallet) → 401", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          account: "rPDXnMjGFQRpvYEHTp7So9mY31draBoqLG",
        }),
      });

      const res = await request(app)
        .post("/api/auth/wallet-login")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ address: TEST_ADDRESS, token: "valid-token" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("E_XAMAN_TOKEN_INVALID");
      expect(res.body.detail).toContain("Address mismatch");
    });

    it("Xaman userinfo timeout → 401 E_XAMAN_TOKEN_INVALID", async () => {
      mockFetch.mockRejectedValueOnce(new Error("The operation was aborted"));

      const res = await request(app)
        .post("/api/auth/wallet-login")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ address: TEST_ADDRESS, token: "token" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("E_XAMAN_TOKEN_INVALID");
    });
  });

  // ── Session Management ────────────────────────────────────────

  describe("GET /api/auth/me", () => {
    it("valid session → returns user info", async () => {
      const jwt = await mintTestJwt();

      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", `fuzzy_wallet_session=${jwt}`);

      expect(res.status).toBe(200);
      expect(res.body.user.address).toBe(TEST_ADDRESS);
      expect(res.body.user.provider).toBe("xaman");
    });

    it("no cookie → 401 E_NO_SESSION", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("E_NO_SESSION");
    });

    it("expired token → 401 E_BAD_SESSION", async () => {
      // expired 1 hour ago
      const jwt = await mintTestJwt(TEST_ADDRESS, "xaman", TEST_SECRET, -3600);

      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", `fuzzy_wallet_session=${jwt}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("E_BAD_SESSION");
    });

    it("tampered token → 401 E_BAD_SESSION", async () => {
      const jwt = await mintTestJwt();
      const tampered = jwt.slice(0, -5) + "XXXXX";

      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", `fuzzy_wallet_session=${tampered}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("E_BAD_SESSION");
    });

    it("wrong issuer → 401 E_BAD_SESSION", async () => {
      const jwt = await new SignJWT({ address: TEST_ADDRESS, provider: "xaman" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer("evil.com")
        .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
        .sign(new TextEncoder().encode(TEST_SECRET));

      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", `fuzzy_wallet_session=${jwt}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("E_BAD_SESSION");
    });

    it("wrong secret → 401 E_BAD_SESSION", async () => {
      const jwt = await mintTestJwt(TEST_ADDRESS, "xaman", "wrong-secret");

      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", `fuzzy_wallet_session=${jwt}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("E_BAD_SESSION");
    });
  });

  // ── Logout ────────────────────────────────────────────────────

  describe("POST /api/auth/logout", () => {
    it("clears cookies with Max-Age=0", async () => {
      const res = await request(app).post("/api/auth/logout");

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const cookieArr = Array.isArray(cookies) ? cookies : [cookies];
      const sessionCookie = cookieArr.find((c: string) =>
        c.startsWith("fuzzy_wallet_session="),
      );
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain("Max-Age=0");
    });
  });

  // ── Challenge/Verify (existing flow, still works) ─────────────

  describe("POST /api/auth/challenge", () => {
    it("valid address → returns challenge", async () => {
      const res = await request(app)
        .post("/api/auth/challenge")
        .send({ address: TEST_ADDRESS });

      expect(res.status).toBe(200);
      expect(res.body.challenge).toContain("fuzzynuts.xyz");
      expect(res.body.challengeId).toBeDefined();
      expect(res.body.exp).toBeGreaterThan(Date.now());
    });

    it("invalid address → 400 E_SCHEMA", async () => {
      const res = await request(app)
        .post("/api/auth/challenge")
        .send({ address: "bad" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("E_SCHEMA");
    });
  });

  // ── JWT Compatibility with walletAuth middleware ───────────────

  describe("JWT compatibility", () => {
    it("JWT from wallet-login is compatible with walletAuth middleware", async () => {
      // First, do a wallet login
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ account: TEST_ADDRESS }),
      });

      const loginRes = await request(app)
        .post("/api/auth/wallet-login")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ address: TEST_ADDRESS, token: "valid-token" });

      expect(loginRes.status).toBe(200);

      // Extract the JWT cookie
      const cookies = loginRes.headers["set-cookie"];
      const cookieArr = Array.isArray(cookies) ? cookies : [cookies];
      const sessionCookie = cookieArr.find((c: string) =>
        c.startsWith("fuzzy_wallet_session="),
      );
      const jwt = sessionCookie!.split("=")[1].split(";")[0];

      // Use it with /me (which does the same jwtVerify as walletAuth)
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", `fuzzy_wallet_session=${jwt}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.address).toBe(TEST_ADDRESS);
      expect(meRes.body.user.provider).toBe("xaman-oauth");
    });

    it("JWT TTL is 24 hours (not 7 days)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ account: TEST_ADDRESS }),
      });

      const res = await request(app)
        .post("/api/auth/wallet-login")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ address: TEST_ADDRESS, token: "valid-token" });

      const cookies = res.headers["set-cookie"];
      const cookieArr = Array.isArray(cookies) ? cookies : [cookies];
      const sessionCookie = cookieArr.find((c: string) =>
        c.startsWith("fuzzy_wallet_session="),
      );

      // 24 hours = 86400 seconds. Old was 7 days = 604800.
      expect(sessionCookie).toContain("Max-Age=86400");
      expect(sessionCookie).not.toContain("Max-Age=604800");
    });
  });
});
