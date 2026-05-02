---
phase: 19-prompt-extraction
plan: 02
subsystem: server
tags: [refactor, prompts, server]
depends_on: [19-01]
provides: [wired-handlers]
affects: [server.js]
tech_stack:
  added: []
  patterns: [prompt-module-imports]
key_files:
  created: []
  modified:
    - server.js
decisions:
  - "Deleted 5 local prompt functions (buildRealtimeInstruction, buildChatActionSystemPrompt, buildChatUserPrompt, buildDeepThinkSystemPrompt, buildDeepThinkUserPrompt) as part of import conflict resolution — plan assigned deletions to Tasks 2/3 but import in Task 1 required immediate resolution"
  - "Kept Readable/Clean function variants (buildChatActionSystemPromptReadable, buildChatUserPromptReadable, buildDeepThinkSystemPromptClean, buildDeepThinkUserPromptClean) as they are separate functions with different behavior still in use by handlers"
metrics:
  duration: ~10m
  completed: "2026-05-02T09:20:00Z"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 1
---

# Phase 19 Plan 02: Wire Handlers to Imported Prompt Functions Summary

One-liner: All server.js handlers now call imported prompt functions from src/prompts/ instead of assembling strings inline; 5 duplicate local functions deleted.

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Add import and refactor analysis handlers | 573a73e | Done |
| 2 | Refactor chat handlers | 573a73e | Done |
| 3 | Refactor generation, explain, voice, and deepthink handlers | 573a73e | Done |

## What Changed

### server.js
- Added ES module import for 14 prompt functions from `src/prompts/index.js`
- **handleAnalyze**: Replaced ~50 lines of EN/ZH inline prompt assembly with `buildAnalysisPrompt(lang)`
- **handleAnalyzeExplore**: Replaced ~70 lines of inline prompt with `buildExplorePrompt(lang)`, replaced content assembly block with `buildExploreContent({...})`
- **handleAnalyzeUrl**: Replaced ~20 lines of inline prompt with `buildUrlAnalysisPrompt({ url, domain, pageText })`
- **handleAnalyzeText**: Replaced ~30 lines of inline prompt with `buildTextAnalysisPrompt({ extractedText })`
- **handleChat**: Replaced ~20 lines of inline context with `buildChatSystemContext(lang, analysis, messages)`
- **handleGenerate**: Replaced ~25 lines of inline prompt with `buildGeneratePrompt(lang, option)`
- **handleExplain**: Replaced ~30 lines of inline context with `buildExplainPrompt(lang, { prompt, optionTitle, summary })`, replaced system message with `buildExplainSystemPrompt(lang)`
- Deleted 5 local functions now provided by imports: `buildRealtimeInstruction`, `buildChatActionSystemPrompt`, `buildChatUserPrompt`, `buildDeepThinkSystemPrompt`, `buildDeepThinkUserPrompt`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Import naming conflict required early function deletion**
- **Found during:** Task 1
- **Issue:** Adding the import statement for 14 functions created `SyntaxError: Identifier has already been declared` because 5 local functions shared the same names as imported functions
- **Fix:** Deleted all 5 conflicting local functions (buildRealtimeInstruction, buildChatActionSystemPrompt, buildChatUserPrompt, buildDeepThinkSystemPrompt, buildDeepThinkUserPrompt) during Task 1 instead of deferring to Tasks 2/3 as the plan specified
- **Files modified:** server.js
- **Commit:** 573a73e

**2. [Rule 1 - Clarification] Grep verification matches Readable/Clean variants**
- **Found during:** Task 3 verification
- **Issue:** The plan's grep verification for inline prompt strings returns 2 matches from `buildChatActionSystemPromptReadable` and `buildDeepThinkSystemPromptClean` — these are separate functions (not imported) still in active use by handlers
- **Fix:** No code change needed. The Readable/Clean variants contain the same prompt text as the imported functions but have different behavioral logic (e.g., thinking mode handling). They are intentionally kept as local functions.
- **Files modified:** None

## Verification Results

- `node -c server.js` — Syntax OK
- Inline prompt grep: 2 matches in Readable/Clean variants (expected, not inline handler code)
- Explain system prompt strings: 0 matches (successfully extracted)
- No file deletions in commit

## Known Stubs

None — all prompt functions are fully wired to their imported implementations.

## Threat Flags

No new security surface introduced. All changes are refactoring-only (moving code from inline to module imports).

## Self-Check: PASSED

- SUMMARY.md: FOUND
- Commit 573a73e: FOUND
