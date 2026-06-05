"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { useWalletStore } from "@/store/wallet";
import {
  MessageSquare,
  X,
  Send,
  Users,
  AlertTriangle,
  Mail,
  ArrowLeft,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   ChatWidget — Community chat + DMs powered by Socket.io

   Auth: wallet address from Zustand store → server resolves RSC username
   Moderation: Tier 1 regex + Tier 2 OpenAI on public + DM messages
   History: last 50 messages loaded on open, real-time after that
   DMs: private messages between users, stored 90 days
   ═══════════════════════════════════════════════════════════════ */

const CHAT_API =
  process.env.NEXT_PUBLIC_CHAT_API ||
  "https://fuzzynutsxyz-production.up.railway.app";

interface ChatMessage {
  id: string;
  username: string;
  content: string;
  createdAt: string;
  shadowed?: boolean;
  linkStripped?: boolean;
  aiFlagged?: boolean;
  isSystem?: boolean;
  muted?: boolean;
  walletAddress?: string;
}

interface DirectMessage {
  id: string;
  fromWallet: string;
  fromUsername: string;
  toWallet: string;
  toUsername: string;
  content: string;
  createdAt: string;
  blocked?: boolean;
  blockedReason?: string;
}

interface OnlineUser {
  username: string;
  walletAddress: string;
  connectedAt: number;
}

export function ChatWidget() {
  const { address, isConnected } = useWalletStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seenIdsRef = useRef(new Set<string>());
  const lastHistoryIdRef = useRef<string | null>(null);
  const historyLoadedRef = useRef(false);

  // ── DM state ─────────────────────────────────────────────────
  const [dmOpen, setDmOpen] = useState(false);
  const [dmTarget, setDmTarget] = useState<string | null>(null);
  const [dmTargetUsername, setDmTargetUsername] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [dmInput, setDmInput] = useState("");
  const [unreadDms, setUnreadDms] = useState(0);
  const [lastDmSender, setLastDmSender] = useState<{ wallet: string; username: string } | null>(null);
  const dmEndRef = useRef<HTMLDivElement>(null);
  const dmInputRef = useRef<HTMLInputElement>(null);

  // Refs for socket listener (avoids stale closures)
  const dmOpenRef = useRef(false);
  const dmTargetRef = useRef<string | null>(null);

  // Keep refs in sync with state
  useEffect(() => { dmOpenRef.current = dmOpen; }, [dmOpen]);
  useEffect(() => { dmTargetRef.current = dmTarget; }, [dmTarget]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const scrollDmToBottom = useCallback(() => {
    dmEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    scrollDmToBottom();
  }, [dmMessages, scrollDmToBottom]);

  // Focus input when panel opens
  useEffect(() => {
    if (open && connected && !dmOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (dmOpen && connected) {
      setTimeout(() => dmInputRef.current?.focus(), 100);
    }
  }, [open, connected, dmOpen]);

  // ── Socket connection (lifecycle: mount → unmount) ──────────
  useEffect(() => {
    if (!isConnected || !address) return;
    if (socketRef.current?.connected) return;

    let cancelled = false;

    const connectSocket = async () => {
      // Load history first
      try {
        historyLoadedRef.current = false;
        const res = await fetch(`${CHAT_API}/api/chat/history`);
        if (res.ok && !cancelled) {
          const data = (await res.json()) as { messages: ChatMessage[] };
          seenIdsRef.current.clear();
          for (const msg of data.messages) {
            seenIdsRef.current.add(msg.id);
          }
          if (data.messages.length > 0) {
            lastHistoryIdRef.current =
              data.messages[data.messages.length - 1].id;
          }
          setMessages(data.messages);
        }
      } catch {
        // History load failed — not fatal, continue with socket
      }
      historyLoadedRef.current = true;

      if (cancelled) return;

      // Connect socket
      const socket = io(CHAT_API, {
        auth: { walletAddress: address },
        withCredentials: true,
        transports: ["websocket", "polling"],
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        if (!cancelled) {
          setConnected(true);
          setError(null);
          // Request unread DM count on connect
          socket.emit("dm:unread");
        }
      });

      socket.on("disconnect", () => {
        if (!cancelled) setConnected(false);
      });

      socket.on("connect_error", (err) => {
        if (!cancelled) {
          setConnected(false);
          setError(err.message || "Connection failed");
        }
      });

      // ── Public chat events ─────────────────────────────────
      socket.on("message:new", (msg: ChatMessage) => {
        if (cancelled) return;
        if (seenIdsRef.current.has(msg.id)) return;
        seenIdsRef.current.add(msg.id);
        setMessages((prev) => [...prev, msg]);
      });

      socket.on("message:shadowed", (msg: ChatMessage) => {
        if (cancelled) return;
        setMessages((prev) => [
          ...prev,
          { ...msg, shadowed: true, aiFlagged: msg.aiFlagged ?? false },
        ]);
      });

      socket.on("message:link-stripped", (msg: ChatMessage) => {
        if (cancelled) return;
        setMessages((prev) => [...prev, { ...msg, linkStripped: true }]);
      });

      socket.on("message:report-ack", (msg: ChatMessage) => {
        if (cancelled) return;
        setMessages((prev) => [...prev, { ...msg, isSystem: true }]);
      });

      socket.on("message:muted", (msg: ChatMessage) => {
        if (cancelled) return;
        setMessages((prev) => [...prev, { ...msg, muted: true }]);
      });

      socket.on("message:error", (data: { error: string }) => {
        if (!cancelled) setError(data.error);
      });

      socket.on("users:online", (users: OnlineUser[]) => {
        if (!cancelled) setOnlineUsers(users);
      });

      // ── DM events ─────────────────────────────────────────
      socket.on("dm:receive", (msg: DirectMessage) => {
        if (cancelled) return;
        // Use refs to avoid stale closures
        if (dmOpenRef.current && dmTargetRef.current === msg.fromWallet) {
          setDmMessages((prev) => [...prev, msg]);
          socket.emit("dm:read", { fromWallet: msg.fromWallet });
        } else {
          setUnreadDms((prev) => prev + 1);
          setLastDmSender({ wallet: msg.fromWallet, username: msg.fromUsername });
        }
      });

      socket.on("dm:sent", (msg: DirectMessage) => {
        if (cancelled) return;
        setDmMessages((prev) => [...prev, { ...msg, blocked: false }]);
      });

      socket.on("dm:blocked", (msg: DirectMessage & { reason?: string }) => {
        if (cancelled) return;
        setDmMessages((prev) => [
          ...prev,
          { ...msg, blocked: true, blockedReason: msg.reason },
        ]);
      });

      socket.on("dm:unread-count", (data: { count: number }) => {
        if (!cancelled) setUnreadDms(data.count);
      });

      socket.on("dm:error", (data: { error: string }) => {
        if (!cancelled) setError(data.error);
      });
    };

    connectSocket();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      setMessages([]);
      setOnlineUsers([]);
      seenIdsRef.current.clear();
      lastHistoryIdRef.current = null;
      historyLoadedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  // ── Send public message ──────────────────────────────────────
  const sendMessage = useCallback(() => {
    const content = input.trim();
    if (!content || !socketRef.current?.connected) return;
    socketRef.current.emit("message:send", { content });
    setInput("");
    setError(null);
  }, [input]);

  // ── Send DM ──────────────────────────────────────────────────
  const sendDm = useCallback(() => {
    const content = dmInput.trim();
    if (!content || !socketRef.current?.connected || !dmTarget) return;
    socketRef.current.emit("dm:send", { toWallet: dmTarget, content });
    setDmInput("");
    setError(null);
  }, [dmInput, dmTarget]);

  // ── Open DM conversation ─────────────────────────────────────
  const openDm = useCallback(
    async (targetWallet: string, targetUsername: string) => {
      setDmTarget(targetWallet);
      setDmTargetUsername(targetUsername);
      setDmMessages([]);
      setDmOpen(true);

      // Mark as read
      if (socketRef.current?.connected) {
        socketRef.current.emit("dm:read", { fromWallet: targetWallet });
      }

      // Load DM history
      try {
        const res = await fetch(
          `${CHAT_API}/api/chat/dms/history?wallet1=${encodeURIComponent(address!)}&wallet2=${encodeURIComponent(targetWallet)}`,
        );
        if (res.ok) {
          const data = (await res.json()) as { messages: DirectMessage[] };
          setDmMessages(data.messages);
        }
      } catch {
        // Not fatal
      }
    },
    [address],
  );

  // ── Format timestamp ────────────────────────────────────────
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // ── Not connected state ─────────────────────────────────────
  if (!isConnected) {
    return null;
  }

  // ── Toggle button ───────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#1c0f33] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#7c3aed]/20 transition-all hover:bg-[#2d1b4e] hover:shadow-[#7c3aed]/30 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50"
        style={{ fontFamily: "var(--font-display)" }}
        aria-label="Open community chat"
      >
        <MessageSquare size={18} />
        <span>Chat</span>
        {unreadDms > 0 && (
          <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#ef4444] text-[10px] font-bold animate-pulse">
            {unreadDms > 9 ? "9+" : unreadDms}
          </span>
        )}
        {unreadDms === 0 && onlineUsers.length > 0 && (
          <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#7c3aed] text-[10px] font-bold">
            {onlineUsers.length}
          </span>
        )}
      </button>
    );
  }

  // ── DM Panel ────────────────────────────────────────────────
  if (dmOpen && dmTarget) {
    return (
      <div
        className="fixed bottom-0 right-0 z-50 flex h-[100dvh] w-full flex-col bg-[#0a0613] sm:bottom-6 sm:right-6 sm:h-[520px] sm:w-[380px] sm:rounded-xl sm:border sm:border-[#22d3ee]/20 sm:shadow-2xl sm:shadow-[#22d3ee]/10"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {/* DM Header */}
        <div className="flex items-center justify-between border-b border-[#22d3ee]/15 bg-[#0a1a2a] px-4 py-3 sm:rounded-t-xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setDmOpen(false);
                setDmTarget(null);
                setDmTargetUsername(null);
                setDmMessages([]);
              }}
              className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Back to chat"
            >
              <ArrowLeft size={16} />
            </button>
            <Mail size={16} className="text-[#22d3ee]" />
            <h3
              className="text-sm font-bold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {dmTargetUsername || "DM"}
            </h3>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close chat"
          >
            <X size={16} />
          </button>
        </div>

        {/* DM Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin">
          {dmMessages.length === 0 && (
            <div className="flex h-full items-center justify-center text-xs text-white/30">
              No messages yet. Say hello!
            </div>
          )}
          {dmMessages.map((msg) => {
            const isMine = msg.fromWallet === address;
            return (
              <div key={msg.id} className={`mb-3 ${msg.blocked ? "opacity-50" : ""}`}>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      msg.blocked
                        ? "text-[#ef4444]"
                        : isMine
                          ? "text-[#22d3ee]"
                          : "text-[#10B981]"
                    }`}
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {msg.fromUsername}
                  </span>
                  <span className="text-[10px] text-white/20">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                <p
                  className={`mt-0.5 text-[13px] leading-relaxed ${
                    msg.blocked
                      ? "text-[#ef4444]/70 line-through"
                      : "text-white/80"
                  }`}
                >
                  {msg.content}
                </p>
                {msg.blocked && (
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#ef4444]/50">
                    <AlertTriangle size={10} />
                    Blocked — {msg.blockedReason || "flagged by moderation"}
                  </p>
                )}
              </div>
            );
          })}
          <div ref={dmEndRef} />
        </div>

        {/* DM Input */}
        <div className="border-t border-[#22d3ee]/15 bg-[#0a1a2a] px-4 py-3 sm:rounded-b-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendDm();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={dmInputRef}
              type="text"
              value={dmInput}
              onChange={(e) => setDmInput(e.target.value)}
              placeholder={`Message ${dmTargetUsername || "user"}...`}
              disabled={!connected}
              maxLength={500}
              className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-[13px] text-white placeholder-white/25 outline-none transition-colors focus:bg-white/8 focus:ring-1 focus:ring-[#22d3ee]/40 disabled:opacity-40"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={!connected || !dmInput.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#22d3ee] text-[#0a0613] transition-all hover:bg-[#06b6d4] disabled:opacity-30 disabled:hover:bg-[#22d3ee]"
              aria-label="Send DM"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main Chat panel ─────────────────────────────────────────
  return (
    <div
      className="fixed bottom-0 right-0 z-50 flex h-[100dvh] w-full flex-col bg-[#0a0613] sm:bottom-6 sm:right-6 sm:h-[520px] sm:w-[380px] sm:rounded-xl sm:border sm:border-[#7c3aed]/20 sm:shadow-2xl sm:shadow-[#7c3aed]/10"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#7c3aed]/15 bg-[#120a22] px-4 py-3 sm:rounded-t-xl">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-[#7c3aed]" />
          <h3
            className="text-sm font-bold text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Community Chat
          </h3>
          {connected && (
            <span className="h-2 w-2 rounded-full bg-[#10B981]" title="Connected" />
          )}
          {!connected && (
            <span className="h-2 w-2 rounded-full bg-[#ef4444]" title="Disconnected" />
          )}
        </div>
        <div className="flex items-center gap-3">
          {unreadDms > 0 && lastDmSender && (
            <button
              onClick={() => openDm(lastDmSender.wallet, lastDmSender.username)}
              className="flex items-center gap-1 text-xs text-[#22d3ee] transition-colors hover:text-[#06b6d4]"
              title={`DM from ${lastDmSender.username}`}
              aria-label="Open unread DM"
            >
              <Mail size={14} />
              <span className="font-bold">{unreadDms}</span>
            </button>
          )}
          {onlineUsers.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-white/40">
              <Users size={12} />
              {onlineUsers.length}
            </span>
          )}
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close chat"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-xs text-white/30">
            {connected ? "No messages yet. Say hello!" : "Connecting..."}
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-3 ${msg.shadowed ? "opacity-50" : ""}`}
          >
            {/* System messages */}
            {msg.isSystem && (
              <div className="rounded-lg border border-[#10B981]/20 bg-[#10B981]/5 px-3 py-2">
                <p className="text-[12px] leading-relaxed text-[#10B981]/80">
                  {msg.content}
                </p>
              </div>
            )}

            {/* Regular / shadowed / link-stripped messages */}
            {!msg.isSystem && (
              <>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      msg.muted
                        ? "text-[#FBBF24]"
                        : msg.shadowed && msg.aiFlagged
                          ? "text-[#e8943a]"
                          : msg.shadowed
                            ? "text-[#ef4444]"
                            : msg.linkStripped
                              ? "text-[#3B82F6]"
                              : "text-[#7c3aed]"
                    }`}
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {msg.username}
                  </span>
                  {/* DM button — only show for other users */}
                  {msg.walletAddress && msg.walletAddress !== address && (
                    <button
                      onClick={() => openDm(msg.walletAddress!, msg.username)}
                      className="rounded p-0.5 text-[#22d3ee]/40 transition-colors hover:bg-[#22d3ee]/10 hover:text-[#22d3ee]"
                      title={`DM ${msg.username}`}
                      aria-label={`Send DM to ${msg.username}`}
                    >
                      <Mail size={11} />
                    </button>
                  )}
                  <span className="text-[10px] text-white/20">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                <p
                  className={`mt-0.5 text-[13px] leading-relaxed ${
                    msg.muted
                      ? "text-[#FBBF24]/70 line-through"
                      : msg.shadowed && msg.aiFlagged
                        ? "text-[#e8943a]/70 line-through"
                        : msg.shadowed
                          ? "text-[#ef4444]/70 line-through"
                          : msg.linkStripped
                            ? "text-white/70"
                            : "text-white/80"
                  }`}
                >
                  {msg.content}
                </p>
                {msg.muted && (
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#FBBF24]/50">
                    <AlertTriangle size={10} />
                    Only you can see this — you are muted
                  </p>
                )}
                {msg.shadowed && msg.aiFlagged && (
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#e8943a]/50">
                    <AlertTriangle size={10} />
                    Only you can see this — flagged by AI moderation
                  </p>
                )}
                {msg.shadowed && !msg.aiFlagged && (
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#ef4444]/50">
                    <AlertTriangle size={10} />
                    Only you can see this — flagged by moderation
                  </p>
                )}
                {msg.linkStripped && (
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#3B82F6]/60">
                    <AlertTriangle size={10} />
                    Links removed — accounts must be 24+ hours old to post links
                  </p>
                )}
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Error bar */}
      {error && (
        <div className="border-t border-[#ef4444]/20 bg-[#ef4444]/5 px-4 py-2 text-[11px] text-[#ef4444]">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-[#7c3aed]/15 bg-[#120a22] px-4 py-3 sm:rounded-b-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (error) setError(null);
            }}
            placeholder={
              connected ? "Type a message..." : "Connecting..."
            }
            disabled={!connected}
            maxLength={500}
            className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-[13px] text-white placeholder-white/25 outline-none transition-colors focus:bg-white/8 focus:ring-1 focus:ring-[#7c3aed]/40 disabled:opacity-40"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={!connected || !input.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7c3aed] text-white transition-all hover:bg-[#6d28d9] disabled:opacity-30 disabled:hover:bg-[#7c3aed]"
            aria-label="Send message"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
