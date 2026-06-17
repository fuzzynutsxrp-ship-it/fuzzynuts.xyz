# client-dist/ — Compiled Open-RSC Client

Place the compiled `Open_RSC_Client.jar` here after building from the
Open-RSC source tree on the VPS or build machine.

## Build Command (on VPS/build machine)

```bash
cd /opt/openrsc/client
ant compile
# Output: Open_RSC_Client.jar (location depends on Open-RSC version)
```

[MANUAL VERIFICATION REQUIRED] — Check the actual output path in your
Open-RSC version. The JAR may be at `client/Open_RSC_Client.jar` or
`client/dist/Open_RSC_Client.jar`.

## Distribution

The web frontend at `/play/rsc` will reference this path for the download
flow. In production, the JAR should be:

1. Hosted on the same VPS as the game server (or a CDN)
2. Code-signed for player trust
3. Accompanied by a SHA256 checksum for verification

```bash
# Generate checksum
sha256sum Open_RSC_Client.jar > Open_RSC_Client.jar.sha256
```

## Web Download Flow

Players will:

1. Connect their XRP wallet on `/play/rsc`
2. Receive a game session token
3. Download `Open_RSC_Client.jar`
4. Run locally (requires Java 8+ on their machine)
5. Client connects to `game.fuzzynuts.xyz:43594`

## Future: Browser Play

See `docs/explanation/rsc-client-distribution.md` for research notes on
JS/WebAssembly client alternatives.
