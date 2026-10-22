---
title: Daemon Dashboard & Multi-folder Workspaces
description: Implementation plan and retrospective for starting mdts without a folder and opening workspaces from a dashboard
category: Plan
tags:
  - dashboard
  - daemon
  - workspaces
  - folders
  - retrospective
---

# Daemon Dashboard & Multi-folder Workspaces

- **Date:** 2026-10-22
- **Status:** Implemented
- **Components:** CLI, Express server, WebSocket watcher, React frontend
- **Primary files:** `src/cli.ts`, `src/server/folders.ts`, `src/server/server.ts`,
  `src/server/watcher.ts`, `packages/frontend/src/App.tsx`,
  `packages/frontend/src/components/Dashboard/`

## Summary

Previously every `mdts` process was bound to one directory at startup:

```bash
npx mdts ./docs
```

That is convenient for a single project but awkward when mdts is meant to stay running
and serve whatever folder the user wants to read next. The goal was a code-server-like
workflow:

1. Start mdts once, without choosing a folder.
2. Open `host:port` and see a dashboard.
3. Open any folder from a server-side picker.
4. Open additional folders from the same process, in separate browser tabs.
5. Return to recently opened folders later.

The implemented URL contract is:

```text
http://localhost:8521/?folder=/absolute/path/to/folder
```

## Motivation

Before this change, choosing a folder and starting the server were the same action. That
made these workflows clumsy:

- keeping one mdts process running all day
- switching between several documentation repositories
- reading notes and project docs in parallel tabs
- running mdts on a remote machine and choosing folders from the browser

The dashboard turns the folder into request-scoped state instead of process-scoped state.

## User Experience

### Dashboard mode

Running without a directory starts the dashboard:

```bash
npx mdts
```

The dashboard provides:

- **Open a folder**: a server-side directory browser, including hidden folders and
  symlinked directories.
- **Recently viewed**: folders persisted on the server, not just in browser storage.
- **Missing** markers for recent folders that have since been moved or deleted.
- A dashboard button in the workspace header for switching folders.

### Direct folder mode

The old workflow remains available:

```bash
npx mdts ./docs
```

This starts the same multi-folder server and opens
`http://localhost:8521/?folder=/absolute/path/to/docs` directly. If `README.md` or
`index.md` exists, the CLI opens that file instead of the folder root.

### Multiple workspaces

Each folder is an independent workspace URL. Opening two URLs in two tabs produces two
independent file trees, document views, outlines, diffs, and live-reload subscriptions
inside one server process.

## Server Design

### Server options

`ServerOptions` replaced the single startup `ServerContext`:

```ts
interface ServerOptions {
  defaultDirectory?: string;
  globPatterns?: string[];
  configDir?: string;
}
```

`defaultDirectory` is optional. When present, requests without `?folder=` fall back to it
for backwards compatibility. When absent, mdts is in dashboard-only mode and folder-scoped
APIs return `400 folder query parameter is required`.

### Folder resolution

`FolderService` centralizes:

- expanding `~` and resolving absolute paths
- validating that a folder exists and is a directory
- applying glob patterns per folder
- browsing directories for the folder picker
- recording recent folders

The server resolves the folder once per request through a scoped middleware and stores the
result in `res.locals.folderContext`. Routes still accept an optional fallback context so
route-level unit tests can exercise them in isolation.

### Folder API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/folders/info` | Dashboard mode, default folder, home directory |
| `GET /api/folders/recent` | Recently opened folders |
| `POST /api/folders/recent` | Remember a folder |
| `DELETE /api/folders/recent?path=...` | Remove a recent folder |
| `GET /api/folders/browse?path=...` | List subdirectories for the picker |

Content endpoints (`/api/filetree`, `/api/outline`, `/api/markdown`, `/api/diff`,
`/api/diff-prev`) accept `?folder=` and resolve their directory per request.

### Recent folders

Recents are stored in `~/.config/mdts/folders.json`, newest first, capped at 10 entries.
Writes are skipped when the folder is already first, so ordinary API traffic does not
rewrite the file. A read-only config directory never prevents a folder from opening.

### Live reload

The original watcher had one global directory watcher and one global content watcher. That
cannot represent multiple folders or multiple clients. The new watcher:

- reads `?folder=` from the WebSocket URL
- creates one directory/file-pattern watcher per open folder
- broadcasts `reload-tree` only to clients watching that folder
- keeps a content watcher per WebSocket client, so tab A does not receive tab B's
  `reload-content` events
- closes a folder watcher when its last client disconnects

## Frontend Design

### App modes

`App.tsx` now selects one of four modes:

