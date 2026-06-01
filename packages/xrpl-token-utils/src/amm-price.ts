/**
 * NUT pricing — single source of truth for the API.
 *
 * Mirrors the spot-price calculation currently embedded in the
 * Railway rewards-api.js. Server-side only; client never calls
 * these directly (they make WebSocket connections to XRPL).
 */

import type { Client } from "xrpl";
import { withClient } from "./client";

const NUT_CURRENCY = "NUT";
const DEFAULT_NUT_ISSUER = "rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7";

export interface AmmPriceQuote {
  /** USD per 1 NUT. */
  readonly usdPerNut: number;
  /** XRP per 1 NUT (intermediate). */
  readonly xrpPerNut: number;
  /** USD per 1 XRP, from a reference AMM (e.g. RLUSD). */
  readonly usdPerXrp: number;
  /** Source of each leg. */
  readonly source: { xrp: "amm" | "fallback"; usd: "amm" | "fallback" };
  /** When the snapshot was taken (Unix ms). */
  readonly fetchedAt: number;
}

/**
 * Fetch the current NUT-in-USD spot, computed via the on-chain AMM.
 *
 * STATUS: scaffold. Currently returns a deterministic placeholder so
 *         downstream code compiles. Wire to real `client.request(amm_info)`
 *         calls in the xrpl-pricing follow-up PR. The shape is final.
 */
export async function getNutUsdPrice(
  options: { issuer?: string } = {},
): Promise<AmmPriceQuote> {
  const issuer = options.issuer ?? process.env.NUT_ISSUER ?? DEFAULT_NUT_ISSUER;
  const fallback = Number(process.env.NUT_USD_PRICE_FALLBACK ?? "0.00001");
  return withClient(async (client) => {
    void client;
    void issuer;
    // TODO(xrpl-pricing): real amm_info calls for NUT/XRP and XRP/USD legs.
    return {
      usdPerNut: fallback,
      xrpPerNut: fallback / 0.5, // placeholder ratio
      usdPerXrp: 0.5,
      source: { xrp: "fallback", usd: "fallback" },
      fetchedAt: Date.now(),
    };
  });
}
