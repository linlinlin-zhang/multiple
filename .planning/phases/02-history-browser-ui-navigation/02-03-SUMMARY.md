---
phase: 02-history-browser-ui-navigation
plan: 03
type: execute
subsystem: frontend + navigation
requires: [02-01]
provides: [HIST-04]
affects: [public/index.html, public/app.js, server.js, app/src/components/cabinet/HistoryPage.tsx, app/src/components/cabinet/FileCabinet.tsx]
tech-stack:
  added: []
  patterns: [anchor navigation, URL query params, async init, SPA static serving]
key-files:
  created:
    - app/src/components/cabinet/HistoryPage.tsx
  modified:
    - public/index.html
    - public/app.js
    - server.js
    - app/src/components/cabinet/FileCabinet.tsx
    - public/history/index.html
    - public/history/assets/index-auExt1Ju.js
    - public/history/assets/index-WnSRU7F9.css
decisions:
  - "Use simple <a href=\"/history/\"> links instead of React Router for cross-app navigation"
  - "Make init() async so loadSession failures can be caught and the bad session param cleared from URL"
  - "Build HistoryPage as a full component with sidebar asset listing and detail view instead of placeholder"
metrics:
  duration: "~25 minutes"
  completed_date: "2026-04-25"
  tasks: 3
  files_created: 1
  files_modified: 7
---

# Phase 02 Plan 03: Canvas-History Browser Bidirectional Navigation Summary

**One-liner:** Added bidirectional navigation between the legacy canvas view and the React history browser using simple anchor links and URL query params, with robust session loading error handling.

## What Was Done

### Task 1: Update canvas navigation link to point to `/history/`
- Changed the nav link in `public/index.html` from `href="/history.html"` to `href="/history/"`
- Updated title and label from "历史记录" to "历史浏览器" for clarity

### Task 2: Add History button to canvas topbar and ensure `loadSession` handles URL param
- Added a `historyBrowserButton` (folder icon emoji) to the canvas toolbar in `public/index.html`
- Wired the button in `public/app.js` to navigate to `/history/` on click
- Made `init()` async and wrapped `loadSession(resumeSessionId)` in try/catch
- On load failure, the invalid `?session=` param is cleared from the URL via `window.history.replaceState`

### Task 3: Wire server.js to serve `/history/` static files
- Added explicit route handling in `server.js` for `/history` and `/history/` before the generic `serveStatic`
- Returns `public/history/index.html` for the history browser SPA entry point
- No conflict with the existing `/api/history` API route

### Additional: Create HistoryPage component with "Open in Canvas" navigation
- Created `app/src/components/cabinet/HistoryPage.tsx` with:
  - Sidebar listing session assets (uploads, generated images, chat messages, analysis)
  - Detail view with content rendering
  - **"在画布中打开"** button linking to `/?session={sessionId}`
- Updated `FileCabinet.tsx` to use the real `HistoryPage` instead of the placeholder
- Built the React app to `public/history/` via Vite

## Deviations from Plan

### Auto-added Missing Critical Functionality
- **Rule 2 - Missing component**: The plan referenced `app/src/components/cabinet/HistoryPage.tsx` as an existing file to modify, but it did not exist (only a `HistoryPagePlaceholder` existed in `FileCabinet.tsx`). Created a full `HistoryPage.tsx` component with session detail loading, sidebar asset listing, and the required "Open in Canvas" navigation link.

## Known Stubs

| File | Line | Description | Reason |
|------|------|-------------|--------|
| app/src/components/cabinet/HistoryPage.tsx | ~144 | Content rendering uses plain text/markdown-like format instead of rich image previews | ContentRenderer is text-based; image preview enhancement deferred to HIST-03 (AI explanations) |
| app/src/components/cabinet/HistoryPage.tsx | ~225 | Node overview is text-only, not a visual thumbnail graph | Lightweight overview per HIST-05; full canvas rendering is out of scope for history browser |

## Threat Flags

None. No new network endpoints, auth paths, or schema changes were introduced. The existing trust boundaries remain unchanged.

## Self-Check: PASSED

- [x] `public/index.html` contains link to `/history/`
- [x] `public/app.js` has `historyBrowserButton` wired to `/history/`
- [x] `server.js` serves `/history/` -> `public/history/index.html`
- [x] `app/src/components/cabinet/HistoryPage.tsx` contains `href="/?session=`
- [x] Build output exists at `public/history/index.html`
- [x] All changes committed

## Commits

| Hash | Message |
|------|---------|
| 3f0ac1c | feat(02-03): update canvas nav link to point to /history/ |
| 4077a2f | feat(02-03): add history browser button and async init with session error handling |
| f98e4bc | feat(02-03): serve /history/ route from public/history/index.html |
| ef57407 | feat(02-03): create HistoryPage component with Open in Canvas navigation |
