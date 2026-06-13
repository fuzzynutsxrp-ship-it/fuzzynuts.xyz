# 0009 — Multisig Payout Implementation in xrpl-token-utils

- **Status**: proposed
- **Date**: 2026-06-12
- **Deciders**: @fuzzynutsxrp-ship-it

## Context

The security audit (2026-06-12, commit `e047305`) identified that
`packages/xrpl-token-utils/src/payout.ts` line 77 throws on the
multisig code path:

```typescript
throw new Error("submitPayout: multisig path not yet implemented");
```

The function signature accepts `signerSeeds` and correctly routes to
the multisig branch when `signerSeeds.length >= 2`, but the branch
body is a TODO. The single-sig fallback works but is gated behind
`ALLOW_SINGLE_SIG_PAYOUT=true` in production (line 80), which is
explicitly flagged as a temporary measure.

ADR-0006 defines the 3-step on-chain rollout (RegularKey → SignerList
→ DisableMaster), but the code path that would USE the SignerList
does not exist yet.

## Decision

Implement the multisig autofill-sign-submit loop in `submitPayout()`:

1. Validate `signerSeeds.length >= quorum` (currently hardcoded to 2).
2. Call `client.autofill(payment)` to set Fee, Sequence, LastLedgerSequence.
3. For each seed in `signerSeeds`: `Wallet.fromSeed(seed).sign(payment, true)`
   (the `true` flag = multisign mode, produces a `Signer` object instead
   of a full `tx_blob`).
4. Combine signatures via `client.multisign(signedPayments)`.
5. Submit via `client.submitAndWait(multisigned.tx_blob)`.
6. Return the `SubmitResponse`.

The single-sig path remains as a fallback for development/staging,
gated behind `ALLOW_SINGLE_SIG_PAYOUT=true`.

## Consequences

- Positive: Real multisig payouts become possible. No single seed can
  drain the distributor. Aligns with ADR-0006 security model.
- Negative: Weekly payouts require signer coordination. Adds complexity
  to the payout flow. Signer seeds must be distributed securely.
- Prerequisites (operational):
  - On-chain SignerList configured on the NUT distributor (ADR-0006 step 2).
  - At least 2 signer seeds available as env vars in Railway.
- Follow-ups:
  - `docs/how-to/xrpl/enable-multisig-on-the-distributor.md` (ADR-0006).
  - `docs/runbooks/weekly-snapshot.md` operational runbook.
  - Quorum validation should read from on-chain SignerList, not be hardcoded.

## Alternatives considered

- Keep single-sig with KMS — rejected as sole protection. KMS improves
  secret-at-rest but does nothing against an attacker with API access.
  Multisig is the correct primitive for XRPL fund protection.
- Off-chain threshold signing — rejected. XRPL natively supports
  multisig; off-chain solutions add infrastructure dependence and
  give up on-chain enforcement.
