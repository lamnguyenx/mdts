---
title: Mantine, Bun and Docker Hot Reload
description: Implementation plan and retrospective for the MUI-to-Mantine migration, the Bun toolchain, git removal, and hot-reloading Docker Compose
category: Plan
tags:
  - mantine
  - bun
  - docker
  - webpack
  - hot-reload
  - retrospective
---

# Mantine, Bun and Docker Hot Reload

- **Date:** 2026-10-22 – 2026-10-23
- **Status:** Implemented
- **Components:** React frontend, Mantine 9, Bun 1.4, webpack, Docker Compose, chokidar,
  livereload WebSocket
- **Primary files:** `packages/frontend/src/**`, `src/server/server.ts`,
  `src/server/watcher.ts`, `docker-compose.yml`, `docker/entrypoint-dev.sh`,
  `package.json`, `packages/frontend/package.json`
- **Commits:** `6aa86ff` (Mantine + Bun), `9077716` (compact UI, git removal, hot
  reload), plus the file-tree fixes described here

## Summary

Four related efforts landed in one arc:

1. **MUI → Mantine.** All components, hooks, tests, and snapshots were migrated
   from MUI + Emotion to Mantine 9.7.3 with `@tabler/icons-react`. A theme adapter
   (`AppThemeProvider` + a rewritten `useTheme`) maps the existing 20+ custom
   themes onto Mantine CSS variables.
2. **Bun toolchain.** Package scripts, the Makefile, CI workflows, and lockfiles
   moved to Bun 1.4. Jest still runs on Node.
3. **Compact UI.** Header 52px (`--app-header-height`), sidebars 260/56px, tighter
   markdown spacing, smaller settings modal.
4. **Git removal.** Last Commit tab, Diff tab, `diffSlice`, `/api/diff` +
   `/api/diff-prev` routes, `isGitRepository`, git status colors, and the
   `simple-git` dependency were removed. The Docker image no longer installs git.
5. **Docker hot reload.** `docker-compose.yml` now mounts the checkout into the
   container and watches it: backend edits restart the server via
   `bun --watch src/index.ts`, frontend edits rebuild the bundle via
   `webpack --watch`, and a new `reload-page` WebSocket event refreshes open
   browser tabs.

## Motivation

- Drop the heavyweight MUI/Emotion stack for Mantine's CSS-variable theming and
  smaller component surface.
- Use one modern toolchain (Bun) consistently: local dev, CI, and Docker.
- A compact UI — more document, less chrome.
- Git metadata was unused noise for a markdown preview tool.
- The old Compose setup copied the checkout and rebuilt on every start; code
  changes required a container restart or full rebuild. Editing sources on the
  host should apply immediately.

## Design

### Theme adapter

Mantine's `MantineProvider` receives a theme object built by `useTheme()`;
`cssVariablesResolver` maps custom keys onto CSS variables
(`--app-background`, `--app-paper`, `--app-primary`). Components consume the
CSS variables instead of MUI theme objects, so the 20+ existing themes survive
unchanged.

### Running TypeScript directly (dev mode)

`createApp` located static assets via `__dirname`: `./public` and
`../frontend` relative to `dist/server`. Running `bun src/index.ts` puts
`__dirname` at `src/server`, where neither path exists. Instead of maintaining
a parallel build pipeline, `resolveStaticRoots()` now tries fallback candidates
and picks the first that exists:

| Asset | Compiled (`dist/server`) | Dev (`src/server`) |
| --- | --- | --- |
| `public/` | `dist/server/public` | `<repo>/public` |
| frontend bundle | `dist/frontend` | `<repo>/dist/frontend` |

Production behavior is unchanged; dev mode needs no backend build at all.

### Hot reload chain

```
host edit ──► /app mount ──► watcher
  src/**            ──► bun --watch restarts the backend
  packages/frontend ──► webpack --watch rebuilds dist/frontend/bundle.js
                          └─► chokidar sees the bundle change (300ms debounce)
                                └─► server broadcasts reload-page to all WS clients
                                      └─► window.location.reload()
```

`reload-page` reuses the existing livereload WebSocket, so no new transport or
port was needed. `docker/entrypoint-dev.sh` installs dependencies, does one
initial frontend build, starts both watchers, and `wait -n`s so Compose's
restart policy recovers the container if either watcher dies. The previous
copy-and-build flow remains available as `docker/entrypoint.sh`.

