/**
 * ═══════════════════════════════════════════════════════════════
 *  score-submitter — bundled into every game by the games-build
 *  pipeline. Replaces public/games/fuzzy-score.js (which had a
 *  divergent SCORE_CAPS and a slug typo).
 *
 *  Inputs from arcade-core, signs with shared-anticheat. No
 *  hand-maintained constant lists.
 * ═══════════════════════════════════════════════════════════════
 */

import {
  getScoreCap,
  getWeekKey,
  normalizeSlug,
  type GameSlug,
} from "@fuzzynuts/arcade-core";
import {
  buildScoreMessage,
  mintNonce,
  signPayload,
} from "@fuzzynuts/shared-anticheat";

const STORAGE_KEY = "fuzzy_arcade_scores";
const WALLET_KEY = "fuzzy_wallet";
const DEFAULT_API_BASE = "https://world.fuzzynuts.xyz";

export interface SubmitOptions {
  apiBase?: string;
}

export interface SessionTokenResponse {
  token: string;
  secret: string;
  exp: number;
  jti: string;
}

/** Game start: fetch a per-session token + secret from the API. */
export async function startSession(
  rawGameId: string,
  wallet: string | null,
  opts: SubmitOptions = {},
): Promise<SessionTokenResponse> {
  const slug = normalizeSlug(rawGameId);
  if (!slug) throw new Error(`startSession: unknown game id "${rawGameId}"`);
  const res = await fetch(`${opts.apiBase ?? DEFAULT_API_BASE}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game: slug, wallet: wallet ?? undefined }),
  });
  if (!res.ok) throw new Error(`startSession: ${res.status}`);
  return (await res.json()) as SessionTokenResponse;
}

/** Game over: validate, sign with the session secret, and POST. */
export async function submitScore(
  rawGameId: string,
  rawScore: number,
  durationSeconds: number,
  session: SessionTokenResponse,
  walletAddress: string | null,
  opts: SubmitOptions = {},
): Promise<{ accepted: boolean; reason?: string }> {
  const slug = normalizeSlug(rawGameId);
  if (!slug) return { accepted: false, reason: "unknown-game" };

  const cap = getScoreCap(slug);
  if (rawScore <= 0 || rawScore > cap) return { accepted: false, reason: "cap" };
  if (durationSeconds < 5) return { accepted: false, reason: "too-short" };

  const weekKey = getWeekKey().value;
  const nonce = mintNonce();
  const wallet = walletAddress ?? "";

  const hash = await signPayload(
    buildScoreMessage({
      game: slug,
      score: rawScore,
      duration: Math.floor(durationSeconds),
      nonce,
      wallet,
      weekKey,
    }),
    session.secret,
  );

  // Local-first persistence — survives offline / API outages.
  persistLocal({ slug, score: rawScore, weekKey, wallet, ts: Date.now() });

  const body = wallet
    ? {
        kind: "scored" as const,
        game: slug,
        score: rawScore,
        duration: Math.floor(durationSeconds),
        timestamp: Date.now(),
        weekKey,
        wallet,
        nonce,
        hash,
        sessionToken: session.token,
      }
    : {
        kind: "guest" as const,
        game: slug,
        score: rawScore,
        duration: Math.floor(durationSeconds),
        timestamp: Date.now(),
        weekKey,
      };

  try {
    const res = await fetch(`${opts.apiBase ?? DEFAULT_API_BASE}/api/scores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(body),
    });
    return { accepted: res.ok, reason: res.ok ? undefined : `http-${res.status}` };
  } catch (e) {
    return { accepted: false, reason: "network" };
  }
}

function persistLocal(entry: {
  slug: GameSlug;
  score: number;
  weekKey: string;
  wallet: string;
  ts: number;
}): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown[]) : [];
    arr.push(entry);
    if (arr.length > 100) arr.splice(0, arr.length - 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    /* localStorage may be disabled (Safari private, third-party iframe) */
  }
}

export function getWalletAddress(): string | null {
  try {
    const raw = localStorage.getItem(WALLET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { address?: string };
    return parsed?.address ?? null;
  } catch {
    return null;
  }
}
