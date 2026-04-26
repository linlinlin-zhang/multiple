---
phase: 06-multi-format-input
plan: 01
subsystem: server + canvas UI
requires: []
provides:
  - src/lib/textExtract.js
  - POST /api/analyze-text
  - text upload in public/app.js
affects:
  - server.js
  - public/app.js
  - public/index.html
  - public/styles.css
tech-stack:
  added: []
  patterns:
    - Zero-dependency text extraction via Buffer heuristics
    - Unified analysis output shape for image and text sources
key-files:
  created:
    - src/lib/textExtract.js
  modified:
    - server.js
    - public/app.js
    - public/index.html
    - public/styles.css
decisions:
  - Text extraction uses heuristic regex on DOCX/PPTX ZIP buffers (no external ZIP lib)
  - PDF text extracted via BT/ET block Tj/TJ operator regex (heuristic, documented)
  - Frontend reads plain text files directly; binary docs sent as base64 dataUrl
  - Source badge CSS classes distinguish image / text / document visually
  - Session save/restore preserves sourceType, sourceText, sourceDataUrl for text sources
metrics:
  duration: "~12 min"
  completed_date: "2026-04-26"
---

# Phase 06 Plan 01: Multi-format Input & AI Analysis Summary

**One-liner:** Added DOCX/TXT/PDF/PPTX upload and AI text analysis with zero external dependencies, unified output shape, and canvas source badges.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create text extraction library | `1d6664d` | `src/lib/textExtract.js` |
| 2 | Add `/api/analyze-text` endpoint | `ffd3c20` | `server.js` |
| 3 | Integrate text file upload into canvas UI | `af71dc1` | `public/app.js`, `public/index.html`, `public/styles.css` |

## What Was Built

### `src/lib/textExtract.js`
- Exports `extractTextFromBuffer(buffer, ext)` supporting:
  - **TXT / MD / JSON** — UTF-8 decode with BOM strip, Latin-1 fallback
  - **DOCX** — heuristic regex on `<w:t>` text runs inside the ZIP buffer
  - **PDF** — BT/ET block Tj/TJ operator extraction with readable-text filter
  - **PPTX** — heuristic regex on `<a:t>` text runs inside the ZIP buffer
  - **PPT (legacy)** — throws clear error asking user to convert to PPTX
- All extractors trim whitespace, collapse multiple spaces, cap at 8000 characters, and return `{ text, truncated }`
- Zero external npm dependencies

### `server.js` — `POST /api/analyze-text`
- New route placed immediately after `/api/analyze`
- Accepts `body.text` (pre-extracted plain text) or `body.dataUrl` (base64 file) plus `body.fileName`
- Parses generic data URLs via new `parseDataUrl()` helper
- Derives extension from `fileName` for extraction routing (mitigates spoofed MIME types)
- Validates extracted text length >= 10 chars, returns 400 otherwise
- Demo mode returns `buildDemoAnalysis()` when no API key is configured
- Sends text prompt to analysis model with identical JSON output shape as image analysis
- Optionally stores uploaded file buffer via `storeFile()` and returns `sourceHash` for history reference

### Canvas UI (`public/app.js`, `public/index.html`, `public/styles.css`)
- **File input** accept attribute expanded to include `.txt,.md,.json,.docx,.pdf,.pptx`
- **Upload label** updated to "上传图片或文档" with subtext listing supported formats
- **`handleFile()`** branches:
  - Images → existing resize + preview flow
  - Text/docs → reads plain text directly or converts binary to base64 `dataUrl`, sets `state.sourceType = "text"`
- **`analyzeSource()`** (renamed from `analyzeImage`) branches between `/api/analyze` and `/api/analyze-text`
- **`renderAnalysis()`** updates eyebrow/heading based on `sourceType`
- **Source badge** dynamically inserted into source node caption with `.source-badge.image`, `.text`, or `.document` styles
- **`prepareStateForSave()`** and **`loadSession()`** preserve and restore `sourceType`, `sourceText`, `sourceDataUrl`

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: spoofing | `server.js` | `parseDataUrl` derives extension from `fileName` rather than dataUrl MIME type for extraction routing, mitigating T-06-05 |
| threat_flag: dos | `server.js` | `MAX_BODY_BYTES` (22MB) already enforced by `readJson`; extraction caps text at 8000 chars before prompt, mitigating T-06-03 |
| threat_flag: tampering | `server.js` | `fileName` sanitized via existing `slug()` in `normalizeAnalysis`; non-string text rejected, mitigating T-06-01 |

## Self-Check: PASSED

- [x] `src/lib/textExtract.js` exists and exports `extractTextFromBuffer`
- [x] `server.js` contains `api/analyze-text`, `handleAnalyzeText`, `extractTextFromBuffer` references
- [x] `public/app.js` contains `analyze-text`, `sourceType`, `source-badge` logic
- [x] `public/index.html` contains updated accept attribute and upload label
- [x] `public/styles.css` contains `.source-badge`, `.source-badge.text`, `.source-badge.document`
- [x] All three commits exist in git log
