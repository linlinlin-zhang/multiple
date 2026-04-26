---
phase: 07-settings-personalization
plan: 02
type: execute
subsystem: settings
wave: 2
depends_on: [07-01]
requirements:
  - SETT-02
tech-stack:
  added: []
  patterns:
    - "CSS custom properties scoped to html[data-theme]"
    - "Tailwind darkMode: ['class', \"[data-theme='dark']\"]"
    - "Inline anti-FOUC script before stylesheets"
    - "Cross-tab sync via window storage events"
key-files:
  created: []
  modified:
    - prisma/schema.prisma
    - prisma/migrations/20260426120000_add_settings/migration.sql
    - src/api/settings.js
    - public/styles.css
    - public/index.html
    - public/app.js
    - app/tailwind.config.js
    - app/src/index.css
    - app/index.html
    - app/src/components/cabinet/FileCabinet.tsx
    - app/src/components/cabinet/HistoryPage.tsx
decisions:
  - "Theme stored on pseudo-role 'global' in Settings table to avoid schema migration for a single global value"
  - "Both canvas app and history browser use html[data-theme] attribute for consistency"
  - "Anti-FOUC script reads localStorage and sets data-theme before any stylesheet loads"
  - "Tailwind dark utilities generated via [data-theme='dark'] selector instead of .dark class"
  - "Cross-tab sync uses window 'storage' event so toggling in one tab updates the other instantly"
metrics:
  duration: "18m"
  completed_date: "2026-04-26"
  tasks: 3
  files_modified: 11
---

# Phase 07 Plan 02: Dark Mode Summary

**One-liner:** System-wide dark mode with CSS custom properties, inline anti-FOUC script, theme toggle in both canvas app and React history browser, database persistence, and cross-tab sync.

---

## What Was Built

1. **Backend theme support**
   - Extended `Settings` model with `theme String @default("light")`.
   - Added migration SQL `ALTER TABLE "Settings" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'light';`.
   - `handleGetSettings` now queries the `global` role row and returns a top-level `theme` property alongside per-role configs.
   - `handleUpdateSettings` accepts `body.theme` and upserts the `global` row with the new value.

2. **Canvas app dark mode**
   - Added `html[data-theme="dark"]` variable overrides in `public/styles.css` for every design token.
   - Added smooth `transition` on `background-color`, `color`, and `border-color` for key containers.
   - Added inline `<script>` in `public/index.html` `<head>` (before stylesheet) to read `localStorage.getItem("oryzae-theme")` and set `data-theme` immediately.
   - Added `applyTheme`, `loadTheme`, and `saveTheme` functions in `public/app.js`.
   - Wired a `#themeToggle` checkbox inside the nav settings area with custom switch styling.

3. **React history browser dark mode**
   - Changed `app/tailwind.config.js` `darkMode` to `["class", "[data-theme='dark']"]` so Tailwind generates dark utilities based on the `data-theme` attribute.
   - Added `html[data-theme="dark"]` CSS variable overrides in `app/src/index.css`.
   - Added the same inline anti-FOUC script in `app/index.html` before any stylesheets.
   - Added `theme` state, `handleToggleTheme`, and a Sun/Moon icon button in `FileCabinet.tsx`.
   - Added `useEffect` listening for `storage` events to sync theme across tabs.
   - Replaced hardcoded `bg-white` classes with `bg-cabinet-paper` in `FileCabinet.tsx` and `HistoryPage.tsx`.

---

## Deviations from Plan

None - plan executed exactly as written.

---

## Auth Gates

None.

---

## Known Stubs

None. All theme toggles are fully wired to localStorage, the DOM attribute, the server API, and cross-tab sync.

---

## Threat Flags

None. Theme value is cosmetic-only; no new auth surface or trust boundary introduced.

---

## Self-Check: PASSED

- [x] `prisma/schema.prisma` contains `theme String @default("light")`
- [x] `prisma/migrations/20260426120000_add_settings/migration.sql` contains theme column
- [x] `src/api/settings.js` returns and accepts top-level `theme`
- [x] `public/styles.css` contains `html[data-theme="dark"]` with dark overrides
- [x] `public/index.html` contains inline anti-FOUC script before stylesheet
- [x] `public/app.js` contains `applyTheme`, `loadTheme`, `saveTheme`, and toggle wiring
- [x] `app/tailwind.config.js` contains `darkMode: ["class", "[data-theme='dark']"]`
- [x] `app/src/index.css` contains `html[data-theme="dark"]` with dark overrides
- [x] `app/index.html` contains inline anti-FOUC script
- [x] `app/src/components/cabinet/FileCabinet.tsx` contains theme toggle, `fetch` PUT, and `storage` event listener
- [x] All commits exist and are verified
