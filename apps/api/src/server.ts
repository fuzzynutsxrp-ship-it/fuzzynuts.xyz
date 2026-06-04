/**
 * apps/api server bootstrap.
 *
 * STATUS: scaffold — wires the new session + auth routers but DOES NOT
 *         yet replace the live rewards / scores handlers in the deployed
 *         Railway code. That swap happens in the auth-rollout PR after
 *         Phase E (xrpl-token-utils) finishes.
 */

import { createServer } from "node:http";
import express from "express";
import cors from "cors";

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
const VPS_ACCOUNT_URL = optionalEnv("VPS_ACCOUNT_URL");
const VPS_ACCOUNT_SECRET = optionalEnv("VPS_ACCOUNT_SECRET");
const OPENAI_API_KEY = optionalEnv("OPENAI_API_KEY");
const ADMIN_WALLET_ADDRESS = optionalEnv("ADMIN_WALLET_ADDRESS");

const app = express();

// ── CORS — allow the frontend origin to call this API ──────────
const ALLOWED_ORIGINS = [
  "https://fuzzynuts.xyz",
  "https://www.fuzzynuts.xyz",
  "https://game.fuzzynuts.xyz",
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
    OPENAI_API_KEY: !!OPENAI_API_KEY,
    ADMIN_WALLET_ADDRESS: !!ADMIN_WALLET_ADDRESS,
  };
  res.json({ ok: true, rsc: true, version: "2.1", env: envStatus });
});

// ── Bootstrap routers — wrap each import in try/catch so a broken
//    dependency (e.g. xrpl native addon) doesn't kill the process.

async function bootstrap() {
  // Shared challenge store
  const challengeStore = new Map<
    string,
    { address: string; challenge: string; exp: number }
  >();

  // Session router (no xrpl dependency)
  try {
    const { buildSessionRouter } = await import("./routes/session");
    app.use("/api/session", buildSessionRouter({ GAME_SESSION_SECRET }));
  } catch (e) {
    console.error("[api] Failed to load session router:", e);
    app.use("/api/session", (_req, res) => {
      res.status(503).json({ error: "E_SERVICE_UNAVAILABLE" });
    });
  }

  // Auth router (depends on xrpl-token-utils)
  try {
    const { buildAuthRouter } = await import("./routes/auth");
    app.use(
      "/api/auth",
      buildAuthRouter({ WALLET_JWT_SECRET, challengeStore }),
    );
  } catch (e) {
    console.error("[api] Failed to load auth router:", e);
    app.use("/api/auth", (_req, res) => {
      res.status(503).json({ error: "E_SERVICE_UNAVAILABLE" });
    });
  }

  // Game session router (depends on xrpl-token-utils)
  try {
    const { buildGameSessionRouter } = await import("./routes/game-session");
    app.use(
      "/api/auth",
      buildGameSessionRouter({
        GAME_SESSION_SECRET,
        OPENRSC_GAME_ENDPOINT: process.env.OPENRSC_GAME_ENDPOINT,
        GAME_SERVER_READY: process.env.GAME_SERVER_READY,
        challengeStore,
      }),
    );
  } catch (e) {
    console.error("[api] Failed to load game-session router:", e);
  }

  // RSC wallet-to-username mapping
  // Auth handled inside rsc.ts (accepts JWT cookie OR address param)
  if (MONGODB_URI && RSC_PASSWORD_SECRET) {
    try {
      const { buildRscRouter } = await import("./routes/rsc");
      app.use("/api/rsc", buildRscRouter({
        MONGODB_URI,
        RSC_PASSWORD_SECRET,
        WALLET_JWT_SECRET,
        VPS_ACCOUNT_URL,
        VPS_ACCOUNT_SECRET,
      }));
    } catch (e) {
      console.error("[api] Failed to load RSC router:", e);
      app.use("/api/rsc", (_req, res) => {
        res.status(503).json({ error: "E_SERVICE_UNAVAILABLE" });
      });
    }
  } else {
    app.use("/api/rsc", (_req, res) => {
      res.status(503).json({ error: "E_SERVICE_UNAVAILABLE", detail: "RSC feature not configured" });
    });
  }

  // Community Chat (Socket.io + history endpoint)
  if (MONGODB_URI && WALLET_JWT_SECRET) {
    try {
      const { initChat, buildChatHistoryRouter } = await import("./routes/chat");
      app.use("/api/chat", buildChatHistoryRouter(MONGODB_URI));

      const httpServer = createServer(app);
      initChat(httpServer, {
        MONGODB_URI,
        WALLET_JWT_SECRET,
        ALLOWED_ORIGINS,
        walletMappingsCollection: "wallet_mappings",
        OPENAI_API_KEY: OPENAI_API_KEY || undefined,
        ADMIN_WALLET_ADDRESS: ADMIN_WALLET_ADDRESS || undefined,
      });

      // Admin chat routes (protected by JWT + admin wallet check)
      if (ADMIN_WALLET_ADDRESS) {
        try {
          const { buildAdminChatRouter } = await import("./routes/chat");
          app.use("/api/chat/admin", buildAdminChatRouter(
            MONGODB_URI,
            WALLET_JWT_SECRET,
            ADMIN_WALLET_ADDRESS,
          ));
        } catch (e) {
          console.error("[api] Failed to load admin chat router:", e);
        }
      }

      httpServer.listen(PORT, () => {
        console.log(`@fuzzynuts/api listening on :${PORT} (with chat)`);
      });
      return; // skip the fallback listen below
    } catch (e) {
      console.error("[api] Failed to load chat module:", e);
      // Fall through to standard listen (chat disabled, rest still works)
    }
  }

  // TODO(auth-rollout): mount migrated /api/scores, /api/rewards, /api/scores/stream

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`@fuzzynuts/api listening on :${PORT}`);
  });
}

bootstrap().catch((e) => {
  console.error("[api] Fatal bootstrap error:", e);
  process.exit(1);
});
