---
phase: 06-multi-format-input
plan: 02
subsystem: canvas + server
completed: "2026-04-26"
tags: [url-input, ai-analysis, ssrf-protection, demo-mode]
dependency_graph:
  requires: [06-01]
  provides: [06-03]
  affects: [server.js, public/app.js, public/index.html, public/styles.css]
tech-stack:
  added: []
  patterns: [tabbed-source-node, domain-badge, ai-search-summary]
key-files:
  created: []
  modified:
    - server.js
    - public/app.js
    - public/index.html
    - public/styles.css
decisions:
  - "Per D-10, no server-side HTTP fetch to the URL — rely on AI model's search/summary capability"
  - "URL validation rejects private IPs, localhost, loopback, and non-http(s) protocols to prevent SSRF"
metrics:
  duration: "~10 minutes"
  tasks: 2
  files_modified: 4
---

# Phase 6 Plan 02: Web Link Input & AI Analysis Summary

**One-liner:** Added `POST /api/analyze-url` endpoint with SSRF protection and a tabbed source node UI (file/link) that submits URLs for AI-powered creative direction analysis.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add `/api/analyze-url` endpoint to server.js | `73adbad` | `server.js` |
| 2 | Add URL input UI to canvas | `38a5fe7` | `public/app.js`, `public/index.html`, `public/styles.css` |

## What Was Built

### Backend (`server.js`)
- **`isValidPublicUrl(urlString)`** — validates URLs with these security checks:
  - Rejects `file://`, `ftp://`, `javascript:`, `data:` protocols
  - Rejects private IP ranges (`10.x`, `172.16-31.x`, `192.168.x`, `127.x`)
  - Rejects `localhost`, `127.0.0.1`, `::1`, `0.0.0.0`
  - Caps URL length at 2048 characters
- **`handleAnalyzeUrl(body, res)`** — new endpoint that:
  - Accepts `{ url }` and extracts domain
  - Returns demo analysis when `DEMO_MODE` or no API key
  - Builds a Chinese prompt instructing the AI to search/summarize the URL and generate 5 creative directions
  - Returns JSON matching image/text analysis shape, plus `domain` field
  - **No server-side HTTP fetch** to the URL (per D-10)

### Frontend (`public/index.html`, `public/app.js`, `public/styles.css`)
- **Tabbed source node** with "文件" and "链接" tabs
- **URL input panel** with `https://...` placeholder and "分析链接" button
- **`analyzeUrl()`** — submits URL to `/api/analyze-url`, sets `state.sourceType = "url"`, renders analysis/options
- **`renderUrlSource(url, title)`** — displays a clickable link card in the source node
- **Badge updates** — `getSourceBadgeClass()` returns `"link"`, label shows domain (e.g. `example.com`)
- **Session persistence** — `prepareStateForSave()` and `loadSession()` handle `sourceUrl` and `sourceType === "url"`
- **Analysis node labels** adapt to URL sources ("LINK READ" / "链接理解")

## Verification Results

| Test | Result |
|------|--------|
| `POST /api/analyze-url` with `https://example.com` | 200 OK, JSON with `domain`, `title`, `summary`, 5 `options` |
| `POST /api/analyze-url` with `https://arxiv.org/abs/2301.00001` | 200 OK, academic-themed directions, `domain: arxiv.org` |
| `POST /api/analyze-url` with `http://127.0.0.1/secret` | 400 Bad Request, SSRF protection active |
| Demo mode | Returns demo analysis with domain in title |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| `mitigate` | `server.js` | `isValidPublicUrl()` prevents SSRF by rejecting private IPs, localhost, and non-http(s) protocols |
| `mitigate` | `server.js` | No server-side fetch to arbitrary user URLs; only AI model receives the URL metadata |

## Self-Check: PASSED

- [x] `server.js` contains `handleAnalyzeUrl`, `isValidPublicUrl`, `/api/analyze-url` route
- [x] `public/index.html` contains `.source-tabs`, `.url-input-panel`
- [x] `public/app.js` contains `analyzeUrl`, `renderUrlSource`, `sourceType = "url"`
- [x] `public/styles.css` contains `.source-badge.link`, `.url-source-card`
- [x] Commits `73adbad` and `38a5fe7` exist in git log
