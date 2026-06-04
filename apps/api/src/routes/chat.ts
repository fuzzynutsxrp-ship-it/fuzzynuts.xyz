/**
 * Community Chat — Socket.io backend
 *
 * Phase 1A: wallet-authenticated chat with Tier 1 moderation.
 * Uses the same MongoDB cluster as the RSC wallet mappings.
 *
 * Exports:
 *   initChat(server, opts)    — attach Socket.io to the HTTP server
 *   chatHistoryRouter         — Express router for GET /api/chat/history
 */

import { Server as HttpServer } from "node:http";
import { Router } from "express";
import { Server } from "socket.io";
import { MongoClient, type Db, type Collection } from "mongodb";

// ── Types ──────────────────────────────────────────────────────
interface ChatMessage {
  walletAddress: string;
  username: string;
  content: string;
  createdAt: Date;
  expiresAt: Date;
}

interface OnlineUser {
  username: string;
  walletAddress: string;
  connectedAt: number;
}

// ── Anti-Scam Regex (Tier 1 — runs on every message, <1ms) ───
const SCAM_PATTERNS: RegExp[] = [
  // Financial promises
  /(send|transfer|deposit)\s+(me\s+)?\d+\s*(xrp|btc|eth|usdt|sol)/i,
  /(double|triple|multiply)\s+(your\s+)?(xrp|btc|eth|usdt|sol|crypto|coins)/i,
  /(earn|make|get)\s+\$?\d+.*\b(daily|per day|weekly|hourly|free)\b/i,

  // Fake giveaways / airdrops
  /(free|bonus|airdrop|giveaway|reward)\s*(xrp|btc|eth|usdt|sol|token|coin|nft)/i,
  /(claim|collect|grab)\s+(your\s+)?(free|bonus|reward|airdrop)/i,

  // DM solicitation
  /(dm|pm|message)\s+(me|us)\s+(for|to get|to receive|to claim)/i,

  // Seed phrase / wallet draining
  /(seed|phrase|recovery|private|secret)\s+(key|phrase|words|code)/i,
  /(connect|link|sync)\s+(your\s+)?wallet\s+(to|here|now|for)/i,
  /(import|enter|verify)\s+(your\s+)?(seed|phrase|private|wallet)/i,

  // Impersonation
  /(i'?m|i am)\s+(a\s+)?(admin|mod|moderator|staff|dev|developer|owner|official)/i,
  /(official|legitimate|verified|sponsored)\s+(airdrop|giveaway|event|promotion)/i,

  // Recruitment to external channels
  /(join|check out|visit)\s+(my|our|the)\s+(server|group|channel|discord|telegram)/i,
];

// Phishing link patterns (suspicious TLDs + URL shorteners)
const PHISHING_PATTERNS: RegExp[] = [
  /https?:\/\/[^\s]*(?:\.xyz|\.site|\.fun|\.click|\.top|\.buzz|\.icu|\.work|\.gq|\.ml|\.cf|\.ga)\b/i,
  /https?:\/\/[^\s]*(?:bit\.ly|tinyurl|t\.co|goo\.gl|is\.gd|rb\.gy|shorturl\.at|cutt\.ly)\b/i,
];

// Domains we trust (never flag these)
const TRUSTED_DOMAINS: RegExp[] = [
  /fuzzynuts\.xyz/i,
  /fuzzynutsxyz-production\.up\.railway\.app/i,
  /game\.fuzzynuts\.xyz/i,
];

// ── Rate Limiter (per wallet address, survives reconnect) ─────
const rateLimits = new Map<string, number[]>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10_000;

function checkRateLimit(walletAddress: string): boolean {
  const now = Date.now();
  const timestamps = rateLimits.get(walletAddress) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    return false; // rate limited
  }
  recent.push(now);
  rateLimits.set(walletAddress, recent);
  return true;
}

// ── Content Moderation ─────────────────────────────────────────
function moderate(content: string): { clean: boolean; reason?: string } {
  // Check scam patterns
  for (const pattern of SCAM_PATTERNS) {
    if (pattern.test(content)) {
      return { clean: false, reason: "Possible scam content" };
    }
  }

  // Check phishing links (skip if domain is trusted)
  const urlMatch = content.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    const isTrusted = TRUSTED_DOMAINS.some((d) => d.test(urlMatch[0]));
    if (!isTrusted) {
      for (const pattern of PHISHING_PATTERNS) {
        if (pattern.test(content)) {
          return { clean: false, reason: "Suspicious link" };
        }
      }
    }
  }

  return { clean: true };
}

// ── MongoDB ────────────────────────────────────────────────────
let _db: Db | null = null;
let _client: MongoClient | null = null;

async function getDb(uri: string): Promise<Db> {
  if (!_db) {
    _client = new MongoClient(uri);
    await _client.connect();
    _db = _client.db(); // DB name from URI
  }
  return _db;
}

async function getChatCollection(
  uri: string,
): Promise<Collection<ChatMessage>> {
  const db = await getDb(uri);
  return db.collection<ChatMessage>("chat_messages");
}

