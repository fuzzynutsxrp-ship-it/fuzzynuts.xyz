# Game thumbnail generator

Generates consistent, on-brand card thumbnails for arcade games that lack
bespoke art. Output is square PNGs matching `apps/web-arcade/public/images/games/<id>.png`
(the path `PokiGameCard` loads).

## Run

```bash
npm i @resvg/resvg-js          # one dependency (prebuilt SVG→PNG renderer)
node generate.js ./out         # writes <id>.png for each game
cp ./out/*.png ../../apps/web-arcade/public/images/games/
```

## Scope

Covers the 31 games that previously had plain placeholder images. The 7 games
with real bespoke art are intentionally NOT in the list and must not be
overwritten: mario, survivors, racer, minigolf, fuzzynuts-world, dragon-hoard,
cosmic-blaster.

Edit a game's color/genre badge/motif in `generate.js` (the GAMES array + M motif map).
