/**
 * apps/api server bootstrap.
 *
 * STATUS: scaffold — wires the new session + auth routers but DOES NOT
 *         yet replace the live rewards / scores handlers in the deployed
 *         Railway code. That swap happens in the auth-rollout PR after
 *         Phase E (xrpl-token-utils) finishes.
 */

import express from "express";
import { buildSessionRouter } from "./routes/session";
import { buildAuthRouter } from "./routes/auth";

const PORT = Number(process.env.PORT ?? 4000);
const WALLET_JWT_SECRET = required("WALLET_JWT_SECRET");
const GAME_SESSION_SECRET = required("GAME_SESSION_SECRET");

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

const app = express();
app.use(express.json({ limit: "16kb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.use("/api/session", buildSessionRouter({ GAME_SESSION_SECRET }));
app.use("/api/auth", buildAuthRouter({ WALLET_JWT_SECRET }));

// TODO(auth-rollout): mount migrated /api/scores, /api/rewards, /api/scores/stream

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`@fuzzynuts/api listening on :${PORT}`);
});
