---
title: Docker on Bun
description: Stable behavior and operational notes for the Bun-based Docker Compose setup
category: Important
tags:
  - docker
  - bun
  - compose
  - dns
  - deployment
---

# Docker on Bun

This document is the reference for the Docker Compose setup. Update it when the
image, entrypoint, mounts, or networking behavior changes.

## Quick Start

```bash
docker compose up -d --build
docker compose logs -f
```

Open http://localhost:8521.

Use a different host port with:

```bash
MDTS_PORT=9000 docker compose up -d
```

Refresh the Bun base image with:

```bash
docker compose build --pull
```

## What Runs

The Compose service:

- builds `mdts-bun:latest` from `oven/bun:latest`
- mounts the checkout at `/app` (read/write)
- installs backend and frontend dependencies with Bun on startup
- watches backend sources with `bun --watch src/index.ts`
- watches frontend sources with `webpack --watch`
- serves on `0.0.0.0:8521`; code edits on the host hot reload without a rebuild

## Hot Reload

- `src/**` edits make `bun --watch` restart the backend in-place.
- `packages/frontend/src/**` (and `public/`) edits make webpack rebuild
  `dist/frontend/bundle.js`; the server broadcasts `reload-page` over the
  livereload WebSocket and every open browser tab refreshes itself.
- `node_modules` and `dist` are created inside the mounted checkout; both are
  gitignored, so the working tree still commits cleanly.
- `docker/entrypoint.sh` still provides the previous copy-and-build-once flow
  (no source mount, no watch) if you prefer an isolated runtime: switch the
  Compose `entrypoint` to `/entrypoint.sh`.

The Compose service is published only on `127.0.0.1` by default. To expose it on
the LAN, change the port mapping in `docker-compose.yml` deliberately; the folder
picker can browse host files readable by the container user.

## Mounts and State

| Mount | Behavior |
| --- | --- |
| `.:/app` | The checkout itself, mounted read/write so watchers see host edits |
| `./exp/bun-cache:/cache` | Bun package cache, persisted across containers |
| `./exp/mdts-config:${HOME}/.config` | Writable mdts config and recent folders |
| `${HOME}:${HOME}:ro` | Host home visible to the dashboard |
| `./docker/entrypoint-dev.sh:/entrypoint-dev.sh:ro` | Hot-reload startup script |
| `./docker/entrypoint.sh:/entrypoint.sh:ro` | Copy-and-build-once startup script (optional) |

`./exp/`, `node_modules/`, and `dist/` are ignored by git.

### Working tree

Installs and builds run directly inside the mounted checkout (`/app`), so
`node_modules` and `dist` appear on the host. Watchers observe the same mount,
which is what makes host edits hot reload. If you need the checkout untouched,
switch the Compose `entrypoint` to `/entrypoint.sh`, which copies sources to a
container-local directory instead.

### Home and config

`HOME` is set to the host home so the dashboard's folder picker opens there.
Because the home mount is read-only, `~/.config` is redirected to
`./exp/mdts-config`. This keeps `config.json` and `folders.json` writable and
persistent.

Requirements and caveats:

- `$HOME/.config` must exist on the host.
- The host's `.config` directory is not visible inside the container; the
  container sees the contents of `./exp/mdts-config` at that path instead.
- Only `$HOME` is mounted from the host. Other host paths are not visible unless
  added as explicit bind mounts.

## DNS

The container uses Docker's embedded resolver, which forwards to the host's
`systemd-resolved`. There is no `dns:` pin in Compose by default.

If container installs fail with:

```text
error: DNSResolveFailed downloading package manifest ...
```

check the host resolver before changing Compose:

```bash
resolvectl status
resolvectl query registry.npmjs.org
```

A common failure on multi-homed hosts is a Wi-Fi DHCP lease advertising a dead
resolver. `systemd-resolved` may select it, time out, and fall back to a working
server, making DNS intermittent.

The durable fix is on the host, not in Compose. For example, on a host with two
Wi-Fi profiles:

```bash
# Replace these profile names with your host's profiles.
sudo nmcli connection modify VAI-usb \
  ipv4.ignore-auto-dns yes \
  ipv4.dns "8.8.8.8 1.1.1.1"
sudo nmcli connection modify VAI \
  ipv4.ignore-auto-dns yes \
  ipv4.dns "8.8.8.8 1.1.1.1"
sudo nmcli device reapply wlxc006c3f6bd16
sudo resolvectl flush-caches
```

Keep any corporate split-DNS settings on the Ethernet or VPN link. Changing the
Wi-Fi profiles should not remove routing-specific DNS domains.

Only add a Compose `dns:` block as a temporary workaround when the host resolver
cannot be fixed. It bypasses the host's split-DNS policy.

## Healthcheck

The image has no `curl`, so the healthcheck uses Bun:

```text
bun -e "fetch('http://127.0.0.1:8521/api/folders/info')..."
```

`start_period` is 60 seconds: the first startup installs dependencies and builds
the frontend once; warm starts skip the install if `node_modules` is present.

## Troubleshooting

### Port 8521 is already in use

Use another host port:

```bash
MDTS_PORT=9000 docker compose up -d
```

### File tree is empty

Check that the mounted home contains markdown files and that the container user can
read them:

```bash
docker compose logs mdts
```

### DNS failures during install

Fix the host resolver as described above. Recreate the container and network after
changing DNS:

```bash
docker compose down
docker compose up -d
```

### Recent folders or settings do not persist

Check that `./exp/mdts-config` exists and is writable by the container:

```bash
ls -la exp
docker compose logs mdts
```

The mount target `$HOME/.config` must exist on the host.

### Host documents are missing from the picker

Only `$HOME` is mounted. Paths outside the host home are not available unless a
new bind mount is added. Paths inside the container (such as `/app`) are the
mounted host checkout itself in hot-reload mode.

### Backend edit did not restart the server

Verify the edit changed file **content**, not just the timestamp — a bare
`touch` does not reliably trigger `bun --watch`. Also check the watcher is
running (`docker compose logs mdts | grep "Watching backend"`).

### `error: Failed to enable File Watcher: EMFILE`

The watcher ran out of file descriptors. The container works with the default
soft limit (`ulimit -n` 1024), but very large checkouts or running
`bun --watch` on the host may exceed it. Raise the limit or add a Compose
`ulimits: { nofile: ... }` entry.

## Invariants

- `docker compose config --quiet` succeeds.
- `docker compose up -d --build` reaches healthy.
- `/api/folders/info` returns `daemon: true` and the host home path.
- `/api/folders/browse?path=$HOME` lists host directories.
- `/api/filetree?folder=...` returns the mounted folder's file tree.
- `/api/markdown/...` serves markdown from the mounted home.
- Editing a backend source file restarts the server without a container restart.
- Editing a frontend source file rebuilds the bundle and reloads open tabs.
- `./exp/bun-cache` and `./exp/mdts-config` persist across container recreation.
- No `DNSResolveFailed` messages during dependency installation.

## Related Documents

- [Implementation plan (hot reload, Mantine, Bun)](../plans/2026/10/23/2026-10-23-mantine-bun-hot-reload.md)
- [Implementation plan (original Compose setup)](../plans/2026/10/22/2026-10-22-docker-bun-compose.md)
- [Dashboard & Multi-folder Workspaces](./dashboard-workspaces.md)
- [Advanced Configuration](../configuration.md)
- [Troubleshooting](../troubleshooting.md)
