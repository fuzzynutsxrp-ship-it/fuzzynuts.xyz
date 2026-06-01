# @fuzzynuts/mobile-capacitor

Capacitor 7 shell. Wraps the static export from `@fuzzynuts/web-arcade`.

## First-time init (one-time per machine)

These commands need real native toolchains (Android SDK / Xcode); the
sandbox cannot run them — a human runs them locally:

```bash
# Android (requires JDK 17 + Android SDK)
pnpm --filter @fuzzynuts/mobile-capacitor exec cap add android
pnpm --filter @fuzzynuts/mobile-capacitor sync
pnpm --filter @fuzzynuts/mobile-capacitor open:android

# iOS (macOS + Xcode only)
pnpm --filter @fuzzynuts/mobile-capacitor exec cap add ios
pnpm --filter @fuzzynuts/mobile-capacitor sync
pnpm --filter @fuzzynuts/mobile-capacitor open:ios
```

The generated `android/` and `ios/` folders are gitignored — each
machine regenerates them from `capacitor.config.ts`.

## Release builds

GitHub Actions does Android builds via `.github/workflows/mobile-release.yml`.
iOS is built via Xcode Cloud against this repo (separate setup).