### Tests under Mantine

`packages/frontend/test/setupTests.ts` wraps `render`/`renderHook` in a
`MantineProvider` centrally, adds a `useId` mock, and polyfills
`ResizeObserver` — individual component tests need no provider boilerplate.

## Trials, Errors and Fixes

### 1. Jest broke under Bun's runtime

**Trial:** `bun --bun jest` to run everything on Bun.

**Error:** Store tests failed — Bun's module handling clashed with Jest's
`jest.resetModules()` / dynamic-import patterns.

**Fix:** Keep Jest on Node: scripts call `node node_modules/jest/bin/jest.js`
(invoked via `bun run` for script resolution only). Bun manages deps and
builds; Node 24 runs Jest.

### 2. Haste map collisions from the Bun cache

**Error:** Jest reported duplicate module names — the mounted `exp/bun-cache`
directory sat inside the Jest scan roots in Docker.

**Fix:** Limit `jest.config.js` / `jest-lint.config.js` `roots` to `test` and
`src`, and exclude `exp` in `tsconfig.json`.

### 3. Initial hot-reload design: `tsc --watch` + restarting bun

**Trial:** Compile with `tsc --watch`, restart `bun dist/index.js` on output
changes.

**Problem:** Two-step chain, stale-build risk, and a redundant backend build.

**Fix:** `bun --watch src/index.ts` runs TypeScript directly and restarts on
imported-file changes. This required `resolveStaticRoots()` (above) and nothing
else.

### 4. `touch` didn't trigger a backend restart

**Trial:** Verify hot reload by `touch src/server/routes/outline.ts`.

**Result:** No restart — a metadata-only change produced no watcher event
inside the container.

**Fix (test, not code):** Probe with a real content edit (append a comment),
then `git checkout --` the file. Confirmed restart in-place, server stayed
healthy.

### 5. Local `bun --watch` hit EMFILE

**Error:** `error: Failed to enable File Watcher: EMFILE` on the host —
`ulimit -n` is 1024 and the checkout has a large `node_modules`.

**Observation:** The container runs fine with the same soft limit (fewer
concurrently open files). Still worth raising `ulimit`s if local watch mode is
used heavily.

### 6. Test expectation for the new watcher argument

**Error after adding the bundle path to `setupWatcher`:** the assertion failed.
The first fix built the expected path from the *test's* `__dirname`
(`test/dist/frontend/...`), but ts-jest executes server code from `src/`, so
the real path resolved to `<repo>/dist/frontend`.

**Fix:** Assert shape, not absolute path:
`expect.stringMatching(/dist\/frontend[\/\\]bundle\.js$/)`.

### 7. File Tree rendered as a flat list

**Symptom:** After the Mantine migration, the file tree showed every entry at
the same indentation.

**Cause (the good kind of bug):** Mantine's `Tree` indents nested nodes via a
*class* on the label element: `padding-inline-start: var(--label-offset)`. The
custom `renderNode` spread `elementProps` (keeping the class) but then set
inline `style.padding: '1px 4px'` — an inline shorthand beats the class-based
longhand, resetting the indent on every node.

**Fix:** Use longhands that leave the indent alone:

```diff
- padding: '1px 4px',
+ paddingBlock: '1px',
+ paddingInlineEnd: 4,
```

**Extra lesson:** The snapshot tests "passed" before *and after* the fix — they
had faithfully captured the broken flat layout as expected output. Snapshots
cement regressions as easily as they catch them; a visual check caught what
317 tests couldn't.

### 8. Restoring tree guide lines

**Request:** The `├──` / `│` / `└──` connectors from the MUI tree were missing.

**Fix:** Built into Mantine — `withLines` + `levelOffset="md"` on `<Tree>`.
Lines are CSS borders using `--mantine-color-default-border`, so they follow
light/dark themes automatically. No custom CSS needed.

### 9. Playwright verification had its own traps

- The `playwright` Python module wasn't installed, but browser binaries were
  cached under `~/.cache/ms-playwright` — install the package and point
  `executable_path` at the cached Chromium.