/** Create indexes once at startup (idempotent, no-ops if they exist). */
async function ensureIndexes(uri: string): Promise<void> {
  const db = await getDb(uri);
  await db.collection<ChatMessage>("chat_messages").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
  );
  await db.collection<ChatMessage>("chat_messages").createIndex(
    { createdAt: -1 },
  );
}

// ── Init — attach Socket.io to the HTTP server ─────────────────
export function initChat(
  httpServer: HttpServer,
  opts: {
    MONGODB_URI: string;
    WALLET_JWT_SECRET: string;
    ALLOWED_ORIGINS: string[];
    walletMappingsCollection: string; // e.g. "wallet_mappings"
  },
) {
  const io = new Server(httpServer, {
    cors: {
      origin: opts.ALLOWED_ORIGINS,
      credentials: true,
    },
    // Keep-alive for idle connections
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  // Ensure MongoDB indexes exist (runs once, no-ops on restart)
  ensureIndexes(opts.MONGODB_URI).catch((err) => {
    console.error("[chat] Failed to create indexes:", err);
  });

  // Track online users (socketId → user info)
  const onlineUsers = new Map<string, OnlineUser>();

  // ── Auth middleware — resolve wallet → username on connect ──
  io.use(async (socket, next) => {
    try {
      const walletAddress = socket.handshake.auth.walletAddress as
        | string
        | undefined;
      if (
        !walletAddress ||
        typeof walletAddress !== "string" ||
        walletAddress.length < 25
      ) {
        return next(new Error("Wallet address required"));
      }

      // Look up RSC username from the existing wallet_mappings collection
      const db = await getDb(opts.MONGODB_URI);
      const mappings = db.collection(opts.walletMappingsCollection);
      const mapping = await mappings.findOne<{ username: string }>(
        { walletAddress },
        { projection: { username: 1 } },
      );

      if (!mapping) {
        return next(
          new Error("No RSC account found. Claim a username first."),
        );
      }

      socket.data.username = mapping.username;
      socket.data.wallet = walletAddress;
      next();
    } catch (err) {
      console.error("[chat] Auth error:", err);
      next(new Error("Authentication failed"));
    }
  });

  // ── Connection handler ──────────────────────────────────────
  io.on("connection", (socket) => {
    const username = socket.data.username as string;
    const wallet = socket.data.wallet as string;

    console.log(`[chat] ${username} connected (${wallet.slice(0, 8)}...)`);
    onlineUsers.set(socket.id, {
      username,
      walletAddress: wallet,
      connectedAt: Date.now(),
    });

    // Broadcast updated online list to everyone
    io.emit("users:online", Array.from(onlineUsers.values()));

    // ── Handle incoming messages ────────────────────────────
    socket.on("message:send", async (data: { content?: unknown }) => {
      try {
        // Validate input
        if (
          !data ||
          typeof data.content !== "string" ||
          data.content.trim().length === 0
        ) {
          return;
        }

        const content = data.content.trim();
        if (content.length > 500) {
          socket.emit("message:error", {
            error: "Message too long (max 500 chars)",
          });
          return;
        }

        // Rate limit check
        if (!checkRateLimit(wallet)) {
          socket.emit("message:error", {
            error: "Slow down — max 5 messages per 10 seconds",
          });
          return;
        }

        // Moderate content
        const modResult = moderate(content);
        if (!modResult.clean) {
          // Shadow mode: show message to sender only, hide from everyone else
          socket.emit("message:shadowed", {
            id: `shadow-${Date.now()}`,
            username,
            content,
            createdAt: new Date().toISOString(),
            shadowed: true,
          });
          console.log(
            `[chat] Shadow-blocked ${username}: ${modResult.reason}`,
          );
          return;
        }

        // Save to MongoDB
        const col = await getChatCollection(opts.MONGODB_URI);
        const now = new Date();
        const doc: ChatMessage = {
          walletAddress: wallet,
          username,
          content,
          createdAt: now,
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
        };
        const result = await col.insertOne(doc);

        // Broadcast to all clients (including sender)
        const outgoing = {
          id: result.insertedId.toString(),
          username,
          content,
          createdAt: now.toISOString(),
        };
        io.emit("message:new", outgoing);
      } catch (err) {
        console.error("[chat] Message error:", err);
        socket.emit("message:error", { error: "Failed to send message" });
      }
    });

    // ── Disconnect ──────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`[chat] ${username} disconnected`);
      onlineUsers.delete(socket.id);
      io.emit("users:online", Array.from(onlineUsers.values()));
    });
  });

  console.log("[chat] Socket.io initialized");
  return io;
}

// ── Express router: GET /api/chat/history ───────────────────────
export function buildChatHistoryRouter(MONGODB_URI: string): Router {
  const router = Router();

  router.get("/history", async (_req, res) => {
    try {
      const col = await getChatCollection(MONGODB_URI);
      const messages = await col
        .find({}, { projection: { walletAddress: 0, expiresAt: 0 } })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

      // Return oldest-first for chat display
      res.json({ messages: messages.reverse() });
    } catch (err) {
      console.error("[chat] History error:", err);
      res.status(500).json({ error: "Failed to load chat history" });
    }
  });

  return router;
}
