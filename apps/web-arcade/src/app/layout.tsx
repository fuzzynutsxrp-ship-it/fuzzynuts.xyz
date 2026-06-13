// CRO Scrub v2 - Web2 Metadata - Force Redeploy
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
  themeColor: "#0a0613",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Fuzzynuts — Play 6 Free Browser Games Instantly",
    template: "%s | FuzzyNuts",
  },
  description:
    "Compete in weekly tournaments, climb the global leaderboard, and unlock achievements. No downloads required.",
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
    title: "Fuzzynuts — Play 6 Free Browser Games Instantly",
    description:
      "Compete in weekly tournaments, climb the global leaderboard, and unlock achievements. No downloads required.",
    images: [
      {
        url: "/images/og/og-image.png",
        width: 1200,
        height: 630,
        alt: "Fuzzynuts — Play 6 Free Browser Games Instantly",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@fuzzynutsxrp",
    creator: "@fuzzynutsxrp",
    title: "Fuzzynuts — Play 6 Free Browser Games Instantly",
    description:
      "🐿️ Compete in weekly tournaments, climb the leaderboard, and unlock achievements. No downloads needed!",
    images: {
      url: "/images/og/og-image.png",
      alt: "Fuzzynuts — Play 6 Free Browser Games Instantly",
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
    icon: [
      { url: "/images/branding/logo-nav.webp", type: "image/webp" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/images/branding/logo-nav.webp",
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
    <html
      lang="en"
      className={`dark ${inter.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {!ALLOW_INDEXING && (
          <>
            <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
            <meta
              name="googlebot"
              content="noindex, nofollow, noarchive, nosnippet, noimageindex"
            />
          </>
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script defer data-domain="fuzzynuts.xyz" src="https://plausible.io/js/script.js"></script>
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
