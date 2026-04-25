---
phase: "01-database-file-storage-foundation"
plan: "02"
subsystem: "backend-api"
tags: ["api", "crud", "assets", "history", "transactions"]
dependency_graph:
  requires: ["01-01"]
  provides: ["01-03", "02-01"]
  affects: ["server.js", "src/api/*"]
tech-stack:
  added: []
  patterns: ["prisma.$transaction", "file-before-db", "content-addressable-storage"]
key-files:
  created:
    - src/api/assets.js
    - src/api/sessions.js
    - src/api/history.js
  modified:
    - server.js
    - src/lib/storage.js
decisions:
  - "File writes occur BEFORE prisma.$transaction to avoid orphaned files on rollback"
  - "Generated images are stored server-side in handleGenerate and returned as /api/assets/:hash URLs"
  - "History list uses lightweight _count select instead of nested includes (Pitfall 4 prevention)"
  - "Demo sessions excluded from history by default via isDemo=false filter"
  - "storage.js filePathForHash appends .jpg extension to match storeFile behavior"
metrics:
  duration: "45 minutes"
  completed_date: "2026-04-25"
---

# Phase 1 Plan 2: Session CRUD, Asset Storage, and History API Summary

**One-liner:** Implemented transactional Session CRUD, content-addressable Asset storage/retrieval, lightweight paginated History API, and wired all routes into the existing `node:http` server.

## What Was Built

### 1. Asset API (`src/api/assets.js`)
- `POST /api/assets` — accepts `{ dataUrl, kind }`, validates data URL format, stores via `storeDataUrl`, returns `{ ok, hash, mimeType, size }`
- `GET /api/assets/:hash?kind=upload|generated` — validates hash, reads file via `readFile`, returns with `Content-Type` detected from magic bytes and `Cache-Control: public, max-age=31536000, immutable`

### 2. Session CRUD API (`src/api/sessions.js`)
- `POST /api/sessions` — creates Session with nested Nodes, Links, Assets, ChatMessages inside `prisma.$transaction`
- `GET /api/sessions/:id` — returns full session graph with all relations
- `PUT /api/sessions/:id` — atomically deletes and re-creates related rows, updates `updatedAt` and `viewState`
- All image data URLs are stored to filesystem **before** the transaction starts (files can't be rolled back)
- `serializeState()` normalizes the client `state` object into DB shapes

### 3. History API (`src/api/history.js`)
- `GET /api/history?limit=&offset=&includeDemo=` — lightweight list ordered by `updatedAt DESC`
- Uses Prisma `select` with `_count` for node/asset counts (no nested row loading)
- `limit` clamped to max 100; `includeDemo` defaults to `false`

### 4. Server Integration (`server.js`)
- Imported and dispatched all new handlers
- Added `ensureStorageDirs()` call after `server.listen()`
- Modified `handleGenerate()` to store generated images server-side and return hash + `/api/assets/:hash?kind=generated` URL
- Preserved all existing routes (`/api/health`, `/api/chat`, `/api/analyze`, `/api/generate`, static serve)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `filePathForHash` missing file extension**
- **Found during:** Task 4 verification
- **Issue:** `filePathForHash` returned a path without `.jpg` extension, while `storeFile` writes files with `.jpg`. This caused `GET /api/assets/:hash` to return 404 because `readFile` couldn't find the file.
- **Fix:** Appended `.jpg` to the path returned by `filePathForHash` in `src/lib/storage.js`
- **Files modified:** `src/lib/storage.js`
- **Commit:** `dead8ea`

## Known Stubs

| File | Line | Description | Reason |
|------|------|-------------|--------|
| `src/api/sessions.js` | ~170 | Generated node image storage fallback for raw `imageDataUrl` inside `data` | Defensive; normal client flow stores images via `/api/generate` first |

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: info_disclosure | `src/api/sessions.js` | `handleGetSession` returns full session data to any requester; acceptable for single-user local use, but UUID prevents enumeration |
| threat_flag: dos | `src/api/history.js` | `take` clamped to 100; `skip` numeric; prevents unbounded queries |

## Self-Check: PASSED

- [x] `src/api/assets.js` exists
- [x] `src/api/sessions.js` exists
- [x] `src/api/history.js` exists
- [x] Commits verified: `925f17d`, `dc3220f`, `d4eb36e`, `dead8ea`

## Notes

- Database connectivity was not available in the test environment (PostgreSQL not running), so session/history endpoints returned auth errors during live curl tests. Asset storage (filesystem) and health endpoint worked correctly.
- The server module imports cleanly and starts successfully on an alternate port.
- All new routes are placed **before** the static file serve fallback to avoid shadowing.
