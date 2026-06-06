# Deploy: Secure Cookie Auth (OWASP Compliant)

## Security Upgrade

**Before (insecure):**
```
Parent page → API (get credentials) → URL hash (password exposed) → iframe
```

**After (secure):**
```
Parent page → load iframe (clean URL) → iframe fetches API (credentials: include) → API reads HttpOnly cookie → returns credentials
```

**Security properties:**
- HttpOnly cookie = JS cannot read the token
- SameSite=none + Secure = cross-subdomain works
- Iframe fetches credentials directly = parent page NEVER sees password
- Clean URL = no password leakage in browser history/logs
- Credentials cleared from JS memory immediately after use

## Files Modified

1. `apps/api/src/routes/rsc.ts` — reads wallet from HttpOnly JWT cookie
2. `apps/api/src/server.ts` — added `game.fuzzynuts.xyz` to CORS, passes `WALLET_JWT_SECRET` to RSC router
3. `apps/web-arcade/public/games/rsc/index.html` — removed all password handling, clean URL only
4. `tools/fix-teavm-js-autologin.sh` — fetches credentials internally via cookie

## Deploy Steps

### 1. Railway Environment Variables

Ensure `WALLET_JWT_SECRET` is set in Railway (same value as in the auth router).
This is needed for the RSC router to verify the JWT cookie.

### 2. Update VPS (copy-paste into SSH or DigitalOcean console)

```bash
curl -fsSL https://raw.githubusercontent.com/fuzzynutsxrp-ship-it/fuzzynuts.xyz/main/tools/fix-teavm-js-autologin.sh | bash
```

### 3. Deploy FuzzyNuts Landing Page

Push to main and Vercel auto-deploys:

```bash
cd ~/Documents/AI\ Tools/FuzzyNuts\ Optimized/fuzzynuts-optimized
git push origin main
```

## Verify

1. Connect wallet on fuzzynuts.xyz (sets HttpOnly cookie)
2. Click "Play Now" on RSC
3. Should see: "Connecting to game server..." overlay
4. Iframe loads `game.fuzzynuts.xyz` (clean URL, no hash params)
5. Iframe fetches credentials from API using cookie
6. Auto-login runs invisibly
7. Overlay fades, game appears

## OWASP Compliance

- **A04:2021 (Insecure Design):** Credentials never leave the server-to-iframe channel
- **A01:2021 (Broken Access Control):** HttpOnly cookie prevents XSS token theft
- **A02:2021 (Cryptographic Failures):** JWT signed with HS256, verified on every request
- **A05:2021 (Security Misconfiguration):** SameSite=none requires Secure flag

## Rollback

```bash
# Restore previous version on VPS
cp /var/www/rsc-client/backup-autologin-*.html /var/www/rsc-client/index.html
```
