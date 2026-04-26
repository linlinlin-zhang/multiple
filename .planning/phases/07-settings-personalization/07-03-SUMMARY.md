---
phase: 07-settings-personalization
plan: 03
subsystem: settings
wave: 3
tags: [i18n, l10n, settings, language]
dependency_graph:
  requires: [07-02]
  provides: [i18n-system]
  affects: [canvas-app, history-browser, server-api]
tech-stack:
  added:
    - app/src/lib/i18n.ts (React i18n context + hook)
  patterns:
    - Dictionary-based lightweight i18n (no external library)
    - t(key, vars) interpolation helper
    - renderAllText() DOM updater for vanilla JS
    - I18nProvider / useI18n for React
    - Cross-tab sync via storage events
    - Database persistence via /api/settings
key-files:
  created:
    - app/src/lib/i18n.ts
  modified:
    - prisma/schema.prisma
    - prisma/migrations/20260426120000_add_settings/migration.sql
    - src/api/settings.js
    - server.js
    - public/app.js
    - public/index.html
    - app/src/main.tsx
    - app/src/share-main.tsx
    - app/index.html
    - app/src/components/cabinet/FileCabinet.tsx
    - app/src/components/cabinet/HistoryPage.tsx
    - app/src/components/cabinet/AssetSidebar.tsx
    - app/src/components/cabinet/AssetDetailPane.tsx
    - app/src/components/share/ShareViewerPage.tsx
decisions:
  - "Used inline dictionary objects instead of an external i18n library to keep bundle size zero and avoid added dependencies"
  - "Server-side AI prompts are language-aware: the canvas app passes body.language to /api/chat, /api/analyze, /api/generate, and /api/explain so the model receives prompts in the correct language"
  - "Vanilla JS canvas app uses renderAllText() to update all known DOM elements without rebuilding the DOM"
  - "React history browser uses I18nProvider at the root with storage event listeners for cross-tab sync"
metrics:
  duration: "~25 minutes"
  completed_date: "2026-04-26"
  tasks_completed: 3
  files_created: 1
  files_modified: 14
---

# Phase 07 Plan 03: i18n Language Switch Summary

## One-liner
Implemented a lightweight bilingual i18n system (Chinese/English) across the vanilla JS canvas app and React history browser, with instant language switching, database persistence, and language-aware AI prompts.

## What Was Built

1. **Backend language persistence**
   - Extended `Settings` model with `language String @default("zh")`
   - Updated migration SQL to add the `language` column
   - `handleGetSettings` now returns a top-level `language` field
   - `handleUpdateSettings` accepts `body.language` and upserts the global settings row

2. **Canvas app i18n (vanilla JS)**
   - Added a 60+ key dictionary (`i18n.zh` / `i18n.en`) in `public/app.js`
   - Added `t(key, vars)` helper with variable interpolation
   - Added `setLanguage()`, `loadLanguage()`, `saveLanguage()` lifecycle functions
   - Added `renderAllText()` that updates all known DOM labels, placeholders, titles, and ARIA attributes
   - Replaced every hardcoded Chinese string in `public/app.js` with `t()` calls
   - Added a `<select id="languageSelect">` to the settings panel in `public/index.html`
   - Added anti-FOUC inline script to set `lang` attribute before render

3. **React history browser i18n**
   - Created `app/src/lib/i18n.ts` with `I18nProvider` and `useI18n` hook
   - Wrapped both `<App />` (main.tsx) and `<ShareViewerPage />` (share-main.tsx) with `I18nProvider`
   - Added anti-FOUC inline script to `app/index.html`
   - Replaced all hardcoded Chinese text in `FileCabinet`, `HistoryPage`, `AssetSidebar`, `AssetDetailPane`, and `ShareViewerPage` with `t()` calls
   - Added a language `<select>` toggle in `FileCabinet` next to the theme toggle
   - Syncs language changes to `/api/settings` and `localStorage`
   - Cross-tab sync works via `storage` event listeners

