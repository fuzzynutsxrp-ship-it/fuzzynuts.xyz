/**
 * Redis adapter for Socket.io pub/sub.
 *
 * When REDIS_URL is set and reachable, creates a pub/sub pair and attaches
 * the @socket.io/redis-adapter so chat messages fan out across all Railway
 * instances.  If Redis is unreachable, Socket.io falls back to its default
 * in-memory adapter — no crash, no feature loss for single-instance deploys.
 */

import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import type { Server } from "socket.io";

/**
 * Attach the Redis adapter to a Socket.io Server instance.
 *
 * @returns `true` if the adapter was attached, `false` if running in-memory.
 */
export async function attachRedisAdapter(io: Server, redisUrl: string): Promise<boolean> {
  try {
    const pubClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        // Stop retrying after 3 attempts — fall back to in-memory
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      },
      enableReadyCheck: true,
      connectTimeout: 5_000,
    });

    // Wait for the first connection (or timeout)
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Redis connection timeout (5s)")), 5_000);
      pubClient.once("ready", () => {
        clearTimeout(timeout);
        resolve();
      });
      pubClient.once("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    const subClient = pubClient.duplicate();

    io.adapter(createAdapter(pubClient, subClient));

    // Log lifecycle events
    pubClient.on("error", (err) => console.error("[redis:pub] Connection error:", err.message));
    subClient.on("error", (err) => console.error("[redis:sub] Connection error:", err.message));

    console.log("[redis] Socket.io Redis adapter attached (pub/sub)");
    return true;
  } catch (err) {
    console.warn(
      "[redis] Failed to connect — falling back to in-memory adapter:",
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}
