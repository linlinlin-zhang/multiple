---
phase: 20-task-routing
plan: 01
status: complete
completed: "2026-05-03"
---

# Plan 01 Summary: Task Classification API & Routing Engine

## What was built

A complete task classification and routing system that uses LLM to classify uploaded content into task types, with confidence-based fallback to file-format heuristics.

## Key files

- **Created**: `src/lib/taskRouter.js` — classification engine with 233 lines
- **Modified**: `server.js` — added `POST /api/route-task` endpoint, wired routing into `handleAnalyze` and `handleAnalyzeExplore`
- **Modified**: `src/prompts/analysis.js` — extended `buildAnalysisPrompt` and `buildExplorePrompt` with optional `taskType` parameter

## Commits

1. `827fc75` — feat(20-01): add task router module with classification and fallback logic
2. `5ae72a3` — feat(20-01): integrate task routing into analyze endpoints and add route-task API

## Acceptance criteria

- [x] `src/lib/taskRouter.js` exists and exports `classifyContent`, `getFallbackTaskType`, `resolveTaskType`, `getPromptForTaskType`, `routeContent`
- [x] `node -c src/lib/taskRouter.js` passes syntax check
- [x] The module imports 4 prompt builders from `../prompts/index.js`
- [x] `POST /api/route-task` returns 200 with JSON containing `taskType`, `confidence`, `wasFallback`, `rationale`
- [x] When `useLLM=false`, confidence is 0 and wasFallback is true
- [x] `node -c server.js` passes syntax check
- [x] server.js analysis handlers call `routeContent` before building prompts
- [x] Console logs include `[route]` prefix with task type and confidence
- [x] Existing analyze/explore behavior preserved when taskType is "general"

## Self-Check

- No new runtime dependencies added
- ES module syntax used throughout
- Demo mode handled gracefully (falls back without LLM call)
- Classification errors caught and fallback applied
