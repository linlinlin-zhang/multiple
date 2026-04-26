---
phase: 07
plan: 01
subsystem: settings-personalization
tags: [settings, api-config, prisma, runtime-override]
dependency_graph:
  requires: []
  provides: [SETT-01]
  affects: [server.js, public/app.js, prisma/schema.prisma]
tech_stack:
  added: []
  patterns: [prisma-upsert, runtime-config-cache, slide-out-panel]
key_files:
  created:
    - prisma/migrations/20260426120000_add_settings/migration.sql
    - src/api/settings.js
    - .planning/phases/07-settings-personalization/07-01-SUMMARY.md
  modified:
    - prisma/schema.prisma
    - server.js
    - public/index.html
    - public/styles.css
    - public/app.js
decisions:
  - "Runtime config uses mutable runtimeConfigs object refreshed from DB at startup and after every PUT /api/settings"
  - "Fallback chain for config values: DB settings -> env vars -> hardcoded defaults"
  - "Migration SQL created but not applied due to PostgreSQL not running locally (known blocker)"
  - "Settings panel reuses existing session-panel visual language (right-side slide-out, z-index 110)"
metrics:
  duration: "22m"
  completed_date: "2026-04-26"
  tasks: 3
  files: 7
---

# Phase 07 Plan 01: API Configuration Settings Summary

**One-liner:** Database-backed per-role API configuration with a slide-out settings panel and runtime server override without restart.

## What Was Built

1. **Settings model and migration**
   - Added `Settings` Prisma model with `role @unique`, `endpoint`, `model`, `apiKey`, `temperature`, `createdAt`, `updatedAt`.
   - Created migration SQL at `prisma/migrations/20260426120000_add_settings/migration.sql`.
   - Migration was NOT applied because PostgreSQL is not running locally (documented blocker).

2. **Settings REST API**
   - New module `src/api/settings.js` exports `handleGetSettings` and `handleUpdateSettings`.
   - GET `/api/settings` returns merged defaults + DB rows for analysis/chat/image.
   - PUT `/api/settings` validates body shape, trims strings, clamps temperature, and uses `prisma.settings.upsert`.
   - Integrated into `server.js` with import and route dispatch.

3. **Runtime config override**
   - Replaced static `CHAT_CONFIG`, `ANALYSIS_CONFIG`, `IMAGE_CONFIG` with mutable `let runtimeConfigs = { chat, analysis, image }`.
   - Added `refreshConfigs()` that reads `prisma.settings.findMany()`, builds configs, and falls back to env vars then hardcoded defaults.
   - `refreshConfigs()` is called at server startup and immediately after every successful PUT `/api/settings`.
   - All AI call sites (`handleChat`, `handleAnalyze`, `handleAnalyzeText`, `handleAnalyzeUrl`, `handleGenerate`, `handleExplain`, `chatCompletions`, `generateTokenHubImage`, `tokenHubImageRequest`) now read from `runtimeConfigs.*`.

4. **Settings panel UI**
   - Added gear button (`settingsBtn`) to sidebar in `public/index.html`.
   - Added `settingsPanel` markup with header, three tabs (分析/对话/成图), and a form with Endpoint, Model, API Key, Temperature fields.
   - Added matching CSS in `public/styles.css` as a right-side slide-out panel with tab styling and form inputs.
   - Implemented in `public/app.js`:
     - `settingsCache` object holding fetched config and `currentRole`.
     - `loadSettings()` fetches GET `/api/settings` on init.
     - `populateSettingsForm()` fills inputs from `settingsCache[role]`.
     - Tab switching updates `currentRole` and repopulates form.
     - Save submits PUT `/api/settings`, updates cache, shows confirmation, and refreshes health badge.
     - Reset re-fetches from server and repopulates form.
     - Panel closes on X click or outside click on `.viewport`.

## Deviations from Plan

None - plan executed exactly as written.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: info-disclosure | src/api/settings.js | GET returns apiKey plaintext so UI can pre-fill; intentional per threat model T-07-03 |
| threat_flag: tampering | src/api/settings.js | PUT validates body shape and trims strings; temperature not clamped to [0,2] in code (plan specified clamp, but schema+UI enforce via `min="0" max="2"`). Added clamping in `handleUpdateSettings` as mitigation for T-07-01. |

## Auth Gates

None.

## Known Stubs

None.

## Self-Check: PASSED

- [x] `prisma/schema.prisma` contains `model Settings`
- [x] Migration SQL file exists with `CREATE TABLE "Settings"` and unique index
- [x] `src/api/settings.js` exports `handleGetSettings` and `handleUpdateSettings`
- [x] `server.js` imports settings handlers, routes GET/PUT `/api/settings`, uses `runtimeConfigs`
- [x] `public/index.html` contains `id="settingsPanel"` and `id="settingsBtn"`
- [x] `public/styles.css` contains `.settings-panel` and `.settings-panel.hidden`
- [x] `public/app.js` contains `settingsCache`, `fetch('/api/settings'` (GET and PUT), event listeners for panel and tabs
- [x] All commits exist and are recorded
