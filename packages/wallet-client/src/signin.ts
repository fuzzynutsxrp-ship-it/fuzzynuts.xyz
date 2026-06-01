/**
 * SignIn flow — request nonce → ask wallet to sign → POST proof to API.
 *
 * The API verifies via xrpl.verify in @fuzzynuts/xrpl-token-utils and,
 * on success, sets a signed JWT cookie. This module just orchestrates
 * the dance from the browser.
 *
 * The Xumm SignIn payload uuid path lives in providers/xaman.ts and
 * is wired in a follow-up PR.
 */

export interface ChallengeResponse {
  /** Random message the wallet will sign — includes nonce + domain + expiry. */
  readonly challenge: string;
  /** Server-side challenge id; round-tripped to /api/auth/verify. */
  readonly challengeId: string;
  /** Unix ms; challenge becomes invalid after this. */
  readonly exp: number;
}

export interface VerifyRequest {
  readonly challengeId: string;
  readonly address: string;
  readonly signature: string;
  readonly publicKey: string;
}

export interface VerifyResponse {
  readonly ok: true;
  readonly address: string;
  readonly cookieExp: number;
}

const DEFAULT_BASE = "https://world.fuzzynuts.xyz";

export async function requestChallenge(
  address: string,
  baseUrl: string = DEFAULT_BASE,
): Promise<ChallengeResponse> {
  const res = await fetch(`${baseUrl}/api/auth/challenge`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!res.ok) throw new Error(`challenge failed: ${res.status}`);
  return (await res.json()) as ChallengeResponse;
}

export async function submitVerification(
  req: VerifyRequest,
  baseUrl: string = DEFAULT_BASE,
): Promise<VerifyResponse> {
  const res = await fetch(`${baseUrl}/api/auth/verify`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`verify failed: ${res.status}`);
  return (await res.json()) as VerifyResponse;
}
