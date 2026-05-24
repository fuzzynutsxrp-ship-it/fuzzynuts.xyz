# Hero Background Assets

Used by [src/components/hero/HeroBackground.tsx](../../src/components/hero/HeroBackground.tsx).

## Files

| Path                                 | Spec                                   | Use                                                                                     |
| ------------------------------------ | -------------------------------------- | --------------------------------------------------------------------------------------- |
| `public/images/hero-bg-desktop.webp` | 1920 × 1080, WebP, quality 80, ~200 KB | Desktop / tablet                                                                        |
| `public/images/hero-bg-mobile.webp`  | 1080 × 1920, WebP, quality 80, ~150 KB | Mobile portrait                                                                         |
| `public/images/hero-fallback.webp`   | Either dimension, any size             | <video> poster + legacy `<Image>` fallback in the older `HeroVideoBackground` component |

## Current state

Both `hero-bg-desktop.webp` and `hero-bg-mobile.webp` were initially
seeded with the existing JPGs from `public/images/hero/hero-bg.jpg`
and `hero-bg-mobile.jpg`. The `.webp` extension is a hint to the
browser, but the actual file bytes are still JPEG — most browsers
content-sniff and render fine, but file sizes are larger than they
would be with real WebP encoding.

## Producing the real WebP files

### ffmpeg (already on most systems)

```bash
ffmpeg -i public/images/hero/hero-bg.jpg \
  -vf "scale=1920:1080:flags=lanczos" \
  -c:v libwebp -quality 80 -compression_level 6 \
  public/images/hero-bg-desktop.webp

ffmpeg -i public/images/hero/hero-bg-mobile.jpg \
  -vf "scale=1080:1920:flags=lanczos" \
  -c:v libwebp -quality 80 -compression_level 6 \
  public/images/hero-bg-mobile.webp
```

### Squoosh CLI (Google's WebP encoder, smaller output)

```bash
npx @squoosh/cli \
  --webp '{"quality":80,"method":6}' \
  --resize '{"enabled":true,"width":1920,"height":1080}' \
  -d public/images/ \
  public/images/hero/hero-bg.jpg

# (Renames output — adjust as needed)
```

### Design notes (when commissioning new artwork)

- **Theme:** dark mystical cyber-forest at dusk
- **Vibe:** ancient gnarled trees, glowing neon biomechanical vines
  (cyan / electric blue / neon green / hot magenta), thick volumetric
  fog, optional retro arcade cabinets in mid-ground, faint cyberpunk
  skyline through the trees
- **Composition:** leave the center ~60% relatively dark and uncluttered
  so the foreground HUD (logo, title, CTAs, vault teaser, stats grid)
  stays legible
- **Don't:** rely on the photo for game discovery — it's pure backdrop;
  the GamesShowcase section below the hero handles navigation
