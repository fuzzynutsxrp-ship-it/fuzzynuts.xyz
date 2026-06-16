# Project Brief: FuzzyNuts

## The "Why" (Mission)
FuzzyNuts is a free-to-play browser arcade on the XRP Ledger. Six (growing to 38) HTML5 games, live weekly leaderboards, real $NUT prize payouts. The goal is a seamless, low-friction Web3 gaming experience — no crypto wallet pop-ups on every click, no gas fees for players.

## The "What" (Core Product)
- **The Arcade** (`apps/web-arcade`): Next.js 15 static export, served from Vercel at `fuzzynuts.xyz`.
- **The API** (`apps/api`): Express + MongoDB backend on Railway. Session management, score validation, anti-cheat, reward distribution.
- **The Games** (`apps/games-build`): One Vite pipeline per game, content-hashed bundles served via iframe.
- **The Token**: `$NUT` on the XRP Ledger, issued by `rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7`. Managed via `packages/xrpl-token-utils`.
- **Desktop & Mobile**: Tauri 2.x desktop shell (`apps/desktop-tauri`), Capacitor 7 mobile wrapper (`apps/mobile-capacitor`).

## Target Audience
- Web3 gamers looking for low-friction, casual, or skill-based browser arcade games.
- The XRP community looking for active, utility-driven ledger projects.

## Core Philosophy & Non-Negotiables
1. **Honesty over agreement.** If an agent or human doesn't know, they state it plainly and verify. No hallucinated workarounds.
2. **Battle-tested over hype.** Established libraries and patterns only. No "AI slop," no invented best practices.
3. **Security first.** Code runs on a hardened Linux host. Money-handling paths have strict ADR + CODEOWNERS requirements.
4. **Human-in-the-loop.** AI agents build, write, and audit, but the human approves via Telegram before anything merges to `main`.

## How Agents Should Use This File
- Read this *first* to understand the strategic goals.
- Then read `HERMES.md` — the binding agent operating contract.
- Then read `ARCHITECT_IMPLEMENTATION.md` for technical structure.
- If a requested feature doesn't fit "free-to-play browser arcade on XRPL," push back and ask.
