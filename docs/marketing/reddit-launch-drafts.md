# FuzzyNuts Reddit Launch Drafts

> **Launch window:** Soft launch after CRO scrub + analytics verified.
> **URL:** https://www.fuzzynuts.xyz
> **Tracking:** Plausible custom events (`game_start`, `score_submitted`, `discord_click`)

---

## Post 1: r/WebGames

**Title:** I built a browser arcade with 6 games and a global leaderboard. No downloads, no logins required to play. Roast my UI.

**Body:**

Hey r/WebGames 👋

I've been building a browser game arcade for the last few months. It's got 6 playable games right now:

- **Fuzzynuts World** — MMORPG (RuneScape Classic via Open-RSC)
- **Super Fuzzynuts** — Platformer (32 levels + level editor)
- **Fuzzy Survivors** — Horde survival / roguelite
- **Fuzzy Putt** — 3D mini golf with physics
- **Nut Racer** — High-speed forest racing
- **RuneScape Classic** — The original 2001 MMORPG, playable in-browser

**What makes it different:**
- Zero friction — click a game, it loads instantly in an iframe
- Google sign-in to save scores (optional — you can play as a guest)
- Weekly leaderboard tournaments with automatic resets every Monday
- Clean, dark UI inspired by Poki.com and CrazyGames

**What I'm looking for:**
- Brutal feedback on the UI/UX
- Does the game grid feel inviting?
- Is the "Play Now" flow obvious enough?
- Any bounce-worthy moments?

Link: https://www.fuzzynuts.xyz

I'll be in the comments all day. Tear it apart.

---

## Post 2: r/IndieGaming

**Title:** I pivoted my Web3 game portal to Web2. Here's what happened to my bounce rate.

**Body:**

Six months ago I launched a crypto gaming portal. It had wallet connections, tokenomics pages, "degen" branding, and all the Web3 jargon you'd expect. The bounce rate was 90%+.

So I did something drastic: I scrubbed every piece of crypto language from the frontend and rebuilt it as a pure Web2 gaming site. Same backend, completely new skin.

**What changed:**
- "Connect XRPL Wallet" → "Sign in with Google"
- "Don't Trust. Verify." → removed (moved to /tokenomics)
- "Nut up or shut up" → "Jump in and play"
- "Hall of Degens" → "Weekly Leaderboard Tournaments"
- Tokenomics page → buried in footer, noindex'd from Google

**What stayed:**
- The actual game logic (unchanged)
- The leaderboard system (now unified — Google users and wallet users compete on the same board)
- The weekly prize system (still runs on XRPL under the hood)

**The tech:**
- Next.js 15 + TypeScript
- MongoDB for scores + user profiles
- NextAuth for Google + XRPL dual auth
- Socket.io for live chat
- Express API on Railway
- Plausible for privacy-friendly analytics

**Results so far:**
- Homepage is now a clean game grid (Poki-style)
- No crypto jargon in any user-facing text
- OG previews show "Play 6 Free Games Instantly" instead of "$NUT on XRPL"
- Google sign-in is the primary CTA

I'm doing a soft launch this week. If you're curious about the technical details of the pivot, happy to answer questions.

Link: https://www.fuzzynuts.xyz

---

## Post 3: r/browsergames

**Title:** 6 free browser games. Weekly tournaments. Looking for brutal feedback.

**Body:**

https://www.fuzzynuts.xyz

6 games. No downloads. No paywalls. Google sign-in to save scores.

Games include a platformer, horde survival, mini golf, racing, and RuneScape Classic (the original 2001 MMORPG running in-browser via Open-RSC).

Weekly leaderboard resets every Monday. Top 3 win prizes.

I built this solo. Roast the UI, the game feel, whatever stands out. I want to know what makes you close the tab.

---

## Posting Strategy

1. **r/WebGames** first (highest intent, most forgiving of self-promo)
2. **r/browsergames** same day (shorter post, cross-link in comments)
3. **r/IndieGaming** 2-3 days later (story-driven, different angle)
4. **IndieDB** — create a project page with screenshots + description
5. **Reply to every comment** for the first 48 hours

## Metrics to Track (Plausible)

- `game_start` events per game (which games get clicked?)
- `score_submitted` events (which games have retention?)
- `discord_click` events (is the CTA working?)
- `sign_in` events (Google vs wallet ratio)
- Bounce rate on homepage
- Time on site
