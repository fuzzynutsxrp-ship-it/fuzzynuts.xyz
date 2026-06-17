"use client";

/**
 * useBalanceStream — XRPL WebSocket transaction listener + debounce fallback
 *
 * Subscribes to the XRPL ledger via WebSocket to get real-time balance
 * updates for the connected wallet. Falls back to polling if:
 *   - WebSocket connection fails
 *   - Browser doesn't support WebSocket (unlikely)
 *   - Connection drops after max retries
 *
 * Updates the wallet store's balance and nutBalance in real-time.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useWalletStore } from "@/store/wallet";
import { XRPL_CONFIG } from "@/lib/utils";

/* ── Types ── */

interface BalanceStreamState {
  /** XRP balance in drops, formatted to decimal */
  xrpBalance: string | null;
  /** NUT balance (trust line amount) */
  nutBalance: string | null;
  /** Whether the WebSocket is connected */
  isStreaming: boolean;
  /** Whether currently fetching via HTTP fallback */
  isPolling: boolean;
  /** Last error message */
  error: string | null;
  /** Force refresh balances */
  refresh: () => void;
}

/* ── Constants ── */

const WS_URL = XRPL_CONFIG.node;
const POLL_INTERVAL_MS = 30_000;
const RECONNECT_DELAYS = [1_000, 2_000, 5_000, 10_000, 30_000];
const DEBOUNCE_MS = 500; // Debounce rapid balance updates

/* ── HTTP Fallback ── */

async function fetchBalancesHTTP(address: string): Promise<{ xrp: string; nut: string }> {
  const wsUrl = new URL(WS_URL);
  const httpUrl = `${wsUrl.protocol === "wss:" ? "https:" : "http:"}//${wsUrl.host}`;

  // Account info for XRP
  const infoRes = await fetch(httpUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      method: "account_info",
      params: [{ account: address, ledger_index: "validated" }],
    }),
    signal: AbortSignal.timeout(8000),
  });

  const infoData = await infoRes.json();
  const drops = infoData?.result?.account_data?.Balance || "0";
  const xrp = (parseInt(drops, 10) / 1_000_000).toFixed(6);

  // Trust lines for NUT
  const linesRes = await fetch(httpUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      method: "account_lines",
      params: [
        {
          account: address,
          peer: XRPL_CONFIG.issuer,
          ledger_index: "validated",
        },
      ],
    }),
    signal: AbortSignal.timeout(8000),
  });

  const linesData = await linesRes.json();
  const nutLine = (linesData?.result?.lines || []).find(
    (line: { currency: string }) => line.currency === XRPL_CONFIG.currencyCode,
  );
  const nut = nutLine?.balance || "0";

  return { xrp, nut };
}

/* ── Hook ── */

