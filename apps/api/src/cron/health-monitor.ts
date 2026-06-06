/**
 * apps/api/src/cron/health-monitor.ts
 *
 * Self-monitoring cron job: hits /healthz every 5 minutes,
 * stores results in MongoDB, and sends Discord alerts on failure.
 */

import { MongoClient, type Db } from "mongodb";
import cron from "node-cron";

const CHECK_INTERVAL = "*/5 * * * *"; // every 5 minutes
const COLLECTION = "health_checks";
const SLOW_THRESHOLD_MS = 5000;
const DISCORD_EMBED_COLOR_RED = 0xff0000;
const DISCORD_EMBED_COLOR_GREEN = 0x00ff00;

let _db: Db | null = null;
let _client: MongoClient | null = null;

async function getDb(uri: string): Promise<Db> {
  if (!_db) {
    _client = new MongoClient(uri);
    await _client.connect();
    _db = _client.db();
  }
  return _db;
}

interface HealthCheckResult {
  timestamp: Date;
  status: "healthy" | "degraded" | "down";
  responseTime: number;
  httpStatus: number;
  envVars: Record<string, boolean>;
  error: string | null;
  alerts: string[];
}

async function performHealthCheck(port: number): Promise<HealthCheckResult> {
  const alerts: string[] = [];
  const start = Date.now();
  let httpStatus = 0;
  let error: string | null = null;
  let envVars: Record<string, boolean> = {};

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`http://127.0.0.1:${port}/healthz`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    httpStatus = res.status;
    const body = (await res.json()) as {
      ok?: boolean;
      env?: Record<string, boolean>;
    };

    envVars = body.env ?? {};

    // Check for missing env vars
    for (const [name, present] of Object.entries(envVars)) {
      if (!present) {
        alerts.push(`Missing env var: ${name}`);
      }
    }
  } catch (err) {
    httpStatus = 0;
    error = err instanceof Error ? err.message : String(err);
    alerts.push(`API unreachable: ${error}`);
  }

  const responseTime = Date.now() - start;

  // Check slow response
  if (responseTime > SLOW_THRESHOLD_MS) {
    alerts.push(`Slow response: ${responseTime}ms (threshold: ${SLOW_THRESHOLD_MS}ms)`);
  }

  // Determine status
  let status: HealthCheckResult["status"] = "healthy";
  if (httpStatus === 0) {
    status = "down";
  } else if (alerts.length > 0) {
    status = "degraded";
  }

  return { timestamp: new Date(), status, responseTime, httpStatus, envVars, error, alerts };
}

async function sendDiscordAlert(
  webhookUrl: string,
  result: HealthCheckResult,
): Promise<void> {
  const isDown = result.status === "down";
  const color = isDown ? DISCORD_EMBED_COLOR_RED : DISCORD_EMBED_COLOR_GREEN;
  const title = isDown
    ? "🔴 FuzzyNuts API is DOWN"
    : "⚠️ FuzzyNuts API degraded";

  const fields = [
    { name: "Status", value: result.status, inline: true },
    { name: "HTTP Status", value: String(result.httpStatus), inline: true },
    { name: "Response Time", value: `${result.responseTime}ms`, inline: true },
  ];

  if (result.error) {
    fields.push({ name: "Error", value: result.error.slice(0, 200), inline: false });
  }

  if (result.alerts.length > 0) {
    fields.push({
      name: "Alerts",
      value: result.alerts.join("\n").slice(0, 1000),
      inline: false,
    });
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title,
            color,
            fields,
            timestamp: result.timestamp.toISOString(),
          },
        ],
      }),
    });
  } catch (err) {
    console.error("[health-monitor] Discord webhook failed:", err);
  }
}

export function startHealthMonitor(opts: {
  MONGODB_URI: string;
  PORT: number;
  DISCORD_WEBHOOK_URL?: string;
}): void {
  const { MONGODB_URI, PORT, DISCORD_WEBHOOK_URL } = opts;

  console.log("[health-monitor] Starting cron job (every 5 minutes)");

  cron.schedule(CHECK_INTERVAL, async () => {
    try {
      const result = await performHealthCheck(PORT);

      // Store in MongoDB
      try {
        const db = await getDb(MONGODB_URI);
        await db.collection(COLLECTION).insertOne(result);
      } catch (dbErr) {
        console.error("[health-monitor] Failed to store check:", dbErr);
      }

      // Log result
      if (result.status === "healthy") {
        console.log(
          `[health-monitor] ✓ Healthy (${result.responseTime}ms, HTTP ${result.httpStatus})`,
        );
      } else {
        console.warn(
          `[health-monitor] ✗ ${result.status.toUpperCase()} — ${result.alerts.join(", ")}`,
        );
      }

      // Send Discord alert on failure
      if (result.status !== "healthy" && DISCORD_WEBHOOK_URL) {
        await sendDiscordAlert(DISCORD_WEBHOOK_URL, result);
        console.log("[health-monitor] Discord alert sent");
      }
    } catch (err) {
      console.error("[health-monitor] Cron tick failed:", err);
    }
  });
}
