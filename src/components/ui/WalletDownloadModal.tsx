"use client";

/**
 * WalletDownloadModal — Conditional wallet install prompt
 *
 * Detects installed XRPL wallets and shows contextual install
 * links for missing ones. Mobile-aware (deep links vs extensions).
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, ExternalLink, Check, Smartphone, Monitor } from "lucide-react";

/* ── Types ── */

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  installed: boolean;
  urls: {
    chrome?: string;
    firefox?: string;
    ios?: string;
    android?: string;
    website: string;
  };
}

interface WalletDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (provider: "xaman" | "gemwallet" | "crossmark") => void;
}

/* ── Detection ── */

function detectInstalledWallets(): {
  xaman: boolean;
  gemwallet: boolean;
  crossmark: boolean;
} {
  if (typeof window === "undefined") {
    return { xaman: false, gemwallet: false, crossmark: false };
  }

  const win = window as unknown as Record<string, unknown>;

  return {
    // Xaman doesn't inject — it uses OAuth, always "available"
    xaman: true,
    gemwallet: !!win.GemWallet,
    crossmark: !!win.crossmark,
  };
}

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
    navigator.userAgent,
  );
}

/* ── Wallet Registry ── */

function getWalletOptions(
  installed: ReturnType<typeof detectInstalledWallets>,
): WalletOption[] {
  return [
    {
      id: "xaman",
      name: "Xaman (Xumm)",
      icon: "📱",
      description: "Most trusted XRPL wallet. Mobile app with OAuth sign-in.",
      installed: installed.xaman,
      urls: {
        ios: "https://apps.apple.com/app/xumm/id1492302343",
        android:
          "https://play.google.com/store/apps/details?id=com.xrplabs.xumm",
        website: "https://xaman.app",
      },
    },
    {
      id: "gemwallet",
      name: "GemWallet",
      icon: "💎",
      description: "Browser extension for XRPL. Chrome & Firefox.",
      installed: installed.gemwallet,
      urls: {
        chrome:
          "https://chrome.google.com/webstore/detail/gemwallet/egebedonbdapoieeigfgjnpfhbpfnhji",
        firefox:
          "https://addons.mozilla.org/en-US/firefox/addon/gemwallet/",
        website: "https://gemwallet.app",
      },
    },
    {
      id: "crossmark",
      name: "Crossmark",
      icon: "✖️",
      description: "Sleek browser extension wallet for XRPL.",
      installed: installed.crossmark,
      urls: {
        chrome:
          "https://chrome.google.com/webstore/detail/crossmark/jchgngncbemfnonfajjfjpehibamdgeo",
        website: "https://crossmark.io",
      },
    },
  ];
}

/* ── Component ── */

export function WalletDownloadModal({
  isOpen,
  onClose,
  onConnect,
}: WalletDownloadModalProps) {
  const [installed, setInstalled] = useState(detectInstalledWallets);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // Re-detect on open (user may have just installed)
    setInstalled(detectInstalledWallets());
    setIsMobile(isMobileDevice());
  }, [isOpen]);

  const wallets = getWalletOptions(installed);
  const hasAnyWallet = wallets.some((w) => w.installed);

  const handleInstallClick = useCallback(
    (wallet: WalletOption) => {
      const urls = wallet.urls;
      if (isMobile) {
        const url =
          /iPhone|iPad|iPod/i.test(navigator.userAgent)
            ? urls.ios
            : urls.android;
        window.open(url || urls.website, "_blank");
      } else {
        window.open(urls.chrome || urls.website, "_blank");
      }
    },
    [isMobile],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed z-50 inset-x-4 top-[15vh] sm:inset-auto sm:left-1/2 sm:top-1/2
                       sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[440px]
                       rounded-2xl overflow-hidden
                       bg-[rgba(1,5,8,0.97)] border border-white/[0.08]
                       shadow-[0_0_60px_rgba(16,185,129,0.08)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <h3 className="font-display text-lg font-bold text-cream">
                Connect Wallet
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center
                           text-cream-dim hover:text-cream hover:bg-white/[0.06]
                           transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Platform indicator */}
            <div className="px-6 py-2 flex items-center gap-2 text-[11px] text-cream-dim/60 border-b border-white/[0.04]">
              {isMobile ? (
                <>
                  <Smartphone size={12} /> Mobile detected — showing app links
                </>
              ) : (
                <>
                  <Monitor size={12} /> Desktop — showing extensions
                </>
              )}
            </div>

            {/* Wallet list */}
            <div className="p-4 space-y-2">
              {wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className={`
                    rounded-xl border p-4 transition-all duration-200
                    ${
                      wallet.installed
                        ? "border-neon-green/20 bg-neon-green/[0.03] hover:bg-neon-green/[0.06]"
                        : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{wallet.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-cream">
                          {wallet.name}
                        </span>
                        {wallet.installed && (
                          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-neon-green bg-neon-green/10 px-1.5 py-0.5 rounded-full">
                            <Check size={10} /> Ready
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-cream-dim mt-0.5">
                        {wallet.description}
                      </p>
                    </div>

                    {/* Action button */}
                    {wallet.installed ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          onConnect(
                            wallet.id as "xaman" | "gemwallet" | "crossmark",
                          )
                        }
                        className="px-4 py-2 rounded-lg text-xs font-bold
                                   bg-gradient-to-r from-neon-green to-emerald-500
                                   text-forest-dark min-h-[36px] cursor-pointer
                                   hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]
                                   transition-shadow"
                      >
                        Connect
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleInstallClick(wallet)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold
                                   text-cream-dim border border-white/[0.1] hover:border-neon-green/20
                                   hover:text-cream min-h-[36px] cursor-pointer
                                   transition-all"
                      >
                        <Download size={12} />
                        Install
                      </motion.button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/[0.06] text-center">
              {hasAnyWallet ? (
                <p className="text-[11px] text-cream-dim/60">
                  Select a wallet above to connect
                </p>
              ) : (
                <a
                  href="https://xrpl.org/xrp-overview.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-neon-green/70 hover:text-neon-green transition-colors"
                >
                  New to XRPL? Learn more <ExternalLink size={10} />
                </a>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
