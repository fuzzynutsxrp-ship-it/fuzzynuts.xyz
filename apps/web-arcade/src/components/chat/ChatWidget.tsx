"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { useWalletStore } from "@/store/wallet";
import { MessageSquare, X, Send, Users, AlertTriangle } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   ChatWidget — Community chat powered by Socket.io

   Auth: wallet address from Zustand store → server resolves RSC username
   Moderation: Tier 1 regex on server, shadow mode for blocked messages
   History: last 50 messages loaded on open, real-time after that
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

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when panel opens
  useEffect(() => {
    if (open && connected) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, connected]);

  // ── Socket connection (lifecycle: mount → unmount) ──────────
  useEffect(() => {
    if (!isConnected || !address) return;

    // Prevent duplicate connections in React strict mode
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

      socket.on("message:new", (msg: ChatMessage) => {
        if (cancelled) return;
        if (seenIdsRef.current.has(msg.id)) return;
        seenIdsRef.current.add(msg.id);
        setMessages((prev) => [...prev, msg]);
      });

      socket.on("message:shadowed", (msg: ChatMessage) => {
        if (cancelled) return;
        // Shadow messages get a unique ID, always show to sender
        // Preserve aiFlagged from server (Tier 2) for distinct styling
        setMessages((prev) => [
          ...prev,
          { ...msg, shadowed: true, aiFlagged: msg.aiFlagged ?? false },
        ]);
      });

      socket.on("message:link-stripped", (msg: ChatMessage) => {
        if (cancelled) return;
        // Link-stripped messages: show to sender with indicator
        setMessages((prev) => [...prev, { ...msg, linkStripped: true }]);
      });

      socket.on("message:report-ack", (msg: ChatMessage) => {
        if (cancelled) return;
        // Report confirmation: show as system message
        setMessages((prev) => [...prev, { ...msg, isSystem: true }]);
      });

      socket.on("message:muted", (msg: ChatMessage) => {
        if (cancelled) return;
        // Muted user: show message only to sender with yellow indicator
        setMessages((prev) => [...prev, { ...msg, muted: true }]);
      });

      socket.on("message:error", (data: { error: string }) => {
        if (!cancelled) setError(data.error);
      });

      socket.on("users:online", (users: OnlineUser[]) => {
        if (!cancelled) setOnlineUsers(users);
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
  }, [isConnected, address]);

  // ── Send message ────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    const content = input.trim();
    if (!content || !socketRef.current?.connected) return;
    socketRef.current.emit("message:send", { content });
    setInput("");
    setError(null);
  }, [input]);

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
    return null; // Don't render anything if wallet not connected
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
        {onlineUsers.length > 0 && (
          <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#7c3aed] text-[10px] font-bold">
            {onlineUsers.length}
          </span>
        )}
      </button>
    );
  }

  // ── Chat panel ──────────────────────────────────────────────
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
            {/* System messages (report confirmations) */}
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
