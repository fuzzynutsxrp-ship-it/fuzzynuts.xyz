import { create } from "zustand";

export type WalletProvider = "xaman" | "gemwallet" | "crossmark" | "none";

interface WalletState {
  address: string | null;
  provider: WalletProvider;
  balance: string | null;
  nutBalance: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;

  connect: (provider: WalletProvider) => Promise<void>;
  disconnect: () => void;
  setBalance: (balance: string) => void;
  setNutBalance: (nutBalance: string) => void;
  setError: (error: string | null) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  provider: "none",
  balance: null,
  nutBalance: null,
  isConnecting: false,
  isConnected: false,
  error: null,

  connect: async (provider: WalletProvider) => {
    set({ isConnecting: true, error: null });

    try {
      let address: string | null = null;

      switch (provider) {
        case "xaman": {
          // Xaman SDK integration
          const apiKey = process.env.NEXT_PUBLIC_XAMAN_API_KEY;
          if (!apiKey) {
            throw new Error("Xaman API key not configured");
          }

          // Dynamic import for client-side only
          if (typeof window !== "undefined") {
            try {
              // Dynamic import with variable to avoid webpack static analysis
              const xummModule = "xumm";
              const { Xumm } = await import(/* webpackIgnore: true */ xummModule) as { Xumm: new (key: string) => { authorize: () => Promise<void>; user?: { account?: string } } };
              const xumm = new Xumm(apiKey);
              await xumm.authorize();
              
              const account = xumm.user?.account;
              address = account || null;
            } catch {
              // Fallback: open Xaman deep link
              const signInUrl = `https://xumm.app/sign-in?apiKey=${apiKey}`;
              window.open(signInUrl, "_blank", "width=400,height=600");
              throw new Error("Please complete sign-in in the Xaman popup");
            }
          }
          break;
        }

        case "gemwallet": {
          if (typeof window !== "undefined") {
            const gem = (window as unknown as { GemWallet?: { isConnected: () => Promise<{ result: { isConnected: boolean } }>; getAddress: () => Promise<{ result: { address: string } }> } }).GemWallet;
            if (!gem) {
              window.open("https://gemwallet.app", "_blank");
              throw new Error("GemWallet extension not found. Please install it.");
            }
            const connected = await gem.isConnected();
            if (!connected?.result?.isConnected) {
              throw new Error("GemWallet is not connected");
            }
            const result = await gem.getAddress();
            address = result?.result?.address || null;
          }
          break;
        }

        case "crossmark": {
          if (typeof window !== "undefined") {
            const sdk = (window as unknown as { crossmark?: { signInAndWait: () => Promise<{ response: { data: { address: string } } }> } }).crossmark;
            if (!sdk) {
              window.open("https://crossmark.io", "_blank");
              throw new Error("Crossmark extension not found. Please install it.");
            }
            const result = await sdk.signInAndWait();
            address = result?.response?.data?.address || null;
          }
          break;
        }
      }

      if (address) {
        set({
          address,
          provider,
          isConnected: true,
          isConnecting: false,
        });

        // Persist to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("fuzzy_wallet", JSON.stringify({ address, provider }));
        }
      } else {
        throw new Error("No wallet address returned");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      set({ error: message, isConnecting: false });
    }
  },

  disconnect: () => {
    set({
      address: null,
      provider: "none",
      balance: null,
      nutBalance: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
    if (typeof window !== "undefined") {
      localStorage.removeItem("fuzzy_wallet");
    }
  },

  setBalance: (balance: string) => set({ balance }),
  setNutBalance: (nutBalance: string) => set({ nutBalance }),
  setError: (error: string | null) => set({ error }),
}));