- `workspace`: a `?folder=` parameter is present
- `loading`: checking whether the server has the folder API
- `dashboard`: a local mdts server without a folder selected
- `legacy`: the static Netlify demo or an older server without `/api/folders`

The dashboard probe intentionally uses raw `fetch` rather than the normal API helper so the
static demo does not log a noisy error when the endpoint does not exist. It also validates
the response shape instead of treating any successful JSON response as a dashboard.

### Dashboard and folder picker

The new frontend components are:

- `Dashboard.tsx`: hero, open-folder action, recent folders, optimistic removal
- `FolderPickerDialog.tsx`: editable path, parent navigation, directory list, open action

The picker browses the machine running the server. That is important for remote mdts
instances: a browser `webkitdirectory` picker would expose client-side relative paths, not
absolute paths on the server.

### Folder propagation

All folder-scoped requests and navigation must preserve the folder parameter. This is
centralized in `api.ts`:

- `fetchData()` appends `?folder=` to API calls
- `folderUrl()` adds the folder to `navigate()` targets
- `useFolder()` reads the current folder from React Router
- `useWebSocket()` includes the folder in the WebSocket URL

The parameter is preserved through file tree navigation, breadcrumbs, fuzzy search, the
header logo, and markdown links.

### Images and assets

Internal markdown links were updated early, but images initially lost the query string
during relative URL resolution. For example:

```text
/docs/page.md?folder=/workspace  +  ./image.png
=> /docs/image.png                (folder lost)
```

`MarkdownImage.tsx` now resolves relative and root-relative image URLs, preserves their
query/hash, and reattaches the folder. External and `data:` URLs are left untouched.

## Trials, Errors and Fixes

### 1. The static demo has no folder API

**Trial:** Treat `GET /api/folders/info` as the source of truth for dashboard mode.

**Error:** The Netlify demo redirects unknown routes to `index.html`, so the probe can
return HTML with status `200`.

**Fix:** Parse the response and require an object with a boolean `daemon` field. On any
failure, fall back to the original single-folder/welcome app. Use raw `fetch` in this one
place to avoid expected console errors in the demo.

### 2. Folder context leaked out of navigation

**Trial:** Add `?folder=` only to API calls.

**Error:** Browser navigation replaced the URL and dropped the folder; file selection,
fuzzy search, breadcrumbs, and markdown links all lost the workspace.

**Fix:** Centralized folder URL construction and used it for every internal navigation path.
`fetchData` adds the folder automatically, and the WebSocket URL carries it explicitly.

### 3. Images broke even after links worked

**Trial:** Reuse the markdown link resolver for media.

**Error:** ReactMarkdown rendered images directly, so relative image requests dropped the
folder query and hit the dashboard/static handler instead of the workspace file.

**Fix:** Added a dedicated `img` component renderer and `MarkdownImage` resolver. Also
covered root-relative images, query strings, hashes, external URLs, and `data:` URLs.

**Second error:** A naive base-path calculation for a file at the folder root produced
`//`, which browsers interpret as a protocol-relative URL.

**Second fix:** Compute the base path with `lastIndexOf('/')` and fall back to `/` when the
selected file has no directory segment.

### 4. The old watcher was structurally single-folder

**Trial:** Keep the existing global watcher and filter messages by folder.

**Error:** One directory watcher cannot watch multiple roots, and one global content
watcher sends `reload-content` to the wrong clients.

**Fix:** Refactored to per-folder watcher state and per-client content-watcher state. Tests
were rewritten around explicit client state.

### 5. Mocked Express tests fought the new router shape

**Trial:** Patch the old Express mock to understand middleware chains and routers.

**Error:** The mock lacked `Router.delete`, route registration shape changed, and several
tests reached into implementation details instead of behavior.

**Fix:** Replaced the mock-heavy server test suite with real Express + Supertest tests using
temporary directories. The tests now verify HTTP behavior and folder isolation rather than
the exact `app.use()` call list.

### 6. Watcher test connected the wrong object

**Error:** `ws.on is not a function`.

**Cause:** The test helper mixed up a wrapper object with the raw WebSocket mock, then
attempted to register handlers on `undefined`.

**Fix:** Accepted either the wrapper or the raw socket in the connect helper and extracted
the socket explicitly.

### 7. Supertest normalized the traversal URL

**Trial:** Keep the old assertion that `/api/markdown/../package.json` returns `403`.

**Error:** Supertest/Express normalized the path before the route ran, producing `404`.

**Fix:** Changed the assertion to verify the security outcome — the file is not served —
rather than an internal status-code detail.

### 8. Binary responses have no `response.text`

