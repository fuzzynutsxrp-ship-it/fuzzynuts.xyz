# 0008 — Implement Rewards Route for Payout Processing

- **Status**: proposed
- **Date**: 2026-06-12
- **Deciders**: @fuzzynutsxrp-ship-it

## Context

The security audit (2026-06-12, commit `e047305`) identified that
`apps/api/src/routes/rewards.ts` does not exist. The server bootstrap
(`server.ts:283`) has a TODO placeholder:

```
// TODO(auth-rollout): mount migrated /api/rewards, /api/scores/stream
```

This file is a protected route under HERMES.md §1.4 — it handles
money-related operations (NUT payouts to weekly leaderboard winners).
Without it, there is no API endpoint to trigger payouts, query the
leaderboard, or view payout history. ADR-0006 defines the multisig
distributor pattern, and `packages/xrpl-token-utils/src/payout.ts`
provides the transaction builder, but no route consumes them.

The `docs/explanation/xrpl-payout-design.md` document is currently a
stub and must be fleshed out alongside this route implementation.

## Decision

Create `apps/api/src/routes/rewards.ts` exporting `buildRewardsRouter()`
with three endpoints:

1. **`GET /api/rewards/leaderboard`** — Public. Returns the current
   weekly leaderboard from MongoDB `scores` collection, grouped by
   game, sorted by score descending. Paginated.

2. **`POST /api/rewards/payout`** — Admin-only. Gated by JWT +
   `ADMIN_WALLET_ADDRESS` match. Accepts `{ weekKey, recipient, amount }`.
   Calls `submitPayout()` from `@fuzzynuts/xrpl-token-utils`. Records
   the payout in a `payouts` MongoDB collection with status tracking
   (`pending` → `submitted` → `confirmed` / `failed`).

3. **`GET /api/rewards/payout-history`** — Admin-only. Returns paginated
   payout history from the `payouts` collection.

The route must be mounted in `server.ts` at `/api/rewards`, gated by
`MONGODB_URI` and `ADMIN_WALLET_ADDRESS` being present (same pattern
as the monitoring and kanban routers).

## Consequences

- Positive: Weekly NUT payouts become possible via API. Leaderboard
  is queryable by the frontend. Full audit trail of payouts in MongoDB.
- Negative: Introduces a new attack surface for fund drainage. Mitigated
  by admin-only gating, HMAC-verified sessions (TICKET-001), and the
  multisig requirement (ADR-0009).
- Follow-ups:
  - Flesh out `docs/explanation/xrpl-payout-design.md`.
  - Create `docs/runbooks/weekly-payout.md` operational runbook.
  - Frontend leaderboard component in `apps/web-arcade/`.

## Alternatives considered

- Inline payout logic in `scores.ts` — rejected. Money-handling code
  must be isolated per HERMES.md §1.4 for independent review and testing.
- Cron-only payouts (no API endpoint) — rejected. Admin needs manual
  trigger capability for edge cases and incident recovery.
