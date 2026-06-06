"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWalletStore } from "@/store/wallet";
import {
  Shield,
  Activity,
  Clock,
  Zap,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  CheckCircle,
  XCircle,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   Monitoring Dashboard — /admin/monitoring

   Protected: only the ADMIN_WALLET can access.
   Shows health check history, response time chart, and alerts.
   Auto-refreshes every 30 seconds.
   ═══════════════════════════════════════════════════════════════ */

const API =
  process.env.NEXT_PUBLIC_CHAT_API ||
  "https://fuzzynutsxyz-production.up.railway.app";

const ADMIN_WALLET =
  process.env.NEXT_PUBLIC_ADMIN_WALLET ||
  "rfqADJY5Pn3ye4nTH7PA1dTxbCW1r3jYUt";

const REFRESH_INTERVAL = 30_000; // 30 seconds

interface HealthCheck {
  _id: string;
  timestamp: string;
  status: "healthy" | "degraded" | "down";
  responseTime: number;
  httpStatus: number;
  envVars: Record<string, boolean>;
  error: string | null;
  alerts: string[];
}

interface HealthSummary {
  total: number;
  healthy: number;
  degraded: number;
  down: number;
  avgResponseTime: number;
}

interface HealthResponse {
  summary: HealthSummary;
  checks: HealthCheck[];
}

export default function MonitoringPage() {
  const { address, isConnected } = useWalletStore();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
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

  // ── Fetch health data ───────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!authorized) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/monitoring/health`, {
        headers: { "x-wallet-address": ADMIN_WALLET },
      });
      if (res.ok) {
        const json = (await res.json()) as HealthResponse;
        setData(json);
        setLastRefresh(new Date());
      }
    } catch {
      // silent fail — will retry on next interval
    }
    setLoading(false);
  }, [authorized]);

  useEffect(() => {
    if (!authorized) return;
    fetchData();
    intervalRef.current = setInterval(fetchData, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [authorized, fetchData]);

  // ── Helpers ─────────────────────────────────────────────────
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

  const uptimePercent = data
    ? data.summary.total > 0
      ? Math.round((data.summary.healthy / data.summary.total) * 100)
      : 0
    : null;

  const currentStatus = data?.checks[0]?.status ?? "unknown";
  const currentResponseTime = data?.checks[0]?.responseTime ?? null;

  // Alert events (degraded or down)
  const alerts = data
    ? data.checks.filter((c) => c.status !== "healthy").slice(0, 10)
    : [];

  // ── SVG Chart ───────────────────────────────────────────────
  const renderChart = () => {
    if (!data || data.checks.length < 2) {
      return (
        <div className="flex h-48 items-center justify-center text-sm text-white/30">
          Not enough data for chart
        </div>
      );
    }

    // Reverse so oldest is first for the chart
    const points = [...data.checks].reverse();
    const times = points.map((p) => new Date(p.timestamp).getTime());
    const values = points.map((p) => p.responseTime);
    const maxVal = Math.max(...values, 100);
    const minTime = times[0];
    const maxTime = times[times.length - 1];
    const timeRange = maxTime - minTime || 1;

    const W = 700;
    const H = 180;
    const PAD = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;

    const coords = points.map((p, i) => {
      const x = PAD.left + ((times[i] - minTime) / timeRange) * chartW;
      const y = PAD.top + chartH - (values[i] / maxVal) * chartH;
      return { x, y };
    });

    const pathD = coords
      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
      .join(" ");

    const areaD =
      pathD +
      ` L ${coords[coords.length - 1].x} ${PAD.top + chartH} L ${coords[0].x} ${PAD.top + chartH} Z`;

    // Y-axis labels
    const yLabels = [0, Math.round(maxVal / 2), maxVal];

    // X-axis labels (4 evenly spaced)
    const xLabels = [];
    for (let i = 0; i < 4; i++) {
      const t = minTime + (timeRange * i) / 3;
      xLabels.push(
        new Date(t).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    }

    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {/* Grid lines */}
        {yLabels.map((v) => {
          const y = PAD.top + chartH - (v / maxVal) * chartH;
          return (
            <g key={v}>
              <line
                x1={PAD.left}
                y1={y}
                x2={W - PAD.right}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="4 4"
              />
              <text
                x={PAD.left - 8}
                y={y + 4}
                textAnchor="end"
                fill="rgba(255,255,255,0.3)"
                fontSize="10"
              >
                {v}ms
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#chartGradient)" />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#7c3aed"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r="3"
            fill={
              points[i].status === "healthy"
                ? "#10B981"
                : points[i].status === "degraded"
                  ? "#FBBF24"
                  : "#ef4444"
            }
            stroke="#0a0613"
            strokeWidth="1.5"
          />
        ))}

        {/* X-axis labels */}
        {xLabels.map((label, i) => {
          const x = PAD.left + (chartW * i) / 3;
          return (
            <text
              key={i}
              x={x}
              y={H - 5}
              textAnchor="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize="10"
            >
              {label}
            </text>
          );
        })}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

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
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity size={24} className="text-[#7c3aed]" />
            <h1
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Health Monitor
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-[11px] text-white/20">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchData}
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

        {/* Status Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Current Status */}
          <div className="rounded-lg border border-white/5 bg-[#120a22] p-4">
            <div className="mb-2 flex items-center gap-2">
              {currentStatus === "healthy" ? (
                <CheckCircle size={16} className="text-[#10B981]" />
              ) : currentStatus === "degraded" ? (
                <AlertTriangle size={16} className="text-[#FBBF24]" />
              ) : (
                <XCircle size={16} className="text-[#ef4444]" />
              )}
              <span className="text-xs text-white/40">Current Status</span>
            </div>
            <p
              className="text-xl font-bold capitalize"
              style={{
                fontFamily: "var(--font-display)",
                color:
                  currentStatus === "healthy"
                    ? "#10B981"
                    : currentStatus === "degraded"
                      ? "#FBBF24"
                      : currentStatus === "down"
                        ? "#ef4444"
                        : "rgba(255,255,255,0.3)",
              }}
            >
              {currentStatus}
            </p>
          </div>

          {/* Response Time */}
          <div className="rounded-lg border border-white/5 bg-[#120a22] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Zap size={16} className="text-[#7c3aed]" />
              <span className="text-xs text-white/40">Response Time</span>
            </div>
            <p
              className="text-xl font-bold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {currentResponseTime !== null ? `${currentResponseTime}ms` : "—"}
            </p>
            {data && (
              <p className="mt-1 text-[11px] text-white/20">
                avg {data.summary.avgResponseTime}ms over {data.summary.total}{" "}
                checks
              </p>
            )}
          </div>

          {/* Uptime */}
          <div className="rounded-lg border border-white/5 bg-[#120a22] p-4">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp size={16} className="text-[#10B981]" />
              <span className="text-xs text-white/40">Uptime (24h)</span>
            </div>
            <p
              className="text-xl font-bold"
              style={{
                fontFamily: "var(--font-display)",
                color:
                  uptimePercent !== null && uptimePercent >= 99
                    ? "#10B981"
                    : uptimePercent !== null && uptimePercent >= 95
                      ? "#FBBF24"
                      : "#ef4444",
              }}
            >
              {uptimePercent !== null ? `${uptimePercent}%` : "—"}
            </p>
            {data && (
              <p className="mt-1 text-[11px] text-white/20">
                {data.summary.healthy} / {data.summary.total} checks healthy
              </p>
            )}
          </div>
        </div>

        {/* Response Time Chart */}
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-[#7c3aed]" />
            <h2
              className="text-lg font-semibold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Response Time (24h)
            </h2>
          </div>
          <div className="rounded-lg border border-white/5 bg-[#120a22] p-4">
            {renderChart()}
          </div>
        </section>

        {/* Recent Alerts */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-[#e8943a]" />
            <h2
              className="text-lg font-semibold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Recent Alerts ({alerts.length})
            </h2>
          </div>
          {alerts.length === 0 && (
            <p className="rounded-lg bg-white/5 px-4 py-8 text-center text-sm text-white/30">
              No alerts in the last 24 hours
            </p>
          )}
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert._id}
                className="rounded-lg border border-white/5 bg-[#120a22] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      {alert.status === "degraded" ? (
                        <AlertTriangle
                          size={14}
                          className="shrink-0 text-[#FBBF24]"
                        />
                      ) : (
                        <XCircle
                          size={14}
                          className="shrink-0 text-[#ef4444]"
                        />
                      )}
                      <span
                        className="text-sm font-semibold capitalize"
                        style={{
                          fontFamily: "var(--font-display)",
                          color:
                            alert.status === "degraded"
                              ? "#FBBF24"
                              : "#ef4444",
                        }}
                      >
                        {alert.status}
                      </span>
                      <span className="text-[11px] text-white/20">
                        HTTP {alert.httpStatus}
                      </span>
                      <span className="text-[11px] text-white/20">
                        {alert.responseTime}ms
                      </span>
                    </div>
                    {alert.alerts.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {alert.alerts.map((msg, i) => (
                          <p
                            key={i}
                            className="text-[13px] text-white/50"
                          >
                            {msg}
                          </p>
                        ))}
                      </div>
                    )}
                    {alert.error && (
                      <p className="mt-1 font-mono text-[11px] text-[#ef4444]/60">
                        {alert.error}
                      </p>
                    )}
                    <p className="mt-2 flex items-center gap-1 text-[10px] text-white/20">
                      <Clock size={10} />
                      {formatTime(alert.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
