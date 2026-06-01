# 0006 — XRPL RegularKey + SignerList on the NUT distributor

- **Status**: accepted (on-chain rollout pending)
- **Date**: 2026-05-31
- **Deciders**: @fuzzynutsxrp-ship-it

## Context

The Community Nut Jar is held in a single XRPL account whose master
seed lives in plaintext as a Railway environment variable
(`COMMUNITY_NUT_JAR_SEED`). A Railway breach, a leaked log line, or
a malicious npm dependency in the Express app drains the jar.
The XRPL natively supports `RegularKey` rotation and `SignerList`
multisig — not using them is the highest-blast-radius gap surfaced
by the audit.

## Decision

Three-step on-chain rollout:

1. **Set a RegularKey.** Move the day-to-day signing key out of the
   master seed. Master seed goes to cold storage. Rotate the RegularKey
   quarterly.
2. **Configure a SignerList (2-of-3).** Three signers across three
   geographically-separated maintainers. Daily payouts require quorum.
3. **`AccountSet asfDisableMaster`.** After two clean weekly payouts
   on the multisig path, retire the master seed cryptographically.

`@fuzzynuts/xrpl-token-utils/src/payout.ts` is multisig-aware and
refuses single-sig submissions in `NODE_ENV=production` unless
`ALLOW_SINGLE_SIG_PAYOUT=true` is explicitly set.

## Consequences

- Positive: no single point of compromise. A leaked Railway env can no
  longer drain the jar after step 2; cannot drain it at all after step 3.
- Negative: weekly payouts require coordination among signers;
  on-call rotation required.
- Follow-ups:
  - Operational runbook: `docs/runbooks/weekly-snapshot.md`.
  - Incident runbook: `docs/runbooks/leaked-distributor-seed.md`.
  - How-to: `docs/how-to/xrpl/enable-multisig-on-the-distributor.md`.

## Alternatives considered

- KMS-sealed master seed (HashiCorp Vault, AWS KMS) — improves
  secret-at-rest, does nothing for an attacker with API access. Use
  as **defence in depth** alongside multisig, not instead.
- Off-chain multisig (e.g., Threshold ECDSA) — wrong primitive for
  XRPL, adds infrastructure dependence, gives up first-class on-chain
  enforcement.
