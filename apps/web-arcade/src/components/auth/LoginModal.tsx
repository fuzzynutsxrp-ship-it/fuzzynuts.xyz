"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, LogIn, Loader2 } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useWalletStore } from "@/store/wallet";
import { trackSignIn } from "@/lib/analytics";

/**
 * Unified Login Modal — Web2-first with Web3 secondary.
 *
 * PRIMARY:   "Sign in with Google" (standard branding)
 * SECONDARY: "Connect XRPL Wallet" (crypto-native)
 *
 * Renders as an overlay. Triggered from Navbar.
 */

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export function LoginModal({ open, onClose }: LoginModalProps) {
  const { data: session } = useSession();
  const { isConnected, connect, isConnecting } = useWalletStore();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = useCallback(async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      trackSignIn("google");
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setError("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  }, []);

  const handleWalletConnect = useCallback(
    async (provider: "xaman" | "joey") => {
      setError(null);
      try {
        trackSignIn("wallet");
        await connect(provider);
        onClose();
      } catch {
        setError("Wallet connection failed. Please try again.");
      }
    },
    [connect, onClose],
  );

  // If already signed in, don't show the modal
  if (session || isConnected) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-sm rounded-2xl bg-[#0a0a0a] border-2 border-brand-gold/30 p-6 shadow-[0_0_60px_rgba(251,191,36,0.1),0_0_120px_rgba(251,191,36,0.05)]">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-2 rounded-lg text-[var(--color-cream-dim)] hover:text-brand-gold hover:bg-[rgba(251,191,36,0.08)] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <h2 className="font-display text-2xl font-black gradient-text-gold mb-1">
                  Sign In
                </h2>
                <p className="text-sm text-[var(--color-cream-dim)]">
                  Play games, track scores, join the community
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {error}
                </div>
              )}

              {/* PRIMARY: Google Sign-In */}
              <motion.button
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(251,191,36,0.3)" }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl bg-white text-gray-900 font-bold text-sm transition-all disabled:opacity-50 cursor-pointer mb-3"
              >
                {googleLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                {googleLoading ? "Signing in…" : "Sign in with Google"}
              </motion.button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-brand-gold/10" />
                <span className="text-[10px] uppercase tracking-widest text-[var(--color-cream-dim)] opacity-50">
                  or
                </span>
                <div className="flex-1 h-px bg-brand-gold/10" />
              </div>

              {/* SECONDARY: XRPL Wallet Connect */}
              <p className="text-xs text-[var(--color-cream-dim)] text-center mb-3 opacity-70">
                Crypto-native? Connect your XRPL wallet
              </p>
              <div className="space-y-2">
                {[
                  { id: "xaman" as const, name: "Xaman (Xumm)", icon: "📱" },
                  { id: "joey" as const, name: "Joey Wallet", icon: "🦘" },
                ].map((w) => (
                  <motion.button
                    key={w.id}
                    onClick={() => handleWalletConnect(w.id)}
                    disabled={isConnecting}
                    whileHover={{ x: 4 }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg border border-brand-gold/15 text-sm text-[var(--color-cream)] hover:text-brand-gold hover:border-brand-gold/30 hover:bg-[rgba(251,191,36,0.05)] transition-all cursor-pointer disabled:opacity-40"
                  >
                    <span className="text-lg">{w.icon}</span>
                    <span className="font-medium">{w.name}</span>
                    <Wallet size={14} className="ml-auto opacity-40" />
                  </motion.button>
                ))}
              </div>

              {/* Footer note */}
              <p className="mt-5 text-center text-[10px] text-[var(--color-cream-dim)] opacity-40 leading-relaxed">
                By signing in you agree to our Terms. Web3 wallet connection is optional — unlock
                on-chain rewards later.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
