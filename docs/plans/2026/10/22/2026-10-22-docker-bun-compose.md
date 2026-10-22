---
title: Docker Compose on Bun
description: Implementation plan and retrospective for running mdts in a Bun-based Docker Compose setup
category: Plan
tags:
  - docker
  - bun
  - compose
  - dns
  - retrospective
---

# Docker Compose on Bun

- **Date:** 2026-10-22
- **Status:** Implemented
- **Components:** Docker, Docker Compose, Bun, host DNS
- **Primary files:** `docker-compose.yml`, `docker/Dockerfile`,
  `docker/entrypoint.sh`, `.dockerignore`, `.gitignore`, `README.md`

## Summary

Added a local Docker Compose setup that runs the mdts dashboard from the current
checkout using the latest `oven/bun` image.

The setup:

- builds from `oven/bun:latest`
- adds `git`, which mdts needs for file status and diffs
- keeps Bun's package cache in `./exp/bun-cache`
- keeps mdts config and recent folders in `./exp/mdts-config`
- mounts the host `$HOME` read-only so the dashboard can browse real documents
- copies the checkout into the container before installing/building, leaving the
  host working tree untouched
- serves on `127.0.0.1:8521` by default, with `MDTS_PORT` as an override

## Motivation

The normal workflow is `npx mdts` on a host with Node.js. The container setup was
wanted to:

- run mdts on Bun without installing Node/npm locally
- keep the dashboard workflow and multi-folder support
- browse host documents from inside the container
- preserve package downloads across container recreations
- avoid modifying the checkout during container startup

## Design

### Base image and Dockerfile

`docker/Dockerfile` is intentionally small:

```dockerfile
FROM oven/bun:latest

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*
```

The Bun image has no Node, npm, or git. Bun can run the TypeScript compiler and
webpack, but mdts calls `git` through `simple-git` for the file tree and diffs. The
image therefore only adds the missing OS package.

### Source copy instead of a writable bind mount

The host checkout is mounted read-only at `/src`. The entrypoint copies it to
`/app` inside the container, excluding:

- `node_modules`
- `dist`
- `coverage`
- `.git`
- `exp`

This keeps the host tree clean. A writable bind mount would have let Bun update
`bun.lock`, create `packages/frontend/bun.lock`, and write build output into the
checkout.

### Runtime entrypoint

`docker/entrypoint.sh`:

1. clears `/app`
2. copies the filtered source from `/src`
3. runs `bun install` for the backend and frontend
4. builds backend and frontend with Bun
5. starts `bun dist/index.js --host 0.0.0.0 --port 8521 --no-open`

The root `build:frontend` script uses `npm`, which is not present in the image, so
the entrypoint invokes the frontend build directly:

```bash
(cd packages/frontend && bun run build)
```

### Compose state and mounts

| Mount | Purpose |
| --- | --- |
| `.:/src:ro` | Read-only source checkout |
| `./exp/bun-cache:/cache` | Persistent Bun package cache |
| `./exp/mdts-config:${HOME}/.config` | Writable mdts config and recent folders |
| `${HOME}:${HOME}:ro` | Host documents visible to the folder picker |
| `./docker/entrypoint.sh:/entrypoint.sh:ro` | Startup script |

`HOME` is set to the host home so the dashboard's folder picker opens at the real
home directory. Because `$HOME` is read-only, the container's `~/.config` is
redirected to `./exp/mdts-config`. This requires `$HOME/.config` to exist on the
host.

### Networking and DNS

The container publishes only on localhost by default:

```yaml
ports:
  - "127.0.0.1:${MDTS_PORT:-8521}:8521"
```

Docker's embedded resolver forwards to the host's `systemd-resolved`. On this
host, the Wi-Fi DHCP lease advertised a dead resolver, `103.151.56.23`, which
caused intermittent `DNSResolveFailed` errors during `bun install`.

The first workaround pinned public resolvers in Compose. That fixed the symptom
but bypassed the host's DNS policy. The final fix was on the host:

