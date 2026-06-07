/**
 * User model — hybrid Web2 + Web3 authentication.
 *
 * Supports three auth providers:
 *   - 'google'   — standard Web2 sign-in (email + Google profile)
 *   - 'xrpl'     — crypto-native wallet connect (existing flow)
 *   - 'both'     — user linked both Google + XRPL wallet
 *
 * Uses raw MongoDB driver (not Mongoose) to match existing API patterns.
 */

import { type Db, type Collection, type IndexDescription } from "mongodb";

// ── Types ──────────────────────────────────────────────────────

export type AuthProvider = "google" | "xrpl" | "both";

export interface UserDocument {
  _id?: string;

  // Auth
  provider: AuthProvider;
  email?: string;           // Web2 — unique, sparse
  googleId?: string;        // Web2 — Google sub
  walletAddress?: string;   // Web3 — XRPL address (r...)
  name?: string;            // Display name (Google profile or custom)
  image?: string;           // Avatar URL (Google profile picture)

  // Referral
  referralCode?: string;    // unique per user
  referredBy?: string;      // referralCode of the referrer

  // Game data
  rscUsername?: string;     // Open-RSC username mapping
  nutBalance?: number;      // $NUT balance (cached)

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

// ── Collection helpers ─────────────────────────────────────────

const COLLECTION = "users";

export function getUsers(db: Db): Collection<UserDocument> {
  return db.collection<UserDocument>(COLLECTION);
}

/**
 * Ensure indexes exist. Call once on startup or via migration.
 * Idempotent — MongoDB skips existing indexes.
 */
export async function ensureUserIndexes(db: Db): Promise<void> {
  const col = getUsers(db);
  const indexes: IndexDescription[] = [
    // Google users looked up by googleId
    { key: { googleId: 1 }, unique: true, sparse: true, name: "googleId_unique" },
    // Email unique + sparse (not all users have email)
    { key: { email: 1 }, unique: true, sparse: true, name: "email_unique" },
    // Wallet address lookup (existing flow)
    { key: { walletAddress: 1 }, unique: true, sparse: true, name: "walletAddress_unique" },
    // Referral code unique
    { key: { referralCode: 1 }, unique: true, sparse: true, name: "referralCode_unique" },
    // RSC username lookup
    { key: { rscUsername: 1 }, sparse: true, name: "rscUsername_sparse" },
    // Login recency
    { key: { lastLoginAt: -1 }, name: "lastLoginAt_desc" },
  ];
  await col.createIndexes(indexes);
}

// ── Upsert helpers ─────────────────────────────────────────────

/**
 * Find or create a Google user. If the email already exists with
 * provider='xrpl', upgrade to 'both' (link accounts).
 */
export async function upsertGoogleUser(
  db: Db,
  opts: { googleId: string; email: string; name?: string; image?: string },
): Promise<UserDocument> {
  const col = getUsers(db);
  const now = new Date();

  // Try to find by googleId first
  let user = await col.findOne({ googleId: opts.googleId });
  if (user) {
    await col.updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: now, updatedAt: now, name: opts.name ?? user.name, image: opts.image ?? user.image } },
    );
    return { ...user, lastLoginAt: now, updatedAt: now };
  }

  // Check if email is already linked to an XRPL wallet
  const existingEmail = await col.findOne({ email: opts.email });
  if (existingEmail && existingEmail.provider === "xrpl") {
    // Link accounts — upgrade to 'both'
    await col.updateOne(
      { _id: existingEmail._id },
      {
        $set: {
          provider: "both" as AuthProvider,
          googleId: opts.googleId,
          name: opts.name ?? existingEmail.name,
          image: opts.image ?? existingEmail.image,
          lastLoginAt: now,
          updatedAt: now,
        },
      },
    );
    return { ...existingEmail, provider: "both", googleId: opts.googleId, lastLoginAt: now, updatedAt: now };
  }

  // Create new Google user
  const newUser: UserDocument = {
    provider: "google",
    googleId: opts.googleId,
    email: opts.email,
    name: opts.name,
    image: opts.image,
    referralCode: generateReferralCode(),
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };
  const result = await col.insertOne(newUser);
  return { ...newUser, _id: result.insertedId.toString() };
}

/**
 * Find or create an XRPL wallet user (existing flow, preserved).
 */
export async function upsertWalletUser(
  db: Db,
  opts: { walletAddress: string; name?: string },
): Promise<UserDocument> {
  const col = getUsers(db);
  const now = new Date();

  let user = await col.findOne({ walletAddress: opts.walletAddress });
  if (user) {
    await col.updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: now, updatedAt: now } },
    );
    return { ...user, lastLoginAt: now, updatedAt: now };
  }

  // Check if wallet email was previously linked via Google
  // (No email on wallet-only users, so no conflict possible)

  const newUser: UserDocument = {
    provider: "xrpl",
    walletAddress: opts.walletAddress,
    name: opts.name ?? `Player_${opts.walletAddress.slice(1, 7)}`,
    referralCode: generateReferralCode(),
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };
  const result = await col.insertOne(newUser);
  return { ...newUser, _id: result.insertedId.toString() };
}

// ── Utilities ──────────────────────────────────────────────────

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
