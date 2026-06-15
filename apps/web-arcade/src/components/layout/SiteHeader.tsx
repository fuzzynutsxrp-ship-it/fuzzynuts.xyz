"use client";

// SiteHeader — the single header used on every page (homepage, leaderboard,
// profile, etc.). One component, one login/search/dropdown definition.
// `variant` themes it: "light" (homepage Poki style) or "dark" (inner pages,
// matching the app's dark theme). Self-contained styles so it renders correctly
// on any page regardless of that page's own CSS.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, User, LogIn, LogOut, Trophy, Gift, Menu } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useWalletStore } from "@/store/wallet";
import { LoginModal } from "@/components/auth/LoginModal";
import { SearchPanel } from "./SearchPanel";
import { truncateAddress } from "@/lib/format";

interface SiteHeaderProps {
  variant?: "light" | "dark";
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  /** When provided, shows a mobile hamburger (e.g. to toggle a page sidebar). */
  onMenuToggle?: () => void;
}

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/prizes", label: "Prizes" },
];

const DROPDOWN_LINKS = [
  { href: "/profile", label: "Profile & stats", Icon: User },
  { href: "/prizes", label: "Rewards / Referrals", Icon: Gift },
  { href: "/leaderboard", label: "Leaderboard", Icon: Trophy },
];

