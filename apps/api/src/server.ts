/**
 * apps/api server bootstrap.
 *
 * STATUS: scaffold — wires the new session + auth routers but DOES NOT
 *         yet replace the live rewards / scores handlers in the deployed
 *         Railway code. That swap happens in the auth-rollout PR after
 *         Phase E (xrpl-token-utils) finishes.
 */

import express from "express";
import cors from "cors";
import { buildSessionRouter } from "./routes/session";
import { buildAuthRouter } from "./routes/auth";
import { buildGameSessionRouter } from "./routes/game-session";
import { buildRscRouter } from "./routes/rsc";
import { buildWalletAuth } from "./middleware/walletAuth";

const PORT = Number(process.env.PORT ?? 4000);

/**
 * Env vars: read at startup but don't throw if missing.
 * Routes that need them will return 503 if the var was absent.
 * This prevents Railway container crashes when env vars are
 * injected at deploy time (Dockerfile builder quirk).
 */
function optionalEnv(name: string, fallback = ""): string {
  const v = process.env[name];
  if (!v) {
    console.warn(`[api] Missing env var: ${name} (feature will return 503)`);
    return fallback;
  }
  return v;
}

const WALLET_JWT_SECRET = optionalEnv("WALLET_JWT_SECRET");
const GAME_SESSION_SECRET = optionalEnv("GAME_SESSION_SECRET");
const MONGODB_URI = optionalEnv("MONGODB_URI");
const RSC_PASSWORD_SECRET = optionalEnv("RSC_PASSWORD_SECRET");

const app = express();

// ── CORS — allow the frontend origin to call this API ──────────
const ALLOWED_ORIGINS = [
  "https://fuzzynuts.xyz",
  "https://www.fuzzynuts.xyz",
  "http://localhost:3000", // local dev
];
app.use(
  cors({
    origin(origin, cb) {
      // Allow requests with no origin (curl, server-to-server)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "16kb" }));

app.get("/healthz", (_req, res) => {
  const envStatus = {
    WALLET_JWT_SECRET: !!WALLET_JWT_SECRET,
    GAME_SESSION_SECRET: !!GAME_SESSION_SECRET,
    MONGODB_URI: !!MONGODB_URI,
    RSC_PASSWORD_SECRET: !!RSC_PASSWORD_SECRET,
  };
  res.json({ ok: true, rsc: true, version: "2.0", env: envStatus });
});

// Shared challenge store — auth.ts issues challenges, game-session.ts consumes them
const challengeStore = new Map<
  string,
  { address: string; challenge: string; exp: number }
>();

app.use("/api/session", buildSessionRouter({ GAME_SESSION_SECRET }));
app.use(
  "/api/auth",
  buildAuthRouter({ WALLET_JWT_SECRET, challengeStore }),
);
app.use(
  "/api/auth",
  buildGameSessionRouter({
    GAME_SESSION_SECRET,
    OPENRSC_GAME_ENDPOINT: process.env.OPENRSC_GAME_ENDPOINT,
    GAME_SERVER_READY: process.env.GAME_SERVER_READY,
    challengeStore,
  }),
);

// RSC wallet-to-username mapping (gated by wallet JWT)
// Returns 503 if required env vars are missing
if (MONGODB_URI && RSC_PASSWORD_SECRET && WALLET_JWT_SECRET) {
  app.use("/api/rsc", buildWalletAuth({ WALLET_JWT_SECRET }), buildRscRouter({
    MONGODB_URI,
    RSC_PASSWORD_SECRET,
  }));
} else {
  app.use("/api/rsc", (_req, res) => {
    res.status(503).json({ error: "E_SERVICE_UNAVAILABLE", detail: "RSC feature not configured" });
  });
}

// TODO(auth-rollout): mount migrated /api/scores, /api/rewards, /api/scores/stream

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`@fuzzynuts/api listening on :${PORT}`);
});
