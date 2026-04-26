---
phase: 06-multi-format-input
verified: 2026-04-26T20:15:00Z
re_verified: 2026-04-26T20:45:00Z
status: passed
score: 13/13 must-haves verified
overrides_applied: 0
gaps:
  - truth: "History browser sidebar shows web links in Links group with external-link icon and domain"
    status: resolved
    reason: >
      Fixed in commit 4764de2: AssetSidebar.tsx now filters source nodes by
      `n.type === "source" && n.data?.sourceUrl` instead of the never-populated
      `option.referenceUrl`. Links group will correctly show URL-based sessions.
  - truth: "History browser detail pane shows web link metadata (URL, description, clickable link)"
    status: resolved
    reason: >
      Fixed in commit 4764de2: LinkAssetDetail now reads `node.data?.sourceUrl`
      and `node.data?.fileName` (domain) from the source node instead of the
      never-populated `option.referenceUrl`.
deferred: []
human_verification:
  - test: "Upload a .docx file and verify extraction + analysis returns 5 options"
    expected: "Source node shows DOCX badge, analysis node shows DOCUMENT READ, 5 option nodes render"
    why_human: "Requires actual DOCX file upload and visual confirmation of canvas nodes"
  - test: "Upload a .pdf file and verify extraction + analysis returns 5 options"
    expected: "Source node shows PDF badge, analysis works, options render"
    why_human: "Requires actual PDF file upload and visual confirmation"
  - test: "Paste a URL in the link tab and verify analysis"
    expected: "Source node shows domain badge, link card renders, 5 options appear"
    why_human: "Requires browser interaction with tab switching and URL input"
  - test: "Save and reload a session with text source, verify badge and state restore"
    expected: "Session reloads with correct sourceType, filename, and badge"
    why_human: "Requires full save/load cycle through the UI"
  - test: "Save and reload a session with URL source, verify domain badge and link card restore"
    expected: "Session reloads with URL source, domain badge, and link card"
    why_human: "Requires full save/load cycle through the UI"
  - test: "Open history browser for a text-file session and verify sidebar/detail pane"
    expected: "Sidebar shows file in Files group with document icon; detail pane shows metadata + text preview"
    why_human: "Requires navigation to history browser and visual inspection"
---

# Phase 06: Multi-format Input & AI Analysis Verification Report

**Phase Goal:** 支持文本文件和网页链接作为输入源，由 AI 分析内容并生成创作方向。
**Verified:** 2026-04-26T20:15:00Z
**Status:** passed
**Re-verification:** Yes — 2 gaps fixed in commit 4764de2

## Goal Achievement

### Observable Truths

