/**
 * apps/api/src/cron/weekly-discord-winners.ts
 *
 * Weekly Discord announcement — posts the Top 3 leaderboard winners
 * to #weekly-winners every Monday at 00:00 UTC.
 *
 * Schedule: `0 0 * * 1` (node-cron)
 * Env var:  DISCORD_WEEKLY_WINNERS_WEBHOOK_URL
 *
 * Queries the `arcade_scores` collection for the just-completed week,
 * aggregates total score per wallet, resolves display names from
 * `wallet_mappings`, and posts a rich Discord embed.
 *
 * Follows the same pattern as health-monitor.ts.
 */

import { MongoClient, type Db } from "mongodb";
import cron from "node-cron";

// ── Constants ──────────────────────────────────────────────────

const SCHEDULE = "0 0 * * 1"; // Monday 00:00 UTC
const SCORES_COLLECTION = "arcade_scores";
const WALLETS_COLLECTION = "wallet_mappings";
const DISCORD_EMBED_COLOR_GOLD = 0xfbbf24; // brand-gold
const MEDAL_EMOJIS = ["🥇", "🥈", "🥉"];
const RANK_LABELS = ["1st Place", "2nd Place", "3rd Place"];

// ── ISO Week Key (matches rewards-api.js exactly) ──────────────

/**
 * Returns the ISO 8601 week key for a given date.
 * e.g. "2026-W23"
 */
function getWeekKeyForDate(date: Date): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/**
 * Returns the ISO week key for the week that just ended.
 * Called at Monday 00:00 UTC → the "previous" week is the one
 * that ended at Sunday 23:59:59 UTC (i.e. 1 second ago).
 */
function getPreviousWeekKey(): string {
  const now = new Date();
  // Go back 1 day to land in the previous week
  const yesterday = new Date(now.getTime() - 86_400_000);
  return getWeekKeyForDate(yesterday);
}

// ── MongoDB ────────────────────────────────────────────────────

let _db: Db | null = null;
let _client: MongoClient | null = null;

async function getDb(uri: string): Promise<Db> {
  if (!_db) {
    _client = new MongoClient(uri, {
      connectTimeoutMS: 10_000,
      serverSelectionTimeoutMS: 10_000,
    });
    await _client.connect();
    _db = _client.db();
  }
  return _db;
}

// ── Data Fetching ──────────────────────────────────────────────

interface WinnerEntry {
  wallet: string;
  displayName: string;
  totalScore: number;
  rank: number;
}

/**
 * Query arcade_scores for the given week, aggregate total score
 * per wallet, and return the Top 3 with resolved display names.
 */
