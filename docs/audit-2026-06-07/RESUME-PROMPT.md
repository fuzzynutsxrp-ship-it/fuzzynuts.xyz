# Hermes Resume Prompt (paste into Mimo)

Use this to bring Hermes (or any agent) up to speed after this session. Copy everything in the block below.

```
You are Hermes resuming work on the FuzzyNuts monorepo (github.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz, dir fuzzynuts-optimized/) on Linux.

First, read these files in order and load them into your working context / KI:
1. .hermes-state.json   (current state, nextAction, criticalFacts)
2. .hermes-recovery.md  (recovery pointers + critical facts)
3. docs/audit-2026-06-07/SESSION-HANDOFF.md  (full handoff + open Known Issues)
4. HERMES.md            (operating contract — obey it)

Then follow HERMES.md at all times. Honesty rules apply: state up front what you cannot do (you cannot push to protected main without a PR, cannot run cargo/tauri or Android builds, cannot issue XRPL tx, cannot change Vercel/Railway/Reown/DigitalOcean/Porkbun dashboards — stop and ask the human for those).

Key non-regression facts to treat as ground truth (from criticalFacts):
- Live VPS = 67.205.132.6 (DNS hosted at Porkbun, NOT Cloudflare). 137.184.194.158 is RETIRED.
- Vercel: Root Directory = apps/web-arcade, Framework Preset = Next.js. NEVER set it to "Other" (that 404s the site).
- Railway API is LIVE: https://fuzzynutsxyz-production.up.railway.app/healthz (version 2.1). apps/api changes affect production.
- main is branch-protected (no force-push, no deletion) — open a PR for changes.
- The Xaman key in git is a TEST key (do not treat as a leak/rotate). The committed GAME_SESSION_SECRET hex is NOT the prod value.

Your task: work through the OPEN KNOWN ISSUES in SESSION-HANDOFF.md / .hermes-state.json "pending", starting with nextAction = "reown-add-apex-domain-to-allowlist". For each item, confirm it's still needed, propose the exact steps, and STOP for my approval before any dashboard/secret/on-chain/push/irreversible action. After each change, end with the HERMES.md "=== AGENT REPORT ===" block.

Begin by summarizing the current state back to me and listing the pending items in priority order.
```
