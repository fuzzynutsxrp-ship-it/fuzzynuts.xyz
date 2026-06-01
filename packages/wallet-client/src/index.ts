/**
 * @fuzzynuts/wallet-client — public surface.
 *
 * Migration note: provider implementations currently live in
 *   apps/web-arcade/src/lib/wallet/{xamanService,joeyAdapter}.ts
 * and are imported via the existing path. They will be moved into
 * src/providers/{xaman,joey}.ts in a follow-up PR so the live web
 * app keeps booting during the migration window.
 */

export type ProviderId = "xaman" | "joey";

export interface WalletSession {
  readonly address: string;
  readonly provider: ProviderId;
  /** Unix ms when the API-issued JWT cookie expires. */
  readonly cookieExp: number;
}

export interface WalletAdapter {
  readonly id: ProviderId;
  connect(): Promise<string>;
  disconnect(): Promise<void>;
  restore(): string | null;
}

export * from "./signin";
export * from "./session";
