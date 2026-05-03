---
phase: 20-task-routing
plan: 02
status: complete
completed: "2026-05-03"
---

# Plan 02 Summary: Frontend Task-Type Badges & Template Routing

## What was built

Frontend task-type badge display and prompt template routing based on classification results.

## Key files

- **Modified**: `src/prompts/analysis.js` — `buildAnalysisPrompt` and `buildExplorePrompt` now accept `taskType` and inject bias instructions for research/planning/creative/image_generation
- **Modified**: `public/app.html` — added `.card-badge` span to `optionTemplate`
- **Modified**: `public/app.js` — added `applyTaskTypeBadge` helper, i18n keys, wired `taskType` through all card creation paths
- **Modified**: `public/styles.css` — added 5 badge color variants with gradients
- **Modified**: `server.js` — added `routeContent` to `handleAnalyzeUrl` and `handleAnalyzeText` for consistency

## Commits

1. `20bb558` — feat(20-02): frontend task-type badges and prompt template routing

## Acceptance criteria

- [x] `buildAnalysisPrompt` accepts optional second parameter `taskType` with default 'general'
- [x] `buildExplorePrompt` accepts optional second parameter `taskType` with default 'general'
- [x] For taskType 'research', the prompt contains text asking to prioritize research directions
- [x] Direction cards display a colored badge in the top-right corner
- [x] Badge text is localized (English and Chinese)
- [x] Badge does not overlap card title or other elements
- [x] Cards without taskType still render correctly (fallback to general badge)
- [x] Server analysis responses include a `taskType` field
- [x] Frontend passes taskType from response into card creation
- [x] Card data attributes include `data-task-type`

## Self-Check

- Backward-compatible: existing calls without taskType behave identically
- Badge uses `position: absolute` and small font size to avoid layout disruption
- CSS classes use `badge-*` prefix to avoid conflicts with existing `.source-badge`
