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

const PORT = Number(process.env.PORT ?? 4000);
const WALLET_JWT_SECRET = required("WALLET_JWT_SECRET");
const GAME_SESSION_SECRET = required("GAME_SESSION_SECRET");

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

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

app.get("/healthz", (_req, res) => res.json({ ok: true }));

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

// TODO(auth-rollout): mount migrated /api/scores, /api/rewards, /api/scores/stream

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`@fuzzynuts/api listening on :${PORT}`);
});
