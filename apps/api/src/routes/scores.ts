/**
 * POST /api/scores — Submit a game score (unified Web2 + Web3)
 *
 * Accepts two authentication paths:
 *   Path A (Web3):  X-Game-Session header with HMAC-signed session token
 *                   (existing wallet flow — game-auth.ts middleware)
 *   Path B (Web2):  Authorization: Bearer <next-auth-jwt>
 *                   (Google sign-in flow)
 *
 * Both paths save to the `arcade_scores` collection with:
 *   - `wallet` (optional — present for Web3 users)
 *   - `userId` (always present — links to unified User model)
 *   - `displayName` (resolved from User model)
 *
 * The leaderboard and Discord cron read from this collection.
 */

import { Router } from "express";
import { z } from "zod";
import { jwtVerify } from "jose";
import { type Db, MongoClient } from "mongodb";
import {
  verifySessionToken,
  verifyPayload,
  buildScoreMessage,
} from "@fuzzynuts/shared-anticheat";
import {
  upsertGoogleUser,
  upsertWalletUser,
} from "../models/User";

// ── Constants ──────────────────────────────────────────────────

const COLLECTION = "arcade_scores";
export const VALID_GAMES = [
  "mario",
  "fuzzy-survivors",
  "minigolf",
  "nut-racer",
  "fuzzynuts-world",
  "rsc",
  "dragon-hoard",
  "cosmic-blaster",
  "snake",
  "breakout",
  "pong",
  "tetris",
  "asteroids",
  "flappy",
  "subway-runner",
  "jetpack",
  "ski-free",
  "doodle-jump",
  "2048",
  "memory",
  "minesweeper",
  "sudoku",
  "wordle",
  "tank-battle",
  "helicopter",
  "fruit-ninja",
  "tower-defense",
  "space-invaders",
  "boxing",
  "bowling",
  "archery",
  "surf-up",
  "rally",
  "maze-escape",
  "frogger",
  "bomberman",
  "capture-flag",
  "tower-stack",
] as const;

// Authoritative score caps — must match gameRegistry.ts exactly
export const SCORE_CAPS: Record<string, number> = {
  "mario": 99_999,
  "fuzzy-survivors": 999_999,
  "minigolf": 10_500,
  "nut-racer": 99_999,
  "fuzzynuts-world": 10_000_000,
  "rsc": 99_000_000,
  "dragon-hoard": 999_999,
  "cosmic-blaster": 999_999,
  "snake": 50_000,
  "breakout": 100_000,
  "pong": 11,
  "tetris": 999_999,
  "asteroids": 500_000,
  "flappy": 999,
  "subway-runner": 50_000,
  "jetpack": 100_000,
  "ski-free": 99_999,
  "doodle-jump": 500_000,
  "2048": 999_999,
  "memory": 10_000,
  "minesweeper": 99_999,
  "sudoku": 99_999,
  "wordle": 1_000,
  "tank-battle": 500_000,
  "helicopter": 99_999,
  "fruit-ninja": 999_999,
  "tower-defense": 999_999,
  "space-invaders": 99_999,
  "boxing": 99_999,
  "bowling": 300,
  "archery": 99_999,
  "surf-up": 99_999,
  "rally": 99_999,
  "maze-escape": 99_999,
  "frogger": 99_999,
  "bomberman": 99_999,
  "capture-flag": 99_999,
  "tower-stack": 99_999,
};

// ── Zod Schemas ────────────────────────────────────────────────

const ScoreBody = z.object({
  game: z.enum(VALID_GAMES),
  score: z.number().int().positive().max(99_999_999),
  sessionToken: z.string().min(1).optional(), // Web3 session token
  duration: z.number().min(3).optional(), // Play duration in seconds
  weekKey: z.string().regex(/^\d{4}-W\d{2}$/).optional(),
});

// ── Types ──────────────────────────────────────────────────────

interface AuthenticatedUser {
  userId: string;
  wallet?: string;
  displayName: string;
  provider: "google" | "xrpl" | "both";
}

interface ScoreDocument {
  game: string;
  score: number;
  userId: string;
  wallet?: string;
  displayName: string;
  weekKey: string;
  ts: Date;
  ip: string;
  duration?: number;
  provider: "google" | "xrpl" | "both";
}

// ── Helpers ────────────────────────────────────────────────────

