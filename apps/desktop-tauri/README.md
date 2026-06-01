# @fuzzynuts/desktop-tauri

Tauri 2.x desktop shell wrapping the static export from
`@fuzzynuts/web-arcade`.

## First build (Linux)

Install Rust + WebKitGTK deps as in `HERMES.md §0` / `docs/runbooks/`:

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget \
  file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

pnpm install
pnpm --filter @fuzzynuts/desktop-tauri tauri dev    # dev (hot-reload)
pnpm --filter @fuzzynuts/desktop-tauri tauri build  # release bundle
```

Bundles land in `src-tauri/target/release/bundle/`.

## Icons

`src-tauri/icons/` is empty in the scaffold. Generate from a single 1024x1024 source:

```bash
pnpm --filter @fuzzynuts/desktop-tauri tauri icon path/to/icon.png
```
