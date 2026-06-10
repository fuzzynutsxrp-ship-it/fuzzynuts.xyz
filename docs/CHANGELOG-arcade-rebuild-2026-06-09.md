# Changelog — FuzzyNuts Poki-Parity Arcade Rebuild

## 2026-06-09 — Phases 1-10 Complete

### Phase 1: Foundation
- Design tokens in `global.css` (Nunito font, indigo/pink palette, fn-* BEM)
- Sidebar-aware layout (72px rail, responsive)
- Nav-bar cleaned (no duplicate :root tokens)

### Phase 2: Mobile Navigation
- Hamburger button (44px touch target, animated bars → X)
- Slide-out drawer (280px, z-index 40)
- Mobile search inside drawer
- Overlay backdrop with click-to-close

### Phase 3: Hero + Categories
- Hero spotlight banner (2-col grid, gradient visual, CTA)
- 8-category tile grid (4/3/2 col responsive, gradient icons)

### Phase 4: Game Carousels
- `game-card.css` component (180px, hover-zoom on image only)
- 3 snap-scroll carousels (15 cards each)
- Arrow buttons fade in on hover
- Replaced old Trending list + hardcoded carousels

### Phase 5: Sidebar + SEO
- Fixed 72px sidebar rail (icon-only, tooltips)
- SEO content blocks (H1 + 3 H2 sections, FuzzyNuts copy)

### Phase 6: Footer + Cookie Consent
- 4-column footer (dark navy, social icons, language select)
- Cookie banner (z-100, sessionStorage, slide-up animation)

### Phase 7: Asset Pipeline
- `scripts/fetch-assets.js` — FreeToGame API downloader (40 games)
- `data/games.json` manifest
- `images/thumbnails/` — 40 game thumbnails

### Phase 8: High-Density Tuning
- Card width: 220px → 180px
- Track gap: 16px → 12px
- Title: 14px → 13px
- Image-only hover scale (1.05)
- 15 games per carousel (was 6)
- HOT/NEW badges

### Phase 9: Auth Bridge
- `js/auth.js` — session check, wallet connect, logout
- HttpOnly cookie auth (credentials: 'include')
- Tab visibility re-check
- Avatar initials for authenticated state

### Phase 10: Game Overlay
- `css/game-overlay.css` — fixed full-screen (z-200)
- `js/game-loader.js` — card click interception
- Mock handshake (1.5s) → viewport placeholder
- Back button + Fullscreen API

### Route Fix
- `next.config.ts` rewrite: `/` → `/index.html`
- Bypasses React layout.tsx shell
- Legacy dashboard preserved at `/legacy/`

### Git History
```
7969d7a  fix(routing): serve static arcade at root via rewrite
5ba0fcb  feat(overlay): full-screen game play overlay (Phase 10)
d6df37e  feat(auth): wallet & session bridge (Phase 9)
828d840  feat(preview): high-density arcade layout + badges
26f68a2  feat(preview): replace gradient placeholders with real game thumbnails
55833fc  feat: promote arcade rebuild to production root
95ca7a9  feat(preview): complete clean-room poki parity rebuild (phases 1-6)
```
