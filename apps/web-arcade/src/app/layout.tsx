import type { Metadata, Viewport } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { JoeyProvider } from "@/components/providers/JoeyProvider";
import { AppMount } from "@/components/providers/AppMount";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ChatWidget } from "@/components/chat/ChatWidget";

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

/**
 * Search-engine indexing switch. Defaults to OFF (noindex) so the site stays
 * locked down through pre-launch. To go live: set NEXT_PUBLIC_ALLOW_INDEXING=true
 * in the deploy environment and redeploy — no code change needed. (Read at build
 * time, which is correct for a static export.)
 */
const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

export const viewport: Viewport = {
  // DEGEN OVERHAUL — deep degen black/purple chrome tint
  themeColor: "#0a0613",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "FuzzyNuts — Free Web Games & Leaderboards",
    template: "%s | FuzzyNuts",
  },
  description:
    "Play free arcade games, compete on global leaderboards, and unlock achievements. Join the FuzzyNuts gaming community — no wallet required.",
  keywords: [
    "FuzzyNuts",
    "free web games",
    "online arcade",
    "browser games",
    "leaderboard",
    "gaming community",
    "arcade games",
    "competitive gaming",
    "achievements",
    "free to play",
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
    title: "FuzzyNuts — Free Web Games & Leaderboards",
    description:
      "Play free arcade games, compete on global leaderboards, and unlock achievements. No wallet required.",
    images: [
      {
        url: "/images/og/og-image.png",
        width: 1200,
        height: 630,
        alt: "FuzzyNuts — Free Web Games & Leaderboards",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@fuzzynutsxrp",
    creator: "@fuzzynutsxrp",
    title: "FuzzyNuts — Free Web Games & Leaderboards",
    description:
      "🐿️ Play free arcade games, compete on global leaderboards, unlock achievements. No wallet needed!",
    images: {
      url: "/images/og/og-image.png",
      alt: "FuzzyNuts — Free Web Games & Leaderboards",
    },
  },
  robots: ALLOW_INDEXING
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      }
    : {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
          index: false,
          follow: false,
          noimageindex: true,
          "max-video-preview": 0,
          "max-image-preview": "none",
          "max-snippet": 0,
        },
      },
  icons: {
    // DEGEN OVERHAUL START — promote the mascot emblem to the favicon slot
    // (modern browsers prefer the webp mascot; favicon.ico stays as fallback)
    icon: [
      { url: "/images/branding/logo-nav.webp", type: "image/webp" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/images/branding/logo-nav.webp",
    // DEGEN OVERHAUL END
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
        {/* Extra belt-and-suspenders noindex tags while locked down. These are
            omitted once NEXT_PUBLIC_ALLOW_INDEXING=true so they can't override
            the indexable robots metadata above. */}
        {!ALLOW_INDEXING && (
          <>
            <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
            <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
          </>
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-body antialiased">
        <SessionProvider>
        <MotionProvider>
          <JoeyProvider>
            <AppMount />
            {children}
            <ChatWidget />
          </JoeyProvider>
        </MotionProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
