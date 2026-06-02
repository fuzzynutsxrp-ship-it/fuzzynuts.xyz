/**
 * ═══════════════════════════════════════════════════════════════
 *  /play/rsc — RuneScape Classic (Open-RSC) game page
 *
 *  Flow:
 *    1. Player connects XRP wallet (Xaman/Joey/GemWallet/Crossmark)
 *    2. Calls POST /api/auth/game-session to mint session token
 *    3. Embeds browser-based RSC client (TeaVM) in iframe
 *    4. Client connects to game.fuzzynuts.xyz via WebSocket
 * ═══════════════════════════════════════════════════════════════
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { useWalletStore } from "@/store/wallet";
import type { GameSessionToken } from "@fuzzynuts/arcade-core";

/** Base URL for the API. Reads from env or defaults to production. */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://fuzzynutsxyz-production.up.railway.app";

/** Web client URL — TeaVM RSC client hosted on the game VPS */
const RSC_CLIENT_BASE = "http://game.fuzzynuts.xyz";

/** RSA parameters for the FuzzyNuts Open-RSC server */
const RSA_EXPONENT = "65537";
const RSA_MODULUS = "8289659822450956547091737980685999494469917119448636848399591851485736573017442330778779185880707301889402408746652224912191720358420083485471439352872909";

/** Build the web client URL with server connection params */
function buildClientUrl(): string {
  return `${RSC_CLIENT_BASE}/#members,game.fuzzynuts.xyz,43494,${RSA_EXPONENT},${RSA_MODULUS},true`;
}

type ConnectionState =
  | "idle"
  | "connecting"
  | "session-request"
  | "ready"
  | "provisioning"
  | "error";

export default function RscPlayPage() {
  const [state, setState] = useState<ConnectionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<GameSessionToken | null>(
    null,
  );

  const {
    address,
    isConnected,
    isConnecting,
    connect,
    error: walletError,
  } = useWalletStore();

  // Clear wallet errors when they appear
  useEffect(() => {
    if (walletError) setError(walletError);
  }, [walletError]);

  const handleConnectWallet = useCallback(async () => {
    setError(null);

    // If already connected, skip wallet and go straight to session
    if (isConnected && address) {
      setState("session-request");
      try {
        const sessionRes = await fetch(`${API_BASE}/api/auth/game-session`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: address,
            signature: "placeholder",
            publicKey: "placeholder",
            nonce: "placeholder",
            challengeId: "placeholder",
          }),
        });

        if (sessionRes.status === 503 || sessionRes.status === 501) {
          setState("provisioning");
          return;
        }

        if (!sessionRes.ok) {
          const body = await sessionRes.json().catch(() => ({}));
          throw new Error(
            body.error ?? `Game session request failed: ${sessionRes.status}`,
          );
        }

        const { token } = (await sessionRes.json()) as {
          token: GameSessionToken;
        };
        setSessionToken(token);
        setState("ready");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setState("error");
      }
      return;
    }

    // Not connected — trigger wallet connect
    setState("connecting");
    try {
      await connect("xaman");

      const addr = useWalletStore.getState().address;
      if (!addr) {
        throw new Error("Wallet connection was cancelled or failed.");
      }

      setState("session-request");

      const sessionRes = await fetch(`${API_BASE}/api/auth/game-session`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: addr,
          signature: "placeholder",
          publicKey: "placeholder",
          nonce: "placeholder",
          challengeId: "placeholder",
        }),
      });

      if (sessionRes.status === 503 || sessionRes.status === 501) {
        setState("provisioning");
        return;
      }

      if (!sessionRes.ok) {
        const body = await sessionRes.json().catch(() => ({}));
        throw new Error(
          body.error ?? `Game session request failed: ${sessionRes.status}`,
        );
      }

      const { token } = (await sessionRes.json()) as {
        token: GameSessionToken;
      };
      setSessionToken(token);
      setState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  }, [isConnected, address, connect]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-white">
        RuneScape Classic
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Powered by Open-RSC &middot; Play in your browser — no downloads needed
      </p>

      {/* Already connected indicator */}
      {isConnected && address && state === "idle" && (
        <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
          <p className="text-sm text-green-400">
            Wallet connected: {address.slice(0, 8)}...{address.slice(-6)}
          </p>
        </div>
      )}

      <div className="mt-8 space-y-6">
        {/* Server Provisioning */}
        {state === "provisioning" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <p className="text-sm font-medium text-amber-400">
                Server Provisioning
              </p>
              <p className="mt-1 text-sm text-amber-300/70">
                The game server is being set up. This usually takes about 15
                minutes after deployment. Come back soon — your wallet
                connection will work once the server is ready.
              </p>
            </div>
          </div>
        )}

        {/* Wallet Connection */}
        {state === "idle" && (
          <button
            onClick={handleConnectWallet}
            className="w-full rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 px-6 py-3 font-display text-lg font-semibold text-white transition hover:from-pink-500 hover:to-purple-500"
          >
            {isConnected ? "Play RuneScape Classic" : "Connect XRP Wallet"}
          </button>
        )}

        {/* Loading States */}
        {(state === "connecting" || state === "session-request") && (
          <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
            <span className="text-sm text-zinc-300">
              {state === "connecting" && "Connecting wallet..."}
              {state === "session-request" && "Creating game session..."}
            </span>
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={handleConnectWallet}
              className="mt-2 text-sm text-pink-400 underline hover:text-pink-300"
            >
              Try again
            </button>
          </div>
        )}

        {/* Success — Embedded Game Client */}
        {state === "ready" && sessionToken && (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
              <p className="text-sm text-green-400">
                Wallet verified: {sessionToken.walletAddress.slice(0, 8)}...
                {sessionToken.walletAddress.slice(-6)} &middot; Playing as guest
              </p>
            </div>

            {/* Game Client iframe */}
            <div className="relative rounded-lg border border-zinc-800 overflow-hidden bg-black">
              <iframe
                src={buildClientUrl()}
                title="RuneScape Classic — FuzzyNuts"
                className="w-full border-0"
                style={{ height: "75vh", minHeight: "500px" }}
                allow="autoplay; fullscreen"
              />
            </div>

            <div className="rounded border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-500">
              <p>Server: {sessionToken.gameServerEndpoint}</p>
              <p>
                Session expires:{" "}
                {new Date(sessionToken.expiresAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
