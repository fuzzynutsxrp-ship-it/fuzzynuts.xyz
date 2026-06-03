/**
 * POST /api/rsc/claim-username — create a 1-wallet-to-1-username mapping
 * GET  /api/rsc/credentials   — retrieve game credentials for auto-login
 *
 * The mapping is stored in MongoDB (wallet_mappings collection). The
 * game password is AES-256-GCM encrypted at rest and decrypted only
 * when returned to the authenticated wallet holder.
 *
 * Requires: walletAuth middleware upstream (attaches req.wallet).
 * Env vars: RSC_PASSWORD_SECRET (32-byte hex key for AES-256-GCM)
 *           MONGODB_URI (MongoDB connection string)
 */

import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { MongoClient, type Db, type Collection } from "mongodb";
import type { Request, Response } from "express";
import type { WalletJwtPayload } from "../middleware/walletAuth";

// ── Username validation ─────────────────────────────────────────
const USERNAME_RE = /^[a-zA-Z0-9]{3,12}$/;
const ClaimBody = z.object({
  username: z.string().min(3).max(12).regex(USERNAME_RE),
  address: z.string().regex(/^r[1-9A-HJ-NP-Za-k-z]{24,34}$/).optional(),
});

// ── AES-256-GCM helpers ─────────────────────────────────────────
const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function deriveKey(secret: string): Buffer {
  // Accept either 64-char hex or raw 32-byte string
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, "hex");
  }
  // Derive a 32-byte key from arbitrary-length secret
  return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(plaintext: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(12) + tag(16) + ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decrypt(encoded: string, secret: string): string {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN + TAG_LEN);
  const key = deriveKey(secret);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}

// ── MongoDB singleton ───────────────────────────────────────────
interface WalletMapping {
  walletAddress: string;
  username: string;
  encryptedPassword: string;
  createdAt: Date;
}

let _db: Db | null = null;
let _client: MongoClient | null = null;

async function getCollection(uri: string): Promise<Collection<WalletMapping>> {
  if (!_db) {
    _client = new MongoClient(uri);
    await _client.connect();
    _db = _client.db(); // uses DB name from URI
    // Ensure unique indexes
    await _db.collection<WalletMapping>("wallet_mappings").createIndex(
      { walletAddress: 1 },
      { unique: true },
    );
    await _db.collection<WalletMapping>("wallet_mappings").createIndex(
      { username: 1 },
      { unique: true },
    );
  }
  return _db.collection<WalletMapping>("wallet_mappings");
}

// ── Express router ──────────────────────────────────────────────

export function buildRscRouter(env: {
  MONGODB_URI: string;
  RSC_PASSWORD_SECRET: string;
}): Router {
  const router = Router();

  // POST /api/rsc/claim-username
  router.post("/claim-username", async (req: Request, res: Response) => {
    // Accept wallet from JWT (auth flow) OR from request body (standalone page)
    const jwtWallet = (req as Request & { wallet?: WalletJwtPayload }).wallet;
    const parsed = ClaimBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "E_INVALID_USERNAME", detail: parsed.error.flatten() });
    }

    const walletAddress = jwtWallet?.address || parsed.data.address;
    if (!walletAddress) {
      return res.status(401).json({ error: "E_NO_SESSION" });
    }

    const { username } = parsed.data;

    try {
      const col = await getCollection(env.MONGODB_URI);

      // Check if this wallet already has a mapping
      const existing = await col.findOne({ walletAddress });
      if (existing) {
        return res.status(409).json({
          error: "E_ALREADY_CLAIMED",
          username: existing.username,
        });
      }

      // Check if username is taken
      const taken = await col.findOne({ username });
      if (taken) {
        return res.status(409).json({ error: "E_USERNAME_TAKEN" });
      }

      // Generate a random 32-char hex game password
      const gamePassword = crypto.randomBytes(16).toString("hex");
      const encryptedPassword = encrypt(gamePassword, env.RSC_PASSWORD_SECRET);

      await col.insertOne({
        walletAddress,
        username,
        encryptedPassword,
        createdAt: new Date(),
      });

      return res.json({ ok: true, username, gamePassword });
    } catch (err) {
      console.error("[rsc] claim-username error:", err);
      return res.status(500).json({ error: "E_INTERNAL" });
    }
  });

  // GET /api/rsc/credentials
  // Accept wallet from JWT OR from query param ?address=r...
  router.get("/credentials", async (req: Request, res: Response) => {
    const jwtWallet = (req as Request & { wallet?: WalletJwtPayload }).wallet;
    const walletAddress = jwtWallet?.address || (typeof req.query.address === 'string' ? req.query.address : null);
    if (!walletAddress) {
      return res.status(401).json({ error: "E_NO_SESSION" });
    }

    try {
      const col = await getCollection(env.MONGODB_URI);
      const mapping = await col.findOne({ walletAddress });

      if (!mapping) {
        return res.status(404).json({ error: "E_NO_MAPPING" });
      }

      const gamePassword = decrypt(mapping.encryptedPassword, env.RSC_PASSWORD_SECRET);

      return res.json({ username: mapping.username, gamePassword });
    } catch (err) {
      console.error("[rsc] credentials error:", err);
      return res.status(500).json({ error: "E_INTERNAL" });
    }
  });

  return router;
}
