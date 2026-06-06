# Fuzzynuts

Free-to-play browser arcade on the XRP Ledger. Five HTML5 games, live
weekly leaderboards, real $NUT prize payouts.

- **Web**: <https://fuzzynuts.xyz> (Vercel, Next.js static export)
- **API**: <https://world.fuzzynuts.xyz> (Railway, Node/Express)
- **Token**: `NUT` issued by `rpL6HfoV578CAkZoNbm3UEK5BgVY9DxMP7`

## Quick start

```bash
git clone https://github.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz.git
cd fuzzynuts.xyz
corepack enable && corepack prepare pnpm@9.15.0 --activate
pnpm install
cp apps/web-arcade/.env.example apps/web-arcade/.env.local
pnpm dev:web    # http://localhost:3000
pnpm dev:api    # http://localhost:4000
```

Full walkthrough: [docs/tutorials/01-run-the-arcade-locally.md](./docs/tutorials/01-run-the-arcade-locally.md).

## Architecture

```mermaid
flowchart LR
  subgraph Client
    Web[Web arcade<br/>Next 15 static] -->|iframe| Games[Game bundles<br/>content-hashed]
    Tauri[Desktop<br/>Tauri 2.x] --> Web
    Cap[Mobile<br/>Capacitor 7] --> Web
  end
  subgraph Browser
    Web -->|connect| Xaman[Xaman OAuth2 PKCE]
    Web -->|WC v2| Joey[Joey Wallet]
  end
  subgraph Server
    Web -->|HTTPS + SSE| API[Express API<br/>Railway]
    API --> Mongo[(MongoDB)]
    API -->|xrpl.js| XRPL[(XRP Ledger<br/>mainnet)]
  end
  subgraph SharedPackages
    Core[(arcade-core)] --- Web
    Core --- API
    Core --- Games
    Anti[(shared-anticheat)] --- Web
    Anti --- API
    XU[(xrpl-token-utils)] --- API
  end
```

## Repo layout

| Path | What |
|---|---|
| `apps/web-arcade` | Next.js 15 static export |
| `apps/api` | Express + Mongo, deployed to Railway |
| `apps/games-build` | One Vite pipeline for every iframe game |
| `apps/desktop-tauri` | Tauri 2.x shell |
| `apps/mobile-capacitor` | Capacitor 7 iOS + Android |
| `packages/arcade-core` | Single source of truth: SCORE_CAPS, slugs, schema |
| `packages/xrpl-token-utils` | XRPL client, verify, AMM price, payout |
| `packages/wallet-client` | Xaman + Joey adapters |
| `packages/shared-anticheat` | HMAC + nonce + session-token, shared web/api |
| `docs/` | Diátaxis: tutorials, how-to, reference, explanation, ADRs, runbooks |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). All security-relevant changes
follow [SECURITY.md](./SECURITY.md). AI agents working in this repo
must read [HERMES.md](./HERMES.md) first.

## Open-RSC Status

RuneScape Classic integration via [Open-RSC](https://gitlab.com/openrsc/openrsc).

- **Auth flow**: XRPL wallet challenge → sign → verify. 32 tests green (15 vitest + 17 integration).
- **API toggle**: `GAME_SERVER_READY` env var gates the `/api/auth/game-session` endpoint. Returns 503 provisioning message while the game VPS is being set up.
- **VPS deploy**: One-command script at `tools/deploy-openrsc-vps.sh`. Installs Java, MariaDB, clones Open-RSC, builds, creates systemd service, opens firewall.
- **Handoff guide**: [docs/how-to/vps-setup.md](./docs/how-to/vps-setup.md) — plain-language steps for setting up the game server VPS.
- **Config template**: [apps/games-build/openrsc/INTEGRATION_NOTES.md](./apps/games-build/openrsc/INTEGRATION_NOTES.md) — verified local.conf for FuzzyNuts branding.

### Quick status

| Component | Status |
|-----------|--------|
| Challenge format | `FuzzyNuts-Auth-{nonce}-{timestamp}` (UTF-8) |
| XRPL verify | `verifyKeypairSignature` (xrpl.js v4) with hex encoding |
| Game session HMAC | `shared-anticheat` signGameSession / verifyGameSession |
| VPS script | `tools/deploy-openrsc-vps.sh` (Ubuntu 22.04+, idempotent) |
| API env toggle | `GAME_SERVER_READY=true` in Railway dashboard |

## License

[MIT](./LICENSE). Note: some game assets in `apps/games-build/games/`
originate from third parties and are tracked separately — see
[`docs/reference/third-party-assets.md`](./docs/reference/third-party-assets.md)
before redistribution.