- keep corporate split DNS on `Wired connection 1`
- make `VAI-usb` and the `VAI` fallback ignore DHCP DNS
- use static `8.8.8.8` / `1.1.1.1` for Wi-Fi
- remove the Compose `dns:` block

The host-side details and revert commands are documented in the separate
`~/git/xdgg-private/Proxy/ethernet-policy-routing-squid.md` networking document.

### Healthcheck

The Compose healthcheck uses Bun itself, since the image has no curl:

```yaml
test:
  - CMD
  - bun
  - -e
  - "fetch('http://127.0.0.1:8521/api/folders/info').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
```

A 120-second `start_period` covers the first cold install and build.

## Trials, Errors and Fixes

### 1. The Bun image has no git

**Error:** `/api/filetree` returned `500`:

```text
Error: Executable not found in $PATH: "git"
```

**Cause:** `simple-git` shells out to `git`; the `oven/bun` image does not include
it.

**Fix:** Added a Dockerfile that installs `git` on top of `oven/bun:latest`.

### 2. There is no Node or npm in the image

**Trial:** Reuse the package scripts directly.

**Error:** The root `build:frontend` script runs `npm run build`, and
`node dist/index.js` is not available.

**Fix:** Run the tools through Bun and start the built server with Bun:

```bash
bun run build
(cd packages/frontend && bun run build)
exec bun dist/index.js --host 0.0.0.0 --port 8521 --no-open
```

Bun successfully ran `tsc` and webpack despite their Node shebangs.

### 3. Host DNS was intermittently broken

**Error:** On a cold container start:

```text
error: DNSResolveFailed downloading package manifest markdown-it
error: markdown-it@^15.0.0 failed to resolve
```

**Cause:** The Wi-Fi DHCP resolver `103.151.56.23` does not answer direct queries.
`systemd-resolved` could select it, time out, and fall back to `8.8.8.8`. Docker's
embedded resolver inherits that behaviour, so container installs failed
intermittently.

**First fix:** Pinned `8.8.8.8` and `1.1.1.1` in Compose. This made startup
reliable but bypassed the host resolver and would break any internal DNS names
needed by the container.

**Final fix:** Repaired the host DNS profiles:

```bash
sudo nmcli connection modify VAI-usb \
  ipv4.ignore-auto-dns yes \
  ipv4.dns "8.8.8.8 1.1.1.1"
sudo nmcli connection modify VAI \
  ipv4.ignore-auto-dns yes \
  ipv4.dns "8.8.8.8 1.1.1.1"
sudo nmcli device reapply wlxc006c3f6bd16
sudo resolvectl flush-caches
```

The corporate split DNS on `Wired connection 1` was left untouched. Afterward
`resolvectl query hub.vtcc.vn` still returned `10.30.154.118` via `enp15s0`, and
the Compose `dns:` block was removed.

### 4. A stale Compose network made DNS look permanently broken

**Trial:** Restart the existing container after the network transition.

**Error:** The same `DNSResolveFailed` errors returned even though a fresh
`docker run` on the same network could reach the registry.

**Fix:** Recreate the container and network with `docker compose down` followed by
`docker compose up -d`. A new container attached to a freshly created network
resolved correctly. The final host DNS fix removed the underlying trigger.

### 5. A writable bind mount dirtied the checkout

**Trial:** Mount the repository directly at `/app` and run Bun installs there.

**Error:** `bun install` rewrote the root `bun.lock` and created
`packages/frontend/bun.lock`; builds also wrote into `dist`.

**Fix:** Mount the source read-only at `/src` and copy it into `/app` at startup.
The host checkout remains unchanged.

### 6. Read-only home conflicts with mdts state

**Error:** mdts writes `config.json` and `folders.json` under `~/.config/mdts`. The
home mount is read-only.

**Fix:** Redirect the container's `~/.config` to `./exp/mdts-config`. The rest of
`$HOME` stays read-only. This also persists settings and recents across container
recreations.

