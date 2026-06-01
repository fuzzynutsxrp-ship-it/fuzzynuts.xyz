# RSC Client Distribution

## Reality Check

Modern browsers **cannot run Java applets**. The NPAPI plugin architecture
that allowed in-browser Java was removed from Chrome (2015), Firefox (2017),
and Edge (2020). There is no way to run Open_RSC_Client.jar inside a browser.

Players must download and run the JAR locally on their machine, which requires
Java 8+ installed.

## Option A: Direct JAR Download (Current Implementation)

The web frontend at `/play/rsc` provides a download button for the compiled
`Open_RSC_Client.jar`. Flow:

1. Player connects XRP wallet on `/play/rsc`
2. API verifies wallet signature, mints game session token
3. Player downloads `Open_RSC_Client.jar`
4. Player runs: `java -jar Open_RSC_Client.jar`
5. Client connects to `game.fuzzynuts.xyz:43594`

### Hosting the JAR

The JAR should be served from one of:

- **Same VPS**: Place in `/var/www/downloads/` and serve via Nginx
- **Vercel static**: Copy to `apps/web-arcade/public/games/rsc/` (limited to 100MB by Vercel)
- **S3/R2 bucket**: Most reliable for large files

### Security

The JAR should be code-signed for player trust. At minimum, provide a
SHA256 checksum alongside the download:

```bash
# Generate checksum
sha256sum Open_RSC_Client.jar > Open_RSC_Client.jar.sha256

# Players can verify:
sha256sum -c Open_RSC_Client.jar.sha256
```

[MANUAL VERIFICATION REQUIRED] — Check if Open-RSC supports or recommends
JAR signing. The signing certificate would need to be purchased from a CA.

## Option B: Browser Play via JS/WASM (Future Research)

Several projects have attempted to port RSC clients to JavaScript or
WebAssembly for true browser play:

### 2003scape/rsc-client

- **Repo**: https://github.com/2003scape/rsc-client
- **Status**: [MANUAL VERIFICATION REQUIRED] — check current state
- **Approach**: JavaScript reimplementation of the RSC client
- **Compatibility**: Partial — not all game features work
- **Effort**: Significant integration work required to:
  - Connect to Open-RSC server protocol
  - Handle game assets (sprites, maps, models)
  - Implement the game loop in browser
  - Match the auth flow (session tokens)

### RSCMinimap/rsc-canvas

- **Approach**: Canvas-based rendering of RSC maps
- **Status**: Research only, not a playable client

### Recommendation

Option B is a research item for a future sprint. The JS/WASM client
ecosystem for RSC is immature and would require significant custom
development. For now, Option A (JAR download) is the pragmatic choice.

If browser play becomes a priority, evaluate:
1. Whether 2003scape/rsc-client can connect to an Open-RSC server
2. What game features are missing
3. Whether the effort justifies the improved UX
4. Security implications of running untrusted WASM in the browser

## Client Configuration

The Open-RSC client reads server connection details from config files
in its working directory:

| File | Content | Default |
|------|---------|---------|
| `ip.txt` | Server hostname | `fuzzynuts.xyz` |
| `port.txt` | Server port | `43594` |

If the client can't auto-detect these values, players can manually
edit the files. The `/play/rsc` page includes fallback instructions.
