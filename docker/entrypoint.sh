#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="${SRC_DIR:-/src}"
APP_DIR="${APP_DIR:-/app}"
CACHE_DIR="${BUN_INSTALL_CACHE_DIR:-/cache}"
PORT="${PORT:-8521}"

echo "Syncing sources from ${SRC_DIR} to ${APP_DIR}..."
mkdir -p "${APP_DIR}"
find "${APP_DIR}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +

tar -C "${SRC_DIR}" \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=coverage \
  --exclude=.git \
  --exclude=exp \
  -cf /tmp/mdts-sources.tar .
tar -C "${APP_DIR}" -xf /tmp/mdts-sources.tar
rm -f /tmp/mdts-sources.tar

cd "${APP_DIR}"

echo "Installing dependencies (Bun cache: ${CACHE_DIR})..."
bun install --no-progress
(cd packages/frontend && bun install --no-progress)

echo "Building backend..."
bun run build

echo "Building frontend..."
(cd packages/frontend && bun run build)

echo "Starting mdts dashboard on 0.0.0.0:${PORT}..."
exec bun dist/index.js --host 0.0.0.0 --port "${PORT}" --no-open