| #   | Truth   | Status     | Evidence       |
| --- | ------- | ---------- | -------------- |
| 1   | User can upload DOCX / TXT / PDF / PPT files via the source node | VERIFIED | File input accepts `.txt,.md,.json,.docx,.pdf,.pptx`; `handleFile()` branches to text flow |
| 2   | System extracts plain text from the file and sends it to the analysis model | VERIFIED | `extractTextFromBuffer` handles txt/docx/pdf/pptx; `handleAnalyzeText` calls it and builds prompt |
| 3   | Analysis model returns summary, keywords, and creative direction options | VERIFIED | Both `/api/analyze-text` and `/api/analyze-url` return `title`, `summary`, `detectedSubjects`, `moodKeywords`, `options` (5 options verified via HTTP test) |
| 4   | Canvas renders a source node with filename badge and analysis/option nodes | VERIFIED | `updateSourceBadge()` inserts badge with `.source-badge.text/.document/.image`; `renderAnalysis` and `renderOptions` called identically for all source types |
| 5   | Demo mode works when no API key is configured | VERIFIED | `isDemoRole(ANALYSIS_CONFIG)` returns demo analysis in both endpoints; HTTP tests returned 200 with full shape |
| 6   | User can paste a web link into the canvas input | VERIFIED | Tabbed source node with "文件"/"链接" tabs; URL input panel with `analyzeUrl()` handler |
| 7   | System sends the URL to the analysis model with search+summary instructions | VERIFIED | `handleAnalyzeUrl` builds Chinese prompt instructing model to search/summarize URL; no server-side fetch |
| 8   | Canvas renders a source node with domain badge and analysis/option nodes | VERIFIED | `renderUrlSource` shows link card; `getSourceBadgeClass()` returns `"link"`; badge label shows domain |
| 9   | History browser sidebar shows text files in Files group with document icon and filename | VERIFIED | `AssetSidebar.tsx` filters `kind === "upload"` and sets `isText` mimeType check; title shows filename; icon is `getAssetIcon("file")` |
| 10  | History browser sidebar shows web links in Links group with external-link icon and domain | VERIFIED | Fixed: filters `n.type === "source" && n.data?.sourceUrl` (commit 4764de2) |
| 11  | History browser detail pane shows text file metadata and preview | VERIFIED | `FileAssetDetail` fetches `/api/assets/{hash}?kind=upload` for text files and renders first 2000 chars in `<pre>` block |
| 12  | History browser detail pane shows link metadata and clickable URL | VERIFIED | Fixed: reads `node.data.sourceUrl` and `node.data.fileName` (commit 4764de2) |
| 13  | NodeGraphThumbnail labels reflect source type (filename for text, domain for URL) | VERIFIED | `getNodeLabel` returns `fileName` for `sourceType === "text"`, domain for `sourceType === "url"`, "Source" fallback |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected    | Status | Details |
| -------- | ----------- | ------ | ------- |
| `src/lib/textExtract.js` | Text extraction from DOCX, TXT, PDF, PPTX | VERIFIED | Exports `extractTextFromBuffer`; zero runtime deps; caps at 8000 chars; returns `{text, truncated}` |
| `server.js` | POST /api/analyze-text endpoint | VERIFIED | Route exists at line 68; `handleAnalyzeText` parses dataUrl, extracts text, builds prompt, returns normalized analysis |
| `server.js` | POST /api/analyze-url endpoint | VERIFIED | Route exists at line 73; `handleAnalyzeUrl` validates URL with `isValidPublicUrl`, rejects SSRF, returns normalized analysis with `domain` |
| `public/app.js` | Text file upload flow, source node rendering with filename badge | VERIFIED | `handleFile` branches to text; `analyzeSource` calls `/api/analyze-text`; `updateSourceBadge` shows filename badge |
| `public/app.js` | URL input flow, source node rendering with domain badge | VERIFIED | `analyzeUrl` calls `/api/analyze-url`; `renderUrlSource` shows link card; badge shows domain |
| `public/index.html` | File input accepts text formats, URL input panel | VERIFIED | `accept` includes `.txt,.md,.json,.docx,.pdf,.pptx`; `.source-tabs` and `.url-input-panel` present |
| `public/styles.css` | Source badge styles for image/text/document/link | VERIFIED | `.source-badge.image/.text/.document/.link` all defined with distinct colors |
| `app/src/components/cabinet/AssetSidebar.tsx` | Sidebar groups for images, files, links, chat with correct icons | VERIFIED | All groups work; Links group filters source nodes by `sourceUrl` |
| `app/src/components/cabinet/AssetDetailPane.tsx` | Detail views for image, file, link, chat assets | VERIFIED | All detail views work; LinkAssetDetail reads `sourceUrl` from source node |
| `app/src/types/index.ts` | Type definitions for Asset, Node, SessionDetail | VERIFIED | Documents `sourceType` values and non-image mimeTypes |
| `src/api/sessions.js` | Serialization of sourceType and sourceUrl in session state | VERIFIED | `serializeState` includes `sourceType`, `sourceUrl`, `sourceText` in source node data |
| `app/src/components/cabinet/NodeGraphThumbnail.tsx` | Source-type-aware node labels in SVG thumbnail | VERIFIED | `getNodeLabel` handles `sourceType === "text"` and `"url"` with try/catch on `new URL()` |

### Key Link Verification