- Measuring the bounding box of `<li>` rows showed identical X for all levels
  (padding lives inside the border box). Measure the *content* (icon) or read
  `getComputedStyle(...).paddingInlineStart` instead.
- A transient `WebSocket error` console message appeared during probing; an
  explicit connect test confirmed the livereload socket was fine.

## Lessons Learnt

1. **Inline shorthand styles can silently cancel library CSS.** When spreading
   a library's `elementProps`, never override longhand properties with a
   shorthand. MUI's tree owned its indentation through props; Mantine's owns it
   through a class — know which mechanism you're overriding.
2. **Snapshot tests normalize bugs.** A migration that renders *consistently
   wrong* will update snapshots to canonize the bug. Pair large UI migrations
   with at least one live visual check (screenshot or DOM-shape probe).
3. **Run the source instead of rebuilding it when the runtime can.** `bun --watch
   src/index.ts` replaced an entire watch-and-rebuild pipeline. The cost was
   one path-resolution helper.
4. **Reuse existing transports.** The livereload WebSocket already reached every
   client; one new message type (`reload-page`) bought full page reloads with
   ~15 lines total.
5. **Bun as package manager ≠ Bun as test runtime.** Bun handles installs,
   builds, and script running great; Jest's module isolation still needs Node.
6. **Write assertions against shapes, not absolute paths.** `__dirname` differs
   between ts-jest execution and compiled output; `stringMatching` on the
   suffix is stable in both.
7. **Verify watchers with content changes, not mtime changes.** `touch` is not
   a reliable proxy for an edit.
8. **Check the framework's feature set before hand-rolling.** Tree guide lines
   existed as a first-class prop (`withLines`); the initial instinct to draw
   them manually was wasted effort.

## Verification

- Backend: 130/130 tests; frontend: 317/317 tests, 37 snapshots (6 updated
  across the tree fixes); both lints clean; `tsc` clean; webpack builds with
  zero warnings.
- `docker compose config --quiet` passes; container reaches healthy; dashboard,
  `/bundle.js`, and `/api/filetree` return 200.
- Live hot reload in the container:
  - backend content edit → `bun --watch` restart in place, server stays healthy
  - frontend edit → webpack rebuild in 214–327 ms, probe visible in served
    bundle, probe edits reverted cleanly
- File tree indentation: level 1 content at x≈14, level 2 at x≈36
  (`padding-inline-start: 22.5px` per level, layered correctly).
- Tree lines: `data-with-lines` active; each nested node renders the H
  connector and V line via pseudo-elements; the last child's vertical line is
  truncated (the `└──` shape).
- Livereload WebSocket connects (`open`) with the workspace folder query.

## File Changes

| Area | Files |
| --- | --- |
| Mantine migration | `packages/frontend/src/**`, `test/setupTests.ts` |
| Theme adapter | `src/theme/AppThemeProvider.tsx` (frontend), `src/hooks/useTheme.ts` |
| Compact UI | header/sidebar/markdown/settings components, `index.css` |
| Git removal | Diff/Last Commit components, `diffSlice`, `/api/diff*` routes, `simple-git` dep, `docker/Dockerfile` |
| Hot reload backend | `src/server/server.ts` (`resolveStaticRoots`), `src/server/watcher.ts` (bundle watch + `reload-page`) |
| Hot reload frontend | `src/hooks/useWebSocket.ts` (`reload-page` handler) |
| Docker | `docker-compose.yml`, `docker/entrypoint-dev.sh` |
| Toolchain | `package.json`, `packages/frontend/package.json`, `bun.lock`, jest configs, `Makefile`, CI workflows |
| File tree fixes | `FileTreeView.tsx` (indent longhands, `withLines`, `levelOffset`) + snapshots |
| Docs | `README.md`, `docs/important/*` |

## Follow-ups

- Consider raising `ulimit nofile` in Compose for very large checkouts.
- Add an automated DOM-shape test (level offsets differ) so the flat-tree
  regression can't re-land unnoticed by snapshots alone.
- Consider Mantine's flat/virtualized tree for very large folders.
- `MDTS_CONFIG_DIR` option so the container doesn't need to shadow `~/.config`
  (carried over from the Compose plan).
- Bake a production image (deps + build prebuilt) alongside the dev service.
