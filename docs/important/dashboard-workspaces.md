---
title: Dashboard & Multi-folder Workspaces
description: Stable behavior, URL contract, architecture, and security notes for mdts dashboard mode
category: Important
tags:
  - dashboard
  - workspaces
  - folders
  - websocket
  - architecture
---

# Dashboard & Multi-folder Workspaces

This document is the reference for mdts' dashboard mode and multi-folder behavior. Update
it whenever the URL contract, folder resolution, recent-folder storage, or live-reload
isolation changes.

## Entry Points

### Dashboard

```bash
npx mdts
```

Starts a long-running server and opens `http://localhost:8521`. The root URL renders the
dashboard: **Open a folder**, **Recently viewed**, and a server-side folder picker.

### Direct folder

```bash
npx mdts ./docs
```

Starts the same server with a default folder and opens a workspace URL directly. If the
folder contains `README.md` or `index.md`, the CLI opens that file; otherwise it opens the
folder root.

The old single-folder workflow remains available through this path.

## URL Contract

A workspace is identified by the `folder` query parameter:

```text
http://localhost:8521/?folder=/absolute/path/to/folder
```

Content paths stay in the pathname and the workspace stays in the query:

```text
http://localhost:8521/docs/guide.md?folder=/absolute/path/to/folder
```

Rules:

- `folder` must resolve to an existing absolute directory. `~` is expanded by the server.
- When a default folder exists, omitting `folder` falls back to it.
- In dashboard-only mode, folder-scoped APIs return `400` without `folder`.
- Multiple folders can be open in separate tabs with one server process.
- Internal navigation, API calls, WebSocket connections, and local images must preserve
  the folder parameter.

## Server Architecture

### `ServerOptions`

```ts
interface ServerOptions {
  defaultDirectory?: string;
  globPatterns?: string[];
  configDir?: string;
}
```

`FolderService` resolves folders per request, validates them, applies glob patterns, and
provides folder browsing and recents. A scoped middleware stores the result in
`res.locals.folderContext`.

### Folder API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/folders/info` | `{ daemon, defaultFolder, home }` |
| `GET /api/folders/recent` | Recently opened folders, newest first |
| `POST /api/folders/recent` | Record `{ "path": "/absolute/folder" }` |
| `DELETE /api/folders/recent?path=...` | Remove a recent folder |
| `GET /api/folders/browse?path=...` | List subdirectories for the picker |

### Folder-scoped APIs

`/api/filetree`, `/api/outline`, and `/api/markdown`
resolve the folder from `?folder=`. `/api/config` and the welcome markdown are global.

### Recent folder storage

`~/.config/mdts/folders.json`:

```json
{
  "recent": [
    {
      "path": "/home/you/project",
      "openedAt": "2026-10-22T09:19:14.278Z"
    }
  ]
}
```

- Maximum 10 entries.
- The newest entry is first; reopening a folder moves it to the front.
- Repeated requests for the current folder do not rewrite the file.
- Missing folders remain listed with `exists: false` until removed or reopened.

## Live Reload

The WebSocket URL includes the workspace folder:

```text
ws://localhost:8521/?folder=/absolute/path/to/folder
```

Isolation invariants:

- one directory or file-pattern watcher per open folder
- `reload-tree` is broadcast only to clients watching that folder
- each client has its own content watcher
- `reload-content` is sent only to the client that selected the file
- the folder watcher closes when its last client disconnects

One deliberate exception: `reload-page` is broadcast to **all** connected
clients regardless of folder. The server emits it when the frontend bundle
(`dist/frontend/bundle.js`) changes — i.e. during development, when webpack
rebuilds — and clients respond with a full `window.location.reload()`. Content
and tree events never use it.

## Frontend Modes

`App.tsx` selects a mode:

| Mode | Condition |
| --- | --- |
| `workspace` | `?folder=` is present |
| `dashboard` | `/api/folders/info` returns a valid mdts folder response |
| `legacy` | API missing/invalid (static demo or older server) |
| `loading` | Server mode is still being detected |

The dashboard probe must tolerate HTML responses and redirects. A static deployment that
redirects unknown routes to `index.html` returns `200`, so response shape validation is
required.

## Asset Handling

Markdown links and images must preserve the workspace folder.

- `fetchData()` appends `?folder=` to API URLs.
- `folderUrl()` appends the folder to router navigation.
- `useWebSocket()` puts the folder in the WebSocket URL.
- `MarkdownLink` preserves the folder for internal links.
- `MarkdownImage` resolves relative/root-relative images against the current markdown file
  and reapplies the folder. External and `data:` URLs are untouched.

## Security

The folder picker browses the filesystem of the machine running mdts, not the browser
machine.

- Anyone who can reach the port can browse folders readable by the mdts process user.
- Bind to `localhost` by default.
- Only use `--host 0.0.0.0` on trusted networks, or put mdts behind authentication.
- mdts does not write to user documents; it writes only to `~/.config/mdts/`.

## Invariants to Test

- A folder-scoped API without a folder returns `400` in dashboard-only mode.
- Two folders return independent file trees from the same server.
- A missing folder returns `404`.
- Recent folders are persisted and removable.
- WebSocket tree reloads do not cross folders.
- Content reloads do not cross clients.
- Navigation and images keep `?folder=`.
- The static demo still renders its legacy welcome page.

## Related Documents

- [Implementation plan](../plans/2026/10/22/2026-10-22-dashboard-workspaces.md)
- [API Reference](../api.md)
- [Advanced Configuration](../configuration.md)
- [Frontend Features](../frontend_features.md)
