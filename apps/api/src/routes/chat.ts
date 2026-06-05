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

// ── Trust Score — Link Policy ─────────────────────────────────
const LINK_REMOVAL_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Matches http(s) URLs and bare domains like example.com/path */
const URL_PATTERN =
  /https?:\/\/[^\s]+|(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi;

/** Strip all URLs from a message, replacing with "[link removed]" */
function stripLinks(content: string): string {
  return content.replace(URL_PATTERN, "[link removed — account too new]");
}

/** Check if account is older than 24 hours based on wallet_mappings.createdAt */
async function getAccountAge(
  uri: string,
  collectionName: string,
  walletAddress: string,
): Promise<number> {
  try {
    const db = await getDb(uri);
    const mappings = db.collection<{ createdAt?: Date }>(collectionName);
    const mapping = await mappings.findOne(
      { walletAddress },
      { projection: { createdAt: 1 } },
    );
    if (!mapping?.createdAt) return Infinity; // no creation date = treat as old/trusted
    return Date.now() - new Date(mapping.createdAt).getTime();
  } catch {
    return Infinity; // on error, treat as trusted (fail open)
  }
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

// ── Tier 2 — OpenAI Moderation API ─────────────────────────────
const AI_MODERATION_THRESHOLD = 0.8;
const AI_CATEGORIES = ["hate", "violence", "sexual", "self-harm", "harassment"];

async function moderateWithAI(
  content: string,
  apiKey: string,
): Promise<{ flagged: boolean; categories: string[] }> {
  try {
    console.log("[chat:ai] Checking message with OpenAI Moderation API");
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: "omni-moderation-latest", input: content }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.error("[chat:ai] OpenAI API error:", res.status, res.statusText);
      return { flagged: false, categories: [] }; // fail open
    }

    const data = (await res.json()) as {
      results?: Array<{
        flagged?: boolean;
        categories?: Record<string, boolean>;
        category_scores?: Record<string, number>;
      }>;
    };

    const result = data.results?.[0];
    if (!result) return { flagged: false, categories: [] };

    // Check which categories exceed threshold
    const flagged: string[] = [];
    for (const cat of AI_CATEGORIES) {
      const score = result.category_scores?.[cat] ?? 0;
      if (score > AI_MODERATION_THRESHOLD) {
        flagged.push(cat);
      }
    }

    const isFlagged = flagged.length > 0;
    if (isFlagged) {
      console.log(
        `[chat:ai] Flagged — categories: ${flagged.join(", ")}`,
      );
    } else {
      console.log("[chat:ai] Passed — no categories flagged");
    }

    return { flagged: isFlagged, categories: flagged };
  } catch (err) {
    console.error("[chat:ai] Moderation API call failed:", err);
    return { flagged: false, categories: [] }; // fail open
  }
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
  // Reports collection — TTL index for auto-expiry
  await db.collection("chat_reports").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
  );
  // Mutes collection — TTL index for auto-expiry
  await db.collection("chat_mutes").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
  );
  await db.collection("chat_mutes").createIndex(
    { walletAddress: 1 },
    { unique: true },
  );
  // Bans collection — TTL index for auto-expiry (permanent bans have far future date)
  await db.collection("chat_bans").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
  );
  await db.collection("chat_bans").createIndex(
    { walletAddress: 1 },
    { unique: true },
  );
  // Private messages — TTL index (90 days) + compound index for history queries
  await db.collection("private_messages").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
  );
  await db.collection("private_messages").createIndex(
    { fromWallet: 1, toWallet: 1, createdAt: -1 },
  );
  await db.collection("private_messages").createIndex(
    { toWallet: 1, read: 1, createdAt: -1 },
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
    OPENAI_API_KEY?: string;
    ADMIN_WALLET_ADDRESS?: string;
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

  // Track last message per wallet (for /report context)
  const lastMessages = new Map<string, { username: string; content: string; at: Date }>();

  // Track socket IDs per wallet (for DM delivery to multi-tab users)
  const walletSockets = new Map<string, Set<string>>();

  /** Handle /report command — store report, notify reporter */
  async function handleReport(
    reporterWallet: string,
    reporterUsername: string,
    targetUsername: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const db = await getDb(opts.MONGODB_URI);
      const reports = db.collection("chat_reports");

      // Find the target's last message for context
      let lastMsg = "";
      for (const [, msg] of lastMessages) {
        if (msg.username.toLowerCase() === targetUsername.toLowerCase()) {
          lastMsg = msg.content;
          break;
        }
      }

      if (!lastMsg) {
        return { ok: false, error: `No recent messages from "${targetUsername}" found` };
      }

      // Prevent self-reporting
      if (reporterUsername.toLowerCase() === targetUsername.toLowerCase()) {
        return { ok: false, error: "You cannot report yourself" };
      }

      const now = new Date();
      await reports.insertOne({
        reportedUsername: targetUsername,
        reportedBy: reporterWallet,
        reporterUsername,
        lastMessage: lastMsg,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      });

      console.log(`[chat:report] ${reporterUsername} reported ${targetUsername}`);
      return { ok: true };
    } catch (err) {
      console.error("[chat:report] Error:", err);
      return { ok: false, error: "Failed to submit report" };
    }
  }

  /** Check if a wallet address is currently muted */
  async function isMuted(walletAddress: string): Promise<boolean> {
    try {
      const db = await getDb(opts.MONGODB_URI);
      const mutes = db.collection("chat_mutes");
      const mute = await mutes.findOne({ walletAddress });
      return !!mute;
    } catch {
      return false; // fail open
    }
  }

  /** Check if a wallet address is banned from chat */
  async function isBanned(walletAddress: string): Promise<boolean> {
    try {
      const db = await getDb(opts.MONGODB_URI);
      const bans = db.collection("chat_bans");
      const ban = await bans.findOne({ walletAddress });
      return !!ban;
    } catch {
      return false; // fail open
    }
  }

  /** Check if a wallet is the admin */
  function isAdmin(walletAddress: string): boolean {
    return !!opts.ADMIN_WALLET_ADDRESS && walletAddress === opts.ADMIN_WALLET_ADDRESS;
  }

  /** Look up wallet address by username from wallet_mappings */
  async function findWalletByUsername(targetUsername: string): Promise<string | null> {
    try {
      const db = await getDb(opts.MONGODB_URI);
      const mappings = db.collection(opts.walletMappingsCollection);
      const mapping = await mappings.findOne<{ walletAddress: string }>(
        { username: targetUsername },
        { projection: { walletAddress: 1 } },
      );
      return mapping?.walletAddress ?? null;
    } catch {
      return null;
    }
  }

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

    // Track socket ID for this wallet (multi-tab support)
    if (!walletSockets.has(wallet)) {
      walletSockets.set(wallet, new Set());
    }
    walletSockets.get(wallet)!.add(socket.id);

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

        // ── /report command — intercept before any other processing ──
        if (content.toLowerCase().startsWith("/report ")) {
          const targetUsername = content.slice(8).trim();
          if (!targetUsername) {
            socket.emit("message:error", {
              error: "Usage: /report username",
            });
            return;
          }
          const result = await handleReport(wallet, username, targetUsername);
          if (result.ok) {
            socket.emit("message:report-ack", {
              id: `report-${Date.now()}`,
              username: "System",
              content: `Report filed against "${targetUsername}". Our moderators will review it.`,
              createdAt: new Date().toISOString(),
            });
          } else {
            socket.emit("message:error", { error: result.error || "Report failed" });
          }
          return; // Don't broadcast /report as a chat message
        }

        // ── Admin commands — /mute, /ban, /unmute, /unban, /clear ──
        if (content.startsWith('/') && isAdmin(wallet)) {
          const parts = content.trim().split(/\s+/);
          const cmd = parts[0].toLowerCase();
          const targetName = parts[1] || '';
          const param = parts[2] || '';

          if (cmd === '/mute' && targetName) {
            const targetWallet = await findWalletByUsername(targetName);
            if (!targetWallet) {
              socket.emit('message:error', { error: `User "${targetName}" not found` });
              return;
            }
            const minutes = parseInt(param, 10) || 60;
            const db = await getDb(opts.MONGODB_URI);
            const now = new Date();
            await db.collection('chat_mutes').updateOne(
              { walletAddress: targetWallet },
              { $set: { walletAddress: targetWallet, username: targetName, mutedBy: username, createdAt: now, expiresAt: new Date(now.getTime() + minutes * 60 * 1000) } },
              { upsert: true },
            );
            io.emit('message:new', {
              id: `sys-${Date.now()}`, username: 'System',
              content: `${targetName} has been muted for ${minutes} minutes by ${username}`,
              createdAt: now.toISOString(), isSystem: true,
            });
            console.log(`[chat:admin] ${username} muted ${targetName} for ${minutes}m`);
            return;
          }

          if (cmd === '/unmute' && targetName) {
            const targetWallet = await findWalletByUsername(targetName);
            if (!targetWallet) {
              socket.emit('message:error', { error: `User "${targetName}" not found` });
              return;
            }
            const db = await getDb(opts.MONGODB_URI);
            await db.collection('chat_mutes').deleteOne({ walletAddress: targetWallet });
            io.emit('message:new', {
              id: `sys-${Date.now()}`, username: 'System',
              content: `${targetName} has been unmuted by ${username}`,
              createdAt: new Date().toISOString(), isSystem: true,
            });
            console.log(`[chat:admin] ${username} unmuted ${targetName}`);
            return;
          }

          if (cmd === '/ban' && targetName) {
            const targetWallet = await findWalletByUsername(targetName);
            if (!targetWallet) {
              socket.emit('message:error', { error: `User "${targetName}" not found` });
              return;
            }
            const db = await getDb(opts.MONGODB_URI);
            const now = new Date();
            // Ban for 10 years (effectively permanent)
            await db.collection('chat_bans').updateOne(
              { walletAddress: targetWallet },
              { $set: { walletAddress: targetWallet, username: targetName, bannedBy: username, createdAt: now, expiresAt: new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000) } },
              { upsert: true },
            );
            io.emit('message:new', {
              id: `sys-${Date.now()}`, username: 'System',
              content: `${targetName} has been banned from chat by ${username}`,
              createdAt: now.toISOString(), isSystem: true,
            });
            console.log(`[chat:admin] ${username} banned ${targetName}`);
            return;
          }

          if (cmd === '/unban' && targetName) {
            const targetWallet = await findWalletByUsername(targetName);
            if (!targetWallet) {
              socket.emit('message:error', { error: `User "${targetName}" not found` });
              return;
            }
            const db = await getDb(opts.MONGODB_URI);
            await db.collection('chat_bans').deleteOne({ walletAddress: targetWallet });
            io.emit('message:new', {
              id: `sys-${Date.now()}`, username: 'System',
              content: `${targetName} has been unbanned by ${username}`,
              createdAt: new Date().toISOString(), isSystem: true,
            });
            console.log(`[chat:admin] ${username} unbanned ${targetName}`);
            return;
          }

          if (cmd === '/clear') {
            const db = await getDb(opts.MONGODB_URI);
            await db.collection('chat_messages').deleteMany({});
            io.emit('chat:clear', { clearedBy: username, at: new Date().toISOString() });
            console.log(`[chat:admin] ${username} cleared all messages`);
            return;
          }

          // Unknown admin command
          socket.emit('message:error', { error: 'Unknown command. Use /mute, /unmute, /ban, /unban, /clear' });
          return;
        }

        // Ban check — banned users cannot send messages
        if (await isBanned(wallet)) {
          socket.emit('message:error', { error: 'You are banned from chat' });
          return;
        }

        // Mute check — shadow muted users' messages
        if (await isMuted(wallet)) {
          socket.emit("message:muted", {
            id: `muted-${Date.now()}`,
            username,
            content: finalContent,
            createdAt: new Date().toISOString(),
            muted: true,
          });
          console.log(`[chat] Muted user ${username} attempted to send message`);
          return;
        }

        // Rate limit check
        if (!checkRateLimit(wallet)) {
          socket.emit("message:error", {
            error: "Slow down — max 5 messages per 10 seconds",
          });
          return;
        }

        // Trust score — strip links for new accounts (< 24 hours)
        let finalContent = content;
        let linksStripped = false;
        const hasLinks = URL_PATTERN.test(content);
        URL_PATTERN.lastIndex = 0; // reset regex state after .test()
        if (hasLinks) {
          const accountAge = await getAccountAge(
            opts.MONGODB_URI,
            opts.walletMappingsCollection,
            wallet,
          );
          if (accountAge < LINK_REMOVAL_AGE_MS) {
            finalContent = stripLinks(content);
            linksStripped = true;
            socket.emit("message:link-stripped", {
              id: `stripped-${Date.now()}`,
              username,
              content: finalContent,
              originalContent: content,
              createdAt: new Date().toISOString(),
              linkStripped: true,
            });
            console.log(
              `[chat] Stripped links from ${username} (account age: ${Math.round(accountAge / 60_000)}min)`,
            );
          }
        }

        // Moderate content (Tier 1 — regex)
        const modResult = moderate(finalContent);
        if (!modResult.clean) {
          // Shadow mode: show message to sender only, hide from everyone else
          socket.emit("message:shadowed", {
            id: `shadow-${Date.now()}`,
            username,
            content: finalContent,
            createdAt: new Date().toISOString(),
            shadowed: true,
          });
          console.log(
            `[chat] Shadow-blocked ${username}: ${modResult.reason}`,
          );
          return;
        }

        // Tier 2 — OpenAI Moderation API (only if API key is set)
        if (opts.OPENAI_API_KEY) {
          const aiResult = await moderateWithAI(finalContent, opts.OPENAI_API_KEY);
          if (aiResult.flagged) {
            socket.emit("message:shadowed", {
              id: `ai-${Date.now()}`,
              username,
              content: finalContent,
              createdAt: new Date().toISOString(),
              shadowed: true,
              aiFlagged: true,
              aiCategories: aiResult.categories,
            });
            console.log(
              `[chat] AI-flagged ${username}: ${aiResult.categories.join(", ")}`,
            );
            return;
          }
        }

        // Save to MongoDB
        const col = await getChatCollection(opts.MONGODB_URI);
        const now = new Date();
        const doc: ChatMessage = {
          walletAddress: wallet,
          username,
          content: finalContent,
          createdAt: now,
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
        };
        const result = await col.insertOne(doc);

        // Broadcast to all clients (including sender)
        const outgoing = {
          id: result.insertedId.toString(),
          username,
          walletAddress: wallet,
          content: finalContent,
          createdAt: now.toISOString(),
          ...(linksStripped && { linkStripped: true }),
        };
        io.emit("message:new", outgoing);

        // Track last message for /report context
        lastMessages.set(wallet, { username, content: finalContent, at: now });
      } catch (err) {
        console.error("[chat] Message error:", err);
        socket.emit("message:error", { error: "Failed to send message" });
      }
    });

    // ── DM: Send private message ──────────────────────────────
    socket.on("dm:send", async (data: { toWallet?: unknown; content?: unknown }) => {
      try {
        if (
          !data ||
          typeof data.toWallet !== "string" ||
          typeof data.content !== "string" ||
          data.content.trim().length === 0
        ) {
          return;
        }

        const toWallet = data.toWallet.trim();
        const content = data.content.trim();

        // Can't DM yourself
        if (toWallet === wallet) {
          socket.emit("dm:error", { error: "You cannot message yourself" });
          return;
        }

        // Validate length
        if (content.length > 500) {
          socket.emit("dm:error", { error: "Message too long (max 500 chars)" });
          return;
        }

        // Rate limit (reuse existing limiter)
        if (!checkRateLimit(wallet)) {
          socket.emit("dm:error", { error: "Slow down — max 5 messages per 10 seconds" });
          return;
        }

        // Look up recipient username from wallet_mappings
        const db = await getDb(opts.MONGODB_URI);
        const mappings = db.collection(opts.walletMappingsCollection);
        const recipient = await mappings.findOne<{ username: string }>(
          { walletAddress: toWallet },
          { projection: { username: 1 } },
        );
        if (!recipient) {
          socket.emit("dm:error", { error: "User not found" });
          return;
        }

        // Moderate DM content (Tier 1 + Tier 2)
        const modResult = moderate(content);
        if (!modResult.clean) {
          socket.emit("dm:blocked", {
            id: `dm-blocked-${Date.now()}`,
            toWallet,
            toUsername: recipient.username,
            content,
            createdAt: new Date().toISOString(),
            reason: modResult.reason,
          });
          console.log(`[chat:dm] Blocked DM from ${username} to ${recipient.username}: ${modResult.reason}`);
          return;
        }

        if (opts.OPENAI_API_KEY) {
          const aiResult = await moderateWithAI(content, opts.OPENAI_API_KEY);
          if (aiResult.flagged) {
            socket.emit("dm:blocked", {
              id: `dm-ai-${Date.now()}`,
              toWallet,
              toUsername: recipient.username,
              content,
              createdAt: new Date().toISOString(),
              reason: `AI flagged: ${aiResult.categories.join(", ")}`,
            });
            console.log(`[chat:dm] AI-blocked DM from ${username} to ${recipient.username}`);
            return;
          }
        }

        // Save to MongoDB
        const now = new Date();
        const dmCol = db.collection("private_messages");
        const result = await dmCol.insertOne({
          fromWallet: wallet,
          fromUsername: username,
          toWallet,
          toUsername: recipient.username,
          content,
          read: false,
          createdAt: now,
          expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 days
        });

        const outgoing = {
          id: result.insertedId.toString(),
          fromWallet: wallet,
          fromUsername: username,
          toWallet,
          toUsername: recipient.username,
          content,
          createdAt: now.toISOString(),
        };

        // Send to recipient (all their open sockets)
        const recipientSockets = walletSockets.get(toWallet);
        if (recipientSockets) {
          for (const sid of recipientSockets) {
            io.to(sid).emit("dm:receive", outgoing);
          }
        }

        // Confirm to sender
        socket.emit("dm:sent", outgoing);
        console.log(`[chat:dm] ${username} → ${recipient.username}: ${content.slice(0, 50)}`);
      } catch (err) {
        console.error("[chat:dm] Error:", err);
        socket.emit("dm:error", { error: "Failed to send message" });
      }
    });

    // ── DM: Mark conversation as read ─────────────────────────
    socket.on("dm:read", async (data: { fromWallet?: unknown }) => {
      try {
        if (typeof data?.fromWallet !== "string") return;
        const db = await getDb(opts.MONGODB_URI);
        await db.collection("private_messages").updateMany(
          { fromWallet: data.fromWallet, toWallet: wallet, read: false },
          { $set: { read: true } },
        );
      } catch (err) {
        console.error("[chat:dm:read] Error:", err);
      }
    });

    // ── DM: Get unread count ──────────────────────────────────
    socket.on("dm:unread", async () => {
      try {
        const db = await getDb(opts.MONGODB_URI);
        const count = await db.collection("private_messages").countDocuments({
          toWallet: wallet,
          read: false,
        });
        socket.emit("dm:unread-count", { count });
      } catch (err) {
        console.error("[chat:dm:unread] Error:", err);
      }
    });

    // ── Disconnect ──────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`[chat] ${username} disconnected`);
      onlineUsers.delete(socket.id);

      // Clean up walletSockets
      const sockets = walletSockets.get(wallet);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) walletSockets.delete(wallet);
      }

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
        .find({}, { projection: { expiresAt: 0 } })
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

  // GET /dms/history?wallet1=...&wallet2=... — last 50 DMs between two users
  router.get("/dms/history", async (req, res) => {
    try {
      const { wallet1, wallet2 } = req.query;
      if (typeof wallet1 !== "string" || typeof wallet2 !== "string") {
        return res.status(400).json({ error: "wallet1 and wallet2 required" });
      }

      const db = await getDb(MONGODB_URI);
      const dmCol = db.collection("private_messages");
      const messages = await dmCol
        .find(
          {
            $or: [
              { fromWallet: wallet1, toWallet: wallet2 },
              { fromWallet: wallet2, toWallet: wallet1 },
            ],
          },
          { projection: { expiresAt: 0, read: 0 } },
        )
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

      res.json({ messages: messages.reverse() });
    } catch (err) {
      console.error("[chat] DM history error:", err);
      res.status(500).json({ error: "Failed to load DM history" });
    }
  });

  return router;
}

