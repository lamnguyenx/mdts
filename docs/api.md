---
title: API Reference
description: REST API endpoints and WebSocket interface for mdts server
category: Documentation
tags:
  - api
  - endpoints
  - websocket
  - development
---

# API Reference

mdts provides a REST API and WebSocket interface for programmatic access to markdown content and configuration.

## Base URL

When running locally: `http://localhost:8521`

## Selecting a folder

mdts can serve many folders at the same time. Every content endpoint accepts a
`folder` query parameter containing an absolute path:

```
GET /api/filetree?folder=/home/you/project
GET /api/markdown/README.md?folder=/home/you/project
```

If `folder` is omitted, the server uses the directory passed on the command line.
When mdts is started without a directory (dashboard mode), `folder` is required.

## Folder API

These endpoints power the dashboard and folder picker.

#### `GET /api/folders/info`
Returns whether the server is in dashboard mode and which folder is the default.

```json
{
  "daemon": true,
  "defaultFolder": null,
  "home": "/home/you"
}
```

#### `GET /api/folders/recent`
Returns recently opened folders, newest first.

```json
{
  "recent": [
    {
      "path": "/home/you/project",
      "name": "project",
      "openedAt": "2026-10-22T09:19:14.278Z",
      "exists": true
    }
  ]
}
```

#### `POST /api/folders/recent`
Adds a folder to the recent list. Request body: `{ "path": "/home/you/project" }`.

#### `DELETE /api/folders/recent?path=/home/you/project`
Removes a folder from the recent list.

#### `GET /api/folders/browse?path=/home/you`
Lists subdirectories so the browser can offer a server-side folder picker.
`path` defaults to the current user's home directory.

```json
{
  "path": "/home/you",
  "parent": "/home",
  "directories": [
    { "name": "project", "path": "/home/you/project" }
  ],
  "home": "/home/you"
}
```

## REST API Endpoints

### File Tree API

#### `GET /api/filetree`
Returns the complete file tree structure of the mounted directory.

**Response:**
```json
{
  "fileTree": [...],
  "mountedDirectoryPath": "/path/to/directory"
}
```

#### `GET /api/markdown/<file_path>`
Returns the raw markdown content for a file in the selected folder.

**Example:** `GET /api/markdown/README.md?folder=/home/you/project`

### Outline API

#### `GET /api/outline?filePath=<file_path>`
Returns the table of contents (outline) for a markdown file.

**Parameters:**
- `filePath` - File path relative to the selected folder

**Response:**
```json
{
  "outline": [
    {
      "level": 1,
      "content": "Heading Text",
      "id": "heading-text"
    }
  ]
}
```

### Configuration API

#### `GET /api/config`
Returns current system configuration settings.

**Response:**
```json
{
  "fontFamily": "Roboto",
  "fontFamilyMonospace": "Roboto Mono", 
  "fontSize": 16,
  "theme": "default",
  "syntaxHighlighterTheme": "auto"
}
```

#### `POST /api/config`
Updates system configuration settings.

**Request Body:**
```json
{
  "fontFamily": "Arial",
  "fontSize": 18,
  "theme": "dark"
}
```

**Response:** `200 OK` with "Config saved" message

### Welcome Content API

#### `GET /api/markdown/mdts-welcome-markdown.md`
Returns the default welcome markdown content.

## WebSocket Interface

### Connection
Connect to the WebSocket and include the folder that should be watched:

```
ws://localhost:8521/?folder=/home/you/project
```

### Messages

#### File Watching
Send a `watch-file` message to start watching a file for changes:

```json
{
  "type": "watch-file",
  "filePath": "relative/path/to/file.md"
}
```

The server replies with `{ "type": "reload-content" }` when the file changes, and with
`{ "type": "reload-tree" }` when a markdown file is added or removed in the folder.

#### Live Reload
The server sends reload notifications when watched files change:

```json
{
  "type": "reload",
  "path": "path/to/changed/file.md"
}
```

## Error Responses

All API endpoints return appropriate HTTP status codes:

- `200 OK` - Success
- `404 Not Found` - File or resource not found
- `500 Internal Server Error` - Server error

Error responses include descriptive error messages in the response body.

## Usage Examples

### Fetch File Tree
```bash
curl http://localhost:8521/api/filetree
```

### Get Markdown Content
```bash
curl "http://localhost:8521/api/filetree?path=README.md"
```

### Update Configuration
```bash
curl -X POST http://localhost:8521/api/config \
  -H "Content-Type: application/json" \
  -d '{"fontSize": 18, "theme": "dark"}'
```

## Development Notes

- All file paths in API responses are relative to the mounted directory
- WebSocket connections are automatically established by the frontend
- Configuration changes are persisted to `~/.config/mdts/config.json`
- The server supports CORS for development purposes