/** ISO 8601 week key (matches rewards-api.js and discord cron) */
function getCurrentWeekKey(): string {
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** Resolve user from a NextAuth JWT (Web2 path) */
async function resolveGoogleUser(
  db: Db,
  token: string,
  secret: string,
): Promise<AuthenticatedUser | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { issuer: "https://fuzzynuts.xyz" }, // NextAuth issuer
    );

    const googleId = payload.sub;
    const email = payload.email as string | undefined;
    const name = payload.name as string | undefined;
    const image = payload.picture as string | undefined;

    if (!googleId) return null;

    // Upsert into unified User model
    const user = await upsertGoogleUser(db, {
      googleId,
      email: email ?? `${googleId}@google.placeholder`,
      name,
      image,
    });

    return {
      userId: user._id!,
      displayName: user.name ?? email?.split("@")[0] ?? "Player",
      provider: "google",
    };
  } catch {
    return null;
  }
}

/** Resolve user from a Web3 session token (existing path) */
async function resolveWalletUser(
  db: Db,
  sessionToken: string,
  signingSecret: string,
): Promise<AuthenticatedUser | null> {
  const result = await verifySessionToken(sessionToken, signingSecret);
  if (!result.ok || !result.claims.wallet) return null;

  const wallet = result.claims.wallet;

  // Upsert into unified User model
  const user = await upsertWalletUser(db, {
    walletAddress: wallet,
  });

  return {
    userId: user._id!,
    wallet,
    displayName:
      user.name ?? `Player_${wallet.slice(1, 7)}`,
    provider: user.provider as "xrpl" | "both",
  };
}

// ── Rate Limiter (in-memory) ───────────────────────────────────