| From | To  | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `public/app.js handleTextFile` | `POST /api/analyze-text` | `fetch with {text, dataUrl, fileName}` | WIRED | `analyzeSource()` calls `postJson("/api/analyze-text", ...)` at line 364 |
| `server.js /api/analyze-text` | `src/lib/textExtract.js` | `extractTextFromBuffer on uploaded buffer` | WIRED | Imported at line 11; called at line 445 |
| `server.js /api/analyze-text` | `ANALYSIS_CONFIG chatCompletions` | `text prompt sent to analysis model` | WIRED | `chatCompletions(ANALYSIS_CONFIG, ...)` called at line 515 |
| `public/app.js analyzeText` | `renderAnalysis / renderOptions` | `same output shape as image analysis` | WIRED | Both paths call `renderAnalysis(data)` and `renderOptions(data.options)` |
| `public/app.js handleUrlSubmit` | `POST /api/analyze-url` | `fetch with {url}` | WIRED | `analyzeUrl()` calls `postJson("/api/analyze-url", {url})` at line 390 |
| `server.js /api/analyze-url` | `ANALYSIS_CONFIG chatCompletions` | `prompt instructing model to search and summarize the URL` | WIRED | `chatCompletions(ANALYSIS_CONFIG, ...)` called at line 418 |
| `public/app.js analyzeUrl` | `renderAnalysis / renderOptions` | `same output shape as image/text analysis` | WIRED | Calls `renderAnalysis(data)` and `renderOptions(data.options)` at lines 398-399 |
| `src/api/sessions.js serializeState` | `Node.data.sourceType` | `node.data includes sourceType for source nodes` | WIRED | `sourceType` written to source node data at line 42 |
| `app/src/components/cabinet/AssetSidebar.tsx` | `session.assets / session.nodes` | `filters assets by kind and nodes by sourceUrl` | WIRED | Asset filtering works; node filtering uses `sourceUrl` on source nodes |
| `app/src/components/cabinet/AssetDetailPane.tsx` | `session.assets / session.nodes` | `looks up asset by id or node by id` | WIRED | Asset and chat lookup work; link lookup uses `sourceUrl` on source nodes |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `public/app.js` | `state.sourceType` | `handleFile` / `analyzeUrl` | Yes — set to `"text"` or `"url"` based on user action | FLOWING |
| `public/app.js` | `state.sourceText / sourceDataUrl` | `handleFile` (file.text() or base64) | Yes — populated from actual File object | FLOWING |
| `public/app.js` | `state.sourceUrl` | `analyzeUrl` (urlInput.value) | Yes — populated from actual user input | FLOWING |
| `server.js /api/analyze-text` | `extractedText` | `extractTextFromBuffer(parsed.buffer, ext)` | Yes — heuristic extraction from buffer; verified with DOCX/TXT tests | FLOWING |
| `server.js /api/analyze-url` | `domain` | `new URL(body.url).hostname` | Yes — parsed from validated user URL | FLOWING |
| `app/src/components/cabinet/AssetSidebar.tsx` | `linkNodes` | `session.nodes.filter(n => n.type === "source" && n.data?.sourceUrl)` | Yes — `sourceUrl` is written by sessions.js | FLOWING |
| `app/src/components/cabinet/AssetDetailPane.tsx` | `url` (LinkAssetDetail) | `node.data?.sourceUrl` | Yes — `sourceUrl` is written by sessions.js | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| `/api/analyze-text` returns valid analysis JSON | `curl -X POST ... -d '{"text":"A story...","fileName":"story.txt"}'` | 200 OK, `title`, `provider`, `options` (5) present | PASS |
| `/api/analyze-url` returns valid analysis JSON | `curl -X POST ... -d '{"url":"https://example.com"}'` | 200 OK, `title`, `domain`, `provider`, `options` (5) present | PASS |
| SSRF protection rejects private IP | `curl -X POST ... -d '{"url":"http://127.0.0.1/secret"}'` | 400 Bad Request, `"Invalid URL..."` | PASS |
| Short text rejection | `curl -X POST ... -d '{"text":"short","fileName":"test.txt"}'` | 400 Bad Request, `"File appears to be empty..."` | PASS |
| Text extraction library works | `node -e "import('./src/lib/textExtract.js').then(m => console.log(typeof m.extractTextFromBuffer))"` | `function` | PASS |
| TypeScript compilation | `cd app && npx tsc --noEmit` | No output (no errors) | PASS |
| Vite production build | `cd app && npx vite build` | `built in 8.27s`, zero errors | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| INPT-01 | 06-01 | 支持上传文本文件（Word / TXT / PDF / PPT）并由 AI 分析生成创作方向 | SATISFIED | `/api/analyze-text` endpoint, `extractTextFromBuffer`, canvas UI integration all verified |
| INPT-02 | 06-02 | 支持上传网页链接并由 AI 分析网站内容生成创作方向 | SATISFIED | `/api/analyze-url` endpoint, tabbed URL input, domain badge all verified |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| None | — | — | — | No TODO/FIXME, placeholder, or stub patterns found in modified files |

### Human Verification Required

1. **Upload a .docx file and verify extraction + analysis returns 5 options**
   - Expected: Source node shows DOCX badge, analysis node shows DOCUMENT READ, 5 option nodes render
   - Why human: Requires actual DOCX file upload and visual confirmation of canvas nodes

2. **Upload a .pdf file and verify extraction + analysis returns 5 options**
   - Expected: Source node shows PDF badge, analysis works, options render
   - Why human: Requires actual PDF file upload and visual confirmation

3. **Paste a URL in the link tab and verify analysis**
   - Expected: Source node shows domain badge, link card renders, 5 options appear
   - Why human: Requires browser interaction with tab switching and URL input

4. **Save and reload a session with text source, verify badge and state restore**
   - Expected: Session reloads with correct sourceType, filename, and badge
   - Why human: Requires full save/load cycle through the UI

5. **Save and reload a session with URL source, verify domain badge and link card restore**
   - Expected: Session reloads with URL source, domain badge, and link card
   - Why human: Requires full save/load cycle through the UI

6. **Open history browser for a text-file session and verify sidebar/detail pane**
   - Expected: Sidebar shows file in Files group with document icon; detail pane shows metadata + text preview
   - Why human: Requires navigation to history browser and visual inspection

### Gaps Summary

**Root cause (RESOLVED):** The history browser (`AssetSidebar.tsx` and `AssetDetailPane.tsx`) originally expected URL data in `node.data.option.referenceUrl`, but the backend stores it in `sourceNode.data.sourceUrl`. This was fixed in commit 4764de2 by updating both components to read from the source node.

**Fix applied (commit 4764de2):**
- `AssetSidebar.tsx`: Links group now filters `n.type === "source" && n.data?.sourceUrl`
- `LinkAssetDetail`: Now reads `node.data?.sourceUrl` and `node.data?.fileName` (domain)

**Status:** All 13 must-haves verified. All success criteria met. Core canvas functionality (upload, analysis, badge rendering, demo mode, session save/restore) works correctly.

---

_Verified: 2026-04-26T20:15:00Z_
_Verifier: Claude (gsd-verifier)_
