"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";

/* ═══════════════════════════════════════════════════════════════
   useChatSocket — Shared Socket.io chat hook

   Used by both ChatWidget (main site) and GameModal sidebar.
   Returns messages, online users, send function, and connection state.

   Supports two identity modes:
     - Guest:  deviceId from localStorage → server assigns name + color
     - Wallet: XRPL address → server resolves RSC username
   ═══════════════════════════════════════════════════════════════ */

const CHAT_API =
  process.env.NEXT_PUBLIC_CHAT_API ||
  "https://fuzzynutsxyz-production.up.railway.app";

const DEVICE_ID_KEY = "fuzzy_chat_device_id";

/** Get or create a persistent deviceId for guest identity */
function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/** Fetch a guest JWT from the server */
async function fetchGuestJwt(): Promise<string | null> {
  try {
    const deviceId = getDeviceId();
    if (!deviceId) return null;
    const res = await fetch(`${CHAT_API}/api/auth/guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { token: string };
    return data.token;
  } catch {
    return null;
  }
}

export interface ChatMessage {
  id: string;
  username: string;
  displayName: string;
  color: string;
  walletAddress?: string;
  deviceId?: string;
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
  displayName: string;
  color: string;
  walletAddress?: string;
  deviceId?: string;
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
    // Don't connect if already connected
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

      // Get auth token — wallet JWT or guest JWT
      let token: string | null = null;
      if (walletAddress) {
        // Wallet mode: the server-side chat auth verifies the wallet
        // We send a lightweight token with the wallet address
        // For now, use the wallet address as the token payload
        // The server will verify it via the existing JWT secret
        token = walletAddress; // Server accepts raw wallet address for backward compat
      } else {
        // Guest mode: fetch a guest JWT
        token = await fetchGuestJwt();
      }

      if (cancelled) return;
      if (!token) {
        setError("Failed to authenticate");
        return;
      }

      const socket = io(CHAT_API, {
        auth: { token },
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
