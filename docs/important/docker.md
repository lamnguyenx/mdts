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
- adds `git` in `docker/Dockerfile`
- copies the checkout into `/app` at startup
- installs backend and frontend dependencies with Bun
- builds the backend and frontend
- runs `bun dist/index.js --host 0.0.0.0 --port 8521 --no-open`

The Compose service is published only on `127.0.0.1` by default. To expose it on
the LAN, change the port mapping in `docker-compose.yml` deliberately; the folder
picker can browse host files readable by the container user.

## Why the Dockerfile Adds Git

mdts uses `simple-git` for repository status and diff views. The `oven/bun` image
does not include `git`, so without it `/api/filetree` returns:

```text
Error: Executable not found in $PATH: "git"
```

The Dockerfile installs only `git` on top of the upstream Bun image.

## Mounts and State

| Mount | Behavior |
| --- | --- |
| `.:/src:ro` | Read-only checkout |
| `/app` | Container-local copy used for installs and builds |
| `./exp/bun-cache:/cache` | Bun package cache, persisted across containers |
| `./exp/mdts-config:${HOME}/.config` | Writable mdts config and recent folders |
| `${HOME}:${HOME}:ro` | Host home visible to the dashboard |
| `./docker/entrypoint.sh:/entrypoint.sh:ro` | Startup script |

`./exp/` is ignored by git.

### Source copy

The host checkout is never used as the build/install directory. The entrypoint
copies `/src` to `/app`, excluding `node_modules`, `dist`, `coverage`, `.git`, and
`exp`. This prevents Bun from rewriting lockfiles or creating build output in the
host working tree.

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

`start_period` is 120 seconds because the first startup includes dependency
installation and both builds. Warm starts are typically much faster.

## Troubleshooting

### Port 8521 is already in use

Use another host port:

```bash
MDTS_PORT=9000 docker compose up -d
```

### File tree returns 500

Check the logs for a missing `git`:

```bash
docker compose logs mdts
```

Rebuild after pulling the Dockerfile changes:

```bash
docker compose build --pull
docker compose up -d
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
new bind mount is added. Paths inside the container (such as `/app`) are visible but
contain the container's copy, not the host checkout.

## Invariants

- `docker compose config --quiet` succeeds.
- `docker compose up -d --build` reaches healthy.
- `/api/folders/info` returns `daemon: true` and the host home path.
- `/api/folders/browse?path=$HOME` lists host directories.
- `/api/filetree?folder=...` works and reports `isGitRepository` correctly.
- `/api/markdown/...` serves markdown from the mounted home.
- `./exp/bun-cache` and `./exp/mdts-config` persist across container recreation.
- No `DNSResolveFailed` messages during dependency installation.

## Related Documents

- [Implementation plan](../plans/2026/10/22/2026-10-22-docker-bun-compose.md)
- [Dashboard & Multi-folder Workspaces](./dashboard-workspaces.md)
- [Advanced Configuration](../configuration.md)
- [Troubleshooting](../troubleshooting.md)
