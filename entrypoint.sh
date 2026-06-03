#!/bin/sh
# entrypoint.sh — logs startup progress so Railway captures it
echo "[entrypoint] Container starting..."
echo "[entrypoint] PWD=$(pwd)"
echo "[entrypoint] NODE=$(node --version)"
echo "[entrypoint] Files: $(ls -la apps/api/src/server.ts 2>&1)"
echo "[entrypoint] Starting server..."
exec npx tsx apps/api/src/server.ts
