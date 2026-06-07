/**
 * NextAuth.js type augmentation.
 * Extends the default session/user types with our custom fields.
 */

import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      provider?: string;
      walletAddress?: string;
    };
  }

  interface User {
    walletAddress?: string;
    provider?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    provider?: string;
    walletAddress?: string;
  }
}
