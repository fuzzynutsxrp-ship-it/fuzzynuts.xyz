"use client";

import { useState, useEffect, useCallback } from "react";
import { useWalletStore } from "@/store/wallet";
import {
  Shield,
  AlertTriangle,
  UserX,
  UserCheck,
  Clock,
  MessageSquare,
  RefreshCw,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   Admin Chat Dashboard — /admin/chat

   Protected: only the ADMIN_WALLET_ADDRESS can access.
   Shows reports, muted users, and mute/unmute controls.
   ═══════════════════════════════════════════════════════════════ */

const CHAT_API =
  process.env.NEXT_PUBLIC_CHAT_API ||
  "https://fuzzynutsxyz-production.up.railway.app";

const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET || "rfqADJY5Pn3ye4nTH7PA1dTxbCW1r3jYUt";

interface Report {
  _id: string;
  reportedUsername: string;
  reportedBy: string;
  reporterUsername: string;
  lastMessage: string;
  createdAt: string;
}

interface Mute {
  _id: string;
  walletAddress: string;
  username: string;
  mutedBy: string;
  createdAt: string;
  expiresAt: string;
}

export default function AdminChatPage() {
  const { address, isConnected } = useWalletStore();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [mutes, setMutes] = useState<Mute[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Check authorization
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

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!authorized) return;
    setLoading(true);
    try {
      const [reportsRes, mutesRes] = await Promise.all([
        fetch(`${CHAT_API}/api/chat/admin/reports`, { credentials: "include" }),
        fetch(`${CHAT_API}/api/chat/admin/mutes`, { credentials: "include" }),
      ]);
      if (reportsRes.ok) {
        const data = (await reportsRes.json()) as { reports: Report[] };
        setReports(data.reports);
      }
      if (mutesRes.ok) {
        const data = (await mutesRes.json()) as { mutes: Mute[] };
        setMutes(data.mutes);
      }
    } catch {
      setMessage("Failed to fetch data");
    }
    setLoading(false);
  }, [authorized]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Mute a user
  const muteUser = async (walletAddress: string, username: string) => {
    setActionLoading(walletAddress);
    setMessage(null);
    try {
      const res = await fetch(`${CHAT_API}/api/chat/admin/mute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ walletAddress, username, durationHours: 24 }),
      });
      if (res.ok) {
        setMessage(`Muted ${username} for 24 hours`);
        fetchData();
      } else {
        const data = (await res.json()) as { error?: string };
        setMessage(data.error || "Mute failed");
      }
    } catch {
      setMessage("Network error");
    }
    setActionLoading(null);
  };

  // Unmute a user
  const unmuteUser = async (walletAddress: string) => {
    setActionLoading(walletAddress);
    setMessage(null);
    try {
      const res = await fetch(`${CHAT_API}/api/chat/admin/unmute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ walletAddress }),
      });
      if (res.ok) {
        setMessage("User unmuted");
        fetchData();
      } else {
        const data = (await res.json()) as { error?: string };
        setMessage(data.error || "Unmute failed");
      }
    } catch {
      setMessage("Network error");
    }
    setActionLoading(null);
  };

  const formatTime = (iso: string) => {
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

  // ── Access Denied ────────────────────────────────────────────
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
          <h1 className="text-xl font-bold text-[#ef4444]" style={{ fontFamily: "var(--font-display)" }}>
            Access Denied
          </h1>
          <p className="mt-2 text-sm text-white/30">
            This wallet is not authorized for the admin dashboard.
          </p>
        </div>
      </div>
    );
  }

  // ── Dashboard ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0613] px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-[#7c3aed]" />
            <h1
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Chat Moderation
            </h1>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Status message */}
        {message && (
          <div className="mb-6 rounded-lg border border-[#7c3aed]/20 bg-[#7c3aed]/5 px-4 py-3 text-sm text-[#7c3aed]">
            {message}
          </div>
        )}

        {/* Reports Section */}
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-[#e8943a]" />
            <h2
              className="text-lg font-semibold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Recent Reports ({reports.length})
            </h2>
          </div>
          {reports.length === 0 && (
            <p className="rounded-lg bg-white/5 px-4 py-8 text-center text-sm text-white/30">
              No reports yet
            </p>
          )}
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report._id}
                className="rounded-lg border border-white/5 bg-[#120a22] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-[#e8943a]" style={{ fontFamily: "var(--font-display)" }}>
                        {report.reporterUsername}
                      </span>
                      <span className="text-xs text-white/20">reported</span>
                      <span className="text-xs font-semibold text-[#ef4444]" style={{ fontFamily: "var(--font-display)" }}>
                        {report.reportedUsername}
                      </span>
                    </div>
                    <p className="text-[13px] text-white/50 truncate">
                      <MessageSquare size={12} className="inline mr-1" />
                      &ldquo;{report.lastMessage}&rdquo;
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-white/20">
                      <Clock size={10} />
                      {formatTime(report.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => muteUser(report.reportedBy, report.reportedUsername)}
                    disabled={actionLoading === report.reportedBy}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#ef4444]/10 px-3 py-2 text-xs font-semibold text-[#ef4444] transition-colors hover:bg-[#ef4444]/20 disabled:opacity-40"
                  >
                    <UserX size={14} />
                    Mute 24h
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Muted Users Section */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <UserX size={18} className="text-[#FBBF24]" />
            <h2
              className="text-lg font-semibold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Muted Users ({mutes.length})
            </h2>
          </div>
          {mutes.length === 0 && (
            <p className="rounded-lg bg-white/5 px-4 py-8 text-center text-sm text-white/30">
              No muted users
            </p>
          )}
          <div className="space-y-3">
            {mutes.map((mute) => (
              <div
                key={mute._id}
                className="rounded-lg border border-white/5 bg-[#120a22] p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-sm font-semibold text-[#FBBF24]" style={{ fontFamily: "var(--font-display)" }}>
                      {mute.username}
                    </span>
                    <p className="mt-0.5 text-[11px] text-white/30 font-mono">
                      {mute.walletAddress.slice(0, 12)}...{mute.walletAddress.slice(-6)}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-white/20">
                      <Clock size={10} />
                      Muted {formatTime(mute.createdAt)} · Expires {formatTime(mute.expiresAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => unmuteUser(mute.walletAddress)}
                    disabled={actionLoading === mute.walletAddress}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#10B981]/10 px-3 py-2 text-xs font-semibold text-[#10B981] transition-colors hover:bg-[#10B981]/20 disabled:opacity-40"
                  >
                    <UserCheck size={14} />
                    Unmute
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
