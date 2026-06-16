---
title: Why a two-tier auth model
diataxis: explanation
last_verified: 2026-05-31
---

# Why a two-tier auth model

The arcade has two very different security needs that collapse badly
into a single mechanism.

**Need A — reject spoofed scores.** Almost every submission is
low-stakes (under the payout band). What matters is that an attacker
with `curl` cannot manufacture a leaderboard entry under someone
else's wallet.

**Need B — reject spoofed payouts.** A small number of submissions
land in the top-N and qualify for real $NUT. What matters here is
non-repudiation: the wallet holder actually authorised it.

Solving both with the same wallet signature would force every player
to sign a Xumm prompt every game-over — brutal UX for what is mostly
a fun arcade. Solving both with the same HMAC would leave payouts
open to forgery from any device that ever held the session secret.

## Tier 1 — session token + HMAC (every submission)

- `POST /api/session` mints a short-lived HMAC token bound to
  `{wallet?, game, weekKey, expiry, perSessionSecret}` and a `jti`
  for single-use replay enforcement.
- The game iframe submits each score with an HMAC of
  `(game|score|duration|nonce|wallet|weekKey)` signed with that
  per-session secret.
- The API rejects submissions whose HMAC does not match.

This eliminates the "any HTTP client can spoof a score" class of
attack without ever prompting the player.

## Tier 2 — Xumm SignIn (payout-eligible scores only)

- If a submission lands in the top-N for the week, it is marked
  `pending_verify` and excluded from the leaderboard.
- The web app prompts the player for a Xumm SignIn payload.
- The API verifies the payload via `xrpl.verify` in
  `@fuzzynuts/xrpl-token-utils`. Only on success is the score
  promoted to the leaderboard.

This gives non-repudiation exactly where it matters and nowhere else.

## What this does _not_ defend against

- A compromised player device that runs the real client honestly but
  is being remote-controlled. HMAC + SignIn both succeed because the
  attacker holds the same secrets the player does. Mitigations: rate
  limits per wallet, cap on weekly winnings, manual review of
  statistical outliers.
- Collusion within the top-N (multiple wallets controlled by one
  person). Mitigation: leaderboard sybil heuristics (separate concern).
