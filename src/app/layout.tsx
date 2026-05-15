import type { Metadata, Viewport } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://fuzzynuts.xyz";

export const viewport: Viewport = {
  themeColor: "#010508",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "Fuzzynuts — Play. Earn. Own. | $NUT on XRPL",
    template: "%s | Fuzzynuts",
  },
  description:
    "The nuttiest meme coin on the XRP Ledger. Play 5 arcade games, earn real $NUT tokens, and join a community of degens. 321B fixed supply, blackholed issuer, 80% liquidity.",
  keywords: [
    "Fuzzynuts",
    "$NUT",
    "NUT token",
    "XRPL",
    "XRP Ledger",
    "meme coin",
    "play to earn",
    "crypto arcade",
    "XRPL token",
    "blockchain gaming",
    "XRPL meme coin",
    "play-to-earn XRPL",
  ],
  authors: [{ name: "Fuzzynuts", url: SITE_URL }],
  creator: "Fuzzynuts",
  publisher: "Fuzzynuts",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Fuzzynuts",
    title: "Fuzzynuts — Play. Earn. Own. | $NUT on XRPL",
    description:
      "The nuttiest meme coin on XRPL. Play 5 arcade games, earn $NUT tokens. 321B fixed supply, blackholed issuer, 80% liquidity locked.",
    images: [
      {
        url: "/images/og/og-image.png",
        width: 1200,
        height: 630,
        alt: "Fuzzynuts — The nuttiest meme coin on XRPL. Squirrel mascot with golden acorns.",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@fuzzynutsxrp",
    creator: "@fuzzynutsxrp",
    title: "Fuzzynuts — Play. Earn. Own. | $NUT on XRPL",
    description:
      "🐿️ The nuttiest meme coin on XRPL. 5 arcade games, real $NUT prizes, 321B fixed supply. Play free, earn crypto!",
    images: {
      url: "/images/og/og-image.png",
      alt: "Fuzzynuts — Play. Earn. Own.",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/images/og/og-image.png",
  },
  category: "Gaming",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${outfit.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        {/* ── Resource Hints ── */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://xrpscan.com" />
        <link rel="dns-prefetch" href="https://xpmarket.com" />
        {/* Preload LCP hero image (mobile) — critical for FCP */}
        <link rel="preload" as="image" href="/images/hero/hero-bg-mobile.jpg" media="(max-width: 639px)" />
        {/* Preload hero video poster (desktop) */}
        <link rel="preload" as="video" href="/videos/herobackgroundvideo.mp4" media="(min-width: 640px)" />

        {/* JSON-LD: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Fuzzynuts",
              url: "https://fuzzynuts.xyz",
              logo: "https://fuzzynuts.xyz/images/branding/logo.png",
              description: "The nuttiest meme coin on the XRP Ledger.",
              sameAs: [
                "https://x.com/fuzzynutsxrp",
                "https://t.me/FuzzynutsXRP",
              ],
            }),
          }}
        />
        {/* JSON-LD: WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Fuzzynuts",
              url: "https://fuzzynuts.xyz",
              description:
                "Play 5 arcade games and earn $NUT tokens on the XRP Ledger. 321 billion fixed supply, blackholed issuer.",
            }),
          }}
        />
        {/* JSON-LD: SoftwareApplication (Gaming) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Fuzzynuts Arcade",
              operatingSystem: "Web",
              applicationCategory: "GameApplication",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              description:
                "Play 5 free arcade games and earn $NUT tokens on the XRP Ledger. Features Fuzzynuts World MMORPG, Super Fuzzynuts platformer, Fuzzy Survivors, and more.",
              screenshot: "https://fuzzynuts.xyz/images/og/og-image.png",
              author: {
                "@type": "Organization",
                name: "Fuzzynuts",
              },
            }),
          }}
        />
        {/* JSON-LD: FAQPage for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "What is Fuzzynuts ($NUT)?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Fuzzynuts ($NUT) is a meme coin on the XRP Ledger with 321 billion fixed supply and a blackholed issuer. Players earn $NUT by playing 5 arcade games.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How do I get $NUT tokens?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Get a Xaman wallet, fund it with XRP, set a NUT trustline on XPMarket, then swap XRP for NUT on the DEX or earn NUT by playing games in the arcade.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Is $NUT safe? Can more tokens be minted?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "The issuer account is permanently blackholed — no one can ever mint more tokens. 80% of supply is in the AMM liquidity pool. All addresses are publicly verifiable on the XRP Ledger.",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className="font-body antialiased">
        {children}
      </body>
    </html>
  );
}