**Caveat:** The host's `.config` is hidden inside the container, and
`$HOME/.config` must already exist on the host for the nested mount to work.

### 7. Port 8521 was already in use during testing

**Error:** Docker could not bind `127.0.0.1:8521` because a local mdts process was
already listening.

**Fix:** Tested with `MDTS_PORT=18521`. The Compose default remains `8521`.

### 8. `HOME` had to be explicit

**Error:** Without `HOME`, the container's home was `/root`, so the dashboard's
folder picker opened there instead of the host home.

**Fix:** Set `HOME: "${HOME:?HOME must be set}"` and mount the same path read-only.
Compose now fails early with a clear message if `HOME` is unset.

### 9. Warm starts still rebuild

**Observation:** The entrypoint always copies, installs, and builds. With a warm
Bun cache this took about 10–16 seconds; a cold start took longer.

**Decision:** Keep the startup deterministic for now. Baking dependencies and the
build into the image would make `up` faster, but it would also make source changes
require an image rebuild.

### 10. Pre-existing frontend warnings

Webpack reports missing type-only exports such as `FileTreeItem`, `RootState`,
`AppDispatch`, and MUI `Theme`. These are existing build warnings from Babel
type-import handling, not new Docker failures. The frontend build still completes.

## Lessons Learnt

1. **A Bun runtime image is not a Node image.** Bun can run Node CLIs, but it does
   not provide `node`, `npm`, or OS tools such as `git`.
2. **Check native command dependencies.** mdts looks like pure JavaScript but
   shells out to `git`; the container needs that binary.
3. **Fix the host resolver, not just the container.** Pinning public DNS in
   Compose is a useful emergency workaround, but it bypasses split DNS and hides
   the real problem.
4. **Keep corporate and public DNS scopes separate.** The correct fix changed
   only the Wi-Fi profiles; the Ethernet corporate routing domains stayed intact.
5. **Read-only source plus an internal copy is the safest dev-container model.**
   It prevents lockfile churn and accidental build artifacts in the checkout.
6. **Persist caches outside the repository but keep them out of git.** `./exp` is
   convenient and already ignored.
7. **Use real Compose/network tests.** Unit tests would not have caught the
   missing `git`, the DNS fallback, or the port conflict.
8. **Document environment prerequisites.** The `$HOME/.config` requirement and
   host DNS assumptions are part of the setup, not incidental details.

## Verification

- `docker compose build --pull` — passed
- `docker compose config --quiet` — passed
- `bash -n docker/entrypoint.sh` — passed
- Fresh Compose network, warm cache — healthy in 16 seconds
- Dashboard `/` — `200`
- `/api/folders/info` — dashboard mode, host home reported
- `/api/folders/browse?path=$HOME` — listed host directories
- `/api/filetree?folder=...` — `isGitRepository: true`
- `/api/markdown/README.md?folder=...` — served markdown
- Recent folders persisted under `./exp/mdts-config`
- No `DNSResolveFailed` errors after the host fix
- Corporate DNS still resolved `hub.vtcc.vn` via `enp15s0`

## File Changes

| Area | Files |
| --- | --- |
| Compose service | `docker-compose.yml` |
| Image | `docker/Dockerfile` |
| Startup | `docker/entrypoint.sh` |
| Build context | `.dockerignore` |
| Ignored runtime state | `.gitignore` (`exp/`) |
| Usage documentation | `README.md` |
| Reference documentation | `docs/important/docker.md`, `docs/important/README.md` |

## Follow-ups

- Add a `MDTS_CONFIG_DIR` option so the container does not need to shadow
  `~/.config`.
- Consider a production-oriented image that bakes dependencies and builds, while
  keeping the current compose file for source-based development.
- Add a CI smoke test that runs `docker compose up` and checks
  `/api/folders/info`.
- Add authentication before exposing the dashboard beyond localhost.