export function useBalanceStream(): BalanceStreamState {
  const address = useWalletStore((s) => s.address);
  const storeSetBalance = useWalletStore((s) => s.setBalance);
  const storeSetNutBalance = useWalletStore((s) => s.setNutBalance);

  const [xrpBalance, setXrpBalance] = useState<string | null>(null);
  const [nutBalance, setNutBalance] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestIdRef = useRef(0);

  /* ── Debounced balance update ── */
  const updateBalances = useCallback(
    (xrp: string, nut: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        setXrpBalance(xrp);
        setNutBalance(nut);
        storeSetBalance(xrp);
        storeSetNutBalance(nut);
        setError(null);
      }, DEBOUNCE_MS);
    },
    [storeSetBalance, storeSetNutBalance],
  );

  /* ── HTTP poll fallback ── */
  const pollBalances = useCallback(async () => {
    if (!address || !mountedRef.current) return;

    try {
      setIsPolling(true);
      const { xrp, nut } = await fetchBalancesHTTP(address);
      updateBalances(xrp, nut);
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch balances");
      }
    } finally {
      if (mountedRef.current) setIsPolling(false);
    }
  }, [address, updateBalances]);

  /* ── Start polling fallback ── */
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return; // Already polling
    pollBalances();
    pollTimerRef.current = setInterval(pollBalances, POLL_INTERVAL_MS);
  }, [pollBalances]);

  /* ── Stop polling ── */
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  /* ── WebSocket cleanup ── */
  const closeWS = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  /* ── WebSocket connection ── */
  const connectWS = useCallback(() => {
    if (!address || !mountedRef.current) return;

    closeWS();

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setIsStreaming(true);
        setError(null);
        reconnectRef.current = 0;
        stopPolling();

        // Subscribe to account transactions
        const subscribeId = ++lastRequestIdRef.current;
        ws.send(
          JSON.stringify({
            id: subscribeId,
            command: "subscribe",
            accounts: [address],
          }),
        );

        // Request initial account_info
        const infoId = ++lastRequestIdRef.current;
        ws.send(
          JSON.stringify({
            id: infoId,
            command: "account_info",
            account: address,
            ledger_index: "validated",
          }),
        );

        // Request initial trust lines
        const linesId = ++lastRequestIdRef.current;
        ws.send(
          JSON.stringify({
            id: linesId,
            command: "account_lines",
            account: address,
            peer: XRPL_CONFIG.issuer,
            ledger_index: "validated",
          }),
        );
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);

          // Initial account_info response
          if (data.result?.account_data?.Balance) {
            const drops = data.result.account_data.Balance;
            const xrp = (parseInt(drops, 10) / 1_000_000).toFixed(6);
            setXrpBalance(xrp);
            storeSetBalance(xrp);
          }

          // Trust lines response
          if (data.result?.lines) {
            const nutLine = data.result.lines.find(
              (l: { currency: string }) => l.currency === XRPL_CONFIG.currencyCode,
            );
            if (nutLine) {
              setNutBalance(nutLine.balance);
              storeSetNutBalance(nutLine.balance);
            }
          }

          // Transaction stream event — re-fetch balances
          if (data.type === "transaction" && data.validated) {
            const meta = data.meta || data.metaData;
            if (meta) {
              // Extract final balance from AffectedNodes
              const finalXrp = extractXRPBalance(meta, address);
              if (finalXrp !== null) {
                const xrp = (finalXrp / 1_000_000).toFixed(6);
                setXrpBalance(xrp);
                storeSetBalance(xrp);
              }

              const finalNut = extractNUTBalance(meta, address);
              if (finalNut !== null) {
                setNutBalance(finalNut);
                storeSetNutBalance(finalNut);
              }
            }
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        closeWS();
        setError("WebSocket error — falling back to polling");
        startPolling();

        // Reconnect with backoff
        const attempt = reconnectRef.current;
        const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
        reconnectRef.current = attempt + 1;

        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) connectWS();
        }, delay);
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setIsStreaming(false);
        if (!pollTimerRef.current) {
          startPolling();
        }
      };
    } catch {
      startPolling();
    }
  }, [address, closeWS, stopPolling, startPolling, storeSetBalance, storeSetNutBalance]);

  /* ── Manual refresh ── */
  const refresh = useCallback(() => {
    pollBalances();
  }, [pollBalances]);

  /* ── Lifecycle ── */
  useEffect(() => {
    mountedRef.current = true;

    if (address) {
      connectWS();
    }

    return () => {
      mountedRef.current = false;
      closeWS();
      stopPolling();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [address, connectWS, closeWS, stopPolling]);

  /* ── Reconnect on visibility ── */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && address && !wsRef.current) {
        reconnectRef.current = 0;
        connectWS();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [address, connectWS]);

  return {
    xrpBalance,
    nutBalance,
    isStreaming,
    isPolling,
    error,
    refresh,
  };
}

/* ── Helpers: Extract balances from transaction metadata ── */

function extractXRPBalance(meta: Record<string, unknown>, address: string): number | null {
  const nodes = (meta.AffectedNodes as Array<Record<string, unknown>>) || [];
  for (const node of nodes) {
    const modified = node.ModifiedNode as Record<string, unknown> | undefined;
    if (
      modified &&
      modified.LedgerEntryType === "AccountRoot" &&
      (modified.FinalFields as Record<string, unknown>)?.Account === address
    ) {
      const balance = (modified.FinalFields as Record<string, unknown>)?.Balance;
      if (typeof balance === "string") return parseInt(balance, 10);
    }
  }
  return null;
}

function extractNUTBalance(meta: Record<string, unknown>, address: string): string | null {
  const nodes = (meta.AffectedNodes as Array<Record<string, unknown>>) || [];
  for (const node of nodes) {
    const modified = node.ModifiedNode as Record<string, unknown> | undefined;
    if (modified && modified.LedgerEntryType === "RippleState") {
      const fields = modified.FinalFields as Record<string, unknown>;
      if (!fields) continue;

      const low = fields.LowLimit as { issuer?: string } | undefined;
      const high = fields.HighLimit as { issuer?: string } | undefined;
      const isRelevant = low?.issuer === address || high?.issuer === address;

      if (isRelevant && (fields as Record<string, unknown>).Balance !== undefined) {
        const bal = fields.Balance as { value?: string } | string;
        if (typeof bal === "string") return bal;
        if (typeof bal === "object" && bal.value) return bal.value;
      }
    }
  }
  return null;
}