const rateLimitStore = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function checkRateLimit(userId: string, ip: string, game: string): boolean {
  const key = `${userId}:${ip}:${game}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// Purge expired entries every 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitStore.delete(key);
    }
  }
}, 60_000);

// ── Router Builder ─────────────────────────────────────────────

export function buildScoresRouter(env: {
  MONGODB_URI: string;
  GAME_SESSION_SECRET: string;
  WALLET_JWT_SECRET: string;
}): Router {
  const router = Router();
  let _db: Db | null = null;

  async function getDb(): Promise<Db> {
    if (!_db) {
      const client = new MongoClient(env.MONGODB_URI, {
        connectTimeoutMS: 10_000,
        serverSelectionTimeoutMS: 10_000,
      });
      await client.connect();
      _db = client.db();
    }
    return _db;
  }

  // ── POST /api/scores ───────────────────────────────────────
  router.post("/", async (req, res) => {
    try {
      const parsed = ScoreBody.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ error: "E_SCHEMA", details: parsed.error.flatten() });
      }

      const { game, score, sessionToken, duration, weekKey } = parsed.data;
      const db = await getDb();
      const clientIP =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
        req.ip ??
        "unknown";

      // ── Authenticate: try both paths ─────────────────────

      let authUser: AuthenticatedUser | null = null;

      // Path A: Web3 session token (X-Game-Session header or body)
      const rawSession =
        (req.headers["x-game-session"] as string) ?? sessionToken;
      if (rawSession) {
        authUser = await resolveWalletUser(
          db,
          rawSession,
          env.GAME_SESSION_SECRET,
        );
      }

      // Path B: Web2 NextAuth JWT (Authorization header)
      if (!authUser) {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
          const jwt = authHeader.slice(7);
          authUser = await resolveGoogleUser(db, jwt, env.WALLET_JWT_SECRET);
        }
      }

      // Path C: Guest (no auth) — allowed but not eligible for prizes
      if (!authUser) {
        authUser = {
          userId: `guest_${clientIP.replace(/[^a-zA-Z0-9]/g, "_")}`,
          displayName: "Guest",
          provider: "google",
        };
      }

      // ── HMAC signature verification ──────────────────────
      // If X-Score-Hmac header is present, verify the HMAC.
      // If missing, fall back to existing auth (backward compat during rollout).
      const hmacSignature = req.headers["x-score-hmac"] as string | undefined;
      const hmacNonce = req.headers["x-score-nonce"] as string | undefined;

      if (hmacSignature) {
        if (!hmacNonce) {
          return res.status(401).json({
            error: "E_HMAC_NONCE_MISSING",
            message: "X-Score-Nonce header required when X-Score-Hmac is present",
          });
        }

        const expectedDuration = duration ?? 0;
        const expectedWeekKey = weekKey ?? getCurrentWeekKey();
        const walletAddress = authUser.wallet ?? "";

        const message = buildScoreMessage({
          game,
          score,
          duration: expectedDuration,
          nonce: hmacNonce,
          wallet: walletAddress,
          weekKey: expectedWeekKey,
        });

        const isValid = await verifyPayload(
          message,
          hmacSignature,
          env.GAME_SESSION_SECRET,
        );

        if (!isValid) {
          console.warn(
            `[scores] ❌ HMAC verification failed for ${authUser.displayName} on ${game}`,
          );
          return res.status(401).json({
            error: "E_HMAC_INVALID",
            message: "Invalid HMAC signature",
          });
        }
      }

      // ── Validate score cap ───────────────────────────────

      const cap = SCORE_CAPS[game];
      if (cap !== undefined && score > cap) {
        return res.status(400).json({
          error: `Score ${score} exceeds cap of ${cap} for ${game}`,
        });
      }

      // ── Rate limit ───────────────────────────────────────

      if (!checkRateLimit(authUser.userId, clientIP, game)) {
        return res.status(429).json({
          error: "Rate limited — too many submissions. Try again in a few minutes.",
        });
      }

      // ── Save score ───────────────────────────────────────

      const scoreDoc: ScoreDocument = {
        game,
        score,
        userId: authUser.userId,
        wallet: authUser.wallet,
        displayName: authUser.displayName,
        weekKey: weekKey ?? getCurrentWeekKey(),
        ts: new Date(),
        ip: clientIP,
        duration,
        provider: authUser.provider,
      };

      await db.collection(COLLECTION).insertOne(scoreDoc);

      console.log(
        `[scores] ✅ ${authUser.displayName} (${authUser.provider}) scored ${score} on ${game}`,
      );

      return res.json({
        ok: true,
        score,
        game,
        displayName: authUser.displayName,
        weekKey: scoreDoc.weekKey,
      });
    } catch (err) {
      console.error("[scores] Submission error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // ── GET /api/scores/stream — SSE leaderboard ─────────────
  router.get("/stream", async (req, res) => {
    try {
      const db = await getDb();
      const game = (req.query.game as string) ?? "all";
      const week = (req.query.week as string) ?? getCurrentWeekKey();

      // Set SSE headers
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });

      // Send initial snapshot
      const query: Record<string, unknown> = { weekKey: week };
      if (game !== "all") query.game = game;

      const scores = await db
        .collection(COLLECTION)
        .find(query)
        .sort({ score: -1 })
        .limit(50)
        .toArray();

      // Group by userId, keep best score per game per user
      const bestByUser = new Map<string, (typeof scores)[0]>();
      for (const s of scores) {
        const key = `${s.userId ?? s.wallet ?? "unknown"}_${s.game}`;
        const existing = bestByUser.get(key);
        if (!existing || s.score > existing.score) {
          bestByUser.set(key, s);
        }
      }

      const leaderboard = Array.from(bestByUser.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 50)
        .map((s) => ({
          wallet: s.wallet ?? "",
          name: s.displayName ?? s.name ?? "Player",
          score: s.score,
          game: s.game,
          ts: s.ts?.getTime?.() ?? Date.now(),
          userId: s.userId,
        }));

      res.write(
        `data: ${JSON.stringify({ type: "initial", data: leaderboard })}\n\n`,
      );

      // Heartbeat every 15s
      const heartbeat = setInterval(() => {
        res.write(`event: heartbeat\ndata: {}\n\n`);
      }, 15_000);

      // Poll for updates every 5s (simple SSE — not tailable cursor)
      const poll = setInterval(async () => {
        try {
          const updated = await db
            .collection(COLLECTION)
            .find(query)
            .sort({ score: -1 })
            .limit(50)
            .toArray();

          const best = new Map<string, (typeof updated)[0]>();
          for (const s of updated) {
            const key = `${s.userId ?? s.wallet ?? "unknown"}_${s.game}`;
            const existing = best.get(key);
            if (!existing || s.score > existing.score) {
              best.set(key, s);
            }
          }

          const fresh = Array.from(best.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 50)
            .map((s) => ({
              wallet: s.wallet ?? "",
              name: s.displayName ?? s.name ?? "Player",
              score: s.score,
              game: s.game,
              ts: s.ts?.getTime?.() ?? Date.now(),
              userId: s.userId,
            }));

          res.write(
            `data: ${JSON.stringify({ type: "replace", data: fresh })}\n\n`,
          );
        } catch {
          // Silent — client will reconnect
        }
      }, 5_000);

      // Cleanup on disconnect
      req.on("close", () => {
        clearInterval(heartbeat);
        clearInterval(poll);
      });
    } catch (err) {
      console.error("[scores] SSE error:", err);
      res.status(500).json({ error: "Stream failed" });
    }
  });

  return router;
}