4. **Server-side AI prompt localization**
   - `handleChat`, `handleAnalyze`, `handleGenerate`, and `handleExplain` in `server.js` now check `body.language`
   - When `language === "en"`, the system prompts and JSON schema instructions are sent in English
   - When `language === "zh"` (default), prompts remain in Chinese

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Server-side AI prompts were not language-aware**
- **Found during:** Task 2 (canvas app i18n)
- **Issue:** The plan only specified replacing client-side hardcoded strings. However, the AI system prompts in `server.js` were entirely in Chinese. Switching the UI language to English while the AI still received Chinese prompts would create a jarring user experience and violate the success criterion: "AI system prompts are language-aware (Chinese for zh, English for en)".
- **Fix:** Added `body.language` awareness to `handleChat`, `handleAnalyze`, `handleGenerate`, and `handleExplain` in `server.js`. Each function now sends English prompts when `language === "en"` and Chinese prompts when `language === "zh"`.
- **Files modified:** `server.js`
- **Commit:** included in `feat(07-03): build canvas app i18n dictionary...`

**2. [Rule 2 - Missing critical functionality] Missing dictionary keys for server status strings and UI elements**
- **Found during:** Task 2
- **Issue:** Several hardcoded Chinese strings in `public/app.js` did not have corresponding dictionary keys in the plan's example dictionary (e.g., "分析链接", "图像理解", "文档理解", "链接理解", "生成结果", "下载", "重生成", "收起/展开节点", "文件读取失败", "暂不支持该文件类型", etc.).
- **Fix:** Added all missing keys to both `zh` and `en` dictionaries in `public/app.js`.
- **Files modified:** `public/app.js`
- **Commit:** included in `feat(07-03): build canvas app i18n dictionary...`

**3. [Rule 2 - Missing critical functionality] Missing React dictionary keys for new UI strings**
- **Found during:** Task 3
- **Issue:** The plan's example React dictionary did not cover all hardcoded strings found in the actual components (e.g., "Session Assets", "历史记录", "更多", "切换亮色模式", "分享于", "原图", "生成图", "我", "AI", etc.).
- **Fix:** Added all missing keys to both `zh` and `en` dictionaries in `app/src/lib/i18n.ts`.
- **Files modified:** `app/src/lib/i18n.ts`
- **Commit:** included in `feat(07-03): build React history browser i18n...`

## Known Stubs

None. All identified hardcoded Chinese strings have been replaced with `t()` calls in both the canvas app and React history browser. The server-side AI prompts are fully language-aware.

## Threat Flags

No new security-relevant surface introduced beyond what is documented in the plan's threat model. The `language` value is user-controlled but cosmetic only, with invalid values falling back to `"zh"`.

## Self-Check: PASSED

- [x] `prisma/schema.prisma` contains `language String @default("zh")`
- [x] `prisma/migrations/20260426120000_add_settings/migration.sql` contains `ALTER TABLE "Settings" ADD COLUMN "language"`
- [x] `src/api/settings.js` returns top-level `language` and handles `body.language` upsert
- [x] `public/app.js` contains `const i18n = { zh: { ... }, en: { ... } }` with 60+ keys
- [x] `public/app.js` contains `function t(key, vars = {})`, `setLanguage`, `loadLanguage`, `saveLanguage`, `renderAllText`
- [x] `public/index.html` contains inline script with `localStorage.getItem("oryzae-lang")` and `id="languageSelect"`
- [x] `app/src/lib/i18n.ts` exports `useI18n` and `I18nProvider` with dictionaries for zh/en
- [x] `app/src/main.tsx` wraps `<App />` with `<I18nProvider>`
- [x] `app/src/share-main.tsx` wraps `<ShareViewerPage />` with `<I18nProvider>`
- [x] `app/src/components/cabinet/FileCabinet.tsx` imports `useI18n` and renders a language `<select>`
- [x] All hardcoded Chinese strings replaced in `public/app.js`, `app/src/components/cabinet/*`, and `app/src/components/share/ShareViewerPage.tsx`
- [x] `server.js` AI prompts are language-aware

## Commits

- `5482767` feat(07-03): extend Settings schema with language field and backend support
- `8f86c29` feat(07-03): build canvas app i18n dictionary and replace all hardcoded Chinese text
- `7a8b29c` feat(07-03): build React history browser i18n and replace all hardcoded Chinese text
