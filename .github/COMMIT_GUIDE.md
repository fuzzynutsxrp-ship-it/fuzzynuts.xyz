# Commit Guide — Open-RSC Scaffold

## Commit Message

```
feat: complete Open-RSC auth scaffold + VPS deploy script (32 tests green)
```

## What's in this commit

- XRPL wallet challenge → sign → verify auth flow (xrpl.js v4)
- `formatGameChallenge()` produces `FuzzyNuts-Auth-{nonce}-{timestamp}` (UTF-8)
- `verifyKeypairSignature` with hex encoding, proven by real ed25519 keypair round-trip
- `GAME_SERVER_READY` env-driven API toggle (503 while provisioning)
- `/play/rsc` page with provisioning fallback state
- `tools/deploy-openrsc-vps.sh` — one-command VPS setup script
- `.env.example` with all required env vars documented
- `docs/how-to/vps-setup.md` — plain-language handoff guide
- 32 tests green (15 vitest + 17 game-auth integration)

## Optional tag

```bash
git tag v0.1.0-rsc-scaffold
```

## Files changed

| File | Change |
|------|--------|
| `packages/xrpl-token-utils/src/verify.ts` | xrpl.js v4 imports, formatGameChallenge, verifyMessageSignature |
| `packages/xrpl-token-utils/tests/verify-challenge.test.ts` | 11 tests including real XRPL keypair round-trip |
| `packages/xrpl-token-utils/package.json` | Added ripple-keypairs devDependency |
| `packages/shared-anticheat/src/game-session-hmac.ts` | signGameSession / verifyGameSession |
| `packages/shared-anticheat/package.json` | Added game-session-hmac export |
| `packages/arcade-core/src/types/game-sessions.ts` | GameSessionToken, GameSessionRequest types |
| `packages/arcade-core/src/types/index.ts` | Export game-sessions |
| `packages/arcade-core/src/constants/slugs.ts` | Added "rsc" slug |
| `packages/arcade-core/src/constants/score-caps.ts` | Added rsc score cap |
| `apps/api/src/routes/game-session.ts` | Env-driven toggle, token minting |
| `apps/api/src/middleware/game-auth.ts` | HMAC validation middleware |
| `apps/web-arcade/src/app/play/rsc/page.tsx` | RSC game page with provisioning state |
| `apps/games-build/auth/xrpl-game-auth.ts` | createGameSession, formatGameChallenge re-export |
| `apps/games-build/package.json` | Added xrpl-token-utils dependency |
| `apps/games-build/openrsc/INTEGRATION_NOTES.md` | Verified local.conf template |
| `apps/games-build/openrsc/.gitkeep` | Placeholder |
| `apps/games-build/client-dist/README.md` | JAR distribution notes |
| `apps/games-build/client-dist/.gitkeep` | Placeholder |
| `apps/games-build/scripts/build-client.sh` | Gradle build placeholder |
| `apps/games-build/scripts/deploy-vps-checklist.md` | Manual deploy checklist |
| `apps/games-build/README.md` | Open-RSC integration overview |
| `tools/test-game-auth.ts` | 17-test local staging script |
| `tools/deploy-openrsc-vps.sh` | Automated VPS deploy script |
| `turbo.json` | Added GAME_SERVER_READY to globalEnv |
| `.env.example` | All env vars documented |
| `README.md` | Added Open-RSC Status section |
| `docs/how-to/vps-setup.md` | Non-technical handoff guide |
| `docs/how-to/deploy-openrsc-vps.md` | Full VPS deploy guide |
| `docs/explanation/rsc-client-distribution.md` | Client distribution options |
| `docs/reference/xrpl-distributor-setup.md` | Distributor key setup with xrpl.js code |
| `docs/runbooks/monitor-openrsc.md` | Monitoring runbook |
| `package.json` | Added test:game-auth script |
