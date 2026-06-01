# Security Policy

## Reporting a vulnerability
**Do not open a public Issue or Discussion.**

Email **security@fuzzynuts.xyz** with:
- A description of the issue.
- Steps to reproduce.
- Impact assessment (best-effort).
- Your name / handle for credit (optional).

We acknowledge within **48 hours** and target a fix or mitigation within
**14 days** for critical issues. We coordinate disclosure with you and
publish an advisory on the GitHub Security tab once the fix is deployed.

## Supported versions
Only `main` and the currently deployed Vercel/Railway revisions receive
security fixes. There are no LTS branches.

## Areas of particular concern
- **Wallet authentication** (`packages/wallet-client`, `apps/api/src/middleware/walletAuth.ts`)
- **Score integrity** (`packages/shared-anticheat`, `apps/api/src/routes/scores.ts`)
- **Payout path** (`apps/api/src/routes/rewards.ts`, `packages/xrpl-token-utils/src/payout.ts`)
- **Hot-wallet seed handling** (env-only; see hardening plan below)

## Hot-wallet hardening plan
The distributor account holds Community Nut Jar funds. We are migrating to:
1. A `RegularKey` rotated quarterly so the master key can be retired offline.
2. A `SignerList` (2-of-3 multisig) across geographically-separated signers.
3. KMS-sealed secrets at the Railway boundary; no plaintext seed in env.

Tracking ADR: [docs/adr/0006-xrpl-regularkey-multisig-distributor.md](./docs/adr/0006-xrpl-regularkey-multisig-distributor.md).

## Out of scope
- Reports against third-party game assets (file an issue with the upstream).
- Self-XSS in browser DevTools.
- Missing security headers on documentation subdomains.

## Safe harbour
Good-faith research conducted in line with this policy will not result in
legal action. Do not exfiltrate user data, do not test on production wallets
other than your own, do not perform DoS testing against production.
