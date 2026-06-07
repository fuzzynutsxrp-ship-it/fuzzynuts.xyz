"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

/**
 * Wraps the app in NextAuth's SessionProvider so `useSession()` works
 * in any client component.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
