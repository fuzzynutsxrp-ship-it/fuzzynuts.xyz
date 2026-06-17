---
title: Third-party game assets — IP notes
diataxis: reference
last_verified: 2026-05-31
---

# Third-party game assets — IP notes

Some game folders under `apps/games-build/games/` contain assets
originating from third parties. Read this before redistributing.

| Game                                                              | Notes                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mario/`                                                          | Derivative of FullScreenMario; upstream received a Nintendo DMCA takedown in 2014. Sprites, level data, and music are arguably Nintendo IP. MIT-licensing the monorepo does not relicense these assets. Do not ship as a standalone product. |
| `minigolf/`, `nut-racer/`, `fuzzy-survivors/`, `fuzzynuts-world/` | Original work, MIT-compatible.                                                                                                                                                                                                               |

If you intend to publish a desktop or mobile bundle that includes
`mario/`, replace the affected assets first.
