/**
 * apps/api/src/routes/monitoring.ts
 *
 * Admin-only monitoring endpoints. Returns health check history
 * stored by the health-monitor cron job.
 */

import { Router } from "express";
import { MongoClient, type Db } from "mongodb";

const COLLECTION = "health_checks";

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

export function buildMonitoringRouter(env: {
  MONGODB_URI: string;
  ADMIN_WALLET_ADDRESS: string;
}): import("express").Router {
  const { MONGODB_URI, ADMIN_WALLET_ADDRESS } = env;
  const router = Router();

  // ── GET /api/monitoring/health ──────────────────────────────────
  // Returns last 24 hours of health checks (max 288 records).
  // Protected by admin wallet header check.
  router.get("/health", async (req, res) => {
    try {
      // Verify admin wallet
      const wallet = req.headers["x-wallet-address"];
      if (!wallet || wallet !== ADMIN_WALLET_ADDRESS) {
        res.status(403).json({ error: "E_FORBIDDEN" });
        return;
      }

      const db = await getDb(MONGODB_URI);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const checks = await db
        .collection(COLLECTION)
        .find({ timestamp: { $gte: twentyFourHoursAgo } })
        .sort({ timestamp: -1 })
        .limit(288)
        .toArray();

      // Summary stats
      const total = checks.length;
      const healthy = checks.filter((c) => c.status === "healthy").length;
      const degraded = checks.filter((c) => c.status === "degraded").length;
      const down = checks.filter((c) => c.status === "down").length;
      const avgResponseTime =
        total > 0
          ? Math.round(checks.reduce((sum, c) => sum + (c.responseTime ?? 0), 0) / total)
          : 0;

      res.json({
        summary: { total, healthy, degraded, down, avgResponseTime },
        checks,
      });
    } catch (err) {
      console.error("[monitoring] Health query failed:", err);
      res.status(500).json({ error: "E_INTERNAL" });
    }
  });

  return router;
}
