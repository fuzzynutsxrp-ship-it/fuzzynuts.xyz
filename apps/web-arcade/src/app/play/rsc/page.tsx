/**
 * ═══════════════════════════════════════════════════════════════
 *  /play/rsc — RuneScape Classic (Open-RSC) game page
 *
 *  Encoding contract for wallet signing:
 *    - API issues challenge via formatGameChallenge() → plain UTF-8 string
 *    - Wallet SDK signs this exact string (raw UTF-8 bytes)
 *    - Pass the raw UTF-8 challenge to Xumm/Joey sign request
 *    - Backend verifies via verifyKeypairSignature after hex-encoding
 *
 *  Flow:
 *    1. Player connects XRP wallet (Xaman/Joey/GemWallet/Crossmark)
 *    2. Calls POST /api/auth/game-session to mint session token
 *    3. Downloads Open_RSC_Client.jar
 *    4. Client connects to game.fuzzynuts.xyz:43594
 * ═══════════════════════════════════════════════════════════════
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { useWalletStore } from "@/store/wallet";
import type { GameSessionToken } from "@fuzzynuts/arcade-core";

/** Base URL for the API. Reads from env or defaults to production. */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://world.fuzzynuts.xyz";

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
      // Default to Xaman (most popular). User can switch via the main site wallet picker.
      await connect("xaman");

      // After connect(), the store updates `address` synchronously
      const addr = useWalletStore.getState().address;
      if (!addr) {
        throw new Error("Wallet connection was cancelled or failed.");
      }

      // Now request game session
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
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-white">
        RuneScape Classic
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Powered by Open-RSC &middot; Connect your XRP wallet to play
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
        {/* Server Provisioning — shown when API returns 503/501 */}
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
            <div className="space-y-3 animate-pulse">
              <div className="h-10 rounded-lg bg-zinc-800/50" />
              <div className="h-4 w-3/4 rounded bg-zinc-800/30" />
              <div className="h-4 w-1/2 rounded bg-zinc-800/30" />
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

        {/* Success — Download Card */}
        {state === "ready" && sessionToken && (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
              <p className="text-sm text-green-400">
                Wallet verified: {sessionToken.walletAddress.slice(0, 8)}...
                {sessionToken.walletAddress.slice(-6)}
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6">
              <h2 className="font-display text-xl font-semibold text-white">
                Download &amp; Play
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Download the game client and connect to the FuzzyNuts RSC
                server.
              </p>

              <a
                href="/games/rsc/Open_RSC_Client.jar"
                download
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-pink-600 px-5 py-2.5 font-display font-semibold text-white transition hover:bg-pink-500"
              >
                Download Open_RSC_Client.jar
              </a>

              <div className="mt-4 rounded border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-500">
                <p>Server: {sessionToken.gameServerEndpoint}</p>
                <p>
                  Session expires:{" "}
                  {new Date(sessionToken.expiresAt).toLocaleTimeString()}
                </p>
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-300">
                  Client won&apos;t launch? Manual setup
                </summary>
                <div className="mt-2 space-y-1 rounded border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-500">
                  <p>1. Install Java 8+ on your machine</p>
                  <p>2. Run: java -jar Open_RSC_Client.jar</p>
                  <p>
                    3. If it can&apos;t find the server, edit{" "}
                    <code className="text-pink-400">ip.txt</code> to{" "}
                    <code className="text-pink-400">fuzzynuts.xyz</code>
                  </p>
                  <p>
                    4. Edit <code className="text-pink-400">port.txt</code> to{" "}
                    <code className="text-pink-400">43594</code>
                  </p>
                </div>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
