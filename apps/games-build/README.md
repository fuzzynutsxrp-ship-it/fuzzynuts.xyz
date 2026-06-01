# apps/games-build — Open-RSC Integration

## Purpose

Canonical source + build pipeline for RuneScape Classic private server
(Open-RSC Core-Framework). This directory contains config templates, build
scripts, and integration docs for wiring an Open-RSC game server into the
Fuzzynuts arcade ecosystem.

## Reality Check

The Open-RSC game server (Java 11+) requires a **separate VPS** with a
persistent TCP listener on port 43594. It cannot run on Vercel (static
hosting) or Railway (stateless HTTP workers). This directory holds the
scaffolding and documentation needed to set up and integrate that server —
not the server itself.

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  web-arcade  │────▶│   api (Railway)  │────▶│  game VPS :43594   │
│  (Vercel)    │     │  /auth/game-sess │     │  Open-RSC Server   │
│              │     │                  │     │  Java 11 + Ant     │
│  Connect XRP │     │  Verify XRPL sig │     │                    │
│  wallet      │◀────│  Issue session   │◀────│  Validate session  │
│  Download JAR│     │  token           │     │  on connect        │
└──────────────┘     └──────────────────┘     └────────────────────┘
```

## Directory Structure

```
apps/games-build/
├── openrsc/              # Open-RSC server config templates (after clone)
│   ├── .gitkeep
│   └── INTEGRATION_NOTES.md
├── client-dist/          # Compiled Open_RSC_Client.jar output
│   ├── .gitkeep
│   └── README.md
├── scripts/
│   ├── build-client.sh   # Client build script (placeholder)
│   └── deploy-vps-checklist.md
├── auth/
│   └── xrpl-game-auth.ts # XRPL wallet → game session bridge
└── README.md             # This file
```

## Quick Start

1. Provision a VPS (see `scripts/deploy-vps-checklist.md`)
2. Clone Open-RSC on the VPS: `git clone https://gitlab.com/openrsc/openrsc.git`
3. Apply config overrides from `openrsc/INTEGRATION_NOTES.md`
4. Open port 43594 TCP in firewall
5. Start the server with `./Start-Linux.sh`
6. Update DNS: `game.fuzzynuts.xyz → VPS IP` (DNS-only, no Cloudflare proxy)
7. Enable the `/api/auth/game-session` endpoint on Railway

## Links

- Official Open-RSC repo: https://gitlab.com/openrsc/openrsc
- Open-RSC wiki: https://gitlab.com/openrsc/openrsc/-/wikis
- VPS deploy guide: `scripts/deploy-vps-checklist.md`
