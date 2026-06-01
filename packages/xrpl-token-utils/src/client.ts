/**
 * XRPL client factory — keyed by XRPL_NETWORK env.
 * Single place to switch between mainnet and altnet (testnet).
 */

import { Client } from "xrpl";

export type XrplNetwork = "mainnet" | "altnet";

const ENDPOINTS: Record<XrplNetwork, string> = {
  mainnet: "wss://xrplcluster.com",
  altnet: "wss://s.altnet.rippletest.net:51233",
};

export function getNetwork(): XrplNetwork {
  const raw = (process.env.XRPL_NETWORK ?? "mainnet").toLowerCase();
  return raw === "altnet" || raw === "testnet" ? "altnet" : "mainnet";
}

export async function getXrplClient(network: XrplNetwork = getNetwork()): Promise<Client> {
  const endpoint = process.env.XRPL_NODE ?? ENDPOINTS[network];
  const client = new Client(endpoint);
  await client.connect();
  return client;
}

export async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = await getXrplClient();
  try {
    return await fn(client);
  } finally {
    await client.disconnect().catch(() => {});
  }
}
