# 0010 — Persistent Challenge Store (Replace In-Memory Map)

- **Status**: accepted
- **Date**: 2026-06-12
- **Deciders**: @fuzzynutsxrp-ship-it, @Shafster

## Context

The security audit (2026-06-12, commit `e047305`) identified two
in-memory data stores that lose state on server restart:

1. **`challengeStore`** (`server.ts:96`): `Map<string, { address, challenge, exp }>`.
   Stores XRPL signature challenges issued by `/api/auth/challenge` and
   consumed by `/api/auth/game-session`. Server restart = all challenges
   lost = all users logged out.

2. **`payloadCache`** (`auth.ts:61`): `Map<string, PayloadCacheEntry>`.
   Stores Xaman (XUMM) payload UUIDs and their verified addresses.
   Server restart = pending sign-in flows lost.

Both are `Map` objects with manual TTL cleanup via `setInterval`. This
does not scale across Railway replicas (each replica has its own Map)
and creates a silent data loss scenario on deploy.

## Decision

Replace both in-memory stores with MongoDB TTL collections:

1. **`challenges` collection**: Documents `{ _id: challengeId, address, challenge, exp }`
   with a TTL index on `exp` (`expireAfterSeconds: 0` — expires at the
   time in the `exp` field). Replaces `challengeStore`.

2. **`xaman_payloads` collection**: Documents `{ _id: uuid, address, createdAt }`
   with a TTL index on `createdAt` (`expireAfterSeconds: 120`). Replaces
   `payloadCache`.

Create a shared `apps/api/src/models/challengeStore.ts` module that
exports async `getChallenge()`, `setChallenge()`, `deleteChallenge()`
functions backed by the `challenges` collection.

Update `auth.ts` to use the `xaman_payloads` collection directly
(MongoDB connection already exists in that file).

Remove the `setInterval` cleanup sweep in `auth.ts:64-71` — the TTL
index handles eviction automatically.

## Consequences

- Positive: Survives server restarts. Scales across replicas. No manual
  TTL sweep code to maintain. MongoDB already a dependency.
- Negative: Adds MongoDB dependency to the game-session flow (previously
  only auth.ts used Mongo). Slightly higher latency for challenge
  operations (~2-5ms vs <1ms for in-memory Map).
- Neutral: The `challengeStore` type signature changes from sync Map
  to async MongoDB operations — all callers must `await`.

## Alternatives considered

- Redis — adds a new infrastructure dependency. MongoDB is already
  deployed and used by auth, scores, and monitoring routes.
- Keep Map + shared state via sticky sessions — rejected. Fragile,
  breaks on replica scaling, does not survive restarts.
- SQLite in-container — rejected. Ephemeral container storage on
  Railway means the DB file is lost on redeploy anyway.
