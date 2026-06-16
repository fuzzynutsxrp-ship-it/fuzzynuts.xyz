---
title: Enable multisig on the NUT distributor account
diataxis: how-to
audience: operator
prerequisites:
  - Distributor seed access (offline, ledger-signed only)
  - Three signer wallets generated, addresses recorded
risk: high
last_verified: 2026-05-31
---

# Enable multisig on the NUT distributor account

Use this when **turning the distributor into a 2-of-3 signed account**
so a single leaked seed cannot drain the Community Nut Jar. Tracking
ADR: [0006](../../adr/0006-xrpl-regularkey-multisig-distributor.md).

## Steps

1. Confirm the distributor has +5 XRP headroom for the SignerList
   reserve.
2. Generate three signer wallets offline:

   ```bash
   pnpm --filter @fuzzynuts/xrpl-token-utils exec tsx -e \
     "import { Wallet } from 'xrpl'; console.log(JSON.stringify(Wallet.generate(), null, 2))"
   ```

   Record each address; **store each seed in a different password
   manager owned by a different person**. Never co-locate.

3. Construct the `SignerListSet` transaction (see
   `packages/xrpl-token-utils/src/payout.ts` — multisig path).
4. Sign offline with the master seed.
5. Submit via `xrpl.Client.submitAndWait`.
6. Verify the SignerEntries on XRPScan.
7. After two clean weekly payouts using the multisig path, run
   `AccountSet asfDisableMaster` to retire the master key permanently.

## Rollback

You cannot rollback once `asfDisableMaster` is set without all signer
seeds. Do not run step 7 until you have demonstrated quorum signing
works twice end-to-end.
