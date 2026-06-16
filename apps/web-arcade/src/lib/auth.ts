/**
 * NextAuth.js v5 (Auth.js) configuration for FuzzyNuts hybrid auth.
 *
 * Providers:
 *   1. Google — standard Web2 sign-in
 *   2. XRPL Wallet — credentials provider wrapping our existing
 *      challenge/verify flow (POST /api/auth/challenge + /api/auth/verify)
 *
 * The session strategy is JWT (no database adapter needed — we store
 * user data in our own MongoDB via the API).
 */

import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

/**
 * XRPL address validation regex (r + base58, 25-35 chars).
 * Reused from the existing auth.ts route.
 */
const XRPL_ADDR = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://fuzzynutsxyz-production.up.railway.app";

export const authConfig: NextAuthConfig = {
  // Use JWT sessions (no DB adapter — we manage users in our own MongoDB)
  session: { strategy: "jwt" },

  pages: {
    // We handle sign-in via our own modal, not a NextAuth page
    signIn: "/",
    error: "/",
  },

  providers: [
    // ── Google Provider ──
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    // ── XRPL Wallet Credentials Provider ──
    Credentials({
      name: "XRPL Wallet",
      credentials: {
        address: { label: "Wallet Address", type: "text" },
        signature: { label: "Signature", type: "text" },
        publicKey: { label: "Public Key", type: "text" },
        challengeId: { label: "Challenge ID", type: "text" },
      },
      async authorize(credentials) {
        if (
          !credentials?.address ||
          !credentials?.signature ||
          !credentials?.publicKey ||
          !credentials?.challengeId
        ) {
          return null;
        }

        const address = credentials.address as string;
        if (!XRPL_ADDR.test(address)) return null;

        try {
          // Verify via our existing Express API
          const res = await fetch(`${API_BASE}/api/auth/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address,
              signature: credentials.signature,
              publicKey: credentials.publicKey,
              challengeId: credentials.challengeId,
            }),
          });

          if (!res.ok) return null;

          // Return user object that gets embedded in the JWT
          return {
            id: address,
            name: `Player_${address.slice(1, 7)}`,
            walletAddress: address,
            provider: "xrpl",
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      // On initial sign-in, embed provider-specific data
      if (user && account) {
        token.provider = account.provider; // "google" or "credentials"
        if ("walletAddress" in user) {
          token.walletAddress = (user as { walletAddress?: string }).walletAddress;
        }
      }
      return token;
    },

    async session({ session, token }) {
      // Expose provider and wallet address to the client session
      if (session.user) {
        session.user.id = token.sub ?? "";
        (session.user as unknown as Record<string, unknown>).provider = token.provider;
        if (token.walletAddress) {
          (session.user as unknown as Record<string, unknown>).walletAddress = token.walletAddress;
        }
      }
      return session;
    },
  },

  // Trust the host in production
  trustHost: true,
};

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);
