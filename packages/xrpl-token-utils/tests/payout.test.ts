import { describe, it, expect } from "vitest";
import { buildPayment, submitPayout } from "../src/payout";

const args = {
  distributor: "rEAg6fmrKyCFahqY4KNfbFx4BN2KjR4BZh",
  destination: "rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7",
  nutAmount: 250_000,
  issuer: "rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7",
  memo: "test",
};

describe("buildPayment", () => {
  it("produces a well-formed Payment for an issued currency", () => {
    const tx = buildPayment(args);
    expect(tx.TransactionType).toBe("Payment");
    expect(tx.Account).toBe(args.distributor);
    expect(tx.Destination).toBe(args.destination);
    expect(tx.Amount).toMatchObject({
      currency: "NUT",
      issuer: args.issuer,
      value: "250000",
    });
    expect(tx.Memos?.[0]?.Memo?.MemoData).toBeDefined();
  });
});

describe("submitPayout — safety rails", () => {
  it("refuses single-sig in production by default", async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_SINGLE_SIG_PAYOUT;
    await expect(submitPayout(args, { distributorSeed: "sEdT..." })).rejects.toThrow(
      /single-sig is disabled in production/,
    );
    process.env.NODE_ENV = prev;
  });

  it("rejects missing distributorSeed on single-sig path", async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    await expect(submitPayout(args, {})).rejects.toThrow(/distributorSeed required/);
    process.env.NODE_ENV = prev;
  });

  it("rejects unimplemented multisig path with a clear message", async () => {
    await expect(
      submitPayout(args, { signerSeeds: ["sEdT...", "sEdU..."] }),
    ).rejects.toThrow(/multisig path not yet implemented/);
  });
});
