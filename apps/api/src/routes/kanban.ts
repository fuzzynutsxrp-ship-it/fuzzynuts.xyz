/**
 * apps/api/src/routes/kanban.ts
 *
 * Kanban task board API for autonomous worker agents.
 * Admin can create/read/delete tasks. Agents can claim tasks.
 */

import { Router } from "express";
import { MongoClient, type Db, ObjectId } from "mongodb";

const COLLECTION = "kanban_tasks";

let _db: Db | null = null;
let _client: MongoClient | null = null;

async function getDb(uri: string): Promise<Db> {
  if (!_db) {
    _client = new MongoClient(uri);
    await _client.connect();
    _db = _client.db();
    // Indexes
    await _db.collection(COLLECTION).createIndex({ status: 1, created_at: 1 });
  }
  return _db;
}

export function buildKanbanRouter(env: {
  MONGODB_URI: string;
  ADMIN_WALLET_ADDRESS: string;
}): import("express").Router {
  const { MONGODB_URI, ADMIN_WALLET_ADDRESS } = env;
  const router = Router();

  // ── Admin auth middleware ────────────────────────────────────
  function requireAdmin(
    req: import("express").Request,
    res: import("express").Response,
    next: import("express").NextFunction,
  ): void {
    const wallet = req.headers["x-wallet-address"];
    if (!wallet || wallet !== ADMIN_WALLET_ADDRESS) {
      res.status(403).json({ error: "E_FORBIDDEN" });
      return;
    }
    next();
  }

  // ── GET /api/kanban — all tasks grouped by status ───────────
  router.get("/", requireAdmin, async (_req, res) => {
    try {
      const db = await getDb(MONGODB_URI);
      const tasks = await db.collection(COLLECTION).find({}).sort({ created_at: -1 }).toArray();

      const grouped = {
        todo: tasks.filter((t) => t.status === "todo"),
        in_progress: tasks.filter((t) => t.status === "in_progress"),
        done: tasks.filter((t) => t.status === "done"),
      };

      res.json(grouped);
    } catch (err) {
      console.error("[kanban] Failed to fetch tasks:", err);
      res.status(500).json({ error: "E_INTERNAL" });
    }
  });

  // ── POST /api/kanban — create a task ────────────────────────
  router.post("/", requireAdmin, async (req, res) => {
    try {
      const { title, description, priority } = req.body as {
        title?: string;
        description?: string;
        priority?: string;
      };

      if (!title || typeof title !== "string" || title.trim().length === 0) {
        res.status(400).json({ error: "E_SCHEMA", detail: "title is required" });
        return;
      }

      const validPriorities = ["low", "med", "high"];
      const taskPriority = validPriorities.includes(priority ?? "") ? priority : "med";

      const now = new Date();
      const task = {
        title: title.trim(),
        description: (description ?? "").trim(),
        status: "todo" as const,
        priority: taskPriority,
        assigned_agent: null,
        created_at: now,
        updated_at: now,
        result_notes: "",
      };

      const db = await getDb(MONGODB_URI);
      const result = await db.collection(COLLECTION).insertOne(task);

      res.status(201).json({ ...task, _id: result.insertedId });
    } catch (err) {
      console.error("[kanban] Failed to create task:", err);
      res.status(500).json({ error: "E_INTERNAL" });
    }
  });

  // ── PATCH /api/kanban/:id — update a task ───────────────────
  router.patch("/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!id || !ObjectId.isValid(id)) {
        res.status(400).json({ error: "E_SCHEMA", detail: "invalid id" });
        return;
      }

      const updates: Record<string, unknown> = {};
      const allowed = ["status", "assigned_agent", "result_notes", "priority"];
      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          updates[key] = req.body[key];
        }
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: "E_SCHEMA", detail: "no valid fields" });
        return;
      }

      updates.updated_at = new Date();

      const db = await getDb(MONGODB_URI);
      const result = await db
        .collection(COLLECTION)
        .findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: updates },
          { returnDocument: "after" },
        );

      if (!result) {
        res.status(404).json({ error: "E_NOT_FOUND" });
        return;
      }

      res.json(result);
    } catch (err) {
      console.error("[kanban] Failed to update task:", err);
      res.status(500).json({ error: "E_INTERNAL" });
    }
  });

  // ── DELETE /api/kanban/:id — delete a task ──────────────────
  router.delete("/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      if (!id || !ObjectId.isValid(id)) {
        res.status(400).json({ error: "E_SCHEMA", detail: "invalid id" });
        return;
      }

      const db = await getDb(MONGODB_URI);
      const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        res.status(404).json({ error: "E_NOT_FOUND" });
        return;
      }

      res.json({ deleted: true });
    } catch (err) {
      console.error("[kanban] Failed to delete task:", err);
      res.status(500).json({ error: "E_INTERNAL" });
    }
  });

  // ── GET /api/kanban/claim — agent claims oldest todo task ───
  router.get("/claim", async (req, res) => {
    try {
      const agentName = req.headers["x-agent-name"];
      if (!agentName || typeof agentName !== "string") {
        res.status(400).json({ error: "E_SCHEMA", detail: "x-agent-name header required" });
        return;
      }

      const db = await getDb(MONGODB_URI);
      const now = new Date();

      // Find the oldest todo task and atomically update it
      const result = await db.collection(COLLECTION).findOneAndUpdate(
        { status: "todo" },
        {
          $set: {
            status: "in_progress",
            assigned_agent: agentName,
            updated_at: now,
          },
        },
        { sort: { created_at: 1 }, returnDocument: "after" },
      );

      if (!result) {
        res.status(404).json({ error: "E_NO_TASKS", detail: "no todo tasks available" });
        return;
      }

      console.log(`[kanban] Agent "${agentName}" claimed task: ${result.title}`);
      res.json(result);
    } catch (err) {
      console.error("[kanban] Failed to claim task:", err);
      res.status(500).json({ error: "E_INTERNAL" });
    }
  });

  return router;
}
