# ═══════════════════════════════════════════════════════════════
# FUZZYNUTS GAMES — Development Environment (Optional Docker)
#
# This Dockerfile provides a consistent, portable dev environment
# for working on legacy arcade games. It is NOT required — the
# native npm workflow (npm run dev:*) works identically.
#
# Image target: < 300MB (Alpine + Node 20 + serve + concurrently)
# ═══════════════════════════════════════════════════════════════

# ── Stage 1: Base with global tooling ──────────────────────────
FROM node:20-alpine AS base

# Install system dependencies needed by sync scripts
# bash:    Scripts use bash-specific syntax (set -euo pipefail, [[ ]])
# rsync:   sync-to-main.sh uses rsync --delete for atomic file sync
# curl:    Useful for smoke-testing game URLs from inside the container
RUN apk add --no-cache bash rsync curl

# Install Node.js global tools
# serve:         Lightweight static file server (used by all dev:* scripts)
# concurrently:  Runs multiple serve instances in parallel (used by dev:all)
RUN npm install -g serve@14 concurrently@9 \
    && npm cache clean --force

# ── Stage 2: Application layer ─────────────────────────────────
WORKDIR /app

# Copy package.json first (layer cache optimization)
COPY package.json ./

# Copy all workspace files (games, scripts, shared)
# In practice, docker-compose bind-mounts override these
# but they're included for standalone `docker build` usage
COPY . .

# Ensure scripts are executable inside the container
RUN chmod +x scripts/*.sh

# ── Expose game dev server ports ───────────────────────────────
# 3001: Mario (Super Fuzzynuts)
# 3002: Fuzzy Survivors
# 3003: Fuzzy Putt (Minigolf)
# 3004: Nut Racer
# 3005: Fuzzynuts World
# 3006: New Game (Game #6)
# 3099: postMessage test harness
EXPOSE 3001 3002 3003 3004 3005 3006 3099

# ── Health check: verify at least one server responds ──────────
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3001/ || exit 1

# ── Default command: run ALL game servers simultaneously ───────
# Uses concurrently to start all 6 game servers + test harness
# Override with: docker compose run --service-ports app npm run dev:mario
CMD ["concurrently", \
    "--names",          "mario,survivors,minigolf,racer,fuzzynuts-world,new-game,harness", \
    "--prefix",         "[{name}]", \
    "--prefix-colors",  "red,magenta,cyan,yellow,green,blue,white", \
    "--kill-others-on-fail", \
    "serve mario -p 3001 -s --cors --no-clipboard", \
    "serve fuzzy-survivors -p 3002 -s --cors --no-clipboard", \
    "serve minigolf -p 3003 -s --cors --no-clipboard", \
    "serve nut-racer -p 3004 -s --cors --no-clipboard", \
    "serve fuzzynuts-world -p 3005 -s --cors --no-clipboard", \
    "serve new-game -p 3006 -s --cors --no-clipboard", \
    "serve shared -p 3099 -s --cors --no-clipboard"]
