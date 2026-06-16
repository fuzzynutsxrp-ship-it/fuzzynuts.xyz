# XRPL Distributor Key Setup

## Overview

The FuzzyNuts payout system uses a **distributor wallet** to send $NUT
tokens to players. For security, the master key should be disabled after
setting up regular key and signer list. This document covers the manual
on-chain steps with exact xrpl.js code.

## Architecture

```
Master Key (cold storage, NEVER online)
    │
    ├── SetRegularKey → Distributor Key (hot, used for daily payouts)
    │
    └── SignerListSet → Multi-sign quorum (backup/recovery)
```

## Pre-Flight Checklist

- [ ] Master key pair generated offline (air-gapped)
- [ ] Distributor key pair generated (separate from master)
- [ ] Master key funded with enough XRP for transactions (~20 XRP reserve)
- [ ] Tested all steps on XRPL Testnet first
- [ ] Backed up all keys in secure offline storage

## Step 1: SetRegularKey

Assign a regular key pair to the account. This key can sign transactions
without the master key.

**XRPL Docs**: https://xrpl.org/setregularkey.html

```typescript
import { Client, Wallet } from "xrpl";

const client = new Client("wss://s.altnet.rippletest.net:51233"); // testnet
await client.connect();

const master = Wallet.fromSeed("sEdMASTER_KEY_HERE"); // master secret
const distributor = Wallet.generate(); // new key pair for daily use

const tx = {
  TransactionType: "SetRegularKey",
  Account: master.address,
  RegularKey: distributor.address,
};

const prepared = await client.autofill(tx);
const signed = master.sign(prepared);
const result = await client.submitAndWait(signed.tx_blob);

console.log("SetRegularKey result:", result.result.meta.TransactionResult);
// Expected: "tesSUCCESS"

console.log("Distributor address:", distributor.address);
console.log("Distributor secret:", distributor.seed);
// SAVE THESE SECURELY — this is your hot wallet

await client.disconnect();
```

After this, the distributor key can sign Payment, TrustSet, etc.
without the master key being online.

## Step 2: SignerListSet (Optional but Recommended)

Set up a multi-signer list as a recovery mechanism. If the regular key
is compromised, you can use multi-sign to rotate it.

**XRPL Docs**: https://xrpl.org/signerlistset.html

```typescript
import { Client, Wallet } from "xrpl";

const client = new Client("wss://s.altnet.rippletest.net:51233");
await client.connect();

const master = Wallet.fromSeed("sEdMASTER_KEY_HERE");

// Generate 3 signer key pairs (store each separately)
const signer1 = Wallet.generate();
const signer2 = Wallet.generate();
const signer3 = Wallet.generate();

const tx = {
  TransactionType: "SignerListSet",
  Account: master.address,
  SignerQuorum: 2, // need 2 of 3 signatures
  SignerEntries: [
    {
      SignerEntry: {
        Account: signer1.address,
        SignerWeight: 1,
      },
    },
    {
      SignerEntry: {
        Account: signer2.address,
        SignerWeight: 1,
      },
    },
    {
      SignerEntry: {
        Account: signer3.address,
        SignerWeight: 1,
      },
    },
  ],
};

const prepared = await client.autofill(tx);
const signed = master.sign(prepared);
const result = await client.submitAndWait(signed.tx_blob);

console.log("SignerListSet result:", result.result.meta.TransactionResult);
// Expected: "tesSUCCESS"

console.log("Signer 1:", signer1.address, signer1.seed);
console.log("Signer 2:", signer2.address, signer2.seed);
console.log("Signer 3:", signer3.address, signer3.seed);
// SAVE EACH SECURELY — split custody across different locations

await client.disconnect();
```

## Step 3: asfDisableMaster (DANGER — IRREVERSIBLE)

Once disabled, the master key **cannot be re-enabled**. Only proceed if:

- [ ] Regular key is working and tested
- [ ] Signer list is configured and tested
- [ ] All keys are backed up securely
- [ ] You understand this is permanent

**XRPL Docs**: https://xrpl.org/accountset.html

```typescript
import { Client, Wallet } from "xrpl";

const client = new Client("wss://s.altnet.rippletest.net:51233");
await client.connect();

const master = Wallet.fromSeed("sEdMASTER_KEY_HERE");

const tx = {
  TransactionType: "AccountSet",
  Account: master.address,
  SetFlag: 4, // asfDisableMaster
};

const prepared = await client.autofill(tx);
const signed = master.sign(prepared);
const result = await client.submitAndWait(signed.tx_blob);

console.log("asfDisableMaster result:", result.result.meta.TransactionResult);
// Expected: "tesSUCCESS"
// WARNING: This is IRREVERSIBLE. The master key can never sign again.

await client.disconnect();
```

**WARNING**: This is irreversible on mainnet. Test extensively on testnet.

## Verification

After setup, verify the account configuration:

```typescript
import { Client } from "xrpl";

const client = new Client("wss://xrplcluster.com"); // mainnet
await client.connect();

const response = await client.request({
  command: "account_info",
  account: "YOUR_DISTRIBUTOR_ADDRESS",
  signer_lists: true,
});

console.log("Regular key:", response.result.account_data.RegularKey);
console.log("Signer list:", response.result.account_data.signer_lists);
console.log("Master disabled:", (response.result.account_flags as any)?.disableMaster);

await client.disconnect();
```

## Testnet Workflow

Always test on XRPL Testnet first:

1. Get testnet XRP: https://xrpl.org/xrp-testnet-faucet.html
2. Run Steps 1-3 against testnet (use `wss://s.altnet.rippletest.net:51233`)
3. Verify with the verification code above
4. Test a payout transaction with the regular key
5. Only then repeat on mainnet (use `wss://xrplcluster.com`)

## Key Management

| Key                   | Storage          | Access             | Purpose               |
| --------------------- | ---------------- | ------------------ | --------------------- |
| Master                | Air-gapped / HSM | Never online       | Account recovery only |
| Regular (distributor) | Railway env var  | Daily payouts      | Sign Payment txns     |
| Signer keys           | Split custody    | Multi-sig recovery | Rotate regular key    |

## References

- XRPL SetRegularKey: https://xrpl.org/setregularkey.html
- XRPL SignerListSet: https://xrpl.org/signerlistset.html
- XRPL AccountSet: https://xrpl.org/accountset.html
- XRPL Multi-Sign: https://xrpl.org/multi-signing.html