export function SiteHeader({ variant = "dark", searchQuery = "", onSearchChange, onMenuToggle }: SiteHeaderProps) {
  const [loginOpen, setLoginOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { address, isConnected, disconnect } = useWalletStore();
  const { data: session } = useSession();

  // Listen for external requests to open login modal (e.g. from ChatWidget)
  useEffect(() => {
    const handler = () => setLoginOpen(true);
    window.addEventListener("fuzzynuts:open-login", handler);
    return () => window.removeEventListener("fuzzynuts:open-login", handler);
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [dropdownOpen]);

  const signedIn = Boolean(session) || isConnected;
  const query = onSearchChange ? searchQuery : localQuery;
  const handleSearch = onSearchChange ?? setLocalQuery;

  return (
    <div className={`sh sh--${variant}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header className="sh-bar">
        {onMenuToggle && (
          <button className="sh-icon sh-menu" onClick={onMenuToggle} aria-label="Toggle menu">
            <Menu size={20} />
          </button>
        )}
        <Link className="sh-logo" href="/" aria-label="FuzzyNuts home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sh-logo__img" src="/images/branding/logo-nav.webp" alt="" />
          <span className="sh-logo__text">FuzzyNuts</span>
        </Link>

        <nav className="sh-nav">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href}>{l.label}</Link>
          ))}
        </nav>

        <div className="sh-actions">
          <button className="sh-icon" onClick={() => setSearchOpen(true)} aria-label="Search games">
            <Search size={18} />
          </button>

          {!signedIn ? (
            <button className="sh-signin" onClick={() => setLoginOpen(true)}>
              <LogIn size={16} /> Sign in
            </button>
          ) : (
            <div className="sh-account" ref={dropdownRef}>
              <button className="sh-icon" onClick={() => setDropdownOpen((o) => !o)} aria-label="Account menu">
                {session?.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="sh-avatar" src={session.user.image} alt="" />
                ) : (
                  <User size={18} />
                )}
              </button>
              {dropdownOpen && (
                <div className="sh-dropdown">
                  {session && (
                    <div className="sh-dd-meta"><small>Signed in as</small><div>{session.user?.name ?? session.user?.email ?? "Player"}</div></div>
                  )}
                  {isConnected && address && (
                    <div className="sh-dd-meta"><small>Wallet</small><div>{truncateAddress(address)}</div></div>
                  )}
                  {DROPDOWN_LINKS.map(({ href, label, Icon }) => (
                    <Link key={label} href={href} onClick={() => setDropdownOpen(false)}><Icon size={15} /> {label}</Link>
                  ))}
                  <div className="sh-dd-sep" />
                  <button
                    className="sh-dd-signout"
                    onClick={() => { disconnect(); if (session) signOut({ callbackUrl: "/" }); setDropdownOpen(false); }}
                  >
                    <LogOut size={15} /> {session ? "Sign out" : "Disconnect"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} searchQuery={query} onSearchChange={handleSearch} />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

const CSS = `
.sh{--sh-font:"Nunito",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;}
.sh--light{--sh-surface:#fff;--sh-text:#0f172a;--sh-text-dim:#64748b;--sh-border:#e2e8f0;--sh-hover:#f1f5f9;--sh-accent:#6366f1;--sh-accent-hover:#4f46e5;--sh-shadow:0 1px 3px 0 rgba(15,23,42,.08),0 1px 2px -1px rgba(15,23,42,.08);--sh-shadow-mid:0 4px 6px -1px rgba(15,23,42,.1),0 2px 4px -2px rgba(15,23,42,.1);}
.sh--dark{--sh-surface:#0a0613;--sh-text:#f5f0e6;--sh-text-dim:rgba(245,240,230,.55);--sh-border:rgba(255,255,255,.10);--sh-hover:#241846;--sh-accent:#d4a843;--sh-accent-hover:#b8922f;--sh-shadow:0 1px 0 rgba(255,255,255,.04);--sh-shadow-mid:0 8px 32px rgba(0,0,0,.5);--sh-tile:#1a1030;}
.sh-bar{display:flex;align-items:center;gap:24px;padding:8px 24px;background:var(--sh-surface);box-shadow:var(--sh-shadow);position:sticky;top:0;z-index:50;font-family:var(--sh-font);}
.sh-bar *{box-sizing:border-box;}
.sh-logo{display:flex;flex-direction:column;align-items:center;gap:1px;text-decoration:none;flex-shrink:0;}
.sh-logo__img{height:34px;width:auto;display:block;}
.sh-logo__text{font-size:12px;font-weight:800;color:var(--sh-text);letter-spacing:-.2px;line-height:1;}
.sh-nav{display:flex;gap:18px;flex:1;}
.sh-nav a{color:var(--sh-text-dim);text-decoration:none;font-weight:700;font-size:15px;}
.sh-nav a:hover{color:var(--sh-text);}
.sh-actions{display:flex;align-items:center;gap:10px;flex-shrink:0;}
.sh-icon{width:44px;height:44px;border-radius:12px;border:1px solid var(--sh-border);background:var(--sh--dark,transparent);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--sh-text-dim);transition:background .15s,color .15s;padding:0;}
.sh--dark .sh-icon{background:var(--sh-tile);}
.sh-icon:hover{background:var(--sh-hover);color:var(--sh-text);}
.sh-signin{display:flex;align-items:center;gap:8px;background:var(--sh-accent);color:#fff;border:none;border-radius:100px;padding:11px 20px;font-weight:800;font-size:14px;cursor:pointer;font-family:inherit;}
.sh--dark .sh-signin{color:#0a0613;}
.sh-signin:hover{background:var(--sh-accent-hover);}
.sh-avatar{width:28px;height:28px;border-radius:50%;display:block;}
.sh-account{position:relative;}
.sh-dropdown{position:absolute;right:0;top:calc(100% + 8px);width:230px;background:var(--sh-surface);border:1px solid var(--sh-border);border-radius:12px;box-shadow:var(--sh-shadow-mid);padding:8px;z-index:60;}
.sh-dropdown a,.sh-dropdown>button{display:flex;align-items:center;gap:8px;width:100%;padding:10px 12px;border-radius:8px;font-size:14px;font-weight:700;color:var(--sh-text);text-decoration:none;background:none;border:none;cursor:pointer;text-align:left;font-family:inherit;}
.sh-dropdown a:hover,.sh-dropdown>button:hover{background:var(--sh-hover);}
.sh-dd-signout{color:#ef4444 !important;}
.sh-dd-sep{height:1px;background:var(--sh-border);margin:6px 0;}
.sh-dd-meta{padding:6px 12px;}
.sh-dd-meta small{color:var(--sh-text-dim);font-size:12px;}
.sh-dd-meta div{font-weight:800;font-size:14px;color:var(--sh-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.sh-menu{display:none;}
@media (max-width:768px){.sh-nav{display:none;}.sh-menu{display:flex;}}
`;
