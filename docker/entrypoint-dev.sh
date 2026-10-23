#!/usr/bin/env bash
# Hot-reload dev mode: the checkout is mounted at /app (read/write) and this
# entrypoint keeps both watchers running. Editing sources on the host applies
# changes without rebuilding the image or restarting the container:
#
#   - backend:  `bun --watch src/index.ts` restarts the server on src changes
#   - frontend: `webpack --watch` rebuilds dist/frontend/bundle.js; the server
#     broadcasts a reload-page event over the livereload WebSocket so open
#     browsers refresh themselves.
set -euo pipefail

PORT="${PORT:-8521}"
CACHE_DIR="${BUN_INSTALL_CACHE_DIR:-/cache}"

cd /app

echo "Installing dependencies (Bun cache: ${CACHE_DIR})..."
bun install --no-progress
(cd packages/frontend && bun install --no-progress)

echo "Building frontend once for a fast first load..."
(cd packages/frontend && bun run build)

pids=()
cleanup() {
  for pid in "${pids[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

echo "Watching backend sources (bun --watch src/index.ts)..."
bun --watch src/index.ts --host 0.0.0.0 --port "${PORT}" --no-open &
pids+=($!)

echo "Watching frontend sources (webpack --watch)..."
(cd packages/frontend && bun run build -- --watch) &
pids+=($!)

echo "mdts dev server ready on 0.0.0.0:${PORT} — edit files on the host to hot reload."
# Exit (and let Compose restart us) as soon as either watcher dies.
wait -n
status=$?
echo "A watcher exited unexpectedly (status ${status}); restarting container..." >&2
exit "$status"
