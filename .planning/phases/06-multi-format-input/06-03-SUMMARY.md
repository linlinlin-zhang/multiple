---
phase: 06-multi-format-input
plan: 03
subsystem: History Browser UI
autonomous: true
wave: 3
depends_on: [06-01, 06-02]
requirements:
  - INPT-01
  - INPT-02
key-files:
  created: []
  modified:
    - app/src/types/index.ts
    - src/api/sessions.js
    - app/src/components/cabinet/AssetSidebar.tsx
    - app/src/components/cabinet/AssetDetailPane.tsx
    - app/src/components/cabinet/NodeGraphThumbnail.tsx
tech-stack:
  added: []
  patterns:
    - "React useState + useEffect for async text preview fetch"
    - "Domain extraction via new URL().hostname with try/catch fallback"
    - "Source-type-aware node labels in SVG thumbnail"
decisions: []
metrics:
  duration: "15m"
  completed_date: "2026-04-26"
---

# Phase 06 Plan 03: Integrate Text File and Web Link Sources into History Browser UI

**One-liner:** Updated type definitions, session serialization, AssetSidebar, AssetDetailPane, and NodeGraphThumbnail to fully support text files and web links alongside images and chat messages.

---

## What Was Built

### Task 1 — Type Definitions and Session Serialization
- `app/src/types/index.ts`: Added comment documenting non-image upload mimeTypes (`application/pdf`, `text/plain`) and documented `sourceType`/`sourceUrl`/`sourceText` fields on `Node.data`.
- `src/api/sessions.js`: `serializeState` now includes `sourceType`, `sourceUrl`, and `sourceText` in the source node data payload.

### Task 2 — AssetSidebar and AssetDetailPane Enhancements
- `AssetSidebar.tsx`:
  - **Files group**: Non-image uploads (text, PDF, DOCX, PPTX) now display their filename as the title instead of generic "Uploaded File".
  - **Links group**: Link nodes now show the domain (via `new URL(url).hostname`) as the title, with graceful fallback to "Web Link" for invalid URLs.
- `AssetDetailPane.tsx`:
  - **FileAssetDetail**: Added a "Preview" section for text files that fetches content from `/api/assets/{hash}?kind=upload` and displays the first 2000 characters in a scrollable `<pre>` block.
  - **LinkAssetDetail**: Added "Title", "Description", and "AI Summary" sections rendering `node.data.option.title`, `node.data.option.description`, and `node.data.summary` respectively.

### Task 3 — NodeGraphThumbnail Source Labels
- `NodeGraphThumbnail.tsx`: Updated `getNodeLabel` to return:
  - Filename for `sourceType === "text"`
  - Domain for `sourceType === "url"`
  - "Source" fallback for image sources
- Invalid URLs are caught and fall back to "Link".

---

## Verification

- TypeScript compilation passes (`tsc --noEmit` — no errors).
- Vite production build succeeds with zero errors.
- All acceptance criteria from the plan are satisfied.

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: XSS mitigation | app/src/components/cabinet/AssetDetailPane.tsx | LinkAssetDetail renders node.data as React text (escaped by default); URLs use `<a href>` with `rel="noopener noreferrer"`. No `dangerouslySetInnerHTML` used. |

---

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `9247f1b` | Update type definitions and session serialization for source types |
| 2 | `6dc30d9` | Enhance AssetSidebar and AssetDetailPane for text/link sources |
| 3 | `642bc84` | Update NodeGraphThumbnail to show source type labels |

---

## Self-Check: PASSED

- [x] All modified files exist and contain expected changes
- [x] All commits exist in git history
- [x] TypeScript build passes without errors
- [x] No regressions in existing image/chat flows
