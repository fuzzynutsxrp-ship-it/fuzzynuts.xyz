"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";

/* ═══════════════════════════════════════════════════════════════
   useChatSocket — Shared Socket.io chat hook

   Used by both ChatWidget (main site) and GameModal sidebar.
   Returns messages, online users, send function, and connection state.
   ═══════════════════════════════════════════════════════════════ */

const CHAT_API =
  process.env.NEXT_PUBLIC_CHAT_API ||
  "https://fuzzynutsxyz-production.up.railway.app";

export interface ChatMessage {
  id: string;
  username: string;
  walletAddress?: string;
  content: string;
  createdAt: string;
  shadowed?: boolean;
  linkStripped?: boolean;
  aiFlagged?: boolean;
  isSystem?: boolean;
  muted?: boolean;
}

export interface OnlineUser {
  username: string;
  walletAddress: string;
  connectedAt: number;
}

export function useChatSocket(walletAddress: string | null | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const seenIdsRef = useRef(new Set<string>());

  // Clear all messages (admin /clear command)
  const clearMessages = useCallback(() => {
    setMessages([]);
    seenIdsRef.current.clear();
  }, []);

  useEffect(() => {
    if (!walletAddress) return;
    if (socketRef.current?.connected) return;

    let cancelled = false;

    const connect = async () => {
      // Load history
      try {
        const res = await fetch(`${CHAT_API}/api/chat/history`);
        if (res.ok && !cancelled) {
          const data = (await res.json()) as { messages: ChatMessage[] };
          seenIdsRef.current.clear();
          for (const msg of data.messages) {
            seenIdsRef.current.add(msg.id);
          }
          setMessages(data.messages);
        }
      } catch {
        // Not fatal
      }

      if (cancelled) return;

      const socket = io(CHAT_API, {
        auth: { walletAddress },
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

      // Admin /clear command — wipe all messages
      socket.on("chat:clear", () => {
        if (!cancelled) {
          setMessages([]);
          seenIdsRef.current.clear();
        }
      });
    };

    connect();

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
    };
  }, [walletAddress]);

  const sendMessage = useCallback((content: string) => {
    if (!content.trim() || !socketRef.current?.connected) return;
    socketRef.current.emit("message:send", { content: content.trim() });
    setError(null);
  }, []);

  return { messages, onlineUsers, connected, error, sendMessage, setError, clearMessages };
}
