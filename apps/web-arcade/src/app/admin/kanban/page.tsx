"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWalletStore } from "@/store/wallet";
import {
  Shield,
  Plus,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
  Loader,
  ClipboardList,
  X,
  ChevronUp,
  ChevronDown,
  Minus,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   Kanban Board — /admin/kanban

   Protected: only the ADMIN_WALLET can access.
   Visual task board for autonomous worker agents.
   ═══════════════════════════════════════════════════════════════ */

const API =
  process.env.NEXT_PUBLIC_CHAT_API ||
  "https://fuzzynutsxyz-production.up.railway.app";

const ADMIN_WALLET =
  process.env.NEXT_PUBLIC_ADMIN_WALLET ||
  "rfqADJY5Pn3ye4nTH7PA1dTxbCW1r3jYUt";

const REFRESH_INTERVAL = 30_000;

interface Task {
  _id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "med" | "high";
  assigned_agent: string | null;
  created_at: string;
  updated_at: string;
  result_notes: string;
}

interface GroupedTasks {
  todo: Task[];
  in_progress: Task[];
  done: Task[];
}

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "#10B981", bg: "rgba(16,185,129,0.1)" },
  med: { label: "Med", color: "#FBBF24", bg: "rgba(251,191,36,0.1)" },
  high: { label: "High", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

export default function KanbanPage() {
  const { address, isConnected } = useWalletStore();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tasks, setTasks] = useState<GroupedTasks>({
    todo: [],
    in_progress: [],
    done: [],
  });
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createPriority, setCreatePriority] = useState<"low" | "med" | "high">("med");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Admin wallet check ──────────────────────────────────────
  useEffect(() => {
    if (!isConnected || !address) {
      setAuthorized(false);
      setChecking(false);
      return;
    }
    if (!ADMIN_WALLET) {
      setAuthorized(false);
      setChecking(false);
      return;
    }
    setAuthorized(address.toLowerCase() === ADMIN_WALLET.toLowerCase());
    setChecking(false);
  }, [address, isConnected]);

  // ── Fetch tasks ─────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    if (!authorized) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/kanban`, {
        headers: { "x-wallet-address": ADMIN_WALLET },
      });
      if (res.ok) {
        const json = (await res.json()) as GroupedTasks;
        setTasks(json);
        setLastRefresh(new Date());
      }
    } catch {
      // silent
    }
    setLoading(false);
  }, [authorized]);

  useEffect(() => {
    if (!authorized) return;
    fetchTasks();
    intervalRef.current = setInterval(fetchTasks, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [authorized, fetchTasks]);

  // ── Create task ─────────────────────────────────────────────
  const handleCreate = async () => {
    if (!createTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API}/api/kanban`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": ADMIN_WALLET,
        },
        body: JSON.stringify({
          title: createTitle.trim(),
          description: createDesc.trim(),
          priority: createPriority,
        }),
      });
      if (res.ok) {
        setCreateTitle("");
        setCreateDesc("");
        setCreatePriority("med");
        setShowCreate(false);
        fetchTasks();
      }
    } catch {
      // silent
    }
    setCreating(false);
  };

  // ── Delete task ─────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`${API}/api/kanban/${id}`, {
        method: "DELETE",
        headers: { "x-wallet-address": ADMIN_WALLET },
      });
      if (res.ok) fetchTasks();
    } catch {
      // silent
    }
    setDeleting(null);
  };

  // ── Helpers ─────────────────────────────────────────────────
  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const totalTasks = tasks.todo.length + tasks.in_progress.length + tasks.done.length;

  // ── Column config ───────────────────────────────────────────
  const columns = [
    {
      key: "todo" as const,
      label: "To Do",
      icon: <ClipboardList size={16} className="text-[#7c3aed]" />,
      accentColor: "#7c3aed",
      tasks: tasks.todo,
    },
    {
      key: "in_progress" as const,
      label: "In Progress",
      icon: <Loader size={16} className="text-[#FBBF24]" />,
      accentColor: "#FBBF24",
      tasks: tasks.in_progress,
    },
    {
      key: "done" as const,
      label: "Done",
      icon: <CheckCircle size={16} className="text-[#10B981]" />,
      accentColor: "#10B981",
      tasks: tasks.done,
    },
  ];

  // ── States ──────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0613]">
        <p className="text-white/30">Checking access...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0613]">
        <div className="text-center">
          <Shield size={48} className="mx-auto mb-4 text-white/20" />
          <p className="text-white/40">Connect your wallet to continue</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0613]">
        <div className="text-center">
          <Shield size={48} className="mx-auto mb-4 text-[#ef4444]/40" />
          <h1
            className="text-xl font-bold text-[#ef4444]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Access Denied
          </h1>
          <p className="mt-2 text-sm text-white/30">
            This wallet is not authorized for the admin dashboard.
          </p>
        </div>
      </div>
    );
  }

  // ── Dashboard ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0613] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList size={24} className="text-[#7c3aed]" />
            <div>
              <h1
                className="text-2xl font-bold text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Kanban Board
              </h1>
              <p className="text-xs text-white/30">
                {totalTasks} task{totalTasks !== 1 ? "s" : ""} · Auto-refreshes
                every 30s
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="hidden text-[11px] text-white/20 sm:inline">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-lg bg-[#7c3aed]/20 px-4 py-2 text-sm font-semibold text-[#7c3aed] transition-colors hover:bg-[#7c3aed]/30"
            >
              <Plus size={14} />
              Create Task
            </button>
            <button
              onClick={fetchTasks}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <RefreshCw
                size={14}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Create Task Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#120a22] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2
                  className="text-lg font-bold text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Create Task
                </h2>
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg p-1 text-white/30 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-white/40">
                    Title
                  </label>
                  <input
                    type="text"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="Fix build error in arcade-core"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-[#7c3aed]/50 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate();
                    }}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-white/40">
                    Description
                  </label>
                  <textarea
                    value={createDesc}
                    onChange={(e) => setCreateDesc(e.target.value)}
                    placeholder="Detailed instructions for the worker agent..."
                    rows={3}
                    className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-[#7c3aed]/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-white/40">
                    Priority
                  </label>
                  <div className="flex gap-2">
                    {(["low", "med", "high"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setCreatePriority(p)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          createPriority === p
                            ? "ring-1"
                            : "opacity-50 hover:opacity-75"
                        }`}
                        style={{
                          backgroundColor: PRIORITY_CONFIG[p].bg,
                          color: PRIORITY_CONFIG[p].color,
                          ringColor:
                            createPriority === p
                              ? PRIORITY_CONFIG[p].color
                              : "transparent",
                        }}
                      >
                        {p === "high" ? (
                          <ChevronUp size={12} />
                        ) : p === "low" ? (
                          <ChevronDown size={12} />
                        ) : (
                          <Minus size={12} />
                        )}
                        {PRIORITY_CONFIG[p].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="rounded-lg bg-white/5 px-4 py-2 text-sm text-white/60 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!createTitle.trim() || creating}
                    className="flex items-center gap-2 rounded-lg bg-[#7c3aed]/20 px-4 py-2 text-sm font-semibold text-[#7c3aed] transition-colors hover:bg-[#7c3aed]/30 disabled:opacity-40"
                  >
                    {creating ? (
                      <Loader size={14} className="animate-spin" />
                    ) : (
                      <Plus size={14} />
                    )}
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Kanban Columns */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {columns.map((col) => (
            <div key={col.key} className="min-h-[300px]">
              {/* Column Header */}
              <div className="mb-3 flex items-center gap-2">
                {col.icon}
                <h2
                  className="text-sm font-semibold text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {col.label}
                </h2>
                <span
                  className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{
                    backgroundColor: `${col.accentColor}15`,
                    color: col.accentColor,
                  }}
                >
                  {col.tasks.length}
                </span>
              </div>

              {/* Task Cards */}
              <div className="space-y-3">
                {col.tasks.length === 0 && (
                  <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-xs text-white/20">
                    No tasks
                  </div>
                )}
                {col.tasks.map((task) => (
                  <div
                    key={task._id}
                    className="group rounded-lg border border-white/5 bg-[#120a22] p-4 transition-colors hover:border-white/10"
                  >
                    {/* Title + Priority */}
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white leading-tight">
                        {task.title}
                      </h3>
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                        style={{
                          backgroundColor:
                            PRIORITY_CONFIG[task.priority]?.bg ?? PRIORITY_CONFIG.med.bg,
                          color:
                            PRIORITY_CONFIG[task.priority]?.color ?? PRIORITY_CONFIG.med.color,
                        }}
                      >
                        {task.priority}
                      </span>
                    </div>

                    {/* Description */}
                    {task.description && (
                      <p className="mb-2 text-[13px] leading-relaxed text-white/40">
                        {task.description}
                      </p>
                    )}

                    {/* Agent badge (in_progress) */}
                    {task.assigned_agent && (
                      <div className="mb-2 flex items-center gap-1.5">
                        <Loader size={12} className="text-[#FBBF24]" />
                        <span className="text-[11px] font-mono text-[#FBBF24]/80">
                          {task.assigned_agent}
                        </span>
                      </div>
                    )}

                    {/* Result notes (done) */}
                    {task.result_notes && col.key === "done" && (
                      <div className="mb-2 rounded-md bg-[#10B981]/5 px-2.5 py-1.5 text-[12px] text-[#10B981]/80">
                        {task.result_notes}
                      </div>
                    )}

                    {/* Footer: date + delete */}
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[10px] text-white/20">
                        <Clock size={10} />
                        {formatDate(task.created_at)}
                      </span>
                      <button
                        onClick={() => handleDelete(task._id)}
                        disabled={deleting === task._id}
                        className="rounded p-1 text-white/10 opacity-0 transition-all hover:text-[#ef4444] group-hover:opacity-100 disabled:opacity-40"
                        title="Delete task"
                      >
                        {deleting === task._id ? (
                          <Loader size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
