---
phase: 08
plan: 03
subsystem: canvas-intelligence
tags: [image-viewer, regenerate, modify, download, i18n]
dependency_graph:
  requires: [08-02]
  provides: [TOOL-03, TOOL-04]
  affects: [public/app.js, public/styles.css, public/index.html, src/api/assets.js]
tech_stack:
  added: []
  patterns: [modal-actions, blob-download, content-disposition]
key_files:
  created: []
  modified:
    - public/index.html
    - public/styles.css
    - public/app.js
    - src/api/assets.js
decisions: []
metrics:
  duration: "15m"
  completed_date: "2026-04-26"
---

# Phase 08 Plan 03: Image Modify and Download Summary

**One-liner:** Added regenerate, custom-prompt modify, and blob-download capabilities to the image viewer modal, with backend Content-Disposition support.

## What Was Built

- **Modal action buttons** (Regenerate, Modify, Download) inside `#imageViewerModal`
- **Collapsible modify panel** with a textarea for custom prompt input and confirm/cancel buttons
- **Regenerate handler** reuses the node's original `option.prompt` and calls the existing `generateOption()` pipeline
- **Modify handler** temporarily overrides `option.prompt` with user input, then regenerates
- **Download handler** fetches the image blob via `/api/assets/{hash}?download=1` and triggers a browser file save with a sensible filename
- **Backend support** for `?download=1` on `GET /api/assets/{hash}` returning `Content-Disposition: attachment`

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add modal action buttons and custom prompt input to HTML | b23b3fd | public/index.html |
| 2 | Style modal actions and prompt input | 17069f2 | public/styles.css |
| 3 | Implement regenerate, modify, and download handlers | 3e84ebf | public/app.js |
| 4 | Add Content-Disposition header to asset download endpoint | 6faf201 | src/api/assets.js |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- [x] Modal shows Regenerate, Modify, and Download buttons.
- [x] Clicking Regenerate closes modal and re-runs generation with the original prompt.
- [x] Clicking Modify reveals a textarea with the current prompt pre-filled.
- [x] Submitting a modified prompt closes modal and regenerates with the new prompt.
- [x] Clicking Cancel hides the modify panel without regenerating.
- [x] Clicking Download triggers a browser file download with a sensible filename.
- [x] Download works for both data URLs and `/api/assets/{hash}` URLs.
- [x] Backend returns `Content-Disposition: attachment` when `?download=1` is present.
- [x] No console errors during any of these actions.

## Self-Check: PASSED

- [x] public/index.html contains viewer action buttons and modify panel
- [x] public/styles.css contains .viewer-actions and .viewer-modify-panel rules
- [x] public/app.js contains currentViewerNodeId, event listeners, i18n keys
- [x] src/api/assets.js contains Content-Disposition logic
- [x] All four commits exist in git log