async function getWeeklyWinners(weekKey: string): Promise<WinnerEntry[]> {
  const db = await getDb(process.env.MONGODB_URI!);

  // Fetch all scores for the week
  const scores = await db
    .collection(SCORES_COLLECTION)
    .find({ weekKey })
    .toArray();

  if (scores.length === 0) return [];

  // Aggregate total score per wallet
  const playerMap = new Map<string, number>();
  for (const entry of scores) {
    if (!entry.wallet) continue;
    const existing = playerMap.get(entry.wallet) ?? 0;
    playerMap.set(entry.wallet, existing + (entry.score ?? 0));
  }

  // Sort descending, take top 3
  const top3 = Array.from(playerMap.entries())
    .map(([wallet, total]) => ({ wallet, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  // Resolve display names from wallet_mappings
  const wallets = top3.map((w) => w.wallet);
  const mappings = await db
    .collection(WALLETS_COLLECTION)
    .find({ wallet: { $in: wallets } })
    .toArray();

  const nameMap = new Map<string, string>();
  for (const m of mappings) {
    if (m.wallet && m.displayName) {
      nameMap.set(m.wallet, m.displayName);
    }
  }

  return top3.map((entry, i) => ({
    wallet: entry.wallet,
    displayName:
      nameMap.get(entry.wallet) ??
      `${entry.wallet.slice(0, 6)}…${entry.wallet.slice(-4)}`,
    totalScore: entry.total,
    rank: i + 1,
  }));
}

// ── Discord Webhook ────────────────────────────────────────────

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

/**
 * Post a rich embed to the #weekly-winners Discord channel.
 */
async function postToDiscord(
  webhookUrl: string,
  weekKey: string,
  winners: WinnerEntry[],
): Promise<void> {
  const fields: DiscordEmbedField[] = winners.map((w) => ({
    name: `${MEDAL_EMOJIS[w.rank - 1]} ${RANK_LABELS[w.rank - 1]}`,
    value: `**${w.displayName}**\nScore: ${w.totalScore.toLocaleString()}`,
    inline: true,
  }));

  // Add a footer field with the week
  fields.push({
    name: "\u200b", // zero-width space
    value: `📊 Week \`${weekKey}\` · Resets every Monday 00:00 UTC`,
    inline: false,
  });

  const payload = {
    username: "FuzzyNuts Tournaments",
    avatar_url:
      "https://www.fuzzynuts.xyz/images/branding/logo-nav.webp",
    embeds: [
      {
        title: "🏆 WEEKLY CHAMPIONS 🏆",
        description:
          "The leaderboard has reset! Here are this week's top players:",
        color: DISCORD_EMBED_COLOR_GOLD,
        fields,
        thumbnail: {
          url: "https://www.fuzzynuts.xyz/images/branding/logo-nav.webp",
        },
        footer: {
          text: "Play free at fuzzynuts.xyz · No wallet required",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)");
    throw new Error(
      `Discord webhook failed: HTTP ${res.status} — ${body}`,
    );
  }
}

/**
 * Post a "no winners" message when the week had zero scores.
 */
async function postNoWinners(
  webhookUrl: string,
  weekKey: string,
): Promise<void> {
  const payload = {
    username: "FuzzyNuts Tournaments",
    avatar_url:
      "https://www.fuzzynuts.xyz/images/branding/logo-nav.webp",
    embeds: [
      {
        title: "🏆 WEEKLY CHAMPIONS 🏆",
        description:
          "No scores were recorded this week. Be the first to play and claim the top spot!",
        color: DISCORD_EMBED_COLOR_GOLD,
        fields: [
          {
            name: "\u200b",
            value: `📊 Week \`${weekKey}\` · Resets every Monday 00:00 UTC`,
            inline: false,
          },
        ],
        footer: {
          text: "Play free at fuzzynuts.xyz · No wallet required",
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ── Main Cron Handler ──────────────────────────────────────────

async function handleWeeklyReset(webhookUrl: string): Promise<void> {
  const weekKey = getPreviousWeekKey();
  console.log(
    `[weekly-discord] Processing week ${weekKey} at ${new Date().toISOString()}`,
  );

  try {
    const winners = await getWeeklyWinners(weekKey);

    if (winners.length === 0) {
      console.log("[weekly-discord] No scores this week — posting empty notice");
      await postNoWinners(webhookUrl, weekKey);
      return;
    }

    await postToDiscord(webhookUrl, weekKey, winners);
    console.log(
      `[weekly-discord] ✅ Posted winners for ${weekKey}: ${winners.map((w) => `${w.displayName} (${w.totalScore})`).join(", ")}`,
    );
  } catch (err) {
    console.error("[weekly-discord] ❌ Failed:", err);
    // Don't throw — cron should continue next week
  }
}

// ── Export ─────────────────────────────────────────────────────

/**
 * Start the weekly Discord winners cron job.
 * Called from server.ts bootstrap.
 */
export function startWeeklyDiscordWinners(opts: {
  DISCORD_WEBHOOK_URL?: string;
}): void {
  const { DISCORD_WEBHOOK_URL } = opts;

  if (!DISCORD_WEBHOOK_URL) {
    console.warn(
      "[weekly-discord] DISCORD_WEBHOOK_URL not set — cron job disabled",
    );
    return;
  }

  console.log(
    "[weekly-discord] Starting cron job (Monday 00:00 UTC)",
  );

  cron.schedule(SCHEDULE, async () => {
    try {
      await handleWeeklyReset(DISCORD_WEBHOOK_URL);
    } catch (err) {
      console.error("[weekly-discord] Cron tick failed:", err);
    }
  });
}

/**
 * Manual trigger for testing.
 * Can be called via: `tsx -e "import('./src/cron/weekly-discord-winners').then(m => m.triggerManual())"`
 */
export async function triggerManual(): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("Set DISCORD_WEBHOOK_URL env var first");
    process.exit(1);
  }
  await handleWeeklyReset(webhookUrl);
}

// ── Graceful shutdown ──────────────────────────────────────────

process.on("SIGTERM", async () => {
  if (_client) {
    await _client.close();
    console.log("[weekly-discord] MongoDB connection closed");
  }
});
