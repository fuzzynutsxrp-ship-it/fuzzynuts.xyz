FUZZYNUTS HERO BACKGROUND VIDEO — ASSET INSTRUCTIONS
=====================================================

Target file: public/videos/hero-background.mp4
Used by:     src/components/hero/HeroVideoBackground.tsx
Fallback:    public/images/hero-fallback.webp (first frame of the video)

----------------------------------------------------------------------
SPECS
----------------------------------------------------------------------
Resolution:  1920 x 1080  (16:9, landscape — covered for mobile via object-cover)
Framerate:   30 fps
Duration:    ~10 seconds, seamless loop (last frame ≈ first frame)
Codec:       H.264 (libx264), High profile, level 4.1
Bitrate:     ~2 Mbps (target ~5 MB final file size)
Audio:       NONE — muted-only autoplay, audio strip saves bandwidth
Color:       Rec.709, 8-bit

----------------------------------------------------------------------
PRODUCTION (concept art → animated loop)
----------------------------------------------------------------------
Option A — After Effects
  1. Import concept image as a still
  2. Camera Lens Blur + slow parallax (translate ±20px over 10s)
  3. Add particle layer (Trapcode Particular: 80 motes, gold/cyan/purple)
  4. Add light beams (CC Light Rays from upper-left)
  5. Render: Composition → Add to Render Queue → H.264, 1920×1080, 30fps

Option B — Blender
  1. Image plane + camera dolly across 10s timeline
  2. Add volumetric world with cyan/purple emission
  3. Render → ffmpeg encode (see command below)

Option C — DaVinci Resolve (free)
  1. Drop concept image, set duration 10s
  2. Apply Resolve FX → Light Rays
  3. Add Particle Effect from Fusion page
  4. Deliver → H.264, 1920x1080, 30fps, AAC audio bitrate 0 (no audio)

----------------------------------------------------------------------
FFMPEG OPTIMIZATION (after rendering at any bitrate)
----------------------------------------------------------------------
Run this against your raw render to hit the ~5 MB target:

  ffmpeg -i raw.mov \
    -c:v libx264 -profile:v high -level 4.1 \
    -preset slow -b:v 2M -maxrate 2.4M -bufsize 4M \
    -pix_fmt yuv420p -movflags +faststart \
    -an \
    -vf "scale=1920:1080:flags=lanczos" \
    public/videos/hero-background.mp4

Generate the WebP fallback from the first frame:

  ffmpeg -i public/videos/hero-background.mp4 -frames:v 1 \
    -c:v libwebp -quality 85 \
    public/images/hero-fallback.webp

----------------------------------------------------------------------
QUICK FALLBACK (NO VIDEO YET)
----------------------------------------------------------------------
The HeroVideoBackground component falls back to the WebP if the video
element errors. While you produce the real video, copy any existing
hero image into the fallback slot so the page never shows a blank
background:

  cp public/images/hero/hero-bg.jpg public/images/hero-fallback.webp

(WebP and JPG share the same file extension role here — the <Image>
component will load either; ideally re-encode for size.)
