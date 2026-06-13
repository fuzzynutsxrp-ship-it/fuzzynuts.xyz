/**
 * NUT payout builder — multisig-aware.
 *
 * Builds a Payment transaction from the distributor to a winner. If
 * the distributor account has a SignerList configured, this returns
 * an UNSIGNED transaction for off-chain quorum signing; if not, it
 * single-signs with the master/regular key in the env (LEGACY path).
 *
 * The single-sig path emits a console.warn so the audit trail makes
 * it obvious whenever the multisig migration hasn't completed for a
 * given environment.
 */

import type { Payment, SubmitResponse } from "xrpl";
import { Wallet } from "xrpl";
import { withClient } from "./client";

const NUT_CURRENCY = "NUT";

export interface PayoutArgs {
  readonly distributor: string;
  readonly destination: string;
  readonly nutAmount: number;
  readonly issuer: string;
  /** Optional memo (e.g. "Week 2026-W22 — 1st place"). */
  readonly memo?: string;
}

export interface PayoutSeeds {
  /** Single-sig path: the distributor's seed (master or regular key). */
  readonly distributorSeed?: string;
  /** Multisig path: seeds for at least quorum signers. */
  readonly signerSeeds?: readonly string[];
}

export function buildPayment(args: PayoutArgs): Payment {
  return {
    TransactionType: "Payment",
    Account: args.distributor,
    Destination: args.destination,
    Amount: {
      currency: NUT_CURRENCY,
      issuer: args.issuer,
      value: String(args.nutAmount),
    },
    Memos: args.memo
      ? [
          {
            Memo: {
              MemoData: Buffer.from(args.memo, "utf8").toString("hex").toUpperCase(),
              MemoType: Buffer.from("fuzzynuts/payout", "utf8").toString("hex").toUpperCase(),
            },
          },
        ]
      : undefined,
  };
}

/**
 * Submit a payout. Picks the multisig path if signerSeeds is provided
 * (≥ quorum), otherwise falls back to single-sig with a console.warn.
 *
 * STATUS: scaffold. The real multisig autofill loop is wired in the
 *         xrpl-multisig-rollout follow-up PR — until then this function
 *         REFUSES to run in production unless ALLOW_SINGLE_SIG_PAYOUT
 *         is explicitly set.
 */
export async function submitPayout(args: PayoutArgs, seeds: PayoutSeeds): Promise<SubmitResponse> {
  const payment = buildPayment(args);

  if (seeds.signerSeeds && seeds.signerSeeds.length >= 2) {
    // TODO(xrpl-multisig-rollout): autofill, sign with each signer via
    //  Wallet.fromSeed(seed).sign(payment, true), multisign and submit.
    throw new Error("submitPayout: multisig path not yet implemented");
  }

  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SINGLE_SIG_PAYOUT !== "true") {
    throw new Error(
      "submitPayout: single-sig is disabled in production. Provide signerSeeds (quorum) or set ALLOW_SINGLE_SIG_PAYOUT=true (audit trail).",
    );
  }

  if (!seeds.distributorSeed) {
    throw new Error("submitPayout: distributorSeed required for single-sig path");
  }

  // eslint-disable-next-line no-console
  console.warn(
    `[xrpl-token-utils] single-sig payout — switch to SignerList ASAP (distributor=${args.distributor})`,
  );

  return withClient(async (client) => {
    const wallet = Wallet.fromSeed(seeds.distributorSeed!);
    const prepared = await client.autofill(payment);
    const signed = wallet.sign(prepared);
    return client.submitAndWait(signed.tx_blob) as unknown as Promise<SubmitResponse>;
  });
}
