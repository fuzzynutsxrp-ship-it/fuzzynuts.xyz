# 0003 — Two-tier auth: session HMAC + Xumm SignIn for payouts

- **Status**: accepted
- **Date**: 2026-05-31
- **Deciders**: @fuzzynutsxrp-ship-it

## Context

Pre-migration the wallet "session" was a base64-encoded JSON cookie.
Any client could forge `{ address: "r...", provider: "xaman" }` and
pass the middleware. Score submissions carried no integrity proof —
the canonical `nonce`, `hash`, and `signature` fields were optional
in the zod schema and the deployed `fuzzy-score.js` did not compute
them. Cap + duration was the only gate.

This was acceptable when leaderboards were vanity. The introduction
of real $NUT weekly payouts (audit red flag #6) makes it unacceptable.

## Decision

Adopt a two-tier auth model:

1. **Session HMAC (every submission).** `POST /api/session` mints a
   short-lived HMAC token bound to `{game, wallet?, weekKey, exp, secret, jti}`.
   The game iframe HMACs each score with the session secret. The API
   rejects submissions whose HMAC does not match.
2. **Xumm SignIn (payout-band only).** Scores in the top-N for the
   week are marked `pending_verify` and require a Xumm SignIn payload
   verified via `xrpl.verify` from xrpl.js before promotion to the
   leaderboard.

Implementation lives in `@fuzzynuts/shared-anticheat` and `@fuzzynuts/wallet-client`,
consumed by `apps/api` and the games-build pipeline.

## Consequences

- Positive: spoofed scores become cryptographically impossible without
  the per-session secret. Payout-band non-repudiation without per-game
  Xumm prompts for casual players.
- Negative: new failure modes for the API to surface
  (`E_HMAC`, `E_REPLAY`, `E_PENDING_VERIFY`).
- Follow-ups: implement Mongo TTL replay store for `jti`; wire the
  SignIn payload UI in the web-arcade; document for players.

## Alternatives considered

- Per-submission Xumm signature — hostile UX; rejected.
- Server-trusted score with no signature — what we had; rejected.
- Wallet-side signing of every score via `xumm.payload.create` — too
  many round-trips, too many push notifications per session.
