// FuzzyNuts Arcade — homepage.
// Light, Poki-style design (ported from the original public/index.html look) but
// driven by all 38 real games from GAMES and opening each in the shared GameModal.
// Styles are embedded + scoped under `.fnx` so they can't clash with app CSS.
"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { GameModal } from "@/components/game/GameModal";
import { GAMES } from "@/lib/utils";

const Footer = dynamic(() =>
  import("@/components/layout/Footer").then((m) => ({ default: m.Footer })),
);

type Game = (typeof GAMES)[number];

const CATEGORIES = [
  { key: "all", label: "All Games", grad: "linear-gradient(135deg,#6366f1,#4f46e5)" },
  { key: "action", label: "Action", grad: "linear-gradient(135deg,#f59e0b,#d97706)" },
  { key: "arcade", label: "Arcade", grad: "linear-gradient(135deg,#8b5cf6,#7c3aed)" },
  { key: "puzzle", label: "Puzzle", grad: "linear-gradient(135deg,#a855f7,#7c3aed)" },
  { key: "racing", label: "Racing", grad: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
  { key: "sports", label: "Sports", grad: "linear-gradient(135deg,#f97316,#ea580c)" },
  { key: "multiplayer", label: "Multiplayer", grad: "linear-gradient(135deg,#10b981,#059669)" },
  { key: "classic", label: "Classic", grad: "linear-gradient(135deg,#06b6d4,#0891b2)" },
];

const FEATURED_ID = "rsc";
const POPULAR_IDS = ["rsc", "cosmic-blaster", "dragon-hoard", "mario", "survivors", "racer", "minigolf", "fuzzynuts-world"];

function matchesCat(g: Game, cat: string): boolean {
  if (cat === "all") return true;
  const hay = [g.type, ...(g.tags ?? [])].join(" ").toLowerCase();
  if (cat === "action") return /action|shoot|combat|fight/.test(hay);
  if (cat === "arcade") return /arcade/.test(hay);
  if (cat === "puzzle") return /puzzle|physics|casual/.test(hay);
  if (cat === "racing") return /racing|runner|speed/.test(hay);
  if (cat === "sports") return /sports/.test(hay);
  if (cat === "multiplayer") return /multiplayer|mmo|2 player|local/.test(hay);
  if (cat === "classic") return /classic/.test(hay);
  return false;
}

function gamesByIds(ids: string[]): Game[] {
  return ids.map((id) => GAMES.find((g) => g.id === id)).filter(Boolean) as Game[];
}

function Card({ game, onPlay, i }: { game: Game; onPlay: (id: string) => void; i: number }) {
  return (
    <button className="fn-game-card" onClick={() => onPlay(game.id)} aria-label={`Play ${game.title}`}>
      <span className={`fn-game-card__thumb fn-game-card__thumb--${(i % 6) + 1}`}>
        <img
          src={`/images/games/${game.id}.png`}
          alt={game.title}
          className="fn-game-card__img"
          loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
        />
        <span className="fn-game-card__badge">{game.type}</span>
      </span>
      <span className="fn-game-card__title">{game.title}</span>
    </button>
  );
}

export default function Home() {
  const [activeCat, setActiveCat] = useState("all");
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  const featured = GAMES.find((g) => g.id === FEATURED_ID) ?? GAMES[0];
  const popular = gamesByIds(POPULAR_IDS);
  const filtered = useMemo(() => GAMES.filter((g) => matchesCat(g, activeCat)), [activeCat]);

  return (
    <div className="fnx">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header className="fnx-header">
        <Link className="fnx-brand" href="/">🌰 FuzzyNuts</Link>
        <nav className="fnx-nav">
          <Link href="/">Home</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/prizes">Prizes</Link>
        </nav>
        <Link className="fnx-connect" href="/wallet">Connect Wallet</Link>
      </header>

      <main className="fn-dashboard">
        {/* Hero */}
        <section className="fn-hero-banner" aria-label="Featured game">
          <div className="fn-hero-banner__content">
            <span className="fn-hero-banner__badge">🔥 Featured</span>
            <h1 className="fn-hero-banner__title">{featured.title}</h1>
            <p className="fn-hero-banner__subtitle">{featured.description}</p>
            <button className="fn-hero-banner__cta" onClick={() => setActiveGameId(featured.id)}>
              Play Now
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
          <div className="fn-hero-banner__visual" style={{ backgroundImage: `url(/images/games/${featured.id}.png)` }} />
        </section>

        {/* Category browse */}
        <section className="fn-categories" aria-label="Browse by category">
          <h2 className="fn-categories__heading">Browse by category</h2>
          <div className="fn-categories__grid">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                className={`fn-cat-tile${activeCat === c.key ? " is-active" : ""}`}
                onClick={() => { setActiveCat(c.key); document.getElementById("all-games")?.scrollIntoView({ behavior: "smooth" }); }}
              >
                <span className="fn-cat-tile__icon" style={{ background: c.grad }} aria-hidden="true">🎮</span>
                <span className="fn-cat-tile__label">{c.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Popular row */}
        <section className="fn-carousel-section" aria-label="Popular">
          <h2 className="fn-carousel-section__heading">🕹️ Popular this week</h2>
          <div className="fn-carousel__track">
            {popular.map((g, i) => <Card key={g.id} game={g} onPlay={setActiveGameId} i={i} />)}
          </div>
        </section>

        {/* All games grid */}
        <section className="fn-carousel-section" id="all-games" aria-label="All games">
          <h2 className="fn-carousel-section__heading">
            {activeCat === "all" ? "All games" : CATEGORIES.find((c) => c.key === activeCat)?.label}
            <span className="fnx-count">{filtered.length}</span>
          </h2>
          {filtered.length > 0 ? (
            <div className="fn-grid">
              {filtered.map((g, i) => <Card key={g.id} game={g} onPlay={setActiveGameId} i={i} />)}
            </div>
          ) : (
            <p className="fnx-empty">No games in this category yet.</p>
          )}
        </section>

        <Footer />
      </main>

      <GameModal gameId={activeGameId} onClose={() => setActiveGameId(null)} onGameSwitch={setActiveGameId} />
    </div>
  );
}

const CSS = `
.fnx {
  --fn-bg:#f8fafc; --fn-surface:#fff; --fn-text:#0f172a; --fn-text-secondary:#64748b;
  --fn-primary:#6366f1; --fn-primary-hover:#4f46e5;
  --fn-shadow-close:0 1px 3px 0 rgba(15,23,42,.08),0 1px 2px -1px rgba(15,23,42,.08);
  --fn-shadow-mid:0 4px 6px -1px rgba(15,23,42,.1),0 2px 4px -2px rgba(15,23,42,.1);
  --fn-font:"Nunito",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
  background:var(--fn-bg); color:var(--fn-text); font-family:var(--fn-font);
  min-height:100vh; line-height:1.5;
}
.fnx *,.fnx *::before,.fnx *::after{box-sizing:border-box;}
.fnx-header{display:flex;align-items:center;gap:24px;padding:14px 24px;background:var(--fn-surface);box-shadow:var(--fn-shadow-close);position:sticky;top:0;z-index:20;}
.fnx-brand{font-size:20px;font-weight:800;color:var(--fn-text);text-decoration:none;letter-spacing:-.3px;}
.fnx-nav{display:flex;gap:18px;flex:1;}
.fnx-nav a{color:var(--fn-text-secondary);text-decoration:none;font-weight:700;font-size:15px;}
.fnx-nav a:hover{color:var(--fn-text);}
.fnx-connect{background:var(--fn-primary);color:#fff;text-decoration:none;font-weight:800;font-size:14px;padding:10px 18px;border-radius:100px;}
.fnx-connect:hover{background:var(--fn-primary-hover);}
.fn-dashboard{max-width:1400px;margin:0 auto;padding:24px;display:flex;flex-direction:column;gap:40px;}
.fn-hero-banner{display:grid;grid-template-columns:1fr 1fr;background:var(--fn-surface);border-radius:16px;box-shadow:var(--fn-shadow-close);overflow:hidden;min-height:300px;}
.fn-hero-banner__content{display:flex;flex-direction:column;justify-content:center;gap:16px;padding:40px 32px;}
.fn-hero-banner__badge{width:fit-content;padding:4px 12px;background:linear-gradient(135deg,rgba(99,102,241,.12),rgba(236,72,153,.12));color:var(--fn-primary);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;border-radius:100px;}
.fn-hero-banner__title{font-size:clamp(2rem,4vw,3rem);font-weight:800;line-height:1.1;letter-spacing:-.5px;}
.fn-hero-banner__subtitle{font-size:1rem;color:var(--fn-text-secondary);max-width:420px;}
.fn-hero-banner__cta{display:inline-flex;align-items:center;gap:8px;width:fit-content;padding:12px 28px;background:var(--fn-primary);color:#fff;font-size:16px;font-weight:800;border:none;border-radius:100px;cursor:pointer;min-height:48px;transition:transform .15s,background .15s,box-shadow .15s;font-family:inherit;}
.fn-hero-banner__cta:hover{background:var(--fn-primary-hover);transform:translateY(-2px);box-shadow:0 6px 16px rgba(99,102,241,.3);}
.fn-hero-banner__cta svg{width:20px;height:20px;}
.fn-hero-banner__visual{background-size:cover;background-position:center;min-height:240px;}
.fn-categories{display:flex;flex-direction:column;gap:16px;}
.fn-categories__heading,.fn-carousel-section__heading{font-size:24px;font-weight:800;letter-spacing:-.3px;display:flex;align-items:center;gap:10px;}
.fnx-count{font-size:13px;font-weight:700;color:#fff;background:var(--fn-primary);border-radius:100px;padding:2px 10px;}
.fn-categories__grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;}
.fn-cat-tile{display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--fn-surface);border:2px solid transparent;border-radius:12px;box-shadow:var(--fn-shadow-close);cursor:pointer;transition:transform .15s,box-shadow .15s,border-color .15s;min-height:64px;font-family:inherit;}
.fn-cat-tile:hover{transform:scale(1.04);box-shadow:var(--fn-shadow-mid);}
.fn-cat-tile.is-active{border-color:var(--fn-primary);}
.fn-cat-tile__icon{width:44px;height:44px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;}
.fn-cat-tile__label{font-size:15px;font-weight:800;color:var(--fn-text);}
.fn-carousel-section{display:flex;flex-direction:column;gap:16px;}
.fn-carousel__track{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 0 12px;scrollbar-width:none;}
.fn-carousel__track::-webkit-scrollbar{display:none;}
.fn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;}
.fn-game-card{flex:0 0 180px;width:180px;scroll-snap-align:start;display:flex;flex-direction:column;background:var(--fn-surface);border:none;padding:0;border-radius:12px;overflow:hidden;cursor:pointer;box-shadow:var(--fn-shadow-close);transition:box-shadow .18s,transform .18s;text-align:left;font-family:inherit;}
.fn-grid .fn-game-card{flex:none;width:auto;}
.fn-game-card:hover{box-shadow:var(--fn-shadow-mid);transform:translateY(-3px);}
.fn-game-card__thumb{position:relative;width:100%;aspect-ratio:1/1;overflow:hidden;display:flex;align-items:center;justify-content:center;}
.fn-game-card__img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .25s;}
.fn-game-card:hover .fn-game-card__img{transform:scale(1.05);}
.fn-game-card__thumb--1{background:linear-gradient(135deg,#6366f1,#4f46e5);} .fn-game-card__thumb--2{background:linear-gradient(135deg,#ec4899,#db2777);} .fn-game-card__thumb--3{background:linear-gradient(135deg,#14b8a6,#0d9488);} .fn-game-card__thumb--4{background:linear-gradient(135deg,#f59e0b,#d97706);} .fn-game-card__thumb--5{background:linear-gradient(135deg,#3b82f6,#1d4ed8);} .fn-game-card__thumb--6{background:linear-gradient(135deg,#8b5cf6,#7c3aed);}
.fn-game-card__badge{position:absolute;top:8px;left:8px;z-index:2;font-size:11px;font-weight:800;color:#fff;background:rgba(15,23,42,.55);padding:3px 8px;border-radius:4px;letter-spacing:.2px;backdrop-filter:blur(4px);}
.fn-game-card__title{font-size:14px;font-weight:800;color:var(--fn-text);padding:10px 12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.fnx-empty{color:var(--fn-text-secondary);padding:24px 0;}
@media (max-width:1024px){.fn-categories__grid{grid-template-columns:repeat(3,1fr);}}
@media (max-width:768px){.fn-hero-banner{grid-template-columns:1fr;}.fnx-nav{display:none;}.fn-categories__grid{grid-template-columns:repeat(2,1fr);}}
`;