// ── Express router: Admin endpoints ─────────────────────────────
export function buildAdminChatRouter(
  MONGODB_URI: string,
  WALLET_JWT_SECRET: string,
  ADMIN_WALLET_ADDRESS: string,
): Router {
  const router = Router();
  const COOKIE_NAME = "fuzzy_wallet_session";

  /** Middleware: verify admin wallet from JWT cookie */
  async function requireAdmin(
    req: import("express").Request,
    res: import("express").Response,
    next: import("express").NextFunction,
  ) {
    try {
      const cookieHeader = req.headers.cookie;
      if (!cookieHeader) return res.status(401).json({ error: "No session" });

      const match = cookieHeader.match(
        new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`),
      );
      if (!match) return res.status(401).json({ error: "No session" });

      const { jwtVerify } = await import("jose");
      const { payload } = await jwtVerify(
        match[1],
        new TextEncoder().encode(WALLET_JWT_SECRET),
        { issuer: "fuzzynuts.xyz" },
      );

      const address = typeof payload.address === "string" ? payload.address : "";
      if (address !== ADMIN_WALLET_ADDRESS) {
        return res.status(403).json({ error: "Forbidden — admin only" });
      }

      next();
    } catch {
      return res.status(401).json({ error: "Invalid session" });
    }
  }

  // GET /admin/reports — last 50 reports
  router.get("/reports", requireAdmin, async (_req, res) => {
    try {
      const db = await getDb(MONGODB_URI);
      const reports = await db
        .collection("chat_reports")
        .find({}, { projection: { expiresAt: 0 } })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
      res.json({ reports });
    } catch (err) {
      console.error("[chat:admin] Reports error:", err);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // GET /admin/mutes — currently muted users
  router.get("/mutes", requireAdmin, async (_req, res) => {
    try {
      const db = await getDb(MONGODB_URI);
      const mutes = await db
        .collection("chat_mutes")
        .find({}, { projection: { expiresAt: 0 } })
        .sort({ createdAt: -1 })
        .toArray();
      res.json({ mutes });
    } catch (err) {
      console.error("[chat:admin] Mutes error:", err);
      res.status(500).json({ error: "Failed to fetch mutes" });
    }
  });

  // POST /admin/mute — mute a user
  router.post("/mute", requireAdmin, async (req, res) => {
    try {
      const { walletAddress, username, durationHours } = req.body;
      if (!walletAddress || typeof walletAddress !== "string") {
        return res.status(400).json({ error: "walletAddress required" });
      }

      const hours = typeof durationHours === "number" && durationHours > 0 ? durationHours : 24;
      const db = await getDb(MONGODB_URI);
      const mutes = db.collection("chat_mutes");
      const now = new Date();

      await mutes.updateOne(
        { walletAddress },
        {
          $set: {
            walletAddress,
            username: username || "unknown",
            mutedBy: "admin",
            createdAt: now,
            expiresAt: new Date(now.getTime() + hours * 60 * 60 * 1000),
          },
        },
        { upsert: true },
      );

      console.log(`[chat:admin] Muted ${walletAddress} for ${hours}h`);
      res.json({ ok: true, walletAddress, durationHours: hours });
    } catch (err) {
      console.error("[chat:admin] Mute error:", err);
      res.status(500).json({ error: "Failed to mute user" });
    }
  });

  // POST /admin/unmute — unmute a user
  router.post("/unmute", requireAdmin, async (req, res) => {
    try {
      const { walletAddress } = req.body;
      if (!walletAddress || typeof walletAddress !== "string") {
        return res.status(400).json({ error: "walletAddress required" });
      }

      const db = await getDb(MONGODB_URI);
      const result = await db.collection("chat_mutes").deleteOne({ walletAddress });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "User not muted" });
      }

      console.log(`[chat:admin] Unmuted ${walletAddress}`);
      res.json({ ok: true, walletAddress });
    } catch (err) {
      console.error("[chat:admin] Unmute error:", err);
      res.status(500).json({ error: "Failed to unmute user" });
    }
  });

  return router;
}