**Error:** A test expected `res.text` for a `.png` fixture and received `undefined`.

**Fix:** Assert on the response body buffer instead. The route was already serving the file
correctly.

### 9. MUI v9 API drift

**Errors:**

- `@mui/icons-material/DeleteOutline` does not exist in this version; `DeleteOutlined` does.
- `ListItemText.primaryTypographyProps` / `secondaryTypographyProps` were removed in favor
  of `slotProps`.
- Several Stack/Box type errors are inherited from the repository's current MUI typings.

**Fix:** Used the current icon name and `slotProps`. Pre-existing project-wide type errors
were left untouched; new code was checked separately so it did not add more.

### 10. Lint rule rejected inline JSX callbacks

**Error:** `react/jsx-no-bind` rejected inline arrow handlers in the dashboard lists.

**Fix:** Extracted `RecentFolderItem` and `DirectoryRow` subcomponents and used
`useCallback`, consistent with the existing codebase.

### 11. Recent-list test expectations were order-dependent

**Trial:** Expect the recent list to be empty after removing a folder.

**Error:** Serving the default folder legitimately records it as recent, so the list still
contained another entry.

**Fix:** Assert that the removed folder is absent, rather than asserting an empty list.

### 12. CLI tests assumed a mandatory directory

**Error:** Existing tests expected `{ directory: path.resolve('.') }` and URLs without a
folder query.

**Fix:** Updated expectations for `ServerOptions`, dashboard URLs, encoded folder URLs, and
direct-folder URLs. Added a no-directory dashboard test.

## Lessons Learnt

1. **Folder is request state, not process state.** Multi-folder support becomes much simpler
   once every request resolves its own workspace context.
2. **Workspace context has many carriers.** APIs, navigation, WebSockets, images, and raw
   assets all need the folder. A single helper is safer than remembering each call site.
3. **Live reload needs two dimensions of isolation:** folder and client. Per-folder
   watchers plus per-client content watchers prevent cross-workspace noise.
4. **Static demos need graceful degradation.** A dashboard probe must tolerate HTML,
   redirects, old servers, and missing endpoints.
5. **Real HTTP tests age better than mocked framework internals.** Supertest with temp
   directories caught actual routing and filesystem behavior.
6. **Test the asset paths, not only the links.** A context parameter can survive navigation
   and still be lost by `<img>`.
7. **Security documentation is part of the feature.** A server-side folder picker can browse
   anything the process user can read; binding to `0.0.0.0` needs an explicit warning.
8. **Keep the old entry point.** `npx mdts ./docs` still works, so the dashboard is additive
   for direct-folder users.

## Verification

- Backend: `npm test -- --runInBand` — 141 tests passed
- Frontend: `npm run test:frontend -- --runInBand` — 357 tests passed
- Backend lint: `npm run lint -- --runInBand` — passed
- Frontend lint: `npm run lint:frontend -- --runInBand` — passed
- Builds: `npm run build` and `npm run build:frontend` — passed
- Manual smoke tests:
  - dashboard and folder browsing
  - folder-scoped file tree and markdown
  - recent folder add/remove
  - WebSocket `reload-content` for a selected file
  - direct-folder CLI startup

## File Changes

| Area | Files |
| --- | --- |
| CLI | `src/cli.ts` |
| Server options and folder service | `src/server/context.ts`, `src/server/folders.ts` |
| Server routing | `src/server/server.ts`, `src/server/routes/folders.ts`, existing content routes |
| Watcher | `src/server/watcher.ts` |
| Frontend shell | `App.tsx`, `Layout.tsx`, `api.ts`, `hooks/useFolder.ts`, `hooks/useWebSocket.ts` |
| Dashboard UI | `components/Dashboard/Dashboard.tsx`, `components/Dashboard/FolderPickerDialog.tsx` |
| Markdown assets | `MarkdownImage.tsx`, `MarkdownRenderer.tsx`, `MarkdownLink.tsx` |
| Tests | CLI, server, watcher, e2e server, App, API, Dashboard, MarkdownImage |
| Documentation | `README.md`, `docs/api.md`, `docs/configuration.md`, `docs/frontend_features.md`, this plan |

## Follow-ups

- Add an optional auth token if mdts will be exposed beyond a trusted network.
- Add a systemd/launchd example if true background daemon management is desired.
- Consider a search/filter field in the folder picker for very large directories.
- Consider refreshing the folder watcher when glob-matched files are added.

## Companion Reference

- [Dashboard & Multi-folder Workspaces](../../../../important/dashboard-workspaces.md) —
  stable behavior, URL contract, API surface, and security invariants.
